<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import type { UploadInstance, UploadProps, UploadRawFile } from 'element-plus'
import { ElMessage, genFileId } from 'element-plus'
import { CopyDocument, Download, Picture, Refresh, Upload } from '@element-plus/icons-vue'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import {
  buildMemeFilename,
  calculateCaptionLayout,
  getMemeOutputDimensions,
  wrapCaptionText,
  type CaptionPlacement,
} from '@/utils/memeCaption'

const stylePresets = [
  { label: '经典黑条', note: '清晰耐看', bgMode: 'black', placement: 'bottom', padding: 14, stroke: true, strokeWidth: 3 },
  { label: '新闻白条', note: '信息感', bgMode: 'white', placement: 'bottom', padding: 16, stroke: false, strokeWidth: 2 },
  { label: '透明描边', note: '保留画面', bgMode: 'transparent', placement: 'bottom', padding: 10, stroke: true, strokeWidth: 6 },
  { label: '顶部吐槽', note: '先读文字', bgMode: 'black', placement: 'top', padding: 13, stroke: true, strokeWidth: 3 },
] as const
const textPresets = ['我当时就震惊了', '你说得对，但是…', '今天也要保持微笑', '这合理吗？这不合理']
const placementOptions = [{ label: '底部', value: 'bottom' }, { label: '顶部', value: 'top' }]
const backgroundOptions = [{ label: '黑底', value: 'black' }, { label: '白底', value: 'white' }, { label: '透明', value: 'transparent' }]
const scaleOptions = [{ label: '100%', value: 1 }, { label: '50%', value: 2 }, { label: '33%', value: 3 }, { label: '25%', value: 4 }]
const formatOptions = [{ label: 'JPG', value: 'jpeg' }, { label: 'PNG', value: 'png' }]

const canvasRef = ref<HTMLCanvasElement | null>(null)
const uploadRef = ref<UploadInstance>()
const renderedLines = ref<string[]>([])
const maxOffset = ref(0)
const dimensions = reactive({ naturalWidth: 0, naturalHeight: 0 })
const state = reactive({
  srcImage: null as HTMLImageElement | null,
  sourceName: '',
  text: '我当时就震惊了',
  fontSize: 42,
  captionPadding: 14,
  offset: 0,
  placement: 'bottom' as CaptionPlacement,
  bgMode: 'black' as 'black' | 'white' | 'transparent',
  stroke: true,
  strokeWidth: 3,
  autoWrap: true,
  scale: 1,
  format: 'jpeg' as 'jpeg' | 'png',
  quality: 92,
  exporting: false,
})

const hasImage = computed(() => Boolean(state.srcImage))
const outputDimensions = computed(() => hasImage.value
  ? getMemeOutputDimensions(dimensions.naturalWidth, dimensions.naturalHeight, state.scale)
  : { width: 0, height: 0 })
const backgroundLabel = computed(() => ({ black: '黑色字幕条', white: '白色字幕条', transparent: '透明背景' })[state.bgMode])
const formatLabel = computed(() => state.format === 'jpeg' ? `JPG · ${state.quality}%` : 'PNG · 无损')

