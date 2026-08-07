<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { CopyDocument, Download, Refresh, UploadFilled } from '@element-plus/icons-vue'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import { formatNumber } from '@/utils/format'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import MetricsBar from '@/components/Common/MetricsBar.vue'
import ChartDataGrid from '@/components/Tools/Chart/ChartDataGrid.vue'
import ChartToolNav from '@/components/Tools/Chart/ChartToolNav.vue'
import { useSettingStore } from '@/store/modules/setting'
import { useRoute } from 'vue-router'
import { getTools } from '@/components/Tools/tools.ts'
import { copy, rtrim } from '@/utils/string'
import { useChartWorkbench } from '@/composables/useChartWorkbench'
import { CHART_PALETTES } from '@/utils/chartStudio'
import {
  ADVANCED_SAMPLES,
  buildAdvancedChartOption,
  getAdvancedStats,
  parseAdvancedChartData,
  serializeAdvancedChartData,
  type AdvancedChartKind,
  type AdvancedChartSettings,
  type AdvancedDataMode,
} from '@/utils/advancedChartStudio'

const props = defineProps<{ type: AdvancedChartKind }>()
const route = useRoute()
const settingStore = useSettingStore()
// 工具标题以 tools.ts 为唯一来源，按当前路由派生（与 ToolHero 一致）
const workbenchTitle = computed(() => {
  const tool = getTools({ cateId: 0, title: '', route: rtrim(route.path, '/') })
  return tool.title || ''
})
const chartElement = ref<HTMLElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
type EditorMode = 'grid' | AdvancedDataMode
const dataMode = ref<EditorMode>('grid')
const activeSample = ref(ADVANCED_SAMPLES[props.type][0].id)
const chartHeight = ref(460)
const currentPaletteId = ref<string>(CHART_PALETTES[0].id)

const typeMeta = {
  radar: { eyebrow: 'RADAR CHART STUDIO', headline: '把多维能力与差距放在同一张图里', accent: '#7C3AED', soft: '#EDE9FE', detail: '雷达图适合对比多个对象在相同维度下的相对表现。各维度量纲不一致时，应通过“最大值”列完成归一化；维度太多会显著降低可读性，通常建议控制在 5–8 个。' },
  gauge: { eyebrow: 'GAUGE CHART STUDIO', headline: '用明确的范围读懂当前指标状态', accent: '#0D9488', soft: '#CCFBF1', detail: '仪表盘适合突出少量关键指标的当前状态，不适合精确比较大量数值。所有指标应共享同一范围和单位；若指标超出范围，工作台会保留数据并明确提示。' },
  heatmap: { eyebrow: 'HEATMAP STUDIO', headline: '从二维矩阵中快速找到高峰与空白', accent: '#DB2777', soft: '#FCE7F3', detail: '热力图适合展示两个离散维度交叉后的强弱分布。色阶会按当前数据最小值与最大值自动映射；比较多张图时，应使用相同色阶范围，避免颜色相同但实际数值不同。' },
  candlestick: { eyebrow: 'CANDLESTICK STUDIO', headline: '检查开收高低，也看清一段行情走势', accent: '#DC2626', soft: '#FEE2E2', detail: 'K 线每项数据依次为开盘、收盘、最低和最高。最低价必须不高于开收盘，最高价必须不低于开收盘。本工具只负责数据可视化，不构成投资建议。' },
  stack: { eyebrow: 'STACK CHART STUDIO', headline: '同时比较总量、构成与时间变化', accent: '#2563EB', soft: '#DBEAFE', detail: '堆叠图适合观察各分类总量及组成。堆叠柱便于比较离散分类，堆叠面积线更适合连续趋势；除最底层系列外，其余系列不共享零基线，不宜用于精确比较细微差异。' },
} as const

