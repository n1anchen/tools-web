<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import 'echarts-wordcloud'
import { ElMessage } from 'element-plus'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import MetricsBar from '@/components/Common/MetricsBar.vue'
import { autoDown, downloadText } from '@/utils/file'
import { analyzeWordFrequency } from '@/utils/textTools'

const sampleText = `在线工具让复杂的工作变得简单。数据分析帮助我们理解趋势，数据可视化帮助我们表达趋势。好的工具应该清晰、快速、可靠，也应该让每一次操作都有明确反馈。设计服务于内容，内容服务于用户。`

const chartEl = ref<HTMLDivElement | null>(null)
const inputText = ref(sampleText)
const customStopWordsText = ref('工具\n应该')
const minLength = ref(1)
const excludeStopWords = ref(true)
const caseSensitive = ref(false)
const maxWords = ref(80)
const colorScheme = ref('ocean')
const shape = ref('circle')
const fontMin = ref(14)
const fontMax = ref(68)
const rotation = ref(45)
const gridSize = ref(8)
const background = ref('#ffffff')
const pixelRatio = ref(3)
const renderedAt = ref('')
let chart: echarts.ECharts | null = null
let renderTimer: ReturnType<typeof setTimeout> | null = null
let resizeObserver: ResizeObserver | null = null

const colorSchemes: Record<string, string[]> = {
  ocean: ['#1d4ed8', '#2563eb', '#0284c7', '#0891b2', '#0f766e', '#7c3aed'],
  sunset: ['#be123c', '#e11d48', '#ea580c', '#f59e0b', '#db2777', '#7c3aed'],
  forest: ['#14532d', '#15803d', '#16a34a', '#0f766e', '#65a30d', '#4d7c0f'],
  candy: ['#ec4899', '#8b5cf6', '#3b82f6', '#14b8a6', '#f97316', '#eab308'],
  mono: ['#0f172a', '#334155', '#475569', '#64748b', '#1e293b'],
}

const shapes = [
  { label: '圆形', value: 'circle', icon: '●' },
  { label: '菱形', value: 'diamond', icon: '◆' },
  { label: '三角', value: 'triangle', icon: '▲' },
  { label: '星形', value: 'star', icon: '★' },
  { label: '心形', value: 'cardioid', icon: '♥' },
]

const backgrounds = [
  { label: '纯白', value: '#ffffff' },
  { label: '纸张灰', value: '#f8fafc' },
  { label: '暖米色', value: '#fffbeb' },
  { label: '深夜', value: '#0f172a' },
  { label: '透明', value: 'transparent' },
]

const customStopWords = computed(() => customStopWordsText.value.split(/[\s,，]+/).map(word => word.trim()).filter(Boolean))
const analysis = computed(() => analyzeWordFrequency(inputText.value, {
  minLength: minLength.value,
  caseSensitive: caseSensitive.value,
  excludeStopWords: excludeStopWords.value,
  customStopWords: customStopWords.value,
}))
const cloudData = computed(() => analysis.value.items.slice(0, maxWords.value).map(item => ({ name: item.word, value: item.count })))
const topWord = computed(() => analysis.value.items[0])
const visibleItems = computed(() => analysis.value.items.slice(0, Math.min(maxWords.value, 30)))
const backgroundStyle = computed(() => background.value === 'transparent'
  ? { backgroundColor: '#fff', backgroundImage: 'linear-gradient(45deg,#f1f5f9 25%,transparent 25%),linear-gradient(-45deg,#f1f5f9 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#f1f5f9 75%),linear-gradient(-45deg,transparent 75%,#f1f5f9 75%)', backgroundSize: '20px 20px', backgroundPosition: '0 0,0 10px,10px -10px,-10px 0' }
  : { backgroundColor: background.value })

function wordHash(word: string) {
  let hash = 0
  for (const char of word) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0
  return hash
}

