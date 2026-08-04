<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { BlobReader, BlobWriter, ZipWriter } from '@zip.js/zip.js'
import { Delete, Download, Grid, Picture, UploadFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import { autoDown } from '@/utils/file'
import { buildSliceRects, type SliceRect } from '@/utils/imageStudio'

const MAX_IMAGE_BYTES = 30 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

interface SliceItem extends SliceRect {
  blob: Blob
  url: string
}

const fileInput = ref<HTMLInputElement | null>(null)
const sourceImage = ref<HTMLImageElement | null>(null)
const sourceUrl = ref('')
const objectUrl = ref('')
const dragging = ref(false)
const processing = ref(false)
const exporting = ref(false)
const slices = ref<SliceItem[]>([])
const fileMeta = reactive({ name: '', size: 0, type: '', width: 0, height: 0 })
const state = reactive({
  rows: 3,
  columns: 3,
  format: 'png' as 'png' | 'jpeg' | 'webp',
  quality: .92,
})
let rebuildVersion = 0
let rebuildTimer: ReturnType<typeof setTimeout> | undefined

const presets = [
  { label: '四宫格', detail: '2 × 2', rows: 2, columns: 2 },
  { label: '九宫格', detail: '3 × 3', rows: 3, columns: 3 },
  { label: '横向三格', detail: '1 × 3', rows: 1, columns: 3 },
  { label: '纵向三格', detail: '3 × 1', rows: 3, columns: 1 },
]

const sliceCount = computed(() => state.rows * state.columns)
const maxRows = computed(() => Math.max(1, Math.min(10, fileMeta.height || 10)))
const maxColumns = computed(() => Math.max(1, Math.min(10, fileMeta.width || 10)))
const gridStyle = computed(() => ({
  gridTemplateRows: `repeat(${state.rows}, 1fr)`,
  gridTemplateColumns: `repeat(${state.columns}, 1fr)`,
}))
const extension = computed(() => state.format === 'jpeg' ? 'jpg' : state.format)
const formatLabel = computed(() => state.format === 'jpeg' ? 'JPG' : state.format.toUpperCase())
const sizeRange = computed(() => {
  if (!slices.value.length) return '—'
  const widths = slices.value.map(item => item.width)
  const heights = slices.value.map(item => item.height)
  const widthText = Math.min(...widths) === Math.max(...widths) ? `${widths[0]}` : `${Math.min(...widths)}–${Math.max(...widths)}`
  const heightText = Math.min(...heights) === Math.max(...heights) ? `${heights[0]}` : `${Math.min(...heights)}–${Math.max(...heights)}`
  return `${widthText} × ${heightText}`
})
const totalOutputBytes = computed(() => slices.value.reduce((sum, item) => sum + item.blob.size, 0))
const formattedOutputSize = computed(() => formatBytes(totalOutputBytes.value))
const formattedInputSize = computed(() => formatBytes(fileMeta.size))

function formatBytes(bytes: number) {
  if (!bytes) return '—'
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

function releaseSource() {
  if (objectUrl.value) URL.revokeObjectURL(objectUrl.value)
  objectUrl.value = ''
}

function releaseSlices(items = slices.value) {
  items.forEach(item => URL.revokeObjectURL(item.url))
  if (items === slices.value) slices.value = []
}

function loadSource(source: string, meta: { name: string; size: number; type: string }, revoke = false) {
  releaseSource()
  releaseSlices()
  if (revoke) objectUrl.value = source
  sourceUrl.value = source
  Object.assign(fileMeta, { ...meta, width: 0, height: 0 })
}

function loadFile(file?: File) {
  if (!file) return
  if (!ALLOWED_TYPES.has(file.type)) {
    ElMessage.warning('请选择 PNG、JPEG 或 WebP 图片')
    return
  }
  if (file.size > MAX_IMAGE_BYTES) {
    ElMessage.warning('图片不能超过 30 MB')
    return
  }
  loadSource(URL.createObjectURL(file), { name: file.name, size: file.size, type: file.type }, true)
}

function handleInput(event: Event) {
  loadFile((event.target as HTMLInputElement).files?.[0])
}

function handleDrop(event: DragEvent) {
  dragging.value = false
  loadFile(event.dataTransfer?.files?.[0])
}

function loadDemo() {
  const canvas = document.createElement('canvas')
  canvas.width = 1201
  canvas.height = 901
  const context = canvas.getContext('2d')!
  const colors = ['#0f172a', '#1d4ed8', '#0d9488', '#f97316', '#7c3aed', '#e11d48']
  colors.forEach((color, index) => {
    const column = index % 3
    const row = Math.floor(index / 3)
    context.fillStyle = color
    context.fillRect(column * 401, row * 451, 401, 451)
    context.fillStyle = '#ffffff'
    context.font = '800 92px system-ui, sans-serif'
    context.textAlign = 'center'
    context.fillText(String(index + 1).padStart(2, '0'), column * 401 + 200, row * 451 + 245)
  })
  context.textAlign = 'left'
  context.font = '700 28px system-ui, sans-serif'
  context.fillStyle = 'rgba(255,255,255,.8)'
  context.fillText('1201 × 901 · 可验证除不尽时的完整分割', 28, 42)
  const source = canvas.toDataURL('image/png')
  loadSource(source, { name: '精确分割示例.png', size: Math.round(source.length * .75), type: 'image/png' })
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('图片编码失败')), `image/${state.format}`, state.quality)
  })
}

