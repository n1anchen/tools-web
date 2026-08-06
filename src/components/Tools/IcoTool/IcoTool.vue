<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { BlobReader, BlobWriter, ZipWriter } from '@zip.js/zip.js'
import { ElMessage, genFileId } from 'element-plus'
import type { UploadInstance, UploadProps, UploadRawFile } from 'element-plus'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import { autoDown, getFileExtension } from '@/utils/file'
import { copy } from '@/utils/string'
import {
  ICON_PRESETS,
  buildIcoBytes,
  getIcoCompatibleSizes,
  getSourceQuality,
  sanitizeIconName,
  type IconPresetKey,
} from '@/utils/icoEngine'

const title = 'ICO图标工具'
const defaultSizeOptions = [16, 32, 48, 64, 128, 256, 512]
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
const customBackground = ref('#3478f6')
const activePreset = ref<IconPresetKey>('custom')

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
  backgroundColor: 'transparent',
})

const hasImage = computed(() => !!imageElement.value)
const allSizeOptions = computed(() => {
  return Array.from(new Set([...defaultSizeOptions, ...state.customSizes])).sort((a, b) => a - b)
})
const sortedSelectedSizes = computed(() => [...state.selectedSizes].sort((a, b) => a - b))
const icoCompatibleSizes = computed(() => getIcoCompatibleSizes(state.selectedSizes))
const activeIcoSizes = computed(() => state.useFaviconNaming
  ? faviconIcoSizes.filter(size => state.selectedSizes.includes(size))
  : icoCompatibleSizes.value)
const icoOversizedSizes = computed(() => sortedSelectedSizes.value.filter(size => size > 256))
const sourceQuality = computed(() => getSourceQuality(state.naturalWidth, state.naturalHeight, state.selectedSizes))
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
  const icoCount = state.selectedFormats.includes('ico') && activeIcoSizes.value.length ? 1 : 0

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
const webManifestSnippet = computed(() => {
  if (!state.useFaviconNaming || !state.selectedFormats.includes('png')) return ''
  const icons = getFaviconPngEntries()
    .filter(entry => entry.name.startsWith('android-chrome-'))
    .map(entry => ({ src: `/${entry.name}`, sizes: `${entry.size}x${entry.size}`, type: 'image/png' }))
  if (!icons.length) return ''
  return JSON.stringify({
    name: state.imageName || 'App',
    short_name: state.imageName || 'App',
    icons,
  }, null, 2)
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
  if (state.backgroundColor !== 'transparent') {
    ctx.fillStyle = state.backgroundColor
    ctx.fillRect(0, 0, size, size)
  }
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
  applyPreset('favicon')
}

function applyPreset(key: Exclude<IconPresetKey, 'custom'>) {
  const preset = ICON_PRESETS.find(item => item.key === key)
  if (!preset) return
  ensureSizes(preset.sizes)
  state.selectedSizes = [...preset.sizes]
  state.selectedFormats = [...preset.formats]
  state.useFaviconNaming = preset.faviconNaming
  activePreset.value = key
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
    labels.push(size <= 256 ? 'ICO 图层' : 'ICO 不支持')
  }

  return labels.join(' / ')
}

function copyFaviconHtmlSnippet() {
  copy(faviconHtmlSnippet.value)
  ElMessage.success('HTML 引用代码已复制')
}

function copyWebManifestSnippet() {
  copy(webManifestSnippet.value)
  ElMessage.success('Web Manifest 已复制')
}

