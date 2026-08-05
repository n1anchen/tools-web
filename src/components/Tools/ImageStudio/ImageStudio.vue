<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, type Component } from 'vue'
import { ElMessage } from 'element-plus'
import type { UploadFile } from 'element-plus'
import {
  Bottom,
  Box,
  Brush,
  Check,
  Close,
  CopyDocument,
  Crop,
  Delete,
  Download,
  MagicStick,
  Picture,
  Pointer,
  Refresh,
  RefreshLeft,
  RefreshRight,
  Star,
  Switch,
  Tickets,
  Top,
  Upload,
} from '@element-plus/icons-vue'
import {
  Canvas,
  Ellipse,
  FabricImage,
  type BaseBrush,
  type FabricObject,
  Group,
  IText,
  Line,
  PencilBrush,
  Rect,
  Triangle,
  filters,
} from 'fabric'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'

/* ================= 常量 ================= */

const MAX_EDGE = 2048
const MAX_IMAGE_BYTES = 20 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
const HISTORY_LIMIT = 30
const ACCENT = '#7c5ce0'

type ToolId = 'select' | 'transform' | 'crop' | 'draw' | 'shape' | 'text' | 'emoji' | 'filter'
type ShapeType = 'rect' | 'circle' | 'triangle' | 'line' | 'arrow'

interface ToolDef {
  id: ToolId
  icon: Component
  label: string
}

const TOOLS: ToolDef[] = [
  { id: 'select', icon: Pointer, label: '选择' },
  { id: 'transform', icon: Refresh, label: '旋转' },
  { id: 'crop', icon: Crop, label: '裁剪' },
  { id: 'draw', icon: Brush, label: '画笔' },
  { id: 'shape', icon: Box, label: '形状' },
  { id: 'text', icon: Tickets, label: '文字' },
  { id: 'emoji', icon: Star, label: '图标' },
  { id: 'filter', icon: MagicStick, label: '滤镜' },
]

const SHAPES: { id: ShapeType; label: string }[] = [
  { id: 'rect', label: '矩形' },
  { id: 'circle', label: '圆形' },
  { id: 'triangle', label: '三角' },
  { id: 'line', label: '直线' },
  { id: 'arrow', label: '箭头' },
]

const EMOJIS = [
  '😀', '😁', '😂', '🤣', '😊', '😍', '😎', '🥳', '😭', '😡',
  '🥰', '😴', '👍', '👎', '👏', '🙏', '💪', '✌️', '❤️', '💔',
  '💯', '⭐', '🔥', '✨', '🎉', '🎂', '🎁', '☕', '🍺', '🐱',
  '🐶', '🌸', '🌈', '⚡', '🎵', '💡', '❓', '❗', '✅', '❌',
]

interface FilterDef {
  id: string
  label: string
  build: () => filters.BaseFilter<string>[]
}

const FILTERS: FilterDef[] = [
  { id: 'none', label: '原图', build: () => [] },
  { id: 'bw', label: '黑白', build: () => [new filters.Grayscale(), new filters.Contrast({ contrast: 0.06 })] },
  { id: 'sepia', label: '复古', build: () => [new filters.Sepia()] },
  { id: 'vintage', label: '胶片', build: () => [new filters.Vintage(), new filters.Saturation({ saturation: 0.12 })] },
  { id: 'warm', label: '暖色', build: () => [new filters.HueRotation({ rotation: 14 }), new filters.Saturation({ saturation: 0.22 })] },
  { id: 'cool', label: '冷色', build: () => [new filters.HueRotation({ rotation: -16 }), new filters.Saturation({ saturation: 0.18 })] },
  { id: 'sharpen', label: '锐化', build: () => [new filters.Convolute({ matrix: [0, -1, 0, -1, 5, -1, 0, -1, 0] })] },
  { id: 'emboss', label: '浮雕', build: () => [new filters.Convolute({ matrix: [1, 1, 1, 1, 0.7, -1, -1, -1, -1] })] },
  { id: 'blur', label: '模糊', build: () => [new filters.Blur({ blur: 0.35 })] },
  { id: 'pixelate', label: '像素化', build: () => [new filters.Pixelate({ blocksize: 6 })] },
  { id: 'invert', label: '负片', build: () => [new filters.Invert()] },
  { id: 'noise', label: '噪点', build: () => [new filters.Noise({ noise: 70 })] },
  { id: 'contrast', label: '高对比', build: () => [new filters.Contrast({ contrast: 0.3 })] },
]

const shapeLabel = computed(() => SHAPES.find(s => s.id === shapeType.value)?.label || '')

/* ================= 画布与状态 ================= */

const canvasEl = ref<HTMLCanvasElement | null>(null)
const stageRef = ref<HTMLElement | null>(null)

let canvas: Canvas | null = null
let mainImage: FabricImage | null = null
let cropRect: Rect | null = null
let cropMasks: Rect[] = []
let stageZoom = 1

const hasImage = ref(false)
const fileLabel = ref('')
const imageSize = reactive({ width: 0, height: 0, originalWidth: 0, originalHeight: 0 })
const downscaled = ref(false)
const activeTool = ref<ToolId>('select')
const isCropping = ref(false)
const canUndo = ref(false)
const canRedo = ref(false)
const hasSelection = ref(false)
const selectionIsImage = ref(false)
const objectCount = ref(0)

// 工具设置
const brushColor = ref('#1f2937')
const brushWidth = ref(6)
const shapeType = ref<ShapeType>('rect')
const shapeColor = ref('#3b82f6')
const textContent = ref('双击可编辑文字')
const textSize = ref(36)
const textColor = ref('#ffffff')
const textBold = ref(true)
const emojiSize = ref(64)
const activeFilter = ref('none')
const rotationInput = ref(90)
const exportFormat = ref<'png' | 'jpeg' | 'webp'>('png')
const exportQuality = ref(0.92)

const sizeLabel = computed(() => (hasImage.value ? `${imageSize.width} × ${imageSize.height}` : '—'))
const originalLabel = computed(() =>
  hasImage.value ? `${imageSize.originalWidth} × ${imageSize.originalHeight}` : '—'
)
const selectionLabel = computed(() => {
  if (!hasSelection.value) return hasImage.value ? '点击画布中的元素进行编辑' : '等待载入图片'
  if (selectionIsImage.value) return '主图 · 滤镜作用于主图'
  return '标注对象 · 可拖动、缩放、旋转'
})

