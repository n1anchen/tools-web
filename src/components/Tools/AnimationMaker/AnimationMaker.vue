<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Delete,
  Download,
  FolderOpened,
  Grid,
  Picture,
  Rank,
  RefreshLeft,
  UploadFilled,
  VideoPause,
  VideoPlay,
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import MetricsBar from '@/components/Common/MetricsBar.vue'
import { autoDown, formatBytes } from '@/utils/file'
import {
  buildSpriteRects,
  buildTimelineEnds,
  clampDurationMs,
  findFrameAtTime,
  formatDuration,
  framesToMilliseconds,
  millisecondsToFrames,
  sanitizeAnimationName,
} from '@/utils/animationStudio'
import SpriteSheetDialog from './SpriteSheetDialog.vue'
import { encodeAnimation, encodePngSequence } from './encoders'
import {
  extractImagesFromZip,
  isSupportedImageFile,
  isZipFile,
  MAX_FRAME_COUNT,
  MAX_IMAGE_BYTES,
} from './importers'
import { drawAnimationFrame, loadImageBlob } from './renderer'
import type {
  AnimationFormat,
  AnimationFrameItem,
  AnimationImageSource,
  PreviewBackground,
  PreviewScale,
  SpriteDialogValue,
  SpriteGroup,
} from './types'

const imageInput = ref<HTMLInputElement | null>(null)
const zipInput = ref<HTMLInputElement | null>(null)
const spriteInput = ref<HTMLInputElement | null>(null)
const previewCanvas = ref<HTMLCanvasElement | null>(null)
const previewViewport = ref<HTMLElement | null>(null)
const frameList = ref<HTMLElement | null>(null)
const sources = ref<AnimationImageSource[]>([])
const frames = ref<AnimationFrameItem[]>([])
const spriteGroups = ref<SpriteGroup[]>([])
const loading = ref(false)
const draggingFiles = ref(false)
const playing = ref(false)
const currentTime = ref(0)
const fitScale = ref(1)
const dragIndex = ref(-1)
const dragOverIndex = ref(-1)
const spriteDialogOpen = ref(false)
const spriteDialogDraft = ref<SpriteDialogValue | null>(null)
const pendingSprite = ref<{ image: HTMLImageElement; url: string } | null>(null)
const exporting = ref(false)
const exportProgress = ref(0)
const exportStatus = ref('')

const state = reactive({
  timingUnit: 'seconds' as 'seconds' | 'frames',
  fps: 24,
  previewScale: 'fit' as PreviewScale,
  previewBackground: 'transparent' as PreviewBackground,
  customBackground: '#7c3aed',
  includeBackground: false,
  format: 'gif' as AnimationFormat,
  maxColors: 255,
  projectName: 'animation',
})

let animationRequest = 0
let playbackAnchor = 0
let playbackStartTime = 0
let resizeObserver: ResizeObserver | undefined

const sourceMap = computed(() => new Map(sources.value.map(source => [source.id, source])))
const timelineEnds = computed(() => buildTimelineEnds(frames.value.map(frame => frame.durationMs)))
const totalDuration = computed(() => timelineEnds.value[timelineEnds.value.length - 1] ?? 0)
const currentIndex = computed(() => findFrameAtTime(timelineEnds.value, currentTime.value))
const currentFrame = computed(() => frames.value[currentIndex.value] ?? null)
const canvasSize = computed(() => ({
  width: Math.max(0, ...frames.value.map(frame => frame.sourceRect.width)),
  height: Math.max(0, ...frames.value.map(frame => frame.sourceRect.height)),
}))
const framePixelBudget = computed(() => canvasSize.value.width * canvasSize.value.height * frames.value.length)
const exportIssue = computed(() => {
  if (!frames.value.length) return '请先添加素材帧'
  if (canvasSize.value.width > 8192 || canvasSize.value.height > 8192) return '动画画布边长不能超过 8192 px'
  if (framePixelBudget.value > 80_000_000) return '动画总帧像素超过 8000 万，请减少帧数或图片尺寸'
  return ''
})
const totalSourceBytes = computed(() => sources.value.reduce((sum, source) => sum + source.blob.size, 0))
const selectedBackgroundColor = computed(() => ({
  white: '#ffffff',
  black: '#000000',
  gray: '#64748b',
  custom: state.customBackground,
  transparent: '#ffffff',
})[state.previewBackground])
const effectiveBackground = computed(() => state.includeBackground && state.previewBackground !== 'transparent')
const displayScale = computed(() => state.previewScale === 'fit' ? fitScale.value : state.previewScale)
const canvasStyle = computed(() => ({
  width: `${Math.max(1, canvasSize.value.width * displayScale.value)}px`,
  height: `${Math.max(1, canvasSize.value.height * displayScale.value)}px`,
  backgroundColor: state.previewBackground === 'transparent' ? undefined : selectedBackgroundColor.value,
}))
const framePosition = computed(() => frames.value.length && currentIndex.value >= 0 ? `${currentIndex.value + 1} / ${frames.value.length}` : '0 / 0')
const exportLabel = computed(() => state.format === 'gif' ? 'GIF' : state.format === 'png' ? 'PNG' : 'APNG')
const exportExtension = computed(() => state.format)

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function resetFileInput(input: HTMLInputElement | null) {
  if (input) input.value = ''
}

function updateProjectName(name: string) {
  if (state.projectName === 'animation') state.projectName = sanitizeAnimationName(name)
}