function redraw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const context = canvas.getContext('2d')
  if (!context) return

  if (!state.srcImage) {
    canvas.width = 960
    canvas.height = 540
    const dark = document.documentElement.classList.contains('dark')
    context.fillStyle = dark ? '#0f172a' : '#f1f5f9'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = dark ? '#64748b' : '#94a3b8'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.font = '700 28px system-ui, sans-serif'
    context.fillText('载入图片后开始创作', canvas.width / 2, canvas.height / 2 - 16)
    context.font = '20px system-ui, sans-serif'
    context.fillText('支持 JPG、PNG、WebP 和 GIF', canvas.width / 2, canvas.height / 2 + 26)
    renderedLines.value = []
    maxOffset.value = 0
    return
  }

  const { width, height } = outputDimensions.value
  canvas.width = width
  canvas.height = height
  context.clearRect(0, 0, width, height)
  context.drawImage(state.srcImage, 0, 0, width, height)
  const effectiveFontSize = Math.max(6, state.fontSize / state.scale)
  const effectivePadding = state.captionPadding / state.scale
  const effectiveOffset = state.offset / state.scale
  const effectiveStrokeWidth = state.strokeWidth / state.scale
  context.font = `800 ${effectiveFontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`
  context.textAlign = 'center'
  context.textBaseline = 'middle'

  const lines = state.autoWrap
    ? wrapCaptionText(state.text, Math.max(80, width - effectiveFontSize * 1.5), (value) => context.measureText(value).width, 5)
    : state.text.replace(/\r/g, '').split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 5)
  renderedLines.value = lines
  const layout = calculateCaptionLayout({
    canvasHeight: height,
    fontSize: effectiveFontSize,
    lineCount: lines.length,
    padding: effectivePadding,
    offset: effectiveOffset,
    placement: state.placement,
  })
  maxOffset.value = Math.round(layout.maxOffset * state.scale)
  if (state.offset > maxOffset.value) state.offset = maxOffset.value
  if (!lines.length) return

  if (state.bgMode !== 'transparent') {
    context.fillStyle = state.bgMode === 'black' ? '#050505' : '#ffffff'
    context.fillRect(0, layout.barY, width, layout.barHeight)
  }
  context.fillStyle = state.bgMode === 'white' ? '#111827' : '#ffffff'
  context.lineJoin = 'round'
  lines.forEach((line, index) => {
    const y = layout.barY + effectivePadding + layout.lineHeight * (index + 0.5)
    if (state.stroke) {
      context.strokeStyle = state.bgMode === 'white' ? 'rgba(255,255,255,.82)' : 'rgba(0,0,0,.92)'
      context.lineWidth = effectiveStrokeWidth
      context.strokeText(line, width / 2, y)
    }
    context.fillText(line, width / 2, y)
  })
}

function applyStyle(preset: typeof stylePresets[number]) {
  state.bgMode = preset.bgMode
  state.placement = preset.placement
  state.captionPadding = preset.padding
  state.stroke = preset.stroke
  state.strokeWidth = preset.strokeWidth
  state.offset = 0
}

function resetStyle() {
  Object.assign(state, {
    text: '我当时就震惊了', fontSize: hasImage.value ? Math.max(18, Math.round(dimensions.naturalHeight * .085)) : 42,
    captionPadding: 14, offset: 0, placement: 'bottom', bgMode: 'black', stroke: true,
    strokeWidth: 3, autoWrap: true, scale: 1, format: 'jpeg', quality: 92,
  })
}

const handleUploadChange: UploadProps['onChange'] = (file) => {
  if (!file.raw || !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.raw.type)) {
    ElMessage.error('请选择 JPG、PNG、WebP 或 GIF 图片')
    return
  }
  if (file.raw.size > 20 * 1024 * 1024) {
    ElMessage.error('图片文件不能超过 20 MB')
    return
  }
  const url = URL.createObjectURL(file.raw)
  const image = new Image()
  image.onload = () => {
    URL.revokeObjectURL(url)
    state.srcImage = image
    state.sourceName = file.name
    dimensions.naturalWidth = image.naturalWidth
    dimensions.naturalHeight = image.naturalHeight
    state.scale = 1
    state.offset = 0
    state.fontSize = Math.min(120, Math.max(18, Math.round(image.naturalHeight * .085)))
    nextTick(redraw)
    ElMessage.success(`已载入 ${image.naturalWidth} × ${image.naturalHeight} 图片`)
  }
  image.onerror = () => {
    URL.revokeObjectURL(url)
    ElMessage.error('图片读取失败，请尝试其他文件')
  }
  image.src = url
}

const handleUploadExceed: UploadProps['onExceed'] = (files) => {
  uploadRef.value?.clearFiles()
  const file = files[0] as UploadRawFile
  file.uid = genFileId()
  uploadRef.value?.handleStart(file)
}