/* ================= 历史记录（toJSON 快照） ================= */

const undoStack: string[] = []
const redoStack: string[] = []
let currentSnapshot = ''
let historyTimer: ReturnType<typeof setTimeout> | null = null
let isRestoring = false

function snapshotJson(): string {
  return canvas ? JSON.stringify(canvas.toJSON()) : '{}'
}

function updateHistoryFlags() {
  canUndo.value = undoStack.length > 0
  canRedo.value = redoStack.length > 0
}

/** 变更完成后调用：把变更前的快照入栈，并更新当前快照 */
function pushHistory() {
  if (!canvas || !currentSnapshot) return
  undoStack.push(currentSnapshot)
  if (undoStack.length > HISTORY_LIMIT) undoStack.shift()
  currentSnapshot = snapshotJson()
  redoStack.length = 0
  updateHistoryFlags()
}

function scheduleHistory() {
  if (historyTimer) clearTimeout(historyTimer)
  historyTimer = setTimeout(() => {
    historyTimer = null
    pushHistory()
  }, 160)
}

/** 程序化操作完成后立即冲刷历史（清除挂起的防抖任务，避免重复入栈） */
function flushHistory() {
  if (historyTimer) {
    clearTimeout(historyTimer)
    historyTimer = null
  }
  pushHistory()
}

function resetHistory() {
  if (historyTimer) {
    clearTimeout(historyTimer)
    historyTimer = null
  }
  undoStack.length = 0
  redoStack.length = 0
  currentSnapshot = ''
  updateHistoryFlags()
}

function syncAfterRestore() {
  if (!canvas) return
  const img = canvas.getObjects().find(o => o.type === 'image') as FabricImage | null
  mainImage = img
  hasImage.value = !!img
  if (img) {
    // loadFromJSON 不会改变画布尺寸，需按主图尺寸重建画布
    const width = Math.round(img.getScaledWidth())
    const height = Math.round(img.getScaledHeight())
    canvas.setDimensions({ width, height })
    imageSize.width = width
    imageSize.height = height
  }
  objectCount.value = canvas.getObjects().length
  canvas.requestRenderAll()
  nextTick(() => fitStage())
  updateHistoryFlags()
}

async function undo() {
  if (!canvas || !undoStack.length) return
  const instance = canvas
  const prev = undoStack.pop()!
  redoStack.push(currentSnapshot)
  currentSnapshot = prev
  isRestoring = true
  try {
    instance.discardActiveObject()
    await instance.loadFromJSON(prev)
    syncAfterRestore()
  } finally {
    isRestoring = false
  }
}

async function redo() {
  if (!canvas || !redoStack.length) return
  const instance = canvas
  const next = redoStack.pop()!
  undoStack.push(currentSnapshot)
  currentSnapshot = next
  isRestoring = true
  try {
    instance.discardActiveObject()
    await instance.loadFromJSON(next)
    syncAfterRestore()
  } finally {
    isRestoring = false
  }
}

/* ================= 图片载入 ================= */

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target?.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

async function resizeDataUrl(src: string, width: number, height: number): Promise<string> {
  const img = await loadHtmlImage(src)
  const c = document.createElement('canvas')
  c.width = width
  c.height = height
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, width, height)
  return c.toDataURL('image/png')
}

async function rebuildFromSource(
  source: string,
  width: number,
  height: number,
  origWidth?: number,
  origHeight?: number,
) {
  if (!canvas) return
  canvas.discardActiveObject()
  canvas.clear()
  const image = await FabricImage.fromURL(source)
  image.set({ left: 0, top: 0 })
  canvas.add(image)
  canvas.setDimensions({ width, height })
  canvas.requestRenderAll()
  mainImage = image
  hasImage.value = true
  imageSize.width = width
  imageSize.height = height
  if (origWidth) imageSize.originalWidth = origWidth
  if (origHeight) imageSize.originalHeight = origHeight
  objectCount.value = 1
  activeFilter.value = 'none'
  await nextTick()
  fitStage()
}

async function loadImageFile(uploadFile: UploadFile) {
  const file = uploadFile.raw
  if (!file) return
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    ElMessage.error('仅支持 PNG、JPEG、WebP 或 GIF 图片')
    return
  }
  if (file.size > MAX_IMAGE_BYTES) {
    ElMessage.error('图片不能超过 20 MB')
    return
  }
  const dataUrl = await fileToDataUrl(file)
  await loadDataUrl(dataUrl, file.name)
}

async function loadDataUrl(dataUrl: string, name: string) {
  try {
    const raw = await loadHtmlImage(dataUrl)
    let source = dataUrl
    let w = raw.naturalWidth
    let h = raw.naturalHeight
    let scaled = false
    const maxEdge = Math.max(w, h)
    if (maxEdge > MAX_EDGE) {
      const k = MAX_EDGE / maxEdge
      w = Math.round(w * k)
      h = Math.round(h * k)
      source = await resizeDataUrl(dataUrl, w, h)
      scaled = true
    }
    await rebuildFromSource(source, w, h, raw.naturalWidth, raw.naturalHeight)
    fileLabel.value = name
    downscaled.value = scaled
    resetHistory()
    currentSnapshot = snapshotJson()
    ElMessage.success(`已载入图片`)
    if (scaled) ElMessage.info(`图片较大，已缩放至 ${MAX_EDGE}px 内处理`)
  } catch {
    ElMessage.error('图片读取失败，请尝试其他文件')
  }
}

/* ================= 舞台适配 ================= */

function fitStage() {
  if (!canvas || !stageRef.value) return
  const availW = Math.max(240, stageRef.value.clientWidth - 48)
  const availH = Math.max(240, stageRef.value.clientHeight - 48)
  const cw = canvas.getWidth() || 1
  const ch = canvas.getHeight() || 1
  const z = Math.min(1, availW / cw, availH / ch)
  stageZoom = z
  canvas.setViewportTransform([z, 0, 0, z, (availW - cw * z) / 2, (availH - ch * z) / 2])
  canvas.requestRenderAll()
}

/* ================= 工具切换 ================= */

function selectTool(tool: ToolId) {
  if (!hasImage.value && tool !== 'select') {
    ElMessage.info('请先载入一张图片')
    return
  }
  if (isCropping.value && tool !== 'crop') exitCropMode()
  if (canvas) canvas.isDrawingMode = false
  activeTool.value = tool
  if (tool === 'crop') enterCropMode()
  else if (tool === 'draw') enterDrawMode()
}

