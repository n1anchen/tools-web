<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Calendar,
  Coin,
  DataAnalysis,
  House,
  Money,
  Opportunity,
  Timer,
  TrendCharts,
  Wallet,
} from '@element-plus/icons-vue'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import SectionHeading from '@/components/Common/SectionHeading.vue'
import {
  buildExtraPaymentScenario,
  buildHoldingSnapshot,
  buildLoanPlan,
  buildPrepaymentScenario,
  buildRateScenario,
  type HoldingSnapshot,
  type LoanPlan,
  type LoanTranche,
  type PrepaymentMode,
  type RepaymentMethod,
} from './mortgage'

type LoanType = 'commercial' | 'fund' | 'combined'

interface MortgageInput {
  totalPrice: number
  downPayment: number
  loanType: LoanType
  termYears: number
  commercialRate: number
  fundRate: number
  fundAmount: number
}

interface PlanPair {
  annuity: LoanPlan
  equalPrincipal: LoanPlan
}

interface HoldingPair {
  annuity: HoldingSnapshot
  equalPrincipal: HoldingSnapshot
}

const form = reactive<MortgageInput>({
  totalPrice: 300,
  downPayment: 90,
  loanType: 'combined',
  termYears: 30,
  commercialRate: 3.1,
  fundRate: 2.6,
  fundAmount: 100,
})

const scenario = reactive({
  rateChange: 10,
  rateAfterYears: 5,
  prepaymentAmount: 20,
  prepaymentAfterYears: 5,
  prepaymentMode: 'reduce-payment' as PrepaymentMode,
  monthlyExtra: 2000,
  extraAfterYears: 1,
  holdingYears: 5,
  annualHomeChange: 2,
  transactionCostRate: 2,
  renovationCost: 20,
})

const plans = ref<PlanPair | null>(null)
const calculatedInput = ref<MortgageInput | null>(null)
const calculatedTranches = ref<LoanTranche[]>([])
const rateResults = ref<PlanPair | null>(null)
const prepaymentResults = ref<PlanPair | null>(null)
const extraResults = ref<PlanPair | null>(null)
const holdingResults = ref<HoldingPair | null>(null)
const activeScenario = ref('rate')
const scheduleMethod = ref<RepaymentMethod>('annuity')
const scheduleYear = ref(0)
const methodKeys: RepaymentMethod[] = ['annuity', 'equalPrincipal']

const loanAmountWan = computed(() => Math.max(0, form.totalPrice - form.downPayment))
const downPaymentRatio = computed(() => form.totalPrice > 0 ? form.downPayment / form.totalPrice * 100 : 0)
const fundLoanWan = computed(() => {
  if (form.loanType === 'fund') return loanAmountWan.value
  if (form.loanType === 'combined') return Math.min(loanAmountWan.value, Math.max(0, form.fundAmount))
  return 0
})
const commercialLoanWan = computed(() => Math.max(0, loanAmountWan.value - fundLoanWan.value))
const weightedRate = computed(() => {
  if (loanAmountWan.value <= 0) return 0
  return (
    commercialLoanWan.value * form.commercialRate
    + fundLoanWan.value * form.fundRate
  ) / loanAmountWan.value
})

