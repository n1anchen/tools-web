<script setup lang="ts">
import { ref, computed } from 'vue'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { ElMessage, ElSlider, ElButton, ElUpload, ElInputNumber, ElIcon } from 'element-plus'
import type { UploadFile } from 'element-plus'
import { Picture, VideoPlay, Download, RefreshRight, Refresh } from '@element-plus/icons-vue'

const title = '电子包浆模拟'

const compressionCount = ref(12)
const quality = ref(60)
const processing = ref(false)
const originalImage = ref<string | null>(null)
const resultImage = ref<string | null>(null)
const originalFile = ref<File | null>(null)

// 每帧让浏览器有机会渲染（用 requestAnimationFrame 代替 setTimeout(0)）
function nextFrame(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
}

function loadDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

async function handleFileChange(uploadFile: UploadFile) {
  const file = uploadFile.raw
  if (!file) return
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请上传图片文件')
    return
  }
  originalFile.value = file
  originalImage.value = await loadDataUrl(file)
  resultImage.value = null
}

/**
 * 完整移植自 patina.js（@itorr）的 green() 函数。
 * 原理：用整数位运算模拟旧版 libjpeg 的 RGB→YCbCr→RGB 有损往返，
 * UV 分量各偏移 -1，精确复现旧版色度舍入 bug 导致的偏绿效果。
 * 每调用一次相当于一次旧版 libjpeg 压缩产生的色偏，重复叠加后绿色明显。
 */
function applyPatinGreen(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const clamp    = (x: number) => x >= 0 ? (x <= 255 ? x : 255) : 0
  const clampuv  = (x: number) => x >= -128 ? (x <= 127 ? x : 127) : -128

  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data

  for (let p = 0; p < data.length / 4; ++p) {
    const r = data[p * 4]
    const g = data[p * 4 + 1]
    const b = data[p * 4 + 2]

    // RGB → YUV（整数位运算，与旧版 libjpeg 一致）
    const y =  clamp  ((  77 * r + 150 * g +  29 * b) >> 8)
    const u =  clampuv(((-43 * r -  85 * g + 128 * b) >> 8) - 1)  // -1：旧版 bug
    const v =  clampuv(((128 * r - 107 * g -  21 * b) >> 8) - 1)  // -1：旧版 bug

    // YUV → RGB（旧版 libjpeg 系数）
    data[p * 4]     = clamp((65536 * y              + 91881 * v) >> 16)
    data[p * 4 + 1] = clamp((65536 * y - 22553 * u  - 46802 * v) >> 16)
    data[p * 4 + 2] = clamp((65536 * y + 116130 * u            ) >> 16)
  }

  ctx.putImageData(imageData, 0, 0)
}

async function simulate() {
  if (!originalImage.value) {
    ElMessage.warning('请先上传一张图片')
    return
  }
  processing.value = true
  resultImage.value = null

  // 先让 Vue 渲染 loading 状态，再开始耗时操作
  await nextFrame()

  try {
    const img = await loadImage(originalImage.value)

    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)

    const q = quality.value / 100

    // 每隔若干次让出主线程，保证 loading 动画持续运转
    const YIELD_EVERY = 5
    for (let i = 0; i < compressionCount.value; i++) {
      if (i % YIELD_EVERY === 0) {
        await nextFrame()
      }

      // 1. 先做一次色偏（patina.js 中 green() 在 toDataURL 之前调用）
      applyPatinGreen(ctx, canvas.width, canvas.height)

      // 2. JPEG 压缩（含随机质量抖动，与 patina.js 一致）
      const dataUrl = canvas.toDataURL('image/jpeg', q + Math.random() * 0.1)

      // 3. 重新绘制（像素偏移抖动，与 patina.js 的 randPix/randPiy 一致）
      const tempImg = await loadImage(dataUrl)
      const randi = 2
      const dx = (Math.random() * randi * 2 - randi) / 2
      const dy = (Math.random() * randi * 2 - randi) / 2
      ctx.fillStyle = '#FFF'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(tempImg, -dx, -dy, canvas.width + dx, canvas.height + dy)
    }

    resultImage.value = canvas.toDataURL('image/jpeg', q + Math.random() * 0.05)
    ElMessage.success('包浆完成！')
  } catch (e) {
    ElMessage.error('处理图片时出错')
  } finally {
    processing.value = false
  }
}

function downloadResult() {
  if (!resultImage.value) return
  const a = document.createElement('a')
  a.href = resultImage.value
  a.download = 'patina-result.jpg'
  a.click()
}

function reset() {
  originalImage.value = null
  resultImage.value = null
  originalFile.value = null
  compressionCount.value = 12
  quality.value = 60
}

const compressionMarks = computed(() => ({
  1: '1',
  25: '25',
  50: '50',
  75: '75',
  100: '100',
}))
</script>

