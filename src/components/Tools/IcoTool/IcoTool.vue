<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { BlobReader, BlobWriter, ZipWriter } from '@zip.js/zip.js'
import { ElMessage, genFileId } from 'element-plus'
import type { UploadInstance, UploadProps, UploadRawFile } from 'element-plus'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { autoDown, getFileExtension } from '@/utils/file'
import { copy } from '@/utils/string'

const title = 'ICO图标工具'
const defaultSizeOptions = [16, 32, 48, 64, 128, 256, 512]
const faviconPresetSizes = [16, 32, 48, 150, 180, 192, 512]
const faviconIcoSizes = [16, 32, 48]
const formatOptions = [
  { label: 'PNG', value: 'png' },
  { label: 'ICO', value: 'ico' },
]
const previewCanvasSize = 320

const uploadRef = ref<UploadInstance>()
const previewCanvasRef = ref<HTMLCanvasElement | null>(null)
const imageElement = ref<HTMLImageElement | null>(null)
const imageUrl = ref('')
const isDragging = ref(false)
const outputPreviews = ref<{ size: number, url: string }[]>([])
const fileList = ref([])
const customSizeInput = ref<number | null>(180)

const dragState = reactive({
  startX: 0,
  startY: 0,
  offsetX: 0,
  offsetY: 0,
})

const state = reactive({
  selectedSizes: [...defaultSizeOptions],
  selectedFormats: ['png', 'ico'],
  customSizes: [] as number[],
  roundness: 22,
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  naturalWidth: 0,
  naturalHeight: 0,
  loading: false,
  imageName: 'icon',
  useFaviconNaming: false,
})

const hasImage = computed(() => !!imageElement.value)
const allSizeOptions = computed(() => {
  return Array.from(new Set([...defaultSizeOptions, ...state.customSizes])).sort((a, b) => a - b)
})
const sortedSelectedSizes = computed(() => [...state.selectedSizes].sort((a, b) => a - b))
const icoOversizedSizes = computed(() => sortedSelectedSizes.value.filter(size => size > 256))
const exportCount = computed(() => {
  if (state.useFaviconNaming) {
    let total = 0
    if (state.selectedFormats.includes('png')) {
      total += getFaviconPngEntries().length
    }
    if (state.selectedFormats.includes('ico') && getFaviconIcoEntry()) {
      total += 1
    }
    return total
  }

  const pngCount = state.selectedFormats.includes('png') ? state.selectedSizes.length : 0
  const icoCount = state.selectedFormats.includes('ico')
    ? state.selectedSizes.filter(size => size <= 256).length
    : 0

  return pngCount + icoCount
})
const hasExportableSelection = computed(() => exportCount.value > 0)
const faviconHtmlSnippet = computed(() => {
  if (!state.useFaviconNaming) return ''

  const lines: string[] = []
  const faviconIcoEntry = getFaviconIcoEntry()

  if (state.selectedFormats.includes('ico') && faviconIcoEntry) {
    lines.push('<link rel="icon" href="/favicon.ico" sizes="any">')
  }

  if (state.selectedFormats.includes('png')) {
    for (const entry of getFaviconPngEntries()) {
      if (entry.name === 'apple-touch-icon.png') {
        lines.push('<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">')
      } else if (entry.name === 'apple-touch-icon-precomposed.png') {
        lines.push('<link rel="apple-touch-icon-precomposed" sizes="180x180" href="/apple-touch-icon-precomposed.png">')
      } else if (entry.name.startsWith('favicon-')) {
        lines.push(`<link rel="icon" type="image/png" sizes="${entry.size}x${entry.size}" href="/${entry.name}">`)
      }
    }
  }

  return lines.join('\n')
})

const roundnessLabel = computed(() => {
  if (state.roundness >= 100) return '圆形'
  if (state.roundness <= 0) return '直角'
  return `${state.roundness}%`
})

function revokeImageUrl() {
  if (!imageUrl.value) return
  URL.revokeObjectURL(imageUrl.value)
  imageUrl.value = ''
}

