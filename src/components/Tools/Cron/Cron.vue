<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import { copy } from '@/utils/string'
import { buildCronExpression, CRON_PRESETS, inspectCronFields, type CronCycle } from '@/utils/cronStudio'
import cronstrue from 'cronstrue/i18n'
import 'cronstrue/locales/zh_CN'
import { CronExpressionParser } from 'cron-parser'
import { humanizeCronInChinese } from 'cron-chinese'
import { CopyDocument, Refresh } from '@element-plus/icons-vue'

const cycle = ref<CronCycle>('everyDay')
const hour = ref(9)
const minute = ref(0)
const interval = ref(5)
const dayOfWeek = ref(1)
const dayOfMonth = ref(1)
const expression = ref('0 9 * * *')
const isValid = ref(false)
const description = ref('')
const secondaryDescription = ref('')
const parseError = ref('')
const nextDates = ref<Date[]>([])

const cycleOptions = [
  { value: 'everyMinute', label: '每分钟', note: '每个整分钟执行' },
  { value: 'everyHour', label: '每小时', note: '每小时指定分钟执行' },
  { value: 'everyDay', label: '每天', note: '每天指定时间执行' },
  { value: 'weekdays', label: '每个工作日', note: '周一至周五执行' },
  { value: 'everyWeek', label: '每周', note: '每周指定星期执行' },
  { value: 'everyMonth', label: '每月', note: '每月指定日期执行' },
  { value: 'everyNSeconds', label: '每 N 秒', note: '生成含秒的六位表达式' },
  { value: 'everyNMinutes', label: '每 N 分钟', note: '按分钟间隔循环' },
  { value: 'everyNHours', label: '每 N 小时', note: '按小时间隔循环' },
  { value: 'everyNDays', label: '每 N 天', note: '按日期间隔循环' },
] as const
const weekDays = [
  { label: '星期日', value: 0 }, { label: '星期一', value: 1 }, { label: '星期二', value: 2 }, { label: '星期三', value: 3 },
  { label: '星期四', value: 4 }, { label: '星期五', value: 5 }, { label: '星期六', value: 6 },
]

const fieldInfo = computed(() => inspectCronFields(expression.value))
const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '浏览器本地时区'
const usesTime = computed(() => ['everyDay', 'weekdays', 'everyWeek', 'everyMonth', 'everyNDays'].includes(cycle.value))
const usesMinute = computed(() => ['everyHour', 'everyNHours'].includes(cycle.value))
const usesInterval = computed(() => ['everyNSeconds', 'everyNMinutes', 'everyNHours', 'everyNDays'].includes(cycle.value))
const intervalUnit = computed(() => ({ everyNSeconds: '秒', everyNMinutes: '分钟', everyNHours: '小时', everyNDays: '天' }[cycle.value] ?? '次'))
const maxInterval = computed(() => ({ everyNSeconds: 59, everyNMinutes: 59, everyNHours: 23, everyNDays: 31 }[cycle.value] ?? 59))
const heroMetrics = computed(() => [
  { value: fieldInfo.value.dialect, label: '表达式规格' },
  { value: isValid.value ? '可执行' : '需修正', label: '解析状态' },
  { value: nextDates.value.length ? `${nextDates.value.length} 次` : '—', label: '预览计划' },
])

function generatedValue() {
  return buildCronExpression({
    cycle: cycle.value,
    hour: hour.value,
    minute: minute.value,
    interval: interval.value,
    dayOfWeek: dayOfWeek.value,
    dayOfMonth: dayOfMonth.value,
  })
}

function applyBuilder() {
  expression.value = generatedValue()
}

function parseExpression() {
  const source = expression.value.trim()
  if (!source) {
    isValid.value = false
    description.value = ''
    secondaryDescription.value = ''
    nextDates.value = []
    parseError.value = '请输入 CRON 表达式'
    return
  }
  const inspected = inspectCronFields(source)
  if (!inspected.fields.length) {
    isValid.value = false
    description.value = ''
    secondaryDescription.value = ''
    nextDates.value = []
    parseError.value = 'CRON 表达式应包含 5 个字段，或包含秒的 6 个字段'
    return
  }
  try {
    const intervalParser = CronExpressionParser.parse(source)
    const dates: Date[] = []
    for (let index = 0; index < 8; index += 1) dates.push(intervalParser.next().toDate())
    const reference = cronstrue.toString(source, { locale: 'zh_CN' })
    const primary = inspected.dialect.startsWith('6') ? reference : humanizeCronInChinese(source)
    description.value = typeof primary === 'string' ? primary.replace(/undefined/g, '?') : reference
    secondaryDescription.value = inspected.dialect.startsWith('6') ? '' : reference
    nextDates.value = dates
    parseError.value = ''
    isValid.value = true
  } catch (error) {
    isValid.value = false
    description.value = ''
    secondaryDescription.value = ''
    nextDates.value = []
    parseError.value = error instanceof Error ? error.message : String(error)
  }
}