function enterDrawMode() {
  if (!canvas) return
  canvas.discardActiveObject()
  canvas.isDrawingMode = true
  canvas.freeDrawingBrush = new PencilBrush(canvas)
  canvas.freeDrawingBrush.color = brushColor.value
  canvas.freeDrawingBrush.width = brushWidth.value
  canvas.requestRenderAll()
}

function updateBrush() {
  const brush = canvas?.freeDrawingBrush as BaseBrush | undefined
  if (brush) {
    brush.color = brushColor.value
    brush.width = brushWidth.value
  }
}

/* ================= 裁剪 ================= */

function enterCropMode() {
  if (!canvas || !hasImage.value) return
  canvas.getObjects().forEach(o => {
    o.selectable = false
    o.evented = false
  })
  cropRect = new Rect({
    left: Math.round(canvas.getWidth() * 0.08),
    top: Math.round(canvas.getHeight() * 0.08),
    width: Math.round(canvas.getWidth() * 0.84),
    height: Math.round(canvas.getHeight() * 0.84),
    fill: 'rgba(255,255,255,0.03)',
    stroke: '#3b82f6',
    strokeWidth: 2,
    strokeUniform: true,
    strokeDashArray: [8, 5],
    cornerColor: '#ffffff',
    cornerStrokeColor: '#3b82f6',
    cornerStyle: 'circle',
    cornerSize: 12,
    transparentCorners: false,
    lockRotation: true,
    hasRotatingPoint: false,
    minScaleLimit: 0.05,
    borderColor: '#3b82f6',
    borderDashArray: [8, 5],
  })
  canvas.add(cropRect)
  canvas.setActiveObject(cropRect)
  isCropping.value = true
  renderCropMasks()
  canvas.on('object:moving', onCropMoving)
  canvas.on('object:scaling', onCropScaling)
  canvas.requestRenderAll()
}

function renderCropMasks() {
  if (!canvas || !cropRect) return
  clearCropMasks()
  const cw = canvas.getWidth()
  const ch = canvas.getHeight()
  const r = cropRect.getBoundingRect()
  const addMask = (left: number, top: number, width: number, height: number) => {
    if (width <= 0 || height <= 0 || !canvas) return
    const mask = new Rect({
      left,
      top,
      width,
      height,
      fill: 'rgba(15,23,42,0.5)',
      selectable: false,
      evented: false,
      hoverCursor: 'default',
    })
    canvas.add(mask)
    cropMasks.push(mask)
  }
  addMask(0, 0, cw, r.top)
  addMask(0, r.top + r.height, cw, ch - r.top - r.height)
  addMask(0, r.top, r.left, r.height)
  addMask(r.left + r.width, r.top, cw - r.left - r.width, r.height)
  canvas.requestRenderAll()
}

function clearCropMasks() {
  if (!canvas) return
  cropMasks.forEach(m => canvas?.remove(m))
  cropMasks = []
}

function clampCrop() {
  if (!cropRect || !canvas) return
  const cw = canvas.getWidth()
  const ch = canvas.getHeight()
  const r = cropRect.getBoundingRect()
  cropRect.left = Math.max(0, Math.min(r.left, cw - 16))
  cropRect.top = Math.max(0, Math.min(r.top, ch - 16))
  cropRect.setCoords()
}

function onCropMoving() {
  clampCrop()
  renderCropMasks()
}

function onCropScaling() {
  if (!cropRect) return
  const min = 24
  if (cropRect.width * cropRect.scaleX < min) cropRect.set({ scaleX: min / cropRect.width })
  if (cropRect.height * cropRect.scaleY < min) cropRect.set({ scaleY: min / cropRect.height })
  clampCrop()
  renderCropMasks()
}

async function applyCrop() {
  if (!canvas || !cropRect || !hasImage.value) return
  const cw = canvas.getWidth()
  const ch = canvas.getHeight()
  // 使用裁剪框自身坐标（不含描边）保证裁剪像素精确
  const left = Math.max(0, Math.round(cropRect.left))
  const top = Math.max(0, Math.round(cropRect.top))
  const width = Math.min(cw - left, Math.round(cropRect.width * cropRect.scaleX))
  const height = Math.min(ch - top, Math.round(cropRect.height * cropRect.scaleY))
  if (width < 4 || height < 4) {
    ElMessage.warning('裁剪区域过小')
    return
  }
  const dataUrl = canvas.toDataURL({
    format: 'png',
    multiplier: 1 / stageZoom,
    left,
    top,
    width,
    height,
  })
  exitCropMode()
  await rebuildFromSource(dataUrl, width, height, width, height)
  flushHistory()
  ElMessage.success('裁剪完成')
}

function exitCropMode() {
  if (!canvas) return
  clearCropMasks()
  if (cropRect) {
    canvas.remove(cropRect)
    cropRect = null
  }
  canvas.off('object:moving', onCropMoving)
  canvas.off('object:scaling', onCropScaling)
  canvas.getObjects().forEach(o => {
    o.selectable = true
    o.evented = true
  })
  canvas.discardActiveObject()
  canvas.requestRenderAll()
  isCropping.value = false
  if (activeTool.value === 'crop') activeTool.value = 'select'
}

/* ================= 旋转 / 翻转（整画布烘焙） ================= */

async function rotateDataUrl(src: string, deg: number): Promise<string> {
  const img = await loadHtmlImage(src)
  const rad = (deg * Math.PI) / 180
  const cos = Math.abs(Math.cos(rad))
  const sin = Math.abs(Math.sin(rad))
  const w = Math.max(1, Math.round(img.naturalWidth * cos + img.naturalHeight * sin))
  const h = Math.max(1, Math.round(img.naturalWidth * sin + img.naturalHeight * cos))
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  ctx.translate(w / 2, h / 2)
  ctx.rotate(rad)
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)
  return c.toDataURL('image/png')
}

async function flipDataUrl(src: string, axis: 'x' | 'y'): Promise<string> {
  const img = await loadHtmlImage(src)
  const w = img.naturalWidth
  const h = img.naturalHeight
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  if (axis === 'x') {
    ctx.translate(w, 0)
    ctx.scale(-1, 1)
  } else {
    ctx.translate(0, h)
    ctx.scale(1, -1)
  }
  ctx.drawImage(img, 0, 0)
  return c.toDataURL('image/png')
}

