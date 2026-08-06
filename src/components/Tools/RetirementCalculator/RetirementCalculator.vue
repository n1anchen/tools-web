<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Calendar,
  CircleCheck,
  Clock,
  DataLine,
  Document,
  InfoFilled,
  Postcard,
  Timer,
  TrendCharts,
  User,
  Warning,
} from '@element-plus/icons-vue'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import SectionHeading from '@/components/Common/SectionHeading.vue'
import {
  calculateRetirement,
  formatAge,
  formatMonth,
  generateReferenceRows,
  minimumContributionYearsForYear,
  retirementCategoryConfigs,
  type RetirementCategory,
  type RetirementReferenceRow,
  type RetirementResult,
} from './retirement'

const now = new Date()
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

const form = reactive({
  birthMonth: '1985-08',
  category: 'male' as RetirementCategory,
  paidYears: 12,
})

const result = ref<RetirementResult | null>(null)
const referenceCategory = ref<RetirementCategory>('male')
const showFullReference = ref(false)

const categoryOptions = (Object.keys(retirementCategoryConfigs) as RetirementCategory[]).map(value => ({
  value,
  ...retirementCategoryConfigs[value],
}))

function calculate() {
  if (!form.birthMonth) {
    ElMessage.warning('请选择出生年月')
    return
  }
  try {
    const calculated = calculateRetirement(form.birthMonth, form.category, currentMonth)
    if (calculated.currentAgeMonths < 0) {
      ElMessage.warning('出生年月不能晚于当前月份')
      return
    }
    result.value = calculated
    referenceCategory.value = form.category
    showFullReference.value = false
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '计算失败，请检查输入')
  }
}

const monthsUntilText = computed(() => {
  if (!result.value) return ''
  const months = result.value.monthsUntilStatutory
  if (months === 0) return '本月达到法定退休年龄'
  if (months < 0) return `已超过 ${formatDuration(-months)}`
  return `还有 ${formatDuration(months)}`
})

function formatDuration(monthsValue: number) {
  const months = Math.max(0, Math.floor(monthsValue))
  const years = Math.floor(months / 12)
  const rest = months % 12
  if (!years) return `${rest}个月`
  return rest ? `${years}年${rest}个月` : `${years}年`
}

function formatContributionYears(value: number) {
  const years = Math.floor(value)
  const months = Math.round((value - years) * 12)
  if (!months) return `${years}年`
  return `${years}年${months}个月`
}

const projectedContributionYears = computed(() => {
  if (!result.value) return form.paidYears
  const futureYears = Math.max(0, result.value.monthsUntilStatutory) / 12
  return Math.max(0, form.paidYears) + futureYears
})

const contributionGap = computed(() => {
  if (!result.value) return 0
  return result.value.minimumContributionYears - projectedContributionYears.value
})

const referenceRows = computed(() => generateReferenceRows(referenceCategory.value))
const targetReferenceDelay = computed(() => {
  try {
    const delay = calculateRetirement(form.birthMonth, referenceCategory.value, currentMonth).delayMonths
    return Math.max(1, Math.min(delay || 1, retirementCategoryConfigs[referenceCategory.value].maxDelayMonths))
  } catch {
    return 1
  }
})
const visibleReferenceRows = computed(() => {
  if (showFullReference.value) return referenceRows.value
  const targetIndex = targetReferenceDelay.value - 1
  const start = Math.max(0, Math.min(referenceRows.value.length - 7, targetIndex - 3))
  return referenceRows.value.slice(start, start + 7)
})

const contributionReference = computed(() => {
  return Array.from({ length: 15 }, (_, index) => {
    const year = 2025 + index
    return { year, years: minimumContributionYearsForYear(year) }
  })
})

function referenceRowClass({ row }: { row: RetirementReferenceRow }) {
  if (
    result.value
    && result.value.category === referenceCategory.value
    && row.delayMonths === result.value.delayMonths
  ) return 'current-cohort'
  return ''
}

function disableFutureMonth(date: Date) {
  return date.getTime() > new Date(now.getFullYear(), now.getMonth() + 1, 0).getTime()
}

