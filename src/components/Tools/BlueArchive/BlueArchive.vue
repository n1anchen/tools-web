<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Download, CopyDocument, Loading } from '@element-plus/icons-vue'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { LogoCanvas } from './canvas'
import { loadImages } from './utils'
import debounce from 'lodash/debounce'
import { loadFontStylesheet, ensureFontsLoaded } from '@/utils/font'

const info = reactive({
  title: "蔚蓝档案标题生成",
})

const canvasRef = ref<HTMLCanvasElement | null>(null)
let baCanvas: LogoCanvas | null = null

const state = reactive({
  textL: 'Blue',
  textR: 'Archive',
  transparent: false,
  bgShape: 'auto' as 'auto' | 'square' | 'circle',
  graphX: -15,
  graphY: 0,
  loading: true
})

// Update canvas with state values
const updateCanvas = () => {
  if (!baCanvas) return
  
  baCanvas.textL = state.textL
  baCanvas.textR = state.textR
  baCanvas.transparentBg = state.transparent
  baCanvas.bgShape = state.bgShape
  baCanvas.graphOffset.X = state.graphX
  baCanvas.graphOffset.Y = state.graphY
  
  baCanvas.draw((l: boolean) => { state.loading = l })
}

// Debounced text update
const debouncedUpdate = debounce(updateCanvas, 300)

watch(() => [state.textL, state.textR], () => {
  debouncedUpdate()
})

watch(() => [state.transparent, state.bgShape, state.graphX, state.graphY], () => {
  updateCanvas()
})

onMounted(async () => {
  try {
    // 注册并加载本地 RoGSans 字体（仅 ASCII）
    const existingFace = [...document.fonts].find(f => f.family === 'RoGSans')
    let rogsansReady: Promise<FontFace>
    if (existingFace) {
      rogsansReady = existingFace.status === 'loaded'
        ? Promise.resolve(existingFace)
        : existingFace.load()
    } else {
      const rogsans = new FontFace('RoGSans', 'url(/fonts/bluearchive/RoGSans.woff2)', {
        weight: '900',
        style: 'normal',
        unicodeRange: 'U+0-7F',
      })
      document.fonts.add(rogsans)
      rogsansReady = rogsans.load()
    }

    // 并行加载所有资源：本地字体、网络字体样式表、图片
    const [, , { halo, cross }] = await Promise.all([
      rogsansReady.catch(e => console.warn('RoGSans load failed:', e)),
      loadFontStylesheet('font-noto-sans', 'https://fonts.loli.net/css?family=Noto+Sans+SC:900'),
      loadImages('/images/bluearchive/halo.png', '/images/bluearchive/cross.png'),
    ])

    // 显式触发网络字体分片下载
    await ensureFontsLoaded([
      { font: '900 84px "Noto Sans SC"', text: '测试' },
    ])

    if (canvasRef.value) {
      baCanvas = new LogoCanvas(canvasRef.value, halo, cross)
      updateCanvas()
    }
  } catch (err) {
    console.error("Failed to init BA logo canvas", err)
    state.loading = false
  }
})

onUnmounted(() => {
  debouncedUpdate.cancel()
})

const handleSave = async () => {
  if (!baCanvas) return
  
  try {
    const blob = await baCanvas.generateImg()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${state.textL}${state.textR}_ba-style.png`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    ElMessage.error('图片保存失败')
  }
}

const handleCopy = async () => {
  if (!baCanvas) return
  
  try {
    const blob = await baCanvas.generateImg()
    const cp = [new ClipboardItem({ 'image/png': blob })]
    await navigator.clipboard.write(cp)
    ElMessage.success('图片已复制到剪贴板')
  } catch (e) {
    ElMessage.error('图片复制失败，请尝试直接保存')
  }
}
</script>

<template>
  <div class="flex flex-col mt-3 flex-1">
    <DetailHeader :title="info.title"></DetailHeader>

    <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm transition-shadow duration-300">
      
      <!-- Canvas Wrapper -->
      <div class="w-full overflow-x-auto mb-6 flex justify-center rounded-lg p-4 checkerboard-bg custom-scrollbar relative">
        <canvas ref="canvasRef" height="250" width="900" style="max-width: 100%; height: auto; border: 1px solid rgba(0,0,0,0.1);"></canvas>
        
        <!-- Loading overlay -->
        <div v-if="state.loading" class="absolute inset-0 z-10 flex items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-lg">
          <el-icon class="is-loading text-4xl text-blue-500"><Loading /></el-icon>
        </div>
      </div>

      <!-- Controls -->
      <div class="flex flex-col gap-6 max-w-3xl mx-auto w-full">
        <!-- Input fields -->
        <div class="flex flex-col sm:flex-row gap-4 items-center justify-center">
          <el-input 
            v-model="state.textL" 
            size="large"
            placeholder="Blue"
            class="max-w-[200px]"
          />
          <el-input 
            v-model="state.textR" 
            size="large"
            placeholder="Archive"
            class="max-w-[200px]"
          />
        </div>

        <!-- Options -->
        <div class="flex flex-col sm:flex-row gap-6 justify-center flex-wrap">
          <div class="flex flex-col items-center gap-2">
            <el-checkbox v-model="state.transparent" label="透明背景" size="large" border />
          </div>

          <div class="flex items-center gap-3 bg-gray-50 dark:bg-slate-700/50 px-4 py-2 rounded-lg border border-gray-100 dark:border-slate-700">
            <span class="text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">背景形状</span>
            <el-radio-group v-model="state.bgShape" size="small">
              <el-radio-button value="auto">自适应</el-radio-button>
              <el-radio-button value="square">正方形</el-radio-button>
              <el-radio-button value="circle">圆形</el-radio-button>
            </el-radio-group>
          </div>

          <div class="flex items-center gap-3 bg-gray-50 dark:bg-slate-700/50 px-4 py-2 rounded-lg border border-gray-100 dark:border-slate-700">
            <span class="text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">光环位置 X</span>
            <el-input-number v-model="state.graphX" :step="1" size="small" class="w-24" />
            
            <span class="text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap ml-2">Y </span>
            <el-input-number v-model="state.graphY" :step="1" size="small" class="w-24" />
          </div>
        </div>

        <!-- Action -->
        <div class="flex justify-center gap-4 mt-4">
          <el-button type="primary" size="large" class="w-32" @click="handleSave" :loading="state.loading">
            <el-icon class="mr-1"><Download /></el-icon>保存图片
          </el-button>
          <el-button size="large" class="w-32" @click="handleCopy" :loading="state.loading">
            <el-icon class="mr-1"><CopyDocument /></el-icon>复制图片
          </el-button>
        </div>
      </div>
    </div>

    <!-- desc -->
    <ToolDetail title="简介">
      <div class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        <el-text>生成类似于《蔚蓝档案》(Blue Archive) 游戏主标题 Logo 风格的图片。</el-text>
        <br/><el-text class="mt-2">参考项目：<el-link href="https://github.com/nulla2011/Bluearchive-logo" target="_blank">nulla2011/Bluearchive-logo</el-link></el-text>
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
