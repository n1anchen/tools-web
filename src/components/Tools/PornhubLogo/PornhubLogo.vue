<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { CopyDocument, Download, Loading, Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import debounce from 'lodash/debounce'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import { autoDown } from '@/utils/file'
import {
  buildLogoFilename,
  calculateSplitLogoLayout,
  canvasToPngBlob,
  getScaledDimensions,
  type LogoShape,
} from '@/utils/logoStudio'
import { loadFontStylesheet, ensureFontsLoaded } from '@/utils/font'

const themePresets = [
  { label: '经典黑橙', note: '强烈醒目', background: '#050505', box: '#F59E0B', left: '#FFFFFF', right: '#111111' },
  { label: '深海青蓝', note: '科技清爽', background: '#082F49', box: '#22D3EE', left: '#E0F2FE', right: '#083344' },
  { label: '奶油莓红', note: '明亮活泼', background: '#FFF7ED', box: '#E11D48', left: '#9F1239', right: '#FFFFFF' },
  { label: '夜紫荧光', note: '舞台感', background: '#18181B', box: '#A3E635', left: '#F5F3FF', right: '#1A2E05' },
]
const textPresets = [
  { label: 'Tools / Web', left: 'Tools', right: 'Web' },
  { label: 'Hello / World', left: 'Hello', right: 'World' },
  { label: 'Open / Source', left: 'Open', right: 'Source' },
  { label: 'Code / Lab', left: 'Code', right: 'Lab' },
]
const shapeOptions = [
  { label: '自适应', value: 'auto' },
  { label: '方形', value: 'square' },
  { label: '圆形', value: 'circle' },
]
const backgroundOptions = [
  { label: '纯色', value: 'color' },
  { label: '透明', value: 'transparent' },
]
const scaleOptions = [
  { label: '1×', value: 1 },
  { label: '2×', value: 2 },
  { label: '3×', value: 3 },
]

const canvasRef = ref<HTMLCanvasElement | null>(null)
const state = reactive({
  leftText: 'Tools',
  rightText: 'Web',
  fontSize: 120,
  paddingX: 20,
  paddingY: 18,
  radius: 10,
  backgroundMode: 'color' as 'color' | 'transparent',
  backgroundColor: '#050505',
  boxColor: '#F59E0B',
  leftColor: '#FFFFFF',
  rightColor: '#111111',
  bgShape: 'auto' as LogoShape,
  scale: 2,
  loading: true,
  exporting: false,
  status: '正在载入标题字体',
  error: '',
})
const baseDimensions = reactive({ width: 640, height: 240 })
let renderId = 0

const exportDimensions = computed(() => getScaledDimensions(baseDimensions.width, baseDimensions.height, state.scale))
const shapeLabel = computed(() => ({ auto: '自适应横幅', square: '方形徽标', circle: '圆形徽标' })[state.bgShape])
const backgroundLabel = computed(() => state.backgroundMode === 'transparent' ? '透明背景' : state.backgroundColor.toUpperCase())

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2))
  context.beginPath()
  context.moveTo(x + safeRadius, y)
  context.lineTo(x + width - safeRadius, y)
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius)
  context.lineTo(x + width, y + height - safeRadius)
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height)
  context.lineTo(x + safeRadius, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius)
  context.lineTo(x, y + safeRadius)
  context.quadraticCurveTo(x, y, x + safeRadius, y)
  context.closePath()
}

