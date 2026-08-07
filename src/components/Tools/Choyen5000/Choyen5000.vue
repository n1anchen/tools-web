<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { CopyDocument, Download, Loading, Refresh, Rank } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { copyImageToClipboard } from '@/utils/clipboard'
import debounce from 'lodash/debounce'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import MetricsBar from '@/components/Common/MetricsBar.vue'
import { autoDown } from '@/utils/file'
import { buildChoyenFilename, Drawer } from './choyen'
import { loadFontStylesheet, ensureFontsLoaded } from '@/utils/font'

const textPresets = [
  { label: '经典愿望', note: '5000兆円 / 欲しい!', top: '5000兆円', bottom: '欲しい!' },
  { label: '马上下班', note: '定時退勤 / したい!', top: '定時退勤', bottom: 'したい!' },
  { label: '灵感爆发', note: '無限創意 / 降ってこい!', top: '無限創意', bottom: '降ってこい!' },
  { label: '中文梗图', note: '五千万元 / 我想要!', top: '五千万元', bottom: '我想要!' },
]
const textTypeOptions = [
  { label: '自定义文字', value: 'text' },
  { label: '经典原图', value: 'image' },
]
const backgroundOptions = [
  { label: '白色', value: 'white' },
  { label: '透明', value: 'transparent' },
]
const scaleOptions = [
  { label: '1×', value: 1 },
  { label: '2×', value: 2 },
  { label: '3×', value: 3 },
]

const canvasRef = ref<HTMLCanvasElement | null>(null)
const state = reactive({
  topText: '5000兆円',
  bottomText: '欲しい!',
  textType: 'text' as 'text' | 'image',
  bgColor: 'white' as 'white' | 'transparent',
  bottomPosition: 250,
  scale: 2,
  loading: true,
  exporting: false,
  status: '正在载入标题字体',
  error: '',
})
const baseDimensions = reactive({ width: 760, height: 290 })
let drawer: Drawer | null = null
let renderId = 0

const exportDimensions = computed(() => ({
  width: baseDimensions.width * state.scale,
  height: baseDimensions.height * state.scale,
}))
const totalCharacters = computed(() => [...state.topText, ...state.bottomText].length)
const backgroundLabel = computed(() => state.bgColor === 'transparent' ? '透明背景' : '白色背景')
const bottomModeLabel = computed(() => state.textType === 'image' ? '经典原图' : '自定义银字')

async function renderCanvas() {
  if (!drawer) return
  const currentId = ++renderId
  state.loading = true
  state.error = ''
  state.status = '正在重绘金属描边…'

  try {
    const textContent = `${state.topText}${state.bottomText}` || '5000兆円欲しい!'
    await Promise.all([
      document.fonts.load(`900 100px "Noto Sans SC"`, textContent),
      document.fonts.load(`900 100px "Noto Serif SC"`, textContent),
    ])
    if (state.textType === 'image' && !drawer.bottomText.img.complete) {
      await drawer.bottomText.img.decode().catch(() => undefined)
    }
    if (currentId !== renderId) return

    drawer.useTransparent = state.bgColor === 'transparent'
    drawer.bottomText.useImg = state.textType === 'image'
    drawer.topText.value = state.topText || ' '
    drawer.bottomText.value = (state.bottomText || ' ').replace(/！/g, '!')
    drawer.bottomText.x = state.bottomPosition
    drawer.refresh()

    let bounds = drawer.getOutputBounds()
    drawer.resize(bounds.width, bounds.height)
    drawer.refresh()
    bounds = drawer.getOutputBounds()
    baseDimensions.width = bounds.width
    baseDimensions.height = bounds.height
    state.status = '预览已更新，银色标题可在画布上横向拖动'
  } catch (error) {
    if (currentId !== renderId) return
    state.error = error instanceof Error ? error.message : '画布生成失败'
    state.status = '生成失败，请重新尝试'
  } finally {
    if (currentId === renderId) state.loading = false
  }
}

const scheduleRender = debounce(renderCanvas, 150)

function applyPreset(preset: typeof textPresets[number]) {
  state.topText = preset.top
  state.bottomText = preset.bottom
  state.textType = 'text'
  state.bottomPosition = 250
}

function resetStudio() {
  Object.assign(state, {
    topText: '5000兆円', bottomText: '欲しい!', textType: 'text', bgColor: 'white',
    bottomPosition: 250, scale: 2,
  })
  renderCanvas()
}