const meta = computed(() => typeMeta[props.type])
const samples = computed(() => ADVANCED_SAMPLES[props.type])
const variants = computed(() => ({
  radar: [{ value: 'polygon', label: '多边形' }, { value: 'circle', label: '圆形' }],
  gauge: [{ value: 'pointer', label: '指针盘' }, { value: 'progress', label: '进度盘' }],
  heatmap: [{ value: 'square', label: '方形单元' }, { value: 'rounded', label: '圆角单元' }],
  candlestick: [{ value: 'standard', label: '标准 K 线' }],
  stack: [{ value: 'bar', label: '堆叠柱' }, { value: 'line', label: '堆叠面积线' }],
}[props.type]))

function defaultVariant(type: AdvancedChartKind) { return ({ radar: 'polygon', gauge: 'pointer', heatmap: 'rounded', candlestick: 'standard', stack: 'bar' })[type] }

function createSettings(): AdvancedChartSettings {
  return {
    title: samples.value[0].title, subtitle: '复杂图表 · 本地实时生成', titlePosition: 'center', variant: defaultVariant(props.type),
    palette: [...CHART_PALETTES[0].colors], showLegend: props.type === 'radar' || props.type === 'stack', showLabels: props.type === 'heatmap', unit: props.type === 'gauge' ? '%' : '',
    radarMaxMode: 'auto', radarMax: 100, fillOpacity: 0.24,
    gaugeMin: 0, gaugeMax: 100, gaugeSplit: 10,
    heatMinColor: '#DBEAFE', heatMaxColor: '#1D4ED8', upColor: '#EF4444', downColor: '#10B981',
    showZoom: true, showTotal: false,
  }
}

const settings = reactive<AdvancedChartSettings>(createSettings())
const parserMode = computed<AdvancedDataMode>(() => dataMode.value === 'json' ? 'json' : 'table')
const dataText = ref(serializeAdvancedChartData(samples.value[0].data, 'table'))

const parsed = computed(() => parseAdvancedChartData(dataText.value, props.type, parserMode.value))
const data = computed(() => parsed.value.data)
const stats = computed(() => getAdvancedStats(data.value))
const runtimeWarnings = computed(() => {
  const warnings: string[] = []
  if (settings.gaugeMax <= settings.gaugeMin && props.type === 'gauge') warnings.push('仪表盘最大值必须大于最小值')
  if (props.type === 'gauge' && data.value.kind === 'gauge') data.value.items.forEach(item => { if (item.value < settings.gaugeMin || item.value > settings.gaugeMax) warnings.push(`${item.name} 超出当前仪表范围`) })
  if (props.type === 'radar' && settings.radarMaxMode === 'fixed' && stats.value.max > settings.radarMax) warnings.push('固定最大值小于部分数据，超出部分会贴近图形边界')
  return warnings
})
const allErrors = computed(() => [...parsed.value.errors, ...runtimeWarnings.value])
const option = computed(() => buildAdvancedChartOption(props.type, data.value, settings, settingStore.isDark))

const { resetWorkbench, importData, downloadData, downloadPng } = useChartWorkbench({
  type: props.type,
  settings,
  createSettings,
  refs: { dataMode, activeSample, chartHeight, currentPaletteId, dataText },
  defaultChartHeight: 460,
  defaultActiveSample: () => samples.value[0].id,
  hasData: () => stats.value.count > 0,
  serializeCurrent: mode => serializeAdvancedChartData(data.value, mode),
  serializeDefault: () => serializeAdvancedChartData(samples.value[0].data, 'table'),
  detectJson: content => content.trimStart().startsWith('{') || content.trimStart().startsWith('['),
  chartElement,
  option,
  isDark: computed(() => settingStore.isDark),
  filenameBase: () => settings.title || workbenchTitle.value,
})
const formatHint = computed(() => {
  if (dataMode.value === 'grid') return '直接编辑表头与单元格，或粘贴 Excel / WPS 区域'
  if (dataMode.value === 'json') return ({ radar: '对象：dimensions、maxima 与 series', gauge: '数组：name、value', heatmap: '数组：x、y、value', candlestick: '数组：date、open、close、low、high', stack: '对象：categories 与 series' })[props.type]
  return ({ radar: '列：维度、一个或多个系列、可选最大值', gauge: '列：指标、数值', heatmap: '列：X 分类、Y 分类、数值', candlestick: '列：日期、开盘、收盘、最低、最高', stack: '列：分类、一个或多个数据系列' })[props.type]
})
const gridColumns = computed(() => ({ radar: 4, gauge: 2, heatmap: 3, candlestick: 5, stack: 4 })[props.type])