async function createSource(file: File, kind: AnimationImageSource['kind']) {
  if (!isSupportedImageFile(file)) throw new Error(`${file.name}：仅支持 PNG、JPEG 和 WebP`)
  if (file.size > MAX_IMAGE_BYTES) throw new Error(`${file.name}：超过 30 MB`)
  const { image, url } = await loadImageBlob(file)
  const source: AnimationImageSource = {
    id: makeId(),
    kind,
    name: file.name,
    blob: file,
    url,
    image,
    width: image.naturalWidth,
    height: image.naturalHeight,
  }
  sources.value.push(source)
  return source
}

function appendFrameForSource(source: AnimationImageSource, name = source.name) {
  frames.value.push({
    id: makeId(),
    sourceId: source.id,
    name,
    sourceRect: { x: 0, y: 0, width: source.width, height: source.height },
    durationMs: 100,
  })
}

async function addImageFiles(files: File[], kind: AnimationImageSource['kind'] = 'image') {
  const remaining = MAX_FRAME_COUNT - frames.value.length
  if (remaining <= 0) {
    ElMessage.warning(`最多添加 ${MAX_FRAME_COUNT} 帧`)
    return 0
  }
  let added = 0
  const errors: string[] = []
  for (const file of files.slice(0, remaining)) {
    try {
      const source = await createSource(file, kind)
      appendFrameForSource(source)
      updateProjectName(file.name)
      added += 1
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `${file.name} 无法读取`)
    }
  }
  if (files.length > remaining) errors.push(`超过 ${MAX_FRAME_COUNT} 帧的文件已忽略`)
  if (added) ElMessage.success(`已添加 ${added} 帧`)
  if (errors.length) ElMessage.warning(errors.slice(0, 2).join('；'))
  return added
}

async function handleIncomingFiles(fileList?: FileList | File[]) {
  const incoming = Array.from(fileList ?? [])
  if (!incoming.length || loading.value) return
  loading.value = true
  try {
    for (const file of incoming) {
      if (isZipFile(file)) await importZip(file)
      else await addImageFiles([file])
    }
  } finally {
    loading.value = false
    draggingFiles.value = false
  }
}

async function importZip(file: File) {
  try {
    const shouldUseArchiveName = state.projectName === 'animation'
    const remaining = MAX_FRAME_COUNT - frames.value.length
    const result = await extractImagesFromZip(file, remaining)
    const added = await addImageFiles(result.files.map(item => item.file), 'zip')
    if (result.skipped) ElMessage.warning(`ZIP 中另有 ${result.skipped} 张图片因帧数上限未导入`)
    if (added && shouldUseArchiveName) state.projectName = sanitizeAnimationName(file.name)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'ZIP 解压失败')
  }
}

function handleImageInput(event: Event) {
  handleIncomingFiles((event.target as HTMLInputElement).files ?? undefined)
  resetFileInput(imageInput.value)
}

function handleZipInput(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) handleIncomingFiles([file])
  resetFileInput(zipInput.value)
}

function handleDrop(event: DragEvent) {
  handleIncomingFiles(event.dataTransfer?.files)
}

async function handleSpriteInput(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  resetFileInput(spriteInput.value)
  if (!file) return
  if (!isSupportedImageFile(file) || file.size > MAX_IMAGE_BYTES) {
    ElMessage.warning('请选择不超过 30 MB 的 PNG、JPEG 或 WebP 精灵图')
    return
  }
  try {
    const loaded = await loadImageBlob(file)
    pendingSprite.value = loaded
    const width = loaded.image.naturalWidth
    const height = loaded.image.naturalHeight
    spriteDialogDraft.value = {
      file,
      name: file.name,
      imageUrl: loaded.url,
      imageWidth: width,
      imageHeight: height,
      cropRect: { x: 0, y: 0, width, height },
      cellWidth: Math.max(1, Math.round(width / 4)),
      cellHeight: Math.max(1, Math.round(height / 4)),
    }
    spriteDialogOpen.value = true
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '精灵图读取失败')
  }
}

function openSpriteEditor(group: SpriteGroup) {
  const source = sourceMap.value.get(group.sourceId)
  if (!source) return
  pendingSprite.value = null
  spriteDialogDraft.value = {
    groupId: group.id,
    sourceId: source.id,
    name: group.name,
    imageUrl: source.url,
    imageWidth: source.width,
    imageHeight: source.height,
    cropRect: { ...group.cropRect },
    cellWidth: group.cellWidth,
    cellHeight: group.cellHeight,
  }
  spriteDialogOpen.value = true
}

function closeSpriteDialog(open: boolean) {
  spriteDialogOpen.value = open
  if (open) return
  if (spriteDialogDraft.value?.file && pendingSprite.value) URL.revokeObjectURL(pendingSprite.value.url)
  pendingSprite.value = null
  spriteDialogDraft.value = null
}