function resetPosition() {
  state.bottomPosition = 250
}

function createPngBlob(): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (!drawer) {
      reject(new Error('画布尚未准备完成'))
      return
    }
    drawer.createOutputCanvas(state.scale).toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('PNG 编码失败'))
    }, 'image/png')
  })
}

async function downloadImage() {
  if (state.loading || state.exporting) return
  state.exporting = true
  try {
    const blob = await createPngBlob()
    const url = URL.createObjectURL(blob)
    autoDown(url, buildChoyenFilename(state.topText, state.textType === 'image' ? '欲しい' : state.bottomText))
    ElMessage.success(`已导出 ${exportDimensions.value.width} × ${exportDimensions.value.height} PNG`)
  } catch {
    ElMessage.error('图片下载失败，请稍后重试')
  } finally {
    state.exporting = false
  }
}

async function copyImage() {
  if (state.loading || state.exporting) return
  state.exporting = true
  try {
    const blob = await createPngBlob()
    await copyImageToClipboard(blob, "PNG 图片")
  } finally {
    state.exporting = false
  }
}

watch(() => [
  state.topText, state.bottomText, state.textType, state.bgColor, state.bottomPosition,
], scheduleRender)

onMounted(async () => {
  if (!canvasRef.value) return
  drawer = new Drawer(canvasRef.value)
  drawer.lang = 'cn'
  drawer.onPositionChange = (x) => {
    state.bottomPosition = x
    const bounds = drawer?.getOutputBounds()
    if (bounds) Object.assign(baseDimensions, bounds)
  }

  try {
    await Promise.all([
      loadFontStylesheet('font-noto-sans', 'https://fonts.loli.net/css?family=Noto+Sans+SC:900'),
      loadFontStylesheet('font-noto-serif', 'https://fonts.loli.net/css?family=Noto+Serif+SC:900'),
    ])
    await ensureFontsLoaded([
      { font: '900 100px "Noto Sans SC"', text: '5000兆円五千万元' },
      { font: '900 100px "Noto Serif SC"', text: '欲しい我想要' },
    ])
  } catch {
    // The renderer has system sans/serif fallbacks when the remote font is unavailable.
  }
  await renderCanvas()
})

onUnmounted(() => {
  renderId += 1
  scheduleRender.cancel()
  if (drawer) drawer.onPositionChange = null
  document.body.style.cursor = 'auto'
})
</script>