const moneyFormatter = new Intl.NumberFormat('zh-CN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const compactFormatter = new Intl.NumberFormat('zh-CN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

function formatYuan(value: number) {
  return `¥${moneyFormatter.format(value)}`
}

function formatWan(value: number) {
  return `${compactFormatter.format(value / 10000)} 万`
}

function formatSignedWan(value: number) {
  const prefix = value > 0 ? '+' : ''
  return `${prefix}${compactFormatter.format(value / 10000)} 万`
}

function formatMonths(months: number) {
  const years = Math.floor(months / 12)
  const rest = months % 12
  if (!years) return `${rest} 个月`
  return rest ? `${years} 年 ${rest} 个月` : `${years} 年`
}

function periodLabel(month: number) {
  const year = Math.ceil(month / 12)
  const monthInYear = (month - 1) % 12 + 1
  return `第 ${year} 年 ${String(monthInYear).padStart(2, '0')} 月`
}

function buildTranches(input: MortgageInput): LoanTranche[] {
  const loanAmount = Math.max(0, input.totalPrice - input.downPayment) * 10000
  if (input.loanType === 'commercial') {
    return [{ name: '商业贷款', principal: loanAmount, annualRate: input.commercialRate }]
  }
  if (input.loanType === 'fund') {
    return [{ name: '公积金贷款', principal: loanAmount, annualRate: input.fundRate }]
  }
  const fundPrincipal = Math.min(loanAmount, Math.max(0, input.fundAmount) * 10000)
  return [
    { name: '商业贷款', principal: loanAmount - fundPrincipal, annualRate: input.commercialRate },
    { name: '公积金贷款', principal: fundPrincipal, annualRate: input.fundRate },
  ].filter(tranche => tranche.principal > 0)
}

function buildPair(tranches: LoanTranche[], months: number): PlanPair {
  return {
    annuity: buildLoanPlan(tranches, months, 'annuity'),
    equalPrincipal: buildLoanPlan(tranches, months, 'equalPrincipal'),
  }
}

function validateInput() {
  if (!Number.isFinite(form.totalPrice) || form.totalPrice <= 0) return '房屋总价需要大于 0'
  if (!Number.isFinite(form.downPayment) || form.downPayment < 0) return '首付金额不能小于 0'
  if (form.downPayment >= form.totalPrice) return '首付金额需要小于房屋总价'
  if (!Number.isFinite(form.termYears) || form.termYears <= 0) return '请选择有效贷款期限'
  if (form.loanType !== 'fund' && (!Number.isFinite(form.commercialRate) || form.commercialRate < 0)) {
    return '请输入有效的商业贷款利率'
  }
  if (form.loanType !== 'commercial' && (!Number.isFinite(form.fundRate) || form.fundRate < 0)) {
    return '请输入有效的公积金贷款利率'
  }
  if (form.loanType === 'combined' && (form.fundAmount <= 0 || form.fundAmount >= loanAmountWan.value)) {
    return '组合贷中的公积金贷款金额需要大于 0 且小于贷款总额'
  }
  return ''
}

function calculate() {
  const error = validateInput()
  if (error) {
    ElMessage.warning(error)
    return
  }
  const input = { ...form }
  const tranches = buildTranches(input)
  const months = input.termYears * 12
  calculatedInput.value = input
  calculatedTranches.value = tranches
  plans.value = buildPair(tranches, months)
  scheduleYear.value = 0
  runAllScenarios()
}

function runRateScenario() {
  if (!calculatedInput.value) return
  const months = calculatedInput.value.termYears * 12
  const afterMonths = Math.min(months - 1, Math.max(0, scenario.rateAfterYears * 12))
  rateResults.value = {
    annuity: buildRateScenario(calculatedTranches.value, months, 'annuity', scenario.rateChange, afterMonths),
    equalPrincipal: buildRateScenario(calculatedTranches.value, months, 'equalPrincipal', scenario.rateChange, afterMonths),
  }
}

function runPrepaymentScenario() {
  if (!calculatedInput.value) return
  const months = calculatedInput.value.termYears * 12
  const afterMonths = Math.min(months - 1, Math.max(1, scenario.prepaymentAfterYears * 12))
  const amount = Math.max(0, scenario.prepaymentAmount) * 10000
  prepaymentResults.value = {
    annuity: buildPrepaymentScenario(
      calculatedTranches.value, months, 'annuity', amount, afterMonths, scenario.prepaymentMode,
    ),
    equalPrincipal: buildPrepaymentScenario(
      calculatedTranches.value, months, 'equalPrincipal', amount, afterMonths, scenario.prepaymentMode,
    ),
  }
}

function selectPrepaymentMode(mode: PrepaymentMode) {
  scenario.prepaymentMode = mode
  runPrepaymentScenario()
}

function runExtraScenario() {
  if (!calculatedInput.value) return
  const months = calculatedInput.value.termYears * 12
  const startAfterMonths = Math.min(months - 1, Math.max(0, scenario.extraAfterYears * 12))
  extraResults.value = {
    annuity: buildExtraPaymentScenario(
      calculatedTranches.value, months, 'annuity', scenario.monthlyExtra, startAfterMonths,
    ),
    equalPrincipal: buildExtraPaymentScenario(
      calculatedTranches.value, months, 'equalPrincipal', scenario.monthlyExtra, startAfterMonths,
    ),
  }
}

function runHoldingScenario() {
  if (!calculatedInput.value || !plans.value) return
  const input = calculatedInput.value
  const holdMonths = scenario.holdingYears * 12
  const args = [
    input.totalPrice * 10000,
    input.downPayment * 10000,
    holdMonths,
    scenario.annualHomeChange,
    scenario.transactionCostRate,
    scenario.renovationCost * 10000,
  ] as const
  holdingResults.value = {
    annuity: buildHoldingSnapshot(plans.value.annuity, ...args),
    equalPrincipal: buildHoldingSnapshot(plans.value.equalPrincipal, ...args),
  }
}

function runAllScenarios() {
  runRateScenario()
  runPrepaymentScenario()
  runExtraScenario()
  runHoldingScenario()
}

const resultCards = computed(() => {
  if (!plans.value) return []
  return [
    { key: 'annuity' as const, title: '等额本息', subtitle: '每月金额稳定，前期压力更小', plan: plans.value.annuity },
    { key: 'equalPrincipal' as const, title: '等额本金', subtitle: '月供逐月减少，总利息更低', plan: plans.value.equalPrincipal },
  ]
})

const interestSavedByPrincipal = computed(() => {
  if (!plans.value) return 0
  return plans.value.annuity.totalInterest - plans.value.equalPrincipal.totalInterest
})

const scheduleYears = computed(() => {
  if (!plans.value) return []
  return Array.from({ length: Math.ceil(plans.value[scheduleMethod.value].termMonths / 12) }, (_, index) => index + 1)
})

const visibleSchedule = computed(() => {
  if (!plans.value) return []
  const rows = plans.value[scheduleMethod.value].schedule
  if (!scheduleYear.value) return rows
  const start = (scheduleYear.value - 1) * 12
  return rows.slice(start, start + 12)
})

function scenarioNextPayment(plan: LoanPlan, afterYears: number) {
  const index = Math.max(0, afterYears * 12)
  return plan.schedule[index]?.payment ?? 0
}

function setScheduleMethod(value: string | number | boolean | undefined) {
  if (value === 'annuity' || value === 'equalPrincipal') {
    scheduleMethod.value = value
    scheduleYear.value = 0
  }
}

calculate()
</script>

<template>
  <div class="mortgage-page flex flex-col mt-3 flex-1">
    <ToolHero />

    <section class="calculator-card">
      <SectionHeading :icon="House" title="购房与贷款信息" description="金额均以万元填写，利率按年利率计算" tone="blue" />

      <div class="input-grid">
        <label class="field-block">
          <span>房屋总价</span>
          <el-input-number v-model="form.totalPrice" :min="1" :step="10" :precision="1" controls-position="right" />
          <small>万元</small>
        </label>
        <label class="field-block">
          <span>首付金额</span>
          <el-input-number v-model="form.downPayment" :min="0" :max="Math.max(0, form.totalPrice - 0.1)" :step="10" :precision="1" controls-position="right" />
          <small>万元 · 首付 {{ downPaymentRatio.toFixed(1) }}%</small>
        </label>
        <label class="field-block">
          <span>贷款方式</span>
          <el-select v-model="form.loanType">
            <el-option label="组合贷款" value="combined" />
            <el-option label="商业贷款" value="commercial" />
            <el-option label="公积金贷款" value="fund" />
          </el-select>
          <small>贷款总额 {{ compactFormatter.format(loanAmountWan) }} 万元</small>
        </label>
        <label class="field-block">
          <span>贷款期限</span>
          <el-select v-model="form.termYears">
            <el-option v-for="year in [5, 10, 15, 20, 25, 30]" :key="year" :label="`${year} 年（${year * 12} 期）`" :value="year" />
          </el-select>
          <small>按月还款，共 {{ form.termYears * 12 }} 期</small>
        </label>
        <label v-if="form.loanType !== 'fund'" class="field-block">
          <span>商业贷款年利率</span>
          <el-input-number v-model="form.commercialRate" :min="0" :max="20" :step="0.05" :precision="3" controls-position="right" />
          <small>% · 商贷 {{ compactFormatter.format(commercialLoanWan) }} 万元</small>
        </label>
        <label v-if="form.loanType !== 'commercial'" class="field-block">
          <span>公积金贷款年利率</span>
          <el-input-number v-model="form.fundRate" :min="0" :max="20" :step="0.05" :precision="3" controls-position="right" />
          <small>% · 公积金 {{ compactFormatter.format(fundLoanWan) }} 万元</small>
        </label>
        <label v-if="form.loanType === 'combined'" class="field-block">
          <span>其中公积金贷款</span>
          <el-input-number v-model="form.fundAmount" :min="0.1" :max="Math.max(0.1, loanAmountWan - 0.1)" :step="5" :precision="1" controls-position="right" />
          <small>万元 · 其余自动计入商业贷款</small>
        </label>
      </div>

      <div class="loan-preview">
        <div><span>贷款本金</span><strong>{{ compactFormatter.format(loanAmountWan) }} 万</strong></div>
        <div><span>首付比例</span><strong>{{ downPaymentRatio.toFixed(1) }}%</strong></div>
        <div><span>加权年利率</span><strong>{{ weightedRate.toFixed(3) }}%</strong></div>
        <el-button type="primary" size="large" @click="calculate">
          <el-icon class="mr-1"><DataAnalysis /></el-icon>开始计算
        </el-button>
      </div>
    </section>

    <template v-if="plans">
      <section class="results-section">
        <SectionHeading class="section-heading-spaced" :icon="Wallet" title="两种还款方案" description="同一组贷款条件下同时计算，便于直接比较" tone="blue" />

        <div class="plan-grid">
          <article v-for="card in resultCards" :key="card.key" class="plan-card" :class="`plan-${card.key}`">
            <div class="plan-card-head">
              <div>
                <span class="plan-kicker">{{ card.key === 'annuity' ? '月供稳定' : '利息更省' }}</span>
                <h3>{{ card.title }}</h3>
                <p>{{ card.subtitle }}</p>
              </div>
              <el-icon><Money v-if="card.key === 'annuity'" /><TrendCharts v-else /></el-icon>
            </div>
            <div class="payment-hero">
              <span>{{ card.key === 'annuity' ? '每月月供' : '首月月供' }}</span>
              <strong>{{ formatYuan(card.plan.firstPayment) }}</strong>
              <em v-if="card.key === 'equalPrincipal'">每月约少 {{ formatYuan(card.plan.monthlyDecrease) }}</em>
              <em v-else>共 {{ card.plan.termMonths }} 期</em>
            </div>
            <div class="metric-grid">
              <div><span>贷款本金</span><strong>{{ formatWan(card.plan.totalPrincipal) }}</strong></div>
              <div><span>支付利息</span><strong>{{ formatWan(card.plan.totalInterest) }}</strong></div>
              <div><span>本息合计</span><strong>{{ formatWan(card.plan.totalPayment) }}</strong></div>
              <div><span>末月还款</span><strong>{{ formatYuan(card.plan.lastPayment) }}</strong></div>
            </div>
          </article>
        </div>

        <div class="comparison-note">
          <el-icon><Opportunity /></el-icon>
          <div>
            <strong>等额本金预计少付 {{ formatWan(interestSavedByPrincipal) }} 利息</strong>
            <span>但首月比等额本息多还 {{ formatYuan(plans.equalPrincipal.firstPayment - plans.annuity.firstPayment) }}，适合前期现金流更充裕的情况。</span>
          </div>
        </div>
      </section>

      <section class="schedule-card">
        <SectionHeading class="section-heading-spaced schedule-heading" :icon="Calendar" title="逐月还款明细" description="组合贷已按两部分贷款逐月汇总" tone="blue">
          <template #actions>
            <div class="schedule-filters">
              <el-radio-group :model-value="scheduleMethod" size="small" @change="setScheduleMethod">
                <el-radio-button value="annuity">等额本息</el-radio-button>
                <el-radio-button value="equalPrincipal">等额本金</el-radio-button>
              </el-radio-group>
              <el-select v-model="scheduleYear" size="small" class="year-select">
                <el-option label="全部年份" :value="0" />
                <el-option v-for="year in scheduleYears" :key="year" :label="`第 ${year} 年`" :value="year" />
              </el-select>
            </div>
          </template>
        </SectionHeading>
        <el-table :data="visibleSchedule" stripe height="460" class="schedule-table">
          <el-table-column label="期数" min-width="130" fixed>
            <template #default="scope">{{ periodLabel(scope.row.month) }}</template>
          </el-table-column>
          <el-table-column label="本期还款" min-width="130" align="right">
            <template #default="scope"><strong>{{ formatYuan(scope.row.payment) }}</strong></template>
          </el-table-column>
          <el-table-column label="偿还本金" min-width="125" align="right">
            <template #default="scope">{{ formatYuan(scope.row.principal) }}</template>
          </el-table-column>
          <el-table-column label="支付利息" min-width="115" align="right">
            <template #default="scope">{{ formatYuan(scope.row.interest) }}</template>
          </el-table-column>
          <el-table-column label="剩余本金" min-width="140" align="right">
            <template #default="scope">{{ formatYuan(scope.row.balance) }}</template>
          </el-table-column>
        </el-table>
      </section>

      <section class="scenario-section">
        <SectionHeading class="section-heading-spaced" :icon="Coin" tone="amber" title="假设情景分析" description="对利率、提前还款、月度预算和房价变化进行压力测试" />

        <el-tabs v-model="activeScenario" class="scenario-tabs">
          <el-tab-pane label="利率变化" name="rate">
            <div class="scenario-layout">
              <div class="scenario-controls">
                <h3>如果贷款利率发生变化</h3>
                <p>按原利率的相对百分比调整，例如 3.1% 上浮 10% 后为 3.41%。</p>
                <div class="control-grid">
                  <label class="field-block"><span>利率增加 / 减少</span><el-input-number v-model="scenario.rateChange" :min="-100" :max="300" :step="5" :precision="1" controls-position="right" /><small>% · 负数表示降低</small></label>
                  <label class="field-block"><span>从还款满几年后调整</span><el-input-number v-model="scenario.rateAfterYears" :min="0" :max="Math.max(0, form.termYears - 1)" :step="1" controls-position="right" /><small>填 0 表示从首期开始</small></label>
                </div>
                <el-button type="primary" plain @click="runRateScenario">重新模拟</el-button>
              </div>
              <div v-if="rateResults" class="scenario-results">
                <div v-for="method in methodKeys" :key="method" class="scenario-result-card">
                  <h4>{{ method === 'annuity' ? '等额本息' : '等额本金' }}</h4>
                  <div><span>调整后月供</span><strong>{{ formatYuan(scenarioNextPayment(rateResults[method], scenario.rateAfterYears)) }}</strong></div>
                  <div><span>总利息变化</span><strong :class="rateResults[method].totalInterest > plans[method].totalInterest ? 'negative' : 'positive'">{{ formatSignedWan(rateResults[method].totalInterest - plans[method].totalInterest) }}</strong></div>
                  <div><span>调整后总利息</span><strong>{{ formatWan(rateResults[method].totalInterest) }}</strong></div>
                </div>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="提前还款" name="prepayment">
            <div class="scenario-layout">
              <div class="scenario-controls">
                <h3>一次性提前偿还部分本金</h3>
                <p>组合贷按操作时的剩余本金比例分摊，结果已计入提前偿还的现金。</p>
                <div class="control-grid">
                  <label class="field-block"><span>提前还款金额</span><el-input-number v-model="scenario.prepaymentAmount" :min="0.1" :step="5" :precision="1" controls-position="right" /><small>万元</small></label>
                  <label class="field-block"><span>还款满几年后操作</span><el-input-number v-model="scenario.prepaymentAfterYears" :min="1" :max="Math.max(1, form.termYears - 1)" :step="1" controls-position="right" /><small>默认在该年最后一期后操作</small></label>
                </div>
                <div class="mode-selector">
                  <button :class="{ active: scenario.prepaymentMode === 'reduce-payment' }" @click="selectPrepaymentMode('reduce-payment')">
                    <strong>期限不变</strong><span>减少后续月供</span>
                  </button>
                  <button :class="{ active: scenario.prepaymentMode === 'shorten-term' }" @click="selectPrepaymentMode('shorten-term')">
                    <strong>月供基本不变</strong><span>缩短还款时间</span>
                  </button>
                </div>
                <el-button type="primary" plain @click="runPrepaymentScenario">重新模拟</el-button>
              </div>
              <div v-if="prepaymentResults" class="scenario-results">
                <div v-for="method in methodKeys" :key="method" class="scenario-result-card">
                  <h4>{{ method === 'annuity' ? '等额本息' : '等额本金' }}</h4>
                  <div><span>操作后下一期</span><strong>{{ formatYuan(scenarioNextPayment(prepaymentResults[method], scenario.prepaymentAfterYears)) }}</strong></div>
                  <div><span>预计节省利息</span><strong class="positive">{{ formatWan(Math.max(0, plans[method].totalInterest - prepaymentResults[method].totalInterest)) }}</strong></div>
                  <div><span>预计还款期限</span><strong>{{ formatMonths(prepaymentResults[method].termMonths) }}</strong></div>
                  <div v-if="scenario.prepaymentMode === 'shorten-term'"><span>缩短时间</span><strong class="positive">{{ formatMonths(Math.max(0, plans[method].termMonths - prepaymentResults[method].termMonths)) }}</strong></div>
                </div>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="每月多还" name="extra">
            <div class="scenario-layout">
              <div class="scenario-controls">
                <h3>把每月结余持续用于还本金</h3>
                <p>新增本金优先偿还利率更高的贷款，可估算长期坚持的时间与利息收益。</p>
                <div class="control-grid">
                  <label class="field-block"><span>每月额外还款</span><el-input-number v-model="scenario.monthlyExtra" :min="0" :step="500" :precision="0" controls-position="right" /><small>元 / 月</small></label>
                  <label class="field-block"><span>还款满几年后开始</span><el-input-number v-model="scenario.extraAfterYears" :min="0" :max="Math.max(0, form.termYears - 1)" :step="1" controls-position="right" /><small>填 0 表示从首期开始</small></label>
                </div>
                <el-button type="primary" plain @click="runExtraScenario">重新模拟</el-button>
              </div>
              <div v-if="extraResults" class="scenario-results">
                <div v-for="method in methodKeys" :key="method" class="scenario-result-card">
                  <h4>{{ method === 'annuity' ? '等额本息' : '等额本金' }}</h4>
                  <div><span>预计还清时间</span><strong>{{ formatMonths(extraResults[method].termMonths) }}</strong></div>
                  <div><span>可提前还清</span><strong class="positive">{{ formatMonths(Math.max(0, plans[method].termMonths - extraResults[method].termMonths)) }}</strong></div>
                  <div><span>预计节省利息</span><strong class="positive">{{ formatWan(Math.max(0, plans[method].totalInterest - extraResults[method].totalInterest)) }}</strong></div>
                </div>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="房价与持有成本" name="holding">
            <div class="scenario-layout">
              <div class="scenario-controls">
                <h3>如果持有一段时间后评估净资产</h3>
                <p>把首付、累计月供、交易费用和装修都视为现金投入；暂不计租金、税费减免和资金机会成本。</p>
                <div class="control-grid control-grid-dense">
                  <label class="field-block"><span>持有年数</span><el-input-number v-model="scenario.holdingYears" :min="1" :max="form.termYears" :step="1" controls-position="right" /><small>年</small></label>
                  <label class="field-block"><span>房价年均变化</span><el-input-number v-model="scenario.annualHomeChange" :min="-50" :max="100" :step="1" :precision="1" controls-position="right" /><small>% · 负数表示下跌</small></label>
                  <label class="field-block"><span>交易及一次性费用</span><el-input-number v-model="scenario.transactionCostRate" :min="0" :max="20" :step="0.5" :precision="1" controls-position="right" /><small>占房屋总价 %</small></label>
                  <label class="field-block"><span>装修与置办费用</span><el-input-number v-model="scenario.renovationCost" :min="0" :step="5" :precision="1" controls-position="right" /><small>万元</small></label>
                </div>
                <el-button type="primary" plain @click="runHoldingScenario">重新模拟</el-button>
              </div>
              <div v-if="holdingResults" class="scenario-results">
                <div v-for="method in methodKeys" :key="method" class="scenario-result-card">
                  <h4>{{ method === 'annuity' ? '等额本息' : '等额本金' }}</h4>
                  <div><span>预计房屋价值</span><strong>{{ formatWan(holdingResults[method].homeValue) }}</strong></div>
                  <div><span>届时剩余贷款</span><strong>{{ formatWan(holdingResults[method].remainingLoan) }}</strong></div>
                  <div><span>房屋净值</span><strong>{{ formatWan(holdingResults[method].netEquity) }}</strong></div>
                  <div><span>投入后净差额</span><strong :class="holdingResults[method].netPosition >= 0 ? 'positive' : 'negative'">{{ formatSignedWan(holdingResults[method].netPosition) }}</strong></div>
                </div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </section>
    </template>

    <ToolGuide title="计算说明">
      <div class="explanation-grid">
        <div><el-icon><Timer /></el-icon><p><strong>等额本息</strong><span>每月偿还相同金额，前期利息占比更高，适合希望现金流稳定的家庭。</span></p></div>
        <div><el-icon><TrendCharts /></el-icon><p><strong>等额本金</strong><span>每月本金相同、利息逐月减少，前期还款较高但总利息通常更少。</span></p></div>
        <div><el-icon><Coin /></el-icon><p><strong>结果仅供测算</strong><span>实际执行以银行重定价日、计息规则、提前还款违约金和审批结果为准。</span></p></div>
      </div>
    </ToolGuide>
  </div>
</template>

<style scoped>
.mortgage-page { color: #334155; }
.calculator-card,
.results-section,
.schedule-card,
.scenario-section {
  padding: 24px;
  margin-bottom: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.045);
}
.section-heading-spaced { margin-bottom: 18px; }
.input-grid {
  display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px 16px;
  margin-top: 22px;
}
.field-block { position: relative; display: flex; min-width: 0; flex-direction: column; gap: 7px; }
.field-block > span { color: #475569; font-size: 13px; font-weight: 650; }
.field-block small { min-height: 16px; color: #94a3b8; font-size: 11px; line-height: 16px; }
.field-block :deep(.el-input-number), .field-block :deep(.el-select) { width: 100%; }
.field-block :deep(.el-input__wrapper), .field-block :deep(.el-select__wrapper) {
  min-height: 40px; border-radius: 10px; box-shadow: 0 0 0 1px #e2e8f0 inset;
}
.loan-preview {
  display: grid; grid-template-columns: repeat(3, 1fr) auto; align-items: center; gap: 12px;
  margin-top: 20px; padding: 14px 16px; border: 1px solid #dbeafe; border-radius: 14px;
  background: linear-gradient(110deg, #f8fbff, #eff6ff);
}
.loan-preview > div { display: flex; flex-direction: column; gap: 3px; }
.loan-preview span { color: #64748b; font-size: 11px; }
.loan-preview strong { color: #1e3a8a; font-size: 15px; }
.loan-preview :deep(.el-button) { min-width: 132px; border-radius: 10px; }
.plan-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.plan-card { position: relative; overflow: hidden; border: 1px solid #e2e8f0; border-radius: 16px; }
.plan-card::after {
  content: ''; position: absolute; top: -60px; right: -50px; width: 150px; height: 150px;
  border-radius: 50%; opacity: .65;
}
.plan-annuity::after { background: radial-gradient(circle, #dbeafe, transparent 68%); }
.plan-equalPrincipal::after { background: radial-gradient(circle, #dcfce7, transparent 68%); }
.plan-card-head { display: flex; justify-content: space-between; padding: 20px 20px 14px; }
.plan-card-head h3 { margin: 3px 0 1px; color: #172033; font-size: 21px; }
.plan-card-head p { margin: 0; color: #94a3b8; font-size: 12px; }
.plan-card-head > .el-icon { z-index: 1; color: #93c5fd; font-size: 30px; }
.plan-equalPrincipal .plan-card-head > .el-icon { color: #86efac; }
.plan-kicker { color: #2563eb; font-size: 11px; font-weight: 700; letter-spacing: .08em; }
.plan-equalPrincipal .plan-kicker { color: #059669; }
.payment-hero { display: flex; flex-direction: column; padding: 16px 20px; background: #f8fafc; }
.payment-hero span { color: #64748b; font-size: 12px; }
.payment-hero strong { margin: 3px 0; color: #0f172a; font-size: clamp(24px, 3vw, 32px); line-height: 1.2; }
.payment-hero em { color: #94a3b8; font-size: 11px; font-style: normal; }
.metric-grid { display: grid; grid-template-columns: repeat(2, 1fr); padding: 6px 20px 16px; }
.metric-grid div { display: flex; flex-direction: column; gap: 4px; padding: 12px 0; border-bottom: 1px dashed #e2e8f0; }
.metric-grid div:nth-child(odd) { padding-right: 12px; }
.metric-grid div:nth-child(even) { padding-left: 12px; border-left: 1px dashed #e2e8f0; }
.metric-grid span { color: #94a3b8; font-size: 11px; }
.metric-grid strong { color: #334155; font-size: 14px; }
.comparison-note {
  display: flex; align-items: flex-start; gap: 10px; margin-top: 14px; padding: 13px 15px;
  border: 1px solid #d1fae5; border-radius: 12px; color: #047857; background: #ecfdf5;
}
.comparison-note > .el-icon { margin-top: 2px; font-size: 18px; }
.comparison-note div { display: flex; flex-direction: column; gap: 2px; }
.comparison-note strong { font-size: 13px; }
.comparison-note span { color: #5f8e7d; font-size: 11px; }
.schedule-heading { align-items: center; }
.schedule-filters { display: flex; align-items: center; gap: 10px; }
.year-select { width: 116px; }
.schedule-card :deep(.el-table) { --el-table-border-color: #eef2f7; border-radius: 12px; }
.schedule-card :deep(.el-table th.el-table__cell) { color: #64748b; background: #f8fafc; font-size: 12px; }
.schedule-card :deep(.el-table td.el-table__cell) { color: #475569; font-size: 12px; }
.scenario-tabs :deep(.el-tabs__header) { margin-bottom: 18px; }
.scenario-tabs :deep(.el-tabs__item) { height: 38px; color: #64748b; font-size: 13px; }
.scenario-layout { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(320px, .8fr); gap: 20px; }
.scenario-controls { padding: 18px; border: 1px solid #e2e8f0; border-radius: 14px; background: #fbfdff; }
.scenario-controls h3 { margin: 0; color: #1e293b; font-size: 15px; }
.scenario-controls > p { margin: 6px 0 16px; color: #94a3b8; font-size: 11px; line-height: 1.6; }
.control-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 13px; margin-bottom: 14px; }
.control-grid-dense { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.scenario-controls :deep(.el-button) { border-radius: 9px; }
.mode-selector { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 2px 0 14px; }
.mode-selector button {
  display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; border: 1px solid #e2e8f0;
  border-radius: 10px; color: #64748b; text-align: left; background: #fff; cursor: pointer; transition: .2s;
}
.mode-selector button:hover { border-color: #93c5fd; }
.mode-selector button.active { border-color: #3b82f6; color: #1d4ed8; background: #eff6ff; box-shadow: 0 0 0 2px rgba(59, 130, 246, .08); }
.mode-selector strong { font-size: 12px; }
.mode-selector span { color: #94a3b8; font-size: 10px; }
.scenario-results { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.scenario-result-card { padding: 16px; border: 1px solid #e2e8f0; border-radius: 14px; background: #fff; }
.scenario-result-card h4 { margin: 0 0 10px; color: #334155; font-size: 14px; }
.scenario-result-card > div { display: flex; flex-direction: column; gap: 2px; padding: 9px 0; border-top: 1px dashed #e2e8f0; }
.scenario-result-card span { color: #94a3b8; font-size: 10px; }
.scenario-result-card strong { color: #334155; font-size: 13px; }
.positive { color: #059669 !important; }
.negative { color: #dc2626 !important; }
.explanation-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; }
.explanation-grid > div { display: flex; align-items: flex-start; gap: 10px; }
.explanation-grid .el-icon { flex: 0 0 auto; margin-top: 2px; color: #3b82f6; font-size: 18px; }
.explanation-grid p { display: flex; flex-direction: column; gap: 4px; margin: 0; }
.explanation-grid strong { color: #334155; font-size: 13px; }
.explanation-grid span { color: #94a3b8; font-size: 11px; line-height: 1.6; }

:global(html.dark .mortgage-page) { color: #cbd5e1; }
:global(html.dark .mortgage-page .calculator-card),
:global(html.dark .mortgage-page .results-section),
:global(html.dark .mortgage-page .schedule-card),
:global(html.dark .mortgage-page .scenario-section) { border-color: #334155; background: #1e293b; box-shadow: none; }
:global(html.dark .mortgage-page .plan-card-head h3),
:global(html.dark .mortgage-page .payment-hero strong),
:global(html.dark .mortgage-page .scenario-controls h3),
:global(html.dark .mortgage-page .scenario-result-card h4),
:global(html.dark .mortgage-page .scenario-result-card strong),
:global(html.dark .mortgage-page .explanation-grid strong) { color: #e2e8f0; }
:global(html.dark .mortgage-page .field-block > span),
:global(html.dark .mortgage-page .metric-grid strong) { color: #cbd5e1; }
:global(html.dark .mortgage-page .loan-preview) { border-color: #1e3a5f; background: linear-gradient(110deg, #172033, #172554); }
:global(html.dark .mortgage-page .loan-preview strong) { color: #bfdbfe; }
:global(html.dark .mortgage-page .plan-card),
:global(html.dark .mortgage-page .scenario-controls),
:global(html.dark .mortgage-page .scenario-result-card) { border-color: #334155; background: #172033; }
:global(html.dark .mortgage-page .payment-hero) { background: #0f172a; }
:global(html.dark .mortgage-page .metric-grid div),
:global(html.dark .mortgage-page .scenario-result-card > div) { border-color: #334155; }
:global(html.dark .mortgage-page .metric-grid div:nth-child(even)) { border-left-color: #334155; }
:global(html.dark .mortgage-page .comparison-note) { border-color: #14532d; color: #6ee7b7; background: rgba(6, 78, 59, .25); }
:global(html.dark .mortgage-page .comparison-note span) { color: #6b9e8b; }
:global(html.dark .mortgage-page .mode-selector button) { border-color: #334155; color: #cbd5e1; background: #0f172a; }
:global(html.dark .mortgage-page .mode-selector button.active) { border-color: #3b82f6; color: #93c5fd; background: rgba(30, 64, 175, .25); }@media (max-width: 1100px) {
  .input-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .scenario-layout { grid-template-columns: 1fr; }}@media (max-width: 760px) {
  .calculator-card, .results-section, .schedule-card, .scenario-section { padding: 16px; border-radius: 14px; }
  .input-grid, .plan-grid { grid-template-columns: 1fr; }
  .loan-preview { grid-template-columns: repeat(3, 1fr); }
  .loan-preview :deep(.el-button) { grid-column: 1 / -1; width: 100%; }
  .schedule-heading { align-items: flex-start; flex-wrap: wrap; }
  .schedule-filters { width: 100%; justify-content: space-between; }
  .scenario-results { grid-template-columns: 1fr; }
  .explanation-grid { grid-template-columns: 1fr; }}@media (max-width: 480px) {
  .input-grid, .control-grid, .control-grid-dense { grid-template-columns: 1fr; }
  .loan-preview { grid-template-columns: 1fr 1fr; }
  .loan-preview > div:last-of-type { grid-column: 1 / -1; }
  .mode-selector { grid-template-columns: 1fr; }
  .schedule-filters { align-items: stretch; flex-direction: column; }
  .schedule-filters :deep(.el-radio-group), .year-select { width: 100%; }
  .schedule-filters :deep(.el-radio-button) { flex: 1; }
  .schedule-filters :deep(.el-radio-button__inner) { width: 100%; }}</style>