function onReferenceTabChange(value: string | number) {
  if (value === 'male' || value === 'female55' || value === 'female50') {
    referenceCategory.value = value
    showFullReference.value = false
  }
}

calculate()
</script>

<template>
  <div class="retirement-page flex flex-col mt-3 flex-1">
    <ToolHero />

    <section class="calculator-card">
      <SectionHeading :icon="User" title="填写个人信息" description="出生日期只需精确到月份，计算结果按现行全国统一政策生成" tone="blue" />

      <div class="form-grid">
        <label class="field-block">
          <span>出生年月</span>
          <el-date-picker
            v-model="form.birthMonth"
            type="month"
            value-format="YYYY-MM"
            format="YYYY年MM月"
            placeholder="选择出生年月"
            :disabled-date="disableFutureMonth"
          />
          <small>退休年龄对照表按出生月份划分</small>
        </label>
        <label class="field-block">
          <span>当前累计养老保险缴费</span>
          <el-input-number v-model="form.paidYears" :min="0" :max="50" :step="0.5" :precision="1" controls-position="right" />
          <small>年 · 仅用于估算退休时能否达到最低缴费年限</small>
        </label>
      </div>

      <div class="category-label">人员类别</div>
      <div class="category-grid">
        <button
          v-for="option in categoryOptions"
          :key="option.value"
          :class="{ active: form.category === option.value }"
          @click="form.category = option.value"
        >
          <span class="category-radio"></span>
          <span><strong>{{ option.label }}</strong><small>{{ option.description }}</small></span>
        </button>
      </div>

      <div class="calculate-bar">
        <div>
          <span>政策起始时间</span>
          <strong>2025年1月1日</strong>
        </div>
        <div>
          <span>计算精度</span>
          <strong>精确到月份</strong>
        </div>
        <el-button type="primary" size="large" @click="calculate">
          <el-icon class="mr-1"><DataLine /></el-icon>开始计算
        </el-button>
      </div>
    </section>

    <template v-if="result">
      <section class="result-section">
        <div class="result-hero">
          <div class="hero-copy">
            <span class="eyebrow">改革后法定退休年龄</span>
            <h2>{{ formatAge(result.statutoryAgeMonths) }}</h2>
            <p>预计在 <strong>{{ formatMonth(result.statutoryRetirementMonth) }}</strong> 达到法定退休年龄</p>
            <span class="countdown" :class="{ reached: result.monthsUntilStatutory <= 0 }">
              <el-icon><Clock /></el-icon>{{ monthsUntilText }}
            </span>
          </div>
          <div class="delay-badge">
            <span>相比原政策</span>
            <strong>{{ result.delayMonths ? `延迟 ${result.delayMonths} 个月` : '没有延迟' }}</strong>
            <small>当前年龄 {{ formatAge(result.currentAgeMonths) }}</small>
          </div>
        </div>

        <el-alert
          v-if="!result.policyApplies"
          title="您在2024年12月31日前已达到原法定退休年龄，不适用新的渐进式延迟退休办法。"
          type="info"
          show-icon
          :closable="false"
          class="policy-alert"
        />

        <div class="retirement-timeline">
          <div class="timeline-card">
            <span class="timeline-dot original"></span>
            <div><small>原法定退休</small><strong>{{ formatAge(result.originalAgeMonths) }}</strong><em>{{ formatMonth(result.originalRetirementMonth) }}</em></div>
          </div>
          <div class="timeline-connector"></div>
          <div class="timeline-card featured">
            <span class="timeline-dot statutory"></span>
            <div><small>改革后法定退休</small><strong>{{ formatAge(result.statutoryAgeMonths) }}</strong><em>{{ formatMonth(result.statutoryRetirementMonth) }}</em></div>
          </div>
          <div class="timeline-connector"></div>
          <div class="timeline-card">
            <span class="timeline-dot latest"></span>
            <div><small>最晚弹性延迟</small><strong>{{ formatAge(result.latestFlexibleAgeMonths) }}</strong><em>{{ formatMonth(result.latestFlexibleMonth) }}</em></div>
          </div>
        </div>
      </section>

      <section v-if="result.policyApplies" class="flexible-section">
        <SectionHeading class="section-heading-spaced" :icon="TrendCharts" title="可选择的弹性退休区间" description="提前退休需达到对应年份最低缴费年限，延迟退休需与单位协商一致" tone="blue" />
        <div class="flexible-grid">
          <article>
            <div class="option-icon early"><el-icon><Timer /></el-icon></div>
            <span>最早可选择</span>
            <strong>{{ formatAge(result.earliestFlexibleAgeMonths) }}</strong>
            <em>{{ formatMonth(result.earliestFlexibleMonth) }}</em>
            <p>距法定退休最多提前3年，且不得早于原法定退休年龄。</p>
          </article>
          <article class="recommended">
            <div class="option-icon normal"><el-icon><Calendar /></el-icon></div>
            <span>法定退休时间</span>
            <strong>{{ formatAge(result.statutoryAgeMonths) }}</strong>
            <em>{{ formatMonth(result.statutoryRetirementMonth) }}</em>
            <p>达到法定退休年龄时，由所在单位按规定办理退休手续。</p>
          </article>
          <article>
            <div class="option-icon late"><el-icon><Postcard /></el-icon></div>
            <span>最晚可协商延迟至</span>
            <strong>{{ formatAge(result.latestFlexibleAgeMonths) }}</strong>
            <em>{{ formatMonth(result.latestFlexibleMonth) }}</em>
            <p>距法定年龄最多延迟3年，部分机关和国企管理人员另有规定。</p>
          </article>
        </div>
      </section>

      <section class="contribution-section">
        <SectionHeading class="section-heading-spaced" :icon="CircleCheck" title="最低缴费年限预估" description="2030年起由15年逐步提高至20年，每年增加6个月" tone="blue" />
        <div class="contribution-card" :class="contributionGap <= 0 ? 'enough' : 'shortfall'">
          <div>
            <span>{{ formatMonth(result.statutoryRetirementMonth) }} 对应最低年限</span>
            <strong>{{ formatContributionYears(result.minimumContributionYears) }}</strong>
          </div>
          <div>
            <span>若从现在起连续缴费，届时预计累计</span>
            <strong>{{ formatContributionYears(projectedContributionYears) }}</strong>
          </div>
          <div class="contribution-status">
            <el-icon><CircleCheck v-if="contributionGap <= 0" /><Warning v-else /></el-icon>
            <span v-if="contributionGap <= 0"><strong>预计满足要求</strong><small>仍以社保经办机构最终核定为准</small></span>
            <span v-else><strong>预计还差 {{ formatContributionYears(contributionGap) }}</strong><small>可关注延长缴费等当地实施办法</small></span>
          </div>
        </div>
      </section>

      <section class="reference-section">
        <SectionHeading class="section-heading-spaced table-heading" :icon="Document" title="延迟退休年龄参考表" description="同一行出生区间对应相同延迟月数；您的所属区间将以蓝色标记" tone="blue">
          <template #actions>
            <el-button text type="primary" @click="showFullReference = !showFullReference">
              {{ showFullReference ? '收起完整表' : '查看完整表' }}
            </el-button>
          </template>
        </SectionHeading>

        <el-tabs :model-value="referenceCategory" class="reference-tabs" @tab-change="onReferenceTabChange">
          <el-tab-pane v-for="option in categoryOptions" :key="option.value" :label="option.shortLabel" :name="option.value" />
        </el-tabs>

        <div class="table-summary">
          <el-icon><InfoFilled /></el-icon>
          <span>
            {{ retirementCategoryConfigs[referenceCategory].label }}：原退休年龄
            {{ formatAge(retirementCategoryConfigs[referenceCategory].originalAgeMonths) }}，
            每{{ retirementCategoryConfigs[referenceCategory].intervalMonths }}个出生月份延迟1个月，
            最终延迟至{{ formatAge(retirementCategoryConfigs[referenceCategory].originalAgeMonths + retirementCategoryConfigs[referenceCategory].maxDelayMonths) }}。
          </span>
        </div>

        <el-table
          :data="visibleReferenceRows"
          stripe
          class="reference-table"
          :row-class-name="referenceRowClass"
          max-height="520"
        >
          <el-table-column prop="birthRange" label="出生年月" min-width="210" />
          <el-table-column prop="retirementAge" label="改革后法定退休年龄" min-width="180" />
          <el-table-column prop="retirementRange" label="对应退休年月" min-width="210" />
          <el-table-column label="延迟月数" width="110" align="center">
            <template #default="scope"><strong>{{ scope.row.delayMonths }}个月</strong></template>
          </el-table-column>
        </el-table>
        <p v-if="!showFullReference" class="table-footnote">当前展示与所选出生年月相邻的7个档位，点击“查看完整表”可展开全部。</p>

        <div class="minimum-years-reference">
          <h3>按月领取基本养老金最低缴费年限参考</h3>
          <div class="year-chips">
            <div v-for="item in contributionReference" :key="item.year">
              <span>{{ item.year }}年</span><strong>{{ formatContributionYears(item.years) }}</strong>
            </div>
          </div>
        </div>
      </section>
    </template>

    <ToolGuide title="政策依据与使用说明">
      <div class="policy-notes">
        <div><el-icon><Document /></el-icon><p><strong>官方政策依据</strong><span>依据2024年9月全国人大常委会决定及2025年起施行的弹性退休制度暂行办法。</span><a href="https://www.npc.gov.cn/npc/c2/kgfb/202409/t20240913_439534.html" target="_blank" rel="noopener noreferrer">查看全国人大决定</a></p></div>
        <div><el-icon><TrendCharts /></el-icon><p><strong>弹性退休并非自动提前</strong><span>弹性提前退休需要满足最低缴费年限；弹性延迟退休需职工与单位协商一致。</span><a href="https://www.mohrss.gov.cn/wap/zc/zcwj/202501/t20250101_533701.html" target="_blank" rel="noopener noreferrer">查看人社部办法</a></p></div>
        <div><el-icon><InfoFilled /></el-icon><p><strong>结果仅供参考</strong><span>特殊工种、病残津贴、人员类别认定及地方办理口径不在通用计算范围内，请以档案和人社部门核定为准。</span><a href="https://fuwu.rsj.beijing.gov.cn/zhrs/zgtx/retire-calculator" target="_blank" rel="noopener noreferrer">官方计算器参考</a></p></div>
      </div>
    </ToolGuide>
  </div>
