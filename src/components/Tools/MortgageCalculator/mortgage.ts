export type RepaymentMethod = 'annuity' | 'equalPrincipal'
export type PrepaymentMode = 'reduce-payment' | 'shorten-term'

export interface LoanTranche {
  name: string
  principal: number
  annualRate: number
}

export interface RepaymentRow {
  month: number
  payment: number
  principal: number
  interest: number
  balance: number
  extraPrincipal: number
}

export interface LoanPlan {
  method: RepaymentMethod
  schedule: RepaymentRow[]
  totalPrincipal: number
  totalInterest: number
  totalPayment: number
  firstPayment: number
  lastPayment: number
  monthlyDecrease: number
  termMonths: number
}

export interface HoldingSnapshot {
  homeValue: number
  remainingLoan: number
  netEquity: number
  investedCash: number
  netPosition: number
  paidInterest: number
}

const EPSILON = 0.005

function safeNumber(value: number) {
  return Number.isFinite(value) ? value : 0
}

function monthlyRate(annualRate: number) {
  return Math.max(0, safeNumber(annualRate)) / 100 / 12
}

function annuityPayment(principal: number, rate: number, months: number) {
  if (principal <= 0 || months <= 0) return 0
  if (rate === 0) return principal / months
  const factor = Math.pow(1 + rate, months)
  return principal * rate * factor / (factor - 1)
}

function buildTrancheSchedule(
  tranche: LoanTranche,
  months: number,
  method: RepaymentMethod,
): RepaymentRow[] {
  const principal = Math.max(0, safeNumber(tranche.principal))
  const term = Math.max(0, Math.floor(months))
  if (principal <= 0 || term <= 0) return []

  const rate = monthlyRate(tranche.annualRate)
  const payment = annuityPayment(principal, rate, term)
  const fixedPrincipal = principal / term
  let balance = principal
  const schedule: RepaymentRow[] = []

  for (let month = 1; month <= term && balance > EPSILON; month += 1) {
    const interest = balance * rate
    const principalPaid = month === term
      ? balance
      : Math.min(balance, method === 'annuity' ? payment - interest : fixedPrincipal)
    balance = Math.max(0, balance - principalPaid)
    schedule.push({
      month,
      payment: principalPaid + interest,
      principal: principalPaid,
      interest,
      balance,
      extraPrincipal: 0,
    })
  }

  return schedule
}

function aggregateSchedules(schedules: RepaymentRow[][], monthOffset = 0): RepaymentRow[] {
  const length = Math.max(0, ...schedules.map(schedule => schedule.length))
  return Array.from({ length }, (_, index) => {
    const rows = schedules.map(schedule => schedule[index]).filter(Boolean)
    return {
      month: monthOffset + index + 1,
      payment: rows.reduce((sum, row) => sum + row.payment, 0),
      principal: rows.reduce((sum, row) => sum + row.principal, 0),
      interest: rows.reduce((sum, row) => sum + row.interest, 0),
      balance: rows.reduce((sum, row) => sum + row.balance, 0),
      extraPrincipal: rows.reduce((sum, row) => sum + row.extraPrincipal, 0),
    }
  })
}

function summarizePlan(
  method: RepaymentMethod,
  schedule: RepaymentRow[],
  totalPrincipal: number,
): LoanPlan {
  const totalInterest = schedule.reduce((sum, row) => sum + row.interest, 0)
  const totalPayment = schedule.reduce((sum, row) => sum + row.payment, 0)
  return {
    method,
    schedule,
    totalPrincipal,
    totalInterest,
    totalPayment,
    firstPayment: schedule[0]?.payment ?? 0,
    lastPayment: schedule[schedule.length - 1]?.payment ?? 0,
    monthlyDecrease: schedule.length > 1
      ? Math.max(0, schedule[0].payment - schedule[1].payment)
      : 0,
    termMonths: schedule.length,
  }
}

function normalizedTranches(tranches: LoanTranche[]) {
  return tranches
    .map(tranche => ({
      ...tranche,
      principal: Math.max(0, safeNumber(tranche.principal)),
      annualRate: Math.max(0, safeNumber(tranche.annualRate)),
    }))
    .filter(tranche => tranche.principal > EPSILON)
}

function trancheSchedules(tranches: LoanTranche[], months: number, method: RepaymentMethod) {
  return normalizedTranches(tranches).map(tranche => buildTrancheSchedule(tranche, months, method))
}