function clearImage() {
  state.srcImage = null
  state.sourceName = ''
  dimensions.naturalWidth = 0
  dimensions.naturalHeight = 0
  uploadRef.value?.clearFiles()
  redraw()
}

function canvasToBlob(type: 'image/jpeg' | 'image/png', quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvasRef.value?.toBlob((blob) => blob ? resolve(blob) : reject(new Error('图片编码失败')), type, quality)
  })
}

async function downloadImage() {
  if (!hasImage.value || state.exporting) return
  state.exporting = true
  try {
    const blob = await canvasToBlob(state.format === 'jpeg' ? 'image/jpeg' : 'image/png', state.format === 'jpeg' ? state.quality / 100 : undefined)
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = buildMemeFilename(state.sourceName, state.format)
    anchor.click()
    URL.revokeObjectURL(url)
    ElMessage.success(`已导出 ${outputDimensions.value.width} × ${outputDimensions.value.height} ${state.format.toUpperCase()}`)
  } catch {
    ElMessage.error('图片导出失败，请稍后重试')
  } finally {
    state.exporting = false
  }
}

async function copyPng() {
  if (!hasImage.value || state.exporting) return
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
    ElMessage.warning('当前浏览器不支持复制图片，请使用下载')
    return
  }
  state.exporting = true
  try {
    const blob = await canvasToBlob('image/png')
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    ElMessage.success('梗图 PNG 已复制')
  } catch {
    ElMessage.error('复制失败，请尝试直接下载')
  } finally {
    state.exporting = false
  }
}

watch(() => [
  state.text, state.fontSize, state.captionPadding, state.offset, state.placement, state.bgMode,
  state.stroke, state.strokeWidth, state.autoWrap, state.scale,
], redraw)

let themeObserver: MutationObserver | null = null
onMounted(() => {
  nextTick(redraw)
  themeObserver = new MutationObserver(() => { if (!hasImage.value) redraw() })
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
})
onUnmounted(() => themeObserver?.disconnect())
</script>

