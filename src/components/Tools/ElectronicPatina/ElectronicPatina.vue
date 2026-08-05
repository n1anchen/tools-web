<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import type { UploadFile } from 'element-plus'
import { ElMessage } from 'element-plus'
import { Close, Download, Picture, Refresh, VideoPlay } from '@element-plus/icons-vue'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import { autoDown, formatBytes } from '@/utils/file'
import { applyPatinaPixels, buildPatinaFilename, getPatinaProfile } from '@/utils/electronicPatina'

const patinaPresets = [
  { label: '轻微转发', note: '细节优先', count: 8, quality: 78 },
  { label: '经典包浆', note: '绿色明显', count: 24, quality: 48 },
  { label: '重度失真', note: '多代传播', count: 46, quality: 24 },
  { label: '极限实验', note: '强烈损伤', count: 75, quality: 9 },
]
const sizeOptions = [
  { label: '1280 边长', value: 1280 },
  { label: '1920 边长', value: 1920 },
  { label: '保持原图', value: 0 },
]

const compressionCount = ref(24)
const quality = ref(48)
const maxEdge = ref(1920)
const processing = ref(false)
const progress = ref(0)
const status = ref('载入图片后即可开始实验')
const originalImage = ref<string | null>(null)
const resultImage = ref<string | null>(null)
const originalFile = ref<File | null>(null)
const resultBlob = ref<Blob | null>(null)
const dimensions = ref({ width: 0, height: 0 })
const outputDimensions = ref({ width: 0, height: 0 })
let processId = 0

const profile = computed(() => getPatinaProfile(compressionCount.value, quality.value))
const originalSizeLabel = computed(() => originalFile.value ? formatBytes(originalFile.value.size) : '—')
const resultSizeLabel = computed(() => resultBlob.value ? formatBytes(resultBlob.value.size) : '—')

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
}

function loadDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => resolve(event.target?.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, qualityValue: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('JPEG 编码失败')), 'image/jpeg', qualityValue)
  })
}

function getTargetDimensions(width: number, height: number) {
  if (!maxEdge.value || Math.max(width, height) <= maxEdge.value) return { width, height }
  const ratio = maxEdge.value / Math.max(width, height)
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) }
}

async function handleFileChange(uploadFile: UploadFile) {
  const file = uploadFile.raw
  if (!file) return
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
    ElMessage.error('请选择 JPG、PNG、WebP 或 GIF 图片')
    return
  }
  if (file.size > 20 * 1024 * 1024) {
    ElMessage.error('图片文件不能超过 20 MB')
    return
  }
  try {
    const dataUrl = await loadDataUrl(file)
    const image = await loadImage(dataUrl)
    processId += 1
    originalFile.value = file
    originalImage.value = dataUrl
    dimensions.value = { width: image.naturalWidth, height: image.naturalHeight }
    if (resultImage.value) URL.revokeObjectURL(resultImage.value)
    resultImage.value = null
    resultBlob.value = null
    outputDimensions.value = { width: 0, height: 0 }
    progress.value = 0
    status.value = '图片已就绪，选择预设或调整参数'
    ElMessage.success(`已载入 ${image.naturalWidth} × ${image.naturalHeight} 图片`)
  } catch {
    ElMessage.error('图片读取失败，请尝试其他文件')
  }
}

function applyPreset(preset: typeof patinaPresets[number]) {
  compressionCount.value = preset.count
  quality.value = preset.quality
}