async function rebuildSlices() {
  const image = sourceImage.value
  if (!image || !image.naturalWidth) return
  const version = ++rebuildVersion
  processing.value = true
  const nextItems: SliceItem[] = []
  try {
    const rects = buildSliceRects(image.naturalWidth, image.naturalHeight, state.rows, state.columns)
    for (const rect of rects) {
      if (version !== rebuildVersion) break
      const canvas = document.createElement('canvas')
      canvas.width = rect.width
      canvas.height = rect.height
      const context = canvas.getContext('2d')!
      if (state.format === 'jpeg') {
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, canvas.width, canvas.height)
      }
      context.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height)
      const blob = await canvasToBlob(canvas)
      nextItems.push({ ...rect, blob, url: URL.createObjectURL(blob) })
    }
    if (version !== rebuildVersion) {
      releaseSlices(nextItems)
      return
    }
    releaseSlices()
    slices.value = nextItems
  } catch (error) {
    releaseSlices(nextItems)
    ElMessage.error(error instanceof Error ? error.message : '图片分割失败')
  } finally {
    if (version === rebuildVersion) processing.value = false
  }
}

function handleImageReady() {
  const image = sourceImage.value
  if (!image) return
  fileMeta.width = image.naturalWidth
  fileMeta.height = image.naturalHeight
  state.rows = Math.min(state.rows, maxRows.value)
  state.columns = Math.min(state.columns, maxColumns.value)
  rebuildSlices()
}

function applyPreset(preset: typeof presets[number]) {
  state.rows = Math.min(preset.rows, maxRows.value)
  state.columns = Math.min(preset.columns, maxColumns.value)
}

function sliceFilename(item: SliceItem) {
  const baseName = fileMeta.name.replace(/\.[^.]+$/, '') || 'image'
  const index = item.row * state.columns + item.column + 1
  return `${baseName}-${String(index).padStart(2, '0')}-r${item.row + 1}c${item.column + 1}.${extension.value}`
}

function downloadSlice(item: SliceItem) {
  autoDown(URL.createObjectURL(item.blob), sliceFilename(item))
}

async function downloadZip() {
  if (!slices.value.length || processing.value) return
  exporting.value = true
  try {
    const writer = new BlobWriter('application/zip')
    const zip = new ZipWriter(writer)
    for (const item of slices.value) {
      await zip.add(sliceFilename(item), new BlobReader(item.blob))
    }
    const blob = await zip.close()
    const baseName = fileMeta.name.replace(/\.[^.]+$/, '') || 'image'
    autoDown(URL.createObjectURL(blob), `${baseName}-${state.rows}x${state.columns}.zip`)
    ElMessage.success(`已打包 ${slices.value.length} 张切片`)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'ZIP 打包失败')
  } finally {
    exporting.value = false
  }
}

function clearAll() {
  rebuildVersion += 1
  releaseSource()
  releaseSlices()
  sourceUrl.value = ''
  Object.assign(fileMeta, { name: '', size: 0, type: '', width: 0, height: 0 })
  if (fileInput.value) fileInput.value.value = ''
}