function renderChart(showMessage = false) {
  if (!chart || !chartEl.value) return
  if (!cloudData.value.length) {
    chart.clear()
    renderedAt.value = ''
    if (showMessage) ElMessage.warning(inputText.value.trim() ? '没有符合筛选条件的词语' : '请先输入文本')
    return
  }
  const palette = colorSchemes[colorScheme.value]
  const minSize = Math.min(fontMin.value, fontMax.value)
  const maxSize = Math.max(fontMin.value, fontMax.value)
  chart.setOption({
    backgroundColor: background.value === 'transparent' ? 'rgba(0,0,0,0)' : background.value,
    animationDuration: 450,
    tooltip: {
      trigger: 'item',
      formatter: (params: { name: string; value: number }) => `${params.name}<br/>出现 ${params.value} 次`,
    },
    aria: { enabled: true, description: `包含 ${cloudData.value.length} 个词语的词云图` },
    series: [{
      type: 'wordCloud',
      shape: shape.value,
      width: '94%',
      height: '92%',
      left: 'center',
      top: 'center',
      sizeRange: [minSize, maxSize],
      rotationRange: rotation.value ? [-rotation.value, rotation.value] : [0, 0],
      rotationStep: 15,
      gridSize: gridSize.value,
      drawOutOfBound: false,
      shrinkToFit: true,
      layoutAnimation: true,
      textStyle: {
        fontFamily: 'Inter, "PingFang SC", "Microsoft YaHei", sans-serif',
        fontWeight: 750,
        color: (params: { name?: string; dataIndex?: number }) => palette[wordHash(params?.name || String(params?.dataIndex ?? 0)) % palette.length],
      },
      emphasis: { focus: 'self', textStyle: { textShadowBlur: 8, textShadowColor: 'rgba(15,23,42,.25)' } },
      data: cloudData.value,
    }],
  }, true)
  renderedAt.value = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  if (showMessage) ElMessage.success(`已生成包含 ${cloudData.value.length} 个词语的词云`)
}

function scheduleRender() {
  if (renderTimer) clearTimeout(renderTimer)
  renderTimer = setTimeout(() => renderChart(false), 260)
}

function downloadImage() {
  if (!chart || !cloudData.value.length) return ElMessage.warning('当前没有可导出的词云')
  autoDown(chart.getDataURL({ type: 'png', pixelRatio: pixelRatio.value, backgroundColor: background.value === 'transparent' ? 'rgba(0,0,0,0)' : background.value }), `wordcloud-${cloudData.value.length}-words.png`)
  ElMessage.success(`已生成 ${pixelRatio.value}× 高清 PNG`)
}

function downloadFrequency() {
  if (!analysis.value.items.length) return ElMessage.warning('当前没有词频数据')
  const rows = ['词语,次数,占比', ...analysis.value.items.map(item => `"${item.word.replace(/"/g, '""')}",${item.count},${item.percentage.toFixed(2)}%`)]
  downloadText(`\uFEFF${rows.join('\r\n')}`, 'word-frequency.csv', 'text/csv;charset=utf-8')
}

function loadSample() {
  inputText.value = sampleText
  customStopWordsText.value = '工具\n应该'
}

function clearText() {
  inputText.value = ''
}

watch([analysis, maxWords, colorScheme, shape, fontMin, fontMax, rotation, gridSize, background], scheduleRender)

onMounted(() => {
  if (!chartEl.value) return
  chart = echarts.init(chartEl.value)
  resizeObserver = new ResizeObserver(() => chart?.resize())
  resizeObserver.observe(chartEl.value)
  renderChart(false)
})

onBeforeUnmount(() => {
  if (renderTimer) clearTimeout(renderTimer)
  resizeObserver?.disconnect()
  chart?.dispose()
  chart = null
})
</script>