const heroMetrics = computed(() => {
  if (props.type === 'radar') return [{ value: stats.value.count, label: '维度数' }, { value: stats.value.series, label: '对比系列' }, { value: formatNumber(stats.value.max), label: '当前峰值' }]
  if (props.type === 'gauge') return [{ value: stats.value.count, label: '指标数' }, { value: `${settings.gaugeMin}–${settings.gaugeMax}`, label: '仪表范围' }, { value: formatNumber(stats.value.max), label: '当前最高' }]
  if (props.type === 'heatmap' && data.value.kind === 'heatmap') return [{ value: stats.value.count, label: '有效单元' }, { value: `${data.value.xCategories.length} × ${data.value.yCategories.length}`, label: '矩阵规模' }, { value: formatNumber(stats.value.max), label: '热度峰值' }]
  if (props.type === 'candlestick' && data.value.kind === 'candlestick') return [{ value: stats.value.count, label: '行情周期' }, { value: data.value.items.filter(item => item.close >= item.open).length, label: '上涨周期' }, { value: formatNumber(stats.value.max), label: '区间最高' }]
  return [{ value: stats.value.count, label: '分类数' }, { value: stats.value.series, label: '堆叠系列' }, { value: formatNumber(stats.value.max), label: '单项峰值' }]
})

function applySample(id: string) { const sample = samples.value.find(item => item.id === id); if (!sample) return; activeSample.value = id; dataText.value = serializeAdvancedChartData(sample.data, parserMode.value); settings.title = sample.title }
function changeMode(mode: EditorMode) { if (mode === dataMode.value) return; const nextParserMode: AdvancedDataMode = mode === 'json' ? 'json' : 'table'; if (nextParserMode === parserMode.value) { dataMode.value = mode; return }; const current = stats.value.count ? data.value : samples.value[0].data; dataMode.value = mode; dataText.value = serializeAdvancedChartData(current, nextParserMode) }
function choosePalette(item: typeof CHART_PALETTES[number]) { currentPaletteId.value = item.id; settings.palette = [...item.colors] }
</script>

