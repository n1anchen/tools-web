<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Canvas,
  Control,
  FabricImage,
  FabricObject,
  util,
  type Transform,
} from 'fabric'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'


interface HeadGroup {
  name: string
  prefix: string
  count: number
  labels?: Record<string, string>
}

interface HeadItem {
  groupName: string
  src: string
  label: string
}

const headGroups: HeadGroup[] = [
  { name: '凯露', prefix: 'kyaru', count: 10 },
  { name: '哈基米', prefix: 'hajimi', count: 1, labels: { '01': '耄耋' } },
  { name: '车万', prefix: 'th', count: 1, labels: { '01': 'doremi' } },
]

function buildHeadItems(group: HeadGroup): HeadItem[] {
  return Array.from({ length: group.count }, (_, index) => {
    const number = String(index + 1).padStart(2, '0')
    const customLabel = group.labels?.[number]
    return {
      groupName: group.name,
      src: `/images/heads/${group.prefix}_${number}${customLabel ? `_${customLabel}` : ''}.png`,
      label: customLabel || `${group.name} ${number}`,
    }
  })
}

function groupIconSrc(group: HeadGroup) {
  return buildHeadItems(group)[0]?.src || `/images/heads/${group.prefix}_01.png`
}

const canvasEl = ref<HTMLCanvasElement | null>(null)
const stageRef = ref<HTMLElement | null>(null)
const backgroundInputRef = ref<HTMLInputElement | null>(null)
const customStickerInputRef = ref<HTMLInputElement | null>(null)
const selectedObject = shallowRef<FabricObject | null>(null)
let canvas: Canvas | null = null
let draggingHead: HeadItem | null = null
const stickerMeta = new WeakMap<FabricObject, HeadItem>()

const hasBackground = ref(false)
const backgroundName = ref('')
const originalWidth = ref(0)
const originalHeight = ref(0)
const displayScale = ref(1)
const stickerCount = ref(0)
const activeGroup = ref(headGroups[0].prefix)
const stageTheme = ref<'checker' | 'light' | 'dark'>('checker')
const exportFormat = ref<'png' | 'jpeg'>('png')
const exportScale = ref(1)

const activeHeadItems = computed(() => {
  const group = headGroups.find(item => item.prefix === activeGroup.value)
  return group ? buildHeadItems(group) : []
})
const selectedMeta = computed(() => selectedObject.value ? stickerMeta.get(selectedObject.value) : null)
const exportDimensions = computed(() => ({
  width: Math.round(originalWidth.value * exportScale.value),
  height: Math.round(originalHeight.value * exportScale.value),
}))

const DELETE_ICON = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3LncudzMub3JnLzIwMDAvc3ZnIiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmY1NTU1IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGxpbmUgeDE9IjE4IiB5MT0iNiIgeDI9IjYiIHkyPSIxOCIvPjxsaW5lIHgxPSI2IiB5MT0iNiIgeDI9IjE4IiB5Mj0iMTgiLz48L3N2Zz4='
const FLIP_ICON = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3LncudzMub3JnLzIwMDAvc3ZnIiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNDQ5OWZmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTE3IDFsNCA0LTQgNCIvPjxwYXRoIGQ9Ik0zIDExVjlhNCA0IDAgMCAxIDQtNGgxMCIvPjxwYXRoIGQ9Ik03IDIzbC00LTQgNC00Ii8+PHBhdGggZD0iTTIxIDEzdjJhNCA0IDAgMCAxLTQgNEg3Ii8+PC9zdmc+'

function renderControlIcon(source: string) {
  const image = new Image()
  image.onload = () => canvas?.requestRenderAll()
  image.src = source
  return function (
    this: Control,
    context: CanvasRenderingContext2D,
    left: number,
    top: number,
    _: unknown,
    object: FabricObject,
  ) {
    if (!image.complete || !image.naturalWidth) return
    context.save()
    context.translate(left, top)
    context.rotate(util.degreesToRadians(object.angle || 0))
    context.drawImage(image, -12, -12, 24, 24)
    context.restore()
  }
}

let stickerControls: Record<string, Control> = {}

