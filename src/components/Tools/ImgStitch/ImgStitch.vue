<script setup lang="ts">
import { ref, reactive, watch, nextTick } from 'vue'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { autoDown } from '@/utils/file'
import { ElMessage } from 'element-plus'

const title = '图片拼接'

interface ImageItem {
  id: string
  img: HTMLImageElement
  name: string
  objectUrl: string
}

const images = ref<ImageItem[]>([])
const canvasRef = ref<HTMLCanvasElement | null>(null)
const saveFormat = ref<'jpeg' | 'png'>('jpeg')

const state = reactive({
  mode: 'vertical' as 'vertical' | 'horizontal' | 'caption',
  gap: 10,
  bgColor: '#ffffff',
  captionRange: [70, 95] as [number, number],
})

// ── 拖拽排序 ────────────────────────────────────────────────────────────────
const dragIndex = ref(-1)
const dragOverIndex = ref(-1)

function onDragStart(index: number, e: DragEvent) {
  dragIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }
}

function onDragOver(e: DragEvent, index: number) {
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
  dragOverIndex.value = index
}

function onDragLeave() {
  dragOverIndex.value = -1
}

function onDrop(e: DragEvent, index: number) {
  e.preventDefault()
  const from = dragIndex.value
  if (from === -1 || from === index) {
    dragIndex.value = -1
    dragOverIndex.value = -1
    return
  }
  const list = [...images.value]
  const [moved] = list.splice(from, 1)
  list.splice(index, 0, moved)
  images.value = list
  dragIndex.value = -1
  dragOverIndex.value = -1
}

function onDragEnd() {
  dragIndex.value = -1
  dragOverIndex.value = -1
}

// ── 图片上传 ────────────────────────────────────────────────────────────────
function handleUpload(file: any) {
  const objectUrl = URL.createObjectURL(file.raw)
  const img = new Image()
  img.onload = () => {
    images.value.push({
      id: `${Date.now()}-${Math.random()}`,
      img,
      name: file.name,
      objectUrl,
    })
  }
  img.onerror = () => URL.revokeObjectURL(objectUrl)
  img.src = objectUrl
  return false
}

function removeImage(index: number) {
  URL.revokeObjectURL(images.value[index].objectUrl)
  images.value.splice(index, 1)
}

function clearAll() {
  images.value.forEach(item => URL.revokeObjectURL(item.objectUrl))
  images.value = []
}

// ── Canvas 绘制 ─────────────────────────────────────────────────────────────
function drawPlaceholder() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const isDark = document.documentElement.classList.contains('dark')
  canvas.width = 600
  canvas.height = 300
  ctx.fillStyle = isDark ? '#1e293b' : '#e2e8f0'
  ctx.fillRect(0, 0, 600, 300)
  ctx.fillStyle = isDark ? '#64748b' : '#94a3b8'
  ctx.font = '18px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('上传图片后在此预览效果', 300, 150)
}