function balancesAfter(schedules: RepaymentRow[][], paidMonths: number) {
  return schedules.map(schedule => {
    if (paidMonths <= 0) return schedule[0]?.principal
      ? schedule.reduce((sum, row) => sum + row.principal, 0)
      : 0
    return schedule[Math.min(paidMonths, schedule.length) - 1]?.balance ?? 0
  })
}

export function buildLoanPlan(
  tranches: LoanTranche[],
  months: number,
  method: RepaymentMethod,
): LoanPlan {
  const loans = normalizedTranches(tranches)
  const totalPrincipal = loans.reduce((sum, tranche) => sum + tranche.principal, 0)
  const schedule = aggregateSchedules(trancheSchedules(loans, months, method))
  return summarizePlan(method, schedule, totalPrincipal)
}

export function buildRateScenario(
  tranches: LoanTranche[],
  months: number,
  method: RepaymentMethod,
  relativeChangePct: number,
  afterMonths = 0,
): LoanPlan {
  const loans = normalizedTranches(tranches)
  const totalPrincipal = loans.reduce((sum, tranche) => sum + tranche.principal, 0)
  const changeFactor = Math.max(0, 1 + safeNumber(relativeChangePct) / 100)
  const changeAt = Math.min(Math.max(0, Math.floor(afterMonths)), Math.max(0, months - 1))
  const adjusted = loans.map(tranche => ({
    ...tranche,
    annualRate: tranche.annualRate * changeFactor,
  }))

  if (changeAt === 0) return buildLoanPlan(adjusted, months, method)

  const originalSchedules = trancheSchedules(loans, months, method)
  const past = aggregateSchedules(originalSchedules).slice(0, changeAt)
  const balances = balancesAfter(originalSchedules, changeAt)
  const remainingLoans = adjusted.map((tranche, index) => ({
    ...tranche,
    principal: balances[index],
  }))
  const future = aggregateSchedules(
    trancheSchedules(remainingLoans, months - changeAt, method),
    changeAt,
  )
  return summarizePlan(method, [...past, ...future], totalPrincipal)
}

function buildKeepPaymentSchedule(
  tranche: LoanTranche,
  balanceAtChange: number,
  originalMonths: number,
  method: RepaymentMethod,
): RepaymentRow[] {
  const rate = monthlyRate(tranche.annualRate)
  const originalPayment = annuityPayment(tranche.principal, rate, originalMonths)
  const fixedPrincipal = tranche.principal / originalMonths
  const maxMonths = originalMonths * 2 + 12
  let balance = Math.max(0, balanceAtChange)
  const schedule: RepaymentRow[] = []

  for (let index = 0; index < maxMonths && balance > EPSILON; index += 1) {
    const interest = balance * rate
    const principalPaid = Math.min(
      balance,
      method === 'annuity' ? Math.max(EPSILON, originalPayment - interest) : fixedPrincipal,
    )
    balance = Math.max(0, balance - principalPaid)
    schedule.push({
      month: index + 1,
      payment: principalPaid + interest,
      principal: principalPaid,
      interest,
      balance,
      extraPrincipal: 0,
    })
  }
  return schedule
}

export function buildPrepaymentScenario(
  tranches: LoanTranche[],
  months: number,
  method: RepaymentMethod,
  prepaymentAmount: number,
  afterMonths: number,
  mode: PrepaymentMode,
): LoanPlan {
  const loans = normalizedTranches(tranches)
  const totalPrincipal = loans.reduce((sum, tranche) => sum + tranche.principal, 0)
  const changeAt = Math.min(Math.max(1, Math.floor(afterMonths)), Math.max(1, months - 1))
  const originalSchedules = trancheSchedules(loans, months, method)
  const past = aggregateSchedules(originalSchedules).slice(0, changeAt)
  const balances = balancesAfter(originalSchedules, changeAt)
  const totalBalance = balances.reduce((sum, balance) => sum + balance, 0)
  const actualPrepayment = Math.min(Math.max(0, safeNumber(prepaymentAmount)), totalBalance)
  const ratio = totalBalance > 0 ? actualPrepayment / totalBalance : 0
  const remainingBalances = balances.map(balance => balance * (1 - ratio))

  if (past.length && actualPrepayment > 0) {
    const actionRow = past[past.length - 1]
    actionRow.payment += actualPrepayment
    actionRow.principal += actualPrepayment
    actionRow.extraPrincipal += actualPrepayment
    actionRow.balance = Math.max(0, actionRow.balance - actualPrepayment)
  }

  const remainingMonths = months - changeAt
  const futureSchedules = loans.map((tranche, index) => {
    if (mode === 'shorten-term') {
      return buildKeepPaymentSchedule(tranche, remainingBalances[index], months, method)
    }
    return buildTrancheSchedule(
      { ...tranche, principal: remainingBalances[index] },
      remainingMonths,
      method,
    )
  })
  const future = aggregateSchedules(futureSchedules, changeAt)
  return summarizePlan(method, [...past, ...future], totalPrincipal)
}