watch(
  [() => state.rows, () => state.columns, () => state.format, () => state.quality],
  () => {
    if (!sourceUrl.value || !fileMeta.width) return
    if (rebuildTimer) clearTimeout(rebuildTimer)
    rebuildTimer = setTimeout(rebuildSlices, 160)
  },
)

onBeforeUnmount(() => {
  if (rebuildTimer) clearTimeout(rebuildTimer)
  rebuildVersion += 1
  releaseSource()
  releaseSlices()
})
</script>

<template>
  <div class="cut-page flex flex-col mt-3 flex-1">
    <ToolHero legacy #default="{ toolInfo }">

    <section class="hero-card">
      <div><span class="eyebrow">PRECISION IMAGE SLICER</span><h2>每一格，都完整覆盖原图</h2><p>{{ toolInfo.desc }}</p></div>
      <div class="hero-formula"><strong>{{ sourceUrl ? `${state.rows} × ${state.columns}` : 'R × C' }}</strong><span>{{ sourceUrl ? `${sliceCount} 张切片` : '自由网格' }}</span></div>
    </section>
    </ToolHero>

    <input ref="fileInput" class="sr-only" type="file" accept="image/png,image/jpeg,image/webp" @change="handleInput">

    <section
      v-if="!sourceUrl"
      class="upload-card"
      :class="{ dragging }"
      @dragenter.prevent="dragging = true"
      @dragover.prevent
      @dragleave.prevent="dragging = false"
      @drop.prevent="handleDrop"
    >
      <div class="upload-icon"><el-icon><Grid /></el-icon></div>
      <span class="eyebrow">DROP TO SLICE</span>
      <h3>选择一张要分割的图片</h3>
      <p>适合朋友圈九宫格、轮播图、长图拆分与设计素材切片，支持 PNG、JPEG、WebP，最大 30 MB。</p>
      <div class="upload-actions"><el-button type="primary" size="large" :icon="UploadFilled" @click="fileInput?.click()">选择图片</el-button><el-button size="large" @click="loadDemo">载入精确分割示例</el-button></div>
    </section>

    <template v-else>
      <section class="studio-grid">
        <article class="preview-card">
          <header class="card-heading">
            <div><span class="eyebrow">CUT PREVIEW</span><h3>切线预览</h3></div>
            <div class="header-actions"><el-button :icon="Picture" @click="fileInput?.click()">换图</el-button><el-button type="danger" plain :icon="Delete" @click="clearAll">移除</el-button></div>
          </header>
          <div class="image-stage">
            <div class="image-frame">
              <img ref="sourceImage" :src="sourceUrl" alt="待分割原图" @load="handleImageReady">
              <div class="grid-overlay" :style="gridStyle"><span v-for="index in sliceCount" :key="index">{{ index }}</span></div>
            </div>
            <div v-if="processing" class="processing-mask">正在生成 {{ sliceCount }} 张切片…</div>
          </div>
          <div class="source-meta"><div><span>文件</span><strong>{{ fileMeta.name }}</strong></div><div><span>原图尺寸</span><strong>{{ fileMeta.width }} × {{ fileMeta.height }}</strong></div><div><span>源文件</span><strong>{{ formattedInputSize }}</strong></div></div>
        </article>

        <aside class="settings-card">
          <header class="card-heading"><div><span class="eyebrow">GRID SETTINGS</span><h3>分割设置</h3></div><span class="status-pill">{{ sliceCount }} slices</span></header>
          <div class="preset-grid"><button v-for="preset in presets" :key="preset.label" type="button" :class="{ active: state.rows === preset.rows && state.columns === preset.columns }" @click="applyPreset(preset)"><strong>{{ preset.label }}</strong><span>{{ preset.detail }}</span></button></div>
          <div class="number-grid">
            <div class="field-group"><label>行数</label><el-input-number v-model="state.rows" :min="1" :max="maxRows" /></div>
            <div class="swap-symbol">×</div>
            <div class="field-group"><label>列数</label><el-input-number v-model="state.columns" :min="1" :max="maxColumns" /></div>
          </div>
          <div class="setting-note"><b>像素完整性</b><p>每条切线按比例四舍五入，相邻切片共用边界，因此所有切片面积之和始终等于原图。</p></div>
          <div class="field-group"><label>输出格式</label><el-radio-group v-model="state.format"><el-radio-button value="png">PNG</el-radio-button><el-radio-button value="jpeg">JPG</el-radio-button><el-radio-button value="webp">WebP</el-radio-button></el-radio-group></div>
          <div v-if="state.format !== 'png'" class="slider-field"><label><span>输出质量</span><strong>{{ Math.round(state.quality * 100) }}%</strong></label><el-slider v-model="state.quality" :min=".4" :max="1" :step=".02" /></div>
          <div class="output-summary"><div><span>单片尺寸</span><strong>{{ sizeRange }}</strong></div><div><span>预计总大小</span><strong>{{ formattedOutputSize }}</strong></div><div><span>文件格式</span><strong>{{ formatLabel }}</strong></div></div>
          <el-button class="zip-button" type="primary" size="large" :icon="Download" :loading="exporting" :disabled="processing || !slices.length" @click="downloadZip">打包下载 {{ slices.length }} 张切片</el-button>
        </aside>
      </section>

      <section class="results-card">
        <header class="card-heading"><div><span class="eyebrow">OUTPUT TILES</span><h3>切片结果</h3></div><span class="result-hint">点击任意切片可单独下载</span></header>
        <div v-if="slices.length" class="result-grid" :style="{ '--columns': Math.min(state.columns, 6) }">
          <button v-for="(item, index) in slices" :key="item.url" type="button" @click="downloadSlice(item)">
            <img :src="item.url" :alt="`第 ${index + 1} 张切片`">
            <span><b>{{ String(index + 1).padStart(2, '0') }}</b>{{ item.width }} × {{ item.height }}<el-icon><Download /></el-icon></span>
          </button>
        </div>
        <div v-else class="result-loading">正在准备切片结果…</div>
      </section>
    </template>

    <section class="feature-strip"><article><b>01</b><div><strong>行列可独立设置</strong><p>不仅支持四宫格和九宫格，也能拆成长条、轮播切片或任意矩形网格。</p></div></article><article><b>02</b><div><strong>完整像素覆盖</strong><p>修复旧版整除取整导致右侧与底部像素被遗失的问题。</p></div></article><article><b>03</b><div><strong>ZIP 批量导出</strong><p>切片按行列编号保存，也可以点击缩略图单独下载。</p></div></article></section>

    <ToolGuide title="使用说明"><p>上传图片后选择预设或分别设置行数、列数，页面会实时显示切线并重新生成切片。PNG 保留透明通道；JPG/WebP 可控制输出质量。点击切片可单独保存，也可以一键打包为 ZIP。</p></ToolGuide>
  </div>