function clampOffsets() {
  const image = imageElement.value
  if (!image) return

  const minSide = Math.min(state.naturalWidth, state.naturalHeight)
  const cropSize = minSide / state.zoom
  const maxOffsetX = Math.max(0, (state.naturalWidth - cropSize) / 2)
  const maxOffsetY = Math.max(0, (state.naturalHeight - cropSize) / 2)

  state.offsetX = Math.min(maxOffsetX, Math.max(-maxOffsetX, state.offsetX))
  state.offsetY = Math.min(maxOffsetY, Math.max(-maxOffsetY, state.offsetY))
}

function createRoundedPath(ctx: CanvasRenderingContext2D, size: number, radius: number) {
  if (radius >= size / 2) {
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
    ctx.closePath()
    return
  }

  ctx.beginPath()
  ctx.moveTo(radius, 0)
  ctx.lineTo(size - radius, 0)
  ctx.arcTo(size, 0, size, radius, radius)
  ctx.lineTo(size, size - radius)
  ctx.arcTo(size, size, size - radius, size, radius)
  ctx.lineTo(radius, size)
  ctx.arcTo(0, size, 0, size - radius, radius)
  ctx.lineTo(0, radius)
  ctx.arcTo(0, 0, radius, 0, radius)
  ctx.closePath()
}

function drawIconToCanvas(canvas: HTMLCanvasElement, size: number) {
  const image = imageElement.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  canvas.width = size
  canvas.height = size
  ctx.clearRect(0, 0, size, size)

  if (!image) return

  const minSide = Math.min(state.naturalWidth, state.naturalHeight)
  const cropSize = minSide / state.zoom
  const baseX = (state.naturalWidth - cropSize) / 2
  const baseY = (state.naturalHeight - cropSize) / 2
  const sx = Math.min(state.naturalWidth - cropSize, Math.max(0, baseX + state.offsetX))
  const sy = Math.min(state.naturalHeight - cropSize, Math.max(0, baseY + state.offsetY))
  const radius = Math.min(size / 2, (state.roundness / 100) * (size / 2))

  ctx.save()
  createRoundedPath(ctx, size, radius)
  ctx.clip()
  ctx.drawImage(image, sx, sy, cropSize, cropSize, 0, 0, size, size)
  ctx.restore()
}

function redrawAll() {
  const previewCanvas = previewCanvasRef.value
  if (previewCanvas) {
    drawIconToCanvas(previewCanvas, previewCanvasSize)
  }

  if (!imageElement.value) {
    outputPreviews.value = []
    return
  }

  outputPreviews.value = sortedSelectedSizes.value.map((size) => {
    const canvas = document.createElement('canvas')
    drawIconToCanvas(canvas, size)
    return {
      size,
      url: canvas.toDataURL('image/png'),
    }
  })
}

function resetTransform() {
  state.zoom = 1
  state.offsetX = 0
  state.offsetY = 0
  redrawAll()
}

function normalizeSize(value: number) {
  return Math.round(value)
}

function addCustomSize() {
  const rawValue = customSizeInput.value
  if (!rawValue) {
    ElMessage.warning('请输入自定义尺寸')
    return
  }

  const size = normalizeSize(rawValue)
  if (size < 8 || size > 2048) {
    ElMessage.warning('自定义尺寸范围请控制在 8 到 2048 之间')
    return
  }

  if (!state.customSizes.includes(size) && !defaultSizeOptions.includes(size)) {
    state.customSizes.push(size)
  }

  if (!state.selectedSizes.includes(size)) {
    state.selectedSizes.push(size)
  }

  customSizeInput.value = size
}

function removeCustomSize(size: number) {
  state.customSizes = state.customSizes.filter(item => item !== size)
  state.selectedSizes = state.selectedSizes.filter(item => item !== size)
}

function ensureSizes(sizes: number[]) {
  for (const size of sizes) {
    if (!defaultSizeOptions.includes(size) && !state.customSizes.includes(size)) {
      state.customSizes.push(size)
    }
  }
}

function applyFaviconPreset() {
  ensureSizes(faviconPresetSizes)
  state.selectedSizes = [...faviconPresetSizes]
  state.selectedFormats = ['png', 'ico']
  state.useFaviconNaming = true
}

function getFaviconPngEntries() {
  const entries = [
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'favicon-48x48.png', size: 48 },
    { name: 'mstile-150x150.png', size: 150 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'apple-touch-icon-precomposed.png', size: 180 },
    { name: 'android-chrome-192x192.png', size: 192 },
    { name: 'android-chrome-512x512.png', size: 512 },
  ]

  return entries.filter(entry => state.selectedSizes.includes(entry.size))
}