<template>
  <div class="meme-page flex flex-col mt-3 flex-1">
    <DetailHeader title="字幕梗图工作室" />

    <section class="studio-hero">
      <div><span class="eyebrow">MEME CAPTION STUDIO</span><h2>把一句话，放到最有戏的位置</h2><p>载入图片后实时调整字幕、位置与描边，自动换行并输出适合聊天、社交平台和二次创作的成品。</p></div>
      <div class="hero-stats"><div><strong>{{ outputDimensions.width || '—' }}</strong><span>输出宽度</span></div><div><strong>{{ renderedLines.length || '—' }}</strong><span>字幕行数</span></div><div><strong>{{ state.format.toUpperCase() }}</strong><span>导出格式</span></div></div>
    </section>

    <section class="preview-card">
      <header class="preview-heading">
        <div><span class="eyebrow">LIVE MEME PREVIEW</span><h3>最终效果预览</h3><p>{{ hasImage ? `${state.sourceName} · 所有处理均在本地完成` : '先载入一张图片，字幕设置会立即应用' }}</p></div>
        <div class="preview-actions">
          <el-upload ref="uploadRef" :limit="1" accept="image/png,image/jpeg,image/webp,image/gif" :auto-upload="false" :show-file-list="false" @change="handleUploadChange" @exceed="handleUploadExceed"><template #trigger><button type="button" aria-label="载入梗图原图"><el-icon><Upload /></el-icon>{{ hasImage ? '更换图片' : '载入图片' }}</button></template></el-upload>
          <button type="button" aria-label="复制梗图 PNG" :disabled="!hasImage || state.exporting" @click="copyPng"><el-icon><CopyDocument /></el-icon>复制 PNG</button>
          <button type="button" class="primary" aria-label="下载字幕梗图" :disabled="!hasImage || state.exporting" @click="downloadImage"><el-icon><Download /></el-icon>下载图片</button>
        </div>
      </header>
      <div class="canvas-stage"><canvas ref="canvasRef" role="img" aria-label="字幕梗图预览" /></div>
      <div class="preview-meta"><span>{{ hasImage ? `${outputDimensions.width} × ${outputDimensions.height} px` : '等待图片' }}</span><span>{{ backgroundLabel }}</span><span>{{ state.placement === 'bottom' ? '底部字幕' : '顶部字幕' }}</span><span>{{ formatLabel }}</span></div>
    </section>

    <div class="workspace-grid">
      <section class="control-card">
        <header class="card-heading"><div><span class="eyebrow">CAPTION COMPOSER</span><h3>字幕与样式</h3></div><button type="button" aria-label="恢复梗图字幕默认设置" @click="resetStyle"><el-icon><Refresh /></el-icon>重置</button></header>
        <label class="text-field"><span>字幕文本</span><el-input v-model="state.text" type="textarea" :rows="4" maxlength="160" show-word-limit placeholder="输入字幕，支持手动换行" aria-label="梗图字幕文本" /></label>
        <div class="text-presets"><span>快速文案</span><div><button v-for="text in textPresets" :key="text" type="button" @click="state.text = text">{{ text }}</button></div></div>
        <div class="style-presets"><span>视觉模板</span><div><button v-for="preset in stylePresets" :key="preset.label" type="button" @click="applyStyle(preset)"><strong>{{ preset.label }}</strong><small>{{ preset.note }}</small></button></div></div>
        <div class="segment-grid"><label><span>字幕位置</span><el-segmented v-model="state.placement" :options="placementOptions" /></label><label><span>字幕背景</span><el-segmented v-model="state.bgMode" :options="backgroundOptions" /></label></div>
        <div class="switch-row"><div><strong>自动换行</strong><span>按图片宽度最多排成 5 行</span></div><el-switch v-model="state.autoWrap" aria-label="切换字幕自动换行" /></div>
        <div class="slider-grid"><div class="slider-setting"><label><span>字体大小</span><strong>{{ state.fontSize }} px</strong></label><el-slider v-model="state.fontSize" :min="12" :max="120" /></div><div class="slider-setting"><label><span>上下留白</span><strong>{{ state.captionPadding }} px</strong></label><el-slider v-model="state.captionPadding" :min="0" :max="60" /></div><div class="slider-setting"><label><span>距{{ state.placement === 'bottom' ? '底' : '顶' }}部</span><strong>{{ state.offset }} px</strong></label><el-slider v-model="state.offset" :min="0" :max="maxOffset" :disabled="!hasImage" /></div><div class="slider-setting"><label><span>描边粗细</span><strong>{{ state.stroke ? `${state.strokeWidth} px` : '关闭' }}</strong></label><el-slider v-model="state.strokeWidth" :min="1" :max="12" :disabled="!state.stroke" /></div></div>
        <div class="switch-row"><div><strong>文字描边</strong><span>提升复杂背景下的可读性</span></div><el-switch v-model="state.stroke" aria-label="切换字幕描边" /></div>
      </section>

      <aside class="export-card">
        <header class="card-heading"><div><span class="eyebrow">OUTPUT CONTROL</span><h3>尺寸与导出</h3></div></header>
        <div class="summary-list"><div><span>原图尺寸</span><strong>{{ hasImage ? `${dimensions.naturalWidth} × ${dimensions.naturalHeight}` : '未载入' }}</strong></div><div><span>输出尺寸</span><strong>{{ hasImage ? `${outputDimensions.width} × ${outputDimensions.height}` : '—' }}</strong></div><div><span>字幕行数</span><strong>{{ renderedLines.length }} 行</strong></div></div>
        <label class="option-field"><span>输出尺寸</span><el-segmented v-model="state.scale" :options="scaleOptions" /></label>
        <label class="option-field"><span>文件格式</span><el-segmented v-model="state.format" :options="formatOptions" /></label>
        <div v-if="state.format === 'jpeg'" class="slider-setting quality"><label><span>JPG 品质</span><strong>{{ state.quality }}%</strong></label><el-slider v-model="state.quality" :min="40" :max="100" /></div>
        <div class="export-summary"><span>最终文件</span><strong>{{ hasImage ? `${outputDimensions.width} × ${outputDimensions.height}` : '等待图片' }}</strong><small>{{ formatLabel }}</small></div>
        <button v-if="hasImage" type="button" class="clear-action" aria-label="移除当前梗图图片" @click="clearImage"><el-icon><Picture /></el-icon>移除当前图片</button>
        <a class="related-link" href="/electronicpatina/">下一步：为成品添加电子包浆效果 →</a>
      </aside>
    </div>

    <ToolDetail title="使用与隐私说明"><div class="detail-copy">载入图片后可直接编辑多行字幕，也可以开启自动换行，让文字按图片宽度排成最多五行。黑底和白底适合信息型字幕，透明描边适合保留更多画面；输出比例只改变最终像素尺寸，不会修改原文件。图片读取、画布合成、复制与下载全部在当前浏览器完成，不会上传到服务器。</div></ToolDetail>
  </div>