</template>

<style scoped>
.cut-page { --cut-accent: #0d9488; gap: 16px; }.hero-card,.upload-card,.preview-card,.settings-card,.results-card,.feature-strip article { border: 1px solid #e2e8f0; background: #fff; box-shadow: 0 16px 40px rgba(15,23,42,.06); }.hero-card { display:flex;justify-content:space-between;align-items:center;gap:24px;padding:28px 30px;border:0;border-radius:24px;color:#fff;background:radial-gradient(circle at 78% 20%,rgba(45,212,191,.35),transparent 24%),linear-gradient(135deg,#042f2e,#0f766e 55%,#1d4ed8);}.eyebrow{display:block;margin-bottom:6px;color:#0f766e;font-size:11px;font-weight:900;letter-spacing:.16em}.hero-card .eyebrow{color:#99f6e4}.hero-card h2{margin:0;font-size:clamp(24px,3vw,36px);font-weight:850;letter-spacing:-.03em}.hero-card p{max-width:710px;margin:10px 0 0;color:#ccfbf1;line-height:1.7}.hero-formula{display:grid;place-items:center;flex:0 0 150px;min-height:96px;border:1px solid rgba(255,255,255,.2);border-radius:20px;background:rgba(255,255,255,.1)}.hero-formula strong{font-size:28px}.hero-formula span{color:#ccfbf1;font-size:11px}.upload-card{min-height:430px;padding:58px 24px;border-radius:24px;text-align:center;display:grid;place-items:center;align-content:center;transition:.2s}.upload-card.dragging{border-color:#14b8a6;background:#f0fdfa;transform:translateY(-2px)}.upload-icon{display:grid;place-items:center;width:72px;height:72px;margin-bottom:18px;border-radius:22px;color:#fff;font-size:34px;background:linear-gradient(145deg,#0d9488,#2563eb);box-shadow:0 14px 28px rgba(13,148,136,.24)}.upload-card h3,.card-heading h3{margin:0;color:#0f172a}.upload-card h3{font-size:24px}.upload-card p{max-width:610px;margin:10px auto 22px;color:#64748b;line-height:1.7}.upload-actions{display:flex;gap:10px}.studio-grid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(330px,.8fr);gap:16px;align-items:start}.preview-card,.settings-card,.results-card{padding:20px;border-radius:24px}.settings-card{position:sticky;top:82px}.card-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}.card-heading .eyebrow{margin-bottom:3px}.header-actions{display:flex;gap:8px}.status-pill{padding:5px 9px;border-radius:999px;color:#0f766e;background:#ccfbf1;font-size:10px;font-weight:800;text-transform:uppercase}.image-stage{position:relative;min-height:400px;display:grid;place-items:center;padding:18px;overflow:auto;border-radius:18px;background:#0f172a}.image-frame{position:relative;display:inline-flex;max-width:100%;max-height:68vh}.image-frame img{display:block;max-width:100%;max-height:68vh;object-fit:contain}.grid-overlay{position:absolute;inset:0;display:grid;pointer-events:none}.grid-overlay span{display:grid;place-items:center;border:1px solid rgba(255,255,255,.86);color:#fff;font-size:11px;font-weight:800;text-shadow:0 1px 4px #000;background:rgba(15,23,42,.08)}.processing-mask{position:absolute;inset:0;display:grid;place-items:center;color:#fff;background:rgba(15,23,42,.62);font-size:13px}.source-meta{display:grid;grid-template-columns:1.5fr 1fr 1fr;margin-top:14px;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden}.source-meta div{min-width:0;padding:11px 13px;border-right:1px solid #e2e8f0}.source-meta div:last-child{border:0}.source-meta span,.source-meta strong{display:block}.source-meta span{color:#94a3b8;font-size:10px}.source-meta strong{margin-top:3px;overflow:hidden;color:#334155;font-size:12px;text-overflow:ellipsis;white-space:nowrap}.preset-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:18px}.preset-grid button{display:flex;align-items:center;justify-content:space-between;padding:11px;border:1px solid #e2e8f0;border-radius:12px;color:#475569;background:#f8fafc;cursor:pointer}.preset-grid button strong{font-size:12px}.preset-grid button span{color:#94a3b8;font-size:10px}.preset-grid button.active{border-color:#2dd4bf;color:#0f766e;background:#f0fdfa;box-shadow:inset 0 0 0 1px #5eead4}.number-grid{display:grid;grid-template-columns:1fr 28px 1fr;align-items:end;gap:7px}.number-grid :deep(.el-input-number){width:100%}.field-group{margin-bottom:15px}.field-group>label,.slider-field>label{display:flex;justify-content:space-between;margin-bottom:7px;color:#475569;font-size:12px;font-weight:700}.swap-symbol{padding-bottom:21px;color:#94a3b8;text-align:center}.setting-note{margin:0 0 16px;padding:12px 13px;border-left:3px solid #14b8a6;border-radius:0 12px 12px 0;background:#f0fdfa}.setting-note b{color:#0f766e;font-size:12px}.setting-note p{margin:4px 0 0;color:#64748b;font-size:11px;line-height:1.55}.slider-field{margin-bottom:14px}.slider-field label strong{color:#0d9488}.output-summary{display:grid;grid-template-columns:repeat(3,1fr);margin:16px 0;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden}.output-summary div{padding:10px 7px;border-right:1px solid #e2e8f0;text-align:center}.output-summary div:last-child{border:0}.output-summary span,.output-summary strong{display:block}.output-summary span{color:#94a3b8;font-size:9px}.output-summary strong{margin-top:4px;color:#334155;font-size:11px}.zip-button{width:100%}.result-hint{color:#94a3b8;font-size:11px}.result-grid{display:grid;grid-template-columns:repeat(var(--columns),minmax(100px,1fr));gap:10px}.result-grid button{min-width:0;padding:0;overflow:hidden;border:1px solid #e2e8f0;border-radius:13px;background:#f8fafc;cursor:pointer;transition:.18s}.result-grid button:hover{border-color:#2dd4bf;transform:translateY(-2px);box-shadow:0 10px 20px rgba(13,148,136,.12)}.result-grid img{display:block;width:100%;aspect-ratio:1/1;object-fit:cover;background:#e2e8f0}.result-grid button>span{display:flex;align-items:center;gap:7px;padding:8px;color:#64748b;font-size:10px}.result-grid b{color:#0f766e}.result-grid .el-icon{margin-left:auto}.result-loading{padding:36px;color:#94a3b8;text-align:center}.feature-strip{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.feature-strip article{display:flex;gap:12px;padding:17px;border-radius:18px}.feature-strip article>b{display:grid;place-items:center;flex:0 0 34px;height:34px;border-radius:10px;color:#0f766e;background:#ccfbf1;font-size:11px}.feature-strip strong{color:#1e293b;font-size:13px}.feature-strip p{margin:4px 0 0;color:#64748b;font-size:11px;line-height:1.55}
:global(html.dark .cut-page .hero-card),:global(html.dark .cut-page .upload-card),:global(html.dark .cut-page .preview-card),:global(html.dark .cut-page .settings-card),:global(html.dark .cut-page .results-card),:global(html.dark .cut-page .feature-strip article){border-color:#334155;background-color:#1e293b;box-shadow:none}:global(html.dark .cut-page .hero-card){background:radial-gradient(circle at 78% 20%,rgba(45,212,191,.25),transparent 24%),linear-gradient(135deg,#022c22,#115e59 55%,#172554)}:global(html.dark .cut-page .upload-card.dragging),:global(html.dark .cut-page .setting-note){background:#0f2f2d}:global(html.dark .cut-page .upload-card h3),:global(html.dark .cut-page .card-heading h3),:global(html.dark .cut-page .feature-strip strong){color:#f8fafc}:global(html.dark .cut-page .upload-card p),:global(html.dark .cut-page .field-group>label),:global(html.dark .cut-page .slider-field>label),:global(html.dark .cut-page .feature-strip p){color:#94a3b8}:global(html.dark .cut-page .source-meta),:global(html.dark .cut-page .source-meta div),:global(html.dark .cut-page .preset-grid button),:global(html.dark .cut-page .output-summary),:global(html.dark .cut-page .output-summary div),:global(html.dark .cut-page .result-grid button){border-color:#334155}:global(html.dark .cut-page .source-meta strong),:global(html.dark .cut-page .output-summary strong){color:#e2e8f0}:global(html.dark .cut-page .preset-grid button),:global(html.dark .cut-page .result-grid button){color:#94a3b8;background:#0f172a}:global(html.dark .cut-page .preset-grid button.active){color:#5eead4;background:#134e4a}:global(html.dark .cut-page .feature-strip article>b){background:#134e4a;color:#5eead4}
@media(max-width:1080px){.studio-grid{grid-template-columns:1fr}.settings-card{position:static}.image-stage{min-height:340px}}@media(max-width:720px){.cut-page{gap:12px}.hero-card{padding:22px 20px;align-items:flex-start;flex-direction:column}.hero-formula{display:flex;justify-content:space-between;width:100%;min-height:auto;padding:12px 16px}.hero-formula strong{font-size:22px}.upload-card{min-height:360px;padding:38px 18px}.upload-actions{flex-direction:column;width:100%}.upload-actions :deep(.el-button){width:100%;margin-left:0}.preview-card,.settings-card,.results-card{padding:15px;border-radius:20px}.card-heading{align-items:flex-start}.header-actions{display:grid}.image-stage{min-height:260px;padding:10px}.source-meta{grid-template-columns:1fr 1fr}.source-meta div:first-child{grid-column:1/-1;border-right:0;border-bottom:1px solid #e2e8f0}.source-meta div:nth-child(2){border-bottom:0}.result-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.feature-strip{grid-template-columns:1fr}.output-summary{grid-template-columns:1fr}.output-summary div{border-right:0;border-bottom:1px solid #e2e8f0}.output-summary div:last-child{border-bottom:0}}
</style>
