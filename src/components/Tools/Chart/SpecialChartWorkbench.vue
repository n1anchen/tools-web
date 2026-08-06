<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { CopyDocument, Download, Refresh, UploadFilled } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import { autoDown } from '@/utils/file'
import ChartDataGrid from '@/components/Tools/Chart/ChartDataGrid.vue'
import ChartToolNav from '@/components/Tools/Chart/ChartToolNav.vue'
import { useSettingStore } from '@/store/modules/setting'
import { useRoute } from 'vue-router'
import { getTools } from '@/components/Tools/tools.ts'
import { copy, rtrim } from '@/utils/string'
import { clearChartDraft, loadChartDraft, saveChartDraft } from '@/utils/chartDraft'
import { CHART_PALETTES } from '@/utils/chartStudio'
import {
  SPECIAL_SAMPLES,
  buildSpecialChartOption,
  getSpecialStats,
  parseSpecialChartData,
  serializeSpecialChartData,
  type SpecialChartKind,
  type SpecialChartSettings,
  type SpecialDataMode,
} from '@/utils/specialChartStudio'

const props = defineProps<{ type: SpecialChartKind }>()
const route = useRoute()
const settingStore = useSettingStore()
// 工具标题以 tools.ts 为唯一来源，按当前路由派生（与 ToolHero 一致）
const workbenchTitle = computed(() => {
  const tool = getTools({ cateId: 0, title: '', route: rtrim(route.path, '/') })
  return tool.title || ''
})
const chartElement = ref<HTMLElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
type EditorMode = 'grid' | SpecialDataMode
const dataMode = ref<EditorMode>('grid')
const activeSample = ref(SPECIAL_SAMPLES[props.type][0].id)
const chartHeight = ref(480)
const currentPaletteId = ref<string>(CHART_PALETTES[0].id)
let chart: echarts.ECharts | null = null
let resizeObserver: ResizeObserver | null = null

const typeMeta = {
  treemap: { eyebrow: 'TREEMAP STUDIO', headline: '从层级路径中看见结构与占比', accent: '#059669', soft: '#D1FAE5', detail: '矩形树图用面积表达数量、用嵌套表达层级。表格模式中的“层级路径”使用 / 分隔，例如 产品/专业版；每条路径应指向叶节点，同一路径不能既作为数据项又作为其他路径的父级。' },
  sankey: { eyebrow: 'SANKEY STUDIO', headline: '让来源、去向和流量关系一目了然', accent: '#EA580C', soft: '#FFEDD5', detail: '桑基图适合展示守恒或近似守恒的流量关系。连接必须大于 0，并保持从上游到下游的无环方向；节点流入与流出不相等时图表仍可绘制，但解读时应说明差额的业务含义。' },
  boxplot: { eyebrow: 'BOX PLOT STUDIO', headline: '同时比较集中趋势、离散程度与异常点', accent: '#4F46E5', soft: '#E0E7FF', detail: '原始样本模式按分组重复输入样本值，每组至少 4 个值；工作台会用线性插值计算 Q1、中位数和 Q3，并以 1.5 倍四分位距识别异常值。五数概括模式要求最小值、Q1、中位数、Q3、最大值依次不减。' },
  calendar: { eyebrow: 'CALENDAR HEATMAP STUDIO', headline: '把每日变化放回真实的年度节奏', accent: '#15803D', soft: '#DCFCE7', detail: '日历图适合每日打卡、活跃度、销售或事件数量。重复日期与不存在的日期不会进入图表；缺失天数按所选年度的 365 或 366 天计算。窄屏下预览区可横向滑动，避免压缩全年 53 周的单元格。' },
} as const

const meta = computed(() => typeMeta[props.type])
const samples = computed(() => SPECIAL_SAMPLES[props.type])
const variants = computed(() => ({
  treemap: [{ value: 'ordered', label: '按数值排序' }, { value: 'original', label: '保留顺序' }],
  sankey: [{ value: 'horizontal', label: '横向流动' }, { value: 'vertical', label: '纵向流动' }],
  boxplot: [{ value: 'vertical', label: '纵向箱线' }, { value: 'horizontal', label: '横向箱线' }],
  calendar: [{ value: 'rounded', label: '圆角单元' }, { value: 'square', label: '方形单元' }],
}[props.type]))

