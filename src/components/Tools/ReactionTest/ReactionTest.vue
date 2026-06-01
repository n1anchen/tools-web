<script setup lang="ts">
import { ref, computed } from 'vue'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'

const title = '反应速度测试'

type State = 'ready' | 'waiting' | 'active' | 'tooEarly' | 'result'
const state = ref<State>('ready')
const reactionTime = ref(0)
const startTime = ref(0)
const history = ref<number[]>([])
let timer: ReturnType<typeof setTimeout> | null = null

const bestTime = computed(() => history.value.length ? Math.min(...history.value) : 0)
const avgTime = computed(() => history.value.length ? Math.round(history.value.reduce((a, b) => a + b, 0) / history.value.length) : 0)

const start = () => {
  state.value = 'waiting'
  const delay = 1500 + Math.random() * 3500
  timer = setTimeout(() => { state.value = 'active'; startTime.value = Date.now() }, delay)
}

const click = () => {
  if (state.value === 'ready' || state.value === 'result' || state.value === 'tooEarly') {
    start()
  } else if (state.value === 'waiting') {
    if (timer) clearTimeout(timer)
    state.value = 'tooEarly'
  } else if (state.value === 'active') {
    reactionTime.value = Date.now() - startTime.value
    history.value.push(reactionTime.value)
    state.value = 'result'
  }
}

const reset = () => {
  if (timer) clearTimeout(timer)
  state.value = 'ready'; reactionTime.value = 0; history.value = []
}

const stateConfig: Record<State, { bg: string; text: string; label: string; sub: string }> = {
  ready:    { bg: 'bg-blue-500',  text: 'text-white', label: '点击开始',  sub: '准备好后点击屏幕开始' },
  waiting:  { bg: 'bg-yellow-400', text: 'text-yellow-900', label: '等待变绿...', sub: '不要点击！等绿色出现再点' },
  active:   { bg: 'bg-green-500', text: 'text-white', label: '现在点击！', sub: '尽快点击！' },
  tooEarly: { bg: 'bg-red-500',   text: 'text-white', label: '太早了！',  sub: '点击重新开始' },
  result:   { bg: 'bg-blue-500',  text: 'text-white', label: '',           sub: '点击再次测试' },
}
</script>

<template>
  <div class="flex flex-col mt-3 flex-1">
    <DetailHeader :title="title" />
    <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-300 space-y-4">
      <div
        :class="['w-full rounded-xl cursor-pointer select-none flex flex-col items-center justify-center transition-colors duration-150', stateConfig[state].bg, stateConfig[state].text]"
        style="min-height:220px"
        @click="click"
      >
        <div v-if="state === 'result'" class="text-center space-y-1">
          <div class="text-6xl font-bold">{{ reactionTime }}</div>
          <div class="text-xl">毫秒</div>
          <div class="text-sm opacity-80">{{ stateConfig.result.sub }}</div>
        </div>
        <div v-else class="text-center space-y-2 px-8">
          <div class="text-3xl font-semibold">{{ stateConfig[state].label }}</div>
          <div class="text-sm opacity-80">{{ stateConfig[state].sub }}</div>
        </div>
      </div>

      <div v-if="history.length" class="grid grid-cols-3 gap-3 text-center">
        <div class="rounded-lg bg-slate-50 dark:bg-slate-700 p-3">
          <div class="text-xs text-slate-500 dark:text-slate-400">本次</div>
          <div class="text-2xl font-bold text-blue-500">{{ reactionTime }}</div>
          <div class="text-xs text-slate-400">ms</div>
        </div>
        <div class="rounded-lg bg-slate-50 dark:bg-slate-700 p-3">
          <div class="text-xs text-slate-500 dark:text-slate-400">最佳</div>
          <div class="text-2xl font-bold text-green-500">{{ bestTime }}</div>
          <div class="text-xs text-slate-400">ms</div>
        </div>
        <div class="rounded-lg bg-slate-50 dark:bg-slate-700 p-3">
          <div class="text-xs text-slate-500 dark:text-slate-400">平均</div>
          <div class="text-2xl font-bold text-orange-500">{{ avgTime }}</div>
          <div class="text-xs text-slate-400">ms</div>
        </div>
      </div>

      <div v-if="history.length > 1" class="space-y-1">
        <p class="text-xs text-slate-500 dark:text-slate-400">历史记录（共 {{ history.length }} 次）</p>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="(t, i) in history"
            :key="i"
            class="px-2 py-0.5 rounded text-xs font-mono bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
          >{{ t }}ms</span>
        </div>
      </div>

      <el-button v-if="history.length" @click="reset">重置记录</el-button>
    </div>
    <ToolDetail title="使用说明">
      <p>测试你的反应速度，屏幕变绿时立即点击，记录反应时间。</p>
      <ul class="list-disc list-inside mt-1 space-y-1">
        <li>等待期间不要过早点击，否则需要重新开始</li>
        <li>可多次测试，系统自动统计最佳和平均成绩</li>
        <li>普通人反应时间约为 200-250ms</li>
      </ul>
    </ToolDetail>
  </div>
</template>
