import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildExtraPaymentScenario,
  buildHoldingSnapshot,
  buildLoanPlan,
  buildPrepaymentScenario,
  buildRateScenario,
} from '../src/components/Tools/MortgageCalculator/mortgage.ts'

const closeTo = (actual, expected, tolerance = 0.01) => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  )
}

const comboLoans = [
  { name: '商业贷款', principal: 1_100_000, annualRate: 3.1 },
  { name: '公积金贷款', principal: 1_000_000, annualRate: 2.6 },
]

test('等额本息与等额本金均在期末还清，并保持本金守恒', () => {
  for (const method of ['annuity', 'equalPrincipal']) {
    const plan = buildLoanPlan(comboLoans, 360, method)
    assert.equal(plan.termMonths, 360)
    closeTo(plan.schedule.at(-1).balance, 0)
    closeTo(
      plan.schedule.reduce((sum, row) => sum + row.principal, 0),
      2_100_000,
    )
  }
})

test('组合贷结果等于分别计算商业贷和公积金贷后逐月相加', () => {
  const combined = buildLoanPlan(comboLoans, 360, 'annuity')
  const commercial = buildLoanPlan([comboLoans[0]], 360, 'annuity')
  const fund = buildLoanPlan([comboLoans[1]], 360, 'annuity')
  closeTo(combined.firstPayment, commercial.firstPayment + fund.firstPayment)
  closeTo(combined.totalInterest, commercial.totalInterest + fund.totalInterest)
})

test('零利率边界只归还本金，不产生利息', () => {
  const plan = buildLoanPlan([{ name: '免息贷款', principal: 120_000, annualRate: 0 }], 12, 'annuity')
  closeTo(plan.firstPayment, 10_000)
  closeTo(plan.totalInterest, 0)
  closeTo(plan.totalPayment, 120_000)
})

test('利率上浮只改变重定价后的还款，并增加总利息', () => {
  const base = buildLoanPlan(comboLoans, 360, 'annuity')
  const raised = buildRateScenario(comboLoans, 360, 'annuity', 10, 60)
  closeTo(raised.schedule[59].payment, base.schedule[59].payment)
  assert.ok(raised.schedule[60].payment > base.schedule[60].payment)
  assert.ok(raised.totalInterest > base.totalInterest)
})

test('提前还款两种模式均节省利息，缩期模式会提前结清', () => {
  for (const method of ['annuity', 'equalPrincipal']) {
    const base = buildLoanPlan(comboLoans, 360, method)
    const reducePayment = buildPrepaymentScenario(
      comboLoans, 360, method, 200_000, 60, 'reduce-payment',
    )
    const shortenTerm = buildPrepaymentScenario(
      comboLoans, 360, method, 200_000, 60, 'shorten-term',
    )
    assert.equal(reducePayment.termMonths, 360)
    assert.ok(reducePayment.totalInterest < base.totalInterest)
    assert.ok(shortenTerm.totalInterest < base.totalInterest)
    assert.ok(shortenTerm.termMonths < base.termMonths)
    closeTo(
      shortenTerm.schedule.reduce((sum, row) => sum + row.principal, 0),
      2_100_000,
    )
  }
})

test('每月多还会缩短期限，持有快照满足净值与现金投入关系', () => {
  const base = buildLoanPlan(comboLoans, 360, 'annuity')
  const noExtra = buildExtraPaymentScenario(comboLoans, 360, 'annuity', 0, 12)
  const extra = buildExtraPaymentScenario(comboLoans, 360, 'annuity', 2_000, 12)
  closeTo(noExtra.totalInterest, base.totalInterest)
  assert.equal(noExtra.termMonths, base.termMonths)
  assert.ok(extra.termMonths < base.termMonths)
  assert.ok(extra.totalInterest < base.totalInterest)

  const snapshot = buildHoldingSnapshot(base, 3_000_000, 900_000, 60, 2, 2, 200_000)
  closeTo(snapshot.netEquity, snapshot.homeValue - snapshot.remainingLoan)
  closeTo(snapshot.netPosition, snapshot.netEquity - snapshot.investedCash)
})