function applySprite(value: SpriteDialogValue) {
  const rects = buildSpriteRects(value.imageWidth, value.imageHeight, value.cropRect, value.cellWidth, value.cellHeight)
  const existingGroup = value.groupId ? spriteGroups.value.find(group => group.id === value.groupId) : undefined
  const existingFrames = existingGroup
    ? existingGroup.frameIds.map(id => frames.value.find(frame => frame.id === id)).filter((frame): frame is AnimationFrameItem => Boolean(frame))
    : []
  if (frames.value.length - existingFrames.length + rects.length > MAX_FRAME_COUNT) {
    ElMessage.warning(`确认后会超过 ${MAX_FRAME_COUNT} 帧上限`)
    return
  }

  let sourceId = value.sourceId
  if (!existingGroup) {
    if (!value.file || !pendingSprite.value) return
    const source: AnimationImageSource = {
      id: makeId(),
      kind: 'sprite',
      name: value.name,
      blob: value.file,
      url: pendingSprite.value.url,
      image: pendingSprite.value.image,
      width: value.imageWidth,
      height: value.imageHeight,
    }
    sources.value.push(source)
    sourceId = source.id
    updateProjectName(value.name)
  }
  if (!sourceId) return

  const groupId = existingGroup?.id ?? makeId()
  const baseName = sanitizeAnimationName(value.name, 'sprite')
  const nextFrames = rects.map((rect, index): AnimationFrameItem => ({
    id: existingFrames[index]?.id ?? makeId(),
    sourceId: sourceId!,
    groupId,
    name: `${baseName}-${String(index + 1).padStart(3, '0')}`,
    sourceRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    durationMs: existingFrames[index]?.durationMs ?? 100,
    row: rect.row,
    column: rect.column,
  }))

  if (existingGroup) {
    const oldIds = new Set(existingGroup.frameIds)
    const replacementById = new Map(existingFrames.map((frame, index) => [frame.id, nextFrames[index]]))
    const rebuilt: AnimationFrameItem[] = []
    let insertAt = -1
    frames.value.forEach(frame => {
      if (!oldIds.has(frame.id)) {
        rebuilt.push(frame)
        return
      }
      const replacement = replacementById.get(frame.id)
      if (replacement) rebuilt.push(replacement)
      insertAt = rebuilt.length
    })
    const extras = nextFrames.slice(existingFrames.length)
    rebuilt.splice(insertAt < 0 ? rebuilt.length : insertAt, 0, ...extras)
    frames.value = rebuilt
    Object.assign(existingGroup, {
      name: value.name,
      frameIds: nextFrames.map(frame => frame.id),
      cropRect: { ...value.cropRect },
      cellWidth: value.cellWidth,
      cellHeight: value.cellHeight,
    })
  } else {
    frames.value.push(...nextFrames)
    spriteGroups.value.push({
      id: groupId,
      sourceId,
      name: value.name,
      frameIds: nextFrames.map(frame => frame.id),
      cropRect: { ...value.cropRect },
      cellWidth: value.cellWidth,
      cellHeight: value.cellHeight,
    })
  }
  pendingSprite.value = null
  spriteDialogDraft.value = null
  spriteDialogOpen.value = false
  ElMessage.success(existingGroup ? `已更新为 ${nextFrames.length} 个切片` : `已生成 ${nextFrames.length} 个素材帧`)
}

function pruneUnusedSources() {
  const used = new Set(frames.value.map(frame => frame.sourceId))
  sources.value = sources.value.filter(source => {
    if (used.has(source.id)) return true
    URL.revokeObjectURL(source.url)
    return false
  })
  spriteGroups.value = spriteGroups.value.filter(group => group.frameIds.length && used.has(group.sourceId))
}

function removeFrame(index: number) {
  const [removed] = frames.value.splice(index, 1)
  if (!removed) return
  const group = removed.groupId ? spriteGroups.value.find(item => item.id === removed.groupId) : undefined
  if (group) group.frameIds = group.frameIds.filter(id => id !== removed.id)
  pruneUnusedSources()
  if (!frames.value.length) pausePlayback()
}

function moveFrame(index: number, offset: number) {
  const target = index + offset
  if (target < 0 || target >= frames.value.length) return
  const list = [...frames.value]
  const [item] = list.splice(index, 1)
  list.splice(target, 0, item)
  frames.value = list
}

function onDragStart(index: number, event: DragEvent) {
  dragIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }
}

function onDropFrame(event: DragEvent, index: number) {
  event.preventDefault()
  const from = dragIndex.value
  if (from >= 0 && from !== index) {
    const list = [...frames.value]
    const [item] = list.splice(from, 1)
    list.splice(index, 0, item)
    frames.value = list
  }
  dragIndex.value = -1
  dragOverIndex.value = -1
}

function clearAll() {
  pausePlayback()
  sources.value.forEach(source => URL.revokeObjectURL(source.url))
  sources.value = []
  frames.value = []
  spriteGroups.value = []
  currentTime.value = 0
  state.projectName = 'animation'
}

function durationInput(frame: AnimationFrameItem) {
  return state.timingUnit === 'seconds'
    ? Number((frame.durationMs / 1000).toFixed(2))
    : millisecondsToFrames(frame.durationMs, state.fps)
}

function updateFrameDuration(frame: AnimationFrameItem, value: number | undefined) {
  const numeric = Number(value)
  frame.durationMs = state.timingUnit === 'seconds'
    ? clampDurationMs(numeric * 1000)
    : framesToMilliseconds(numeric, state.fps)
  resetPlaybackAnchor()
}

function setCurrentFrame(index: number) {
  if (index < 0 || index >= frames.value.length) return
  currentTime.value = index === 0 ? 0 : timelineEnds.value[index - 1]
  resetPlaybackAnchor()
}

function resetPlaybackAnchor() {
  playbackStartTime = performance.now()
  playbackAnchor = currentTime.value
}

function playbackTick(timestamp: number) {
  if (!playing.value || !totalDuration.value) return
  const elapsed = timestamp - playbackStartTime
  currentTime.value = (playbackAnchor + elapsed) % totalDuration.value
  animationRequest = requestAnimationFrame(playbackTick)
}

function play() {
  if (!frames.value.length || playing.value) return
  if (currentTime.value >= totalDuration.value - 1) currentTime.value = 0
  playing.value = true
  resetPlaybackAnchor()
  animationRequest = requestAnimationFrame(playbackTick)
}