function allocatePrincipalByRate(
  balances: number[],
  loans: LoanTranche[],
  principalBudget: number,
) {
  let remainingBudget = principalBudget
  const paid = balances.map(() => 0)
  const order = loans
    .map((loan, index) => ({ index, rate: loan.annualRate }))
    .sort((a, b) => b.rate - a.rate)

  for (const { index } of order) {
    const amount = Math.min(balances[index], remainingBudget)
    balances[index] -= amount
    paid[index] += amount
    remainingBudget -= amount
    if (remainingBudget <= EPSILON) break
  }
  return paid.reduce((sum, value) => sum + value, 0)
}

export function buildExtraPaymentScenario(
  tranches: LoanTranche[],
  months: number,
  method: RepaymentMethod,
  monthlyExtra: number,
  startAfterMonths = 0,
): LoanPlan {
  const loans = normalizedTranches(tranches)
  const totalPrincipal = loans.reduce((sum, tranche) => sum + tranche.principal, 0)
  const startAt = Math.min(Math.max(0, Math.floor(startAfterMonths)), Math.max(0, months - 1))
  const originalSchedules = trancheSchedules(loans, months, method)
  const past = aggregateSchedules(originalSchedules).slice(0, startAt)
  const balances = balancesAfter(originalSchedules, startAt)
  const rates = loans.map(loan => monthlyRate(loan.annualRate))
  const extra = Math.max(0, safeNumber(monthlyExtra))
  if (extra <= EPSILON) return buildLoanPlan(loans, months, method)
  const basePayment = originalSchedules.reduce((sum, schedule) => sum + (schedule[0]?.payment ?? 0), 0)
  const basePrincipal = loans.reduce((sum, loan) => sum + loan.principal / months, 0)
  const future: RepaymentRow[] = []

  for (let index = 0; index < months + 12 && balances.some(balance => balance > EPSILON); index += 1) {
    const openingBalance = balances.reduce((sum, balance) => sum + balance, 0)
    const interest = balances.reduce((sum, balance, loanIndex) => sum + balance * rates[loanIndex], 0)
    const desiredPrincipal = method === 'annuity'
      ? Math.max(0, basePayment + extra - interest)
      : basePrincipal + extra
    const principal = allocatePrincipalByRate(balances, loans, Math.min(openingBalance, desiredPrincipal))
    const balance = balances.reduce((sum, value) => sum + value, 0)
    future.push({
      month: startAt + index + 1,
      payment: principal + interest,
      principal,
      interest,
      balance,
      extraPrincipal: Math.min(extra, principal),
    })
  }

  return summarizePlan(method, [...past, ...future], totalPrincipal)
}

export function buildHoldingSnapshot(
  plan: LoanPlan,
  propertyPrice: number,
  downPayment: number,
  holdMonths: number,
  annualHomeChangePct: number,
  transactionCostRatePct: number,
  renovationCost: number,
): HoldingSnapshot {
  const months = Math.max(0, Math.floor(holdMonths))
  const years = months / 12
  const valueFactor = Math.max(0, 1 + safeNumber(annualHomeChangePct) / 100)
  const homeValue = Math.max(0, safeNumber(propertyPrice)) * Math.pow(valueFactor, years)
  const paidRows = plan.schedule.slice(0, months)
  const remainingLoan = months === 0
    ? plan.totalPrincipal
    : paidRows[paidRows.length - 1]?.balance ?? 0
  const mortgagePayments = paidRows.reduce((sum, row) => sum + row.payment, 0)
  const paidInterest = paidRows.reduce((sum, row) => sum + row.interest, 0)
  const purchaseCosts = Math.max(0, propertyPrice) * Math.max(0, transactionCostRatePct) / 100
  const investedCash = Math.max(0, downPayment) + purchaseCosts
    + Math.max(0, renovationCost) + mortgagePayments
  const netEquity = homeValue - remainingLoan

  return {
    homeValue,
    remainingLoan,
    netEquity,
    investedCash,
    netPosition: netEquity - investedCash,
    paidInterest,
  }
}