async function simulate() {
  if (!originalImage.value || processing.value) {
    if (!originalImage.value) ElMessage.warning('请先载入一张图片')
    return
  }
  const currentId = ++processId
  processing.value = true
  progress.value = 0
  if (resultImage.value) URL.revokeObjectURL(resultImage.value)
  resultImage.value = null
  resultBlob.value = null
  status.value = '正在初始化画布…'
  await nextFrame()

  try {
    const image = await loadImage(originalImage.value)
    const target = getTargetDimensions(image.naturalWidth, image.naturalHeight)
    const canvas = document.createElement('canvas')
    canvas.width = target.width
    canvas.height = target.height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('浏览器无法创建画布')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const jpegQuality = quality.value / 100

    for (let index = 0; index < compressionCount.value; index += 1) {
      if (currentId !== processId) throw new Error('PROCESS_CANCELLED')
      if (index % 3 === 0) await nextFrame()
      status.value = `正在进行第 ${index + 1} / ${compressionCount.value} 次压缩`

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
      applyPatinaPixels(imageData.data)
      context.putImageData(imageData, 0, 0)
      const dataUrl = canvas.toDataURL('image/jpeg', Math.min(1, jpegQuality + Math.random() * .06))
      const compressed = await loadImage(dataUrl)
      const jitter = 2
      const dx = (Math.random() * jitter * 2 - jitter) / 2
      const dy = (Math.random() * jitter * 2 - jitter) / 2
      context.fillStyle = '#fff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(compressed, -dx, -dy, canvas.width + dx, canvas.height + dy)
      progress.value = Math.round(((index + 1) / compressionCount.value) * 100)
    }

    if (currentId !== processId) throw new Error('PROCESS_CANCELLED')
    const blob = await canvasToBlob(canvas, Math.min(1, jpegQuality + .03))
    resultBlob.value = blob
    resultImage.value = URL.createObjectURL(blob)
    outputDimensions.value = target
    progress.value = 100
    status.value = '包浆完成，可对比原图并下载结果'
    ElMessage.success('电子包浆处理完成')
  } catch (error) {
    if (error instanceof Error && error.message === 'PROCESS_CANCELLED') status.value = '处理已取消，参数和原图仍保留'
    else {
      status.value = '处理失败，请降低输出尺寸后重试'
      ElMessage.error('处理图片时出错')
    }
  } finally {
    if (currentId === processId) processing.value = false
  }
}

function cancelProcessing() {
  processId += 1
  processing.value = false
  status.value = '处理已取消，参数和原图仍保留'
}

function downloadResult() {
  if (!resultBlob.value || !originalFile.value) return
  const url = URL.createObjectURL(resultBlob.value)
  autoDown(url, buildPatinaFilename(originalFile.value.name, compressionCount.value, quality.value))
}

function reset() {
  processId += 1
  if (resultImage.value) URL.revokeObjectURL(resultImage.value)
  processing.value = false
  originalImage.value = null
  resultImage.value = null
  originalFile.value = null
  resultBlob.value = null
  dimensions.value = { width: 0, height: 0 }
  outputDimensions.value = { width: 0, height: 0 }
  compressionCount.value = 24
  quality.value = 48
  maxEdge.value = 1920
  progress.value = 0
  status.value = '载入图片后即可开始实验'
}

onUnmounted(() => {
  processId += 1
  if (resultImage.value) URL.revokeObjectURL(resultImage.value)
})
</script>

