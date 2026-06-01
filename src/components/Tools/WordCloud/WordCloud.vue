<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'
import 'echarts-wordcloud'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { ElMessage } from 'element-plus'

const title = '词云图'
const chartEl = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null
const inputText = ref('')
const minLength = ref(2)
const colorScheme = ref('blue')
const shape = ref('circle')

const colorSchemes: Record<string, string[]> = {
  blue: ['#1e90ff', '#00bfff', '#87ceeb', '#4169e1', '#0080ff'],
  warm: ['#ff6b35', '#f7931e', '#ffcd3c', '#ff5e5b', '#d62246'],
  cool: ['#2ec4b6', '#cbf3f0', '#1a936f', '#88d498', '#52b788'],
  mono: ['#333', '#555', '#777', '#999', '#aaa'],
}
const shapes = [
  { label: '圆形', value: 'circle' }, { label: '菱形', value: 'diamond' },
  { label: '三角', value: 'triangle' }, { label: '星形', value: 'star' },
  { label: '词云', value: 'cardioid' },
]

const generate = () => {
  if (!inputText.value.trim()) { ElMessage.warning('请输入文本'); return }
  const text = inputText.value.toLowerCase().replace(/[\p{P}\p{S}]/gu, ' ')
  const words = text.split(/\s+/).filter(w => w.length >= minLength.value)
  const map = new Map<string, number>()
  words.forEach(w => map.set(w, (map.get(w) || 0) + 1))
  const data = [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 200)
  if (!data.length) { ElMessage.warning('未找到符合条件的词语'); return }
  if (!chart || !chartEl.value) return
  chart.setOption({
    tooltip: {},
    series: [{
      type: 'wordCloud',
      shape: shape.value,
      sizeRange: [12, 60],
      rotationRange: [-45, 45],
      gridSize: 8,
      textStyle: {
        color: () => colorSchemes[colorScheme.value][Math.floor(Math.random() * colorSchemes[colorScheme.value].length)],
        fontFamily: 'sans-serif',
        fontWeight: 'bold',
      },
      emphasis: {
        focus: 'self',
        textStyle: {
          shadowBlur: 10,
          shadowColor: '#333',
        },
      },
      data,
    }]
  })
  ElMessage.success('词云已生成')
}

const download = () => {
  if (!chart) return
  const a = document.createElement('a')
  a.href = chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' })
  a.download = 'wordcloud.png'; a.click()
}

onMounted(() => {
  if (chartEl.value) chart = echarts.init(chartEl.value)
  window.addEventListener('resize', () => chart?.resize())
})
onBeforeUnmount(() => {
  chart?.dispose()
  window.removeEventListener('resize', () => chart?.resize())
})
</script>

<template>
  <div class="flex flex-col mt-3 flex-1">
    <DetailHeader :title="title" />
    <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-300 space-y-3">
      <el-input v-model="inputText" type="textarea" :rows="5" placeholder="请输入文本，自动统计词频并生成词云" />
      <div class="flex flex-wrap gap-3 items-center">
        <div class="flex items-center gap-1">
          <span class="text-sm text-slate-600 dark:text-slate-300">最短词长</span>
          <el-input-number v-model="minLength" :min="1" :max="6" size="small" style="width:70px" />
        </div>
        <div class="flex items-center gap-1">
          <span class="text-sm text-slate-600 dark:text-slate-300">配色</span>
          <el-select v-model="colorScheme" size="small" style="width:100px">
            <el-option label="蓝色系" value="blue" /><el-option label="暖色系" value="warm" />
            <el-option label="冷色系" value="cool" /><el-option label="黑白" value="mono" />
          </el-select>
        </div>
        <div class="flex items-center gap-1">
          <span class="text-sm text-slate-600 dark:text-slate-300">形状</span>
          <el-select v-model="shape" size="small" style="width:100px">
            <el-option v-for="s in shapes" :key="s.value" :label="s.label" :value="s.value" />
          </el-select>
        </div>
        <el-button type="primary" @click="generate">生成词云</el-button>
        <el-button type="success" @click="download">下载图片</el-button>
      </div>
      <div ref="chartEl" class="w-full rounded-lg bg-white" style="height:400px" />
    </div>
    <ToolDetail title="使用说明">
      <p>粘贴文本后点击"生成词云"，词语出现频率越高字号越大。</p>
      <ul class="list-disc list-inside mt-1 space-y-1">
        <li>支持多种形状和配色方案</li>
        <li>自动统计词频，可设置最短词长过滤短词</li>
        <li>可将词云图下载为 PNG 格式</li>
      </ul>
    </ToolDetail>
  </div>
</template>