</template>

<style scoped>
.retirement-page {
  color: var(--c-text-strong);
}
.calculator-card, .result-section, .flexible-section, .contribution-section, .reference-section {
  margin-bottom: 16px;
  padding: 24px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  background: var(--c-surface);
  box-shadow: 0 8px 24px rgba(15, 23, 42, .045);
}
.section-heading-spaced {
  margin-bottom: 18px;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 22px;
}
.field-block {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 7px;
}
.field-block > span, .category-label {
  color: var(--c-text-body);
  font-size: 13px;
  font-weight: 650;
}
.field-block small {
  min-height: 16px;
  color: var(--c-text-muted);
  font-size: 11px;
  line-height: 16px;
}
.field-block :deep(.el-date-editor), .field-block :deep(.el-input-number) {
  width: 100%;
}
.field-block :deep(.el-input__wrapper) {
  min-height: 40px;
  border-radius: var(--radius-sm);
  box-shadow: 0 0 0 1px #e2e8f0 inset;
}
.category-label {
  margin: 18px 0 9px;
}
.category-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.category-grid button {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-height: 72px;
  padding: 13px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  color: var(--c-text-body);
  text-align: left;
  background: var(--c-surface);
  cursor: pointer;
  transition: .2s;
}
.category-grid button:hover {
  border-color: #93c5fd;
}
.category-grid button.active {
  border-color: #3b82f6;
  color: #1d4ed8;
  background: #eff6ff;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, .08);
}
.category-radio {
  width: 14px;
  height: 14px;
  flex: 0 0 14px;
  margin-top: 2px;
  border: 2px solid #cbd5e1;
  border-radius: 50%;
}
.category-grid button.active .category-radio {
  border: 4px solid #3b82f6;
  background: var(--c-surface);
}
.category-grid button > span:last-child {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.category-grid strong {
  font-size: 12px;
}
.category-grid small {
  color: var(--c-text-muted);
  font-size: 10px;
  line-height: 1.5;
}
.calculate-bar {
  display: grid;
  grid-template-columns: repeat(2, 1fr) auto;
  align-items: center;
  gap: 12px;
  margin-top: 18px;
  padding: 13px 15px;
  border: 1px solid #dbeafe;
  border-radius: var(--radius-md);
  background: linear-gradient(110deg, #f8fbff, #eff6ff);
}
.calculate-bar > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.calculate-bar span {
  color: var(--c-text-secondary);
  font-size: 11px;
}
.calculate-bar strong {
  color: #1e3a8a;
  font-size: 14px;
}
.calculate-bar :deep(.el-button) {
  min-width: 132px;
  border-radius: var(--radius-sm);
}
.result-section {
  overflow: hidden;
  padding: 0;
}
.result-hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  padding: 28px;
  background: linear-gradient(120deg, #eff6ff 0%, #f5f3ff 55%, #ecfeff 100%);
}
.hero-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.eyebrow {
  color: #2563eb;
  font-size: 11px;
  font-weight: 750;
  letter-spacing: .08em;
}
.hero-copy h2 {
  margin: 5px 0 3px;
  color: var(--c-text-primary);
  font-size: clamp(32px, 5vw, 48px);
  line-height: 1.1;
}
.hero-copy p {
  margin: 0;
  color: var(--c-text-secondary);
  font-size: 13px;
}
.hero-copy p strong {
  color: var(--c-text-strong);
}
.countdown {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 12px;
  padding: 5px 10px;
  border-radius: 99px;
  color: #047857;
  font-size: 11px;
  background: #d1fae5;
}
.countdown.reached {
  color: #9a3412;
  background: #ffedd5;
}
.delay-badge {
  display: flex;
  min-width: 190px;
  flex-direction: column;
  gap: 3px;
  padding: 18px;
  border: 1px solid rgba(255,255,255,.8);
  border-radius: var(--radius-lg);
  background: rgba(255,255,255,.72);
  box-shadow: 0 10px 30px rgba(59,130,246,.08);
}
.delay-badge span, .delay-badge small {
  color: var(--c-text-muted);
  font-size: 10px;
}
.delay-badge strong {
  color: #4f46e5;
  font-size: 18px;
}
.policy-alert {
  margin: 18px 24px 0;
  width: auto;
}
.retirement-timeline {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto 1fr;
  align-items: center;
  padding: 24px 28px 28px;
}
.timeline-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 13px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface);
}
.timeline-card.featured {
  border-color: #bfdbfe;
  background: #f8fbff;
}
.timeline-card > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.timeline-card small {
  color: var(--c-text-muted);
  font-size: 10px;
}
.timeline-card strong {
  color: var(--c-text-strong);
  font-size: 16px;
}
.timeline-card em {
  color: var(--c-text-secondary);
  font-size: 10px;
  font-style: normal;
}
.timeline-dot {
  width: 10px;
  height: 10px;
  flex: 0 0 10px;
  margin-top: 4px;
  border-radius: 50%;
}
.timeline-dot.original {
  background: #94a3b8;
}
.timeline-dot.statutory {
  background: #3b82f6;
  box-shadow: 0 0 0 4px #dbeafe;
}
.timeline-dot.latest {
  background: #8b5cf6;
}
.timeline-connector {
  width: 26px;
  height: 1px;
  background: #cbd5e1;
}
.flexible-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.flexible-grid article {
  padding: 17px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface);
}
.flexible-grid article.recommended {
  border-color: #bfdbfe;
  background: #f8fbff;
}
.option-icon {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  margin-bottom: 12px;
  border-radius: var(--radius-sm);
}
.option-icon.early {
  color: #059669;
  background: #ecfdf5;
}
.option-icon.normal {
  color: #2563eb;
  background: #eff6ff;
}
.option-icon.late {
  color: #7c3aed;
  background: #f5f3ff;
}
.flexible-grid article > span {
  display: block;
  color: var(--c-text-muted);
  font-size: 10px;
}
.flexible-grid article > strong {
  display: block;
  margin-top: 2px;
  color: #1e293b;
  font-size: 20px;
}
.flexible-grid article > em {
  display: block;
  color: var(--c-text-secondary);
  font-size: 11px;
  font-style: normal;
}
.flexible-grid article > p {
  margin: 11px 0 0;
  color: var(--c-text-muted);
  font-size: 10px;
  line-height: 1.55;
}
.contribution-card {
  display: grid;
  grid-template-columns: 1fr 1fr 1.2fr;
  align-items: stretch;
  border: 1px solid;
  border-radius: var(--radius-md);
  overflow: hidden;
}
.contribution-card.enough {
  border-color: #a7f3d0;
  background: #f0fdf4;
}
.contribution-card.shortfall {
  border-color: #fed7aa;
  background: #fff7ed;
}
.contribution-card > div {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  padding: 17px;
}
.contribution-card > div + div {
  border-left: 1px solid rgba(148, 163, 184, .22);
}
.contribution-card span {
  color: var(--c-text-secondary);
  font-size: 10px;
}
.contribution-card > div > strong {
  color: var(--c-text-strong);
  font-size: 17px;
}
.contribution-status {
  flex-direction: row !important;
  align-items: center;
  justify-content: flex-start !important;
  gap: 9px !important;
}
.contribution-status > .el-icon {
  color: #059669;
  font-size: 20px;
}
.shortfall .contribution-status > .el-icon {
  color: #ea580c;
}
.contribution-status > span {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.contribution-status strong {
  color: #047857;
  font-size: 13px;
}
.shortfall .contribution-status strong {
  color: #c2410c;
}
.contribution-status small {
  color: var(--c-text-muted);
  font-size: 9px;
}
.table-heading {
  align-items: center;
}
.reference-tabs :deep(.el-tabs__header) {
  margin-bottom: 12px;
}
.reference-tabs :deep(.el-tabs__item) {
  color: var(--c-text-secondary);
  font-size: 12px;
}
.table-summary {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  color: #1d4ed8;
  font-size: 11px;
  line-height: 1.55;
  background: #eff6ff;
}
.table-summary .el-icon {
  flex: 0 0 auto;
  margin-top: 2px;
}
.reference-table {
  border-radius: var(--radius-md);
}
.reference-table :deep(th.el-table__cell) {
  color: var(--c-text-secondary);
  background: var(--c-surface-subtle);
  font-size: 11px;
}
.reference-table :deep(td.el-table__cell) {
  color: var(--c-text-body);
  font-size: 11px;
}
.reference-table :deep(.current-cohort td.el-table__cell) {
  color: #1d4ed8 !important;
  background: #dbeafe !important;
}
.table-footnote {
  margin: 9px 0 0;
  color: var(--c-text-muted);
  font-size: 10px;
  text-align: right;
}
.minimum-years-reference {
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid var(--c-border);
}
.minimum-years-reference h3 {
  margin: 0 0 11px;
  color: var(--c-text-strong);
  font-size: 13px;
}
.year-chips {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 7px;
}
.year-chips div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: var(--c-surface-subtle);
}
.year-chips span {
  color: var(--c-text-muted);
  font-size: 9px;
}
.year-chips strong {
  color: var(--c-text-body);
  font-size: 11px;
}
.policy-notes {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 22px;
}
.policy-notes > div {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.policy-notes > div > .el-icon {
  flex: 0 0 auto;
  margin-top: 2px;
  color: #3b82f6;
  font-size: 18px;
}
.policy-notes p {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
}
.policy-notes strong {
  color: var(--c-text-strong);
  font-size: 12px;
}
.policy-notes span {
  color: var(--c-text-muted);
  font-size: 10px;
  line-height: 1.55;
}
.policy-notes a {
  color: #2563eb;
  font-size: 10px;
  text-decoration: none;
}
.policy-notes a:hover {
  text-decoration: underline;
}
:global(html.dark .retirement-page) {
  color: var(--c-text-secondary);
}
:global(html.dark .retirement-page .calculator-card), :global(html.dark .retirement-page .result-section), :global(html.dark .retirement-page .flexible-section), :global(html.dark .retirement-page .contribution-section), :global(html.dark .retirement-page .reference-section) {
  border-color: var(--c-border);
  background: var(--c-surface);
  box-shadow: none;
}
:global(html.dark .retirement-page .hero-copy h2), :global(html.dark .retirement-page .timeline-card strong), :global(html.dark .retirement-page .flexible-grid article > strong), :global(html.dark .retirement-page .minimum-years-reference h3), :global(html.dark .retirement-page .policy-notes strong) {
  color: var(--c-text-primary);
}
:global(html.dark .retirement-page .field-block > span), :global(html.dark .retirement-page .category-label) {
  color: var(--c-text-secondary);
}
:global(html.dark .retirement-page .category-grid button), :global(html.dark .retirement-page .timeline-card), :global(html.dark .retirement-page .flexible-grid article) {
  border-color: var(--c-border);
  color: var(--c-text-secondary);
  background: #172033;
}
:global(html.dark .retirement-page .category-grid button.active), :global(html.dark .retirement-page .timeline-card.featured), :global(html.dark .retirement-page .flexible-grid article.recommended) {
  border-color: #3b82f6;
  color: #93c5fd;
  background: rgba(30,64,175,.22);
}
:global(html.dark .retirement-page .calculate-bar) {
  border-color: #1e3a5f;
  background: linear-gradient(110deg,#172033,#172554);
}
:global(html.dark .retirement-page .calculate-bar strong) {
  color: #bfdbfe;
}
:global(html.dark .retirement-page .result-hero) {
  background: linear-gradient(120deg,#172554,#2e1065 55%,#083344);
}
:global(html.dark .retirement-page .hero-copy p strong) {
  color: var(--c-text-secondary);
}
:global(html.dark .retirement-page .delay-badge) {
  border-color: var(--c-border-strong);
  background: rgba(15,23,42,.72);
}
:global(html.dark .retirement-page .delay-badge strong) {
  color: #a5b4fc;
}
:global(html.dark .retirement-page .contribution-card.enough) {
  border-color: #14532d;
  background: rgba(6,78,59,.24);
}
:global(html.dark .retirement-page .contribution-card.shortfall) {
  border-color: #7c2d12;
  background: rgba(124,45,18,.2);
}
:global(html.dark .retirement-page .contribution-card > div > strong) {
  color: var(--c-text-primary);
}
:global(html.dark .retirement-page .table-summary) {
  color: #93c5fd;
  background: rgba(30,64,175,.22);
}
:global(html.dark .retirement-page .minimum-years-reference) {
  border-color: var(--c-border);
}
:global(html.dark .retirement-page .year-chips div) {
  border-color: var(--c-border);
  background: #172033;
}
:global(html.dark .retirement-page .year-chips strong) {
  color: var(--c-text-secondary);
}
@media (max-width: 900px) {
  .retirement-timeline {
    grid-template-columns: 1fr;
    gap: 9px;
  }
  .timeline-connector {
    width: 1px;
    height: 14px;
    margin-left: 18px;
  }
  .year-chips {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 760px) {
  .calculator-card, .result-section, .flexible-section, .contribution-section, .reference-section {
    padding: 16px;
    border-radius: var(--radius-md);
  }
  .result-section {
    padding: 0;
  }
  .form-grid, .category-grid, .flexible-grid, .policy-notes {
    grid-template-columns: 1fr;
  }
  .calculate-bar {
    grid-template-columns: repeat(2, 1fr);
  }
  .calculate-bar :deep(.el-button) {
    grid-column: 1 / -1;
    width: 100%;
  }
  .result-hero {
    align-items: flex-start;
    flex-direction: column;
    padding: 22px;
  }
  .delay-badge {
    width: 100%;
    min-width: 0;
  }
  .retirement-timeline {
    padding: 20px 22px 24px;
  }
  .contribution-card {
    grid-template-columns: 1fr;
  }
  .contribution-card > div + div {
    border-top: 1px solid rgba(148,163,184,.22);
    border-left: 0;
  }
  .table-heading {
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .table-heading :deep(.el-button) {
    margin-left: 50px;
  }
  .year-chips {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 440px) {
  .calculate-bar, .year-chips {
    grid-template-columns: 1fr 1fr;
  }
  .reference-tabs :deep(.el-tabs__item) {
    padding: 0 10px;
    font-size: 11px;
  }
}
</style>