</template>

<style scoped>
.meme-page{gap:18px}.studio-hero,.preview-card,.control-card,.export-card{border:1px solid #e2e8f0;border-radius:22px;background:#fff;box-shadow:0 14px 36px rgba(15,23,42,.06)}.studio-hero{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:26px;padding:30px;background:radial-gradient(circle at 86% 14%,rgba(56,189,248,.28),transparent 35%),linear-gradient(135deg,#0f172a,#0c4a6e 58%,#0369a1);color:#fff}.eyebrow{display:block;margin-bottom:8px;color:#7dd3fc;font-size:11px;font-weight:900;letter-spacing:.17em}.studio-hero h2{margin:0;font-size:28px;line-height:1.25}.studio-hero p{max-width:720px;margin:12px 0 0;color:#bae6fd;line-height:1.8}.hero-stats{display:grid;grid-template-columns:repeat(3,104px);align-items:center}.hero-stats div{text-align:center;border-left:1px solid rgba(255,255,255,.18)}.hero-stats strong,.hero-stats span{display:block}.hero-stats strong{font-size:21px}.hero-stats span{margin-top:5px;color:#bae6fd;font-size:11px}.preview-card,.control-card,.export-card{padding:22px}.preview-heading,.card-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.preview-heading h3,.card-heading h3{margin:0;color:#0f172a;font-size:20px}.preview-heading p{margin:5px 0 0;color:#64748b;font-size:13px}.preview-actions{display:flex;gap:8px;flex-wrap:wrap}.preview-actions button,.card-heading>button,.clear-action{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:38px;padding:0 13px;border:1px solid #dbe3ef;border-radius:10px;background:#fff;color:#475569;font-weight:750;cursor:pointer}.preview-actions button.primary{border-color:#0284c7;background:#0284c7;color:#fff}.preview-actions button:disabled{cursor:not-allowed;opacity:.45}.canvas-stage{display:flex;align-items:center;justify-content:center;box-sizing:border-box;height:440px;margin-top:18px;padding:18px;overflow:hidden;border-radius:16px;background:#f1f5f9}.canvas-stage canvas{display:block;width:min(100%,720px);height:auto;max-height:100%;border-radius:9px;box-shadow:0 12px 30px rgba(15,23,42,.18)}.preview-meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.preview-meta span{padding:5px 9px;border-radius:999px;background:#e0f2fe;color:#0369a1;font-size:11px;font-weight:750}.workspace-grid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(300px,.7fr);gap:18px}.card-heading{margin-bottom:20px}.card-heading>button{min-height:34px;padding:0 10px}.text-field,.segment-grid label,.option-field{display:flex;flex-direction:column;gap:8px}.text-field>span,.text-presets>span,.style-presets>span,.segment-grid label>span,.option-field>span{color:#64748b;font-size:12px;font-weight:800}.text-presets,.style-presets{margin-top:16px}.text-presets>div{display:flex;flex-wrap:wrap;gap:7px;margin-top:8px}.text-presets button{padding:7px 10px;border:1px solid #e2e8f0;border-radius:999px;background:#f8fafc;color:#475569;font-size:12px;cursor:pointer}.style-presets>div{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:8px}.style-presets button{display:flex;flex-direction:column;gap:3px;padding:10px;border:1px solid #e2e8f0;border-radius:11px;background:#f8fafc;color:#334155;text-align:left;cursor:pointer}.style-presets button:hover,.text-presets button:hover{border-color:#38bdf8;background:#f0f9ff}.style-presets small{color:#94a3b8}.segment-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:18px}.segment-grid :deep(.el-segmented),.option-field :deep(.el-segmented){width:100%}.switch-row{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:16px;padding:12px 13px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc}.switch-row div{display:flex;flex-direction:column}.switch-row strong{color:#334155;font-size:13px}.switch-row span{margin-top:3px;color:#94a3b8;font-size:11px}.slider-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px 22px;margin-top:18px}.slider-setting label{display:flex;justify-content:space-between;color:#64748b;font-size:12px;font-weight:800}.slider-setting strong{color:#0284c7}.slider-setting :deep(.el-slider){padding:0 5px}.summary-list{display:grid;gap:1px;overflow:hidden;border:1px solid #e2e8f0;border-radius:13px;background:#e2e8f0}.summary-list div{display:flex;justify-content:space-between;padding:13px;background:#f8fafc;color:#64748b;font-size:12px}.summary-list strong{color:#1e293b}.option-field{margin-top:17px}.quality{margin-top:18px}.export-summary{display:flex;flex-direction:column;margin-top:18px;padding:18px;border-radius:15px;background:linear-gradient(135deg,#0369a1,#0e7490);color:#fff}.export-summary span,.export-summary small{color:#bae6fd;font-size:11px}.export-summary strong{margin:5px 0;font-size:24px}.clear-action{width:100%;margin-top:13px}.related-link{display:block;margin-top:14px;color:#0284c7;font-size:12px;font-weight:750}.detail-copy{color:#64748b;font-size:14px;line-height:1.9}.dark .preview-card,.dark .control-card,.dark .export-card{border-color:#334155;background:#1e293b}.dark .preview-heading h3,.dark .card-heading h3{color:#f8fafc}.dark .preview-heading p,.dark .text-field>span,.dark .text-presets>span,.dark .style-presets>span,.dark .segment-grid label>span,.dark .option-field>span{color:#94a3b8}.dark .preview-actions button,.dark .card-heading>button,.dark .clear-action{border-color:#475569;background:#0f172a;color:#cbd5e1}.dark .canvas-stage{background:#0f172a}.dark .preview-meta span{background:#0c4a6e;color:#bae6fd}.dark .text-presets button,.dark .style-presets button,.dark .switch-row,.dark .summary-list div{border-color:#334155;background:#0f172a;color:#94a3b8}.dark .style-presets button:hover,.dark .text-presets button:hover{border-color:#38bdf8;background:#0c3045}.dark .switch-row strong,.dark .summary-list strong{color:#e2e8f0}.dark .summary-list{border-color:#334155;background:#334155}@media(max-width:980px){.studio-hero{grid-template-columns:1fr}.hero-stats{grid-template-columns:repeat(3,1fr)}.workspace-grid{grid-template-columns:1fr}}@media(max-width:680px){.meme-page{gap:14px}.studio-hero,.preview-card,.control-card,.export-card{border-radius:18px}.studio-hero{padding:22px 18px}.studio-hero h2{font-size:24px}.hero-stats div:first-child{border-left:0}.preview-card,.control-card,.export-card{padding:15px}.preview-heading{flex-direction:column}.preview-actions{width:100%}.preview-actions>*{flex:1}.preview-actions button{width:100%}.canvas-stage{height:260px;padding:12px}.style-presets>div,.segment-grid,.slider-grid{grid-template-columns:1fr 1fr}.preview-meta{gap:6px}}@media(max-width:430px){.style-presets>div,.segment-grid,.slider-grid{grid-template-columns:1fr}}
</style>