function setupCustomControls() {
  stickerControls = {
    deleteCtrl: new Control({
      x: 0.5,
      y: -0.5,
      offsetX: 8,
      offsetY: -8,
      cursorStyle: 'pointer',
      mouseUpHandler: (_: unknown, transform: Transform) => {
        transform.target.canvas?.remove(transform.target)
        transform.target.canvas?.requestRenderAll()
        return true
      },
      render: renderControlIcon(DELETE_ICON),
    }),
    flipCtrl: new Control({
      x: -0.5,
      y: -0.5,
      offsetX: -8,
      offsetY: -8,
      cursorStyle: 'pointer',
      mouseUpHandler: (_: unknown, transform: Transform) => {
        transform.target.set('flipX', !transform.target.flipX)
        transform.target.canvas?.requestRenderAll()
        return true
      },
      render: renderControlIcon(FLIP_ICON),
    }),
  }
}

function handleBackgroundUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请选择 PNG、JPG、WebP 等图片文件')
    return
  }

  const reader = new FileReader()
  reader.onerror = () => ElMessage.error('图片读取失败')
  reader.onload = () => {
    const image = new Image()
    image.onerror = () => ElMessage.error('图片解码失败')
    image.onload = () => setBackground(image, file.name)
    image.src = reader.result as string
  }
  reader.readAsDataURL(file)
}

function setBackground(image: HTMLImageElement, fileName: string) {
  if (!canvas) return
  clearStickers()
  const stageWidth = Math.max(280, (stageRef.value?.clientWidth || 900) - 48)
  const scale = Math.min(1, stageWidth / image.naturalWidth, 640 / image.naturalHeight)
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))
  canvas.setDimensions({ width, height })

  const background = new FabricImage(image, {
    scaleX: scale,
    scaleY: scale,
    selectable: false,
    evented: false,
  })
  background.canvas = canvas
  canvas.backgroundImage = background
  canvas.requestRenderAll()

  hasBackground.value = true
  backgroundName.value = fileName
  originalWidth.value = image.naturalWidth
  originalHeight.value = image.naturalHeight
  displayScale.value = scale
}

function handleCustomStickerUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    ElMessage.error('自定义贴纸必须是图片文件')
    return
  }
  const reader = new FileReader()
  reader.onload = () => addSticker({ groupName: '自定义', src: reader.result as string, label: file.name.replace(/\.[^.]+$/, '') })
  reader.readAsDataURL(file)
}

function onHeadDragStart(event: DragEvent, item: HeadItem) {
  draggingHead = item
  event.dataTransfer?.setData('text/plain', item.src)
}

function bindCanvasDrop() {
  if (!canvas) return
  const upperCanvas = canvas.upperCanvasEl
  upperCanvas.addEventListener('dragover', event => event.preventDefault())
  upperCanvas.addEventListener('drop', event => {
    event.preventDefault()
    if (!draggingHead || !canvas) return
    const rect = upperCanvas.getBoundingClientRect()
    addSticker(draggingHead, event.clientX - rect.left, event.clientY - rect.top)
    draggingHead = null
  })
}

async function addSticker(item: HeadItem, x?: number, y?: number) {
  if (!canvas || !hasBackground.value) {
    ElMessage.info('请先上传一张底图')
    return
  }
  try {
    const image = await FabricImage.fromURL(item.src, { crossOrigin: 'anonymous' })
    if (!canvas) return
    const targetWidth = Math.min(190, Math.max(86, canvas.getWidth() * 0.28))
    const scale = targetWidth / Math.max(1, image.width || targetWidth)
    image.set({
      left: (x ?? canvas.getWidth() / 2) - targetWidth / 2,
      top: (y ?? canvas.getHeight() / 2) - ((image.height || targetWidth) * scale) / 2,
      scaleX: scale,
      scaleY: scale,
      cornerColor: '#7c5ce0',
      cornerStyle: 'circle',
      transparentCorners: false,
      borderColor: '#7c5ce0',
    })
    image.controls = { ...image.controls, ...stickerControls }
    stickerMeta.set(image, item)
    canvas.add(image)
    canvas.setActiveObject(image)
    canvas.requestRenderAll()
  } catch {
    ElMessage.error('贴纸加载失败')
  }
}