<template>
  <div class="flex flex-col mt-3 flex-1">
  <DetailHeader :title="title" />

  <div
    class="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-300 space-y-6"
  >
    <!-- 上传 + 结果预览区域 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- 上传组件（含原图预览） -->
      <div class="space-y-2">
        <p class="text-sm font-medium text-slate-600 dark:text-slate-300 text-center">原图</p>
        <el-upload
          :show-file-list="false"
          accept="image/*"
          :on-change="handleFileChange"
          :auto-upload="false"
          drag
          class="upload-area"
        >
          <template #default>
            <img
              v-if="originalImage"
              :src="originalImage"
              alt="原图"
              class="block max-w-full mx-auto rounded"
              style="max-height: 360px; object-fit: contain;"
            />
            <div v-else class="flex flex-col items-center justify-center py-10 gap-3">
              <el-icon class="text-5xl text-slate-400 dark:text-slate-500"><Picture /></el-icon>
              <div class="text-slate-500 dark:text-slate-400 text-sm text-center px-4">
                <span class="font-medium text-blue-500 dark:text-blue-400">点击上传</span>
                或将图片拖拽到此处
              </div>
              <div class="text-xs text-slate-400 dark:text-slate-500">支持 JPG、PNG、GIF、WebP 等常见格式</div>
            </div>
          </template>
        </el-upload>
      </div>

      <!-- 结果预览 -->
      <div class="space-y-2">
        <p class="text-sm font-medium text-slate-600 dark:text-slate-300 text-center">包浆结果</p>
        <div
          class="result-area rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/40 flex items-center justify-center relative"
          style="min-height: 260px;"
        >
          <!-- 加载遮罩 -->
          <div v-if="processing" class="absolute inset-0 flex flex-col items-center justify-center bg-white/70 dark:bg-slate-800/70 z-10 gap-3 rounded-xl">
            <div class="spinner"></div>
            <span class="text-sm text-slate-500 dark:text-slate-400">正在包浆，请稍候…</span>
          </div>
          <img
            v-if="resultImage"
            :src="resultImage"
            alt="包浆结果"
            class="block max-w-full mx-auto rounded"
            style="max-height: 360px; object-fit: contain;"
          />
          <div v-else-if="!processing" class="text-slate-400 dark:text-slate-500 text-sm flex flex-col items-center gap-2 p-8">
            <el-icon class="text-4xl"><Picture /></el-icon>
            <span>点击「开始包浆」查看效果</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 参数设置 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1">
            <el-icon><Refresh /></el-icon> 压缩次数
          </label>
          <el-input-number
            v-model="compressionCount"
            :min="1"
            :max="100"
            :step="1"
            size="small"
            class="w-24"
          />
        </div>
        <el-slider
          v-model="compressionCount"
          :min="1"
          :max="100"
          :marks="compressionMarks"
          :format-tooltip="(val: number) => `${val} 次`"
          class="px-1"
        />
        <p class="text-xs text-slate-400 dark:text-slate-500">压缩次数越多，绿色失真越严重</p>
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1">
            <el-icon><Download /></el-icon> 压缩质量
          </label>
          <el-input-number
            v-model="quality"
            :min="1"
            :max="99"
            :step="1"
            size="small"
            class="w-24"
          />
        </div>
        <el-slider
          v-model="quality"
          :min="1"
          :max="99"
          :format-tooltip="(val: number) => `${val}%`"
          class="px-1"
        />
        <p class="text-xs text-slate-400 dark:text-slate-500">质量越低，每次压缩造成的损伤越大</p>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="flex flex-wrap gap-3">
      <el-button
        type="primary"
        :loading="processing"
        :disabled="!originalImage"
        size="large"
        @click="simulate"
      >
        <template v-if="!processing"><el-icon class="mr-1"><VideoPlay /></el-icon>开始包浆</template>
        <template v-else>包浆中… ({{ compressionCount }} 次)</template>
      </el-button>
      <el-button
        v-if="resultImage"
        type="success"
        size="large"
        @click="downloadResult"
      >
        <el-icon class="mr-1"><Download /></el-icon>下载结果
      </el-button>
      <el-button
        size="large"
        @click="reset"
      >
        <el-icon class="mr-1"><RefreshRight /></el-icon>重置
      </el-button>
    </div>
  </div>

  <ToolDetail title="关于电子包浆模拟">
      <p>
        <strong>电子包浆</strong>是网络流行的一种图片失真现象。
        由于 JPEG 图像压缩算法（libjpeg）存在的代码缺陷，图片每被重新压缩保存一次，就会因为色度通道的处理偏差逐渐偏绿，
        就像老旧物件表面会形成"包浆"一样，故而得名。
      </p>
      <p class="mt-2">
        本工具在浏览器端模拟了这一过程：将同一张图片反复以指定质量进行 JPEG 压缩，使其产生绿色失真效果。
      </p>
      <ul class="list-disc list-inside mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-400">
        <li><strong>压缩次数</strong>：控制重复压缩的次数，次数越多绿色越明显，建议从 20～50 次开始体验。</li>
        <li><strong>压缩质量</strong>：每次压缩时的 JPEG 质量参数（1%～99%），越低每次损耗越大，推荐 5～15。</li>
        <li>处理完成后可直接下载结果图片。</li>
      </ul>
  </ToolDetail>
  </div>
</template>

<style scoped>
:deep(.upload-area .el-upload) {
  width: 100%;
}
:deep(.upload-area .el-upload-dragger) {
  width: 100%;
  min-height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  padding: 0;
}
:deep(.el-slider__marks-text) {
  font-size: 11px;
}

/* CSS-only 旋转动画，不依赖 Tailwind animate-spin，避免主线程阻塞时失效 */
.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #3b82f6;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  will-change: transform;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