function loadImage(file: File) {
  revokeImageUrl()
  imageUrl.value = URL.createObjectURL(file)
  const image = new Image()

  image.onload = () => {
    imageElement.value = image
    state.naturalWidth = image.naturalWidth
    state.naturalHeight = image.naturalHeight
    state.imageName = sanitizeIconName(file.name.replace(new RegExp(`\\.${getFileExtension(file.name)}$`, 'i'), ''))
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

  return new Blob([buildIcoBytes(pngEntries)], { type: 'image/x-icon' })
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  autoDown(url, filename)
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

async function downloadPng(size: number) {
  if (!hasImage.value) return
  downloadBlob(await createPngBlob(size), `${sanitizeIconName(state.imageName)}-${size}x${size}.png`)
  ElMessage.success(`${size}px PNG 已开始下载`)
}

async function downloadIco() {
  if (!hasImage.value || !activeIcoSizes.value.length) return
  downloadBlob(await createIcoBlob(activeIcoSizes.value), `${sanitizeIconName(state.imageName)}.ico`)
  ElMessage.success(`多尺寸 ICO 已生成，共 ${activeIcoSizes.value.length} 层`)
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
            `${sanitizeIconName(state.imageName)}-${size}x${size}.png`,
            new BlobReader(pngBlob),
          )
        }
      }

      if (state.selectedFormats.includes('ico') && icoCompatibleSizes.value.length) {
        const icoBlob = await createIcoBlob(icoCompatibleSizes.value)
        await zipWriter.add(`${sanitizeIconName(state.imageName)}.ico`, new BlobReader(icoBlob))
        skippedIcoSizes.push(...icoOversizedSizes.value)
      }
    }

    await zipWriter.close()
    const zipBlob = await blobWriter.getData()
    const url = URL.createObjectURL(zipBlob)
    autoDown(url, `${sanitizeIconName(state.imageName)}-icons.zip`)
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
    () => state.backgroundColor,
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
  <div class="ico-tool flex flex-col mt-3 flex-1">
    <ToolHero
      :title="title"
      eyebrow="ICON EXPORT STUDIO"
      summary="一次裁切，交付整套图标"
      description="面向网站、Windows 与应用场景生成多尺寸 PNG，并把兼容图层合并进一个标准 ICO 文件。"
    >
      <template #metrics>
        <div class="hero-metrics">
          <div><span>源图</span><strong>{{ hasImage ? `${state.naturalWidth} × ${state.naturalHeight}` : '等待导入' }}</strong></div>
          <div><span>已选尺寸</span><strong>{{ state.selectedSizes.length }} 种</strong></div>
          <div><span>预计文件</span><strong>{{ exportCount }} 个</strong></div>
          <div><span>清晰度</span><strong :class="`quality-${sourceQuality.level}`">{{ sourceQuality.label }}</strong></div>
        </div>
      </template>
    </ToolHero>

    <div class="ico-workbench p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm transition-shadow duration-300">
      <div class="workflow-strip">
        <span class="active"><b>01</b> 选择用途</span>
        <span :class="{active:hasImage}"><b>02</b> 裁切调校</span>
        <span :class="{active:hasImage && hasExportableSelection}"><b>03</b> 检查导出</span>
      </div>

      <div class="preset-grid">
        <button
          v-for="preset in ICON_PRESETS"
          :key="preset.key"
          :class="{active:activePreset === preset.key}"
          @click="applyPreset(preset.key)"
        >
          <span>{{ preset.key === 'favicon' ? 'WEB' : preset.key === 'windows' ? 'WIN' : 'APP' }}</span>
          <div><strong>{{ preset.label }}</strong><small>{{ preset.description }}</small></div>
          <em>{{ preset.sizes.length }} 种尺寸</em>
        </button>
      </div>

      <div class="studio-layout grid gap-4 xl:grid-cols-[minmax(0,430px),minmax(0,1fr)]">
        <section class="space-y-4">
          <div class="control-panel rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/40 p-4">
            <div class="panel-heading">
              <div><span>输入与输出</span><h3>图标生成设置</h3></div>
              <button v-if="hasImage" @click="resetTransform">恢复裁切</button>
            </div>
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
              <span class="text-sm text-slate-500 dark:text-slate-400">
                支持拖拽移动、滚轮缩放，也可用滑杆精调
              </span>
            </div>

            <div class="source-summary" :class="{ready:hasImage}">
              <span>{{ hasImage ? 'READY' : 'SOURCE' }}</span>
              <div>
                <strong>{{ hasImage ? state.imageName : '请选择清晰的正方形或近似正方形图片' }}</strong>
                <small>{{ hasImage ? `${state.naturalWidth} × ${state.naturalHeight} · ${sourceQuality.label}` : '支持 PNG、JPG、WebP、SVG 等浏览器可读取格式' }}</small>
              </div>
            </div>

            <label v-if="hasImage" class="field-label">
              <span>导出文件名</span>
              <el-input v-model="state.imageName" maxlength="48" />
            </label>

            <div class="settings-grid mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <div class="setting-title">
                  <span>导出尺寸</span>
                  <button @click="state.selectedSizes = []; activePreset = 'custom'">清空</button>
                </div>
                <el-checkbox-group v-model="state.selectedSizes" class="size-options flex flex-wrap gap-2" @change="activePreset = 'custom'">
                  <el-checkbox v-for="size in allSizeOptions" :key="size" :value="size">
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
                <div class="setting-title"><span>导出格式</span><em>ICO 自动合并多层</em></div>
                <el-checkbox-group v-model="state.selectedFormats" class="format-options flex flex-wrap gap-2" @change="activePreset = 'custom'">
                  <el-checkbox v-for="format in formatOptions" :key="format.value" :value="format.value">
                    {{ format.label }}
                  </el-checkbox>
                </el-checkbox-group>
                <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  ICO 会把 16–256px 兼容尺寸合并为一个多图层文件
                </p>
                <p v-if="icoOversizedSizes.length" class="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  512 等大于 256 的尺寸会仅导出 PNG，ICO 标准通常支持到 256
                </p>
                <div class="mt-3 flex flex-wrap items-center gap-2">
                  <el-button type="primary" plain @click="applyFaviconPreset">套用 favicon 套件</el-button>
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

              <div>
                <div class="mb-2 flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-200">
                  <span>图标底色</span>
                  <span class="text-slate-500 dark:text-slate-400">透明区域可按场景补色</span>
                </div>
                <div class="background-options">
                  <button :class="{active:state.backgroundColor === 'transparent'}" @click="state.backgroundColor = 'transparent'"><i class="checker" />透明</button>
                  <button :class="{active:state.backgroundColor === '#ffffff'}" @click="state.backgroundColor = '#ffffff'"><i style="background:#fff" />白色</button>
                  <button :class="{active:state.backgroundColor === '#0f172a'}" @click="state.backgroundColor = '#0f172a'"><i style="background:#0f172a" />深色</button>
                  <label class="color-option"><input v-model="customBackground" type="color" @input="state.backgroundColor = customBackground"><span>自选</span></label>
                </div>
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

            <div v-if="webManifestSnippet" class="snippet-card mt-3">
              <div><strong>Web Manifest</strong><small>可直接合并进 manifest.webmanifest</small></div>
              <el-button size="small" @click="copyWebManifestSnippet">复制 JSON</el-button>
            </div>

            <div class="export-actions mt-4">
              <el-button
                type="primary"
                :loading="state.loading"
                :disabled="!hasImage || !state.selectedSizes.length || !state.selectedFormats.length || !hasExportableSelection"
                @click="exportZip"
              >
                下载完整 ZIP（{{ exportCount }} 个文件）
              </el-button>
              <el-button :disabled="!hasImage || !activeIcoSizes.length" @click="downloadIco">
                单独下载 ICO
              </el-button>
            </div>
          </div>
        </section>

        <section class="preview-section space-y-4">
          <div class="quality-strip" :class="`quality-${sourceQuality.level}`">
            <span>QUALITY</span>
            <div><strong>{{ sourceQuality.label }}</strong><small v-if="hasImage">源图短边 {{ Math.min(state.naturalWidth, state.naturalHeight) }}px，目标最大 {{ sourceQuality.maxSize }}px</small><small v-else>导入图片后自动评估放大风险</small></div>
            <em>{{ activeIcoSizes.length }} 个 ICO 图层</em>
          </div>
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

              <div v-if="outputPreviews.length" class="output-grid grid gap-3 sm:grid-cols-2">
                <div
                  v-for="item in outputPreviews"
                  :key="item.size"
                  class="output-card rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-3"
                >
                  <div class="mb-3 flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                    <span>{{ item.size }} x {{ item.size }}</span>
                    <span class="text-xs text-slate-400 dark:text-slate-500">{{ getExportLabel(item.size) }}</span>
                  </div>
                  <div class="flex min-h-[128px] items-center justify-center rounded-xl bg-white dark:bg-slate-800">
                    <img :src="item.url" :alt="`${item.size} 图标预览`" class="max-h-24 max-w-24 object-contain" />
                  </div>
                  <button class="preview-download" @click="downloadPng(item.size)">下载此 PNG</button>
                </div>
              </div>

              <el-empty v-else :image-size="160" description="暂无输出预览" />
            </div>
          </div>
        </section>
      </div>
    </div>

    <ToolGuide
      title="从源图到交付包"
      description="按三个步骤完成图标生成；所有图片都在当前浏览器中处理，不会上传到服务器。"
    >
      <div class="ico-guide-grid">
        <article><span>01</span><div><h4>选择使用场景</h4><p>先套用网站、Windows 或应用预设，再按项目需要增删尺寸。</p></div></article>
        <article><span>02</span><div><h4>检查裁切与清晰度</h4><p>拖拽定位主体，用缩放、圆角和底色控制最终图标的识别度。</p></div></article>
        <article><span>03</span><div><h4>选择交付方式</h4><p>可下载单张 PNG、多图层 ICO，或一次导出包含全部文件的 ZIP。</p></div></article>
      </div>
      <div class="guide-rules">
        <div><span>ICO 图层</span><strong>8–256px</strong><p>普通模式会把所有兼容尺寸合并到一个 ICO 文件。</p></div>
        <div><span>Favicon</span><strong>16 / 32 / 48</strong><p>网站套件同时提供 Apple Touch 与 Android Chrome 图标。</p></div>
        <div><span>清晰度建议</span><strong>源图 ≥ 最大目标</strong><p>源图短边低于目标尺寸时会提示可能出现放大模糊。</p></div>
      </div>
    </ToolGuide>
  </div>