function updateSelection() {
  selectedObject.value = canvas?.getActiveObject() || null
}

function refreshStickerCount() {
  stickerCount.value = canvas?.getObjects().length || 0
  updateSelection()
}

function applyToSelected(action: (object: FabricObject) => void) {
  if (!selectedObject.value || !canvas) return
  action(selectedObject.value)
  selectedObject.value.setCoords()
  canvas.requestRenderAll()
}

function flipSelected() {
  applyToSelected(object => object.set('flipX', !object.flipX))
}

function rotateSelected(delta: number) {
  applyToSelected(object => object.rotate((object.angle || 0) + delta))
}

function scaleSelected(factor: number) {
  applyToSelected(object => object.scale(Math.max(0.08, object.scaleX * factor)))
}

function moveLayer(direction: 'forward' | 'backward') {
  if (!canvas || !selectedObject.value) return
  if (direction === 'forward') canvas.bringObjectForward(selectedObject.value)
  else canvas.sendObjectBackwards(selectedObject.value)
  canvas.requestRenderAll()
}

async function duplicateSelected() {
  if (!canvas || !selectedObject.value) return
  const source = selectedObject.value
  const clone = await source.clone()
  clone.set({ left: (source.left || 0) + 20, top: (source.top || 0) + 20 })
  clone.controls = { ...clone.controls, ...stickerControls }
  const meta = stickerMeta.get(source)
  if (meta) stickerMeta.set(clone, meta)
  canvas.add(clone)
  canvas.setActiveObject(clone)
  canvas.requestRenderAll()
}

function deleteSelected() {
  if (!canvas || !selectedObject.value) return
  canvas.remove(selectedObject.value)
  canvas.discardActiveObject()
  canvas.requestRenderAll()
}

function clearStickers() {
  if (!canvas) return
  canvas.discardActiveObject()
  canvas.getObjects().forEach(object => canvas?.remove(object))
  canvas.requestRenderAll()
}

function resetWorkspace() {
  if (!canvas) return
  clearStickers()
  canvas.backgroundImage = undefined
  canvas.setDimensions({ width: 600, height: 400 })
  canvas.requestRenderAll()
  hasBackground.value = false
  backgroundName.value = ''
  originalWidth.value = 0
  originalHeight.value = 0
  displayScale.value = 1
}

function download() {
  if (!canvas || !hasBackground.value) return
  canvas.discardActiveObject()
  canvas.requestRenderAll()
  const desiredMultiplier = (1 / displayScale.value) * exportScale.value
  const safeMultiplier = Math.min(desiredMultiplier, 8192 / canvas.getWidth(), 8192 / canvas.getHeight())
  const format = exportFormat.value
  const url = canvas.toDataURL({ format, quality: format === 'jpeg' ? 0.92 : 1, multiplier: safeMultiplier })
  const anchor = document.createElement('a')
  const baseName = backgroundName.value.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]/g, '_') || '接头霸王'
  anchor.href = url
  anchor.download = `${baseName}_接头霸王.${format === 'jpeg' ? 'jpg' : 'png'}`
  anchor.click()
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Delete' || event.key === 'Backspace') {
    const target = event.target as HTMLElement
    if (['INPUT', 'TEXTAREA'].includes(target.tagName)) return
    deleteSelected()
  }
}

onMounted(() => {
  setupCustomControls()
  canvas = new Canvas(canvasEl.value!, { selection: false, width: 600, height: 400, preserveObjectStacking: true })
  bindCanvasDrop()
  canvas.on('selection:created', updateSelection)
  canvas.on('selection:updated', updateSelection)
  canvas.on('selection:cleared', updateSelection)
  canvas.on('object:added', refreshStickerCount)
  canvas.on('object:removed', refreshStickerCount)
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  canvas?.dispose()
})
</script>

