<script setup lang="ts">
import { ref } from 'vue'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { ElMessage } from 'element-plus'
import { copy } from '@/utils/string'

const title = '传图取色'
const imageUrl = ref('')
const imgEl = ref<HTMLImageElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
const pickedColor = ref<{ hex: string; rgb: string; hsl: string } | null>(null)
const history = ref<string[]>([])

const handleFile = (file: any) => {
  const reader = new FileReader()
  reader.onload = e => { imageUrl.value = e.target?.result as string }
  reader.readAsDataURL(file.raw)
}

const drawToCanvas = () => {
  if (!imgEl.value || !canvasEl.value) return
  const ctx = canvasEl.value.getContext('2d')!
  canvasEl.value.width = imgEl.value.naturalWidth
  canvasEl.value.height = imgEl.value.naturalHeight
  ctx.drawImage(imgEl.value, 0, 0)
}

const toHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase()

const toHsl = (r: number, g: number, b: number) => {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255]
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0)
    else if (max === gn) h = (bn - rn) / d + 2
    else h = (rn - gn) / d + 4
    h /= 6
  }
  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`
}

const pick = (e: MouseEvent) => {
  if (!imgEl.value || !canvasEl.value) return
  const rect = imgEl.value.getBoundingClientRect()
  const scaleX = imgEl.value.naturalWidth / rect.width
  const scaleY = imgEl.value.naturalHeight / rect.height
  const x = Math.floor((e.clientX - rect.left) * scaleX)
  const y = Math.floor((e.clientY - rect.top) * scaleY)
  const ctx = canvasEl.value.getContext('2d')!
  const [r, g, b] = ctx.getImageData(x, y, 1, 1).data
  const hex = toHex(r, g, b)
  pickedColor.value = { hex, rgb: `rgb(${r}, ${g}, ${b})`, hsl: toHsl(r, g, b) }
  if (!history.value.includes(hex)) history.value.unshift(hex)
  if (history.value.length > 20) history.value.pop()
}
</script>

<template>
  <div class="flex flex-col mt-3 flex-1">
    <DetailHeader :title="title" />
    <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-300 space-y-4">
      <el-upload action="#" :auto-upload="false" :on-change="handleFile" :show-file-list="false" accept="image/*">
        <el-button type="primary">点击上传图片</el-button>
        <template #tip><div class="text-xs text-slate-400 mt-1">支持 JPG、PNG、GIF、WEBP 等格式</div></template>
      </el-upload>

      <div v-if="imageUrl" class="space-y-3">
        <p class="text-sm text-slate-500 dark:text-slate-400">点击图片任意位置取色 ↓</p>
        <div class="overflow-auto rounded-lg border border-slate-200 dark:border-slate-600" style="max-height:400px">
          <img
            ref="imgEl"
            :src="imageUrl"
            class="cursor-crosshair max-w-full"
            @load="drawToCanvas"
            @click="pick"
          />
        </div>
        <canvas ref="canvasEl" class="hidden" />

        <div v-if="pickedColor" class="flex flex-wrap gap-4 items-start p-3 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
          <div class="w-16 h-16 rounded-lg border border-slate-300 dark:border-slate-500 shadow" :style="{ background: pickedColor.hex }" />
          <div class="space-y-1 text-sm">
            <div v-for="(val, key) in pickedColor" :key="key" class="flex items-center gap-2">
              <span class="w-8 text-slate-500 dark:text-slate-400 uppercase font-mono text-xs">{{ key }}</span>
              <code class="text-slate-800 dark:text-slate-100">{{ val }}</code>
              <el-button size="small" text @click="copy(val)">复制</el-button>
            </div>
          </div>
        </div>

        <div v-if="history.length" class="space-y-1">
          <p class="text-xs text-slate-500 dark:text-slate-400">取色历史（最近 20 个）</p>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="hex in history" :key="hex"
              class="w-8 h-8 rounded cursor-pointer border-2 border-white dark:border-slate-600 shadow-sm hover:scale-110 transition-transform"
              :style="{ background: hex }"
              :title="hex"
              @click="copy(hex)"
            />
          </div>
        </div>
      </div>
      <div v-else class="text-center text-slate-400 dark:text-slate-500 py-12">请上传图片后点击取色</div>
    </div>
    <ToolDetail title="使用说明">
      <p>上传图片后，点击图片任意像素即可获取该处颜色值。</p>
      <ul class="list-disc list-inside mt-1 space-y-1">
        <li>同时显示 HEX、RGB、HSL 三种颜色格式</li>
        <li>保留最近 20 个取色历史，点击历史色块可复制颜色值</li>
      </ul>
    </ToolDetail>
  </div>
</template>
