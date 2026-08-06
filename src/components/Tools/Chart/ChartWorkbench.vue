<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { CopyDocument, Download, Refresh, UploadFilled } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import MetricsBar from '@/components/Common/MetricsBar.vue'
import { autoDown } from '@/utils/file'
import ChartDataGrid from '@/components/Tools/Chart/ChartDataGrid.vue'
import ChartToolNav from '@/components/Tools/Chart/ChartToolNav.vue'
import { useSettingStore } from '@/store/modules/setting'
import { useRoute } from 'vue-router'
import { getTools } from '@/components/Tools/tools.ts'
import { copy, rtrim } from '@/utils/string'
import { clearChartDraft, loadChartDraft, saveChartDraft } from '@/utils/chartDraft'
import {
  CHART_PALETTES,
  CHART_SAMPLES,
  buildChartOption,
  getChartStats,
  parseChartData,
  serializeChartData,
  type ChartDataMode,
  type ChartKind,
  type ChartSettings,
} from '@/utils/chartStudio'

const props = defineProps<{ type: ChartKind }>()
const route = useRoute()
const settingStore = useSettingStore()
// 工具标题以 tools.ts 为唯一来源，按当前路由派生（与 ToolHero 一致）
const workbenchTitle = computed(() => {
  const tool = getTools({ cateId: 0, title: '', route: rtrim(route.path, '/') })
  return tool.title || ''
})
const chartElement = ref<HTMLElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
type EditorMode = 'grid' | ChartDataMode
const dataMode = ref<EditorMode>('grid')
const activeSample = ref(CHART_SAMPLES[props.type][0].id)
const chartHeight = ref(440)
let chart: echarts.ECharts | null = null
let resizeObserver: ResizeObserver | null = null

const typeMeta: Record<ChartKind, {
  eyebrow: string
  headline: string
  accent: string
  accentSoft: string
  axisX: string
  axisY: string
  detail: string
}> = {
  bar: {
    eyebrow: 'BAR CHART STUDIO', headline: '把分类差异做得一眼可见',
    accent: '#2563EB', accentSoft: '#DBEAFE', axisX: '分类', axisY: '数值',
    detail: '柱状图适合比较离散分类。分类名称较短时优先使用纵向布局；排行榜或标签较长时，横向布局通常更易阅读。坐标轴默认从自动范围开始，使用前应确认是否需要从零展示，避免夸大微小差异。',
  },
  line: {
    eyebrow: 'LINE CHART STUDIO', headline: '让趋势、拐点与变化速度更清楚',
    accent: '#7C3AED', accentSoft: '#EDE9FE', axisX: '时间 / 序列', axisY: '数值',
    detail: '折线图适合展示有顺序的数据变化，面积图还能强调累计规模。平滑曲线会改善视觉连续性，但也可能让读者误判数据点之间的真实波动；精确分析时建议保留原始折线和数据标签。',
  },
  pie: {
    eyebrow: 'PIE CHART STUDIO', headline: '快速看懂整体由哪些部分构成',
    accent: '#EA580C', accentSoft: '#FFEDD5', axisX: '', axisY: '',
    detail: '饼图适合展示少量、互斥且合计构成整体的分类。分类超过 6 项或数值非常接近时，柱状图通常更易比较；请避免输入负数作为占比，并确认数据口径一致。',
  },
  scatter: {
    eyebrow: 'SCATTER CHART STUDIO', headline: '从两个变量中寻找关系与异常点',
    accent: '#0891B2', accentSoft: '#CFFAFE', axisX: 'X 变量', axisY: 'Y 变量',
    detail: '散点图用于观察两个数值变量的相关关系、聚类和异常值。点的分布只能提示关联，不能单独证明因果；样本量较大时应降低点尺寸或透明度，减少遮挡。',
  },
  funnel: {
    eyebrow: 'FUNNEL CHART STUDIO', headline: '把流程流失和关键转化节点摆出来',
    accent: '#059669', accentSoft: '#D1FAE5', axisX: '', axisY: '',
    detail: '漏斗图适合展示按阶段递减的流程数据，例如访问、下单和支付。各阶段必须使用同一统计口径；若某一步数值上升，应先确认是流程回流、重复计数还是排序选择造成。',
  },
}