<template>
  <div class="choyen-page flex flex-col mt-3 flex-1">
    <ToolHero summary="把一句愿望，做成冲出画面的标题">
      <template #metrics>
        <MetricsBar :items="[{ label: '导出宽度', value: exportDimensions.width }, { label: '导出高度', value: exportDimensions.height }, { label: '清晰倍率', value: (state.scale) + '×' }]" />
      </template>
    </ToolHero>

    <section class="preview-card">
      <header class="preview-heading">
        <div>
          <span class="eyebrow">LIVE IMPACT PREVIEW</span>
          <h3>最终效果预览</h3>
          <p>{{ state.status }}</p>
        </div>
        <div class="export-actions">
          <button type="button" aria-label="复制金属冲击标题 PNG" :disabled="state.loading || state.exporting" @click="copyImage">
            <el-icon><CopyDocument /></el-icon>复制 PNG
          </button>
          <button type="button" class="primary" aria-label="下载金属冲击标题 PNG" :disabled="state.loading || state.exporting" @click="downloadImage">
            <el-icon><Download /></el-icon>下载图片
          </button>
        </div>
      </header>
      <div class="canvas-stage" :class="{ transparent: state.bgColor === 'transparent' }">
        <canvas ref="canvasRef" width="1500" height="290" role="img" aria-label="金属冲击标题预览" />
        <div v-if="state.loading" class="loading-overlay"><el-icon class="is-loading"><Loading /></el-icon><span>{{ state.status }}</span></div>
        <div v-else-if="state.error" class="loading-overlay error"><span>{{ state.error }}</span><button type="button" @click="renderCanvas">重新渲染</button></div>
        <div class="drag-hint"><el-icon><Rank /></el-icon>拖动下排标题调整位置</div>
      </div>
      <div class="preview-meta">
        <span>{{ bottomModeLabel }}</span><span>{{ backgroundLabel }}</span>
        <span>{{ exportDimensions.width }} × {{ exportDimensions.height }} px</span><span>PNG · 本地生成</span>
      </div>
    </section>

    <div class="workspace-grid">
      <section class="control-card">
        <header class="card-heading">
          <div><span class="eyebrow">TITLE COMPOSITION</span><h3>文字与构图</h3></div>
          <button type="button" aria-label="恢复金属标题默认设置" @click="resetStudio"><el-icon><Refresh /></el-icon>重置</button>
        </header>

        <div class="text-grid">
          <label><span>红金主标题</span><el-input v-model="state.topText" maxlength="16" show-word-limit aria-label="红金主标题" /></label>
          <label><span>银色副标题</span><el-input v-model="state.bottomText" maxlength="16" show-word-limit aria-label="银色副标题" :disabled="state.textType === 'image'" /></label>
        </div>

        <div class="preset-block">
          <span>场景预设</span>
          <div class="preset-grid">
            <button v-for="preset in textPresets" :key="preset.label" type="button" @click="applyPreset(preset)">
              <strong>{{ preset.label }}</strong><small>{{ preset.note }}</small>
            </button>
          </div>
        </div>

        <label class="option-field"><span>副标题来源</span><el-radio-group v-model="state.textType"><el-radio-button v-for="item in textTypeOptions" :key="item.value" :value="item.value">{{ item.label }}</el-radio-button></el-radio-group></label>
        <label class="option-field"><span>图片背景</span><el-radio-group v-model="state.bgColor"><el-radio-button v-for="item in backgroundOptions" :key="item.value" :value="item.value">{{ item.label }}</el-radio-button></el-radio-group></label>

        <div class="slider-setting">
          <label><span>副标题水平位置</span><strong>X {{ state.bottomPosition }}</strong></label>
          <el-slider v-model="state.bottomPosition" :min="40" :max="1000" :step="5" aria-label="副标题水平位置" />
        </div>
        <button type="button" class="soft-action" @click="resetPosition">副标题回到推荐位置</button>
      </section>

      <aside class="export-card">
        <header class="card-heading"><div><span class="eyebrow">EXPORT CONTROL</span><h3>成品与导出</h3></div></header>
        <div class="summary-list">
          <div><span>文字总数</span><strong>{{ totalCharacters }} 个</strong></div>
          <div><span>基础画布</span><strong>{{ baseDimensions.width }} × {{ baseDimensions.height }}</strong></div>
          <div><span>副标题位置</span><strong>X {{ state.bottomPosition }}</strong></div>
        </div>
        <label class="option-field"><span>导出清晰度</span><el-radio-group v-model="state.scale"><el-radio-button v-for="item in scaleOptions" :key="item.value" :value="item.value">{{ item.label }}</el-radio-button></el-radio-group></label>
        <div class="export-summary">
          <span>最终 PNG</span><strong>{{ exportDimensions.width }} × {{ exportDimensions.height }}</strong><small>{{ state.scale === 1 ? '适合即时分享' : state.scale === 2 ? '适合高清发布' : '适合后期排版' }}</small>
        </div>
        <div class="privacy-note"><strong>画布本地生成</strong><span>文字与生成图片不会上传到服务器。</span></div>
      </aside>
    </div>

    <ToolGuide title="使用与版权说明">
      <div class="detail-copy">
        本工具用于生成受“5000 兆円欲しい!”网络标题视觉启发的同人风格图片，并非原项目官方工具。下排标题既可用滑块精确定位，也可直接在画布上左右拖动；透明背景适合叠加到视频、海报或聊天图片中。经典原图模式会保留原始日文副标题，自定义模式则使用本地字体绘制。公开或商用前，请自行确认文字、素材与相关作品标识的使用权限。
        <a href="https://github.com/yurafuca/5000choyen" target="_blank" rel="noreferrer">参考项目：yurafuca/5000choyen</a>
      </div>
    </ToolGuide>
  </div>
</template>