function pausePlayback() {
  playing.value = false
  if (animationRequest) cancelAnimationFrame(animationRequest)
  animationRequest = 0
}

function togglePlayback() {
  if (playing.value) pausePlayback()
  else play()
}

function stepFrame(offset: number) {
  if (!frames.value.length) return
  pausePlayback()
  const base = currentIndex.value < 0 ? 0 : currentIndex.value
  setCurrentFrame((base + offset + frames.value.length) % frames.value.length)
}

function restart() {
  currentTime.value = 0
  resetPlaybackAnchor()
}

function handleSeek() {
  if (currentTime.value >= totalDuration.value) currentTime.value = Math.max(0, totalDuration.value - 1)
  resetPlaybackAnchor()
}

function sourceFor(frame: AnimationFrameItem) {
  return sourceMap.value.get(frame.sourceId)
}

function frameViewBox(frame: AnimationFrameItem) {
  const rect = frame.sourceRect
  return `${rect.x} ${rect.y} ${rect.width} ${rect.height}`
}

function drawPreview() {
  const canvas = previewCanvas.value
  const frame = currentFrame.value
  if (!canvas || !frame) return
  const source = sourceMap.value.get(frame.sourceId)
  if (!source) return
  drawAnimationFrame(canvas, source, frame, {
    width: canvasSize.value.width,
    height: canvasSize.value.height,
    includeBackground: effectiveBackground.value,
    backgroundColor: selectedBackgroundColor.value,
  })
}

function updateFitScale() {
  const viewport = previewViewport.value
  if (!viewport || !canvasSize.value.width || !canvasSize.value.height) return
  fitScale.value = Math.max(.05, Math.min(
    (viewport.clientWidth - 48) / canvasSize.value.width,
    (viewport.clientHeight - 48) / canvasSize.value.height,
  ))
}

async function exportAnimation() {
  if (exportIssue.value || exporting.value) return
  exporting.value = true
  exportProgress.value = 0
  exportStatus.value = '正在准备素材'
  pausePlayback()
  try {
    const snapshot = frames.value.map(frame => ({ ...frame, sourceRect: { ...frame.sourceRect } }))
    const blob = await encodeAnimation({
      frames: snapshot,
      sources: sourceMap.value,
      render: {
        width: canvasSize.value.width,
        height: canvasSize.value.height,
        includeBackground: effectiveBackground.value,
        backgroundColor: selectedBackgroundColor.value,
      },
      format: state.format,
      maxColors: state.maxColors,
      onProgress(value, message) {
        exportProgress.value = value
        exportStatus.value = message
      },
    })
    autoDown(URL.createObjectURL(blob), `${sanitizeAnimationName(state.projectName)}.${exportExtension.value}`)
    ElMessage.success(`已导出 ${exportLabel.value} 动图`)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '动图导出失败')
  } finally {
    exporting.value = false
  }
}

async function exportMaterialFrames(targetFrames = frames.value, name = state.projectName) {
  if (!targetFrames.length || exporting.value) return
  exporting.value = true
  exportProgress.value = 0
  exportStatus.value = '正在准备 PNG 序列'
  try {
    const blob = await encodePngSequence(
      targetFrames.map(frame => ({ ...frame, sourceRect: { ...frame.sourceRect } })),
      sourceMap.value,
      name,
      (value, message) => {
        exportProgress.value = value
        exportStatus.value = message
      },
    )
    autoDown(URL.createObjectURL(blob), `${sanitizeAnimationName(name)}-png-sequence.zip`)
    ElMessage.success(`已导出 ${targetFrames.length} 张 PNG 素材`)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'PNG 序列导出失败')
  } finally {
    exporting.value = false
  }
}

function exportSpriteGroup(group: SpriteGroup) {
  exportMaterialFrames(frames.value.filter(frame => frame.groupId === group.id), group.name)
}

function handleVisibility() {
  if (document.hidden) pausePlayback()
}

watch([currentFrame, canvasSize, effectiveBackground, selectedBackgroundColor], () => nextTick(drawPreview), { deep: true })
watch(canvasSize, () => nextTick(updateFitScale), { deep: true })
watch(totalDuration, duration => {
  if (!duration) currentTime.value = 0
  else if (currentTime.value >= duration) currentTime.value = Math.max(0, duration - 1)
  resetPlaybackAnchor()
})
watch(() => state.previewBackground, value => {
  if (value === 'transparent') state.includeBackground = false
})
watch(currentFrame, frame => {
  if (!playing.value || !frame || !frameList.value) return
  const item = Array.from(frameList.value.querySelectorAll<HTMLElement>('[data-frame-id]'))
    .find(element => element.dataset.frameId === frame.id)
  if (!item) return
  const top = item.offsetTop
  const bottom = top + item.offsetHeight
  if (top < frameList.value.scrollTop) frameList.value.scrollTo({ top, behavior: 'smooth' })
  else if (bottom > frameList.value.scrollTop + frameList.value.clientHeight) frameList.value.scrollTo({ top: bottom - frameList.value.clientHeight, behavior: 'smooth' })
})

onMounted(() => {
  resizeObserver = new ResizeObserver(updateFitScale)
  if (previewViewport.value) resizeObserver.observe(previewViewport.value)
  document.addEventListener('visibilitychange', handleVisibility)
})

onBeforeUnmount(() => {
  pausePlayback()
  resizeObserver?.disconnect()
  document.removeEventListener('visibilitychange', handleVisibility)
  if (pendingSprite.value) URL.revokeObjectURL(pendingSprite.value.url)
  sources.value.forEach(source => URL.revokeObjectURL(source.url))
})
</script>