function defaultVariant(type: SpecialChartKind) { return ({ treemap: 'ordered', sankey: 'horizontal', boxplot: 'vertical', calendar: 'rounded' })[type] }
function lastYear(years: number[]) { return years[years.length - 1] }
function initialYear() { const first = samples.value[0].data; return first.kind === 'calendar' ? lastYear(first.years) ?? 2026 : 2026 }
function createSettings(): SpecialChartSettings {
  return {
    title: samples.value[0].title, subtitle: '专业图表 · 本地实时生成', titlePosition: 'center', variant: defaultVariant(props.type), palette: [...CHART_PALETTES[0].colors], showLabels: props.type === 'treemap',
    treemapDepth: 3, showBreadcrumb: true, sankeyAlign: 'justify', sankeyCurve: .5,
    boxColor: '#4F46E5', showOutliers: true, calendarYear: initialYear(), calendarMinColor: '#DCFCE7', calendarMaxColor: '#15803D', showVisualMap: true,
  }
}

const settings = reactive<SpecialChartSettings>(createSettings())
const parserMode = computed<SpecialDataMode>(() => dataMode.value === 'json' ? 'json' : 'table')
const dataText = ref(serializeSpecialChartData(samples.value[0].data, 'table'))

// 恢复该图表类型的本地草稿（跨工具切换 / 刷新后保留输入数据与配置）
const restoredDraft = loadChartDraft<SpecialChartSettings>(props.type)
if (restoredDraft) {
  dataMode.value = restoredDraft.dataMode as EditorMode
  activeSample.value = restoredDraft.activeSample
  chartHeight.value = restoredDraft.chartHeight
  currentPaletteId.value = restoredDraft.currentPaletteId
  dataText.value = restoredDraft.dataText
  Object.assign(settings, { ...createSettings(), ...restoredDraft.settings })
  if (props.type === 'calendar') nextTick(syncCalendarYear)
}

// 草稿保存：变更后防抖写入；仅在有实际改动时才落盘，重置后清除
let draftTimer: ReturnType<typeof setTimeout> | null = null
let draftDirty = false
function writeDraft() {
  saveChartDraft(props.type, {
    dataText: dataText.value,
    dataMode: dataMode.value,
    activeSample: activeSample.value,
    chartHeight: chartHeight.value,
    currentPaletteId: currentPaletteId.value,
    settings: { ...settings },
  })
}
function scheduleDraft() {
  draftDirty = true
  if (draftTimer) clearTimeout(draftTimer)
  draftTimer = setTimeout(writeDraft, 400)
}
watch([dataMode, dataText, activeSample, chartHeight, currentPaletteId], scheduleDraft)
watch(settings, scheduleDraft, { deep: true })
const parsed = computed(() => parseSpecialChartData(dataText.value, props.type, parserMode.value))
const data = computed(() => parsed.value.data)
const availableYears = computed(() => data.value.kind === 'calendar' ? data.value.years : [])
const stats = computed(() => getSpecialStats(data.value, settings.calendarYear))
const runtimeWarnings = computed(() => props.type === 'calendar' && availableYears.value.length && !availableYears.value.includes(settings.calendarYear) ? [`${settings.calendarYear} 年没有有效数据，请选择已有年份`] : [])
const allErrors = computed(() => [...parsed.value.errors, ...runtimeWarnings.value])
const option = computed(() => buildSpecialChartOption(props.type, data.value, settings, settingStore.isDark))