<style scoped>
.choyen-page {
  --accent: #ef4444;
  --accent-deep: #991b1b;
  --gold: #f59e0b;
  gap:18px
}
.preview-card,.control-card,.export-card {
  border: 1px solid var(--c-border);
  border-radius: var(--radius-card);
  background: var(--c-surface);
  box-shadow: var(--shadow-card)
}
.eyebrow {
  display: block;
  margin-bottom: 8px;
  color: #fbbf24;
  font-size: 11px;
  font-weight: 900;
  letter-spacing:.17em
}
.preview-card {
  padding:20px
}
.preview-heading,.card-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap:18px
}
.preview-heading h3,.card-heading h3 {
  margin: 0;
  color: var(--c-text-primary);
  font-size:20px
}
.preview-heading p {
  margin: 5px 0 0;
  color: var(--c-text-secondary);
  font-size:13px
}
.export-actions {
  display: flex;
  gap:10px
}
.export-actions button,.card-heading>button,.soft-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid #dbe3ef;
  border-radius: var(--radius-sm);
  background: var(--c-surface);
  color: var(--c-text-body);
  min-height: 38px;
  padding: 0 14px;
  font-weight: 700;
  cursor:pointer
}
.export-actions button.primary {
  border-color: #dc2626;
  background: #dc2626;
  color: var(--c-on-accent)
}
.export-actions button:disabled {
  cursor: not-allowed;
  opacity:.55
}
.canvas-stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  min-height: 210px;
  margin-top: 18px;
  padding: 18px;
  overflow: auto;
  border-radius: var(--radius-lg);
  background: var(--c-surface-subtle)
}
.canvas-stage.transparent {
  background-color: var(--c-surface-subtle);
  background-image: linear-gradient(45deg,#e2e8f0 25%,transparent 25%),linear-gradient(-45deg,#e2e8f0 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e2e8f0 75%),linear-gradient(-45deg,transparent 75%,#e2e8f0 75%);
  background-position: 0 0,0 10px,10px -10px,-10px 0;
  background-size:20px 20px
}
.canvas-stage canvas {
  display: block;
  width: auto;
  max-width: none;
  height: 210px;
  touch-action:none
}
.drag-hint {
  position: sticky;
  right: 8px;
  bottom: 8px;
  align-self: flex-end;
  display: flex;
  align-items: center;
  gap: 5px;
  margin-left: auto;
  padding: 7px 10px;
  border: 1px solid rgba(148,163,184,.45);
  border-radius: var(--radius-full);
  background: rgba(255,255,255,.9);
  color: var(--c-text-secondary);
  font-size: 11px;
  font-weight: 700;
  white-space:nowrap
}
.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border-radius: var(--radius-lg);
  background: rgba(248,250,252,.88);
  color: #b91c1c;
  font-weight:700
}
.loading-overlay.error {
  flex-direction:column
}
.preview-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top:12px
}
.preview-meta span {
  padding: 5px 9px;
  border-radius: var(--radius-full);
  background: #f1f5f9;
  color: var(--c-text-body);
  font-size: 11px;
  font-weight:700
}
.workspace-grid {
  display: grid;
  grid-template-columns: minmax(0,1.45fr) minmax(300px,.75fr);
  gap:18px
}
.control-card,.export-card {
  padding:22px
}
.card-heading {
  margin-bottom:20px
}
.card-heading>button {
  min-height: 34px;
  padding:0 10px
}
.text-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap:14px
}
.text-grid label,.option-field {
  display: flex;
  flex-direction: column;
  gap:8px
}
.text-grid label>span,.option-field>span,.preset-block>span {
  color: var(--c-text-secondary);
  font-size: 12px;
  font-weight:800
}
.preset-block {
  margin-top:18px
}
.preset-grid {
  display: grid;
  grid-template-columns: repeat(2,1fr);
  gap: 9px;
  margin-top:9px
}
.preset-grid button {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 11px 12px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: var(--c-surface-subtle);
  color: var(--c-text-strong);
  text-align: left;
  cursor:pointer
}
.preset-grid button:hover {
  border-color: #f59e0b;
  background:#fffbeb
}
.preset-grid small {
  color: var(--c-text-muted)
}
.option-field {
  margin-top:18px
}
.option-field :deep(.el-radio-group) {
  width: 100%;
}
.option-field :deep(.el-radio-button) {
  flex: 1;
}
.option-field :deep(.el-radio-button__inner) {
  width: 100%;
}
.slider-setting {
  margin-top:19px
}
.slider-setting label {
  display: flex;
  justify-content: space-between;
  color: var(--c-text-secondary);
  font-size: 12px;
  font-weight:800
}
.slider-setting strong {
  color:#b91c1c
}
.slider-setting :deep(.el-slider) {
  padding:0 5px
}
.soft-action {
  width: 100%;
  margin-top: 4px;
  border-color: #fecaca;
  background: #fff7ed;
  color:#b91c1c
}
.summary-list {
  display: grid;
  gap: 1px;
  overflow: hidden;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background:#e2e8f0
}
.summary-list div {
  display: flex;
  justify-content: space-between;
  padding: 13px;
  background: var(--c-surface-subtle);
  color: var(--c-text-secondary);
  font-size:12px
}
.summary-list strong {
  color:#1e293b
}
.export-summary {
  display: flex;
  flex-direction: column;
  margin-top: 18px;
  padding: 18px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg,#b91c1c,#7c2d12);
  color: var(--c-on-accent)
}
.export-summary span,.export-summary small {
  color: #fed7aa;
  font-size:11px
}
.export-summary strong {
  margin: 5px 0;
  font-size:25px
}
.privacy-note {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 14px;
  padding: 13px;
  border-radius: var(--radius-md);
  background: var(--c-surface-subtle);
  color: var(--c-text-secondary);
  font-size:12px
}
.privacy-note strong {
  color: var(--c-text-strong)
}
.detail-copy {
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: var(--c-text-secondary);
  font-size: 14px;
  line-height:1.9
}
.detail-copy a {
  color:#dc2626
}
.dark .preview-card,.dark .control-card,.dark .export-card {
  border-color:#334155
}
.dark .preview-card,.dark .control-card,.dark .export-card {
  background:#1e293b
}
.dark .preview-heading h3,.dark .card-heading h3 {
  color:#f8fafc
}
.dark .preview-heading p,.dark .text-grid label>span,.dark .option-field>span,.dark .preset-block>span {
  color: var(--c-text-muted)
}
.dark .export-actions button,.dark .card-heading>button {
  border-color: #475569;
  background: #0f172a;
  color:#cbd5e1
}
.dark .canvas-stage {
  background-color:#0f172a
}
.dark .canvas-stage.transparent {
  background-image:linear-gradient(45deg,#1e293b 25%,transparent 25%),linear-gradient(-45deg,#1e293b 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#1e293b 75%),linear-gradient(-45deg,transparent 75%,#1e293b 75%)
}
.dark .drag-hint {
  border-color: #475569;
  background: rgba(15,23,42,.9);
  color: var(--c-text-muted)
}
.dark .loading-overlay {
  background:rgba(15,23,42,.9)
}
.dark .preview-meta span {
  background: #0f172a;
  color:#cbd5e1
}
.dark .preset-grid button,.dark .summary-list div,.dark .privacy-note {
  border-color: #334155;
  background: #0f172a;
  color: var(--c-text-muted)
}
.dark .preset-grid button:hover {
  border-color: #f59e0b;
  background:#292314
}
.dark .summary-list {
  border-color: #334155;
  background:#334155
}
.dark .summary-list strong,.dark .privacy-note strong {
  color:#e2e8f0
}
.dark .soft-action {
  border-color: #7f1d1d;
  background: #291414;
  color:#fecaca
}
@media(max-width:900px) {
  .workspace-grid {
    grid-template-columns:1fr
  }
}
@media(max-width:640px) {
  .choyen-page {
    gap:14px
  }
  .preview-card,.control-card,.export-card {
    border-radius:var(--radius-lg)
  }
  .preview-card,.control-card,.export-card {
    padding:15px
  }
  .preview-heading {
    flex-direction:column
  }
  .export-actions {
    width:100%
  }
  .export-actions button {
    flex:1
  }
  .canvas-stage {
    min-height: 180px;
    padding:12px
  }
  .canvas-stage canvas {
    height:170px
  }
  .drag-hint {
    display:none
  }
  .text-grid,.preset-grid {
    grid-template-columns:1fr
  }
  .preview-meta {
    gap:6px
  }
}
.canvas-stage {
  box-sizing: border-box;
  height: 340px;
  min-height: 340px;
  justify-content: center;
  overflow:hidden
}
.canvas-stage canvas {
  flex: 0 1 auto;
  width: auto;
  max-width: 100%;
  height: auto;
  max-height:100%
}
.drag-hint {
  position: absolute;
  right: 26px;
  bottom: 26px;
  margin-left:0
}
@media(max-width:640px) {
  .canvas-stage {
    height: 220px;
    min-height:220px
  }
  .canvas-stage canvas {
    width: auto;
    height: auto;
    max-height:100%
  }
}
</style>