function redraw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const imgs = images.value.map(i => i.img)
  if (imgs.length === 0) {
    drawPlaceholder()
    return
  }
  const { gap, bgColor, mode, captionRange } = state

  if (mode === 'vertical') {
    const W = Math.min(...imgs.map(i => i.naturalWidth))
    const heights = imgs.map(i => Math.round(i.naturalHeight * W / i.naturalWidth))
    const totalH = heights.reduce((a, b) => a + b, 0) + gap * (imgs.length - 1)
    canvas.width = W
    canvas.height = Math.max(1, totalH)
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, W, canvas.height)
    let y = 0
    imgs.forEach((img, i) => {
      ctx.drawImage(img, 0, y, W, heights[i])
      y += heights[i]
      if (i < imgs.length - 1) y += gap
    })

  } else if (mode === 'horizontal') {
    const H = Math.min(...imgs.map(i => i.naturalHeight))
    const widths = imgs.map(i => Math.round(i.naturalWidth * H / i.naturalHeight))
    const totalW = widths.reduce((a, b) => a + b, 0) + gap * (imgs.length - 1)
    canvas.width = Math.max(1, totalW)
    canvas.height = H
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, canvas.width, H)
    let x = 0
    imgs.forEach((img, i) => {
      ctx.drawImage(img, x, 0, widths[i], H)
      x += widths[i]
      if (i < imgs.length - 1) x += gap
    })

  } else {
    // 影视台词拼接
    const W = Math.min(...imgs.map(i => i.naturalWidth))
    const n = imgs.length
    const [startPct, endPct] = captionRange

    type Crop = { srcY: number; srcH: number; dstH: number }
    const crops: Crop[] = imgs.map((img, i) => {
      const naturalH = img.naturalHeight
      const scaleFactor = W / img.naturalWidth
      // 计算在自然坐标系下的裁剪 Y 和高度
      let srcY: number, srcH: number
      if (n === 1) {
        srcY = 0
        srcH = naturalH
      } else if (i === 0) {
        // 第一张：保留顶部到台词结束
        srcY = 0
        srcH = Math.round(naturalH * endPct / 100)
      } else if (i === n - 1) {
        // 最后一张：台词开始到底部
        srcY = Math.round(naturalH * startPct / 100)
        srcH = naturalH - srcY
      } else {
        // 中间：仅台词条（start → end）
        srcY = Math.round(naturalH * startPct / 100)
        srcH = Math.round(naturalH * endPct / 100) - srcY
      }
      srcH = Math.max(1, srcH)
      const dstH = Math.max(1, Math.round(srcH * scaleFactor))
      return { srcY, srcH, dstH }
    })

    const totalH = crops.reduce((a, c) => a + c.dstH, 0)
    canvas.width = W
    canvas.height = Math.max(1, totalH)
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, W, canvas.height)

    let y = 0
    imgs.forEach((img, i) => {
      const { srcY, srcH, dstH } = crops[i]
      ctx.drawImage(img, 0, srcY, img.naturalWidth, srcH, 0, y, W, dstH)
      y += dstH
    })
  }
}

// ── 监听变化自动重绘 ──────────────────────────────────────────────────────────
watch(
  [
    () => images.value.length,
    images,
    () => state.mode,
    () => state.gap,
    () => state.bgColor,
    () => state.captionRange[0],
    () => state.captionRange[1],
  ],
  () => nextTick(redraw),
  { deep: true },
)

// ── 导出 ────────────────────────────────────────────────────────────────────
function handleExport() {
  const canvas = canvasRef.value
  if (!canvas || images.value.length === 0) {
    ElMessage.warning('请先上传图片')
    return
  }
  const mime = saveFormat.value === 'jpeg' ? 'image/jpeg' : 'image/png'
  const ext = saveFormat.value === 'jpeg' ? '.jpg' : '.png'
  const url = canvas.toDataURL(mime, 0.95)
  autoDown(url, `拼接结果${ext}`)
}
</script>

