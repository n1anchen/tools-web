<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { loadFontStylesheet, ensureFontsLoaded } from '@/utils/font'
import { Download } from '@element-plus/icons-vue'

const info = reactive({
  title: "P站风格Logo生成",
})

const canvasRef = ref<HTMLCanvasElement | null>(null)

const fontSize = 120

const state = reactive({
  leftText: 'Porn',
  rightText: 'hub',
  bgColor: 'black',
  boxColor: '#f99000',
  textColor: '#ffffff',
  bgShape: 'auto',
})

const drawLogo = async () => {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // 等待当前文本对应的字体分片下载完成
  const textContent = (state.leftText || '') + (state.rightText || '')
  if (textContent) {
    try {
      await document.fonts.load(`bold ${fontSize}px "Noto Sans SC"`, textContent)
      await document.fonts.ready
    } catch (_) { /* fallback to system font */ }
  }

  // Font setup
  const fontFamily = '"Noto Sans SC", "Helvetica Neue", Helvetica, Arial, sans-serif'
  const fontStyle = `bold ${fontSize}px ${fontFamily}`
  
  ctx.font = fontStyle
  const leftWidth = state.leftText ? ctx.measureText(state.leftText).width : 0
  const rightWidth = state.rightText ? ctx.measureText(state.rightText).width : 0
  
  // Layout constants
  const pX = 20     // Box horizontal padding
  const pY = 20     // Box vertical padding
  const gap = leftWidth && rightWidth ? 10 : 0    // Gap between text and box
  const margin = 40 // Outer margin
  
  const rightBoxWidth = state.rightText ? rightWidth + pX * 2 : 0
  const rightBoxHeight = state.rightText ? fontSize + pY * 2 : 0
  
  // Base dimensions
  let cvsWidth = leftWidth + gap + rightBoxWidth + margin * 2
  let cvsHeight = (rightBoxHeight || (fontSize + pY * 2)) + margin * 2
  
  // Calculate specific metrics for background shape
  if (state.bgShape === 'square') {
    const size = Math.max(cvsWidth, cvsHeight)
    cvsWidth = size
    cvsHeight = size
  } else if (state.bgShape === 'circle') {
    const size = Math.max(cvsWidth, cvsHeight)
    // Add extra padding so the corners of the inner content don't get clipped by the circle
    const diameter = size * 1.2
    cvsWidth = diameter
    cvsHeight = diameter
  }
  
  // Update canvas dimensions
  canvas.width = cvsWidth
  canvas.height = cvsHeight

  // Clear & background
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  
  if (state.bgColor === 'black') {
    ctx.fillStyle = '#000000'
    ctx.beginPath()
    if (state.bgShape === 'circle') {
      ctx.arc(cvsWidth / 2, cvsHeight / 2, cvsWidth / 2, 0, 2 * Math.PI)
      ctx.fill()
    } else {
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
  }

  // Calculate drawing offsets to perfectly center the logo content
  const contentWidth = leftWidth + gap + rightBoxWidth
  
  const startX = (canvas.width - contentWidth) / 2
  const textY = canvas.height / 2
  const textVisualOffsetY = fontSize * 0.08 // slight offset for vertical center in Arial

  // Draw Left Text
  ctx.textBaseline = 'middle'
  ctx.font = fontStyle
  if (state.leftText) {
    ctx.fillStyle = state.textColor
    ctx.fillText(state.leftText, startX, textY + textVisualOffsetY)
  }

  // Draw Right Box and Text
  if (state.rightText) {
    const boxX = startX + leftWidth + gap
    const boxY = (canvas.height - rightBoxHeight) / 2
    
    // Draw rounded rectangle background shape
    ctx.fillStyle = state.boxColor
    ctx.beginPath()
    const r = 10 // Border radius
    ctx.moveTo(boxX + r, boxY)
    ctx.lineTo(boxX + rightBoxWidth - r, boxY)
    ctx.quadraticCurveTo(boxX + rightBoxWidth, boxY, boxX + rightBoxWidth, boxY + r)
    ctx.lineTo(boxX + rightBoxWidth, boxY + rightBoxHeight - r)
    ctx.quadraticCurveTo(boxX + rightBoxWidth, boxY + rightBoxHeight, boxX + rightBoxWidth - r, boxY + rightBoxHeight)
    ctx.lineTo(boxX + r, boxY + rightBoxHeight)
    ctx.quadraticCurveTo(boxX, boxY + rightBoxHeight, boxX, boxY + rightBoxHeight - r)
    ctx.lineTo(boxX, boxY + r)
    ctx.quadraticCurveTo(boxX, boxY, boxX + r, boxY)
    
    ctx.closePath()
    ctx.fill()
    
    // Draw Right Text
    ctx.fillStyle = '#000000'
    const textX = boxX + (rightBoxWidth - rightWidth) / 2 // Center text inside box
    ctx.fillText(state.rightText, textX, textY + textVisualOffsetY)
  }
}

watch(state, () => {
  // Use timeout or nextTick if loading fonts, but Arial is system default
  drawLogo()
}, { deep: true })

onMounted(async () => {
  try {
    // 先等字体样式表加载并解析，再显式触发字体文件下载
    await loadFontStylesheet('font-noto-sans', 'https://fonts.loli.net/css?family=Noto+Sans+SC:900')
    await ensureFontsLoaded([{ font: `bold ${fontSize}px "Noto Sans SC"` }])
  } catch (e) {
    console.warn('Font preload warning:', e)
  }
  drawLogo()
})

const handleSave = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  
  const a = document.createElement("a")
  // For transparent background to work during download, it's saved as png
  a.href = canvas.toDataURL("image/png")
  a.setAttribute("download", `${state.leftText}${state.rightText}.png`)

  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
</script>

<template>
  <div class="flex flex-col mt-3 flex-1">
    <DetailHeader :title="info.title"></DetailHeader>

    <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm transition-shadow duration-300">
      
      <!-- Canvas Wrapper -->
      <div class="w-full overflow-x-auto mb-6 flex justify-center rounded-lg p-4 checkerboard-bg custom-scrollbar">
        <canvas ref="canvasRef" style="max-width: 100%; height: auto; border: 1px solid rgba(0,0,0,0.1);"></canvas>
      </div>

      <!-- Controls -->
      <div class="flex flex-col gap-6 max-w-3xl mx-auto w-full">
        <!-- Input fields -->
        <div class="flex flex-col gap-4">
          <div class="flex items-center gap-4">
            <div class="w-24 text-right text-gray-700 font-bold shrink-0">左侧文字</div>
            <el-input 
              v-model="state.leftText" 
              size="large"
              placeholder="请输入左侧文字"
            />
          </div>
          <div class="flex items-center gap-4">
            <div class="w-24 text-right text-gray-700 font-bold shrink-0">右侧文字</div>
            <el-input 
              v-model="state.rightText" 
              size="large"
              placeholder="请输入右侧文字"
            />
          </div>
        </div>

        <!-- Options -->
        <div class="flex flex-col sm:flex-row gap-6 justify-center flex-wrap">
          <div class="flex items-center gap-3">
            <span class="text-sm text-gray-600 dark:text-gray-300">背景形状</span>
            <el-radio-group v-model="state.bgShape">
              <el-radio-button value="auto">自适应</el-radio-button>
              <el-radio-button value="square">正方形</el-radio-button>
              <el-radio-button value="circle">圆形</el-radio-button>
            </el-radio-group>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-sm text-gray-600 dark:text-gray-300">图片背景</span>
            <el-radio-group v-model="state.bgColor">
              <el-radio-button value="black">黑色</el-radio-button>
              <el-radio-button value="transparent">透明</el-radio-button>
            </el-radio-group>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-sm text-gray-600 dark:text-gray-300">方块颜色</span>
            <el-color-picker v-model="state.boxColor" size="default" />
          </div>
          <div class="flex items-center gap-3">
            <span class="text-sm text-gray-600 dark:text-gray-300">文字颜色</span>
            <el-color-picker v-model="state.textColor" size="default" />
          </div>
        </div>

        <!-- Action -->
        <div class="flex justify-center mt-4">
          <el-button type="primary" size="large" class="w-48" @click="handleSave">
            <el-icon class="mr-1"><Download /></el-icon>保存图片
          </el-button>
        </div>
      </div>
    </div>

    <!-- desc -->
    <ToolDetail title="简介">
      <div class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        <el-text>生成P站风格的黑黄 Logo 图片，可自定义左右文字内容和背景形状。</el-text>
        <br/><el-text class="mt-2">您可以自定义左右侧的文本内容，并可以修改经典色调搭配甚至支持透明背景导出。</el-text>
      </div> 
    </ToolDetail>
  </div>
</template>

<style scoped>
.checkerboard-bg {
  background-color: #f9fafb;
  background-image: 
    linear-gradient(45deg, #e5e7eb 25%, transparent 25%, transparent 75%, #e5e7eb 75%, #e5e7eb), 
    linear-gradient(45deg, #e5e7eb 25%, transparent 25%, transparent 75%, #e5e7eb 75%, #e5e7eb);
  background-size: 20px 20px;
  background-position: 0 0, 10px 10px;
}

.dark .checkerboard-bg {
  background-color: #0f172a;
  background-image: 
    linear-gradient(45deg, #1e293b 25%, transparent 25%, transparent 75%, #1e293b 75%, #1e293b), 
    linear-gradient(45deg, #1e293b 25%, transparent 25%, transparent 75%, #1e293b 75%, #1e293b);
}

.custom-scrollbar::-webkit-scrollbar {
  height: 8px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background: #475569;
}
</style>