<template>
  <div class="patina-page flex flex-col mt-3 flex-1">
    <ToolHero summary="模拟一张图片，被反复转发后的痕迹">
      <template #metrics>
        <div class="hero-metrics">
          <div><span>强度评分</span><strong>{{ profile.score }}</strong></div>
          <div><span>压缩轮次</span><strong>{{ compressionCount }}×</strong></div>
          <div><span>单轮质量</span><strong>{{ quality }}%</strong></div>
        </div>
      </template>
    </ToolHero>

    <section class="comparison-card">
      <header class="comparison-heading"><div><span class="eyebrow">BEFORE / AFTER</span><h3>原图与包浆结果</h3><p>{{ status }}</p></div><div class="top-actions"><el-upload :show-file-list="false" accept="image/png,image/jpeg,image/webp,image/gif" :on-change="handleFileChange" :auto-upload="false"><template #trigger><button type="button" aria-label="载入需要包浆的图片"><el-icon><Picture /></el-icon>{{ originalImage ? '更换图片' : '载入图片' }}</button></template></el-upload><button v-if="resultImage" type="button" class="download" aria-label="下载电子包浆结果图片" @click="downloadResult"><el-icon><Download /></el-icon>下载结果</button></div></header>
      <div class="compare-grid">
        <div class="image-panel"><div class="panel-label"><strong>原图</strong><span>{{ originalImage ? `${dimensions.width} × ${dimensions.height} · ${originalSizeLabel}` : '等待载入' }}</span></div><div class="image-stage"><img v-if="originalImage" :src="originalImage" alt="电子包浆原图" /><div v-else class="empty-state"><el-icon><Picture /></el-icon><strong>载入一张图片</strong><span>支持拖入或点击选择</span></div></div></div>
        <div class="image-panel"><div class="panel-label"><strong>包浆结果</strong><span>{{ resultImage ? `${outputDimensions.width} × ${outputDimensions.height} · ${resultSizeLabel}` : profile.label }}</span></div><div class="image-stage"><img v-if="resultImage" :src="resultImage" alt="电子包浆处理结果" /><div v-else class="empty-state"><el-icon><Picture /></el-icon><strong>{{ processing ? `正在处理 ${progress}%` : '等待生成结果' }}</strong><span>{{ processing ? status : '调整参数后开始包浆' }}</span></div><div v-if="processing" class="processing-overlay"><div class="progress-ring" :style="{ '--progress': `${progress * 3.6}deg` }"><span>{{ progress }}%</span></div><button type="button" aria-label="取消电子包浆处理" @click="cancelProcessing"><el-icon><Close /></el-icon>取消处理</button></div></div></div>
      </div>
      <div class="comparison-meta"><span>{{ profile.label }}</span><span>强度 {{ profile.score }} / 100</span><span>{{ maxEdge ? `最长边 ${maxEdge}px` : '保持原始尺寸' }}</span><span>JPEG · 本地生成</span></div>
    </section>

    <div class="workspace-grid">
      <section class="control-card">
        <header class="card-heading"><div><span class="eyebrow">PATINA RECIPE</span><h3>包浆配方</h3></div><button type="button" aria-label="重置电子包浆实验" @click="reset"><el-icon><Refresh /></el-icon>重置</button></header>
        <div class="preset-grid"><button v-for="preset in patinaPresets" :key="preset.label" type="button" @click="applyPreset(preset)"><strong>{{ preset.label }}</strong><small>{{ preset.note }}</small><span>{{ preset.count }} 次 · {{ preset.quality }}%</span></button></div>
        <div class="slider-setting"><label><span>重复压缩次数</span><strong>{{ compressionCount }} 次</strong></label><el-slider v-model="compressionCount" :min="1" :max="100" :disabled="processing" /></div>
        <div class="slider-setting"><label><span>单轮 JPEG 质量</span><strong>{{ quality }}%</strong></label><el-slider v-model="quality" :min="1" :max="99" :disabled="processing" /></div>
        <label class="option-field"><span>输出尺寸</span><el-segmented v-model="maxEdge" :options="sizeOptions" :disabled="processing" /></label>
        <div class="intensity-card"><div><span>预计效果</span><strong>{{ profile.label }}</strong><p>{{ profile.description }}</p></div><div class="intensity-meter"><i :style="{ width: `${profile.score}%` }"></i></div></div>
        <div class="process-actions"><button v-if="!processing" type="button" class="primary" aria-label="开始或重新运行电子包浆处理" :disabled="!originalImage" @click="simulate"><el-icon><VideoPlay /></el-icon>{{ resultImage ? '按当前参数重新处理' : '开始包浆' }}</button><button v-else type="button" class="cancel" aria-label="取消电子包浆处理" @click="cancelProcessing"><el-icon><Close /></el-icon>取消处理</button></div>
      </section>

      <aside class="insight-card">
        <header class="card-heading"><div><span class="eyebrow">DAMAGE REPORT</span><h3>损伤报告</h3></div></header>
        <div class="score-ring" :style="{ '--score': `${profile.score * 3.6}deg` }"><div><strong>{{ profile.score }}</strong><span>/ 100</span></div></div>
        <div class="summary-list"><div><span>色度偏移</span><strong>{{ profile.score < 30 ? '轻微' : profile.score < 65 ? '明显' : '强烈' }}</strong></div><div><span>边缘损伤</span><strong>{{ quality > 65 ? '较少' : quality > 30 ? '中等' : '严重' }}</strong></div><div><span>处理轮次</span><strong>{{ compressionCount }} 次</strong></div><div><span>结果体积</span><strong>{{ resultSizeLabel }}</strong></div></div>
        <div class="privacy-note"><strong>完全本地处理</strong><span>原图、压缩中间帧和结果图片均不会离开浏览器。</span></div>
        <a class="related-link" href="/memecaption/">先为图片添加字幕梗图 →</a>
      </aside>
    </div>

    <ToolGuide title="原理与使用建议"><div class="detail-copy"><strong>电子包浆</strong>是图片经历多次 JPEG 保存后产生的色偏、边缘模糊和块状噪点。本工具在浏览器内重复执行色度通道偏移、JPEG 有损压缩与轻微像素抖动：次数越多、质量越低，效果越强。建议先用“经典包浆”预设观察，再根据原图细节调整；大尺寸图片可限制最长边，以缩短处理时间并减少内存占用。</div></ToolGuide>
  </div>