async function drawLogo() {
  const canvas = canvasRef.value
  if (!canvas) return
  const currentId = ++renderId
  state.loading = true
  state.error = ''
  state.status = '正在重新计算版式…'
  const textContent = `${state.leftText}${state.rightText}` || 'Logo'
  try {
    await document.fonts.load(`900 ${state.fontSize}px "Noto Sans SC"`, textContent)
    if (currentId !== renderId) return
    const measureContext = canvas.getContext('2d')
    if (!measureContext) throw new Error('浏览器无法创建画布')
    const fontStyle = `900 ${state.fontSize}px "Noto Sans SC", "Helvetica Neue", Arial, sans-serif`
    measureContext.font = fontStyle
    const leftWidth = state.leftText ? measureContext.measureText(state.leftText).width : 0
    const rightWidth = state.rightText ? measureContext.measureText(state.rightText).width : 0
    const layout = calculateSplitLogoLayout({
      leftWidth,
      rightWidth,
      fontSize: state.fontSize,
      paddingX: state.paddingX,
      paddingY: state.paddingY,
      gap: 10,
      margin: 40,
      shape: state.bgShape,
    })

    canvas.width = layout.canvasWidth
    canvas.height = layout.canvasHeight
    const context = canvas.getContext('2d')
    if (!context) throw new Error('浏览器无法创建画布')
    context.clearRect(0, 0, canvas.width, canvas.height)

    if (state.backgroundMode === 'color') {
      context.fillStyle = state.backgroundColor
      if (state.bgShape === 'circle') {
        context.beginPath()
        context.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2, 0, Math.PI * 2)
        context.fill()
      } else {
        context.fillRect(0, 0, canvas.width, canvas.height)
      }
    }

    context.font = fontStyle
    context.textBaseline = 'middle'
    const visualOffsetY = state.fontSize * 0.06
    if (state.leftText) {
      context.fillStyle = state.leftColor
      context.fillText(state.leftText, layout.startX, layout.textY + visualOffsetY)
    }
    if (state.rightText) {
      context.fillStyle = state.boxColor
      roundedRect(context, layout.boxX, layout.boxY, layout.rightBoxWidth, layout.rightBoxHeight, state.radius)
      context.fill()
      context.fillStyle = state.rightColor
      const rightTextX = layout.boxX + (layout.rightBoxWidth - rightWidth) / 2
      context.fillText(state.rightText, rightTextX, layout.textY + visualOffsetY)
    }

    baseDimensions.width = canvas.width
    baseDimensions.height = canvas.height
    state.status = '预览已更新，可复制或下载'
  } catch (error) {
    if (currentId !== renderId) return
    state.error = error instanceof Error ? error.message : '生成失败'
    state.status = '渲染失败，请重试'
  } finally {
    if (currentId === renderId) state.loading = false
  }
}

const scheduleDraw = debounce(drawLogo, 160)

function applyTheme(preset: typeof themePresets[number]) {
  state.backgroundColor = preset.background
  state.boxColor = preset.box
  state.leftColor = preset.left
  state.rightColor = preset.right
  state.backgroundMode = 'color'
}

function applyText(preset: typeof textPresets[number]) {
  state.leftText = preset.left
  state.rightText = preset.right
}

function resetStudio() {
  Object.assign(state, {
    leftText: 'Tools', rightText: 'Web', fontSize: 120, paddingX: 20, paddingY: 18, radius: 10,
    backgroundMode: 'color', backgroundColor: '#050505', boxColor: '#F59E0B', leftColor: '#FFFFFF',
    rightColor: '#111111', bgShape: 'auto', scale: 2,
  })
  drawLogo()
}

async function getExportBlob() {
  if (!canvasRef.value) throw new Error('画布尚未准备完成')
  return canvasToPngBlob(canvasRef.value, state.scale)
}

async function downloadImage() {
  if (state.loading || state.exporting) return
  state.exporting = true
  try {
    const blob = await getExportBlob()
    const url = URL.createObjectURL(blob)
    autoDown(url, buildLogoFilename([state.leftText, state.rightText], 'split-badge'))
    ElMessage.success(`已导出 ${exportDimensions.value.width} × ${exportDimensions.value.height} PNG`)
  } catch {
    ElMessage.error('图片下载失败，请稍后重试')
  } finally {
    state.exporting = false
  }
}

async function copyImage() {
  if (state.loading || state.exporting) return
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
    ElMessage.warning('当前浏览器不支持复制 PNG，请使用下载')
    return
  }
  state.exporting = true
  try {
    const blob = await getExportBlob()
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    ElMessage.success('PNG 图片已复制到剪贴板')
  } catch {
    ElMessage.error('图片复制失败，请尝试直接下载')
  } finally {
    state.exporting = false
  }
}

watch(() => [
  state.leftText, state.rightText, state.fontSize, state.paddingX, state.paddingY, state.radius,
  state.backgroundMode, state.backgroundColor, state.boxColor, state.leftColor, state.rightColor, state.bgShape,
], scheduleDraw)

onMounted(async () => {
  try {
    await loadFontStylesheet('font-noto-sans', 'https://fonts.loli.net/css?family=Noto+Sans+SC:900')
    await ensureFontsLoaded([{ font: '900 120px "Noto Sans SC"', text: 'ToolsWeb工具箱' }])
  } catch {
    // Canvas will fall back to the local system sans-serif font.
  }
  await drawLogo()
})

onUnmounted(() => {
  renderId += 1
  scheduleDraw.cancel()
})
</script>