async function rotate(deg: number) {
  if (!canvas || !hasImage.value) return
  try {
    const src = canvas.toDataURL({ format: 'png', multiplier: 1 / stageZoom })
    const rotated = await rotateDataUrl(src, deg)
    const img = await loadHtmlImage(rotated)
    await rebuildFromSource(rotated, img.naturalWidth, img.naturalHeight, img.naturalWidth, img.naturalHeight)
    flushHistory()
  } catch {
    ElMessage.error('旋转失败，请重试')
  }
}

async function flip(axis: 'x' | 'y') {
  if (!canvas || !hasImage.value) return
  try {
    const src = canvas.toDataURL({ format: 'png', multiplier: 1 / stageZoom })
    const flipped = await flipDataUrl(src, axis)
    const img = await loadHtmlImage(flipped)
    await rebuildFromSource(flipped, img.naturalWidth, img.naturalHeight, img.naturalWidth, img.naturalHeight)
    flushHistory()
  } catch {
    ElMessage.error('翻转失败，请重试')
  }
}

/* ================= 标注对象 ================= */

function buildArrow(color: string): Group {
  const shaft = new Line([0, 0, 150, 0], {
    stroke: color,
    strokeWidth: 6,
    selectable: false,
    evented: false,
  })
  const head = new Triangle({
    left: 150,
    top: 0,
    originX: 'center',
    originY: 'center',
    width: 26,
    height: 18,
    angle: 90,
    fill: color,
    selectable: false,
    evented: false,
  })
  return new Group([shaft, head], { selectable: true, evented: true, left: 0, top: 0 })
}

function addShape() {
  if (!canvas || !hasImage.value) return
  const cw = canvas.getWidth()
  const ch = canvas.getHeight()
  const color = shapeColor.value
  const common = {
    left: cw / 2,
    top: ch / 2,
    originX: 'center' as const,
    originY: 'center' as const,
    selectable: true,
    evented: true,
    cornerColor: ACCENT,
    cornerStyle: 'circle' as const,
    transparentCorners: false,
    borderColor: ACCENT,
  }
  let obj: FabricObject
  switch (shapeType.value) {
    case 'rect':
      obj = new Rect({ ...common, width: 180, height: 120, fill: color, stroke: color, strokeWidth: 2 })
      break
    case 'circle':
      obj = new Ellipse({ ...common, rx: 90, ry: 90, fill: color, stroke: color, strokeWidth: 2 })
      break
    case 'triangle':
      obj = new Triangle({ ...common, width: 190, height: 150, fill: color, stroke: color, strokeWidth: 2 })
      break
    case 'line':
      obj = new Line([-90, 0, 90, 0], { ...common, stroke: color, strokeWidth: 6, fill: '' })
      break
    case 'arrow':
      obj = buildArrow(color)
      obj.set({ left: cw / 2, top: ch / 2 })
      break
  }
  canvas.add(obj)
  canvas.setActiveObject(obj)
  canvas.requestRenderAll()
  flushHistory()
}

function addText() {
  if (!canvas || !hasImage.value) return
  const cw = canvas.getWidth()
  const ch = canvas.getHeight()
  const text = new IText(textContent.value || '文字', {
    left: cw / 2,
    top: ch / 2,
    originX: 'center',
    originY: 'center',
    fontSize: textSize.value,
    fill: textColor.value,
    fontWeight: textBold.value ? 'bold' : 'normal',
    fontFamily: 'system-ui, "PingFang SC", "Microsoft YaHei", sans-serif',
    cornerColor: ACCENT,
    cornerStyle: 'circle',
    transparentCorners: false,
    borderColor: ACCENT,
  })
  canvas.add(text)
  canvas.setActiveObject(text)
  canvas.requestRenderAll()
  flushHistory()
}

function addEmoji(emoji: string) {
  if (!canvas || !hasImage.value) return
  const cw = canvas.getWidth()
  const ch = canvas.getHeight()
  const text = new IText(emoji, {
    left: cw / 2,
    top: ch / 2,
    originX: 'center',
    originY: 'center',
    fontSize: emojiSize.value,
    cornerColor: ACCENT,
    cornerStyle: 'circle',
    transparentCorners: false,
    borderColor: ACCENT,
  })
  canvas.add(text)
  canvas.setActiveObject(text)
  canvas.requestRenderAll()
  flushHistory()
}

/* ================= 滤镜 ================= */

function applyFilter(id: string) {
  if (!canvas || !mainImage) return
  const def = FILTERS.find(f => f.id === id)
  if (!def) return
  mainImage.filters = def.build()
  mainImage.applyFilters()
  canvas.requestRenderAll()
  activeFilter.value = id
  flushHistory()
}

/* ================= 选中对象操作 ================= */

function refreshSelection() {
  const obj = canvas?.getActiveObject() || null
  hasSelection.value = !!obj
  selectionIsImage.value = obj?.type === 'image'
}

async function duplicateSelected() {
  const instance = canvas
  if (!instance) return
  const obj = instance.getActiveObject()
  if (!obj) return
  const clone = await obj.clone()
  clone.set({ left: (obj.left || 0) + 24, top: (obj.top || 0) + 24 })
  instance.add(clone)
  instance.setActiveObject(clone)
  instance.requestRenderAll()
  flushHistory()
}

function deleteSelected() {
  const instance = canvas
  if (!instance) return
  const obj = instance.getActiveObject()
  if (!obj) return
  instance.remove(obj)
  instance.discardActiveObject()
  instance.requestRenderAll()
  flushHistory()
}

function bringForward() {
  const obj = canvas?.getActiveObject()
  if (!obj || !canvas) return
  canvas.bringObjectForward(obj)
  canvas.requestRenderAll()
}

function sendBackward() {
  const obj = canvas?.getActiveObject()
  if (!obj || !canvas) return
  canvas.sendObjectBackwards(obj)
  canvas.requestRenderAll()
}

/* ================= 导出 / 重置 ================= */

function buildImageFilename(ext: string): string {
  const base = fileLabel.value.replace(/\.[^.]+$/, '') || 'image'
  return `${base}_edited.${ext}`
}