function getFaviconIcoEntry() {
  const sizes = faviconIcoSizes.filter(size => state.selectedSizes.includes(size))
  if (!sizes.length) return null
  return {
    name: 'favicon.ico',
    sizes,
  }
}

function getExportLabel(size: number) {
  if (state.useFaviconNaming) {
    const labels = getFaviconPngEntries()
      .filter(entry => entry.size === size)
      .map(entry => entry.name)

    if (getFaviconIcoEntry()?.sizes.includes(size)) {
      labels.push('favicon.ico')
    }

    return labels.join(' / ') || '自定义导出'
  }

  const labels: string[] = []

  if (state.selectedFormats.includes('png')) {
    labels.push('PNG')
  }

  if (state.selectedFormats.includes('ico')) {
    labels.push(size <= 256 ? 'ICO' : 'ICO 不支持')
  }

  return labels.join(' / ')
}

function copyFaviconHtmlSnippet() {
  copy(faviconHtmlSnippet.value)
}

function loadImage(file: File) {
  revokeImageUrl()
  imageUrl.value = URL.createObjectURL(file)
  const image = new Image()

  image.onload = () => {
    imageElement.value = image
    state.naturalWidth = image.naturalWidth
    state.naturalHeight = image.naturalHeight
    state.imageName = file.name.replace(new RegExp(`\\.${getFileExtension(file.name)}$`, 'i'), '') || 'icon'
    resetTransform()
  }

  image.onerror = () => {
    ElMessage.error('图片加载失败，请重新选择文件')
    imageElement.value = null
    outputPreviews.value = []
    revokeImageUrl()
  }

  image.src = imageUrl.value
}

const handleChange: UploadProps['onChange'] = (file) => {
  if (!file.raw) return
  loadImage(file.raw)
}

const handleExceed: UploadProps['onExceed'] = (files) => {
  uploadRef.value?.clearFiles()
  const file = files[0] as UploadRawFile
  file.uid = genFileId()
  uploadRef.value?.handleStart(file)
  loadImage(file)
}

function updateZoom(nextZoom: number) {
  state.zoom = Math.min(6, Math.max(1, Number(nextZoom.toFixed(2))))
  clampOffsets()
  redrawAll()
}

function handleWheel(event: WheelEvent) {
  if (!imageElement.value) return
  event.preventDefault()
  const delta = event.deltaY < 0 ? 0.1 : -0.1
  updateZoom(state.zoom + delta)
}

function handlePointerDown(event: PointerEvent) {
  if (!imageElement.value) return
  isDragging.value = true
  dragState.startX = event.clientX
  dragState.startY = event.clientY
  dragState.offsetX = state.offsetX
  dragState.offsetY = state.offsetY
  ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
}

function handlePointerMove(event: PointerEvent) {
  if (!isDragging.value || !imageElement.value) return
  const minSide = Math.min(state.naturalWidth, state.naturalHeight)
  const cropSize = minSide / state.zoom
  const ratio = cropSize / previewCanvasSize
  const deltaX = (event.clientX - dragState.startX) * ratio
  const deltaY = (event.clientY - dragState.startY) * ratio

  state.offsetX = dragState.offsetX - deltaX
  state.offsetY = dragState.offsetY - deltaY
  clampOffsets()
  redrawAll()
}

function handlePointerUp(event: PointerEvent) {
  if (!isDragging.value) return
  isDragging.value = false
  ;(event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId)
}

async function canvasToBlob(canvas: HTMLCanvasElement, type: string) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('生成文件失败'))
        return
      }
      resolve(blob)
    }, type)
  })
}

async function createPngBlob(size: number) {
  const canvas = document.createElement('canvas')
  drawIconToCanvas(canvas, size)
  return canvasToBlob(canvas, 'image/png')
}