<template>
  <div class="split-logo-page flex flex-col mt-3 flex-1">
    <ToolHero summary="一半是标题，一半是视觉锚点">
      <template #metrics>
        <div class="hero-metrics">
          <div><span>导出宽度</span><strong>{{ exportDimensions.width }}</strong></div>
          <div><span>导出高度</span><strong>{{ exportDimensions.height }}</strong></div>
          <div><span>清晰倍率</span><strong>{{ state.scale }}×</strong></div>
        </div>
      </template>
    </ToolHero>

    <section class="preview-card">
      <header class="preview-heading">
        <div><span class="eyebrow">LIVE BADGE PREVIEW</span><h3>最终效果预览</h3><p>{{ state.status }}</p></div>
        <div class="export-actions"><button type="button" aria-label="复制双栏徽标 PNG" :disabled="state.loading || state.exporting" @click="copyImage"><el-icon><CopyDocument /></el-icon>复制 PNG</button><button type="button" class="primary" aria-label="下载双栏徽标 PNG" :disabled="state.loading || state.exporting" @click="downloadImage"><el-icon><Download /></el-icon>下载图片</button></div>
      </header>
      <div class="canvas-stage">
        <canvas ref="canvasRef" role="img" aria-label="双栏徽标预览" />
        <div v-if="state.loading" class="loading-overlay"><el-icon class="is-loading"><Loading /></el-icon><span>{{ state.status }}</span></div>
        <div v-else-if="state.error" class="loading-overlay error"><span>{{ state.error }}</span><button type="button" @click="drawLogo">重新渲染</button></div>
      </div>
      <div class="preview-meta"><span>{{ shapeLabel }}</span><span>{{ backgroundLabel }}</span><span>{{ exportDimensions.width }} × {{ exportDimensions.height }} px</span><span>PNG · 本地生成</span></div>
    </section>

    <div class="workspace-grid">
      <section class="control-card">
        <header class="card-heading"><div><span class="eyebrow">WORDMARK LAYOUT</span><h3>文字与版式</h3></div><button type="button" aria-label="恢复默认徽标设置" @click="resetStudio"><el-icon><Refresh /></el-icon>重置</button></header>
        <div class="text-grid"><label><span>左侧文字</span><el-input v-model="state.leftText" maxlength="18" aria-label="徽标左侧文字" /></label><label><span>色块文字</span><el-input v-model="state.rightText" maxlength="18" aria-label="徽标色块文字" /></label></div>
        <div class="text-presets"><span>快速文案</span><div><button v-for="preset in textPresets" :key="preset.label" type="button" @click="applyText(preset)">{{ preset.label }}</button></div></div>
        <label class="option-field"><span>画布形状</span><el-segmented v-model="state.bgShape" :options="shapeOptions" /></label>
        <label class="option-field"><span>图片背景</span><el-segmented v-model="state.backgroundMode" :options="backgroundOptions" /></label>
        <div class="slider-setting"><label><span>标题字号</span><strong>{{ state.fontSize }} px</strong></label><el-slider v-model="state.fontSize" :min="64" :max="180" :step="4" /></div>
        <div class="compact-sliders"><div class="slider-setting"><label><span>色块留白</span><strong>{{ state.paddingX }} px</strong></label><el-slider v-model="state.paddingX" :min="8" :max="48" /></div><div class="slider-setting"><label><span>色块圆角</span><strong>{{ state.radius }} px</strong></label><el-slider v-model="state.radius" :min="0" :max="36" /></div></div>
      </section>

      <aside class="appearance-card">
        <header class="card-heading"><div><span class="eyebrow">COLOR & EXPORT</span><h3>配色与导出</h3></div></header>
        <div class="theme-presets"><button v-for="preset in themePresets" :key="preset.label" type="button" @click="applyTheme(preset)"><i :style="{ background: `linear-gradient(135deg, ${preset.background} 50%, ${preset.box} 50%)` }"></i><span><strong>{{ preset.label }}</strong><small>{{ preset.note }}</small></span></button></div>
        <div class="color-grid"><label><span>背景</span><div><el-color-picker v-model="state.backgroundColor" :disabled="state.backgroundMode === 'transparent'" /><code>{{ state.backgroundMode === 'transparent' ? '透明' : state.backgroundColor }}</code></div></label><label><span>色块</span><div><el-color-picker v-model="state.boxColor" /><code>{{ state.boxColor }}</code></div></label><label><span>左侧文字</span><div><el-color-picker v-model="state.leftColor" /><code>{{ state.leftColor }}</code></div></label><label><span>色块文字</span><div><el-color-picker v-model="state.rightColor" /><code>{{ state.rightColor }}</code></div></label></div>
        <label class="resolution-field"><span>导出清晰度</span><el-segmented v-model="state.scale" :options="scaleOptions" /></label>
        <div class="dimension-summary"><span>最终 PNG</span><strong>{{ exportDimensions.width }} × {{ exportDimensions.height }}</strong><small>{{ state.scale === 1 ? '适合网页与聊天' : state.scale === 2 ? '适合高清分享' : '适合大尺寸排版' }}</small></div>
      </aside>
    </div>

    <ToolGuide title="使用与版权说明">
      <el-text>双栏徽标是一种通用视觉构图，本工具不包含或导出任何第三方品牌素材。自适应画布适合横向标题，方形与圆形适合头像；透明模式只保留文字和色块。导出倍率只增加像素尺寸，不改变构图。请勿使用他人商标、姓名或受保护内容进行误导性传播。</el-text>
    </ToolGuide>
  </div>