</template>

<style scoped>
.ico-tool{--ink:#263247;--muted:#64748b;--blue:#3978f6;--line:#dce6f1}
.ico-hero{display:flex;align-items:stretch;justify-content:space-between;gap:28px;margin-bottom:14px;padding:26px 28px;border:1px solid #dbe5f1;border-radius:24px;background:linear-gradient(135deg,#eef7ff 0%,#f6f2ff 58%,#fff8ee 100%);box-shadow:0 12px 32px rgba(51,65,85,.06)}
.eyebrow,.panel-heading span{font-size:12px;font-weight:800;letter-spacing:.14em;color:#5076a7}
.ico-hero h2{margin:6px 0 8px;font-size:24px;font-weight:800;color:var(--ink)}
.ico-hero p{max-width:660px;margin:0;font-size:14px;line-height:1.75;color:var(--muted)}
.hero-metrics{display:grid;grid-template-columns:repeat(2,minmax(130px,1fr));min-width:410px;overflow:hidden;border:1px solid #d7e2ee;border-radius:18px;background:rgba(255,255,255,.75)}
.hero-metrics div{padding:14px 16px;border-right:1px solid #dde6ef;border-bottom:1px solid #dde6ef}
.hero-metrics div:nth-child(2n){border-right:0}.hero-metrics div:nth-last-child(-n+2){border-bottom:0}
.hero-metrics span{font-size:12px;color:#7a899c}.hero-metrics strong{margin-top:5px;font-size:14px;color:var(--ink)}
.hero-metrics .quality-warning{color:#b66a14}.hero-metrics .quality-excellent,.hero-metrics .quality-good{color:#17815b}
.ico-workbench{border-radius:24px!important;box-shadow:0 12px 32px rgba(51,65,85,.06)!important}
.workflow-strip{display:grid;grid-template-columns:repeat(3,1fr);overflow:hidden;margin-bottom:14px;border:1px solid var(--line);border-radius:15px;background:#f8fafc}
.workflow-strip span{position:relative;padding:12px 16px;border-right:1px solid var(--line);font-size:13px;font-weight:700;color:#8794a6;text-align:center}
.workflow-strip span:last-child{border-right:0}.workflow-strip span.active{background:#f0f7ff;color:#356eae}.workflow-strip b{margin-right:7px;font-size:12px;color:#9badc2}.workflow-strip .active b{color:#3478f6}
.preset-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px}
.preset-grid button{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;padding:13px 14px;border:1px solid #dce5ef;border-radius:16px;background:#fff;text-align:left;transition:.2s}
.preset-grid button:hover{border-color:#9bbcf0;transform:translateY(-1px)}.preset-grid button.active{border-color:#79a8f2;background:#f3f8ff;box-shadow:0 0 0 3px rgba(57,120,246,.07)}
.preset-grid button>span{display:grid;place-items:center;width:40px;height:40px;border-radius:12px;background:#edf3fa;font-size:12px;font-weight:900;color:#4d6f96}
.preset-grid strong,.preset-grid small{display:block}.preset-grid strong{font-size:14px;color:var(--ink)}.preset-grid small{overflow:hidden;margin-top:3px;font-size:12px;color:#79889c;text-overflow:ellipsis;white-space:nowrap}
.preset-grid em{font-size:12px;font-style:normal;color:#6f8197;white-space:nowrap}
.studio-layout{align-items:start}.control-panel{border-style:solid!important;border-radius:20px!important;background:#fbfdff!important}
.panel-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:14px}.panel-heading h3{margin:3px 0 0;font-size:19px;color:var(--ink)}.panel-heading button,.setting-title button{border:0;background:transparent;font-size:12px;color:#3972b7}
.source-summary{display:flex;align-items:center;gap:11px;margin-top:14px;padding:12px 13px;border:1px dashed #cbd8e7;border-radius:14px;background:#f5f8fc}.source-summary.ready{border-style:solid;border-color:#bfe1d5;background:#f1fbf7}
.source-summary>span{display:grid;place-items:center;flex:0 0 48px;height:32px;border-radius:9px;background:#e7eef7;font-size:11px;font-weight:900;color:#5e7694}.source-summary.ready>span{background:#d9f4e9;color:#217b5d}
.source-summary strong,.source-summary small{display:block}.source-summary strong{overflow:hidden;max-width:300px;font-size:13px;color:var(--ink);text-overflow:ellipsis;white-space:nowrap}.source-summary small{margin-top:3px;font-size:12px;color:#748398}
.field-label{display:block;margin-top:13px}.field-label>span{display:block;margin-bottom:6px;font-size:12px;font-weight:700;color:#6c7c91}
.settings-grid>div{min-width:0;padding:13px;border:1px solid #e1e8f0;border-radius:15px;background:#fff}.setting-title{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:9px;font-size:13px;font-weight:700;color:var(--ink)}.setting-title em{font-size:12px;font-weight:500;font-style:normal;color:#7b8a9d}
.size-options{gap:2px 10px!important}.format-options{gap:6px 14px!important}
.background-options{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.background-options button,.color-option{display:flex;align-items:center;justify-content:center;gap:6px;min-height:38px;border:1px solid #d9e3ee;border-radius:10px;background:#fff;font-size:12px;color:#56657a}.background-options button.active{border-color:#76a7f3;background:#eff6ff;color:#326dac}.background-options i,.color-option input{width:16px;height:16px;border:1px solid #cbd5e1;border-radius:5px}.background-options .checker{background:linear-gradient(45deg,#d6deea 25%,transparent 25%,transparent 75%,#d6deea 75%),linear-gradient(45deg,#d6deea 25%,#fff 25%,#fff 75%,#d6deea 75%);background-position:0 0,4px 4px;background-size:8px 8px}.color-option input{padding:0;border:0;background:transparent}.color-option span{font-size:12px}
.snippet-card{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 12px;border:1px solid #dbe7f4;border-radius:12px;background:#f4f8fd}.snippet-card strong,.snippet-card small{display:block}.snippet-card strong{font-size:13px;color:var(--ink)}.snippet-card small{margin-top:2px;font-size:12px;color:#75859a}
.export-actions{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(130px,.7fr);gap:8px}.export-actions :deep(.el-button){width:100%;height:42px;margin:0;border-radius:11px;font-size:13px}
.preview-section{min-width:0;padding:16px;border:1px solid #e0e8f1;border-radius:20px;background:#fbfdff}
.quality-strip{display:flex;align-items:center;gap:11px;margin-bottom:14px;padding:11px 13px;border:1px solid #dce6f0;border-radius:14px;background:#f5f8fb}.quality-strip>span{padding:6px 8px;border-radius:8px;background:#e8eef6;font-size:11px;font-weight:900;color:#617994}.quality-strip div{min-width:0;flex:1}.quality-strip strong,.quality-strip small{display:block}.quality-strip strong{font-size:13px;color:var(--ink)}.quality-strip small{margin-top:2px;font-size:12px;color:#738297}.quality-strip em{font-size:12px;font-style:normal;color:#60738a;white-space:nowrap}.quality-strip.quality-warning{border-color:#f1d7b3;background:#fff9f0}.quality-strip.quality-excellent,.quality-strip.quality-good{border-color:#c4e4d8;background:#f3fbf8}
.preview-download{width:100%;margin-top:9px;padding:7px;border:1px solid #d7e2ee;border-radius:9px;background:#fff;font-size:12px;color:#4a6d96}.preview-download:hover{border-color:#82acf0;color:#306fb9}
.output-card>div:first-child{align-items:flex-start;flex-direction:column;gap:2px}.output-card>div:first-child span{white-space:nowrap}.output-card>div:nth-child(2){min-height:104px}
.ico-workbench :deep(.el-checkbox__label),.ico-workbench :deep(.el-button),.ico-workbench :deep(.el-input__inner),.ico-workbench .text-xs{font-size:12px}
.dark .ico-hero{border-color:#334155;background:linear-gradient(135deg,#172c40,#241d3b 60%,#302619)}.dark .ico-hero h2,.dark .hero-metrics strong,.dark .preset-grid strong,.dark .panel-heading h3,.dark .source-summary strong,.dark .setting-title,.dark .snippet-card strong,.dark .quality-strip strong{color:#e7edf6}.dark .ico-hero p{color:#a8b4c5}.dark .hero-metrics{border-color:#40506a;background:rgba(15,23,42,.55)}.dark .hero-metrics div{border-color:#40506a}.dark .workflow-strip{border-color:#334155;background:#111b2b}.dark .workflow-strip span{border-color:#334155}.dark .workflow-strip span.active{background:#172b43}.dark .preset-grid button{border-color:#36465a;background:#172033}.dark .preset-grid button.active{border-color:#477fc7;background:#172b43}.dark .preset-grid button>span{background:#26364b}.dark .control-panel,.dark .preview-section{border-color:#334155!important;background:#111b2b!important}.dark .source-summary,.dark .quality-strip{border-color:#37465a;background:#172033}.dark .source-summary.ready,.dark .quality-strip.quality-excellent,.dark .quality-strip.quality-good{border-color:#285d4c;background:#142d28}.dark .settings-grid>div,.dark .background-options button,.dark .color-option{border-color:#37465a;background:#172033;color:#c4cfdd}.dark .background-options button.active{border-color:#477fc7;background:#172b43}.dark .snippet-card{border-color:#374b62;background:#172b3e}.dark .preview-download{border-color:#3a4b61;background:#172033;color:#a9c9ef}
@media(max-width:1100px){.ico-hero{flex-direction:column}.hero-metrics{min-width:0}.preset-grid{grid-template-columns:1fr}.studio-layout{grid-template-columns:1fr!important}}
@media(max-width:640px){.ico-hero{padding:20px 16px}.ico-hero h2{font-size:21px}.hero-metrics{grid-template-columns:1fr}.hero-metrics div{border-right:0;border-bottom:1px solid #dde6ef}.hero-metrics div:nth-last-child(2){border-bottom:1px solid #dde6ef}.workflow-strip span{padding:10px 5px;font-size:12px}.workflow-strip b{display:block;margin:0 0 3px}.preset-grid button{grid-template-columns:auto 1fr}.preset-grid em{display:none}.ico-workbench{padding:12px!important}.settings-grid{grid-template-columns:1fr!important}.background-options{grid-template-columns:repeat(2,1fr)}.export-actions{grid-template-columns:1fr}.quality-strip{align-items:flex-start;flex-wrap:wrap}.quality-strip em{width:100%;padding-left:0}.preview-section{padding:12px}.source-summary strong{max-width:220px}}
.ico-guide-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.ico-guide-grid article{display:flex;align-items:flex-start;gap:12px;padding:15px;border:1px solid #dfe7f0;border-radius:15px;background:#fbfdff}.ico-guide-grid article>span{display:grid;place-items:center;flex:0 0 36px;height:36px;border-radius:10px;background:#eaf3ff;font-size:12px;font-weight:900;color:#3474bd}.ico-guide-grid h4{margin:0;font-size:14px;color:var(--ink)}.ico-guide-grid p,.guide-rules p{margin:5px 0 0;font-size:12px;line-height:1.65;color:#6f8095}
.guide-rules{display:grid;grid-template-columns:repeat(3,1fr);overflow:hidden;margin-top:10px;border:1px solid #e1e8f0;border-radius:15px;background:#f6f9fc}.guide-rules>div{padding:14px 15px;border-right:1px solid #e1e8f0}.guide-rules>div:last-child{border-right:0}.guide-rules span,.guide-rules strong{display:block}.guide-rules span{font-size:12px;font-weight:700;color:#7890aa}.guide-rules strong{margin-top:4px;font-size:14px;color:#334d6c}
.source-summary>span,.quality-strip>span{font-size:12px}
.dark .ico-guide-grid article{border-color:#334155;background:#172033}.dark .ico-guide-grid h4,.dark .guide-rules strong{color:#dce6f2}.dark .guide-rules{border-color:#334155;background:#172033}.dark .guide-rules>div{border-color:#334155}
@media(max-width:640px){.hero-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.hero-metrics div{border-right:1px solid #dde6ef}.hero-metrics div:nth-child(2n){border-right:0}.hero-metrics div:nth-last-child(-n+2){border-bottom:0}.ico-guide-grid,.guide-rules{grid-template-columns:1fr}.guide-rules>div{border-right:0;border-bottom:1px solid #e1e8f0}.guide-rules>div:last-child{border-bottom:0}.dark .hero-metrics div,.dark .guide-rules>div{border-color:#334155}}
</style>
