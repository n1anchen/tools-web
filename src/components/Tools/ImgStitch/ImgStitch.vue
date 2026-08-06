<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { ArrowDown, ArrowUp, Delete, Download, Picture, Plus, Rank, UploadFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import MetricsBar from '@/components/Common/MetricsBar.vue'
import { autoDown, formatBytes } from '@/utils/file'
import { buildStitchPlan, exceedsPixelBudget, type StitchMode } from '@/utils/imageStudio'

const MAX_IMAGE_BYTES = 25 * 1024 * 1024
const MAX_IMAGES = 24
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

interface ImageItem {
  id: string
  img: HTMLImageElement
  name: string
  url: string
  size: number
  revoke: boolean
}

const fileInput = ref<HTMLInputElement | null>(null)
const canvasElement = ref<HTMLCanvasElement | null>(null)
const images = ref<ImageItem[]>([])
const draggingFiles = ref(false)
const loadingFiles = ref(false)
const exporting = ref(false)
const dragIndex = ref(-1)
const dragOverIndex = ref(-1)
const state = reactive({
  mode: 'vertical' as StitchMode,
  gap: 12,
  bgColor: '#ffffff',
  captionRange: [70, 94] as [number, number],
  format: 'jpeg' as 'jpeg' | 'png' | 'webp',
  quality: .92,
})

const modes: Array<{ value: StitchMode; title: string; detail: string; symbol: string }> = [
  { value: 'vertical', title: '纵向拼接', detail: '按最小宽度对齐', symbol: '↕' },
  { value: 'horizontal', title: '横向拼接', detail: '按最小高度对齐', symbol: '↔' },
  { value: 'caption', title: '影视台词', detail: '自动保留首尾画面', symbol: '▤' },
]

const plan = computed(() => buildStitchPlan(
  images.value.map(item => ({ width: item.img.naturalWidth, height: item.img.naturalHeight })),
  state.mode,
  state.gap,
  state.captionRange,
))
const outputIssue = computed(() => {
  if (!plan.value.width || !plan.value.height) return ''
  if (plan.value.width > 32_000 || plan.value.height > 32_000) return '输出边长超过浏览器安全画布范围，请减少图片或改用另一种拼接方向'
  if (exceedsPixelBudget(plan.value.width, plan.value.height)) return '输出超过 8000 万像素，请减少图片数量或先缩小原图'
  return ''
})
const totalSourceBytes = computed(() => images.value.reduce((sum, item) => sum + item.size, 0))
const formattedSourceSize = computed(() => formatBytes(totalSourceBytes.value))
const extension = computed(() => state.format === 'jpeg' ? 'jpg' : state.format)
const formatLabel = computed(() => state.format === 'jpeg' ? 'JPG' : state.format.toUpperCase())

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${images.value.length}`
}

function addImageSource(url: string, name: string, size: number, revoke: boolean) {
  return new Promise<void>((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      images.value.push({ id: makeId(), img: image, name, url, size, revoke })
      resolve()
    }
    image.onerror = () => {
      if (revoke) URL.revokeObjectURL(url)
      reject(new Error(`${name} 无法读取`))
    }
    image.src = url
  })
}

async function loadFiles(fileList?: FileList | File[]) {
  const files = Array.from(fileList ?? [])
  if (!files.length) return
  const remaining = MAX_IMAGES - images.value.length
  if (remaining <= 0) {
    ElMessage.warning(`最多添加 ${MAX_IMAGES} 张图片`)
    return
  }
  loadingFiles.value = true
  let added = 0
  const errors: string[] = []
  for (const file of files.slice(0, remaining)) {
    if (!ALLOWED_TYPES.has(file.type)) {
      errors.push(`${file.name}：格式不支持`)
      continue
    }
    if (file.size > MAX_IMAGE_BYTES) {
      errors.push(`${file.name}：超过 25 MB`)
      continue
    }
    try {
      await addImageSource(URL.createObjectURL(file), file.name, file.size, true)
      added += 1
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `${file.name} 无法读取`)
    }
  }
  loadingFiles.value = false
  if (files.length > remaining) errors.push(`已达到 ${MAX_IMAGES} 张上限`)
  if (added) ElMessage.success(`已添加 ${added} 张图片`)
  if (errors.length) ElMessage.warning(errors.slice(0, 2).join('；'))
  if (fileInput.value) fileInput.value.value = ''
}

function handleInput(event: Event) {
  loadFiles((event.target as HTMLInputElement).files ?? undefined)
}

function handleDrop(event: DragEvent) {
  draggingFiles.value = false
  loadFiles(event.dataTransfer?.files)
}

async function loadDemo() {
  clearAll()
  loadingFiles.value = true
  const colors = [
    ['#0f172a', '#2563eb', 'OPENING SCENE', '城市的夜色刚刚亮起'],
    ['#312e81', '#7c3aed', 'SECOND FRAME', '我们在同一条街道重逢'],
    ['#7c2d12', '#f97316', 'FINAL SHOT', '故事仍然会继续'],
  ]
  for (let index = 0; index < colors.length; index += 1) {
    const canvas = document.createElement('canvas')
    canvas.width = 960
    canvas.height = 540
    const context = canvas.getContext('2d')!
    const gradient = context.createLinearGradient(0, 0, 960, 540)
    gradient.addColorStop(0, colors[index][0])
    gradient.addColorStop(1, colors[index][1])
    context.fillStyle = gradient
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = 'rgba(255,255,255,.12)'
    context.beginPath()
    context.arc(740 - index * 80, 175 + index * 35, 150, 0, Math.PI * 2)
    context.fill()
    context.fillStyle = '#ffffff'
    context.font = '800 58px system-ui, sans-serif'
    context.fillText(colors[index][2], 58, 110)
    context.fillStyle = 'rgba(0,0,0,.72)'
    context.fillRect(0, 405, 960, 92)
    context.fillStyle = '#ffffff'
    context.textAlign = 'center'
    context.font = '600 32px system-ui, sans-serif'
    context.fillText(colors[index][3], 480, 462)
    const source = canvas.toDataURL('image/jpeg', .92)
    await addImageSource(source, `台词示例-${index + 1}.jpg`, Math.round(source.length * .75), false)
  }
  loadingFiles.value = false
}

function releaseItem(item: ImageItem) {
  if (item.revoke) URL.revokeObjectURL(item.url)
}

function removeImage(index: number) {
  releaseItem(images.value[index])
  images.value.splice(index, 1)
}

function clearAll() {
  images.value.forEach(releaseItem)
  images.value = []
}

function moveImage(index: number, offset: number) {
  const target = index + offset
  if (target < 0 || target >= images.value.length) return
  const list = [...images.value]
  const [item] = list.splice(index, 1)
  list.splice(target, 0, item)
  images.value = list
}

function onDragStart(index: number, event: DragEvent) {
  dragIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }
}

function onDragOver(event: DragEvent, index: number) {
  event.preventDefault()
  dragOverIndex.value = index
}

function onDropItem(event: DragEvent, index: number) {
  event.preventDefault()
  const from = dragIndex.value
  if (from >= 0 && from !== index) {
    const list = [...images.value]
    const [item] = list.splice(from, 1)
    list.splice(index, 0, item)
    images.value = list
  }
  dragIndex.value = -1
  dragOverIndex.value = -1
}

function drawPlaceholder(message = '添加两张或更多图片，开始实时拼接') {
  const canvas = canvasElement.value
  if (!canvas) return
  canvas.width = 760
  canvas.height = 360
  const context = canvas.getContext('2d')!
  const dark = document.documentElement.classList.contains('dark')
  context.fillStyle = dark ? '#0f172a' : '#e2e8f0'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = dark ? '#64748b' : '#64748b'
  context.font = '500 18px system-ui, sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(message, canvas.width / 2, canvas.height / 2)
}

function redraw() {
  const canvas = canvasElement.value
  if (!canvas) return
  if (!images.value.length) {
    drawPlaceholder()
    return
  }
  if (outputIssue.value) {
    drawPlaceholder(outputIssue.value)
    return
  }
  const currentPlan = plan.value
  canvas.width = currentPlan.width
  canvas.height = currentPlan.height
  const context = canvas.getContext('2d')!
  context.fillStyle = state.bgColor
  context.fillRect(0, 0, canvas.width, canvas.height)
  currentPlan.draws.forEach(draw => {
    const image = images.value[draw.imageIndex]?.img
    if (!image) return
    context.drawImage(image, draw.sx, draw.sy, draw.sw, draw.sh, draw.dx, draw.dy, draw.dw, draw.dh)
  })
}

function exportImage() {
  const canvas = canvasElement.value
  if (!canvas || !images.value.length || outputIssue.value) return
  exporting.value = true
  canvas.toBlob(blob => {
    exporting.value = false
    if (!blob) {
      ElMessage.error('图片导出失败，请尝试降低输出尺寸')
      return
    }
    autoDown(URL.createObjectURL(blob), `拼接结果-${state.mode}.${extension.value}`)
    ElMessage.success(`已导出 ${formatLabel.value} 图片`)
  }, `image/${state.format}`, state.quality)
}

watch(
  [images, () => state.mode, () => state.gap, () => state.bgColor, () => state.captionRange[0], () => state.captionRange[1]],
  () => nextTick(redraw),
  { deep: true },
)
onBeforeUnmount(clearAll)
</script>

<template>
  <div class="stitch-page flex flex-col mt-3 flex-1">
    <ToolHero summary="排序、裁切、拼接，一块画布完成">
      <template #metrics>
        <MetricsBar :items="[{ label: '图片', value: images.length }, { label: '输出宽', value: plan.width || '—' }, { label: '输出高', value: plan.height || '—' }]" />
      </template>
    </ToolHero>

    <input ref="fileInput" class="sr-only" type="file" multiple accept="image/png,image/jpeg,image/webp" @change="handleInput">

    <section class="studio-grid">
      <article class="preview-card">
        <header class="card-heading"><div><span class="eyebrow">COMPOSITE PREVIEW</span><h3>实时画布</h3></div><span v-if="images.length" class="canvas-size">{{ plan.width }} × {{ plan.height }} px</span></header>
        <div class="canvas-stage"><canvas ref="canvasElement" aria-label="图片拼接效果预览" /><div v-if="outputIssue" class="canvas-warning">{{ outputIssue }}</div></div>
        <div class="canvas-meta"><div><span>拼接模式</span><strong>{{ modes.find(item => item.value === state.mode)?.title }}</strong></div><div><span>源文件合计</span><strong>{{ formattedSourceSize }}</strong></div><div><span>画布像素</span><strong>{{ plan.width && plan.height ? `${(plan.width * plan.height / 1_000_000).toFixed(1)} MP` : '—' }}</strong></div><div><span>导出</span><strong>{{ formatLabel }}</strong></div></div>
      </article>

      <aside class="settings-card">
        <header class="card-heading"><div><span class="eyebrow">COMPOSER SETTINGS</span><h3>拼接设置</h3></div><button v-if="images.length" class="text-button danger" type="button" @click="clearAll">清空全部</button></header>

        <div
          class="add-zone"
          :class="{ dragging: draggingFiles }"
          @dragenter.prevent="draggingFiles = true"
          @dragover.prevent
          @dragleave.prevent="draggingFiles = false"
          @drop.prevent="handleDrop"
          @click="fileInput?.click()"
        >
          <el-icon><UploadFilled /></el-icon><div><strong>{{ images.length ? '继续添加图片' : '拖入或选择图片' }}</strong><span>PNG / JPEG / WebP · 最多 {{ MAX_IMAGES }} 张</span></div><el-icon><Plus /></el-icon>
        </div>
        <button v-if="!images.length" class="demo-button" type="button" :disabled="loadingFiles" @click="loadDemo"><el-icon><Picture /></el-icon>{{ loadingFiles ? '正在生成示例…' : '载入三帧台词示例' }}</button>

        <div v-if="images.length" class="image-list">
          <div class="list-title"><span>{{ images.length }} 张图片</span><small>拖拽或使用箭头排序</small></div>
          <div
            v-for="(item, index) in images"
            :key="item.id"
            draggable="true"
            class="image-item"
            :class="{ over: dragOverIndex === index, dragging: dragIndex === index }"
            @dragstart="onDragStart(index, $event)"
            @dragover="onDragOver($event, index)"
            @dragleave="dragOverIndex = -1"
            @drop="onDropItem($event, index)"
            @dragend="dragIndex = -1; dragOverIndex = -1"
          >
            <span class="rank"><el-icon><Rank /></el-icon>{{ String(index + 1).padStart(2, '0') }}</span>
            <img :src="item.url" :alt="item.name">
            <div class="item-name"><strong>{{ item.name }}</strong><span>{{ item.img.naturalWidth }} × {{ item.img.naturalHeight }}</span></div>
            <div class="item-actions"><button type="button" :disabled="index === 0" title="上移" @click="moveImage(index, -1)"><el-icon><ArrowUp /></el-icon></button><button type="button" :disabled="index === images.length - 1" title="下移" @click="moveImage(index, 1)"><el-icon><ArrowDown /></el-icon></button><button type="button" title="移除" @click="removeImage(index)"><el-icon><Delete /></el-icon></button></div>
          </div>
        </div>

        <div class="field-group"><label>拼接模式</label><div class="mode-grid"><button v-for="mode in modes" :key="mode.value" type="button" :class="{ active: state.mode === mode.value }" @click="state.mode = mode.value"><b>{{ mode.symbol }}</b><span><strong>{{ mode.title }}</strong><small>{{ mode.detail }}</small></span></button></div></div>
        <div v-if="state.mode !== 'caption'" class="slider-field"><label><span>图片间距</span><strong>{{ state.gap }} px</strong></label><el-slider v-model="state.gap" :min="0" :max="120" /></div>
        <div v-if="state.mode === 'caption'" class="caption-box"><label>台词区域 <strong>{{ state.captionRange[0] }}% – {{ state.captionRange[1] }}%</strong></label><el-slider v-model="state.captionRange" range :min="0" :max="100" /><p>首图保留顶部，末图保留底部，中间图片仅截取所选台词条。</p></div>
        <div class="color-setting"><span>间距背景色</span><el-color-picker v-model="state.bgColor" show-alpha /><code>{{ state.bgColor }}</code></div>
        <div class="export-box"><div class="field-group"><label>导出格式</label><el-radio-group v-model="state.format"><el-radio-button value="jpeg">JPG</el-radio-button><el-radio-button value="png">PNG</el-radio-button><el-radio-button value="webp">WebP</el-radio-button></el-radio-group></div><div v-if="state.format !== 'png'" class="slider-field"><label><span>导出质量</span><strong>{{ Math.round(state.quality * 100) }}%</strong></label><el-slider v-model="state.quality" :min=".4" :max="1" :step=".02" /></div><el-button class="export-button" type="primary" size="large" :icon="Download" :loading="exporting" :disabled="!images.length || Boolean(outputIssue)" @click="exportImage">导出 {{ formatLabel }} 图片</el-button></div>
      </aside>
    </section>

    <section class="feature-strip"><article><b>01</b><div><strong>手机也能排序</strong><p>缩略图提供上移、下移按钮，不再依赖桌面端拖拽操作。</p></div></article><article><b>02</b><div><strong>台词裁切可解释</strong><p>首帧、中间帧、末帧使用不同保留规则，结果尺寸实时展示。</p></div></article><article><b>03</b><div><strong>画布安全检查</strong><p>在分配超大 Canvas 前提示像素与边长风险，避免页面崩溃。</p></div></article></section>

    <ToolGuide title="使用说明"><p>添加多张图片后选择纵向、横向或影视台词模式。桌面端可拖动图片行，手机端可使用上下箭头排序。普通拼接可以调整间距与背景色；台词模式通过范围滑块指定字幕所在区域。超过浏览器安全画布范围时会停止绘制并给出调整建议。</p></ToolGuide>
  </div>
</template>

<style scoped>
.stitch-page{--stitch-accent:#7c3aed;gap:16px}.preview-card,.settings-card,.feature-strip article{border:1px solid #e2e8f0;background:#fff;box-shadow:0 16px 40px rgba(15,23,42,.06)}.eyebrow{display:block;margin-bottom:6px;color:#7c3aed;font-size:11px;font-weight:900;letter-spacing:.16em}.studio-grid{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(360px,.85fr);gap:16px;align-items:start}.preview-card,.settings-card{padding:20px;border-radius:24px}.settings-card{position:sticky;top:82px}.card-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}.card-heading .eyebrow{margin-bottom:3px}.card-heading h3{margin:0;color:#0f172a}.canvas-size{padding:5px 9px;border-radius:999px;color:#6d28d9;background:#ede9fe;font-size:10px;font-weight:800}.canvas-stage{position:relative;min-height:480px;display:grid;place-items:center;padding:18px;overflow:auto;border-radius:18px;background-color:#e2e8f0;background-image:linear-gradient(45deg,#cbd5e1 25%,transparent 25%),linear-gradient(-45deg,#cbd5e1 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#cbd5e1 75%),linear-gradient(-45deg,transparent 75%,#cbd5e1 75%);background-size:24px 24px;background-position:0 0,0 12px,12px -12px,-12px 0}.canvas-stage canvas{display:block;max-width:100%;max-height:72vh;object-fit:contain;box-shadow:0 22px 44px rgba(15,23,42,.2)}.canvas-warning{position:absolute;right:14px;bottom:14px;left:14px;padding:10px;border-radius:10px;color:#fecaca;background:rgba(127,29,29,.9);font-size:11px;text-align:center}.canvas-meta{display:grid;grid-template-columns:repeat(4,1fr);margin-top:14px;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden}.canvas-meta div{padding:11px;border-right:1px solid #e2e8f0}.canvas-meta div:last-child{border:0}.canvas-meta span,.canvas-meta strong{display:block}.canvas-meta span{color:#94a3b8;font-size:10px}.canvas-meta strong{margin-top:3px;color:#334155;font-size:12px}.text-button{border:0;background:none;color:#64748b;cursor:pointer;font-size:11px}.text-button.danger{color:#ef4444}.add-zone{display:flex;align-items:center;gap:10px;margin-bottom:8px;padding:13px;border:1px dashed #c4b5fd;border-radius:14px;color:#7c3aed;background:#faf5ff;cursor:pointer;transition:.18s}.add-zone.dragging{border-style:solid;background:#f3e8ff;transform:translateY(-1px)}.add-zone>.el-icon:first-child{font-size:22px}.add-zone>.el-icon:last-child{margin-left:auto}.add-zone div{min-width:0}.add-zone strong,.add-zone span{display:block}.add-zone strong{font-size:12px}.add-zone span{margin-top:2px;color:#94a3b8;font-size:10px}.demo-button{display:flex;align-items:center;justify-content:center;gap:7px;width:100%;margin-bottom:15px;padding:9px;border:1px solid #e2e8f0;border-radius:10px;color:#64748b;background:#fff;cursor:pointer}.image-list{margin-bottom:18px}.list-title{display:flex;justify-content:space-between;margin:12px 0 7px;color:#475569;font-size:11px}.list-title small{color:#94a3b8}.image-item{display:grid;grid-template-columns:48px 48px minmax(0,1fr) auto;align-items:center;gap:9px;margin-bottom:7px;padding:7px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;cursor:grab;transition:.15s}.image-item.over{border-color:#a78bfa;transform:translateY(-1px)}.image-item.dragging{opacity:.45}.image-item .rank{display:flex;align-items:center;gap:5px;color:#94a3b8;font-size:10px}.image-item img{width:48px;height:42px;border-radius:7px;object-fit:cover}.item-name{min-width:0}.item-name strong,.item-name span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.item-name strong{color:#334155;font-size:11px}.item-name span{margin-top:3px;color:#94a3b8;font-size:9px}.item-actions{display:flex;gap:2px}.item-actions button{display:grid;place-items:center;width:24px;height:24px;padding:0;border:0;border-radius:6px;color:#64748b;background:transparent;cursor:pointer}.item-actions button:hover{color:#7c3aed;background:#ede9fe}.item-actions button:last-child:hover{color:#ef4444;background:#fee2e2}.item-actions button:disabled{opacity:.25;cursor:not-allowed}.field-group{margin-bottom:15px}.field-group>label,.slider-field>label,.caption-box>label{display:flex;justify-content:space-between;margin-bottom:7px;color:#475569;font-size:12px;font-weight:700}.mode-grid{display:grid;gap:7px}.mode-grid button{display:flex;align-items:center;gap:10px;padding:10px;border:1px solid #e2e8f0;border-radius:12px;color:#64748b;background:#f8fafc;text-align:left;cursor:pointer}.mode-grid button>b{display:grid;place-items:center;width:32px;height:32px;border-radius:9px;background:#e2e8f0;font-size:17px}.mode-grid span,.mode-grid strong,.mode-grid small{display:block}.mode-grid strong{font-size:12px}.mode-grid small{margin-top:2px;color:#94a3b8;font-size:9px}.mode-grid button.active{border-color:#c4b5fd;color:#6d28d9;background:#faf5ff;box-shadow:inset 0 0 0 1px #ddd6fe}.mode-grid button.active>b{color:#fff;background:#7c3aed}.slider-field{margin-bottom:14px}.slider-field label strong,.caption-box label strong{color:#7c3aed}.caption-box{margin-bottom:14px;padding:12px;border-radius:13px;background:#faf5ff}.caption-box p{margin:6px 0 0;color:#64748b;font-size:10px;line-height:1.5}.color-setting{display:flex;align-items:center;gap:9px;margin-bottom:15px;color:#475569;font-size:12px}.color-setting code{color:#94a3b8;font-size:10px}.export-box{padding:14px;border-radius:16px;background:#f8fafc}.export-button{width:100%}.feature-strip{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.feature-strip article{display:flex;gap:12px;padding:17px;border-radius:18px}.feature-strip article>b{display:grid;place-items:center;flex:0 0 34px;height:34px;border-radius:10px;color:#7c3aed;background:#ede9fe;font-size:11px}.feature-strip strong{color:#1e293b;font-size:13px}.feature-strip p{margin:4px 0 0;color:#64748b;font-size:11px;line-height:1.55}
:global(html.dark .stitch-page .preview-card),:global(html.dark .stitch-page .settings-card),:global(html.dark .stitch-page .feature-strip article){border-color:#334155;background-color:#1e293b;box-shadow:none}:global(html.dark .stitch-page .card-heading h3),:global(html.dark .stitch-page .feature-strip strong){color:#f8fafc}:global(html.dark .stitch-page .canvas-stage){background-color:#0f172a;background-image:linear-gradient(45deg,#1e293b 25%,transparent 25%),linear-gradient(-45deg,#1e293b 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#1e293b 75%),linear-gradient(-45deg,transparent 75%,#1e293b 75%)}:global(html.dark .stitch-page .canvas-meta),:global(html.dark .stitch-page .canvas-meta div),:global(html.dark .stitch-page .demo-button),:global(html.dark .stitch-page .image-item),:global(html.dark .stitch-page .mode-grid button){border-color:#334155}:global(html.dark .stitch-page .canvas-meta strong),:global(html.dark .stitch-page .item-name strong){color:#e2e8f0}:global(html.dark .stitch-page .add-zone),:global(html.dark .stitch-page .caption-box){background:#2e1065}:global(html.dark .stitch-page .demo-button),:global(html.dark .stitch-page .image-item),:global(html.dark .stitch-page .mode-grid button),:global(html.dark .stitch-page .export-box){color:#94a3b8;background:#0f172a}:global(html.dark .stitch-page .mode-grid button.active){color:#d8b4fe;background:#3b0764}:global(html.dark .stitch-page .field-group>label),:global(html.dark .stitch-page .slider-field>label),:global(html.dark .stitch-page .caption-box>label),:global(html.dark .stitch-page .color-setting),:global(html.dark .stitch-page .feature-strip p){color:#94a3b8}:global(html.dark .stitch-page .feature-strip article>b){color:#d8b4fe;background:#3b0764}@media(max-width:1120px){.studio-grid{grid-template-columns:1fr}.settings-card{position:static}.canvas-stage{min-height:380px}}@media(max-width:720px){.stitch-page{gap:12px}.preview-card,.settings-card{padding:15px;border-radius:20px}.canvas-stage{min-height:280px;padding:10px}.canvas-meta{grid-template-columns:1fr 1fr}.canvas-meta div:nth-child(2){border-right:0}.canvas-meta div:nth-child(-n+2){border-bottom:1px solid #e2e8f0}.image-item{grid-template-columns:36px 42px minmax(0,1fr) auto}.image-item .rank .el-icon{display:none}.item-actions button{width:27px;height:27px}.feature-strip{grid-template-columns:1fr}}</style>