const formatHint = computed(() => {
  if (dataMode.value === 'grid') return '直接编辑单元格，或粘贴 Excel / WPS 中复制的多行多列区域'
  if (dataMode.value === 'json') return ({ treemap: '节点数组：name、value 或 children', sankey: '连接数组：source、target、value', boxplot: '分组数组：samples 或 values 与 outliers', calendar: '日期数组：date、value' })[props.type]
  return ({ treemap: '列：层级路径（/ 分隔）、数值', sankey: '列：来源、目标、流量', boxplot: '列：分组＋样本值，或分组＋五数概括', calendar: '列：日期（YYYY-MM-DD）、数值' })[props.type]
})
const gridColumns = computed(() => ({ treemap: 2, sankey: 3, boxplot: 2, calendar: 2 })[props.type])

const heroMetrics = computed(() => {
  if (props.type === 'treemap') return [{ value: stats.value.count, label: '叶节点' }, { value: stats.value.detail, label: '最大深度' }, { value: format(stats.value.total), label: '数据总量' }]
  if (props.type === 'sankey') return [{ value: stats.value.count, label: '有效连线' }, { value: stats.value.groups, label: '关系节点' }, { value: format(stats.value.total), label: '流量合计' }]
  if (props.type === 'boxplot') return [{ value: stats.value.count, label: '对比分组' }, { value: stats.value.detail, label: '检测结果' }, { value: format(stats.value.max), label: '区间峰值' }]
  return [{ value: settings.calendarYear, label: '当前年度' }, { value: stats.value.count, label: '有效日期' }, { value: stats.value.detail, label: '连续性检查' }]
})

function format(value: number) { return Number.isInteger(value) ? value.toLocaleString('zh-CN') : value.toLocaleString('zh-CN', { maximumFractionDigits: 2 }) }
function renderChart() { if (!chartElement.value) return; if (!chart) chart = echarts.init(chartElement.value, settingStore.isDark ? 'dark' : undefined, { renderer: 'canvas' }); chart.setOption(option.value, true); chart.resize() }
function recreateChart() { chart?.dispose(); chart = null; nextTick(renderChart) }
function syncCalendarYear() { if (availableYears.value.length && !availableYears.value.includes(settings.calendarYear)) settings.calendarYear = lastYear(availableYears.value)! }

function applySample(id: string) {
  const sample = samples.value.find(item => item.id === id); if (!sample) return
  activeSample.value = id; dataText.value = serializeSpecialChartData(sample.data, parserMode.value); settings.title = sample.title
  if (sample.data.kind === 'calendar') settings.calendarYear = lastYear(sample.data.years) ?? settings.calendarYear
}
function changeMode(mode: EditorMode) { if (mode === dataMode.value) return; const nextParserMode: SpecialDataMode = mode === 'json' ? 'json' : 'table'; if (nextParserMode === parserMode.value) { dataMode.value = mode; return }; const current = stats.value.count ? data.value : samples.value[0].data; dataMode.value = mode; dataText.value = serializeSpecialChartData(current, nextParserMode) }
function choosePalette(item: typeof CHART_PALETTES[number]) { currentPaletteId.value = item.id; settings.palette = [...item.colors] }
function resetWorkbench() { Object.assign(settings, createSettings()); dataMode.value = 'grid'; activeSample.value = samples.value[0].id; dataText.value = serializeSpecialChartData(samples.value[0].data, 'table'); chartHeight.value = 480; currentPaletteId.value = CHART_PALETTES[0].id; draftDirty = false; clearChartDraft(props.type); ElMessage.success('已恢复默认示例与配置') }

async function importData(event: Event) {
  const input = event.target as HTMLInputElement; const file = input.files?.[0]; input.value = ''; if (!file) return
  if (file.size > 1024 * 1024) { ElMessage.warning('单个数据文件请控制在 1 MB 以内'); return }
  const content = await file.text(); dataMode.value = file.name.toLowerCase().endsWith('.json') || content.trimStart().startsWith('[') ? 'json' : 'grid'; dataText.value = content; activeSample.value = ''; nextTick(syncCalendarYear); ElMessage.success(`已载入 ${file.name}`)
}
function downloadData() { if (!stats.value.count) return ElMessage.warning('没有可导出的有效数据'); const content = serializeSpecialChartData(data.value, parserMode.value); const blob = new Blob([content], { type: parserMode.value === 'json' ? 'application/json;charset=utf-8' : 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob); autoDown(url, `chart-data.${parserMode.value === 'json' ? 'json' : 'csv'}`) }
function downloadPng() { if (!chart || !stats.value.count) return ElMessage.warning('请先输入有效数据'); autoDown(chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: settingStore.isDark ? '#0F172A' : '#FFFFFF' }), `${(settings.title || workbenchTitle.value).replace(/[\\/:*?"<>|]/g, '-')}.png`) }

