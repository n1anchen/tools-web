<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { CopyDocument, Download, Loading, Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { copyImageToClipboard } from '@/utils/clipboard'
import debounce from 'lodash/debounce'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import MetricsBar from '@/components/Common/MetricsBar.vue'
import { autoDown } from '@/utils/file'
import { buildLogoFilename } from '@/utils/logoStudio'
import { loadFontStylesheet, ensureFontsLoaded } from '@/utils/font'
import { LogoCanvas } from './canvas'
import { loadImages } from './utils'

const presets = [
  { label: '经典标题', note: 'Blue / Archive', left: 'Blue', right: 'Archive' },
  { label: '工具箱', note: 'Tools / Web', left: 'Tools', right: 'Web' },
  { label: '老师社团', note: 'Sensei / Club', left: 'Sensei', right: 'Club' },
  { label: '青春档案', note: '中文双栏', left: '青春', right: '档案' },
]
const shapeOptions = [
  { label: '自适应', value: 'auto' },
  { label: '方形', value: 'square' },
  { label: '圆形', value: 'circle' },
]
const scaleOptions = [
  { label: '1×', value: 1 },
  { label: '2×', value: 2 },
  { label: '3×', value: 3 },
]

const canvasRef = ref<HTMLCanvasElement | null>(null)
const state = reactive({
  textL: 'Blue',
  textR: 'Archive',
  transparent: false,
  bgShape: 'auto' as 'auto' | 'square' | 'circle',
  graphX: -15,
  graphY: 0,
  scale: 2,
  loading: true,
  exporting: false,
  status: '正在载入字体与图形资源',
  error: '',
})
const dimensions = reactive({ width: 900, height: 250 })
let logoCanvas: LogoCanvas | null = null
let renderId = 0

const textLength = computed(() => Array.from(`${state.textL}${state.textR}`).length)
const backgroundLabel = computed(() => state.transparent ? '透明背景' : '白色背景')
const shapeLabel = computed(() => ({ auto: '自适应横幅', square: '正方形画布', circle: '圆形画布' })[state.bgShape])

function syncDimensions() {
  if (!logoCanvas) return
  const next = logoCanvas.getOutputDimensions(state.scale)
  dimensions.width = next.width
  dimensions.height = next.height
}

async function renderCanvas() {
  if (!logoCanvas) return
  const currentId = ++renderId
  state.loading = true
  state.error = ''
  state.status = '正在重绘标题…'
  logoCanvas.textL = state.textL.trim() || ' '
  logoCanvas.textR = state.textR.trim() || ' '
  logoCanvas.transparentBg = state.transparent
  logoCanvas.bgShape = state.bgShape
  logoCanvas.graphOffset.X = state.graphX
  logoCanvas.graphOffset.Y = state.graphY
  try {
    await logoCanvas.draw()
    if (currentId !== renderId) return
    syncDimensions()
    state.status = '预览已更新，可复制或下载'
  } catch (error) {
    if (currentId !== renderId) return
    state.error = error instanceof Error ? error.message : '预览生成失败'
    state.status = '渲染失败，请重试'
  } finally {
    if (currentId === renderId) state.loading = false
  }
}

const scheduleRender = debounce(renderCanvas, 180)

function applyPreset(preset: typeof presets[number]) {
  state.textL = preset.left
  state.textR = preset.right
  scheduleRender.flush()
}

function resetStudio() {
  Object.assign(state, { textL: 'Blue', textR: 'Archive', transparent: false, bgShape: 'auto', graphX: -15, graphY: 0, scale: 2 })
  renderCanvas()
}

function resetHalo() {
  state.graphX = -15
  state.graphY = 0
}

async function exportBlob() {
  if (!logoCanvas) throw new Error('画布尚未准备完成')
  return logoCanvas.generateImg(state.scale)
}

async function downloadImage() {
  if (state.loading || state.exporting) return
  state.exporting = true
  try {
    const blob = await exportBlob()
    const url = URL.createObjectURL(blob)
    autoDown(url, buildLogoFilename([state.textL, state.textR], 'blue-style'))
    ElMessage.success(`已导出 ${dimensions.width} × ${dimensions.height} PNG`)
  } catch {
    ElMessage.error('图片保存失败，请稍后重试')
  } finally {
    state.exporting = false
  }
}

async function copyImage() {
  if (state.loading || state.exporting) return
  state.exporting = true
  try {
    const blob = await exportBlob()
    await copyImageToClipboard(blob, "PNG 图片")
  } finally {
    state.exporting = false
  }
}

watch(() => [state.textL, state.textR, state.transparent, state.bgShape, state.graphX, state.graphY], scheduleRender)
watch(() => state.scale, syncDimensions)

onMounted(async () => {
  try {
    const existingFace = [...document.fonts].find(face => face.family === 'RoGSans')
    const rogsansReady = existingFace
      ? (existingFace.status === 'loaded' ? Promise.resolve(existingFace) : existingFace.load())
      : (() => {
          const face = new FontFace('RoGSans', 'url(/fonts/bluearchive/RoGSans.woff2)', { weight: '900', style: 'normal', unicodeRange: 'U+0-7F' })
          document.fonts.add(face)
          return face.load()
        })()

    const [, , { halo, cross }] = await Promise.all([
      rogsansReady.catch(() => undefined),
      loadFontStylesheet('font-noto-sans', 'https://fonts.loli.net/css?family=Noto+Sans+SC:900'),
      loadImages('/images/bluearchive/halo.png', '/images/bluearchive/cross.png'),
    ])
    await ensureFontsLoaded([{ font: '900 84px "Noto Sans SC"', text: '青春档案' }])
    if (!canvasRef.value) throw new Error('画布初始化失败')
    logoCanvas = new LogoCanvas(canvasRef.value, halo, cross)
    await renderCanvas()
  } catch (error) {
    state.error = error instanceof Error ? error.message : '资源加载失败'
    state.status = '资源加载失败，请刷新重试'
    state.loading = false
  }
})

onUnmounted(() => {
  renderId += 1
  scheduleRender.cancel()
})
</script>

<template>
  <div class="blue-logo-page flex flex-col mt-3 flex-1">
    <ToolHero summary="拆分文字，组合一枚清透标题">
      <template #metrics>
        <MetricsBar :items="[{ label: '导出宽度', value: dimensions.width }, { label: '导出高度', value: dimensions.height }, { label: '清晰倍率', value: (state.scale) + '×' }]" />
      </template>
    </ToolHero>

    <section class="preview-card">
      <header class="preview-heading">
        <div><span class="eyebrow">LIVE CANVAS</span><h3>最终效果预览</h3><p>{{ state.status }}</p></div>
        <div class="export-actions"><button type="button" aria-label="复制蔚蓝风格 PNG" :disabled="state.loading || state.exporting" @click="copyImage"><el-icon><CopyDocument /></el-icon>复制 PNG</button><button type="button" class="primary" aria-label="下载蔚蓝风格 PNG" :disabled="state.loading || state.exporting" @click="downloadImage"><el-icon><Download /></el-icon>下载图片</button></div>
      </header>
      <div class="canvas-stage">
        <canvas ref="canvasRef" width="900" height="250" role="img" aria-label="蔚蓝风格标题预览" />
        <div v-if="state.loading" class="loading-overlay"><el-icon class="is-loading"><Loading /></el-icon><span>{{ state.status }}</span></div>
        <div v-else-if="state.error" class="loading-overlay error"><span>{{ state.error }}</span><button type="button" @click="renderCanvas">重新渲染</button></div>
      </div>
      <div class="preview-meta"><span>{{ shapeLabel }}</span><span>{{ backgroundLabel }}</span><span>{{ dimensions.width }} × {{ dimensions.height }} px</span><span>PNG · 本地生成</span></div>
    </section>

    <div class="workspace-grid">
      <section class="control-card">
        <header class="card-heading"><div><span class="eyebrow">TITLE CONTENT</span><h3>文字与场景</h3></div><span>{{ textLength }} 个字符</span></header>
        <div class="text-grid"><label><span>左侧蓝字</span><el-input v-model="state.textL" maxlength="18" aria-label="左侧蓝色文字" /></label><label><span>右侧深色字</span><el-input v-model="state.textR" maxlength="18" aria-label="右侧深色文字" /></label></div>
        <div class="preset-section"><span>标题预设</span><div><button v-for="preset in presets" :key="preset.label" type="button" @click="applyPreset(preset)"><strong>{{ preset.label }}</strong><small>{{ preset.note }}</small></button></div></div>

        <label class="option-field"><span>画布形状</span><el-radio-group v-model="state.bgShape"><el-radio-button v-for="item in shapeOptions" :key="item.value" :value="item.value">{{ item.label }}</el-radio-button></el-radio-group></label>
        <div class="background-row"><div><strong>透明背景</strong><span>适合叠加到海报、视频或头像中</span></div><el-switch v-model="state.transparent" aria-label="切换透明背景" /></div>
      </section>

      <aside class="export-card">
        <header class="card-heading"><div><span class="eyebrow">HALO & EXPORT</span><h3>光环与导出</h3></div><button type="button" aria-label="恢复默认设置" @click="resetStudio"><el-icon><Refresh /></el-icon>重置</button></header>
        <div class="slider-setting"><label><span>光环水平位置</span><strong>X {{ state.graphX }}</strong></label><el-slider v-model="state.graphX" :min="-120" :max="120" /></div>
        <div class="slider-setting"><label><span>光环垂直位置</span><strong>Y {{ state.graphY }}</strong></label><el-slider v-model="state.graphY" :min="-80" :max="80" /></div>
        <button type="button" class="halo-reset" @click="resetHalo">光环回到默认位置</button>

        <label class="resolution-field"><span>导出清晰度</span><el-radio-group v-model="state.scale"><el-radio-button v-for="item in scaleOptions" :key="item.value" :value="item.value">{{ item.label }}</el-radio-button></el-radio-group></label>
        <div class="dimension-summary"><span>最终 PNG</span><strong>{{ dimensions.width }} × {{ dimensions.height }}</strong><small>{{ state.scale === 1 ? '适合网页与聊天' : state.scale === 2 ? '适合高清分享' : '适合大尺寸排版' }}</small></div>
      </aside>
    </div>

    <ToolGuide title="使用与版权说明">
      <el-text>本工具用于生成受《蔚蓝档案》标题视觉语言启发的同人风格图片，并非官方工具。自适应画布会裁切多余留白，方形和圆形适合作为头像底图；透明背景仅保留文字、描边与图形。导出倍率只影响 PNG 像素尺寸，不改变预览构图。商用前请自行确认文字、作品与相关标识的使用权限。</el-text>
    </ToolGuide>
  </div>
</template>

<style scoped>
.blue-logo-page {
  --accent: #0ea5e9;
  --deep: #0369a1;
  --soft: #f0f9ff;
  gap:16px
}
.preview-card,.control-card,.export-card {
  border: 1px solid var(--c-primary-100);
  border-radius: var(--radius-card);
  background: var(--c-surface);
  box-shadow:0 16px 40px rgba(14,116,144,.07)
}
.eyebrow {
  display: block;
  margin-bottom: 6px;
  color: var(--accent);
  font-size: 10px;
  font-weight: 900;
  letter-spacing:.16em
}
.preview-card {
  padding:21px
}
.preview-heading,.card-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap:12px
}
.preview-heading {
  margin-bottom:14px
}
.preview-heading h3,.card-heading h3 {
  margin: 0;
  color: var(--c-text-primary);
  font-size:19px
}
.preview-heading p {
  margin: 3px 0 0;
  color: var(--c-text-muted);
  font-size:10px
}
.export-actions {
  display: flex;
  gap:7px
}
.export-actions button,.card-heading>button {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 10px;
  border: 1px solid #cbd5e1;
  border-radius: var(--radius-sm);
  color: var(--c-text-body);
  background: var(--c-surface);
  cursor: pointer;
  font-size:10px
}
.export-actions button.primary {
  border-color: var(--accent);
  color: var(--c-on-accent);
  background:var(--accent)
}
.export-actions button:disabled {
  opacity: .4;
  cursor:not-allowed
}
.canvas-stage {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 280px;
  padding: 28px;
  border-radius: 17px;
  overflow: auto;
  background-color: var(--c-surface-subtle);
  background-image: linear-gradient(45deg,#e2e8f0 25%,transparent 25%,transparent 75%,#e2e8f0 75%),linear-gradient(45deg,#e2e8f0 25%,transparent 25%,transparent 75%,#e2e8f0 75%);
  background-position: 0 0,12px 12px;
  background-size:24px 24px
}
.canvas-stage canvas {
  display: block;
  max-width: 100%;
  height: auto;
  filter:drop-shadow(0 10px 24px rgba(14,116,144,.12))
}
.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  color: var(--deep);
  background: rgba(248,250,252,.75);
  backdrop-filter: blur(4px);
  font-size:11px
}
.loading-overlay>.el-icon {
  font-size:25px
}
.loading-overlay.error {
  flex-direction: column;
  color:#be123c
}
.loading-overlay button {
  padding: 6px 9px;
  border: 0;
  border-radius: var(--radius-xs);
  color: var(--c-on-accent);
  background: #e11d48;
  cursor:pointer
}
.preview-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top:11px
}
.preview-meta span {
  padding: 5px 8px;
  border-radius: var(--radius-full);
  color: var(--c-text-secondary);
  background: #f1f5f9;
  font-size:9px
}
.workspace-grid {
  display: grid;
  grid-template-columns: minmax(0,1.12fr) minmax(340px,.78fr);
  gap: 16px;
  align-items:start
}
.control-card,.export-card {
  padding:21px
}
.card-heading {
  margin-bottom:17px
}
.card-heading>span {
  padding: 5px 8px;
  border-radius: var(--radius-full);
  color: var(--deep);
  background: var(--soft);
  font-size:9px
}
.card-heading>button {
  padding:6px 8px
}
.text-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap:10px
}
.text-grid label>span,.option-field>span,.resolution-field>span {
  display: block;
  margin-bottom: 7px;
  color: var(--c-text-secondary);
  font-size:10px
}
.preset-section {
  margin-top:15px
}
.preset-section>span {
  display: block;
  margin-bottom: 7px;
  color: var(--c-text-secondary);
  font-size:10px
}
.preset-section>div {
  display: grid;
  grid-template-columns: repeat(4,1fr);
  gap:6px
}
.preset-section button {
  padding: 9px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  color: var(--c-text-secondary);
  background: var(--c-surface-subtle);
  text-align: left;
  cursor:pointer
}
.preset-section strong,.preset-section small {
  display:block
}
.preset-section strong {
  color: var(--c-text-strong);
  font-size:10px
}
.preset-section small {
  margin-top: 3px;
  color: var(--c-text-muted);
  font-size:8px
}
.option-field,.resolution-field {
  display: block;
  margin-top:16px
}
.option-field :deep(.el-radio-group),
.resolution-field :deep(.el-radio-group) {
  width: 100%;
}
.option-field :deep(.el-radio-button),
.resolution-field :deep(.el-radio-button) {
  flex: 1;
}
.option-field :deep(.el-radio-button__inner),
.resolution-field :deep(.el-radio-button__inner) {
  width: 100%;
}
.background-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 13px;
  padding: 11px 12px;
  border-radius: var(--radius-md);
  background: var(--c-surface-subtle)
}
.background-row strong,.background-row span {
  display:block
}
.background-row strong {
  color: var(--c-text-strong);
  font-size:11px
}
.background-row span {
  margin-top: 2px;
  color: var(--c-text-muted);
  font-size:9px
}
.slider-setting {
  margin-top:13px
}
.slider-setting label {
  display: flex;
  justify-content: space-between;
  margin-bottom: 7px;
  color: var(--c-text-secondary);
  font-size:10px
}
.slider-setting strong {
  color:var(--deep)
}
.slider-setting :deep(.el-slider) {
  padding:0 8px
}
.halo-reset {
  width: 100%;
  padding: 7px;
  border: 1px dashed #bae6fd;
  border-radius: var(--radius-sm);
  color: var(--deep);
  background: var(--soft);
  cursor: pointer;
  font-size:9px
}
.dimension-summary {
  margin-top: 14px;
  padding: 15px;
  border-radius: var(--radius-md);
  color: var(--c-on-accent);
  background:linear-gradient(135deg,#075985,#0284c7)
}
.dimension-summary span,.dimension-summary strong,.dimension-summary small {
  display:block
}
.dimension-summary span {
  color: #bae6fd;
  font-size:9px
}
.dimension-summary strong {
  margin-top: 5px;
  font-size:22px
}
.dimension-summary small {
  margin-top: 4px;
  color: #e0f2fe;
  font-size:9px
}
:global(html.dark .blue-logo-page .preview-card),:global(html.dark .blue-logo-page .control-card),:global(html.dark .blue-logo-page .export-card) {
  border-color: var(--c-border);
  background: var(--c-surface);
  box-shadow:none
}
:global(html.dark .blue-logo-page .preview-heading h3),:global(html.dark .blue-logo-page .card-heading h3),:global(html.dark .blue-logo-page .preset-section strong),:global(html.dark .blue-logo-page .background-row strong) {
  color:#f8fafc
}
:global(html.dark .blue-logo-page .canvas-stage) {
  background-color: var(--c-surface-subtle);
  background-image:linear-gradient(45deg,#1e293b 25%,transparent 25%,transparent 75%,#1e293b 75%),linear-gradient(45deg,#1e293b 25%,transparent 25%,transparent 75%,#1e293b 75%)
}
:global(html.dark .blue-logo-page .loading-overlay) {
  background:rgba(15,23,42,.8)
}
:global(html.dark .blue-logo-page .export-actions button),:global(html.dark .blue-logo-page .card-heading>button),:global(html.dark .blue-logo-page .preset-section button),:global(html.dark .blue-logo-page .background-row) {
  border-color: var(--c-border);
  color: var(--c-text-secondary);
  background:var(--c-surface-subtle)
}
:global(html.dark .blue-logo-page .preview-meta span) {
  color: var(--c-text-secondary);
  background:var(--c-surface-subtle)
}
.canvas-stage canvas {
  max-height:520px
}
@media(max-width:980px) {
  .workspace-grid {
    grid-template-columns:1fr
  }
  .canvas-stage {
    min-height:240px
  }
}
@media(max-width:650px) {
  .blue-logo-page {
    gap:12px
  }
  .preview-card,.control-card,.export-card {
    padding:15px
  }
  .preview-heading {
    align-items: flex-start;
    flex-direction:column
  }
  .export-actions {
    width:100%
  }
  .export-actions button {
    flex: 1;
    justify-content:center
  }
  .canvas-stage {
    min-height: 190px;
    padding:14px
  }
  .text-grid {
    grid-template-columns:1fr
  }
  .preset-section>div {
    grid-template-columns:1fr 1fr
  }
  .card-heading {
    align-items:flex-start
  }
}
</style>
