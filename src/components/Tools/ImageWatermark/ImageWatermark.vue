<script setup lang="ts">
import { ref } from 'vue'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { ElMessage } from 'element-plus'

const title = '图片水印'
const imageUrl = ref('')
const resultUrl = ref('')
const imgEl = ref<HTMLImageElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)

const wm = ref({ text: '版权所有', fontSize: 32, color: '#ffffff', opacity: 0.5, position: 'bottomRight', rotate: -30 })
const positions = [
  { label: '左上角', value: 'topLeft' }, { label: '右上角', value: 'topRight' },
  { label: '居中', value: 'center' },
  { label: '左下角', value: 'bottomLeft' }, { label: '右下角', value: 'bottomRight' },
  { label: '平铺', value: 'tile' },
]

const handleFile = (file: any) => {
  const reader = new FileReader()
  reader.onload = e => { imageUrl.value = e.target?.result as string; resultUrl.value = '' }
  reader.readAsDataURL(file.raw)
}

const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

const applyWatermark = () => {
  if (!imgEl.value || !canvasEl.value) { ElMessage.warning('请先上传图片'); return }
  if (!wm.value.text.trim()) { ElMessage.warning('请输入水印文字'); return }
  const { width, height } = imgEl.value
  canvasEl.value.width = width; canvasEl.value.height = height
  const ctx = canvasEl.value.getContext('2d')!
  ctx.drawImage(imgEl.value, 0, 0)

  ctx.save()
  ctx.font = `${wm.value.fontSize}px sans-serif`
  ctx.fillStyle = hexToRgba(wm.value.color, wm.value.opacity)
  const tw = ctx.measureText(wm.value.text).width
  const th = wm.value.fontSize

  const drawAt = (x: number, y: number) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate((wm.value.rotate * Math.PI) / 180)
    ctx.fillText(wm.value.text, 0, 0); ctx.restore()
  }

  const p = wm.value.position
  const pad = 16
  if (p === 'topLeft') drawAt(pad, th + pad)
  else if (p === 'topRight') drawAt(width - tw - pad, th + pad)
  else if (p === 'center') drawAt((width - tw) / 2, (height + th) / 2)
  else if (p === 'bottomLeft') drawAt(pad, height - pad)
  else if (p === 'bottomRight') drawAt(width - tw - pad, height - pad)
  else if (p === 'tile') {
    const gapX = tw + 80; const gapY = th + 60
    for (let y = 0; y < height + gapY; y += gapY)
      for (let x = 0; x < width + gapX; x += gapX) drawAt(x, y)
  }
  ctx.restore()
  resultUrl.value = canvasEl.value.toDataURL('image/png')
  ElMessage.success('水印已添加')
}

const download = () => {
  if (!resultUrl.value) return
  const a = document.createElement('a'); a.href = resultUrl.value; a.download = 'watermarked.png'; a.click()
}
</script>

<template>
  <div class="flex flex-col mt-3 flex-1">
    <DetailHeader :title="title" />
    <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-300 space-y-4">
      <el-upload action="#" :auto-upload="false" :on-change="handleFile" :show-file-list="false" accept="image/*">
        <el-button type="primary">点击上传图片</el-button>
      </el-upload>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <el-input v-model="wm.text" placeholder="水印文字">
          <template #prepend>文字</template>
        </el-input>
        <div class="flex items-center gap-2">
          <span class="text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">字号</span>
          <el-input-number v-model="wm.fontSize" :min="12" :max="200" size="small" />
        </div>
        <div class="flex items-center gap-2">
          <span class="text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">透明度</span>
          <el-slider v-model="wm.opacity" :min="0" :max="1" :step="0.05" style="width:120px" />
          <span class="text-sm text-slate-500 w-8">{{ wm.opacity }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">颜色</span>
          <el-color-picker v-model="wm.color" />
          <span class="text-sm font-mono text-slate-500">{{ wm.color }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">旋转</span>
          <el-slider v-model="wm.rotate" :min="-180" :max="180" style="width:120px" />
          <span class="text-sm text-slate-500 w-8">{{ wm.rotate }}°</span>
        </div>
        <el-select v-model="wm.position">
          <el-option v-for="p in positions" :key="p.value" :label="p.label" :value="p.value" />
        </el-select>
      </div>

      <div class="flex gap-3">
        <el-button type="primary" :disabled="!imageUrl" @click="applyWatermark">添加水印</el-button>
        <el-button type="success" :disabled="!resultUrl" @click="download">下载图片</el-button>
      </div>

      <canvas ref="canvasEl" class="hidden" />
      <img v-if="imageUrl" ref="imgEl" :src="imageUrl" class="hidden" />

      <div v-if="resultUrl" class="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600">
        <img :src="resultUrl" class="max-w-full" alt="水印预览" />
      </div>
      <div v-else-if="imageUrl" class="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600">
        <img :src="imageUrl" class="max-w-full" alt="原图预览" />
      </div>
      <div v-else class="text-center text-slate-400 dark:text-slate-500 py-12">请上传图片后添加水印</div>
    </div>
    <ToolDetail title="使用说明">
      <p>在线为图片添加文字水印，所有操作在本地完成，图片不会上传至服务器。</p>
      <ul class="list-disc list-inside mt-1 space-y-1">
        <li>支持自定义水印文字、字号、颜色、透明度和旋转角度</li>
        <li>支持 5 种定位方式，以及平铺效果</li>
        <li>处理完成后可直接下载 PNG 格式图片</li>
      </ul>
    </ToolDetail>
  </div>
</template>
