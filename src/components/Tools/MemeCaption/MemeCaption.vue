<script setup lang="ts">
import { ref, reactive, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { UploadProps, UploadInstance, UploadRawFile, genFileId } from 'element-plus'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { autoDown } from '@/utils/file'

const title = '表情包配字'

// ── 状态 ──────────────────────────────────────────────────────────────────────
const state = reactive({
  srcImage: null as HTMLImageElement | null,
  text: '请输入文本', // 字幕文本
  fontSize: 28,
  // 字幕条内上下边距 px
  captionPadding: 0,
  // 距画布底部 px（默认 0，最大动态计算）
  offsetBottom: 0,
  bgMode: 'black' as 'black' | 'white' | 'transparent',
  stroke: true,
  strokeWidth: 3,
  scale: 1,
})

// ── Refs ──────────────────────────────────────────────────────────────────────
const canvasRef = ref<HTMLCanvasElement | null>(null)
const uploadRef = ref<UploadInstance>()
const hasImage = ref(false)
// 距底部滑块的动态最大值
const maxOffsetBottom = ref(400)
const saveFormat = ref<'jpeg' | 'png'>('jpeg')

// ── 核心绘制函数 ───────────────────────────────────────────────────────────────
function redraw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const img = state.srcImage

  // 无图时绘制占位（适配暗色模式，按容器实际物理像素绘制避免模糊）
  if (!img) {
    const isDark = document.documentElement.classList.contains('dark')
    const dpr = window.devicePixelRatio || 1
    const containerW = (canvas.parentElement?.clientWidth ?? 320) - 16 // 减去 p-2 的 padding
    const logicW = Math.max(containerW, 80)
    const logicH = Math.round(logicW * 0.56)
    canvas.width = Math.round(logicW * dpr)
    canvas.height = Math.round(logicH * dpr)
    ctx.scale(dpr, dpr)
    ctx.fillStyle = isDark ? '#1e293b' : '#e2e8f0'
    ctx.fillRect(0, 0, logicW, logicH)
    ctx.fillStyle = isDark ? '#64748b' : '#94a3b8'
    ctx.font = '16px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('上传图片后预览', logicW / 2, logicH / 2)
    return
  }

  // 缩放后尺寸
  const w = Math.round(img.naturalWidth / state.scale)
  const h = Math.round(img.naturalHeight / state.scale)
  canvas.width = w
  canvas.height = h

  // 绘图
  ctx.clearRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)

  // ── 字体 ──
  const fontSize = state.fontSize
  ctx.font = `bold ${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'

  // 解析多行文本
  const lines = state.text.split('\n').filter(l => l !== '')

  const lineHeight = fontSize * 1.35
  const totalTextH = lineHeight * lines.length
  const padding = state.captionPadding
  const barH = lines.length > 0 ? totalTextH + padding * 2 : 0

  // 更新距底部滑块最大值（图片高度 - 字幕条高度）
  const newMax = Math.max(0, h - barH)
  maxOffsetBottom.value = newMax
  if (state.offsetBottom > newMax) state.offsetBottom = newMax

  if (lines.length === 0) return

  // 字幕条顶部 Y
  const barY = h - state.offsetBottom - barH

  // 绘制背景条 —— 完全不透明
  if (state.bgMode !== 'transparent') {
    ctx.fillStyle = state.bgMode === 'black' ? '#000000' : '#ffffff'
    ctx.fillRect(0, barY, w, barH)
  }

  // 绘制每行文字
  const textColor = state.bgMode === 'white' ? '#111111' : '#ffffff'
  ctx.fillStyle = textColor

  lines.forEach((line, i) => {
    const y = barY + padding + lineHeight * (i + 1)
    if (state.stroke) {
      ctx.strokeStyle = state.bgMode === 'white' ? 'rgba(120,120,120,0.7)' : 'rgba(0,0,0,0.9)'
      ctx.lineWidth = state.strokeWidth
      ctx.lineJoin = 'round'
      ctx.strokeText(line, w / 2, y)
    }
    ctx.fillText(line, w / 2, y)
  })
}

// ── 监听参数变化触发重绘 ───────────────────────────────────────────────────────
watch(
  () => [
    state.text,
    state.fontSize,
    state.captionPadding,
    state.offsetBottom,
    state.bgMode,
    state.stroke,
    state.strokeWidth,
    state.scale,
  ],
  () => redraw(),
)

// ── 图片上传处理 ───────────────────────────────────────────────────────────────
const handleUploadChange: UploadProps['onChange'] = (file) => {
  const url = URL.createObjectURL(file.raw!)
  const img = new Image()
  img.onload = () => {
    state.srcImage = img
    hasImage.value = true
    state.offsetBottom = 0
    // 默认字体大小 = 缩放后图片高度的 10%，限制在滑块范围内
    state.fontSize = Math.min(120, Math.max(12, Math.round(img.naturalHeight / state.scale * 0.1)))
    nextTick(redraw)
  }
  img.src = url
}

const handleUploadExceed: UploadProps['onExceed'] = (files) => {
  uploadRef.value!.clearFiles()
  const file = files[0] as UploadRawFile
  file.uid = genFileId()
  uploadRef.value!.handleStart(file)
}

// ── 保存图片 ───────────────────────────────────────────────────────────────────
function saveAs(format: 'jpeg' | 'png') {
  const canvas = canvasRef.value
  if (!canvas || !hasImage.value) return
  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png'
  const quality = format === 'jpeg' ? 0.95 : undefined
  const dataUrl = canvas.toDataURL(mimeType, quality)
  const ts = Date.now()
  autoDown(dataUrl, `meme_${ts}.${format === 'jpeg' ? 'jpg' : 'png'}`)
}

// ── 初始化占位 & 监听暗色模式切换 ──────────────────────────────────────────────
let themeObserver: MutationObserver | null = null

onMounted(() => {
  nextTick(redraw)
  // 监听 <html> class 变化（Tailwind 暗色模式切换），重绘占位图
  themeObserver = new MutationObserver(() => {
    if (!hasImage.value) redraw()
  })
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
})

onUnmounted(() => {
  themeObserver?.disconnect()
})
</script>

<template>
  <div class="flex flex-col mt-3 flex-1">
    <DetailHeader :title="title" />

    <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div class="flex flex-col lg:flex-row lg:items-stretch gap-5">

        <!-- ── 左侧：画布预览 ── -->
        <div class="flex flex-col gap-3 flex-1 min-w-0">
          <!-- flex-1 让预览区高度撑满，与右侧控制面板对齐 -->
          <div class="flex-1 min-h-0 rounded-xl bg-slate-100 dark:bg-slate-700 overflow-hidden p-2">
            <canvas
              ref="canvasRef"
              class="rounded shadow"
              style="width:100%;height:auto;display:block;image-rendering:pixelated;"
            />
          </div>
          <!-- 上传 & 保存按钮 -->
          <div class="flex items-center justify-center gap-2">
            <el-upload
              ref="uploadRef"
              :limit="1"
              accept="image/*"
              :auto-upload="false"
              :show-file-list="false"
              @change="handleUploadChange"
              @exceed="handleUploadExceed"
            >
              <template #trigger>
                <el-button type="primary">上传图片</el-button>
              </template>
            </el-upload>
            <el-radio-group v-model="saveFormat" size="default">
              <el-radio-button value="jpeg">JPG</el-radio-button>
              <el-radio-button value="png">PNG</el-radio-button>
            </el-radio-group>
            <el-button :disabled="!hasImage" @click="saveAs(saveFormat)">保存</el-button>
          </div>
        </div>

        <!-- ── 右侧：控制面板 ── -->
        <div class="flex flex-col gap-4 w-full lg:w-72 shrink-0">

          <!-- 字幕文本 -->
          <div>
            <div class="mb-1 text-sm font-medium text-slate-600 dark:text-slate-300">字幕文本</div>
            <el-input
              v-model="state.text"
              type="textarea"
              :rows="3"
              placeholder="输入字幕，支持换行"
            />
          </div>

          <!-- 字体大小 -->
          <div>
            <div class="mb-1 text-sm font-medium text-slate-600 dark:text-slate-300">
              字体大小：{{ state.fontSize }}px
            </div>
            <el-slider v-model="state.fontSize" :min="12" :max="120" :step="1" />
          </div>

          <!-- 字幕条内边距 -->
          <div>
            <div class="mb-1 text-sm font-medium text-slate-600 dark:text-slate-300">
              文字上下边距：{{ state.captionPadding }}px
            </div>
            <el-slider v-model="state.captionPadding" :min="0" :max="60" :step="1" />
          </div>

          <!-- 配字距底部距离 -->
          <div>
            <div class="mb-1 text-sm font-medium text-slate-600 dark:text-slate-300">
              距底部距离：{{ state.offsetBottom }}px
            </div>
            <el-slider
              v-model="state.offsetBottom"
              :min="0"
              :max="maxOffsetBottom"
              :step="1"
              :disabled="!hasImage"
            />
          </div>

          <!-- 背景颜色 -->
          <div>
            <div class="mb-1 text-sm font-medium text-slate-600 dark:text-slate-300">字幕背景</div>
            <el-radio-group v-model="state.bgMode" size="small">
              <el-radio-button value="black">黑底</el-radio-button>
              <el-radio-button value="white">白底</el-radio-button>
              <el-radio-button value="transparent">透明</el-radio-button>
            </el-radio-group>
          </div>

          <!-- 描边 -->
          <div>
            <div class="mb-2 text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
              文字描边
              <el-switch v-model="state.stroke" />
            </div>
            <template v-if="state.stroke">
              <div class="mb-1 text-sm text-slate-500 dark:text-slate-400">描边粗细：{{ state.strokeWidth }}px</div>
              <el-slider v-model="state.strokeWidth" :min="1" :max="12" :step="1" />
            </template>
          </div>

          <!-- 缩小倍数 -->
          <div>
            <div class="mb-1 text-sm font-medium text-slate-600 dark:text-slate-300">图片缩小</div>
            <el-radio-group v-model="state.scale" size="small">
              <el-radio-button :value="1">原图</el-radio-button>
              <el-radio-button :value="2">1/2</el-radio-button>
              <el-radio-button :value="3">1/3</el-radio-button>
              <el-radio-button :value="4">1/4</el-radio-button>
            </el-radio-group>
          </div>

          <!-- 相关工具提示 -->
          <div class="mt-auto pt-2 border-t border-slate-200 dark:border-slate-600">
            <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              💡 想要做旧效果？保存图片后可前往
              <a
                href="/electronicpatina/"
                class="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-2"
              >电子包浆模拟器</a>
              进行处理。
            </p>
          </div>

        </div>
      </div>
    </div>

    <ToolDetail title="使用说明">
      <el-text>
        上传一张图片，在右侧面板输入字幕文本（支持换行），实时预览效果。
        可调整字体大小、字幕区上下内边距、字幕距底部的距离（最大值根据图片高度自动变化）、背景样式（黑底 / 白底 / 透明）及文字描边效果。
        对于较大图片可选择缩小倍数（1/2、1/3、1/4），方便制作尺寸合适的表情包。
        完成后点击"保存 JPG"或"保存 PNG"下载配字后的图片。
      </el-text>
    </ToolDetail>
  </div>
</template>