const meta = computed(() => typeMeta[props.type])
const samples = computed(() => CHART_SAMPLES[props.type])
const variants = computed(() => ({
  bar: [{ value: 'vertical', label: '纵向柱状' }, { value: 'horizontal', label: '横向排行' }],
  line: [{ value: 'line', label: '折线图' }, { value: 'area', label: '面积图' }],
  pie: [{ value: 'pie', label: '饼图' }, { value: 'doughnut', label: '环形图' }],
  scatter: [{ value: 'scatter', label: '标准散点' }, { value: 'bubble', label: '强调气泡' }],
  funnel: [{ value: 'outside', label: '外侧标签' }, { value: 'inside', label: '内嵌标签' }],
}[props.type]))

function defaultVariant(type: ChartKind) {
  return ({ bar: 'vertical', line: 'line', pie: 'doughnut', scatter: 'scatter', funnel: 'outside' })[type]
}

function createSettings(): ChartSettings {
  return {
    title: samples.value[0].title,
    subtitle: '数据图表 · 本地实时生成',
    titlePosition: 'center',
    variant: defaultVariant(props.type),
    palette: [...CHART_PALETTES[0].colors],
    showLegend: props.type === 'pie',
    showLabels: props.type === 'pie' || props.type === 'funnel',
    smooth: false,
    axisNameX: meta.value.axisX,
    axisNameY: meta.value.axisY,
    pointSize: 14,
    funnelSort: 'descending',
  }
}

const settings = reactive<ChartSettings>(createSettings())
const parserMode = computed<ChartDataMode>(() => dataMode.value === 'json' ? 'json' : 'table')
const dataText = ref(serializeChartData(samples.value[0].rows, props.type, 'table'))
const parsed = computed(() => parseChartData(dataText.value, props.type, parserMode.value))
const rows = computed(() => parsed.value.rows)
const stats = computed(() => getChartStats(rows.value, props.type))
const option = computed(() => buildChartOption(props.type, rows.value, settings, settingStore.isDark))
const currentPaletteId = ref<string>(CHART_PALETTES[0].id)

// 恢复该图表类型的本地草稿（跨工具切换 / 刷新后保留输入数据与配置）
const restoredDraft = loadChartDraft<ChartSettings>(props.type)
if (restoredDraft) {
  dataMode.value = restoredDraft.dataMode as EditorMode
  activeSample.value = restoredDraft.activeSample
  chartHeight.value = restoredDraft.chartHeight
  currentPaletteId.value = restoredDraft.currentPaletteId
  dataText.value = restoredDraft.dataText
  Object.assign(settings, { ...createSettings(), ...restoredDraft.settings })
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

const heroMetrics = computed(() => [
  { value: stats.value.count.toLocaleString('zh-CN'), label: stats.value.primaryLabel },
  { value: formatNumber(props.type === 'scatter' ? stats.value.average : stats.value.sum), label: props.type === 'scatter' ? 'Y 平均值' : '数值合计' },
  { value: formatNumber(stats.value.max), label: '当前最大值' },
])

const formatHint = computed(() => dataMode.value === 'grid'
  ? '直接编辑单元格，或从 Excel / WPS 复制区域后粘贴'
  : dataMode.value === 'json'
    ? props.type === 'scatter' ? '格式：[{ "x": 12, "y": 24, "name": "样本 A" }]' : '格式：[{ "name": "分类 A", "value": 42 }]'
    : props.type === 'scatter' ? 'CSV 列：X、Y、名称（名称可省略）' : 'CSV 列：名称、数值；也支持 Tab 分隔')
const gridColumns = computed(() => props.type === 'scatter' ? 3 : 2)

function formatNumber(value: number) {
  return Number.isInteger(value)
    ? value.toLocaleString('zh-CN')
    : value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

function renderChart() {
  if (!chartElement.value) return
  if (!chart) chart = echarts.init(chartElement.value, settingStore.isDark ? 'dark' : undefined, { renderer: 'canvas' })
  chart.setOption(option.value, true)
  chart.resize()
}

function recreateChart() {
  chart?.dispose()
  chart = null
  nextTick(renderChart)
}

function applySample(sampleId: string) {
  const sample = samples.value.find(item => item.id === sampleId)
  if (!sample) return
  activeSample.value = sample.id
  dataText.value = serializeChartData(sample.rows, props.type, parserMode.value)
  settings.title = sample.title
}

function changeMode(mode: EditorMode) {
  if (mode === dataMode.value) return
  const nextParserMode: ChartDataMode = mode === 'json' ? 'json' : 'table'
  if (nextParserMode === parserMode.value) { dataMode.value = mode; return }
  const validRows = rows.value.length ? rows.value : samples.value[0].rows
  dataMode.value = mode
  dataText.value = serializeChartData(validRows, props.type, nextParserMode)
}

function choosePalette(palette: typeof CHART_PALETTES[number]) {
  currentPaletteId.value = palette.id
  settings.palette = [...palette.colors]
}

function changePrimaryColor(event: Event) {
  settings.palette[0] = (event.target as HTMLInputElement).value
  currentPaletteId.value = 'custom'
}

function resetWorkbench() {
  Object.assign(settings, createSettings())
  dataMode.value = 'grid'
  activeSample.value = samples.value[0].id
  dataText.value = serializeChartData(samples.value[0].rows, props.type, 'table')
  chartHeight.value = 440
  currentPaletteId.value = CHART_PALETTES[0].id
  draftDirty = false
  clearChartDraft(props.type)
  ElMessage.success('已恢复默认示例与配置')
}

async function importData(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (file.size > 1024 * 1024) {
    ElMessage.warning('单个数据文件请控制在 1 MB 以内')
    return
  }
  const content = await file.text()
  const nextMode: EditorMode = file.name.toLowerCase().endsWith('.json') || content.trimStart().startsWith('[') ? 'json' : 'grid'
  dataMode.value = nextMode
  dataText.value = content
  activeSample.value = ''
  ElMessage.success(`已载入 ${file.name}`)
}

function downloadPng() {
  if (!chart || !rows.value.length) {
    ElMessage.warning('请先输入有效数据')
    return
  }
  autoDown(chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: settingStore.isDark ? '#0F172A' : '#FFFFFF' }), `${(settings.title || workbenchTitle.value).replace(/[\\\/:*?"<>|]/g, '-')}.png`)
}