<template>
  <div class="animation-page flex flex-col mt-3 flex-1">
    <ToolHero summary="整理素材、校准节奏、实时预览并导出动图">
      <template #metrics>
        <MetricsBar :items="[
          { label: '素材帧', value: frames.length },
          { label: '画布', value: canvasSize.width ? `${canvasSize.width} × ${canvasSize.height}` : '—' },
          { label: '时长', value: totalDuration ? formatDuration(totalDuration) : '—' },
        ]" />
      </template>
    </ToolHero>

    <input ref="imageInput" class="sr-only" type="file" multiple accept="image/png,image/jpeg,image/webp,.zip" @change="handleImageInput">
    <input ref="zipInput" class="sr-only" type="file" accept="application/zip,.zip" @change="handleZipInput">
    <input ref="spriteInput" class="sr-only" type="file" accept="image/png,image/jpeg,image/webp" @change="handleSpriteInput">

    <section class="studio-grid">
      <article class="materials-card">
        <header class="card-heading">
          <div><span class="eyebrow">FRAME MATERIALS</span><h2>素材与帧顺序</h2><p>每个素材只保存一次，延时不会展开成重复帧。</p></div>
          <el-button v-if="frames.length" text type="danger" @click="clearAll">清空</el-button>
        </header>

        <div
          class="import-zone"
          :class="{ dragging: draggingFiles }"
          @dragenter.prevent="draggingFiles = true"
          @dragover.prevent
          @dragleave.prevent="draggingFiles = false"
          @drop.prevent="handleDrop"
        >
          <div class="import-copy"><el-icon><UploadFilled /></el-icon><span><strong>{{ frames.length ? '继续添加素材' : '拖入图片或 ZIP 压缩包' }}</strong><small>PNG / JPEG / WebP · 最多 {{ MAX_FRAME_COUNT }} 帧</small></span></div>
          <div class="import-actions">
            <el-button :icon="Picture" :loading="loading" @click="imageInput?.click()">添加图片</el-button>
            <el-button :icon="FolderOpened" @click="zipInput?.click()">导入 ZIP</el-button>
            <el-button type="primary" :icon="Grid" @click="spriteInput?.click()">导入精灵图</el-button>
          </div>
        </div>

        <div v-if="frames.length" class="material-toolbar">
          <div class="timing-control">
            <span>延时单位</span>
            <el-radio-group v-model="state.timingUnit" size="small">
              <el-radio-button value="seconds">秒</el-radio-button>
              <el-radio-button value="frames">帧</el-radio-button>
            </el-radio-group>
            <label v-if="state.timingUnit === 'frames'">FPS <el-input-number v-model="state.fps" :min="1" :max="120" size="small" controls-position="right" /></label>
          </div>
          <el-button :icon="Download" :loading="exporting" @click="exportMaterialFrames()">导出 PNG 序列</el-button>
        </div>

        <div v-if="spriteGroups.length" class="sprite-groups">
          <div v-for="group in spriteGroups" :key="group.id" class="sprite-group">
            <span><el-icon><Grid /></el-icon><b>{{ group.name }}</b><small>{{ frames.filter(frame => frame.groupId === group.id).length }} 个切片</small></span>
            <div><el-button size="small" @click="openSpriteEditor(group)">重新切片</el-button><el-button size="small" :icon="Download" @click="exportSpriteGroup(group)">导出本组</el-button></div>
          </div>
        </div>

        <div v-if="frames.length" ref="frameList" class="frame-list">
          <article
            v-for="(frame, index) in frames"
            :key="frame.id"
            :data-frame-id="frame.id"
            class="frame-item"
            :class="{ active: currentIndex === index, over: dragOverIndex === index, dragging: dragIndex === index }"
            draggable="true"
            @click="setCurrentFrame(index)"
            @dragstart="onDragStart(index, $event)"
            @dragover.prevent="dragOverIndex = index"
            @dragleave="dragOverIndex = -1"
            @drop="onDropFrame($event, index)"
            @dragend="dragIndex = -1; dragOverIndex = -1"
          >
            <div class="frame-rank"><el-icon><Rank /></el-icon><b>{{ String(index + 1).padStart(3, '0') }}</b><i v-if="currentIndex === index" /></div>
            <div class="frame-thumb">
              <svg v-if="sourceFor(frame)" :viewBox="frameViewBox(frame)" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
                <image :href="sourceFor(frame)?.url" x="0" y="0" :width="sourceFor(frame)?.width" :height="sourceFor(frame)?.height" />
              </svg>
            </div>
            <div class="frame-info"><strong :title="frame.name">{{ frame.name }}</strong><small>{{ frame.sourceRect.width }} × {{ frame.sourceRect.height }} px</small></div>
            <label class="delay-input" @click.stop><span>延时</span><el-input-number
              :model-value="durationInput(frame)"
              :min="state.timingUnit === 'seconds' ? .01 : 1"
              :max="state.timingUnit === 'seconds' ? 60 : 7200"
              :step="state.timingUnit === 'seconds' ? .01 : 1"
              :precision="state.timingUnit === 'seconds' ? 2 : 0"
              controls-position="right"
              size="small"
              @update:model-value="updateFrameDuration(frame, $event)"
            /><em>{{ state.timingUnit === 'seconds' ? '秒' : '帧' }}</em></label>
            <div class="frame-actions" @click.stop>
              <el-button :icon="ArrowUp" size="small" title="上移" :disabled="index === 0" @click="moveFrame(index, -1)" />
              <el-button :icon="ArrowDown" size="small" title="下移" :disabled="index === frames.length - 1" @click="moveFrame(index, 1)" />
              <el-button :icon="Delete" size="small" title="移除" @click="removeFrame(index)" />
            </div>
          </article>
        </div>
        <div v-else class="empty-materials"><el-icon><Picture /></el-icon><strong>还没有素材帧</strong><span>批量选择图片、拖入 ZIP，或从一张精灵图开始。</span></div>
      </article>

      <div class="preview-column">
        <article class="preview-card">
          <header class="card-heading preview-heading">
            <div><span class="eyebrow">LIVE ANIMATION</span><h2>实时预览</h2></div>
            <span class="frame-counter">{{ framePosition }}</span>
          </header>

          <div class="scale-toolbar">
            <span>预览大小</span>
            <el-radio-group v-model="state.previewScale" size="small">
              <el-radio-button value="fit">适应</el-radio-button>
              <el-radio-button :value="1">实际</el-radio-button>
              <el-radio-button :value="2">2×</el-radio-button>
              <el-radio-button :value="4">4×</el-radio-button>
              <el-radio-button :value="8">8×</el-radio-button>
            </el-radio-group>
          </div>

          <div
            ref="previewViewport"
            class="preview-viewport"
            tabindex="0"
            @keydown.space.prevent="togglePlayback"
          >
            <canvas
              v-if="frames.length"
              ref="previewCanvas"
              class="preview-canvas"
              :class="{ checkerboard: state.previewBackground === 'transparent' }"
              :style="canvasStyle"
              aria-label="动图实时预览"
            />
            <div v-else class="empty-preview"><el-icon><VideoPlay /></el-icon><strong>添加素材后即可预览</strong></div>
          </div>

          <div class="player-controls">
            <el-button circle :icon="RefreshLeft" title="回到开头" :disabled="!frames.length" @click="restart" />
            <el-button circle :icon="ArrowLeft" title="上一帧" :disabled="!frames.length" @click="stepFrame(-1)" />
            <el-button class="play-button" type="primary" circle :icon="playing ? VideoPause : VideoPlay" :disabled="!frames.length" :title="playing ? '暂停' : '播放'" @click="togglePlayback" />
            <el-button circle :icon="ArrowRight" title="下一帧" :disabled="!frames.length" @click="stepFrame(1)" />
            <span>{{ formatDuration(currentTime) }} / {{ totalDuration ? formatDuration(totalDuration) : '0.00 秒' }}</span>
          </div>
          <el-slider v-model="currentTime" class="progress-slider" :min="0" :max="Math.max(1, totalDuration)" :step="1" :disabled="!frames.length" :show-tooltip="false" @input="handleSeek" />
        </article>

        <section class="settings-grid">
          <article class="settings-card">
            <header><span class="eyebrow">PREVIEW BACKGROUND</span><h3>背景与透明度</h3></header>
            <div class="background-options">
              <button type="button" class="transparent-swatch" :class="{ active: state.previewBackground === 'transparent' }" title="透明网格" @click="state.previewBackground = 'transparent'" />
              <button type="button" class="white" :class="{ active: state.previewBackground === 'white' }" title="白色" @click="state.previewBackground = 'white'" />
              <button type="button" class="black" :class="{ active: state.previewBackground === 'black' }" title="黑色" @click="state.previewBackground = 'black'" />
              <button type="button" class="gray" :class="{ active: state.previewBackground === 'gray' }" title="灰色" @click="state.previewBackground = 'gray'" />
              <button type="button" class="custom" :class="{ active: state.previewBackground === 'custom' }" :style="{ background: state.customBackground }" title="自定义颜色" @click="state.previewBackground = 'custom'">＋</button>
              <el-color-picker v-if="state.previewBackground === 'custom'" v-model="state.customBackground" />
            </div>
            <label class="switch-row"><span><strong>导出时包含背景</strong><small>{{ state.previewBackground === 'transparent' ? '透明网格只是预览辅助，不会写入文件' : '关闭时保留透明通道' }}</small></span><el-switch v-model="state.includeBackground" :disabled="state.previewBackground === 'transparent'" /></label>
          </article>

          <article class="settings-card export-card">
            <header><span class="eyebrow">ANIMATION EXPORT</span><h3>动画导出</h3></header>
            <label class="name-field"><span>文件名</span><el-input v-model="state.projectName" maxlength="80" /></label>
            <div class="format-options">
              <button type="button" :class="{ active: state.format === 'gif' }" @click="state.format = 'gif'"><b>GIF</b><small>兼容广泛</small></button>
              <button type="button" :class="{ active: state.format === 'png' }" @click="state.format = 'png'"><b>PNG</b><small>.png · image/png</small></button>
              <button type="button" :class="{ active: state.format === 'apng' }" @click="state.format = 'apng'"><b>APNG</b><small>.apng · image/apng</small></button>
            </div>
            <label v-if="state.format === 'gif'" class="quality-field"><span>GIF 最大颜色数 <b>{{ state.maxColors }}</b></span><el-slider v-model="state.maxColors" :min="16" :max="255" :step="1" /></label>
            <div class="export-summary"><span>{{ frames.length }} 帧 · {{ totalDuration ? formatDuration(totalDuration) : '0 秒' }}</span><span>{{ formatBytes(totalSourceBytes) }} 源素材</span></div>
            <p v-if="exportIssue" class="export-issue">{{ exportIssue }}</p>
            <div v-if="exporting" class="export-progress"><el-progress :percentage="exportProgress" :stroke-width="8" /><span>{{ exportStatus }}</span></div>
            <el-button class="export-button" type="primary" size="large" :icon="Download" :loading="exporting" :disabled="Boolean(exportIssue)" @click="exportAnimation">导出 {{ exportLabel }} 动图</el-button>
          </article>
        </section>
      </div>
    </section>

    <ToolGuide title="使用说明" description="导入素材后调整顺序与延时，预览会实时反映最终播放节奏。">
      <div class="guide-grid"><p><b>精灵图：</b>先调整有效范围与单帧尺寸，分割线会实时显示；只有确认后才会加入素材，之后可从素材组重新切片。</p><p><b>PNG 序列：</b>素材区导出每个条目一次，并保持原始切片尺寸；延时不会生成重复图片。</p><p><b>动画格式：</b>PNG 与 APNG 使用同一动画数据结构，但分别采用对应的扩展名和媒体类型；GIF 的颜色和透明度能力较弱。</p></div>
    </ToolGuide>

    <SpriteSheetDialog v-model="spriteDialogOpen" :value="spriteDialogDraft" @update:model-value="closeSpriteDialog" @confirm="applySprite" />
  </div>