function applyPreset(preset: typeof CRON_PRESETS[number]) {
  expression.value = preset.expression
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', weekday: 'short' }).format(date)
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(date)
}

watch([cycle, hour, minute, interval, dayOfWeek, dayOfMonth], applyBuilder)
watch(expression, parseExpression, { immediate: true })
</script>

<template>
  <div class="cron-page flex flex-col mt-3 flex-1">
    <ToolHero title="CRON 调度工作台" legacy>

    <section class="hero-card">
      <div><span class="eyebrow">CRON SCHEDULE STUDIO</span><h2>从表达式到执行计划，一次看懂</h2><p>用常用周期快速生成，也可以直接编辑表达式；实时解释每个字段，并在浏览器本地时区预览后续执行时间。</p></div>
      <div class="hero-stats"><div v-for="metric in heroMetrics" :key="metric.label"><strong>{{ metric.value }}</strong><span>{{ metric.label }}</span></div></div>
    </section>
    </ToolHero>

    <section class="preset-card">
      <span>常用计划</span>
      <button v-for="preset in CRON_PRESETS" :key="preset.expression" type="button" @click="applyPreset(preset)"><strong>{{ preset.label }}</strong><small>{{ preset.note }}</small></button>
    </section>

    <section class="expression-card">
      <div><span class="eyebrow">LIVE EXPRESSION</span><h3>当前表达式</h3><p>支持 Linux 常用五位格式，以及包含“秒”的六位格式。</p></div>
      <div class="expression-input"><el-input v-model="expression" size="large" aria-label="当前 CRON 表达式" placeholder="例如：*/5 * * * *" /><button type="button" aria-label="复制当前 CRON 表达式" @click="copy(expression)"><el-icon><CopyDocument /></el-icon>复制</button></div>
      <span :class="['status-pill', { valid: isValid }]">{{ isValid ? '表达式有效' : '表达式待修正' }}</span>
    </section>

    <section class="workspace-grid">
      <article class="builder-card">
        <header><div><span class="eyebrow">VISUAL BUILDER</span><h3>可视化生成</h3></div><button type="button" aria-label="重新应用生成设置" @click="applyBuilder"><el-icon><Refresh /></el-icon>应用设置</button></header>
        <div class="builder-fields">
          <label class="wide"><span>执行周期</span><el-select v-model="cycle" aria-label="执行周期"><el-option v-for="item in cycleOptions" :key="item.value" :value="item.value" :label="item.label"><div class="select-option"><strong>{{ item.label }}</strong><small>{{ item.note }}</small></div></el-option></el-select></label>
          <label v-if="usesInterval"><span>间隔（{{ intervalUnit }}）</span><el-input-number v-model="interval" :min="1" :max="maxInterval" controls-position="right" /></label>
          <label v-if="usesTime"><span>小时</span><el-input-number v-model="hour" :min="0" :max="23" controls-position="right" /></label>
          <label v-if="usesTime || usesMinute"><span>分钟</span><el-input-number v-model="minute" :min="0" :max="59" controls-position="right" /></label>
          <label v-if="cycle === 'everyWeek'"><span>星期</span><el-select v-model="dayOfWeek"><el-option v-for="day in weekDays" :key="day.value" :label="day.label" :value="day.value" /></el-select></label>
          <label v-if="cycle === 'everyMonth'"><span>每月日期</span><el-input-number v-model="dayOfMonth" :min="1" :max="31" controls-position="right" /></label>
        </div>
        <div class="builder-preview"><span>生成结果</span><code>{{ generatedValue() }}</code><small>修改设置会自动同步到当前表达式</small></div>
      </article>

      <article class="analysis-card">
        <header><div><span class="eyebrow">HUMAN SUMMARY</span><h3>自然语言摘要</h3></div><span>{{ localZone }}</span></header>
        <div v-if="isValid" class="summary-copy"><strong>{{ description || secondaryDescription }}</strong><p v-if="secondaryDescription && secondaryDescription !== description">参考解释：{{ secondaryDescription }}</p></div>
        <div v-else class="error-state"><strong>暂时无法生成计划</strong><p>{{ parseError }}</p></div>
        <div class="field-map"><div v-for="field in fieldInfo.fields" :key="field.key"><span>{{ field.label }}</span><code>{{ field.value }}</code><small>{{ field.hint }}</small></div></div>
      </article>
    </section>

    <section class="schedule-card">
      <header><div><span class="eyebrow">UPCOMING RUNS</span><h3>后续 8 次执行计划</h3><p>时间以 {{ localZone }} 计算；部署到服务器时请再核对服务器时区。</p></div><span class="count-badge">{{ nextDates.length }}/8</span></header>
      <div v-if="nextDates.length" class="schedule-list"><div v-for="(date, index) in nextDates" :key="date.getTime()"><b>{{ String(index + 1).padStart(2, '0') }}</b><span>{{ formatDate(date) }}</span><strong>{{ formatTime(date) }}</strong><small>{{ date.getFullYear() }} 年</small></div></div>
      <div v-else class="empty-state">修正表达式后，这里会显示未来执行时间。</div>
    </section>

    <ToolGuide title="字段规则与使用提示"><div class="detail-copy">五位表达式依次表示“分钟、小时、日期、月份、星期”，六位格式在最前面增加“秒”。星号表示任意值，逗号表示多个值，短横线表示范围，斜杠表示步长。不同调度器对年份、问号和特殊字符的支持可能不同，正式部署前应以目标系统文档为准。</div></ToolGuide>
  </div>