<template>
  <div class="sticker-tool flex flex-col mt-3 flex-1">
    <ToolHero summary="选一张底图，开始自由接头">
      <template #metrics>
        <div class="hero-metrics">
          <div><span>底图</span><strong>{{ hasBackground ? `${originalWidth} × ${originalHeight}` : '未选择' }}</strong></div>
          <div><span>贴纸数量</span><strong>{{ stickerCount }}</strong></div>
          <div><span>导出</span><strong>{{ exportFormat.toUpperCase() }} · {{ exportScale }}×</strong></div>
        </div>
      </template>
    </ToolHero>

    <section class="workspace-card">
      <aside class="asset-panel">
        <div class="panel-heading"><span>ASSETS</span><h3>素材库</h3></div>

        <button class="background-upload" @click="backgroundInputRef?.click()">
          <span class="upload-icon">底</span>
          <span><strong>{{ hasBackground ? '更换底图' : '选择一张底图' }}</strong><small>{{ backgroundName || 'PNG / JPG / WebP / GIF' }}</small></span>
        </button>
        <input ref="backgroundInputRef" type="file" accept="image/*" hidden @change="handleBackgroundUpload" />

        <div class="group-tabs">
          <button v-for="group in headGroups" :key="group.prefix" :class="{ active: activeGroup === group.prefix }" @click="activeGroup = group.prefix">
            <img :src="groupIconSrc(group)" :alt="group.name" /><span>{{ group.name }}</span>
          </button>
        </div>

        <div class="sticker-grid">
          <button
            v-for="item in activeHeadItems"
            :key="item.src"
            draggable="true"
            :title="`添加 ${item.label}`"
            @dragstart="onHeadDragStart($event, item)"
            @dragend="draggingHead = null"
            @click="addSticker(item)"
          >
            <img :src="item.src" :alt="item.label" /><span>{{ item.label }}</span>
          </button>
        </div>

        <button class="custom-upload" @click="customStickerInputRef?.click()"><span>＋</span><div><strong>上传自定义贴纸</strong><small>透明 PNG 效果最佳</small></div></button>
        <input ref="customStickerInputRef" type="file" accept="image/*" hidden @change="handleCustomStickerUpload" />
      </aside>

      <div class="canvas-panel">
        <div class="canvas-toolbar">
          <div class="tool-status">
            <span :class="{ active: selectedObject }"></span>
            <strong>{{ selectedMeta?.label || (selectedObject ? '自定义贴纸' : '选择画布中的贴纸进行编辑') }}</strong>
          </div>
          <div class="selected-tools" :class="{ disabled: !selectedObject }">
            <button title="缩小" @click="scaleSelected(0.9)">−</button>
            <button title="放大" @click="scaleSelected(1.1)">＋</button>
            <button title="左转 15°" @click="rotateSelected(-15)">↶</button>
            <button title="右转 15°" @click="rotateSelected(15)">↷</button>
            <button title="水平翻转" @click="flipSelected">翻转</button>
            <button title="复制贴纸" @click="duplicateSelected">复制</button>
            <button title="上移一层" @click="moveLayer('forward')">上移</button>
            <button title="下移一层" @click="moveLayer('backward')">下移</button>
            <button class="danger" title="删除" @click="deleteSelected">删除</button>
          </div>
        </div>

        <div class="stage-controls">
          <span>画布背景</span>
          <button :class="{ active: stageTheme === 'checker' }" @click="stageTheme = 'checker'">网格</button>
          <button :class="{ active: stageTheme === 'light' }" @click="stageTheme = 'light'">浅色</button>
          <button :class="{ active: stageTheme === 'dark' }" @click="stageTheme = 'dark'">深色</button>
        </div>

        <div ref="stageRef" class="canvas-stage" :class="stageTheme">
          <div v-if="!hasBackground" class="empty-stage">
            <div class="empty-glyph">🖼</div><strong>先上传一张底图</strong><p>图片只在浏览器本地读取，不会上传到服务器。</p>
            <button @click="backgroundInputRef?.click()">选择图片</button>
          </div>
          <canvas ref="canvasEl" :class="{ hidden: !hasBackground }" />
        </div>

        <div class="canvas-footer">
          <div><span>显示尺寸</span><strong>{{ hasBackground ? `${Math.round(originalWidth * displayScale)} × ${Math.round(originalHeight * displayScale)}` : '—' }}</strong></div>
          <div><span>原始尺寸</span><strong>{{ hasBackground ? `${originalWidth} × ${originalHeight}` : '—' }}</strong></div>
          <button v-if="stickerCount" @click="clearStickers">清空贴纸</button>
          <button v-if="hasBackground" @click="resetWorkspace">重新开始</button>
        </div>
      </div>
    </section>

    <section class="export-card">
      <div><span class="export-icon">出</span><div><strong>导出成品</strong><p>默认按照底图原始分辨率导出，画布缩小预览不会降低清晰度。</p></div></div>
      <div class="export-options">
        <label>格式<select v-model="exportFormat"><option value="png">PNG</option><option value="jpeg">JPG</option></select></label>
        <label>倍率<select v-model.number="exportScale"><option :value="1">1×</option><option :value="2">2×</option></select></label>
        <span>{{ hasBackground ? `${exportDimensions.width} × ${exportDimensions.height}` : '等待底图' }}</span>
        <button :disabled="!hasBackground" @click="download">下载图片</button>
      </div>
    </section>

    <ToolGuide title="使用说明">
      <el-text>
        上传底图后，可点击素材库头像将其居中添加，也可在桌面端直接拖到画布指定位置。选中贴纸后可拖动、角点缩放旋转，并使用工具栏翻转、复制、调整图层或删除；Delete / Backspace 也能删除当前贴纸。默认按底图原始分辨率导出，透明贴纸建议使用 PNG。
      </el-text>
    </ToolGuide>
  </div>