<template>
  <div class="advanced-page flex flex-col mt-3 flex-1" :style="{ '--accent': meta.accent, '--accent-soft': meta.soft }">
    <ToolHero :summary="meta.headline">
      <template #metrics>
        <MetricsBar :items="heroMetrics" />
      </template>
    </ToolHero>

    <ChartToolNav :current="props.type" />

    <section class="sample-card"><div class="section-heading"><div><span class="eyebrow">START WITH DATA</span><h3>载入一个示例</h3></div><p>示例会替换当前数据，载入后可以继续编辑。</p></div><div class="sample-list"><button v-for="sample in samples" :key="sample.id" type="button" :class="{ active: activeSample === sample.id }" @click="applySample(sample.id)"><span>{{ sample.title }}</span><small>{{ sample.hint }}</small></button></div></section>

    <section class="workspace-grid">
      <article class="data-card"><header class="card-header"><div><span class="eyebrow">STRUCTURED DATA</span><h3>数据输入</h3></div><div class="header-actions"><button type="button" @click="fileInput?.click()"><el-icon><UploadFilled /></el-icon>导入</button><button type="button" @click="downloadData">导出</button><input ref="fileInput" type="file" accept=".csv,.tsv,.txt,.json" hidden @change="importData"></div></header><div class="mode-tabs" aria-label="数据输入方式"><button type="button" :class="{ active: dataMode === 'grid' }" @click="changeMode('grid')">可视表格</button><button type="button" :class="{ active: dataMode === 'table' }" @click="changeMode('table')">CSV / TSV</button><button type="button" :class="{ active: dataMode === 'json' }" @click="changeMode('json')">JSON</button></div><ChartDataGrid v-if="dataMode === 'grid'" v-model="dataText" :min-columns="gridColumns" :aria-label="`${workbenchTitle}可视数据表格`" @update:model-value="activeSample = ''" /><textarea v-else v-model="dataText" spellcheck="false" :aria-label="`${workbenchTitle}数据输入`" @input="activeSample = ''"></textarea><div class="format-hint"><span>{{ formatHint }}</span><b>{{ stats.count }} 条有效记录</b></div><div v-if="allErrors.length" class="validation-box" role="alert"><strong>有 {{ allErrors.length }} 处需要检查</strong><ul><li v-for="error in allErrors.slice(0, 4)" :key="error">{{ error }}</li></ul></div><div v-else class="validation-box success"><strong>数据结构有效</strong><span>修改数据后，预览和统计会自动更新。</span></div></article>

      <article class="preview-card"><header class="card-header"><div><span class="eyebrow">LIVE PREVIEW</span><h3>实时预览</h3></div><div class="header-actions"><button type="button" aria-label="复制 ECharts 配置" @click="copy(JSON.stringify(option, null, 2))"><el-icon><CopyDocument /></el-icon>复制配置</button><button type="button" class="primary" @click="downloadPng"><el-icon><Download /></el-icon>导出 PNG</button></div></header><div class="chart-shell" :style="{ height: `${chartHeight}px` }"><div ref="chartElement" class="chart-canvas" role="img" :aria-label="`${workbenchTitle}实时预览，共 ${stats.count} 条记录`"></div><div v-if="!stats.count" class="chart-empty">输入有效数据后，这里会显示图表</div></div><div class="preview-summary"><span><i></i>实时同步</span><span>{{ stats.count }} 条记录</span><span>{{ stats.series }} 个系列 / 维度组</span><span>峰值 {{ formatNumber(stats.max) }}</span></div></article>
    </section>

    <section class="config-card"><header class="card-header"><div><span class="eyebrow">PRO SETTINGS</span><h3>专业配置</h3><p>通用排版与当前图表的专属参数集中在这里。</p></div><button type="button" class="reset-button" @click="resetWorkbench"><el-icon><Refresh /></el-icon>恢复默认</button></header><div class="config-grid">
      <label class="field"><span>主标题</span><input v-model="settings.title" type="text" maxlength="40"></label><label class="field"><span>副标题</span><input v-model="settings.subtitle" type="text" maxlength="60"></label>
      <div class="field"><span>标题位置</span><div class="segmented"><button v-for="item in [{ value: 'left', label: '左' }, { value: 'center', label: '中' }, { value: 'right', label: '右' }]" :key="item.value" type="button" :class="{ active: settings.titlePosition === item.value }" @click="settings.titlePosition = item.value as AdvancedChartSettings['titlePosition']">{{ item.label }}</button></div></div>
      <div class="field"><span>图形样式</span><div class="segmented"><button v-for="item in variants" :key="item.value" type="button" :class="{ active: settings.variant === item.value }" @click="settings.variant = item.value">{{ item.label }}</button></div></div>

      <template v-if="props.type === 'radar'"><div class="field"><span>最大值策略</span><select v-model="settings.radarMaxMode"><option value="auto">按每个维度自动计算</option><option value="fixed">所有维度固定值</option></select></div><label v-if="settings.radarMaxMode === 'fixed'" class="field"><span>固定最大值</span><input v-model.number="settings.radarMax" type="number" min="1"></label><label class="field"><span>填充强度 · {{ Math.round(settings.fillOpacity * 100) }}%</span><input v-model.number="settings.fillOpacity" class="range" type="range" min="0" max="0.7" step="0.05"></label></template>
      <template v-if="props.type === 'gauge'"><label class="field"><span>最小值</span><input v-model.number="settings.gaugeMin" type="number"></label><label class="field"><span>最大值</span><input v-model.number="settings.gaugeMax" type="number"></label><label class="field"><span>单位</span><input v-model="settings.unit" type="text" maxlength="8"></label><label class="field"><span>主刻度数</span><input v-model.number="settings.gaugeSplit" type="number" min="2" max="20"></label></template>
      <template v-if="props.type === 'heatmap'"><label class="field color-field"><span>低值颜色</span><input v-model="settings.heatMinColor" type="color"></label><label class="field color-field"><span>高值颜色</span><input v-model="settings.heatMaxColor" type="color"></label></template>
      <template v-if="props.type === 'candlestick'"><label class="field color-field"><span>上涨颜色</span><input v-model="settings.upColor" type="color"></label><label class="field color-field"><span>下跌颜色</span><input v-model="settings.downColor" type="color"></label><div class="field switch-field"><span>显示缩放条</span><el-switch v-model="settings.showZoom" aria-label="显示 K 线缩放条" /></div></template>
      <div v-if="props.type === 'stack'" class="field switch-field"><span>显示分类总量</span><el-switch v-model="settings.showTotal" aria-label="显示堆叠总量" /></div>
      <label class="field"><span>预览高度 · {{ chartHeight }} px</span><input v-model.number="chartHeight" class="range" type="range" min="380" max="660" step="20"></label><div v-if="props.type !== 'candlestick'" class="field switch-field"><span>显示数据标签</span><el-switch v-model="settings.showLabels" aria-label="显示数据标签" /></div><div v-if="props.type === 'radar' || props.type === 'stack'" class="field switch-field"><span>显示图例</span><el-switch v-model="settings.showLegend" aria-label="显示图例" /></div>
    </div>
      <div v-if="props.type === 'radar' || props.type === 'gauge' || props.type === 'stack'" class="palette-section"><div><span>系列配色</span><small>多系列会按顺序使用整组颜色。</small></div><div class="palette-list"><button v-for="item in CHART_PALETTES" :key="item.id" type="button" :class="{ active: currentPaletteId === item.id }" :aria-label="`使用${item.title}配色`" @click="choosePalette(item)"><i v-for="color in item.colors.slice(0, 4)" :key="color" :style="{ background: color }"></i><span>{{ item.title }}</span></button></div></div>
    </section>
    <ToolGuide title="数据结构与图表使用说明"><div class="detail-copy">{{ meta.detail }} 默认使用可视表格，可直接编辑或粘贴 Excel / WPS 单元格区域；也支持 CSV、TSV 与 JSON。所有解析和绘制均在当前浏览器完成。PNG 使用 2 倍像素密度导出；复制配置可获得当前 ECharts option。</div></ToolGuide>
  </div>