function downloadData() {
  if (!rows.value.length) {
    ElMessage.warning('没有可导出的有效数据')
    return
  }
  const content = serializeChartData(rows.value, props.type, parserMode.value)
  const blob = new Blob([content], { type: parserMode.value === 'json' ? 'application/json;charset=utf-8' : 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  autoDown(url, `chart-data.${parserMode.value === 'json' ? 'json' : 'csv'}`)
}

watch(option, () => nextTick(renderChart), { deep: true })
watch(() => settingStore.isDark, recreateChart)

onMounted(() => {
  nextTick(() => {
    renderChart()
    if (chartElement.value) {
      resizeObserver = new ResizeObserver(() => chart?.resize())
      resizeObserver.observe(chartElement.value)
    }
  })
})

onBeforeUnmount(() => {
  // 组件销毁前把未落盘的草稿写入，保证跨工具切换后数据不丢失
  if (draftTimer) { clearTimeout(draftTimer); draftTimer = null }
  if (draftDirty) writeDraft()
  resizeObserver?.disconnect()
  chart?.dispose()
  chart = null
})
</script>

<template>
  <div class="chart-page flex flex-col mt-3 flex-1" :style="{ '--accent': meta.accent, '--accent-soft': meta.accentSoft }">
    <ToolHero :summary="meta.headline">
      <template #metrics>
        <MetricsBar :items="heroMetrics" />
      </template>
    </ToolHero>

    <ChartToolNav :current="props.type" />

    <section class="sample-card">
      <div class="section-heading"><div><span class="eyebrow">START WITH DATA</span><h3>载入一个示例</h3></div><p>示例会替换当前数据，载入后可以继续编辑。</p></div>
      <div class="sample-list">
        <button v-for="sample in samples" :key="sample.id" type="button" :class="{ active: activeSample === sample.id }" @click="applySample(sample.id)">
          <span>{{ sample.title }}</span><small>{{ sample.hint }}</small>
        </button>
      </div>
    </section>

    <section class="workspace-grid">
      <article class="data-card">
        <header class="card-header">
          <div><span class="eyebrow">DATA SOURCE</span><h3>数据输入</h3></div>
          <div class="header-actions">
            <button type="button" @click="fileInput?.click()"><el-icon><UploadFilled /></el-icon>导入</button>
            <button type="button" @click="downloadData">导出</button>
            <input ref="fileInput" type="file" accept=".csv,.tsv,.txt,.json" hidden @change="importData">
          </div>
        </header>
        <div class="mode-tabs" aria-label="数据输入方式">
          <button type="button" :class="{ active: dataMode === 'grid' }" @click="changeMode('grid')">可视表格</button>
          <button type="button" :class="{ active: dataMode === 'table' }" @click="changeMode('table')">CSV / TSV</button>
          <button type="button" :class="{ active: dataMode === 'json' }" @click="changeMode('json')">JSON</button>
        </div>
        <ChartDataGrid v-if="dataMode === 'grid'" v-model="dataText" :min-columns="gridColumns" :aria-label="`${workbenchTitle}可视数据表格`" @update:model-value="activeSample = ''" />
        <textarea v-else v-model="dataText" spellcheck="false" :aria-label="`${workbenchTitle}数据输入`" @input="activeSample = ''"></textarea>
        <div class="format-hint"><span>{{ formatHint }}</span><b>{{ rows.length }} 条有效数据</b></div>
        <div v-if="parsed.errors.length" class="validation-box" role="alert">
          <strong>有 {{ parsed.errors.length }} 处需要检查</strong>
          <ul><li v-for="error in parsed.errors.slice(0, 4)" :key="error">{{ error }}</li></ul>
          <small v-if="parsed.errors.length > 4">另有 {{ parsed.errors.length - 4 }} 条未展开</small>
        </div>
        <div v-else class="validation-box success"><strong>数据格式有效</strong><span>修改内容后图表会自动刷新，无需点击计算。</span></div>
      </article>

      <article class="preview-card">
        <header class="card-header">
          <div><span class="eyebrow">LIVE PREVIEW</span><h3>实时预览</h3></div>
          <div class="header-actions">
            <button type="button" aria-label="复制 ECharts 配置" @click="copy(JSON.stringify(option, null, 2))"><el-icon><CopyDocument /></el-icon>复制配置</button>
            <button type="button" class="primary" @click="downloadPng"><el-icon><Download /></el-icon>导出 PNG</button>
          </div>
        </header>
        <div class="chart-shell" :style="{ height: `${chartHeight}px` }">
          <div ref="chartElement" class="chart-canvas" role="img" :aria-label="`${workbenchTitle}实时预览，共 ${rows.length} 条数据`"></div>
          <div v-if="!rows.length" class="chart-empty">输入有效数据后，这里会显示图表</div>
        </div>
        <div class="preview-summary">
          <span><i></i>实时同步</span>
          <span>最小值 {{ formatNumber(stats.min) }}</span>
          <span>最大值 {{ formatNumber(stats.max) }}</span>
          <span>跨度 {{ formatNumber(stats.range) }}</span>
        </div>
      </article>
    </section>

    <section class="config-card">
      <header class="card-header">
        <div><span class="eyebrow">CHART SETTINGS</span><h3>图表配置</h3><p>所有调整都会直接反映在上方预览中。</p></div>
        <button type="button" class="reset-button" @click="resetWorkbench"><el-icon><Refresh /></el-icon>恢复默认</button>
      </header>
      <div class="config-grid">
        <label class="field"><span>主标题</span><input v-model="settings.title" type="text" maxlength="40"></label>
        <label class="field"><span>副标题</span><input v-model="settings.subtitle" type="text" maxlength="60"></label>
        <div class="field"><span>标题位置</span><div class="segmented"><button v-for="position in [{ value: 'left', label: '左' }, { value: 'center', label: '中' }, { value: 'right', label: '右' }]" :key="position.value" type="button" :class="{ active: settings.titlePosition === position.value }" @click="settings.titlePosition = position.value as ChartSettings['titlePosition']">{{ position.label }}</button></div></div>
        <div class="field"><span>图形样式</span><div class="segmented"><button v-for="variant in variants" :key="variant.value" type="button" :class="{ active: settings.variant === variant.value }" @click="settings.variant = variant.value">{{ variant.label }}</button></div></div>

        <label v-if="props.type === 'bar' || props.type === 'line' || props.type === 'scatter'" class="field"><span>X 轴名称</span><input v-model="settings.axisNameX" type="text" maxlength="20"></label>
        <label v-if="props.type === 'bar' || props.type === 'line' || props.type === 'scatter'" class="field"><span>Y 轴名称</span><input v-model="settings.axisNameY" type="text" maxlength="20"></label>
        <div v-if="props.type === 'funnel'" class="field"><span>漏斗排序</span><select v-model="settings.funnelSort"><option value="descending">数值从大到小</option><option value="ascending">数值从小到大</option><option value="none">保留输入顺序</option></select></div>
        <label v-if="props.type === 'scatter'" class="field"><span>散点尺寸 · {{ settings.pointSize }} px</span><input v-model.number="settings.pointSize" class="range" type="range" min="8" max="28" step="1"></label>
        <label class="field"><span>预览高度 · {{ chartHeight }} px</span><input v-model.number="chartHeight" class="range" type="range" min="360" max="620" step="20"></label>

        <div class="field switch-field"><span>显示数据标签</span><el-switch v-model="settings.showLabels" aria-label="显示数据标签" /></div>
        <div class="field switch-field"><span>显示图例</span><el-switch v-model="settings.showLegend" aria-label="显示图例" /></div>
        <div v-if="props.type === 'line'" class="field switch-field"><span>平滑曲线</span><el-switch v-model="settings.smooth" aria-label="使用平滑曲线" /></div>
      </div>

      <div class="palette-section">
        <div><span>主题配色</span><small>选择整组颜色，也可以修改第一主色。</small></div>
        <div class="palette-list">
          <button v-for="palette in CHART_PALETTES" :key="palette.id" type="button" :class="{ active: currentPaletteId === palette.id }" :aria-label="`使用${palette.title}配色`" @click="choosePalette(palette)">
            <i v-for="color in palette.colors.slice(0, 4)" :key="color" :style="{ background: color }"></i><span>{{ palette.title }}</span>
          </button>
          <label class="custom-color"><input type="color" :value="settings.palette[0]" aria-label="自定义图表主色" @input="changePrimaryColor"><span>自定义主色</span></label>
        </div>
      </div>
    </section>

    <ToolGuide title="图表选择与数据说明"><div class="detail-copy">{{ meta.detail }} 默认使用可视表格，可直接编辑或粘贴 Excel / WPS 单元格区域；也支持 CSV、TSV 与 JSON。所有解析和绘制都在当前浏览器完成，不会上传数据。导出的 PNG 使用 2 倍像素密度；“复制配置”可获得当前 ECharts option。</div></ToolGuide>
  </div>
</template>

<style scoped>
.chart-page{gap:18px;--accent:#2563eb;--accent-soft:#dbeafe}.chart-family {border: 1px solid var(--c-border);border-radius:22px;background:#fff;box-shadow:0 14px 38px rgba(15,23,42,.06)}.eyebrow{display:block;margin-bottom:6px;color:var(--accent);font-size:12px;font-weight:900;letter-spacing:.15em}.chart-family{display:flex;min-height:58px;align-items:center;gap:8px;padding:9px 12px;scrollbar-width:none}.chart-family::-webkit-scrollbar{display:none}.chart-family>span{padding:0 10px;color: var(--c-text-secondary);font-size:13px;font-weight:800}.chart-family a{padding:9px 14px;border:1px solid transparent;border-radius:11px;color: var(--c-text-body);font-size:13px;font-weight:800;text-decoration:none;transition:.2s}.chart-family a:hover{background: var(--c-surface-subtle)}.chart-family a.active{border-color:color-mix(in srgb,var(--accent),#fff 68%);background:var(--accent-soft);color:var(--accent)}.sample-card{display:grid;grid-template-columns:minmax(220px,.48fr) minmax(0,1.52fr);align-items:center;gap:24px;padding:20px 22px}.section-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.section-heading h3,.card-header h3{margin:0;color: var(--c-text-primary);font-size:19px}.section-heading p,.card-header p{margin:4px 0 0;color: var(--c-text-secondary);font-size:13px;line-height:1.55}.sample-card>.section-heading{display:block}.sample-list{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.sample-list button{min-width:0;padding:13px 14px;border: 1px solid var(--c-border);border-radius:13px;background: var(--c-surface-subtle);color: var(--c-text-strong);text-align:left;cursor:pointer;transition:.2s}.sample-list button:hover{border-color:var(--accent)}.sample-list button.active{border-color:color-mix(in srgb,var(--accent),#fff 35%);background:var(--accent-soft);box-shadow:0 0 0 2px color-mix(in srgb,var(--accent),transparent 86%)}.sample-list span,.sample-list small{display:block}.sample-list span{font-size:14px;font-weight:850}.sample-list small{margin-top:4px;color: var(--c-text-secondary);font-size:12px}.workspace-grid{display:grid;grid-template-columns:minmax(340px,.74fr) minmax(0,1.26fr);gap:18px}.data-card,.preview-card,.config-card{padding:21px 22px}.card-header{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.header-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:7px}.header-actions button,.reset-button{display:inline-flex;min-height:36px;align-items:center;justify-content:center;gap:5px;padding:0 11px;border:1px solid #dbe3ef;border-radius:10px;background:#fff;color: var(--c-text-body);font-size:12px;font-weight:850;cursor:pointer}.header-actions button:hover,.reset-button:hover{border-color:var(--accent);color:var(--accent)}.header-actions button.primary{border-color:var(--accent);background:var(--accent);color:#fff}.mode-tabs{display:grid;grid-template-columns:1fr 1fr;margin-top:17px;padding:4px;border-radius:12px;background:#f1f5f9}.mode-tabs button{min-height:34px;border:0;border-radius:9px;background:transparent;color: var(--c-text-secondary);font-size:13px;font-weight:800;cursor:pointer}.mode-tabs button.active{background:#fff;color:var(--accent);box-shadow:0 2px 8px rgba(15,23,42,.08)}.data-card textarea{display:block;width:100%;height:272px;resize:vertical;margin-top:12px;padding:14px;border:1px solid #dbe3ef;border-radius:13px;outline:0;background: var(--c-surface-subtle);color: var(--c-text-primary);font:700 13px/1.65 ui-monospace,SFMono-Regular,Consolas,monospace;transition:.2s}.data-card textarea:focus{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent),transparent 88%)}.format-hint{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-top:9px;color: var(--c-text-secondary);font-size:12px;line-height:1.5}.format-hint b{flex:none;color:var(--accent)}.validation-box{margin-top:12px;padding:12px 13px;border-radius:12px;background:#fff7ed;color:#c2410c;font-size:12px;line-height:1.6}.validation-box strong{display:block;font-size:13px}.validation-box ul{margin:5px 0 0;padding-left:18px}.validation-box small{display:block;margin-top:4px}.validation-box.success{display:flex;align-items:center;gap:9px;background:#ecfdf5;color:#047857}.validation-box.success span{color: var(--c-text-secondary)}.chart-shell{position:relative;min-height:360px;margin-top:13px;overflow:hidden;border: 1px solid var(--c-border);border-radius:16px;background:linear-gradient(180deg,#fff,#f8fafc);transition:height .2s}.chart-canvas{width:100%;height:100%}.chart-empty{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color: var(--c-text-muted);font-size:14px;background:rgba(248,250,252,.82)}.preview-summary{display:flex;flex-wrap:wrap;align-items:center;gap:15px;margin-top:12px;color: var(--c-text-secondary);font-size:12px}.preview-summary span:first-child{margin-right:auto;color:#059669;font-weight:800}.preview-summary i{display:inline-block;width:8px;height:8px;margin-right:6px;border-radius:50%;background:#10b981;box-shadow:0 0 0 4px #d1fae5}.config-card>.card-header{padding-bottom:17px;border-bottom: 1px solid var(--c-border)}.config-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-top:18px}.field{display:flex;min-width:0;flex-direction:column;gap:7px}.field>span,.palette-section>div:first-child>span{color: var(--c-text-body);font-size:13px;font-weight:800}.field input[type="text"],.field select{width:100%;height:40px;padding:0 11px;border:1px solid #dbe3ef;border-radius:10px;outline:0;background:#fff;color: var(--c-text-primary);font-size:13px}.field input[type="text"]:focus,.field select:focus{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent),transparent 88%)}.segmented{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;padding:3px;border:1px solid #dbe3ef;border-radius:10px;background: var(--c-surface-subtle)}.segmented button{min-height:32px;padding:0 9px;border:0;border-radius:7px;background:transparent;color: var(--c-text-secondary);font-size:12px;font-weight:800;cursor:pointer}.segmented button.active{background:#fff;color:var(--accent);box-shadow:0 2px 8px rgba(15,23,42,.08)}.range{width:100%;height:40px;accent-color:var(--accent)}.switch-field{flex-direction:row;align-items:center;justify-content:space-between;padding:0 13px;border:1px solid #dbe3ef;border-radius:10px}.palette-section{display:grid;grid-template-columns:190px 1fr;align-items:center;gap:18px;margin-top:18px;padding-top:18px;border-top: 1px solid var(--c-border)}.palette-section>div:first-child small{display:block;margin-top:4px;color: var(--c-text-secondary);font-size:12px;line-height:1.5}.palette-list{display:flex;flex-wrap:wrap;gap:9px}.palette-list>button,.custom-color{display:grid;grid-template-columns:repeat(4,14px);align-items:center;gap:3px;min-height:52px;padding:8px 10px;border:1px solid #dbe3ef;border-radius:11px;background:#fff;color: var(--c-text-body);cursor:pointer}.palette-list>button.active{border-color:var(--accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--accent),transparent 86%)}.palette-list i{width:14px;height:14px;border-radius:4px}.palette-list span{grid-column:1/-1;font-size:12px;font-weight:800}.custom-color{display:flex;min-width:108px;flex-direction:column;justify-content:center}.custom-color input{width:38px;height:20px;padding:0;border:0;background:transparent;cursor:pointer}:global(html.dark .chart-page .chart-family),:global(html.dark .chart-page .sample-card),:global(html.dark .chart-page .data-card),:global(html.dark .chart-page .preview-card),:global(html.dark .chart-page .config-card){border-color: var(--c-border);background:var(--c-surface);box-shadow:none}:global(html.dark .chart-page h3){color:#f8fafc}:global(html.dark .chart-page .chart-family a),:global(html.dark .chart-page .sample-list button),:global(html.dark .chart-page .field>span),:global(html.dark .chart-page .palette-section>div:first-child>span){color: var(--c-text-secondary)}:global(html.dark .chart-page .chart-family a:hover),:global(html.dark .chart-page .sample-list button),:global(html.dark .chart-page .mode-tabs),:global(html.dark .chart-page .segmented){border-color: var(--c-border-strong);background:var(--c-surface-subtle)}:global(html.dark .chart-page .chart-family a.active),:global(html.dark .chart-page .sample-list button.active){border-color:var(--accent);background:color-mix(in srgb,var(--accent),#0f172a 76%);color:#fff}:global(html.dark .chart-page .header-actions button),:global(html.dark .chart-page .reset-button),:global(html.dark .chart-page .palette-list>button),:global(html.dark .chart-page .custom-color),:global(html.dark .chart-page .field input[type="text"]),:global(html.dark .chart-page .field select){border-color: var(--c-border-strong);background:var(--c-surface-subtle);color: var(--c-text-primary)}:global(html.dark .chart-page .header-actions button.primary){border-color:var(--accent);background:var(--accent);color:#fff}:global(html.dark .chart-page .mode-tabs button.active),:global(html.dark .chart-page .segmented button.active){background:#334155;color:#fff}:global(html.dark .chart-page .data-card textarea){border-color: var(--c-border-strong);background:var(--c-surface-subtle);color: var(--c-text-primary)}:global(html.dark .chart-page .chart-shell){border-color: var(--c-border);background:var(--c-surface-subtle)}:global(html.dark .chart-page .chart-empty){background:rgba(15,23,42,.86)}:global(html.dark .chart-page .config-card>.card-header),:global(html.dark .chart-page .palette-section){border-color: var(--c-border)}:global(html.dark .chart-page .validation-box.success){background:#12372a}:global(html.dark .chart-page .validation-box.success span){color: var(--c-text-muted)}@media(max-width:1180px){.workspace-grid{grid-template-columns:1fr}.config-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.sample-card{grid-template-columns:1fr}.sample-card>.section-heading{display:flex}}@media(max-width:820px){.chart-family{overflow-x:auto}.chart-family>span,.chart-family a{flex:none}.config-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.palette-section{grid-template-columns:1fr}}@media(max-width:620px){.chart-page{gap:14px}.chart-family{border-radius:16px}.sample-card,.data-card,.preview-card,.config-card{padding:15px;border-radius:17px}.sample-card>.section-heading,.card-header{flex-direction:column}.sample-list{grid-template-columns:1fr}.header-actions{width:100%;justify-content:flex-start}.header-actions button{flex:1}.data-card textarea{height:240px}.format-hint{flex-direction:column}.validation-box.success{align-items:flex-start;flex-direction:column}.chart-shell{min-height:340px;height:380px!important}.preview-summary span:first-child{width:100%;margin:0}.config-grid{grid-template-columns:1fr}.palette-list{display:grid;grid-template-columns:1fr 1fr}.palette-list>button,.custom-color{width:100%}.reset-button{width:100%}}
.mode-tabs{grid-template-columns:repeat(3,minmax(0,1fr))}</style>