<template>
  <div class="flex flex-col mt-3 flex-1">
    <DetailHeader :title="title" />

    <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div class="flex flex-col lg:flex-row gap-4">

        <!-- 左侧：实时预览 -->
        <div class="flex-1 min-w-0 flex flex-col">
          <p class="text-xs text-slate-500 dark:text-slate-400 mb-1.5">实时预览</p>
          <div class="flex-1 overflow-auto rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-2 min-h-[300px]">
            <canvas ref="canvasRef" class="block" style="max-width: 100%;" />
          </div>
        </div>

        <!-- 右侧：操作区 -->
        <div class="shrink-0 w-full lg:w-80 xl:w-96 flex flex-col gap-4">

          <!-- 上传区 -->
          <div class="flex items-center gap-2 flex-wrap">
            <el-upload
              :auto-upload="false"
              :show-file-list="false"
              accept="image/*"
              multiple
              :on-change="handleUpload"
            >
              <el-button type="primary">+ 添加图片</el-button>
            </el-upload>
            <el-button v-if="images.length > 0" type="danger" plain @click="clearAll">清除全部</el-button>
          </div>

          <!-- 图片列表 -->
          <div v-if="images.length > 0">
            <p class="text-xs text-slate-400 dark:text-slate-500 mb-1.5">{{ images.length }} 张图片，拖拽调整顺序</p>
            <div class="flex flex-wrap gap-2">
              <div
                v-for="(item, index) in images"
                :key="item.id"
                draggable="true"
                @dragstart="onDragStart(index, $event)"
                @dragover="onDragOver($event, index)"
                @dragleave="onDragLeave"
                @drop="onDrop($event, index)"
                @dragend="onDragEnd"
                :class="[
                  'relative w-20 h-20 rounded-lg overflow-hidden border-2 cursor-grab select-none transition-all',
                  dragOverIndex === index && dragIndex !== index
                    ? 'border-blue-400 scale-105'
                    : 'border-slate-200 dark:border-slate-600',
                  dragIndex === index ? 'opacity-40' : 'opacity-100',
                ]"
              >
                <img :src="item.objectUrl" class="w-full h-full object-cover pointer-events-none" />
                <div class="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-start justify-end p-1">
                  <button
                    @click.stop="removeImage(index)"
                    class="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600 leading-none"
                  >×</button>
                </div>
                <div class="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-1 py-0.5 truncate text-center">
                  {{ index + 1 }}
                </div>
              </div>
            </div>
          </div>

          <!-- 参数面板 -->
          <div class="flex flex-col gap-3">
            <!-- 拼接模式 -->
            <div>
              <p class="text-xs text-slate-500 dark:text-slate-400 mb-1">拼接模式</p>
              <el-radio-group v-model="state.mode" size="small">
                <el-radio-button value="vertical">纵向</el-radio-button>
                <el-radio-button value="horizontal">横向</el-radio-button>
                <el-radio-button value="caption">影视台词</el-radio-button>
              </el-radio-group>
            </div>

            <!-- 图片间距（纵向/横向模式） -->
            <div v-if="state.mode !== 'caption'">
              <p class="text-xs text-slate-500 dark:text-slate-400 mb-1">图片间距：{{ state.gap }}px</p>
              <el-slider v-model="state.gap" :min="0" :max="100" :step="1" />
            </div>

            <!-- 背景色 -->
            <div class="flex items-center gap-2">
              <p class="text-xs text-slate-500 dark:text-slate-400">背景颜色</p>
              <el-color-picker v-model="state.bgColor" show-alpha size="small" />
              <span class="text-xs text-slate-400 dark:text-slate-500">{{ state.bgColor }}</span>
            </div>

            <!-- 台词区域（影视台词模式） -->
            <div v-if="state.mode === 'caption'">
              <p class="text-xs text-slate-500 dark:text-slate-400 mb-2">台词区域（顶部百分比）</p>
              <el-slider
                v-model="state.captionRange"
                range
                :min="0"
                :max="100"
                :step="1"
                :marks="{ [state.captionRange[0]]: '开始', [state.captionRange[1]]: '结束' }"
              />
              <div class="flex justify-between text-xs text-slate-400 dark:text-slate-500 mt-4">
                <span>台词开始：{{ state.captionRange[0] }}%</span>
                <span>台词结束：{{ state.captionRange[1] }}%</span>
              </div>
              <p class="text-xs text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">
                首图保留顶部→台词结束；中间图仅保留台词条；末图保留台词开始→底部
              </p>
            </div>

            <!-- 导出格式 + 按钮 -->
            <div class="flex items-center gap-2 pt-1">
              <el-radio-group v-model="saveFormat" size="small">
                <el-radio-button value="jpeg">JPG</el-radio-button>
                <el-radio-button value="png">PNG</el-radio-button>
              </el-radio-group>
              <el-button type="primary" @click="handleExport" :disabled="images.length === 0">
                导出图片
              </el-button>
            </div>
          </div>

        </div>

      </div>
    </div>

    <ToolDetail title="使用说明">
      <el-text>
        上传若干图片后，可选择<b>纵向拼接</b>（按最小宽度对齐，从上到下排列）、<b>横向拼接</b>（按最小高度对齐，从左到右排列）或<b>影视台词拼接</b>（仅保留每张图片的台词区域，竖向叠加）。
        可用滑块调节<b>图片间距</b>和<b>背景色</b>，并实时预览效果。
        <b>影视台词模式</b>下，使用双滑块设置台词区域的开始和结束百分比：第一张图保留顶部至台词结束处，中间图仅保留台词条，最后一张保留台词开始至图片底部。
        在图片列表区域可通过<b>拖拽卡片</b>调整图片顺序。
        完成后选择导出格式（JPG / PNG）并点击"导出图片"即可下载。
      </el-text>
    </ToolDetail>
  </div>
</template>