</template>

<style scoped>
.cron-page{--cyan:#0891b2;gap:18px}.hero-card,.preset-card,.expression-card,.builder-card,.analysis-card,.schedule-card{border:1px solid #e2e8f0;border-radius:22px;background:#fff;box-shadow:0 14px 38px rgba(15,23,42,.06)}.hero-card{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:28px;padding:30px;border:0;color:#fff;background:radial-gradient(circle at 88% 8%,rgba(103,232,249,.34),transparent 28%),linear-gradient(135deg,#164e63,#0e7490 56%,#2563eb)}.eyebrow{display:block;margin-bottom:6px;color:#67e8f9;font-size:12px;font-weight:900;letter-spacing:.16em}.hero-card h2{margin:0;font-size:clamp(25px,3vw,36px);line-height:1.2}.hero-card p{max-width:750px;margin:11px 0 0;color:#cffafe;font-size:14px;line-height:1.75}.hero-stats{display:grid;grid-template-columns:repeat(3,118px)}.hero-stats div{padding:8px;text-align:center;border-left:1px solid rgba(255,255,255,.22)}.hero-stats strong,.hero-stats span{display:block}.hero-stats strong{font-size:18px}.hero-stats span{margin-top:5px;color:#a5f3fc;font-size:12px}.preset-card{display:flex;align-items:center;gap:8px;padding:12px 15px;overflow-x:auto}.preset-card>span{flex:none;color:#64748b;font-size:13px}.preset-card button{flex:none;padding:9px 13px;border:1px solid #dbe3ef;border-radius:11px;background:#f8fafc;color:#334155;text-align:left;cursor:pointer}.preset-card strong,.preset-card small{display:block}.preset-card strong{font-size:14px}.preset-card small{margin-top:2px;color:#94a3b8;font-size:12px}.expression-card{display:grid;grid-template-columns:minmax(230px,.7fr) minmax(360px,1.3fr) auto;align-items:center;gap:22px;padding:19px 22px}.expression-card .eyebrow,.builder-card .eyebrow,.analysis-card .eyebrow,.schedule-card .eyebrow{color:var(--cyan)}.expression-card h3,.builder-card h3,.analysis-card h3,.schedule-card h3{margin:0;color:#0f172a;font-size:19px}.expression-card p,.schedule-card header p{margin:4px 0 0;color:#64748b;font-size:13px;line-height:1.55}.expression-input{display:grid;grid-template-columns:1fr auto}.expression-input :deep(.el-input__wrapper){border-radius:11px 0 0 11px}.expression-input button,.builder-card header button{display:inline-flex;align-items:center;justify-content:center;gap:5px;min-height:40px;padding:0 14px;border:1px solid #dbe3ef;border-radius:0 11px 11px 0;background:#f8fafc;color:#475569;font-size:13px;font-weight:800;cursor:pointer}.status-pill,.count-badge{padding:6px 10px;border-radius:999px;color:#b45309;background:#fef3c7;font-size:12px;font-weight:850;white-space:nowrap}.status-pill.valid{color:#047857;background:#d1fae5}.workspace-grid{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:18px}.builder-card,.analysis-card,.schedule-card{padding:22px}.builder-card>header,.analysis-card>header,.schedule-card>header{display:flex;align-items:flex-start;justify-content:space-between;gap:15px}.builder-card header button{min-height:36px;border-radius:9px;background:#fff}.analysis-card>header>span{color:#64748b;font-size:12px}.builder-fields{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:19px}.builder-fields label>span{display:block;margin-bottom:7px;color:#64748b;font-size:13px;font-weight:750}.builder-fields label.wide{grid-column:1/-1}.builder-fields :deep(.el-select),.builder-fields :deep(.el-input-number){width:100%}.select-option{display:flex;align-items:center;justify-content:space-between;gap:12px}.select-option small{color:#94a3b8}.builder-preview{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:8px 13px;margin-top:18px;padding:14px;border-radius:13px;background:#ecfeff}.builder-preview span{color:#0e7490;font-size:12px;font-weight:850}.builder-preview code{color:#164e63;font:800 16px ui-monospace,SFMono-Regular,Consolas,monospace}.builder-preview small{grid-column:1/-1;color:#64748b;font-size:12px}.summary-copy,.error-state{min-height:94px;margin-top:19px;padding:16px;border-radius:14px;background:linear-gradient(135deg,#ecfeff,#eff6ff)}.summary-copy strong,.error-state strong{color:#0f172a;font-size:18px;line-height:1.6}.summary-copy p,.error-state p{margin:7px 0 0;color:#64748b;font-size:13px;line-height:1.6}.error-state{background:#fef2f2}.error-state strong,.error-state p{color:#b91c1c}.field-map{display:grid;grid-template-columns:repeat(3,1fr);margin-top:15px;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden}.field-map div{min-width:0;padding:11px;border-right:1px solid #e2e8f0}.field-map div:last-child{border:0}.field-map span,.field-map code,.field-map small{display:block}.field-map span{color:#64748b;font-size:12px}.field-map code{margin-top:4px;overflow:hidden;color:#0f172a;font:800 16px ui-monospace,monospace;text-overflow:ellipsis}.field-map small{margin-top:4px;color:#94a3b8;font-size:12px;white-space:nowrap}.schedule-card>header{align-items:center}.schedule-list{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:18px}.schedule-list>div{display:grid;grid-template-columns:auto 1fr;gap:4px 10px;padding:13px;border:1px solid #e2e8f0;border-radius:13px;background:#f8fafc}.schedule-list b{grid-row:1/3;align-self:center;color:#0891b2;font:800 13px ui-monospace,monospace}.schedule-list span{color:#64748b;font-size:12px}.schedule-list strong{color:#0f172a;font-size:16px}.schedule-list small{grid-column:2;color:#94a3b8;font-size:12px}.empty-state{display:grid;min-height:120px;margin-top:16px;place-items:center;border:1px dashed #cbd5e1;border-radius:14px;color:#94a3b8;font-size:13px}.detail-copy{color:#64748b;font-size:14px;line-height:1.9}
:global(html.dark .cron-page .preset-card),:global(html.dark .cron-page .expression-card),:global(html.dark .cron-page .builder-card),:global(html.dark .cron-page .analysis-card),:global(html.dark .cron-page .schedule-card){border-color:#334155;background:#1e293b;box-shadow:none}:global(html.dark .cron-page h3),:global(html.dark .cron-page .summary-copy strong),:global(html.dark .cron-page .field-map code),:global(html.dark .cron-page .schedule-list strong){color:#f8fafc}:global(html.dark .cron-page .preset-card button),:global(html.dark .cron-page .expression-input button),:global(html.dark .cron-page .builder-card header button),:global(html.dark .cron-page .schedule-list>div){border-color:#475569;background:#0f172a;color:#e2e8f0}:global(html.dark .cron-page .summary-copy),:global(html.dark .cron-page .builder-preview){background:#0f2d3a}:global(html.dark .cron-page .field-map){border-color:#334155}:global(html.dark .cron-page .field-map div){border-color:#334155}
@media(max-width:1050px){.expression-card{grid-template-columns:1fr}.workspace-grid{grid-template-columns:1fr}.schedule-list{grid-template-columns:repeat(2,1fr)}}@media(max-width:680px){.cron-page{gap:14px}.hero-card{grid-template-columns:1fr;padding:22px 18px}.hero-stats{grid-template-columns:repeat(3,1fr)}.hero-stats div:first-child{border-left:0}.hero-stats strong{font-size:16px}.expression-card,.builder-card,.analysis-card,.schedule-card{padding:15px}.expression-input{grid-template-columns:1fr}.expression-input :deep(.el-input__wrapper){border-radius:10px}.expression-input button{margin-top:8px;border-radius:10px}.builder-fields{grid-template-columns:1fr}.builder-fields label.wide{grid-column:auto}.field-map{grid-template-columns:repeat(2,1fr)}.field-map div:nth-child(2n){border-right:0}.field-map div:nth-child(n+3){border-top:1px solid #334155}.schedule-list{grid-template-columns:1fr}.schedule-card>header{align-items:flex-start}.hero-card h2{font-size:25px}}
</style>