</template>

<style scoped>
.advanced-page {
  gap: 18px;
  --accent: var(--c-primary);
  --accent-soft:var(--c-primary-100)
}
.chart-family {
  border: 1px solid var(--c-border);
  border-radius: var(--radius-card);
  background: var(--c-surface);
  box-shadow: var(--shadow-card)
}
.eyebrow {
  display: block;
  margin-bottom: 6px;
  color: var(--accent);
  font-size: 12px;
  font-weight: 900;
  letter-spacing:.15em
}
.chart-family {
  display: flex;
  min-height: 58px;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  overflow-x: auto;
  scrollbar-width:none
}
.chart-family::-webkit-scrollbar {
  display:none
}
.chart-family a {
  flex: none;
  padding: 9px 14px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--c-text-body);
  font-size: 13px;
  font-weight: 800;
  text-decoration:none
}
.chart-family a:hover {
  background: var(--c-surface-subtle)
}
.chart-family a.active {
  border-color: color-mix(in srgb,var(--accent),#fff 62%);
  background: var(--accent-soft);
  color:var(--accent)
}
.sample-card {
  display: grid;
  grid-template-columns: minmax(230px,.5fr) minmax(0,1.5fr);
  align-items: center;
  gap: 22px;
  padding:20px 22px
}
.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap:14px
}
.section-heading h3,.card-header h3 {
  margin: 0;
  color: var(--c-text-primary);
  font-size:19px
}
.section-heading p,.card-header p {
  margin: 4px 0 0;
  color: var(--c-text-secondary);
  font-size: 13px;
  line-height:1.55
}
.sample-card>.section-heading {
  display:block
}
.sample-list {
  display: grid;
  grid-template-columns: repeat(3,1fr);
  gap:10px
}
.sample-list button {
  padding: 13px 14px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface-subtle);
  color: var(--c-text-strong);
  text-align: left;
  cursor:pointer
}
.sample-list button.active {
  border-color: var(--accent);
  background: var(--accent-soft);
  box-shadow:0 0 0 2px color-mix(in srgb,var(--accent),transparent 86%)
}
.sample-list span,.sample-list small {
  display:block
}
.sample-list span {
  font-size: 14px;
  font-weight:850
}
.sample-list small {
  margin-top: 4px;
  color: var(--c-text-secondary);
  font-size:12px
}
.workspace-grid {
  display: grid;
  grid-template-columns: minmax(350px,.76fr) minmax(0,1.24fr);
  gap:18px
}
.data-card,.preview-card,.config-card {
  padding:21px 22px
}
.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap:14px
}
.header-actions {
  display: flex;
  flex-wrap: wrap;
  gap:7px
}
.header-actions button,.reset-button {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 11px;
  border: 1px solid #dbe3ef;
  border-radius: var(--radius-sm);
  background: var(--c-surface);
  color: var(--c-text-body);
  font-size: 12px;
  font-weight: 850;
  cursor:pointer
}
.header-actions button.primary {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--c-on-accent)
}
.mode-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  margin-top: 17px;
  padding: 4px;
  border-radius: var(--radius-md);
  background:#f1f5f9
}
.mode-tabs button {
  min-height: 34px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--c-text-secondary);
  font-size: 13px;
  font-weight:800
}
.mode-tabs button.active {
  background: var(--c-surface);
  color: var(--accent);
  box-shadow: var(--shadow-sm)
}
textarea {
  display: block;
  width: 100%;
  height: 286px;
  resize: vertical;
  margin-top: 12px;
  padding: 14px;
  border: 1px solid #dbe3ef;
  border-radius: var(--radius-md);
  outline: 0;
  background: var(--c-surface-subtle);
  color: var(--c-text-primary);
  font:700 13px/1.65 ui-monospace,SFMono-Regular,Consolas,monospace
}
textarea:focus {
  border-color: var(--accent);
  box-shadow:0 0 0 3px color-mix(in srgb,var(--accent),transparent 88%)
}
.format-hint {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 9px;
  color: var(--c-text-secondary);
  font-size: 12px;
  line-height:1.5
}
.format-hint b {
  flex: none;
  color:var(--accent)
}
.validation-box {
  margin-top: 12px;
  padding: 12px 13px;
  border-radius: var(--radius-md);
  background: #fff7ed;
  color: #c2410c;
  font-size: 12px;
  line-height:1.6
}
.validation-box strong {
  display: block;
  font-size:13px
}
.validation-box ul {
  margin: 5px 0 0;
  padding-left:18px
}
.validation-box.success {
  display: flex;
  gap: 9px;
  background: #ecfdf5;
  color:#047857
}
.validation-box.success span {
  color: var(--c-text-secondary)
}
.chart-shell {
  position: relative;
  min-height: 380px;
  margin-top: 13px;
  overflow: hidden;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  background:linear-gradient(180deg,#fff,#f8fafc)
}
.chart-canvas {
  width: 100%;
  height:100%
}
.chart-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--c-text-muted);
  font-size: 14px;
  background:rgba(248,250,252,.84)
}
.preview-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-top: 12px;
  color: var(--c-text-secondary);
  font-size:12px
}
.preview-summary span:first-child {
  margin-right: auto;
  color: #059669;
  font-weight:800
}
.preview-summary i {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 6px;
  border-radius: 50%;
  background: #10b981;
  box-shadow:0 0 0 4px #d1fae5
}
.config-card>.card-header {
  padding-bottom: 17px;
  border-bottom: 1px solid var(--c-border)
}
.config-grid {
  display: grid;
  grid-template-columns: repeat(4,minmax(0,1fr));
  gap: 14px;
  margin-top:18px
}
.field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap:7px
}
.field>span,.palette-section>div:first-child>span {
  color: var(--c-text-body);
  font-size: 13px;
  font-weight:800
}
.field input[type=text],.field input[type=number],.field select {
  width: 100%;
  height: 40px;
  padding: 0 11px;
  border: 1px solid #dbe3ef;
  border-radius: var(--radius-sm);
  outline: 0;
  background: var(--c-surface);
  color: var(--c-text-primary);
  font-size:13px
}
.field input:focus,.field select:focus {
  border-color:var(--accent)
}
.segmented {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  padding: 3px;
  border: 1px solid #dbe3ef;
  border-radius: var(--radius-sm);
  background: var(--c-surface-subtle)
}
.segmented button {
  min-height: 32px;
  padding: 0 8px;
  border: 0;
  border-radius: var(--radius-xs);
  background: transparent;
  color: var(--c-text-secondary);
  font-size: 12px;
  font-weight:800
}
.segmented button.active {
  background: var(--c-surface);
  color: var(--accent);
  box-shadow: var(--shadow-sm)
}
.range {
  width: 100%;
  height: 40px;
  accent-color:var(--accent)
}
.switch-field {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 0 13px;
  border: 1px solid #dbe3ef;
  border-radius:var(--radius-sm)
}
.color-field input {
  width: 100%;
  height: 40px;
  padding: 4px;
  border: 1px solid #dbe3ef;
  border-radius: var(--radius-sm);
  background:var(--c-surface)
}
.palette-section {
  display: grid;
  grid-template-columns: 190px 1fr;
  align-items: center;
  gap: 18px;
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid var(--c-border)
}
.palette-section small {
  display: block;
  margin-top: 4px;
  color: var(--c-text-secondary);
  font-size:12px
}
.palette-list {
  display: flex;
  flex-wrap: wrap;
  gap:9px
}
.palette-list button {
  display: grid;
  grid-template-columns: repeat(4,14px);
  gap: 3px;
  min-height: 52px;
  padding: 8px 10px;
  border: 1px solid #dbe3ef;
  border-radius: var(--radius-sm);
  background: var(--c-surface);
  color: var(--c-text-body)
}
.palette-list button.active {
  border-color: var(--accent);
  box-shadow:0 0 0 2px color-mix(in srgb,var(--accent),transparent 86%)
}
.palette-list i {
  width: 14px;
  height: 14px;
  border-radius:4px
}
.palette-list span {
  grid-column: 1/-1;
  font-size: 12px;
  font-weight:800
}
:global(html.dark .advanced-page .chart-family),:global(html.dark .advanced-page .sample-card),:global(html.dark .advanced-page .data-card),:global(html.dark .advanced-page .preview-card),:global(html.dark .advanced-page .config-card) {
  border-color: var(--c-border);
  background: var(--c-surface);
  box-shadow:none
}
:global(html.dark .advanced-page h3) {
  color:#f8fafc
}
:global(html.dark .advanced-page .chart-family a),:global(html.dark .advanced-page .sample-list button),:global(html.dark .advanced-page .field>span),:global(html.dark .advanced-page .palette-section>div:first-child>span) {
  color: var(--c-text-secondary)
}
:global(html.dark .advanced-page .chart-family a:hover),:global(html.dark .advanced-page .sample-list button),:global(html.dark .advanced-page .mode-tabs),:global(html.dark .advanced-page .segmented) {
  border-color: var(--c-border-strong);
  background:var(--c-surface-subtle)
}
:global(html.dark .advanced-page .chart-family a.active),:global(html.dark .advanced-page .sample-list button.active) {
  border-color: var(--accent);
  background: color-mix(in srgb,var(--accent),#0f172a 76%);
  color: var(--c-on-accent)
}
:global(html.dark .advanced-page .header-actions button),:global(html.dark .advanced-page .reset-button),:global(html.dark .advanced-page .palette-list button),:global(html.dark .advanced-page .field input[type=text]),:global(html.dark .advanced-page .field input[type=number]),:global(html.dark .advanced-page .field select),:global(html.dark .advanced-page .color-field input) {
  border-color: var(--c-border-strong);
  background: var(--c-surface-subtle);
  color: var(--c-text-primary)
}
:global(html.dark .advanced-page .header-actions button.primary) {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--c-on-accent)
}
:global(html.dark .advanced-page .mode-tabs button.active),:global(html.dark .advanced-page .segmented button.active) {
  background: #334155;
  color: var(--c-on-accent)
}
:global(html.dark .advanced-page textarea) {
  border-color: var(--c-border-strong);
  background: var(--c-surface-subtle);
  color: var(--c-text-primary)
}
:global(html.dark .advanced-page .chart-shell) {
  border-color: var(--c-border);
  background:var(--c-surface-subtle)
}
:global(html.dark .advanced-page .config-card>.card-header),:global(html.dark .advanced-page .palette-section) {
  border-color: var(--c-border)
}
:global(html.dark .advanced-page .validation-box.success) {
  background:#12372a
}
:global(html.dark .advanced-page .validation-box.success span) {
  color: var(--c-text-muted)
}
@media(max-width:1180px) {
  .workspace-grid {
    grid-template-columns:1fr
  }
  .config-grid {
    grid-template-columns:repeat(3,minmax(0,1fr))
  }
  .sample-card {
    grid-template-columns:1fr
  }
  .sample-card>.section-heading {
    display:flex
  }
}
@media(max-width:820px) {
  .config-grid {
    grid-template-columns:repeat(2,minmax(0,1fr))
  }
  .palette-section {
    grid-template-columns:1fr
  }
}
@media(max-width:620px) {
  .advanced-page {
    gap:14px
  }
  .sample-card,.data-card,.preview-card,.config-card {
    padding: 15px;
    border-radius:17px
  }
  .sample-card>.section-heading,.card-header {
    flex-direction:column
  }
  .sample-list {
    grid-template-columns:1fr
  }
  .header-actions {
    width:100%
  }
  .header-actions button {
    flex:1
  }
  textarea {
    height:250px
  }
  .format-hint {
    flex-direction:column
  }
  .validation-box.success {
    flex-direction:column
  }
  .chart-shell {
    height:400px!important
  }
  .preview-summary span:first-child {
    width: 100%;
    margin:0
  }
  .config-grid {
    grid-template-columns:1fr
  }
  .reset-button {
    width:100%
  }
  .palette-list {
    display: grid;
    grid-template-columns:1fr 1fr
  }
  .palette-list button {
    width:100%
  }
}
.mode-tabs {
  grid-template-columns:repeat(3,minmax(0,1fr))
}
</style>