function exportDataUrl(): string {
  if (!canvas) return ''
  const isJpeg = exportFormat.value === 'jpeg'
  if (isJpeg) {
    canvas.backgroundColor = '#ffffff'
    canvas.requestRenderAll()
  }
  const url = canvas.toDataURL({
    format: exportFormat.value,
    quality: exportFormat.value === 'png' ? 1 : exportQuality.value,
    multiplier: 1 / stageZoom,
  })
  if (isJpeg) {
    canvas.backgroundColor = 'transparent'
    canvas.requestRenderAll()
  }
  return url
}

function download() {
  if (!canvas || !hasImage.value) return
  canvas.discardActiveObject()
  canvas.requestRenderAll()
  const url = exportDataUrl()
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = buildImageFilename(exportFormat.value === 'jpeg' ? 'jpg' : exportFormat.value)
  anchor.click()
}

async function resetWorkspace() {
  if (!canvas) return
  canvas.discardActiveObject()
  canvas.isDrawingMode = false
  clearCropMasks()
  if (cropRect) {
    canvas.remove(cropRect)
    cropRect = null
  }
  canvas.clear()
  hasImage.value = false
  fileLabel.value = ''
  downscaled.value = false
  imageSize.width = imageSize.height = imageSize.originalWidth = imageSize.originalHeight = 0
  activeTool.value = 'select'
  activeFilter.value = 'none'
  isCropping.value = false
  objectCount.value = 0
  canvas.setDimensions({ width: 800, height: 560 })
  canvas.requestRenderAll()
  resetHistory()
  nextTick(() => fitStage())
}

/* ================= 键盘 ================= */

function handleKeydown(e: KeyboardEvent) {
  const target = e.target as HTMLElement
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
  if (!hasSelection.value) return
  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault()
    deleteSelected()
  }
}

/* ================= 生命周期 ================= */

function onStateChanged() {
  refreshObjectCount()
  if (isCropping.value || isRestoring) return
  scheduleHistory()
}

function onObjectModified() {
  if (isCropping.value) {
    renderCropMasks()
    return
  }
  if (isRestoring) return
  scheduleHistory()
}

function refreshObjectCount() {
  objectCount.value = canvas?.getObjects().length || 0
}

function onResize() {
  fitStage()
}

onMounted(() => {
  canvas = new Canvas(canvasEl.value!, {
    selection: false,
    preserveObjectStacking: true,
    backgroundColor: 'transparent',
    stopContextMenu: true,
  })
  canvas.setDimensions({ width: 800, height: 560 })
  canvas.on('selection:created', refreshSelection)
  canvas.on('selection:updated', refreshSelection)
  canvas.on('selection:cleared', refreshSelection)
  canvas.on('object:modified', onObjectModified)
  canvas.on('path:created', onStateChanged)
  canvas.on('object:added', onStateChanged)
  canvas.on('object:removed', onStateChanged)
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('resize', onResize)
  nextTick(() => fitStage())
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', onResize)
  canvas?.dispose()
  canvas = null
})
</script>