<template>
  <div class="wordcloud-page flex flex-col mt-3 flex-1">
    <ToolHero summary="从一段文字，到可解释、可导出的词云">
      <template #metrics>
        <MetricsBar :items="[{ label: '有效词次', value: analysis.totalWords }, { label: '不同词语', value: analysis.uniqueWords }, { label: '词汇多样性', value: (analysis.diversity.toFixed(0)) + '%' }]" />
      </template>
    </ToolHero>

    <section class="studio-grid">
      <div class="control-column">
        <section class="panel input-panel">
          <div class="panel-heading"><div><span class="eyebrow">01 · DATA</span><h3>输入与清洗</h3><p>中文使用浏览器分词能力，英文自动按单词统计。</p></div><div><button type="button" @click="loadSample">载入示例</button><button type="button" @click="clearText">清空</button></div></div>
          <label class="textarea-field"><span>原始文本 <em>{{ inputText.length.toLocaleString() }} 字符</em></span><textarea v-model="inputText" aria-label="词云原始文本" placeholder="粘贴文章、会议纪要、评论或关键词列表"></textarea></label>
          <div class="filter-grid">
            <label><span>最短词长</span><input v-model.number="minLength" type="number" min="1" max="8"></label>
            <label><span>最多展示</span><select v-model.number="maxWords"><option :value="40">40 个</option><option :value="80">80 个</option><option :value="120">120 个</option><option :value="200">200 个</option></select></label>
            <label class="toggle-field"><span>过滤常用停用词</span><el-switch v-model="excludeStopWords" /></label>
            <label class="toggle-field"><span>区分英文大小写</span><el-switch v-model="caseSensitive" /></label>
          </div>
          <label class="stop-field"><span>自定义停用词 <em>{{ customStopWords.length }} 个</em></span><textarea v-model="customStopWordsText" aria-label="自定义停用词" placeholder="每行或逗号分隔，例如：公司、产品"></textarea></label>
        </section>

        <section class="panel settings-panel">
          <div class="panel-heading"><div><span class="eyebrow">02 · STYLE</span><h3>布局与视觉</h3><p>参数修改后约 0.3 秒自动刷新预览。</p></div></div>
          <div class="setting-group"><span>外轮廓</span><div class="shape-grid"><button v-for="item in shapes" :key="item.value" type="button" :class="{ active: shape === item.value }" @click="shape = item.value"><strong>{{ item.icon }}</strong><span>{{ item.label }}</span></button></div></div>
          <div class="setting-group"><span>配色方案</span><div class="palette-grid"><button v-for="(colors, key) in colorSchemes" :key="key" type="button" :class="{ active: colorScheme === key }" :aria-label="`选择 ${key} 配色`" @click="colorScheme = key"><i v-for="color in colors.slice(0, 5)" :key="color" :style="{ backgroundColor: color }"></i></button></div></div>
          <div class="range-grid">
            <label><span>最小字号</span><div><input v-model.number="fontMin" type="range" min="10" max="32"><strong>{{ fontMin }} px</strong></div></label>
            <label><span>最大字号</span><div><input v-model.number="fontMax" type="range" min="36" max="100"><strong>{{ fontMax }} px</strong></div></label>
            <label><span>旋转角度</span><div><input v-model.number="rotation" type="range" min="0" max="90" step="15"><strong>±{{ rotation }}°</strong></div></label>
            <label><span>词间距</span><div><input v-model.number="gridSize" type="range" min="2" max="20" step="2"><strong>{{ gridSize }} px</strong></div></label>
          </div>
          <div class="background-row"><span>画布背景</span><button v-for="item in backgrounds" :key="item.value" type="button" :class="{ active: background === item.value }" @click="background = item.value"><i :style="{ background: item.value === 'transparent' ? 'linear-gradient(135deg,#e2e8f0 50%,#fff 50%)' : item.value }"></i>{{ item.label }}</button></div>
        </section>
      </div>

      <section class="preview-panel">
        <div class="preview-heading"><div><span class="eyebrow">03 · PREVIEW</span><h3>实时词云</h3><p>{{ renderedAt ? `最近更新 ${renderedAt}` : '等待有效词频数据' }} · 当前展示 {{ cloudData.length }} 个词</p></div><button type="button" @click="renderChart(true)">重新布局</button></div>
        <div class="chart-shell" :style="backgroundStyle"><div ref="chartEl" class="chart-canvas" role="img" aria-label="词云图预览"></div><div v-if="!cloudData.length" class="chart-empty"><strong>没有可展示的词语</strong><span>输入文本，或放宽最短词长和停用词条件。</span></div></div>
        <div class="preview-summary"><div><span>最高频词</span><strong>{{ topWord ? `${topWord.word} · ${topWord.count} 次` : '—' }}</strong></div><div><span>画布形状</span><strong>{{ shapes.find(item => item.value === shape)?.label }}</strong></div><div><span>输出清晰度</span><strong>{{ pixelRatio }}× PNG</strong></div></div>
        <div class="export-bar"><label><span>图片倍率</span><select v-model.number="pixelRatio"><option :value="2">2× 标准高清</option><option :value="3">3× 推荐</option><option :value="4">4× 超高清</option></select></label><button type="button" class="secondary" @click="downloadFrequency">导出词频 CSV</button><button type="button" class="primary" @click="downloadImage">下载高清 PNG</button></div>
      </section>
    </section>

    <section class="frequency-card">
      <div class="panel-heading"><div><span class="eyebrow">04 · FREQUENCY</span><h3>词频明细</h3><p>展示前 {{ visibleItems.length }} 个词；导出 CSV 可获得完整结果。</p></div></div>
      <div v-if="visibleItems.length" class="frequency-table"><div class="table-head"><span>排名</span><span>词语</span><span>次数</span><span>占比</span><span>相对热度</span></div><div v-for="(item, index) in visibleItems" :key="item.word" class="table-row"><span>#{{ index + 1 }}</span><strong>{{ item.word }}</strong><span>{{ item.count }}</span><span>{{ item.percentage.toFixed(1) }}%</span><div><i :style="{ width: `${topWord ? Math.max(4, item.count / topWord.count * 100) : 0}%` }"></i></div></div></div>
      <div v-else class="frequency-empty">暂无词频明细</div>
    </section>

    <ToolGuide title="分析规则与导出说明">
      <div class="detail-grid"><article><strong>分词规则</strong><p>优先使用浏览器的 Unicode 分词能力识别中英文词语；英文默认合并大小写，数字可作为词语参与统计。</p></article><article><strong>停用词</strong><p>内置常见中英文虚词，可自行开关；自定义停用词支持换行、空格或中英文逗号分隔。</p></article><article><strong>高清导出</strong><p>PNG 可选择 2–4 倍像素倍率并保留当前背景；透明背景适合后续排版，CSV 包含词语、次数和占比。</p></article></div>
    </ToolGuide>
  </div>