</template>

<style scoped>
.patina-page{gap:18px}.comparison-card,.control-card,.insight-card{border:1px solid #e2e8f0;border-radius:22px;background:#fff;box-shadow:0 14px 36px rgba(15,23,42,.06)}.eyebrow{display:block;margin-bottom:8px;color:#86efac;font-size:11px;font-weight:900;letter-spacing:.17em}.hero-metrics{display:grid;grid-template-columns:repeat(3,minmax(96px,1fr));min-width:320px;overflow:hidden;border:1px solid #e0e9f4;border-radius:18px;background:rgba(255,255,255,.78)}.hero-metrics div{padding:12px 14px;text-align:center;border-left:1px solid #e5edf6}.hero-metrics div:first-child{border-left:0}.hero-metrics span,.hero-metrics strong{display:block}.hero-metrics span{margin-top:4px;color:#7a899c;font-size:12px}.hero-metrics strong{overflow:hidden;color:#334155;font-size:18px;text-overflow:ellipsis;white-space:nowrap}.comparison-card,.control-card,.insight-card{padding:22px}.comparison-heading,.card-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.comparison-heading h3,.card-heading h3{margin:0;color:#0f172a;font-size:20px}.comparison-heading p{margin:5px 0 0;color:#64748b;font-size:13px}.top-actions{display:flex;gap:9px}.top-actions button,.card-heading>button,.process-actions button{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:38px;padding:0 13px;border:1px solid #dbe3ef;border-radius:10px;background:#fff;color:#475569;font-weight:750;cursor:pointer}.top-actions button.download,.process-actions button.primary{border-color:#16a34a;background:#16a34a;color:#fff}.compare-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:18px}.image-panel{overflow:hidden;border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc}.panel-label{display:flex;justify-content:space-between;gap:12px;padding:11px 14px;border-bottom:1px solid #e2e8f0}.panel-label strong{color:#334155;font-size:13px}.panel-label span{overflow:hidden;color:#94a3b8;font-size:11px;text-overflow:ellipsis;white-space:nowrap}.image-stage{position:relative;display:flex;align-items:center;justify-content:center;height:360px;padding:16px;overflow:hidden}.image-stage img{display:block;width:auto;max-width:100%;height:auto;max-height:100%;border-radius:8px}.empty-state{display:flex;align-items:center;flex-direction:column;color:#94a3b8}.empty-state .el-icon{font-size:42px}.empty-state strong{margin-top:10px;color:#64748b}.empty-state span{margin-top:4px;font-size:12px}.processing-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;background:rgba(248,250,252,.9)}.processing-overlay button{display:flex;align-items:center;gap:5px;border:0;background:transparent;color:#b91c1c;font-weight:750;cursor:pointer}.progress-ring,.score-ring{display:grid;place-items:center;border-radius:50%;background:conic-gradient(#22c55e var(--progress),#dbe5df 0)}.progress-ring{width:92px;height:92px}.progress-ring:before,.score-ring:before{content:"";grid-area:1/1;border-radius:50%;background:#fff}.progress-ring:before{width:74px;height:74px}.progress-ring span{z-index:1;grid-area:1/1;color:#166534;font-weight:900}.comparison-meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.comparison-meta span{padding:5px 9px;border-radius:999px;background:#dcfce7;color:#166534;font-size:11px;font-weight:750}.workspace-grid{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(300px,.7fr);gap:18px}.card-heading{margin-bottom:20px}.card-heading>button{min-height:34px;padding:0 10px}.preset-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.preset-grid button{display:flex;flex-direction:column;gap:3px;padding:11px;border:1px solid #e2e8f0;border-radius:11px;background:#f8fafc;color:#334155;text-align:left;cursor:pointer}.preset-grid button:hover{border-color:#4ade80;background:#f0fdf4}.preset-grid small{color:#94a3b8}.preset-grid span{margin-top:5px;color:#16a34a;font-size:10px;font-weight:750}.slider-setting{margin-top:19px}.slider-setting label{display:flex;justify-content:space-between;color:#64748b;font-size:12px;font-weight:800}.slider-setting strong{color:#16a34a}.slider-setting :deep(.el-slider){padding:0 5px}.option-field{display:flex;flex-direction:column;gap:8px;margin-top:16px}.option-field>span{color:#64748b;font-size:12px;font-weight:800}.option-field :deep(.el-segmented){width:100%}.intensity-card{margin-top:18px;padding:15px;border-radius:13px;background:#f0fdf4}.intensity-card>div:first-child{display:grid;grid-template-columns:1fr auto;gap:4px 12px}.intensity-card span{color:#64748b;font-size:11px}.intensity-card strong{color:#166534}.intensity-card p{grid-column:1/-1;margin:2px 0 0;color:#4b7b5b;font-size:12px}.intensity-meter{height:7px;margin-top:12px;overflow:hidden;border-radius:999px;background:#dcfce7}.intensity-meter i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#4ade80,#65a30d,#ca8a04)}.process-actions{display:flex;margin-top:16px}.process-actions button{width:100%}.process-actions button:disabled{cursor:not-allowed;opacity:.5}.process-actions button.cancel{border-color:#fecaca;background:#fef2f2;color:#b91c1c}.score-ring{width:150px;height:150px;margin:0 auto 18px;background:conic-gradient(#22c55e var(--score),#e2e8f0 0)}.score-ring:before{width:120px;height:120px}.score-ring>div{z-index:1;grid-area:1/1;display:flex;align-items:baseline}.score-ring strong{color:#166534;font-size:38px}.score-ring span{color:#94a3b8;font-size:12px}.summary-list{display:grid;gap:1px;overflow:hidden;border:1px solid #e2e8f0;border-radius:13px;background:#e2e8f0}.summary-list div{display:flex;justify-content:space-between;padding:12px;background:#f8fafc;color:#64748b;font-size:12px}.summary-list strong{color:#1e293b}.privacy-note{display:flex;flex-direction:column;gap:4px;margin-top:14px;padding:13px;border-radius:12px;background:#f0fdf4;color:#4b7b5b;font-size:12px}.privacy-note strong{color:#166534}.related-link{display:block;margin-top:14px;color:#16a34a;font-size:12px;font-weight:750}.detail-copy{color:#64748b;font-size:14px;line-height:1.9}:global(html.dark .patina-page .hero-metrics){border-color:#40516a;background:rgba(15,23,42,.5)}:global(html.dark .patina-page .hero-metrics div){border-color:#40516a}:global(html.dark .patina-page .hero-metrics strong){color:#e7edf6}:global(html.dark .patina-page .hero-metrics span){color:#a8b4c5}.dark .comparison-card,.dark .control-card,.dark .insight-card{border-color:#334155;background:#1e293b}.dark .comparison-heading h3,.dark .card-heading h3{color:#f8fafc}.dark .comparison-heading p,.dark .option-field>span{color:#94a3b8}.dark .top-actions button,.dark .card-heading>button{border-color:#475569;background:#0f172a;color:#cbd5e1}.dark .image-panel{border-color:#334155;background:#0f172a}.dark .panel-label{border-color:#334155}.dark .panel-label strong,.dark .empty-state strong{color:#e2e8f0}.dark .processing-overlay{background:rgba(15,23,42,.92)}.dark .progress-ring:before,.dark .score-ring:before{background:#1e293b}.dark .comparison-meta span{background:#14532d;color:#bbf7d0}.dark .preset-grid button,.dark .summary-list div{border-color:#334155;background:#0f172a;color:#94a3b8}.dark .preset-grid button:hover{border-color:#4ade80;background:#0d2e1b}.dark .intensity-card,.dark .privacy-note{background:#0d2e1b}.dark .intensity-card strong,.dark .privacy-note strong,.dark .score-ring strong{color:#86efac}.dark .intensity-card p,.dark .privacy-note{color:#86a991}.dark .summary-list{border-color:#334155;background:#334155}.dark .summary-list strong{color:#e2e8f0}@media(max-width:980px){.workspace-grid{grid-template-columns:1fr}}@media(max-width:680px){.patina-page{gap:14px}.comparison-card,.control-card,.insight-card{border-radius:18px}.hero-metrics{grid-template-columns:1fr}.hero-metrics div{border-left:0;border-bottom:1px solid #e5edf6}.hero-metrics div:last-child{border-bottom:0}.comparison-card,.control-card,.insight-card{padding:15px}.comparison-heading{flex-direction:column}.top-actions{width:100%}.top-actions>*{flex:1}.top-actions button{width:100%}.compare-grid{grid-template-columns:1fr}.image-stage{height:250px}.preset-grid{grid-template-columns:1fr 1fr}.panel-label{align-items:flex-start;flex-direction:column;gap:3px}}
</style>
