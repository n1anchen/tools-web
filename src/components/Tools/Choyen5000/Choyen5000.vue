<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { Drawer } from './choyen'
import { loadFontStylesheet, ensureFontsLoaded } from '@/utils/font'
import { Download } from '@element-plus/icons-vue'

const info = reactive({
  title: "5000兆円生成器",
})

const canvasRef = ref<HTMLCanvasElement | null>(null)
let drawer: Drawer | null = null

const state = reactive({
  topText: '5000兆円',
  bottomText: '欲しい!',
  textType: 'text',
  bgColor: 'white'
})

const initDrawer = () => {
  if (canvasRef.value) {
    drawer = new Drawer(canvasRef.value)
    drawer.lang = "cn"
    onChangeState()
  }
}

const onChangeState = async () => {
  if (!drawer) return
  
  drawer.useTransparent = state.bgColor === 'transparent'
  drawer.bottomText.useImg = state.textType === 'image'
  drawer.topText.value = state.topText
  drawer.bottomText.value = state.bottomText.replace(/！/g, "!")
  
  // 等待当前文本对应的字体分片下载完成后再绘制
  const textContent = state.topText + state.bottomText
  if (textContent) {
    try {
      await Promise.all([
        document.fonts.load(`900 100px "Noto Sans SC"`, textContent),
        document.fonts.load(`900 100px "Noto Serif SC"`, textContent),
      ])
      await document.fonts.ready
    } catch (_) { /* fallback to system font */ }
  }
  
  drawer.refresh()
}

const handleSave = () => {
  if (drawer) {
    drawer.saveImage()
  }
}

let resizeObserver: ResizeObserver | null = null
onMounted(async () => {
  try {
    // 先等字体样式表加载并解析，再显式触发字体文件下载
    await Promise.all([
      loadFontStylesheet('font-noto-sans', 'https://fonts.loli.net/css?family=Noto+Sans+SC:900'),
      loadFontStylesheet('font-noto-serif', 'https://fonts.loli.net/css?family=Noto+Serif+SC:900'),
    ])
    await ensureFontsLoaded([
      { font: '900 100px "Noto Sans SC"' },
      { font: '900 100px "Noto Serif SC"' },
    ])
  } catch (e) {
    console.warn('Font preload warning:', e)
  }

  initDrawer()

  if (canvasRef.value) {
    resizeObserver = new ResizeObserver(() => {
      drawer?.refresh()
    })
    resizeObserver.observe(canvasRef.value)
  }
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})
</script>

<template>
  <div class="flex flex-col mt-3 flex-1">
    <DetailHeader :title="info.title"></DetailHeader>

    <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm transition-shadow duration-300">
      
      <!-- Canvas Wrapper -->
      <div class="w-full overflow-x-auto mb-6 flex justify-center bg-gray-50 dark:bg-slate-900 rounded-lg p-4 custom-scrollbar">
        <canvas ref="canvasRef" width="1500" height="290" style="max-width: 100%; height: auto; touch-action: none;"></canvas>
      </div>

      <!-- Controls -->
      <div class="flex flex-col gap-6 max-w-3xl mx-auto w-full">
        <!-- Input fields -->
        <div class="flex flex-col gap-4">
          <div class="flex items-center gap-4">
            <div class="w-24 text-right text-red-500 font-bold shrink-0">红色文字</div>
            <el-input 
              v-model="state.topText" 
              @input="onChangeState" 
              size="large"
              placeholder="请输入红色文字"
            />
          </div>
          <div class="flex items-center gap-4">
            <div class="w-24 text-right text-gray-500 font-bold shrink-0">银色文字</div>
            <el-input 
              v-model="state.bottomText" 
              @input="onChangeState" 
              size="large"
              placeholder="请输入银色文字"
              :disabled="state.textType === 'image'"
            />
          </div>
        </div>

        <!-- Options -->
        <div class="flex flex-col sm:flex-row gap-6 justify-center">
          <div class="flex items-center gap-3">
            <span class="text-sm text-gray-600 dark:text-gray-300">"欲しい!" 的生成方式</span>
            <el-radio-group v-model="state.textType" @change="onChangeState">
              <el-radio-button value="text">生成文字</el-radio-button>
              <el-radio-button value="image">使用原图</el-radio-button>
            </el-radio-group>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-sm text-gray-600 dark:text-gray-300">图片背景</span>
            <el-radio-group v-model="state.bgColor" @change="onChangeState">
              <el-radio-button value="white">白色</el-radio-button>
              <el-radio-button value="transparent">透明</el-radio-button>
            </el-radio-group>
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
    <ToolDetail title="描述">
      <div class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        <el-text>生成5000兆円风格图片的工具。可以生成经典的 <strong>5000兆円欲しい!</strong> 表情包，支持自定义文字。</el-text>
        <br/><el-text class="mt-2">提示：银色文字部分（"欲しい!"这一段）在画布上可以拖动改变位置。</el-text>
        <br/><el-text class="mt-2">参考项目：<el-link href="https://github.com/yurafuca/5000choyen" target="_blank">yurafuca/5000choyen</el-link></el-text>
      </div> 
    </ToolDetail>
  </div>
</template>

<style scoped>
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