</template>

<style scoped>
.wordcloud-page {
  --accent: var(--c-primary-700);
  gap:18px
}
.panel,.preview-panel,.frequency-card {
  border: 1px solid var(--c-border);
  border-radius: var(--radius-card);
  background: var(--c-surface);
  box-shadow: var(--shadow-card)
}
.eyebrow {
  display: block;
  color: var(--accent);
  font-size: 12px;
  font-weight: 900;
  letter-spacing:.12em
}
.studio-grid {
  display: grid;
  grid-template-columns: minmax(360px,.78fr) minmax(0,1.22fr);
  gap:14px
}
.control-column {
  display: grid;
  gap:14px
}
.panel,.preview-panel,.frequency-card {
  padding:20px
}
.panel-heading,.preview-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap:14px
}
.panel-heading h3,.preview-heading h3 {
  margin: 4px 0 5px;
  color: var(--c-text-primary);
  font-size:18px
}
.panel-heading p,.preview-heading p {
  margin: 0;
  color: var(--c-text-secondary);
  font-size: 12px;
  line-height:1.6
}
.panel-heading>div+div {
  display: flex;
  gap:6px
}
.panel-heading button,.preview-heading>button {
  min-height: 34px;
  padding: 0 11px;
  border: 1px solid var(--c-primary-200);
  border-radius: var(--radius-sm);
  background: var(--c-primary-50);
  color: var(--c-primary-700);
  font-size: 12px;
  font-weight: 850;
  cursor:pointer
}
.textarea-field,.stop-field {
  display: block;
  margin-top:14px
}
.textarea-field>span,.stop-field>span,.setting-group>span,.background-row>span {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--c-text-body);
  font-size: 12px;
  font-weight:850
}
.textarea-field em,.stop-field em {
  color: var(--c-text-muted);
  font-style: normal;
  font-weight:600
}
.textarea-field textarea,.stop-field textarea {
  display: block;
  width: 100%;
  margin-top: 6px;
  padding: 12px;
  border: 1px solid #dbe3ef;
  border-radius: var(--radius-sm);
  outline: 0;
  background: var(--c-surface-subtle);
  color: var(--c-text-strong);
  font-size: 13px;
  line-height: 1.65;
  resize:vertical
}
.textarea-field textarea {
  min-height:170px
}
.stop-field textarea {
  min-height:70px
}
.textarea-field textarea:focus,.stop-field textarea:focus {
  border-color: var(--c-primary-400);
  box-shadow:0 0 0 3px rgba(45,212,191,.13)
}
.filter-grid {
  display: grid;
  grid-template-columns: repeat(2,minmax(0,1fr));
  gap: 8px;
  margin-top:10px
}
.filter-grid>label {
  display: flex;
  min-height: 66px;
  align-items: flex-start;
  justify-content: center;
  flex-direction: column;
  padding: 9px 10px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: var(--c-surface-subtle);
  color: var(--c-text-secondary);
  font-size: 12px;
  font-weight:750
}
.filter-grid input,.filter-grid select {
  width: 100%;
  height: 31px;
  margin-top: 5px;
  padding: 0 8px;
  border: 1px solid #dbe3ef;
  border-radius: var(--radius-xs);
  background: var(--c-surface);
  color: var(--c-text-strong);
  font-size:12px
}
.filter-grid .toggle-field {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items:center
}
.setting-group {
  margin-top:14px
}
.shape-grid {
  display: grid;
  grid-template-columns: repeat(5,1fr);
  gap: 6px;
  margin-top:7px
}
.shape-grid button {
  padding: 8px 4px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: var(--c-surface-subtle);
  color: var(--c-text-secondary);
  cursor:pointer
}
.shape-grid strong,.shape-grid span {
  display:block
}
.shape-grid strong {
  font-size:21px
}
.shape-grid span {
  margin-top: 3px;
  font-size:11px
}
.shape-grid button.active {
  border-color: var(--c-primary-300);
  background: var(--c-primary-50);
  color:var(--c-primary-700)
}
.palette-grid {
  display: grid;
  grid-template-columns: repeat(5,1fr);
  gap: 6px;
  margin-top:7px
}
.palette-grid button {
  display: flex;
  height: 38px;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 5px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: var(--c-surface-subtle);
  cursor:pointer
}
.palette-grid button i {
  width: 14%;
  height: 22px;
  border-radius:3px
}
.palette-grid button.active {
  border-color: var(--c-primary-500);
  box-shadow:0 0 0 2px var(--c-primary-100)
}
.range-grid {
  display: grid;
  grid-template-columns: repeat(2,minmax(0,1fr));
  gap: 8px;
  margin-top:12px
}
.range-grid label {
  padding: 9px 10px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: var(--c-surface-subtle)
}
.range-grid label>span {
  color: var(--c-text-secondary);
  font-size: 12px;
  font-weight:750
}
.range-grid label>div {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top:7px
}
.range-grid input {
  min-width: 0;
  flex: 1;
  accent-color:var(--c-primary-700)
}
.range-grid strong {
  min-width: 50px;
  color: var(--c-primary-700);
  font-size: 11px;
  text-align:right
}
.background-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  overflow-x:auto
}
.background-row>span {
  flex: none;
  margin-right:3px
}
.background-row button {
  display: flex;
  min-width: max-content;
  align-items: center;
  gap: 5px;
  padding: 6px 8px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-xs);
  background: var(--c-surface-subtle);
  color: var(--c-text-secondary);
  font-size: 11px;
  cursor:pointer
}
.background-row button i {
  width: 14px;
  height: 14px;
  border: 1px solid #cbd5e1;
  border-radius:4px
}
.background-row button.active {
  border-color: var(--c-primary-500);
  background: var(--c-primary-50);
  color:var(--c-primary-700)
}
.preview-panel {
  display: flex;
  min-width: 0;
  flex-direction:column
}
.preview-heading>button {
  flex:none
}
.chart-shell {
  position: relative;
  min-height: 520px;
  margin-top: 14px;
  overflow: hidden;
  border: 1px solid #dbe3ef;
  border-radius:var(--radius-lg)
}
.chart-canvas {
  position: absolute;
  inset:0
}
.chart-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  background: rgba(255,255,255,.9);
  text-align:center
}
.chart-empty strong {
  color: var(--c-text-strong);
  font-size:15px
}
.chart-empty span {
  margin-top: 5px;
  color: var(--c-text-secondary);
  font-size:12px
}
.preview-summary {
  display: grid;
  grid-template-columns: repeat(3,1fr);
  gap: 8px;
  margin-top:10px
}
.preview-summary>div {
  padding: 10px 11px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: var(--c-surface-subtle)
}
.preview-summary span,.preview-summary strong {
  display:block
}
.preview-summary span {
  color: var(--c-text-secondary);
  font-size:11px
}
.preview-summary strong {
  overflow: hidden;
  margin-top: 4px;
  color: #1e293b;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space:nowrap
}
.export-bar {
  display: grid;
  grid-template-columns: minmax(145px,1fr) auto auto;
  gap: 8px;
  margin-top: 10px;
  padding: 10px;
  border-radius: var(--radius-md);
  background:var(--c-primary-50)
}
.export-bar label {
  display: flex;
  align-items: center;
  gap:7px
}
.export-bar label span {
  color: var(--c-text-body);
  font-size: 12px;
  font-weight:800
}
.export-bar select {
  height: 34px;
  min-width: 130px;
  padding: 0 7px;
  border: 1px solid var(--c-primary-200);
  border-radius: var(--radius-xs);
  background: var(--c-surface);
  color: var(--c-text-strong);
  font-size:12px
}
.export-bar button {
  min-height: 36px;
  padding: 0 13px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 850;
  cursor:pointer
}
.export-bar .secondary {
  border: 1px solid var(--c-primary-300);
  background: var(--c-surface);
  color:var(--c-primary-700)
}
.export-bar .primary {
  border: 0;
  background: var(--c-primary-700);
  color: var(--c-on-accent)
}
.frequency-card {
  padding:22px
}
.frequency-table {
  margin-top: 15px;
  overflow: hidden;
  border: 1px solid var(--c-border);
  border-radius:var(--radius-md)
}
.table-head,.table-row {
  display: grid;
  grid-template-columns: 70px minmax(120px,1fr) 80px 80px minmax(150px,1fr);
  align-items: center;
  gap: 10px;
  padding:9px 13px
}
.table-head {
  background: #f1f5f9;
  color: var(--c-text-secondary);
  font-size: 11px;
  font-weight:850
}
.table-row {
  min-height: 44px;
  border-top: 1px solid var(--c-border);
  color: var(--c-text-secondary);
  font-size:12px
}
.table-row strong {
  overflow: hidden;
  color: #1e293b;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space:nowrap
}
.table-row>div {
  height: 7px;
  overflow: hidden;
  border-radius: var(--radius-full);
  background:#e2e8f0
}
.table-row i {
  display: block;
  height: 100%;
  border-radius: var(--radius-full);
  background:linear-gradient(90deg,var(--c-primary-500),var(--c-primary-700))
}
.frequency-empty {
  display: flex;
  min-height: 180px;
  align-items: center;
  justify-content: center;
  color: var(--c-text-muted);
  font-size:13px
}
.detail-grid {
  display: grid;
  grid-template-columns: repeat(3,1fr);
  gap:12px
}
.detail-grid article {
  padding: 14px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface-subtle)
}
.detail-grid strong {
  color: var(--c-text-strong);
  font-size:13px
}
.detail-grid p {
  margin: 5px 0 0;
  color: var(--c-text-secondary);
  font-size: 12px;
  line-height:1.7
}
:global(html.dark .panel),:global(html.dark .preview-panel),:global(html.dark .frequency-card) {
  border-color: var(--c-border);
  background: var(--c-surface);
  box-shadow:none
}
:global(html.dark .panel-heading h3),:global(html.dark .preview-heading h3),:global(html.dark .textarea-field>span),:global(html.dark .stop-field>span),:global(html.dark .setting-group>span),:global(html.dark .background-row>span),:global(html.dark .preview-summary strong),:global(html.dark .table-row strong),:global(html.dark .detail-grid strong) {
  color:#f1f5f9
}
:global(html.dark .textarea-field textarea),:global(html.dark .stop-field textarea),:global(html.dark .filter-grid>label),:global(html.dark .shape-grid button),:global(html.dark .palette-grid button),:global(html.dark .range-grid label),:global(html.dark .background-row button),:global(html.dark .preview-summary>div),:global(html.dark .detail-grid article) {
  border-color: var(--c-border);
  background: #172033;
  color: var(--c-text-secondary)
}
:global(html.dark .filter-grid input),:global(html.dark .filter-grid select),:global(html.dark .export-bar select) {
  border-color: var(--c-border-strong);
  background: var(--c-surface-subtle);
  color: var(--c-text-primary)
}
:global(html.dark .shape-grid button.active),:global(html.dark .background-row button.active) {
  border-color: var(--c-primary-700);
  background: #134e4a;
  color:var(--c-primary-200)
}
:global(html.dark .palette-grid button.active) {
  border-color: var(--c-primary-400);
  box-shadow:0 0 0 2px #134e4a
}
:global(html.dark .export-bar) {
  background:#083344
}
:global(html.dark .export-bar .secondary) {
  border-color: var(--c-primary-700);
  background: #172033;
  color:var(--c-primary-300)
}
:global(html.dark .frequency-table),:global(html.dark .table-row) {
  border-color: var(--c-border)
}
:global(html.dark .table-head) {
  background:var(--c-surface-subtle)
}
:global(html.dark .chart-empty) {
  background:rgba(15,23,42,.92)
}
:global(html.dark .chart-empty strong) {
  color:#f1f5f9
}
@media(max-width:1120px) {
  .studio-grid {
    grid-template-columns:1fr
  }
  .chart-shell {
    min-height:500px
  }
}
@media(max-width:720px) {
  .wordcloud-page {
    gap:12px
  }
  .panel,.preview-panel,.frequency-card {
    border-radius:var(--radius-lg)
  }
  .panel,.preview-panel,.frequency-card {
    padding:15px
  }
  .panel-heading,.preview-heading {
    flex-direction:column
  }
  .filter-grid,.range-grid {
    grid-template-columns:1fr 1fr
  }
  .chart-shell {
    min-height:390px
  }
  .preview-summary {
    grid-template-columns:1fr
  }
  .export-bar {
    grid-template-columns:1fr
  }
  .export-bar label {
    justify-content:space-between
  }
  .export-bar select {
    flex:1
  }
  .table-head,.table-row {
    grid-template-columns:50px minmax(100px,1fr) 55px 65px
  }
  .table-head span:last-child,.table-row>div {
    display:none
  }
  .detail-grid {
    grid-template-columns:1fr
  }
}
@media(max-width:430px) {
  .filter-grid,.range-grid {
    grid-template-columns:1fr
  }
  .shape-grid button strong {
    font-size:18px
  }
  .shape-grid button span {
    font-size:10px
  }
  .chart-shell {
    min-height:330px
  }
}
</style>