</template>

<style scoped>
.animation-page{gap:16px;--animation-accent:var(--c-primary)}.studio-grid{display:grid;grid-template-columns:minmax(410px,.9fr) minmax(0,1.35fr);gap:16px;align-items:start}.materials-card,.preview-card,.settings-card{border:1px solid var(--c-border);border-radius:24px;background:var(--c-surface);box-shadow:0 16px 40px rgba(15,23,42,.06)}.materials-card,.preview-card,.settings-card{padding:20px}.preview-column{display:grid;gap:16px;min-width:0}.card-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:16px}.card-heading h2,.settings-card h3{margin:0;color:var(--c-text-primary)}.card-heading h2{font-size:20px}.card-heading p{margin:5px 0 0;color:var(--c-text-secondary);font-size:12px;line-height:1.55}.eyebrow{display:block;margin-bottom:5px;color:var(--animation-accent);font-size:10px;font-weight:900;letter-spacing:.16em}.import-zone{display:grid;gap:14px;padding:16px;border:2px dashed var(--c-border);border-radius:18px;background:var(--c-surface-muted);transition:.2s}.import-zone.dragging{border-color:var(--c-primary);background:var(--c-primary-50);transform:translateY(-2px)}.import-copy{display:flex;align-items:center;gap:12px}.import-copy>.el-icon{display:grid;place-items:center;width:42px;height:42px;border-radius:12px;background:var(--c-primary);color:var(--c-on-accent);font-size:20px}.import-copy span{display:grid;gap:2px}.import-copy small{color:var(--c-text-secondary)}.import-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.import-actions :deep(.el-button){margin:0}.material-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:14px;padding-bottom:14px;border-bottom:1px solid var(--c-border)}.timing-control{display:flex;align-items:center;gap:8px;color:var(--c-text-secondary);font-size:12px;flex-wrap:wrap}.timing-control label{display:flex;align-items:center;gap:6px}.timing-control :deep(.el-input-number){width:92px}.sprite-groups{display:grid;gap:8px;margin-top:14px}.sprite-group{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border:1px solid #bae6fd;border-radius:13px;background:#f0f9ff}.sprite-group>span{display:flex;align-items:center;min-width:0;gap:7px;color:#0369a1}.sprite-group b{max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sprite-group small{color:#64748b}.sprite-group>div{display:flex;gap:6px}.frame-list{display:grid;gap:8px;max-height:650px;margin-top:14px;overflow:auto;padding-right:4px;scroll-behavior:smooth}.frame-item{position:relative;display:grid;grid-template-columns:48px 74px minmax(0,1fr) 128px 96px;align-items:center;gap:10px;padding:9px;border:1px solid var(--c-border);border-radius:15px;background:var(--c-surface);transition:.18s;cursor:pointer}.frame-item:hover{border-color:var(--c-primary-300);transform:translateY(-1px)}.frame-item.active{border-color:var(--c-primary);background:var(--c-primary-50);box-shadow:0 0 0 2px color-mix(in srgb,var(--c-primary) 15%,transparent)}.frame-item.over{border-color:#f97316;transform:translateY(3px)}.frame-item.dragging{opacity:.45}.frame-rank{display:flex;align-items:center;gap:4px;color:var(--c-text-secondary);font-size:11px}.frame-rank i{width:7px;height:7px;border-radius:50%;background:var(--c-primary);box-shadow:0 0 0 4px color-mix(in srgb,var(--c-primary) 18%,transparent)}.frame-thumb{display:grid;place-items:center;width:74px;height:56px;overflow:hidden;border-radius:10px;background-color:#e2e8f0;background-image:linear-gradient(45deg,#cbd5e1 25%,transparent 25%),linear-gradient(-45deg,#cbd5e1 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#cbd5e1 75%),linear-gradient(-45deg,transparent 75%,#cbd5e1 75%);background-size:12px 12px;background-position:0 0,0 6px,6px -6px,-6px 0}.frame-thumb svg{display:block;width:100%;height:100%}.frame-info{display:grid;min-width:0;gap:3px}.frame-info strong{overflow:hidden;color:var(--c-text-primary);font-size:12.5px;text-overflow:ellipsis;white-space:nowrap}.frame-info small{color:var(--c-text-secondary);font-size:11px}.delay-input{position:relative;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:5px;color:var(--c-text-secondary);font-size:11px}.delay-input :deep(.el-input-number){width:82px}.delay-input em{font-style:normal}.frame-actions{display:flex;gap:3px}.frame-actions :deep(.el-button){margin:0;padding:7px}.empty-materials{display:grid;place-items:center;gap:7px;min-height:260px;color:var(--c-text-secondary);text-align:center}.empty-materials>.el-icon{font-size:42px;color:var(--c-primary-300)}.empty-materials strong{color:var(--c-text-primary)}.empty-materials span{font-size:12px}.preview-heading{align-items:center}.frame-counter{padding:6px 10px;border-radius:999px;background:var(--c-surface-muted);color:var(--c-text-secondary);font-size:12px;font-weight:800}.scale-toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;color:var(--c-text-secondary);font-size:12px}.preview-viewport{display:grid;place-items:center;height:500px;overflow:auto;border:1px solid var(--c-border);border-radius:18px;background:#64748b}.preview-canvas.checkerboard{background-color:#f8fafc;background-image:linear-gradient(45deg,#d7dee8 25%,transparent 25%),linear-gradient(-45deg,#d7dee8 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#d7dee8 75%),linear-gradient(-45deg,transparent 75%,#d7dee8 75%);background-size:24px 24px;background-position:0 0,0 12px,12px -12px,-12px 0}.preview-viewport canvas{display:block;max-width:none;max-height:none;box-shadow:0 12px 32px rgba(15,23,42,.16)}.empty-preview{display:grid;place-items:center;gap:9px;color:#f8fafc;text-align:center}.empty-preview>.el-icon{font-size:46px}.player-controls{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:14px}.player-controls :deep(.el-button+.el-button){margin-left:0}.player-controls span{min-width:150px;margin-left:8px;color:var(--c-text-secondary);font-size:12px;text-align:right}.play-button{transform:scale(1.14)}.progress-slider{margin-top:4px}.settings-grid{display:grid;grid-template-columns:1fr 1.15fr;gap:16px}.settings-card header{margin-bottom:14px}.settings-card h3{font-size:17px}.background-options{display:flex;align-items:center;gap:9px}.background-options button{display:grid;place-items:center;width:34px;height:34px;border:2px solid var(--c-border);border-radius:10px;box-shadow:inset 0 0 0 2px var(--c-surface);transition:.15s}.background-options button.active{border-color:var(--c-primary);transform:translateY(-2px)}.background-options .white{background:#fff}.background-options .black{background:#000}.background-options .gray{background:#64748b}.background-options .transparent-swatch{background-color:#fff;background-image:linear-gradient(45deg,#cbd5e1 25%,transparent 25%),linear-gradient(-45deg,#cbd5e1 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#cbd5e1 75%),linear-gradient(-45deg,transparent 75%,#cbd5e1 75%);background-size:12px 12px;background-position:0 0,0 6px,6px -6px,-6px 0}.background-options .custom{color:#fff;font-weight:900}.switch-row{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:16px;padding-top:14px;border-top:1px solid var(--c-border)}.switch-row>span{display:grid;gap:3px}.switch-row strong{color:var(--c-text-primary);font-size:12.5px}.switch-row small{color:var(--c-text-secondary);font-size:11px;line-height:1.45}.name-field{display:grid;gap:6px;color:var(--c-text-secondary);font-size:12px}.format-options{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}.format-options button{display:grid;gap:2px;padding:10px 6px;border:1px solid var(--c-border);border-radius:12px;background:var(--c-surface-muted);color:var(--c-text-primary);text-align:left}.format-options button.active{border-color:var(--c-primary);background:var(--c-primary-50);color:var(--c-primary-700)}.format-options small{color:var(--c-text-secondary);font-size:9.5px}.quality-field{display:grid;gap:4px;margin-top:12px;color:var(--c-text-secondary);font-size:12px}.quality-field span{display:flex;justify-content:space-between}.export-summary{display:flex;justify-content:space-between;gap:10px;margin:8px 0;color:var(--c-text-secondary);font-size:11px}.export-issue{margin:8px 0;color:#dc2626;font-size:11px}.export-progress{display:grid;gap:3px;margin:10px 0}.export-progress span{color:var(--c-text-secondary);font-size:11px}.export-button{width:100%;margin-top:8px}.guide-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.guide-grid p{margin:0;padding:14px;border:1px solid var(--c-border);border-radius:14px;background:var(--c-surface-muted);color:var(--c-text-secondary);font-size:12.5px;line-height:1.7}.guide-grid b{color:var(--c-text-primary)}:global(html.dark .animation-page .sprite-group){border-color:#164e63;background:#082f49}:global(html.dark .animation-page .sprite-group>span){color:#7dd3fc}:global(html.dark .animation-page .frame-item.active),:global(html.dark .animation-page .format-options button.active){background:color-mix(in srgb,var(--c-primary) 13%,#111827)}@media(max-width:1180px){.studio-grid{grid-template-columns:1fr}.frame-list{max-height:520px}.settings-grid{grid-template-columns:1fr 1fr}}@media(max-width:720px){.materials-card,.preview-card,.settings-card{padding:15px;border-radius:19px}.import-actions{grid-template-columns:1fr}.material-toolbar,.sprite-group,.scale-toolbar{align-items:stretch;flex-direction:column}.material-toolbar{display:flex}.sprite-group>div{display:grid;grid-template-columns:1fr 1fr}.frame-item{grid-template-columns:36px 66px minmax(0,1fr) 92px}.frame-thumb{width:66px;height:52px}.frame-actions{grid-column:2/-1;justify-content:flex-end}.delay-input{grid-template-columns:1fr auto}.delay-input>span{display:none}.settings-grid,.guide-grid{grid-template-columns:1fr}.preview-viewport{height:380px}.player-controls{gap:5px}.player-controls span{min-width:0;margin-left:3px;font-size:10px}.format-options small{display:none}}
</style>