</template>

<style scoped>
.split-logo-page{--accent:#f59e0b;--deep:#b45309;--soft:#fffbeb;gap:16px}.preview-card,.control-card,.appearance-card{border:1px solid #fde68a;border-radius:22px;background:#fff;box-shadow:0 16px 40px rgba(120,53,15,.07)}.eyebrow{display:block;margin-bottom:6px;color:var(--accent);font-size:10px;font-weight:900;letter-spacing:.16em}.hero-metrics{display:grid;grid-template-columns:repeat(3,minmax(96px,1fr));min-width:320px;overflow:hidden;border:1px solid #e0e9f4;border-radius:18px;background:rgba(255,255,255,.78)}.hero-metrics div{padding:12px 14px;text-align:center;border-left:1px solid #e5edf6}.hero-metrics div:first-child{border-left:0}.hero-metrics span,.hero-metrics strong{display:block}.hero-metrics span{margin-top:4px;color:#7a899c;font-size:12px}.hero-metrics strong{overflow:hidden;color:#334155;font-size:18px;text-overflow:ellipsis;white-space:nowrap}.preview-card{padding:21px}.preview-heading,.card-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}.preview-heading{margin-bottom:14px}.preview-heading h3,.card-heading h3{margin:0;color:#18181b;font-size:19px}.preview-heading p{margin:3px 0 0;color:#a1a1aa;font-size:10px}.export-actions{display:flex;gap:7px}.export-actions button,.card-heading>button{display:flex;align-items:center;gap:5px;padding:8px 10px;border:1px solid #d4d4d8;border-radius:9px;color:#52525b;background:#fff;cursor:pointer;font-size:10px}.export-actions button.primary{border-color:var(--accent);color:#18181b;background:var(--accent);font-weight:800}.export-actions button:disabled{opacity:.4;cursor:not-allowed}.canvas-stage{position:relative;display:grid;place-items:center;min-height:290px;padding:30px;border-radius:17px;overflow:auto;background-color:#fafafa;background-image:linear-gradient(45deg,#e4e4e7 25%,transparent 25%,transparent 75%,#e4e4e7 75%),linear-gradient(45deg,#e4e4e7 25%,transparent 25%,transparent 75%,#e4e4e7 75%);background-position:0 0,12px 12px;background-size:24px 24px}.canvas-stage canvas{display:block;max-width:100%;height:auto;filter:drop-shadow(0 13px 25px rgba(24,24,27,.16))}.loading-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:9px;color:var(--deep);background:rgba(250,250,250,.78);backdrop-filter:blur(4px);font-size:11px}.loading-overlay>.el-icon{font-size:25px}.loading-overlay.error{flex-direction:column;color:#be123c}.loading-overlay button{padding:6px 9px;border:0;border-radius:7px;color:#fff;background:#e11d48;cursor:pointer}.preview-meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:11px}.preview-meta span{padding:5px 8px;border-radius:999px;color:#71717a;background:#f4f4f5;font-size:9px}.workspace-grid{display:grid;grid-template-columns:minmax(0,1.12fr) minmax(360px,.78fr);gap:16px;align-items:start}.control-card,.appearance-card{padding:21px}.card-heading{margin-bottom:17px}.card-heading>button{padding:6px 8px}.text-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.text-grid label>span,.option-field>span,.resolution-field>span{display:block;margin-bottom:7px;color:#71717a;font-size:10px}.text-presets{margin-top:13px}.text-presets>span{display:block;margin-bottom:7px;color:#71717a;font-size:10px}.text-presets>div{display:flex;flex-wrap:wrap;gap:6px}.text-presets button{padding:6px 8px;border:1px solid #e4e4e7;border-radius:999px;color:#71717a;background:#fafafa;cursor:pointer;font-size:9px}.option-field,.resolution-field{display:block;margin-top:15px}.option-field :deep(.el-segmented),.resolution-field :deep(.el-segmented){width:100%}.slider-setting{margin-top:14px}.slider-setting label{display:flex;justify-content:space-between;margin-bottom:7px;color:#71717a;font-size:10px}.slider-setting strong{color:var(--deep)}.slider-setting :deep(.el-slider){padding:0 8px}.compact-sliders{display:grid;grid-template-columns:1fr 1fr;gap:14px}.theme-presets{display:grid;grid-template-columns:1fr 1fr;gap:7px}.theme-presets button{display:flex;align-items:center;gap:8px;padding:8px;border:1px solid #e4e4e7;border-radius:11px;background:#fafafa;text-align:left;cursor:pointer}.theme-presets i{flex:0 0 29px;width:29px;height:29px;border:1px solid #d4d4d8;border-radius:9px}.theme-presets span,.theme-presets strong,.theme-presets small{display:block}.theme-presets strong{color:#3f3f46;font-size:10px}.theme-presets small{margin-top:2px;color:#a1a1aa;font-size:8px}.color-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:12px}.color-grid label{padding:9px;border:1px solid #e4e4e7;border-radius:11px}.color-grid label>span{display:block;margin-bottom:6px;color:#a1a1aa;font-size:8px}.color-grid label>div{display:flex;align-items:center;gap:7px}.color-grid code{color:#52525b;font-size:9px}.dimension-summary{margin-top:14px;padding:15px;border-radius:14px;color:#fff;background:linear-gradient(135deg,#18181b,#78350f)}.dimension-summary span,.dimension-summary strong,.dimension-summary small{display:block}.dimension-summary span{color:#fcd34d;font-size:9px}.dimension-summary strong{margin-top:5px;font-size:22px}.dimension-summary small{margin-top:4px;color:#fef3c7;font-size:9px}
:global(html.dark .split-logo-page .hero-metrics){border-color:#40516a;background:rgba(15,23,42,.5)}:global(html.dark .split-logo-page .hero-metrics div){border-color:#40516a}:global(html.dark .split-logo-page .hero-metrics strong){color:#e7edf6}:global(html.dark .split-logo-page .hero-metrics span){color:#a8b4c5}:global(html.dark .split-logo-page .preview-card),:global(html.dark .split-logo-page .control-card),:global(html.dark .split-logo-page .appearance-card){border-color:#3f3f46;background:#27272a;box-shadow:none}:global(html.dark .split-logo-page .preview-heading h3),:global(html.dark .split-logo-page .card-heading h3),:global(html.dark .split-logo-page .theme-presets strong){color:#fafafa}:global(html.dark .split-logo-page .canvas-stage){background-color:#18181b;background-image:linear-gradient(45deg,#27272a 25%,transparent 25%,transparent 75%,#27272a 75%),linear-gradient(45deg,#27272a 25%,transparent 25%,transparent 75%,#27272a 75%)}:global(html.dark .split-logo-page .loading-overlay){background:rgba(24,24,27,.82)}:global(html.dark .split-logo-page .export-actions button),:global(html.dark .split-logo-page .card-heading>button),:global(html.dark .split-logo-page .text-presets button),:global(html.dark .split-logo-page .theme-presets button){border-color:#3f3f46;color:#d4d4d8;background:#18181b}:global(html.dark .split-logo-page .preview-meta span){color:#d4d4d8;background:#18181b}:global(html.dark .split-logo-page .color-grid label){border-color:#3f3f46}:global(html.dark .split-logo-page .color-grid code){color:#e4e4e7}
.canvas-stage canvas{max-height:520px}
@media(max-width:1000px){.workspace-grid{grid-template-columns:1fr}.canvas-stage{min-height:240px}}@media(max-width:650px){.split-logo-page{gap:12px}.hero-metrics{grid-template-columns:1fr}.hero-metrics div{border-left:0;border-bottom:1px solid #e5edf6}.hero-metrics div:last-child{border-bottom:0}.preview-card,.control-card,.appearance-card{padding:15px}.preview-heading{align-items:flex-start;flex-direction:column}.export-actions{width:100%}.export-actions button{flex:1;justify-content:center}.canvas-stage{min-height:190px;padding:14px}.text-grid,.compact-sliders,.color-grid{grid-template-columns:1fr}.theme-presets{grid-template-columns:1fr 1fr}.card-heading{align-items:flex-start}}
</style>