watch(option, () => nextTick(renderChart), { deep: true })
watch(availableYears, syncCalendarYear)
watch(() => settingStore.isDark, recreateChart)
onMounted(() => nextTick(() => { renderChart(); if (chartElement.value) { resizeObserver = new ResizeObserver(() => chart?.resize()); resizeObserver.observe(chartElement.value) } }))
onBeforeUnmount(() => { if (draftTimer) { clearTimeout(draftTimer); draftTimer = null } if (draftDirty) writeDraft(); resizeObserver?.disconnect(); chart?.dispose(); chart = null })
</script>

<template>
  <div class="special-page flex flex-col mt-3 flex-1" :style="{ '--accent': meta.accent, '--accent-soft': meta.soft }">
    <ToolHero :summary="meta.headline">
      <template #metrics>
        <div class="hero-metrics">
          <div v-for="item in heroMetrics" :key="item.label"><span>{{ item.label }}</span><strong>{{ item.value }}</strong></div>
        </div>
      </template>
    </ToolHero>

    <ChartToolNav :current="props.type" />

    <section class="sample-card"><div class="section-heading"><div><span class="eyebrow">START WITH DATA</span><h3>载入一个示例</h3></div><p>示例会替换当前数据，载入后可以继续编辑。</p></div><div class="sample-list"><button v-for="sample in samples" :key="sample.id" type="button" :class="{ active: activeSample === sample.id }" @click="applySample(sample.id)"><span>{{ sample.title }}</span><small>{{ sample.hint }}</small></button></div></section>

    <section class="workspace-grid">
      <article class="data-card"><header class="card-header"><div><span class="eyebrow">STRUCTURED DATA</span><h3>数据输入与校验</h3></div><div class="header-actions"><button type="button" @click="fileInput?.click()"><el-icon><UploadFilled /></el-icon>导入</button><button type="button" @click="downloadData">导出</button><input ref="fileInput" type="file" accept=".csv,.tsv,.txt,.json" hidden @change="importData"></div></header><div class="mode-tabs" aria-label="数据输入方式"><button type="button" :class="{ active: dataMode === 'grid' }" @click="changeMode('grid')">可视表格</button><button type="button" :class="{ active: dataMode === 'table' }" @click="changeMode('table')">CSV / TSV</button><button type="button" :class="{ active: dataMode === 'json' }" @click="changeMode('json')">JSON</button></div><ChartDataGrid v-if="dataMode === 'grid'" v-model="dataText" :min-columns="gridColumns" :aria-label="`${workbenchTitle}可视数据表格`" @update:model-value="activeSample = ''" /><textarea v-else v-model="dataText" spellcheck="false" :aria-label="`${workbenchTitle}数据输入`" @input="activeSample = ''"></textarea><div class="format-hint"><span>{{ formatHint }}</span><b>{{ stats.count }} 条有效记录</b></div><div v-if="allErrors.length" class="validation-box" role="alert"><strong>有 {{ allErrors.length }} 处需要检查</strong><ul><li v-for="error in allErrors.slice(0, 4)" :key="error">{{ error }}</li></ul></div><div v-else class="validation-box success"><strong>数据结构有效</strong><span>预览、年度范围与统计会随输入实时更新。</span></div></article>

      <article class="preview-card"><header class="card-header"><div><span class="eyebrow">LIVE PREVIEW</span><h3>实时预览</h3></div><div class="header-actions"><button type="button" aria-label="复制 ECharts 配置" @click="copy(JSON.stringify(option, null, 2))"><el-icon><CopyDocument /></el-icon>复制配置</button><button type="button" class="primary" @click="downloadPng"><el-icon><Download /></el-icon>导出 PNG</button></div></header><div class="chart-shell" :class="{ 'calendar-shell': props.type === 'calendar' }" :style="{ height: `${chartHeight}px` }"><div ref="chartElement" class="chart-canvas" :class="{ 'calendar-canvas': props.type === 'calendar' }" role="img" :aria-label="`${workbenchTitle}实时预览，共 ${stats.count} 条记录`"></div><div v-if="!stats.count" class="chart-empty">输入有效数据后，这里会显示图表</div></div><div class="preview-summary"><span><i></i>实时同步</span><span>{{ stats.count }} 条记录</span><span>{{ stats.groups }} 个分组 / 节点组</span><span>{{ stats.detail }}</span></div><p v-if="props.type === 'calendar'" class="mobile-hint">窄屏下可在预览区域左右滑动查看完整年度。</p></article>
    </section>

    <section class="config-card"><header class="card-header"><div><span class="eyebrow">PRO SETTINGS</span><h3>专业配置</h3><p>通用排版与当前图表的专属参数集中在这里。</p></div><button type="button" class="reset-button" @click="resetWorkbench"><el-icon><Refresh /></el-icon>恢复默认</button></header><div class="config-grid">
      <label class="field"><span>主标题</span><input v-model="settings.title" type="text" maxlength="40"></label><label class="field"><span>副标题</span><input v-model="settings.subtitle" type="text" maxlength="60"></label>
      <div class="field"><span>标题位置</span><div class="segmented"><button v-for="item in [{ value: 'left', label: '左' }, { value: 'center', label: '中' }, { value: 'right', label: '右' }]" :key="item.value" type="button" :class="{ active: settings.titlePosition === item.value }" @click="settings.titlePosition = item.value as SpecialChartSettings['titlePosition']">{{ item.label }}</button></div></div>
      <div class="field"><span>图形样式</span><div class="segmented"><button v-for="item in variants" :key="item.value" type="button" :class="{ active: settings.variant === item.value }" @click="settings.variant = item.value">{{ item.label }}</button></div></div>
      <template v-if="props.type === 'treemap'"><label class="field"><span>默认钻取深度 · {{ settings.treemapDepth }}</span><input v-model.number="settings.treemapDepth" class="range" type="range" min="1" max="6" step="1"></label><div class="field switch-field"><span>显示层级面包屑</span><el-switch v-model="settings.showBreadcrumb" aria-label="显示层级面包屑" /></div></template>
      <template v-if="props.type === 'sankey'"><div class="field"><span>节点对齐</span><select v-model="settings.sankeyAlign"><option value="justify">两端对齐</option><option value="left">靠来源侧</option><option value="right">靠目标侧</option></select></div><label class="field"><span>连线弧度 · {{ Math.round(settings.sankeyCurve * 100) }}%</span><input v-model.number="settings.sankeyCurve" class="range" type="range" min="0" max="1" step="0.05"></label></template>
      <template v-if="props.type === 'boxplot'"><label class="field color-field"><span>箱体颜色</span><input v-model="settings.boxColor" type="color"></label><div class="field switch-field"><span>显示异常值</span><el-switch v-model="settings.showOutliers" aria-label="显示箱线图异常值" /></div></template>
      <template v-if="props.type === 'calendar'"><div class="field"><span>显示年份</span><select v-model.number="settings.calendarYear"><option v-for="year in availableYears" :key="year" :value="year">{{ year }} 年</option></select></div><label class="field color-field"><span>低值颜色</span><input v-model="settings.calendarMinColor" type="color"></label><label class="field color-field"><span>高值颜色</span><input v-model="settings.calendarMaxColor" type="color"></label><div class="field switch-field"><span>显示年度色阶</span><el-switch v-model="settings.showVisualMap" aria-label="显示日历图色阶" /></div></template>
      <label class="field"><span>预览高度 · {{ chartHeight }} px</span><input v-model.number="chartHeight" class="range" type="range" min="400" max="700" step="20"></label><div class="field switch-field"><span>显示数据标签</span><el-switch v-model="settings.showLabels" aria-label="显示数据标签" /></div>
    </div>
      <div v-if="props.type === 'treemap' || props.type === 'sankey'" class="palette-section"><div><span>系列配色</span><small>各节点会按顺序使用整组颜色。</small></div><div class="palette-list"><button v-for="item in CHART_PALETTES" :key="item.id" type="button" :class="{ active: currentPaletteId === item.id }" :aria-label="`使用${item.title}配色`" @click="choosePalette(item)"><i v-for="color in item.colors.slice(0, 4)" :key="color" :style="{ background: color }"></i><span>{{ item.title }}</span></button></div></div>
    </section>
    <ToolGuide title="数据结构与图表使用说明"><div class="detail-copy">{{ meta.detail }} 默认使用可视表格，可直接编辑或粘贴 Excel / WPS 单元格区域；也支持 CSV、TSV 与 JSON。所有解析和绘制均在当前浏览器完成；PNG 使用 2 倍像素密度导出，复制配置可获得当前 ECharts option。</div></ToolGuide>
  </div>