async function createIcoBlob(sizes: number[]) {
  const normalizedSizes = Array.from(new Set(sizes.filter(size => size > 0 && size <= 256))).sort((a, b) => a - b)
  const pngEntries = await Promise.all(
    normalizedSizes.map(async (size) => {
      const pngBlob = await createPngBlob(size)
      return {
        size,
        bytes: new Uint8Array(await pngBlob.arrayBuffer()),
      }
    }),
  )

  const directorySize = 6 + (pngEntries.length * 16)
  const header = new Uint8Array(directorySize)
  const view = new DataView(header.buffer)

  view.setUint16(0, 0, true)
  view.setUint16(2, 1, true)
  view.setUint16(4, pngEntries.length, true)

  let offset = directorySize
  for (const [index, entry] of pngEntries.entries()) {
    const baseOffset = 6 + (index * 16)
    view.setUint8(baseOffset, entry.size >= 256 ? 0 : entry.size)
    view.setUint8(baseOffset + 1, entry.size >= 256 ? 0 : entry.size)
    view.setUint8(baseOffset + 2, 0)
    view.setUint8(baseOffset + 3, 0)
    view.setUint16(baseOffset + 4, 1, true)
    view.setUint16(baseOffset + 6, 32, true)
    view.setUint32(baseOffset + 8, entry.bytes.byteLength, true)
    view.setUint32(baseOffset + 12, offset, true)
    offset += entry.bytes.byteLength
  }

  return new Blob([header, ...pngEntries.map(entry => entry.bytes)], { type: 'image/x-icon' })
}

async function exportZip() {
  if (!imageElement.value) {
    ElMessage.warning('请先上传图片')
    return
  }
  if (!state.selectedSizes.length) {
    ElMessage.warning('请至少选择一个尺寸')
    return
  }
  if (!state.selectedFormats.length) {
    ElMessage.warning('请至少选择一种格式')
    return
  }
  if (!hasExportableSelection.value) {
    ElMessage.warning('当前选择没有可导出的文件，请调整尺寸或格式')
    return
  }

  state.loading = true
  const skippedIcoSizes: number[] = []

  try {
    const blobWriter = new BlobWriter('application/zip')
    const zipWriter = new ZipWriter(blobWriter)

    if (state.useFaviconNaming) {
      if (state.selectedFormats.includes('png')) {
        for (const entry of getFaviconPngEntries()) {
          const pngBlob = await createPngBlob(entry.size)
          await zipWriter.add(entry.name, new BlobReader(pngBlob))
        }
      }

      if (state.selectedFormats.includes('ico')) {
        const faviconIcoEntry = getFaviconIcoEntry()
        if (faviconIcoEntry) {
          const icoBlob = await createIcoBlob(faviconIcoEntry.sizes)
          await zipWriter.add(faviconIcoEntry.name, new BlobReader(icoBlob))
        }
      }
    } else {
      for (const size of sortedSelectedSizes.value) {
        if (state.selectedFormats.includes('png')) {
          const pngBlob = await createPngBlob(size)
          await zipWriter.add(
            `${state.imageName || 'icon'}-${size}x${size}.png`,
            new BlobReader(pngBlob),
          )
        }

        if (state.selectedFormats.includes('ico')) {
          if (size > 256) {
            skippedIcoSizes.push(size)
          } else {
            const icoBlob = await createIcoBlob([size])
            await zipWriter.add(
              `${state.imageName || 'icon'}-${size}x${size}.ico`,
              new BlobReader(icoBlob),
            )
          }
        }
      }
    }

    await zipWriter.close()
    const zipBlob = await blobWriter.getData()
    const url = URL.createObjectURL(zipBlob)
    autoDown(url, `${state.imageName || 'icon'}-icons.zip`)
    setTimeout(() => URL.revokeObjectURL(url), 5000)

    if (skippedIcoSizes.length) {
      ElMessage.warning(`ICO 已跳过 ${skippedIcoSizes.join('、')} 尺寸，ICO 标准通常仅支持到 256`)
    } else {
      ElMessage.success('图标压缩包已开始下载')
    }
  } catch (error) {
    console.error(error)
    ElMessage.error('导出失败，请稍后重试')
  } finally {
    state.loading = false
  }
}

watch(
  [
    () => state.zoom,
    () => state.offsetX,
    () => state.offsetY,
    () => state.roundness,
    () => state.selectedSizes.join(','),
  ],
  () => {
    clampOffsets()
    redrawAll()
  },
)

onBeforeUnmount(() => {
  revokeImageUrl()
})
</script>

