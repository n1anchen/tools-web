<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Aim, Refresh, Trophy } from '@element-plus/icons-vue'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import { summarizeReactionTimes } from '@/utils/workbenchTools'

type TestState = 'intro' | 'waiting' | 'active' | 'tooEarly' | 'roundResult' | 'complete'

const state = ref<TestState>('intro')
const targetRounds = ref(5)
const times = ref<number[]>([])
const falseStarts = ref(0)
const latestTime = ref(0)
const personalBest = ref(0)
let timer: ReturnType<typeof setTimeout> | null = null
let startedAt = 0

const summary = computed(() => summarizeReactionTimes(times.value))
const completedRounds = computed(() => times.value.length)
const currentRound = computed(() => Math.min(targetRounds.value, completedRounds.value + 1))
const sessionProgress = computed(() => Math.round(completedRounds.value / targetRounds.value * 100))
const chartRange = computed(() => Math.max(1, summary.value.spread))

const stateContent = computed(() => ({
  intro: { eyebrow: 'READY?', title: '准备开始', description: '选择轮数后，点击测试区。等待它变成绿色再立即点击。', action: '开始挑战' },
  waiting: { eyebrow: `ROUND ${currentRound.value}`, title: '保持专注…', description: '颜色随时会变化，提前点击会记为抢跑。', action: '请等待' },
  active: { eyebrow: 'GO!', title: '现在点击', description: '尽快！', action: '点击' },
  tooEarly: { eyebrow: 'FALSE START', title: '抢跑了', description: '这一轮不计成绩，点击后重新等待。', action: '重试本轮' },
  roundResult: { eyebrow: `ROUND ${completedRounds.value}`, title: `${latestTime.value} ms`, description: latestTime.value === summary.value.best ? '本轮是当前最佳成绩' : `当前平均 ${summary.value.average} ms`, action: completedRounds.value >= targetRounds.value ? '查看总结' : '下一轮' },
  complete: { eyebrow: 'SESSION COMPLETE', title: summary.value.rating, description: `${targetRounds.value} 轮平均 ${summary.value.average} ms，稳定度 ${summary.value.consistency}%`, action: '再测一次' },
})[state.value])

function clearTimer() {
  if (timer) clearTimeout(timer)
  timer = null
}

function scheduleRound() {
  clearTimer()
  state.value = 'waiting'
  const delay = 1300 + Math.random() * 3000
  timer = setTimeout(() => {
    state.value = 'active'
    startedAt = performance.now()
  }, delay)
}

function startSession() {
  times.value = []
  latestTime.value = 0
  falseStarts.value = 0
  scheduleRound()
}

function handleAction() {
  if (state.value === 'intro' || state.value === 'complete') {
    startSession()
    return
  }
  if (state.value === 'waiting') {
    clearTimer()
    falseStarts.value += 1
    state.value = 'tooEarly'
    return
  }
  if (state.value === 'tooEarly') {
    scheduleRound()
    return
  }
  if (state.value === 'active') {
    latestTime.value = Math.max(0, Math.round(performance.now() - startedAt))
    times.value.push(latestTime.value)
    if (!personalBest.value || latestTime.value < personalBest.value) {
      personalBest.value = latestTime.value
      localStorage.setItem('reaction-personal-best', String(latestTime.value))
    }
    state.value = 'roundResult'
    return
  }
  if (state.value === 'roundResult') {
    if (completedRounds.value >= targetRounds.value) state.value = 'complete'
    else scheduleRound()
  }
}

function reset() {
  clearTimer()
  state.value = 'intro'
  times.value = []
  latestTime.value = 0
  falseStarts.value = 0
}

function changeRounds(rounds: number) {
  targetRounds.value = rounds
  reset()
}

function handleKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  if (target?.matches('input, textarea, select, button')) return
  if (event.code === 'Space' || event.code === 'Enter') {
    event.preventDefault()
    handleAction()
  }
}

function barWidth(time: number) {
  return `${Math.max(35, 100 - (time - summary.value.best) / chartRange.value * 55)}%`
}