<template>
  <div class="image-studio flex flex-col mt-3 flex-1">
    <ToolHero summary="上传一张图片，裁剪、旋转、标注与滤镜全部在浏览器本地完成">
      <template #metrics>
        <div class="hero-metrics">
          <div><span>当前尺寸</span><strong>{{ sizeLabel }}</strong></div>
          <div><span>叠加对象</span><strong>{{ objectCount }}</strong></div>
          <div><span>导出</span><strong>{{ exportFormat.toUpperCase() }}</strong></div>
        </div>
      </template>
    </ToolHero>

    <section class="workspace-card">
      <!-- 左侧工具面板 -->
      <aside class="tool-panel">
        <div class="panel-heading"><span>EDITOR</span><h3>编辑工具</h3></div>

        <el-upload
          :show-file-list="false"
          accept="image/png,image/jpeg,image/webp,image/gif"
          :on-change="loadImageFile"
          :auto-upload="false"
        >
          <button type="button" class="upload-btn" aria-label="载入需要处理的图片">
            <span class="upload-glyph"><el-icon :size="20"><Upload /></el-icon></span>
            <span><strong>{{ hasImage ? '更换图片' : '载入图片' }}</strong><small>{{ fileLabel || 'PNG / JPG / WebP / GIF' }}</small></span>
          </button>
        </el-upload>

        <div class="tool-grid">
          <button
            v-for="tool in TOOLS"
            :key="tool.id"
            type="button"
            :class="{ active: activeTool === tool.id }"
            :disabled="!hasImage && tool.id !== 'select'"
            @click="selectTool(tool.id)"
          >
            <span class="tool-glyph"><el-icon :size="15"><component :is="tool.icon" /></el-icon></span><span>{{ tool.label }}</span>
          </button>
        </div>

        <div class="panel-heading sub"><span>HISTORY</span><h3>历史记录</h3></div>
        <div class="history-row">
          <button type="button" :disabled="!canUndo" @click="undo"><el-icon :size="13"><RefreshLeft /></el-icon> 撤销</button>
          <button type="button" :disabled="!canRedo" @click="redo"><el-icon :size="13"><RefreshRight /></el-icon> 重做</button>
          <button type="button" class="danger" :disabled="!hasImage" @click="resetWorkspace"><el-icon :size="13"><Refresh /></el-icon> 重置</button>
        </div>
      </aside>

      <!-- 画布区 -->
      <div class="canvas-panel">
        <div class="canvas-toolbar">
          <div class="tool-status"><span :class="{ active: hasSelection }"></span><strong>{{ selectionLabel }}</strong></div>
          <div class="selected-tools" :class="{ disabled: !hasSelection }">
            <button type="button" title="复制" @click="duplicateSelected"><el-icon :size="13"><CopyDocument /></el-icon> 复制</button>
            <button type="button" title="上移一层" @click="bringForward"><el-icon :size="13"><Top /></el-icon> 上移</button>
            <button type="button" title="下移一层" @click="sendBackward"><el-icon :size="13"><Bottom /></el-icon> 下移</button>
            <button type="button" class="danger" title="删除" @click="deleteSelected"><el-icon :size="13"><Delete /></el-icon> 删除</button>
          </div>
        </div>

        <!-- 上下文设置条 -->
        <div v-if="hasImage && activeTool !== 'select'" class="context-bar">
          <template v-if="activeTool === 'transform'">
            <div class="ctx-group">
              <button type="button" title="左转 90°" @click="rotate(-90)"><el-icon :size="14"><RefreshLeft /></el-icon> 90°</button>
              <button type="button" title="右转 90°" @click="rotate(90)"><el-icon :size="14"><RefreshRight /></el-icon> 90°</button>
              <button type="button" title="旋转 180°" @click="rotate(180)">180°</button>
              <label class="angle-field">角度<input v-model.number="rotationInput" type="number" min="1" max="359" /><button type="button" @click="rotate(rotationInput)">应用</button></label>
            </div>
            <div class="ctx-group">
              <button type="button" @click="flip('x')"><el-icon :size="14"><Switch /></el-icon> 水平翻转</button>
              <button type="button" @click="flip('y')"><el-icon :size="14" class="flip-v"><Switch /></el-icon> 垂直翻转</button>
            </div>
            <span class="ctx-tip">旋转与翻转作用于整张画布（含标注）</span>
          </template>

          <template v-else-if="activeTool === 'crop'">
            <span class="ctx-tip">拖动裁剪框四角调整范围，确认后按该区域裁剪</span>
            <div class="ctx-group">
              <button type="button" class="primary" @click="applyCrop"><el-icon :size="14"><Check /></el-icon> 应用裁剪</button>
              <button type="button" @click="exitCropMode"><el-icon :size="14"><Close /></el-icon> 取消</button>
            </div>
          </template>

          <template v-else-if="activeTool === 'draw'">
            <label class="field"><span>颜色</span><input v-model="brushColor" type="color" @change="updateBrush" /></label>
            <label class="field"><span>粗细</span><el-slider v-model="brushWidth" :min="1" :max="60" style="width: 140px" @input="updateBrush" /></label>
            <span class="ctx-tip">在画布上按住拖动即可绘制</span>
          </template>

          <template v-else-if="activeTool === 'shape'">
            <div class="ctx-group">
              <button v-for="s in SHAPES" :key="s.id" type="button" :class="{ active: shapeType === s.id }" @click="shapeType = s.id">{{ s.label }}</button>
            </div>
            <label class="field"><span>颜色</span><input v-model="shapeColor" type="color" /></label>
            <button type="button" class="primary" @click="addShape">＋ 添加{{ shapeLabel }}</button>
          </template>

          <template v-else-if="activeTool === 'text'">
            <input v-model="textContent" class="text-input" placeholder="输入文字内容" @keyup.enter="addText" />
            <label class="field"><span>字号</span><input v-model.number="textSize" type="number" min="8" max="200" /></label>
            <label class="field"><span>颜色</span><input v-model="textColor" type="color" /></label>
            <button type="button" :class="{ active: textBold }" title="粗体" @click="textBold = !textBold">B</button>
            <button type="button" class="primary" @click="addText">＋ 添加文字</button>
          </template>

          <template v-else-if="activeTool === 'emoji'">
            <label class="field"><span>大小</span><input v-model.number="emojiSize" type="number" min="16" max="200" /></label>
            <div class="emoji-grid">
              <button v-for="e in EMOJIS" :key="e" type="button" @click="addEmoji(e)">{{ e }}</button>
            </div>
          </template>

          <template v-else-if="activeTool === 'filter'">
            <div class="filter-grid">
              <button v-for="f in FILTERS" :key="f.id" type="button" :class="{ active: activeFilter === f.id }" @click="applyFilter(f.id)">{{ f.label }}</button>
            </div>
          </template>
        </div>

        <!-- 画布舞台 -->
        <div ref="stageRef" class="canvas-stage" :class="{ empty: !hasImage }">
          <div v-if="!hasImage" class="empty-stage">
            <div class="empty-glyph"><el-icon :size="44"><Picture /></el-icon></div>
            <strong>先载入一张图片</strong>
            <p>图片只在浏览器本地处理，不会上传到服务器。</p>
            <el-upload
              :show-file-list="false"
              accept="image/png,image/jpeg,image/webp,image/gif"
              :on-change="loadImageFile"
              :auto-upload="false"
            >
              <button type="button" class="empty-upload">选择图片</button>
            </el-upload>
          </div>
          <canvas ref="canvasEl" :class="{ hidden: !hasImage }" />
          <div v-if="isCropping" class="crop-hint">拖动四角调整裁剪区域</div>
        </div>

        <div class="canvas-footer">
          <span>原始尺寸 <strong>{{ originalLabel }}</strong></span>
          <span>当前尺寸 <strong>{{ sizeLabel }}</strong></span>
          <span v-if="downscaled" class="scale-note">大图已缩放至 2048px 内处理</span>
        </div>
      </div>
    </section>

    <!-- 导出条 -->
    <section class="export-card">
      <div class="export-info"><span class="export-icon"><el-icon :size="22"><Download /></el-icon></span><div><strong>导出成品</strong><p>按画布当前像素导出，超大图片已在上传时缩放。</p></div></div>
      <div class="export-options">
        <label>格式<select v-model="exportFormat"><option value="png">PNG</option><option value="jpeg">JPG</option><option value="webp">WebP</option></select></label>
        <label v-if="exportFormat !== 'png'">质量<select v-model.number="exportQuality"><option :value="1">100%</option><option :value="0.92">92%</option><option :value="0.8">80%</option><option :value="0.6">60%</option></select></label>
        <span>{{ sizeLabel }}</span>
        <button type="button" :disabled="!hasImage" @click="download">下载图片</button>
      </div>
    </section>

    <ToolGuide title="使用说明">
      <el-text>
        载入图片后，可通过左侧工具进行旋转、翻转、裁剪、画笔、形状、文字、Emoji 标注与滤镜调整。裁剪、旋转、翻转会作用于整张画布（含标注对象）；添加的文字和形状可拖动缩放，双击文字可编辑，Delete / Backspace 可删除当前选中对象。所有处理均在浏览器本地完成，不会上传图片。超大图片会自动缩放至 2048px 内处理。
      </el-text>
    </ToolGuide>
  </div>
</template>