</template>

<style scoped>
.special-page{gap:18px;--accent:#2563eb;--accent-soft:#dbeafe}.chart-family {border:1px solid #e2e8f0;border-radius:22px;background:#fff;box-shadow:0 14px 38px rgba(15,23,42,.06)}.eyebrow{display:block;margin-bottom:6px;color:var(--accent);font-size:12px;font-weight:900;letter-spacing:.15em}.chart-family{display:flex;min-height:58px;align-items:center;gap:8px;padding:9px 12px;overflow-x:auto;scrollbar-width:none}.chart-family::-webkit-scrollbar{display:none}.chart-family a{flex:none;padding:9px 14px;border:1px solid transparent;border-radius:11px;color:#475569;font-size:13px;font-weight:800;text-decoration:none}.chart-family a:hover{background:#f8fafc}.chart-family a.active{border-color:color-mix(in srgb,var(--accent),#fff 62%);background:var(--accent-soft);color:var(--accent)}.sample-card{display:grid;grid-template-columns:minmax(230px,.5fr) minmax(0,1.5fr);align-items:center;gap:22px;padding:20px 22px}.section-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.section-heading h3,.card-header h3{margin:0;color:#0f172a;font-size:19px}.section-heading p,.card-header p{margin:4px 0 0;color:#64748b;font-size:13px;line-height:1.55}.sample-card>.section-heading{display:block}.sample-list{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.sample-list button{padding:13px 14px;border:1px solid #e2e8f0;border-radius:13px;background:#f8fafc;color:#334155;text-align:left;cursor:pointer}.sample-list button.active{border-color:var(--accent);background:var(--accent-soft);box-shadow:0 0 0 2px color-mix(in srgb,var(--accent),transparent 86%)}.sample-list span,.sample-list small{display:block}.sample-list span{font-size:14px;font-weight:850}.sample-list small{margin-top:4px;color:#64748b;font-size:12px;line-height:1.45}.workspace-grid{display:grid;grid-template-columns:minmax(350px,.76fr) minmax(0,1.24fr);gap:18px}.data-card,.preview-card,.config-card{padding:21px 22px}.card-header{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.header-actions{display:flex;flex-wrap:wrap;gap:7px}.header-actions button,.reset-button{display:inline-flex;min-height:36px;align-items:center;justify-content:center;gap:5px;padding:0 11px;border:1px solid #dbe3ef;border-radius:10px;background:#fff;color:#475569;font-size:12px;font-weight:850;cursor:pointer}.header-actions button.primary{border-color:var(--accent);background:var(--accent);color:#fff}.mode-tabs{display:grid;grid-template-columns:1fr 1fr;margin-top:17px;padding:4px;border-radius:12px;background:#f1f5f9}.mode-tabs button{min-height:34px;border:0;border-radius:9px;background:transparent;color:#64748b;font-size:13px;font-weight:800}.mode-tabs button.active{background:#fff;color:var(--accent);box-shadow:0 2px 8px rgba(15,23,42,.08)}textarea{display:block;width:100%;height:300px;resize:vertical;margin-top:12px;padding:14px;border:1px solid #dbe3ef;border-radius:13px;outline:0;background:#f8fafc;color:#0f172a;font:700 13px/1.65 ui-monospace,SFMono-Regular,Consolas,monospace}textarea:focus{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent),transparent 88%)}.format-hint{display:flex;justify-content:space-between;gap:12px;margin-top:9px;color:#64748b;font-size:12px;line-height:1.5}.format-hint b{flex:none;color:var(--accent)}.validation-box{margin-top:12px;padding:12px 13px;border-radius:12px;background:#fff7ed;color:#c2410c;font-size:12px;line-height:1.6}.validation-box strong{display:block;font-size:13px}.validation-box ul{margin:5px 0 0;padding-left:18px}.validation-box.success{display:flex;gap:9px;background:#ecfdf5;color:#047857}.validation-box.success span{color:#64748b}.chart-shell{position:relative;min-height:400px;margin-top:13px;overflow:hidden;border:1px solid #e2e8f0;border-radius:16px;background:linear-gradient(180deg,#fff,#f8fafc)}.chart-shell.calendar-shell{overflow-x:auto;overflow-y:hidden}.chart-canvas{width:100%;height:100%}.chart-empty{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:14px;background:rgba(248,250,252,.84)}.preview-summary{display:flex;flex-wrap:wrap;gap:15px;margin-top:12px;color:#64748b;font-size:12px}.preview-summary span:first-child{margin-right:auto;color:#059669;font-weight:800}.preview-summary i{display:inline-block;width:8px;height:8px;margin-right:6px;border-radius:50%;background:#10b981;box-shadow:0 0 0 4px #d1fae5}.mobile-hint{display:none;margin:9px 0 0;color:#64748b;font-size:12px}.config-card>.card-header{padding-bottom:17px;border-bottom:1px solid #e2e8f0}.config-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-top:18px}.field{display:flex;min-width:0;flex-direction:column;gap:7px}.field>span,.palette-section>div:first-child>span{color:#475569;font-size:13px;font-weight:800}.field input[type=text],.field input[type=number],.field select{width:100%;height:40px;padding:0 11px;border:1px solid #dbe3ef;border-radius:10px;outline:0;background:#fff;color:#0f172a;font-size:13px}.field input:focus,.field select:focus{border-color:var(--accent)}.segmented{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;padding:3px;border:1px solid #dbe3ef;border-radius:10px;background:#f8fafc}.segmented button{min-height:32px;padding:0 8px;border:0;border-radius:7px;background:transparent;color:#64748b;font-size:12px;font-weight:800}.segmented button.active{background:#fff;color:var(--accent);box-shadow:0 2px 8px rgba(15,23,42,.08)}.range{width:100%;height:40px;accent-color:var(--accent)}.switch-field{flex-direction:row;align-items:center;justify-content:space-between;padding:0 13px;border:1px solid #dbe3ef;border-radius:10px}.color-field input{width:100%;height:40px;padding:4px;border:1px solid #dbe3ef;border-radius:10px;background:#fff}.palette-section{display:grid;grid-template-columns:190px 1fr;align-items:center;gap:18px;margin-top:18px;padding-top:18px;border-top:1px solid #e2e8f0}.palette-section small{display:block;margin-top:4px;color:#64748b;font-size:12px}.palette-list{display:flex;flex-wrap:wrap;gap:9px}.palette-list button{display:grid;grid-template-columns:repeat(4,14px);gap:3px;min-height:52px;padding:8px 10px;border:1px solid #dbe3ef;border-radius:11px;background:#fff;color:#475569}.palette-list button.active{border-color:var(--accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--accent),transparent 86%)}.palette-list i{width:14px;height:14px;border-radius:4px}.palette-list span{grid-column:1/-1;font-size:12px;font-weight:800}
:global(html.dark .special-page .hero-metrics){border-color:#40516a;background:rgba(15,23,42,.5)}:global(html.dark .special-page .hero-metrics div){border-color:#40516a}:global(html.dark .special-page .hero-metrics strong){color:#e7edf6}:global(html.dark .special-page .hero-metrics span){color:#a8b4c5}:global(html.dark .special-page .chart-family),:global(html.dark .special-page .sample-card),:global(html.dark .special-page .data-card),:global(html.dark .special-page .preview-card),:global(html.dark .special-page .config-card){border-color:#334155;background:#1e293b;box-shadow:none}:global(html.dark .special-page h3){color:#f8fafc}:global(html.dark .special-page .chart-family a),:global(html.dark .special-page .sample-list button),:global(html.dark .special-page .field>span),:global(html.dark .special-page .palette-section>div:first-child>span){color:#cbd5e1}:global(html.dark .special-page .chart-family a:hover),:global(html.dark .special-page .sample-list button),:global(html.dark .special-page .mode-tabs),:global(html.dark .special-page .segmented){border-color:#475569;background:#0f172a}:global(html.dark .special-page .chart-family a.active),:global(html.dark .special-page .sample-list button.active){border-color:var(--accent);background:color-mix(in srgb,var(--accent),#0f172a 76%);color:#fff}:global(html.dark .special-page .header-actions button),:global(html.dark .special-page .reset-button),:global(html.dark .special-page .palette-list button),:global(html.dark .special-page .field input[type=text]),:global(html.dark .special-page .field input[type=number]),:global(html.dark .special-page .field select),:global(html.dark .special-page .color-field input){border-color:#475569;background:#0f172a;color:#e2e8f0}:global(html.dark .special-page .header-actions button.primary){border-color:var(--accent);background:var(--accent);color:#fff}:global(html.dark .special-page .mode-tabs button.active),:global(html.dark .special-page .segmented button.active){background:#334155;color:#fff}:global(html.dark .special-page textarea){border-color:#475569;background:#0f172a;color:#e2e8f0}:global(html.dark .special-page .chart-shell){border-color:#334155;background:#0f172a}:global(html.dark .special-page .config-card>.card-header),:global(html.dark .special-page .palette-section){border-color:#334155}:global(html.dark .special-page .validation-box.success){background:#12372a}:global(html.dark .special-page .validation-box.success span){color:#94a3b8}
@media(max-width:1180px){.workspace-grid{grid-template-columns:1fr}.config-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.sample-card{grid-template-columns:1fr}.sample-card>.section-heading{display:flex}}
@media(max-width:820px){.config-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.palette-section{grid-template-columns:1fr}}
@media(max-width:620px){.special-page{gap:14px}.hero-metrics{grid-template-columns:1fr}.hero-metrics div{border-left:0;border-bottom:1px solid #e5edf6}.hero-metrics div:last-child{border-bottom:0}.sample-card,.data-card,.preview-card,.config-card{padding:15px;border-radius:17px}.sample-card>.section-heading,.card-header{flex-direction:column}.sample-list{grid-template-columns:1fr}.header-actions{width:100%}.header-actions button{flex:1}textarea{height:260px}.format-hint{flex-direction:column}.validation-box.success{flex-direction:column}.chart-shell{height:420px!important}.calendar-canvas{min-width:560px}.preview-summary span:first-child{width:100%;margin:0}.mobile-hint{display:block}.config-grid{grid-template-columns:1fr}.reset-button{width:100%}.palette-list{display:grid;grid-template-columns:1fr 1fr}.palette-list button{width:100%}}
.mode-tabs{grid-template-columns:repeat(3,minmax(0,1fr))}
</style>