<template>
  <div class="flex flex-col mt-3 flex-1">
    <DetailHeader :title="title" />

    <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div class="grid gap-4 xl:grid-cols-[minmax(0,380px),minmax(0,1fr)]">
        <section class="space-y-4">
          <div class="rounded-2xl border border-dashed border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/40 p-4">
            <div class="flex flex-wrap items-center gap-3">
              <el-upload
                ref="uploadRef"
                v-model:file-list="fileList"
                :auto-upload="false"
                :show-file-list="false"
                :limit="1"
                accept="image/*"
                @change="handleChange"
                @exceed="handleExceed"
              >
                <template #trigger>
                  <el-button type="primary">选择图片</el-button>
                </template>
              </el-upload>
              <el-button :disabled="!hasImage" @click="resetTransform">重置位置</el-button>
              <span class="text-sm text-slate-500 dark:text-slate-400">
                支持拖拽移动、滚轮缩放，也可用滑杆精调
              </span>
            </div>

            <div class="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <div class="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">导出尺寸</div>
                <el-checkbox-group v-model="state.selectedSizes" class="flex flex-wrap gap-2">
                  <el-checkbox v-for="size in allSizeOptions" :key="size" :label="size">
                    {{ size }} x {{ size }}
                  </el-checkbox>
                </el-checkbox-group>
                <div class="mt-3 flex flex-wrap items-center gap-2">
                  <el-input-number v-model="customSizeInput" :min="8" :max="2048" :step="1" controls-position="right" />
                  <el-button @click="addCustomSize">添加自定义尺寸</el-button>
                </div>
                <div v-if="state.customSizes.length" class="mt-3 flex flex-wrap gap-2">
                  <el-tag
                    v-for="size in [...state.customSizes].sort((a, b) => a - b)"
                    :key="size"
                    closable
                    @close="removeCustomSize(size)"
                  >
                    {{ size }} x {{ size }}
                  </el-tag>
                </div>
              </div>

              <div>
                <div class="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">导出格式</div>
                <el-checkbox-group v-model="state.selectedFormats" class="flex flex-wrap gap-2">
                  <el-checkbox v-for="format in formatOptions" :key="format.value" :label="format.value">
                    {{ format.label }}
                  </el-checkbox>
                </el-checkbox-group>
                <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  ICO 将按尺寸分别生成文件，并与 PNG 一起打包进 zip
                </p>
                <p v-if="icoOversizedSizes.length" class="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  512 等大于 256 的尺寸会仅导出 PNG，ICO 标准通常支持到 256
                </p>
                <div class="mt-3 flex flex-wrap items-center gap-2">
                  <el-button type="primary" plain @click="applyFaviconPreset">一键套用 favicon 套件</el-button>
                  <el-switch
                    v-model="state.useFaviconNaming"
                    inline-prompt
                    active-text="套件命名"
                    inactive-text="普通命名"
                  />
                </div>
                <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  套件命名会按常见站点图标规则输出 favicon.ico、apple-touch-icon.png、android-chrome-192x192.png 等文件名
                </p>
              </div>
            </div>

            <div class="mt-4 space-y-4">
              <div>
                <div class="mb-2 flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-200">
                  <span>圆角</span>
                  <span class="text-slate-500 dark:text-slate-400">{{ roundnessLabel }}</span>
                </div>
                <el-slider v-model="state.roundness" :min="0" :max="100" />
              </div>

              <div>
                <div class="mb-2 flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-200">
                  <span>缩放</span>
                  <span class="text-slate-500 dark:text-slate-400">{{ state.zoom.toFixed(1) }}x</span>
                </div>
                <el-slider v-model="state.zoom" :min="1" :max="6" :step="0.1" />
              </div>
            </div>

            <div class="mt-4 rounded-xl bg-slate-100 dark:bg-slate-900/70 p-3 text-sm text-slate-600 dark:text-slate-300">
              <div>当前图片：{{ hasImage ? `${state.naturalWidth} x ${state.naturalHeight}` : '未上传' }}</div>
              <div class="mt-1">预计导出文件数：{{ exportCount }}</div>
              <div class="mt-1">导出模式：{{ state.useFaviconNaming ? 'favicon 套件命名' : '普通尺寸命名' }}</div>
            </div>

            <div v-if="state.useFaviconNaming" class="mt-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 p-3">
              <div class="mb-2 flex items-center justify-between">
                <div class="text-sm font-medium text-slate-700 dark:text-slate-200">HTML 引用代码</div>
                <el-button size="small" :disabled="!faviconHtmlSnippet" @click="copyFaviconHtmlSnippet">一键复制</el-button>
              </div>
              <el-input
                :model-value="faviconHtmlSnippet || '当前选择暂未生成可引用的 favicon HTML 代码'"
                type="textarea"
                :rows="6"
                readonly
              />
            </div>

            <el-button
              class="mt-4 !w-full"
              type="primary"
              :loading="state.loading"
              :disabled="!hasImage || !state.selectedSizes.length || !state.selectedFormats.length || !hasExportableSelection"
              @click="exportZip"
            >
              下载 zip 压缩包
            </el-button>
          </div>
        </section>

        <section class="space-y-4">
          <div class="grid gap-4 lg:grid-cols-[minmax(0,360px),minmax(0,1fr)]">
            <div>
              <div class="mb-2 flex items-center justify-between">
                <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200">裁切预览</h3>
                <span class="text-xs text-slate-500 dark:text-slate-400">拖拽移动，滚轮缩放</span>
              </div>

              <div
                class="relative overflow-hidden rounded-[28px] border border-slate-200 dark:border-slate-700 bg-[linear-gradient(45deg,#f8fafc_25%,#e2e8f0_25%,#e2e8f0_50%,#f8fafc_50%,#f8fafc_75%,#e2e8f0_75%,#e2e8f0_100%)] bg-[length:24px_24px] dark:bg-[linear-gradient(45deg,#0f172a_25%,#1e293b_25%,#1e293b_50%,#0f172a_50%,#0f172a_75%,#1e293b_75%,#1e293b_100%)]"
                :class="hasImage ? 'cursor-grab active:cursor-grabbing' : 'cursor-not-allowed'"
                @wheel="handleWheel"
                @pointerdown="handlePointerDown"
                @pointermove="handlePointerMove"
                @pointerup="handlePointerUp"
                @pointerleave="handlePointerUp"
              >
                <canvas ref="previewCanvasRef" class="block h-[320px] w-full max-w-[320px] mx-auto touch-none" />

                <div v-if="!hasImage" class="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  上传图片后，可直接在这里拖拽位置和缩放大小
                </div>
              </div>
            </div>

            <div>
              <div class="mb-2 flex items-center justify-between">
                <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200">输出预览</h3>
                <span class="text-xs text-slate-500 dark:text-slate-400">按当前参数实时生成</span>
              </div>

              <div v-if="outputPreviews.length" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div
                  v-for="item in outputPreviews"
                  :key="item.size"
                  class="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-3"
                >
                  <div class="mb-3 flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                    <span>{{ item.size }} x {{ item.size }}</span>
                    <span class="text-xs text-slate-400 dark:text-slate-500">{{ getExportLabel(item.size) }}</span>
                  </div>
                  <div class="flex min-h-[128px] items-center justify-center rounded-xl bg-white dark:bg-slate-800">
                    <img :src="item.url" :alt="`${item.size} 图标预览`" class="max-h-24 max-w-24 object-contain" />
                  </div>
                </div>
              </div>

              <el-empty v-else :image-size="160" description="暂无输出预览" />
            </div>
          </div>
        </section>
      </div>
    </div>

    <ToolDetail title="使用说明">
      <el-text>
        上传图片后，可在预览区直接用鼠标拖动图像位置，滚轮或缩放滑杆调整大小；选择需要的尺寸与格式后，一键打包导出。<br>
        支持添加任意自定义尺寸；普通模式下 PNG 和 ICO 会按尺寸分别生成文件，适合桌面快捷方式和应用图标场景。<br>
        点击“一键套用 favicon 套件”后，会自动补齐常见尺寸，并按 favicon.ico、apple-touch-icon.png、android-chrome-192x192.png 等常见命名规则导出。<br>
        当圆角拉到最大时会使用真正的圆形裁切；为兼容常见 ICO 规范，超过 256 的尺寸默认仅导出 PNG。
      </el-text>
    </ToolDetail>
  </div>
</template>