<style scoped>
.image-studio { --accent: #7157d9; --ink: #292b38; --muted: #737789; }
.panel-heading span { color: #7665a5; font-size: 13px; font-weight: 800; letter-spacing: 0.12em; }
.hero-metrics { display: grid; grid-template-columns: repeat(3, minmax(96px, 1fr)); min-width: 320px; overflow: hidden; border: 1px solid #e0e9f4; border-radius: 18px; background: rgba(255, 255, 255, 0.78); }
.hero-metrics div { padding: 12px 14px; text-align: center; border-left: 1px solid #e5edf6; }
.hero-metrics div:first-child { border-left: 0; }
.hero-metrics span, .hero-metrics strong { display: block; }
.hero-metrics span { margin-top: 4px; color: #7a899c; font-size: 12px; }
.hero-metrics strong { overflow: hidden; color: #334155; font-size: 18px; text-overflow: ellipsis; white-space: nowrap; }

.workspace-card { display: grid; grid-template-columns: 232px minmax(0, 1fr); margin-top: 14px; overflow: hidden; border: 1px solid #e1e3e9; border-radius: 20px; background: #fff; box-shadow: 0 11px 28px rgba(47, 43, 63, 0.05); }
.tool-panel { padding: 16px; border-right: 1px solid #e4e5ea; background: #fafafb; }
.panel-heading h3 { margin: 4px 0 0; color: var(--ink); font-size: 17px; }
.panel-heading.sub { margin-top: 16px; }

.upload-btn { display: flex; align-items: center; gap: 10px; width: 100%; margin-top: 14px; padding: 11px 12px; border: 1px solid #dcd9e7; border-radius: 13px; background: #fff; text-align: left; cursor: pointer; }
.upload-btn:hover { border-color: #a996d8; }
.upload-glyph { display: grid; place-items: center; width: 38px; height: 38px; flex: none; border-radius: 10px; background: #eee9fc; color: #7054b6; }
.upload-btn strong, .upload-btn small { display: block; }
.upload-btn strong { color: #494351; font-size: 14px; }
.upload-btn small { max-width: 150px; margin-top: 3px; overflow: hidden; color: #8c8590; font-size: 12px; white-space: nowrap; text-overflow: ellipsis; }

.tool-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 7px; margin-top: 14px; }
.tool-grid button { display: flex; align-items: center; justify-content: center; gap: 5px; min-width: 0; padding: 9px 4px; border: 1px solid #e0dee6; border-radius: 10px; background: #fff; color: #5d5865; font-size: 13px; cursor: pointer; }
.tool-grid button:hover { border-color: #a996d8; }
.tool-grid button.active { border-color: #c5b9e5; background: #f1ecfd; color: #684cae; font-weight: 700; }
.tool-grid button:disabled { opacity: 0.42; cursor: not-allowed; }
.tool-glyph { display: grid; place-items: center; line-height: 1; }

.history-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 10px; }
.history-row button { display: inline-flex; align-items: center; justify-content: center; gap: 3px; padding: 8px 4px; border: 1px solid #dcdde4; border-radius: 9px; background: #fff; color: #5d5865; font-size: 13px; cursor: pointer; }
.history-row button:disabled { opacity: 0.4; cursor: not-allowed; }
.history-row button.danger { color: #bd4953; }

.canvas-panel { min-width: 0; }
.canvas-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 54px; padding: 9px 16px; border-bottom: 1px solid #e5e6eb; }
.tool-status { display: flex; align-items: center; gap: 8px; min-width: 0; }
.tool-status > span { width: 9px; height: 9px; flex: none; border-radius: 50%; background: #c4c7ce; }
.tool-status > span.active { background: #35a779; box-shadow: 0 0 0 4px rgba(53, 167, 121, 0.12); }
.tool-status strong { overflow: hidden; color: #55505c; font-size: 13px; white-space: nowrap; text-overflow: ellipsis; }
.selected-tools { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 5px; }
.selected-tools.disabled { pointer-events: none; opacity: 0.38; }
.selected-tools button { display: inline-flex; align-items: center; justify-content: center; gap: 3px; min-width: 34px; height: 30px; border: 1px solid #dcdde4; border-radius: 8px; background: #fff; color: #5d5865; font-size: 13px; cursor: pointer; }
.selected-tools button.danger { color: #bd4953; }

.context-bar { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 12px; min-height: 48px; padding: 8px 16px; border-bottom: 1px solid #e5e6eb; background: #f8f9fb; }
.context-bar .ctx-group { display: flex; align-items: center; gap: 5px; }
.context-bar button { display: inline-flex; align-items: center; justify-content: center; gap: 4px; height: 30px; padding: 0 10px; border: 1px solid #dcdde4; border-radius: 8px; background: #fff; color: #5d5865; font-size: 13px; cursor: pointer; }
.context-bar .flip-v { transform: rotate(90deg); }
.context-bar button:hover { border-color: #a996d8; }
.context-bar button.active { border-color: #c5b9e5; background: #f1ecfd; color: #684cae; font-weight: 700; }
.context-bar button.primary { border-color: var(--accent); background: var(--accent); color: #fff; }
.context-bar .field { display: flex; align-items: center; gap: 6px; color: #737784; font-size: 13px; }
.context-bar .field > span { white-space: nowrap; }
.context-bar .field input[type='color'] { width: 34px; height: 28px; padding: 0; border: 1px solid #d9dce3; border-radius: 6px; background: #fff; cursor: pointer; }
.context-bar .field input[type='number'] { width: 58px; height: 30px; border: 1px solid #d9dce3; border-radius: 7px; padding: 0 6px; background: #fff; color: #515662; }
.context-bar .text-input { height: 32px; width: 180px; border: 1px solid #d9dce3; border-radius: 8px; padding: 0 10px; background: #fff; color: #334155; font-size: 13px; }
.context-bar .angle-field { display: flex; align-items: center; gap: 4px; color: #737784; font-size: 13px; }
.context-bar .angle-field input { width: 52px; height: 30px; border: 1px solid #d9dce3; border-radius: 7px; padding: 0 6px; background: #fff; color: #515662; }
.context-bar .ctx-tip { margin-left: auto; color: #8b8f9b; font-size: 12px; }
.emoji-grid { display: flex; flex-wrap: wrap; gap: 4px; max-width: 520px; }
.emoji-grid button { height: 30px; min-width: 30px; padding: 0 6px; font-size: 16px; }
.filter-grid { display: flex; flex-wrap: wrap; gap: 5px; }
.filter-grid button { min-width: 52px; }

.canvas-stage { position: relative; display: flex; align-items: center; justify-content: center; min-height: 540px; max-height: 720px; padding: 24px; overflow: auto; box-sizing: border-box; background-color: #eef0f4; background-image: linear-gradient(45deg, #dde0e7 25%, transparent 25%), linear-gradient(-45deg, #dde0e7 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #dde0e7 75%), linear-gradient(-45deg, transparent 75%, #dde0e7 75%); background-size: 24px 24px; background-position: 0 0, 0 12px, 12px -12px, -12px 0; }
.canvas-stage canvas { box-shadow: 0 4px 18px rgba(30, 41, 59, 0.18); }
.canvas-stage canvas.hidden { display: none; }
/* fabric 7 会把 canvas 包裹在动态创建的 .canvas-container 中（无 data-v），需 :deep 才能命中；无图片时隐藏避免占用 flex 空间 */
.canvas-stage.empty :deep(.canvas-container) { display: none; }
.empty-stage { display: flex; align-items: center; flex-direction: column; gap: 6px; padding: 40px; border: 1px dashed #c9ccd6; border-radius: 18px; color: #7a8090; text-align: center; background: rgba(255, 255, 255, 0.6); }
.empty-glyph { color: #7a8090; line-height: 1; }
.empty-stage strong { color: #4b5563; font-size: 16px; }
.empty-stage p { margin: 0; font-size: 13px; }
.empty-upload { margin-top: 10px; padding: 10px 18px; border: 0; border-radius: 10px; background: var(--accent); color: #fff; font-size: 14px; font-weight: 700; cursor: pointer; }
.crop-hint { position: absolute; top: 10px; left: 50%; transform: translateX(-50%); padding: 5px 12px; border-radius: 999px; background: rgba(15, 23, 42, 0.72); color: #fff; font-size: 12px; pointer-events: none; }

.canvas-footer { display: flex; align-items: center; gap: 18px; min-height: 40px; padding: 8px 16px; border-top: 1px solid #e5e6eb; color: #7f8390; font-size: 13px; }
.canvas-footer strong { color: #4b5563; }
.canvas-footer .scale-note { margin-left: auto; color: #b45309; }

.export-card { display: flex; align-items: center; justify-content: space-between; gap: 18px; margin-top: 14px; padding: 16px 18px; border: 1px solid #e1e3e9; border-radius: 17px; background: #fff; }
.export-info { display: flex; align-items: center; gap: 11px; }
.export-icon { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 11px; background: #eaf5f1; color: #28765c; }
.export-card strong { color: #484b57; font-size: 14px; }
.export-card p { margin: 3px 0 0; color: #818591; font-size: 13px; }
.export-options { display: flex; align-items: center; gap: 8px; }
.export-options label { display: flex; align-items: center; gap: 5px; color: #737784; font-size: 13px; }
.export-options select { height: 36px; border: 1px solid #d9dce3; border-radius: 8px; padding: 0 8px; background: #fff; color: #515662; }
.export-options > span { min-width: 92px; color: #777b87; font-size: 13px; text-align: center; }
.export-options > button { border: 0; border-radius: 9px; padding: 10px 14px; background: var(--accent); color: #fff; font-size: 14px; font-weight: 750; cursor: pointer; }
.export-options > button:disabled { opacity: 0.4; cursor: not-allowed; }

.dark .image-studio { --ink: #f1edf5; --muted: #aaa3b1; }
.dark .hero-metrics { border-color: #40516a; background: rgba(15, 23, 42, 0.5); }
.dark .hero-metrics div { border-color: #40516a; }
.dark .hero-metrics strong { color: #e7edf6; }
.dark .hero-metrics span { color: #a8b4c5; }
.dark .workspace-card, .dark .export-card { border-color: #3f4756; background: #1b2637; }
.dark .tool-panel, .dark .canvas-toolbar, .dark .canvas-footer, .dark .context-bar { border-color: #414958; }
.dark .tool-panel, .dark .context-bar { background: #202b3d; }
.dark .upload-btn strong, .dark .tool-status strong, .dark .canvas-footer strong, .dark .export-card strong { color: #ece7ef; }
.dark .upload-glyph { background: #2a2440; color: #c9b8f5; }
.dark .export-icon { background: #143529; color: #4ade80; }
.dark .empty-glyph { color: #a8b4c5; }
.dark .upload-btn, .dark .tool-grid button, .dark .history-row button, .dark .selected-tools button, .dark .context-bar button, .dark .empty-stage { border-color: #465061; background: #1b2739; color: #c9c1ce; }
.dark .tool-grid button.active, .dark .context-bar button.active { border-color: #6a5aa8; background: #2a2440; color: #c9b8f5; }
.dark .context-bar .field input[type='color'], .dark .context-bar .field input[type='number'], .dark .context-bar .text-input, .dark .context-bar .angle-field input, .dark .export-options select { border-color: #465061; background: #1b2739; color: #c9c1ce; }
.dark .canvas-footer, .dark .export-options label { color: #9aa3b2; }
.dark .canvas-stage { background-color: #121a27; background-image: linear-gradient(45deg, #1d2737 25%, transparent 25%), linear-gradient(-45deg, #1d2737 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1d2737 75%), linear-gradient(-45deg, transparent 75%, #1d2737 75%); }
.dark .empty-stage { background: rgba(27, 38, 55, 0.88); }
.dark .empty-stage strong { color: #dbe2ee; }
.dark .canvas-stage canvas { box-shadow: 0 4px 18px rgba(0, 0, 0, 0.4); }

@media (max-width: 1000px) {
  .workspace-card { grid-template-columns: 200px minmax(0, 1fr); }
  .tool-grid { grid-template-columns: 1fr; }
  .canvas-toolbar { align-items: flex-start; flex-direction: column; }
  .selected-tools { justify-content: flex-start; }
}
@media (max-width: 760px) {
  .workspace-card { grid-template-columns: 1fr; }
  .tool-panel { border-right: 0; border-bottom: 1px solid #e4e5ea; }
  .tool-grid { grid-template-columns: repeat(4, 1fr); }
  .canvas-stage { min-height: 380px; padding: 14px; }
  .export-card { align-items: flex-start; flex-direction: column; }
  .export-options { width: 100%; flex-wrap: wrap; }
  .export-options > button { width: 100%; }
  .canvas-footer { flex-wrap: wrap; }
  .ctx-tip { display: none; }
}
@media (max-width: 640px) {
  .hero-metrics { grid-template-columns: 1fr; }
  .hero-metrics div { border-left: 0; border-bottom: 1px solid #e5edf6; }
  .hero-metrics div:last-child { border-bottom: 0; }
  .canvas-stage { min-height: 340px; }
  .export-options > span { min-width: 0; margin-left: auto; }
}
</style>