</template>

<style scoped>
.sticker-tool { --accent:#7157d9; --ink:#292b38; --muted:#737789; }.panel-heading span { color:#7665a5; font-size:13px; font-weight:800; letter-spacing:.12em; }.hero-metrics { display:grid; grid-template-columns:repeat(3,minmax(96px,1fr)); min-width:320px; overflow:hidden; border:1px solid #e0e9f4; border-radius:18px; background:rgba(255,255,255,.78); }.hero-metrics div { padding:12px 14px; text-align:center; border-left:1px solid #e5edf6; }.hero-metrics div:first-child { border-left:0; }.hero-metrics span,.hero-metrics strong { display:block; }.hero-metrics span { margin-top:4px; color:#7a899c; font-size:12px; }.hero-metrics strong { overflow:hidden; color:#334155; font-size:18px; text-overflow:ellipsis; white-space:nowrap; }
.workspace-card { display:grid; grid-template-columns:280px minmax(0,1fr); margin-top:14px; overflow:hidden; border:1px solid #e1e3e9; border-radius:20px; background:#fff; box-shadow:0 11px 28px rgba(47,43,63,.05); }.asset-panel { padding:18px; border-right:1px solid #e4e5ea; background:#fafafb; }.panel-heading h3 { margin:4px 0 0; color:var(--ink); font-size:18px; }.background-upload,.custom-upload { display:flex; align-items:center; gap:11px; width:100%; margin-top:15px; padding:12px; border:1px solid #dcd9e7; border-radius:13px; background:#fff; text-align:left; cursor:pointer; }.upload-icon { display:grid; place-items:center; width:38px; height:38px; flex:none; border-radius:10px; background:#eee9fc; color:#7054b6; font-weight:800; }.background-upload strong,.background-upload small,.custom-upload strong,.custom-upload small { display:block; }.background-upload strong,.custom-upload strong { color:#494351; font-size:14px; }.background-upload small,.custom-upload small { max-width:170px; margin-top:3px; overflow:hidden; color:#8c8590; font-size:13px; white-space:nowrap; text-overflow:ellipsis; }.group-tabs { display:flex; gap:5px; margin-top:16px; overflow-x:auto; }.group-tabs button { display:flex; align-items:center; gap:5px; flex:none; padding:6px 8px; border:1px solid transparent; border-radius:9px; background:transparent; color:#716a77; font-size:13px; cursor:pointer; }.group-tabs button.active { border-color:#c5b9e5; background:#fff; color:#684cae; }.group-tabs img { width:24px; height:24px; object-fit:contain; }.sticker-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:7px; margin-top:10px; }.sticker-grid button { min-width:0; padding:6px; border:1px solid #e0dee6; border-radius:10px; background:#fff; cursor:grab; }.sticker-grid button:hover { border-color:#a996d8; transform:translateY(-1px); }.sticker-grid img { display:block; width:100%; aspect-ratio:1; object-fit:contain; }.sticker-grid span { display:block; margin-top:4px; overflow:hidden; color:#77717c; font-size:13px; white-space:nowrap; text-overflow:ellipsis; }.custom-upload { margin-top:12px; border-style:dashed; }.custom-upload>span { display:grid; place-items:center; width:36px; height:36px; border-radius:10px; background:#f2f0f6; color:#8069b6; font-size:19px; }
.canvas-panel { min-width:0; }.canvas-toolbar { display:flex; align-items:center; justify-content:space-between; gap:12px; min-height:58px; padding:10px 16px; border-bottom:1px solid #e5e6eb; }.tool-status { display:flex; align-items:center; gap:8px; min-width:0; }.tool-status>span { width:9px; height:9px; flex:none; border-radius:50%; background:#c4c7ce; }.tool-status>span.active { background:#35a779; box-shadow:0 0 0 4px rgba(53,167,121,.12); }.tool-status strong { overflow:hidden; color:#55505c; font-size:13px; white-space:nowrap; text-overflow:ellipsis; }.selected-tools { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:5px; }.selected-tools.disabled { pointer-events:none; opacity:.38; }.selected-tools button { min-width:32px; height:32px; border:1px solid #dcdde4; border-radius:8px; background:#fff; color:#5d5865; font-size:13px; font-weight:700; cursor:pointer; }.selected-tools button.danger { color:#bd4953; }.stage-controls { display:flex; justify-content:flex-end; align-items:center; gap:5px; padding:9px 16px; background:#f8f9fb; }.stage-controls>span { margin-right:3px; color:#7f8390; font-size:13px; }.stage-controls button { border:1px solid transparent; border-radius:7px; padding:5px 8px; background:transparent; color:#737782; font-size:13px; cursor:pointer; }.stage-controls button.active { border-color:#d6d7df; background:#fff; color:#5e4c9c; }.canvas-stage { position:relative; display:flex; align-items:center; justify-content:center; min-height:520px; max-height:720px; padding:24px; overflow:auto; box-sizing:border-box; }.canvas-stage.checker { background-color:#eef0f4; background-image:linear-gradient(45deg,#dde0e7 25%,transparent 25%),linear-gradient(-45deg,#dde0e7 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#dde0e7 75%),linear-gradient(-45deg,transparent 75%,#dde0e7 75%); background-size:24px 24px; background-position:0 0,0 12px,12px -12px,-12px 0; }.canvas-stage.light { background:#f5f6f8; }.canvas-stage.dark { background:#20242d; }.canvas-stage :deep(.canvas-container) { flex:none; box-shadow:0 14px 34px rgba(29,31,39,.18); }.canvas-stage canvas.hidden,.canvas-stage :deep(.canvas-container:has(canvas.hidden)) { display:none!important; }.empty-stage { position:absolute; inset:24px; display:grid; place-items:center; align-content:center; border:1px dashed #bfc3ce; border-radius:16px; background:rgba(255,255,255,.78); text-align:center; }.empty-glyph { font-size:34px; }.empty-stage strong { margin-top:9px; color:#555966; font-size:15px; }.empty-stage p { margin:5px 0 13px; color:#858995; font-size:13px; }.empty-stage button { border:0; border-radius:9px; padding:9px 13px; background:var(--accent); color:white; font-size:13px; font-weight:700; cursor:pointer; }.canvas-footer { display:flex; align-items:center; gap:18px; min-height:55px; padding:9px 16px; border-top:1px solid #e5e6eb; }.canvas-footer div span,.canvas-footer div strong { display:block; }.canvas-footer div span { color:#8a8e99; font-size:13px; }.canvas-footer div strong { margin-top:2px; color:#505563; font-size:13px; }.canvas-footer button { margin-left:auto; border:0; background:transparent; color:#7560ac; font-size:13px; font-weight:700; cursor:pointer; }.canvas-footer button+button { margin-left:0; color:#aa5b64; }
.export-card { display:flex; align-items:center; justify-content:space-between; gap:18px; margin-top:14px; padding:16px 18px; border:1px solid #e1e3e9; border-radius:17px; background:#fff; }.export-card>div:first-child { display:flex; align-items:center; gap:11px; }.export-icon { display:grid; place-items:center; width:42px; height:42px; border-radius:11px; background:#eaf5f1; color:#28765c; font-weight:800; }.export-card strong { color:#484b57; font-size:14px; }.export-card p { margin:3px 0 0; color:#818591; font-size:13px; }.export-options { display:flex; align-items:center; gap:8px; }.export-options label { display:flex; align-items:center; gap:5px; color:#737784; font-size:13px; }.export-options select { height:36px; border:1px solid #d9dce3; border-radius:8px; padding:0 8px; background:#fff; color:#515662; }.export-options>span { min-width:110px; color:#777b87; font-size:13px; text-align:center; }.export-options>button { border:0; border-radius:9px; padding:10px 14px; background:var(--accent); color:#fff; font-size:14px; font-weight:750; cursor:pointer; }.export-options>button:disabled { opacity:.4; cursor:not-allowed; }
:global(.dark) .sticker-tool { --ink:#f1edf5; --muted:#aaa3b1; }:global(.dark) .hero-metrics { border-color:#40516a; background:rgba(15,23,42,.5); }:global(.dark) .hero-metrics div { border-color:#40516a; }:global(.dark) .hero-metrics strong { color:#e7edf6; }:global(.dark) .hero-metrics span { color:#a8b4c5; }:global(.dark) .workspace-card,:global(.dark) .export-card { border-color:#3f4756; background:#1b2637; }:global(.dark) .asset-panel,:global(.dark) .canvas-toolbar,:global(.dark) .canvas-footer { border-color:#414958; }:global(.dark) .background-upload strong,:global(.dark) .custom-upload strong,:global(.dark) .tool-status strong,:global(.dark) .canvas-footer div strong,:global(.dark) .export-card strong { color:#ece7ef; }:global(.dark) .asset-panel,:global(.dark) .stage-controls { background:#202b3d; }:global(.dark) .background-upload,:global(.dark) .custom-upload,:global(.dark) .group-tabs button.active,:global(.dark) .sticker-grid button,:global(.dark) .selected-tools button,:global(.dark) .stage-controls button.active,:global(.dark) .export-options select { border-color:#465061; background:#1b2739; color:#c9c1ce; }:global(.dark) .empty-stage { border-color:#566173; background:rgba(27,38,55,.88); }
@media (max-width:1000px) { .workspace-card { grid-template-columns:230px minmax(0,1fr); }.sticker-grid { grid-template-columns:repeat(2,1fr); }.canvas-toolbar { align-items:flex-start; flex-direction:column; }.selected-tools { justify-content:flex-start; } }
@media (max-width:760px) { .workspace-card { grid-template-columns:1fr; }.asset-panel { border-right:0; border-bottom:1px solid #e4e5ea; }.sticker-grid { display:flex; overflow-x:auto; }.sticker-grid button { flex:0 0 84px; }.canvas-stage { min-height:360px; padding:14px; }.export-card { align-items:flex-start; flex-direction:column; }.export-options { width:100%; flex-wrap:wrap; }.export-options>button { width:100%; }.canvas-footer { flex-wrap:wrap; }.canvas-footer button { margin-left:0; } }
@media (max-width:640px) { .hero-metrics { grid-template-columns:1fr; }.hero-metrics div { border-left:0; border-bottom:1px solid #e5edf6; }.hero-metrics div:last-child { border-bottom:0; }.canvas-stage { min-height:330px; }.stage-controls { justify-content:flex-start; }.export-options>span { min-width:0; margin-left:auto; } }
</style>