onMounted(() => {
  const saved = Number(localStorage.getItem('reaction-personal-best'))
  if (Number.isFinite(saved) && saved > 0) personalBest.value = Math.round(saved)
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  clearTimer()
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="reaction-page flex flex-col mt-3 flex-1">
    <ToolHero legacy>

    <section class="hero-card">
      <div><span class="eyebrow">REACTION CHALLENGE</span><h2>不是点一次，而是一场完整测试</h2><p>多轮采样、抢跑检测、稳定度与个人最佳，让偶然的一次点击变成更可信的结果。</p></div>
      <div class="best-badge"><el-icon><Trophy /></el-icon><span>个人最佳<strong>{{ personalBest ? `${personalBest} ms` : '等待记录' }}</strong></span></div>
    </section>
    </ToolHero>

    <section class="session-bar">
      <div class="round-options"><span>测试轮数</span><button v-for="rounds in [3, 5, 10]" :key="rounds" :class="{ active: targetRounds === rounds }" :disabled="['waiting', 'active'].includes(state)" @click="changeRounds(rounds)">{{ rounds }} 轮</button></div>
      <div class="session-progress"><span>{{ completedRounds }} / {{ targetRounds }}</span><div><i :style="{ width: `${sessionProgress}%` }" /></div><small v-if="falseStarts">抢跑 {{ falseStarts }} 次</small></div>
    </section>

    <section class="challenge-grid">
      <article
        :class="['reaction-stage', `state-${state}`]"
        role="button"
        tabindex="0"
        :aria-label="stateContent.action"
        @pointerdown="handleAction"
      >
        <div class="stage-noise" />
        <div class="target-rings"><i /><i /><i /><el-icon><Aim /></el-icon></div>
        <div class="stage-content"><span>{{ stateContent.eyebrow }}</span><strong>{{ stateContent.title }}</strong><p>{{ stateContent.description }}</p><small>{{ stateContent.action }} · 也可按 Space / Enter</small></div>
      </article>

      <aside class="stats-card">
        <div class="section-heading"><div><span class="eyebrow">SESSION STATS</span><h3>本次表现</h3></div><el-button link :icon="Refresh" @click="reset">重置</el-button></div>
        <div v-if="summary.count" class="stat-grid"><div><span>最佳</span><strong>{{ summary.best }}<small>ms</small></strong></div><div><span>平均</span><strong>{{ summary.average }}<small>ms</small></strong></div><div><span>中位数</span><strong>{{ summary.median }}<small>ms</small></strong></div><div><span>稳定度</span><strong>{{ summary.consistency }}<small>%</small></strong></div></div>
        <div v-else class="empty-stats"><el-icon><Aim /></el-icon><strong>等待第一轮</strong><span>完成测试后查看平均值、中位数和稳定度</span></div>
        <div v-if="summary.count" class="rating-card"><span>当前评价</span><strong>{{ summary.rating }}</strong><small>最快与最慢相差 {{ summary.spread }} ms</small></div>
      </aside>
    </section>

    <section v-if="times.length" class="history-card">
      <div class="section-heading"><div><span class="eyebrow">ROUND HISTORY</span><h3>每轮成绩</h3></div><span>越快的条形越长</span></div>
      <div class="history-chart"><div v-for="(time, index) in times" :key="index"><span>#{{ index + 1 }}</span><div><i :class="{ best: time === summary.best }" :style="{ width: barWidth(time) }" /></div><strong>{{ time }} ms</strong></div></div>
    </section>

    <section class="tips-grid"><article><span>01</span><div><strong>保持相同姿势</strong><p>多轮测试尽量使用同一根手指或同一个鼠标按键。</p></div></article><article><span>02</span><div><strong>避免预判</strong><p>颜色变化前点击会被识别为抢跑，本轮不会计入结果。</p></div></article><article><span>03</span><div><strong>理解设备误差</strong><p>屏幕刷新率、浏览器调度和输入设备都会影响测量，仅供娱乐参考。</p></div></article></section>

    <ToolGuide title="使用说明"><el-text>开始后测试区会先进入等待状态，随机延迟后变成绿色。此时立即点击或按 Space / Enter。完成设定轮数后会计算最佳、平均、中位数和稳定度；个人最佳仅保存在当前浏览器中。</el-text></ToolGuide>
  </div>
</template>

<style scoped>
.reaction-page { --blue: #2563eb; gap: 16px; }.hero-card, .session-bar, .stats-card, .history-card, .tips-grid article { border: 1px solid #e2e8f0; border-radius: 22px; background: #fff; box-shadow: 0 12px 35px rgb(15 23 42 / 6%); }.hero-card { display: flex; align-items: center; justify-content: space-between; gap: 22px; padding: 25px 28px; background: radial-gradient(circle at 88% 10%, #dcfce7, transparent 28%), #fff; }.eyebrow { color: var(--blue); font-size:12px; font-weight: 800; letter-spacing: .15em; }.hero-card h2 { margin: 6px 0 4px; color: #0f172a; font-size: clamp(21px, 3vw, 28px); }.hero-card p { margin: 0; color: #64748b; font-size: 13px; }.best-badge { display: flex; align-items: center; gap: 9px; flex: none; padding: 10px 13px; border: 1px solid #fde68a; border-radius: 14px; color: #b45309; background: #fffbeb; }.best-badge > .el-icon { font-size: 23px; }.best-badge span { display: flex; flex-direction: column; font-size:12px; }.best-badge strong { font-size: 13px; }
.session-bar { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 13px 17px; }.round-options { display: flex; align-items: center; gap: 6px; }.round-options > span { margin-right: 4px; color: #64748b; font-size:12px; }.round-options button { padding: 6px 10px; border: 0; border-radius: 9px; color: #64748b; background: #f1f5f9; font-size:12px; cursor: pointer; }.round-options button.active { color: #fff; background: #2563eb; }.round-options button:disabled { cursor: not-allowed; opacity: .5; }.session-progress { display: grid; grid-template-columns: auto 150px auto; align-items: center; gap: 8px; color: #64748b; font-size:12px; }.session-progress > div { height: 6px; overflow: hidden; border-radius: 99px; background: #e2e8f0; }.session-progress i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #3b82f6, #22c55e); transition: width .3s ease; }.session-progress small { color: #ef4444; }
.challenge-grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(280px, .65fr); align-items: stretch; gap: 16px; }.reaction-stage { position: relative; display: flex; min-height: 450px; align-items: center; justify-content: center; overflow: hidden; border: 0; border-radius: 24px; color: #fff; background: linear-gradient(145deg, #1d4ed8, #3b82f6); box-shadow: 0 18px 45px rgb(37 99 235 / 23%); outline: none; cursor: pointer; transition: background .16s ease, transform .16s ease; user-select: none; -webkit-tap-highlight-color: transparent; }.reaction-stage:focus-visible { box-shadow: 0 0 0 4px #bfdbfe, 0 18px 45px rgb(37 99 235 / 23%); }.reaction-stage:active { transform: scale(.995); }.state-waiting { color: #422006; background: linear-gradient(145deg, #facc15, #f59e0b); box-shadow: 0 18px 45px rgb(245 158 11 / 24%); }.state-active { background: linear-gradient(145deg, #16a34a, #22c55e); box-shadow: 0 18px 45px rgb(34 197 94 / 25%); }.state-tooEarly { background: linear-gradient(145deg, #dc2626, #f43f5e); box-shadow: 0 18px 45px rgb(244 63 94 / 24%); }.state-roundResult { background: linear-gradient(145deg, #6d28d9, #8b5cf6); }.state-complete { background: linear-gradient(145deg, #0f766e, #14b8a6); }.stage-noise { position: absolute; inset: 0; opacity: .14; background-image: radial-gradient(circle at 20% 25%, #fff 0 1px, transparent 1.5px), radial-gradient(circle at 75% 70%, #fff 0 1px, transparent 1.5px); background-size: 31px 31px, 43px 43px; }.target-rings { position: absolute; display: grid; width: 270px; height: 270px; place-items: center; opacity: .16; }.target-rings i { position: absolute; inset: 0; border: 2px solid currentColor; border-radius: 50%; }.target-rings i:nth-child(2) { inset: 42px; }.target-rings i:nth-child(3) { inset: 84px; }.target-rings > .el-icon { font-size: 32px; }.state-active .target-rings { animation: pulse 1s ease infinite; opacity: .28; }.stage-content { position: relative; display: flex; z-index: 1; align-items: center; flex-direction: column; padding: 30px; text-align: center; }.stage-content > span { font-size:12px; font-weight: 900; letter-spacing: .2em; opacity: .8; }.stage-content > strong { margin-top: 7px; font-size: clamp(34px, 6vw, 57px); line-height: 1.1; }.stage-content p { margin: 10px 0 24px; font-size: 13px; opacity: .85; }.stage-content small { padding: 6px 10px; border: 1px solid rgb(255 255 255 / 28%); border-radius: 99px; font-size:12px; opacity: .8; }
.stats-card, .history-card { padding: 21px; }.section-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }.section-heading h3 { margin: 3px 0 0; color: #0f172a; font-size: 16px; }.section-heading > span { color: #94a3b8; font-size:12px; }.stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 17px; }.stat-grid > div { display: flex; min-height: 85px; justify-content: center; flex-direction: column; padding: 12px; border-radius: 13px; background: #f8fafc; }.stat-grid span { color: #94a3b8; font-size:12px; }.stat-grid strong { margin-top: 3px; color: #334155; font-size: 22px; }.stat-grid small { margin-left: 3px; color: #94a3b8; font-size:12px; }.empty-stats { display: flex; min-height: 290px; align-items: center; justify-content: center; flex-direction: column; color: #94a3b8; text-align: center; }.empty-stats > .el-icon { font-size: 35px; }.empty-stats strong { margin-top: 9px; color: #64748b; }.empty-stats span { max-width: 180px; margin-top: 3px; font-size:12px; }.rating-card { display: flex; flex-direction: column; margin-top: 8px; padding: 13px; border-radius: 13px; color: #fff; background: linear-gradient(135deg, #2563eb, #7c3aed); }.rating-card span, .rating-card small { font-size:12px; opacity: .8; }.rating-card strong { font-size: 17px; }
.history-chart { display: flex; flex-direction: column; gap: 8px; margin-top: 17px; }.history-chart > div { display: grid; grid-template-columns: 28px minmax(0, 1fr) 55px; align-items: center; gap: 8px; }.history-chart span { color: #94a3b8; font: 12px ui-monospace, monospace; }.history-chart > div > div { height: 20px; overflow: hidden; border-radius: 6px; background: #f1f5f9; }.history-chart i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #93c5fd, #3b82f6); transition: width .25s ease; }.history-chart i.best { background: linear-gradient(90deg, #86efac, #22c55e); }.history-chart strong { color: #475569; font: 12px ui-monospace, monospace; text-align: right; }.tips-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; }.tips-grid article { display: flex; gap: 10px; padding: 14px; border-radius: 15px; }.tips-grid article > span { display: grid; width: 31px; height: 31px; flex: none; place-items: center; border-radius: 9px; color: #2563eb; background: #dbeafe; font: 800 12px ui-monospace, monospace; }.tips-grid strong { color: #334155; font-size:12px; }.tips-grid p { margin: 3px 0 0; color: #64748b; font-size:12px; line-height: 1.55; }
:global(html.dark .reaction-page .hero-card), :global(html.dark .reaction-page .session-bar), :global(html.dark .reaction-page .stats-card), :global(html.dark .reaction-page .history-card), :global(html.dark .reaction-page .tips-grid article) { border-color: #334155; background: #1e293b; box-shadow: none; }:global(html.dark .reaction-page .hero-card) { background: radial-gradient(circle at 88% 10%, #14532d, transparent 28%), #1e293b; }:global(html.dark .reaction-page h2), :global(html.dark .reaction-page h3), :global(html.dark .reaction-page .stat-grid strong), :global(html.dark .reaction-page .tips-grid strong) { color: #f8fafc; }:global(html.dark .reaction-page .round-options button), :global(html.dark .reaction-page .stat-grid > div), :global(html.dark .reaction-page .history-chart > div > div) { color: #cbd5e1; background: #0f172a; }:global(html.dark .reaction-page .round-options button.active) { color: #fff; background: #2563eb; }:global(html.dark .reaction-page .best-badge) { border-color: #92400e; color: #fcd34d; background: #451a03; }
@keyframes pulse { 50% { transform: scale(1.08); opacity: .45; } }
@media (max-width: 900px) { .challenge-grid { grid-template-columns: 1fr; }.reaction-stage { min-height: 390px; } }
@media (max-width: 640px) { .hero-card { align-items: flex-start; flex-direction: column; padding: 21px; }.session-bar { align-items: flex-start; flex-direction: column; }.session-progress { width: 100%; grid-template-columns: auto minmax(0, 1fr) auto; }.reaction-stage { min-height: 360px; }.stats-card, .history-card { padding: 17px; border-radius: 19px; }.tips-grid { grid-template-columns: 1fr; } }
</style>
