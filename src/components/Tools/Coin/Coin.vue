<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { Aim, Clock, Delete, MagicStick, Setting, TrendCharts } from '@element-plus/icons-vue'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import SectionHeading from '@/components/Common/SectionHeading.vue'
import { secureRandomInt } from '@/utils/random'

type CoinFace = 'heads' | 'tails'

interface TossRecord {
  id: number
  face: CoinFace
}

const headsLabel = ref('正面')
const tailsLabel = ref('反面')
const tossCount = ref(1)
const currentFace = ref<CoinFace>('heads')
const hasResult = ref(false)
const flipping = ref(false)
const records = ref<TossRecord[]>([])
let finishTimer: ReturnType<typeof setTimeout> | null = null

const currentLabel = computed(() => currentFace.value === 'heads' ? headsLabel.value || '正面' : tailsLabel.value || '反面')
const headsCount = computed(() => records.value.filter(record => record.face === 'heads').length)
const tailsCount = computed(() => records.value.length - headsCount.value)
const headsRate = computed(() => records.value.length ? headsCount.value / records.value.length * 100 : 0)

function toss() {
  if (flipping.value) return
  const batch = Array.from({ length: Number(tossCount.value) }, () => secureRandomInt(0, 1) === 0 ? 'heads' as const : 'tails' as const)
  currentFace.value = batch[batch.length - 1]
  flipping.value = true
  hasResult.value = false

  finishTimer = setTimeout(() => {
    const timestamp = Date.now()
    records.value = [
      ...batch.map((face, index) => ({ id: timestamp + index, face })).reverse(),
      ...records.value,
    ].slice(0, 40)
    hasResult.value = true
    flipping.value = false
    finishTimer = null
  }, 900)
}

function clearRecords() {
  records.value = []
  hasResult.value = false
}

onBeforeUnmount(() => {
  if (finishTimer) clearTimeout(finishTimer)
})
</script>

<template>
  <div class="coin-page flex flex-col mt-3 flex-1">
    <ToolHero />

    <div class="workspace-grid">
      <section class="settings-card">
        <SectionHeading :icon="Setting" title="设置硬币两面" description="可以把正反面改成两个待选方案" tone="amber" />

        <div class="label-grid">
          <label>
            <span><i class="dot heads" />正面代表</span>
            <el-input v-model="headsLabel" size="large" maxlength="12" show-word-limit placeholder="例如：去" />
          </label>
          <label>
            <span><i class="dot tails" />反面代表</span>
            <el-input v-model="tailsLabel" size="large" maxlength="12" show-word-limit placeholder="例如：不去" />
          </label>
        </div>

        <label class="count-field">
          <span>连续抛掷次数</span>
          <el-radio-group v-model="tossCount">
            <el-radio-button :value="1">1 次</el-radio-button>
            <el-radio-button :value="3">3 次</el-radio-button>
            <el-radio-button :value="5">5 次</el-radio-button>
            <el-radio-button :value="10">10 次</el-radio-button>
          </el-radio-group>
        </label>

        <div class="fairness-note">
          <el-icon><Aim /></el-icon>
          <div><strong>每次均为独立随机事件</strong><span>使用浏览器 Crypto API，正反面理论概率各为 50%。</span></div>
        </div>
      </section>

      <section class="toss-card">
        <span class="eyebrow">FLIP A COIN</span>
        <div class="coin-stage" :class="[currentFace, { flipping }]">
          <div class="coin-object">
            <div class="coin-face coin-front"><span>{{ headsLabel || '正面' }}</span></div>
            <div class="coin-face coin-back"><span>{{ tailsLabel || '反面' }}</span></div>
          </div>
        </div>
        <div class="result-copy">
          <strong v-if="hasResult">{{ currentLabel }}</strong>
          <strong v-else-if="flipping">抛掷中…</strong>
          <strong v-else>准备抛掷</strong>
          <span>{{ tossCount === 1 ? '本次结果' : `连续抛 ${tossCount} 次，硬币显示最后一次结果` }}</span>
        </div>
        <el-button type="primary" size="large" :icon="MagicStick" :loading="flipping" @click="toss">
          {{ flipping ? '硬币旋转中' : '抛硬币' }}
        </el-button>
      </section>
    </div>

    <section class="statistics-card">
      <SectionHeading :icon="TrendCharts" title="本次统计" description="最多保留最近 40 次抛掷结果" tone="green">
        <template #actions>
          <el-button text :icon="Delete" :disabled="!records.length" @click="clearRecords">清空记录</el-button>
        </template>
      </SectionHeading>

      <div class="stats-grid">
        <div><span>累计抛掷</span><strong>{{ records.length }}</strong><small>次</small></div>
        <div class="heads-stat"><span>{{ headsLabel || '正面' }}</span><strong>{{ headsCount }}</strong><small>{{ headsRate.toFixed(1) }}%</small></div>
        <div class="tails-stat"><span>{{ tailsLabel || '反面' }}</span><strong>{{ tailsCount }}</strong><small>{{ (records.length ? 100 - headsRate : 0).toFixed(1) }}%</small></div>
      </div>

      <div class="distribution-track" :class="{ empty: !records.length }">
        <i class="heads-bar" :style="{ width: `${records.length ? headsRate : 50}%` }" />
        <i class="tails-bar" :style="{ width: `${records.length ? 100 - headsRate : 50}%` }" />
      </div>

      <div class="history-header"><span>最近结果</span><small>从左到右由新到旧</small></div>
      <div v-if="records.length" class="history-list">
        <span v-for="record in records" :key="record.id" :class="record.face">
          {{ record.face === 'heads' ? (headsLabel || '正面') : (tailsLabel || '反面') }}
        </span>
      </div>
      <div v-else class="empty-history"><el-icon><Clock /></el-icon><span>抛掷后会在这里记录结果</span></div>
    </section>

    <ToolGuide title="概率说明">
      <div class="guide-grid">
        <div><strong>短期结果可能不均衡</strong><span>连续几次都是同一面属于正常随机现象，并不表示概率异常。</span></div>
        <div><strong>自定义选择方案</strong><span>将两面名称改成“方案 A / 方案 B”或“去 / 不去”，结果会同步显示。</span></div>
        <div><strong>批量抛掷观察分布</strong><span>选择 5 次或 10 次可以快速累积样本，并查看两面的实际占比。</span></div>
      </div>
    </ToolGuide>
  </div>
</template>

<style scoped>
.coin-page {
  gap: 18px;
}
.workspace-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(330px, .8fr);
  gap: 18px;
}
.settings-card, .toss-card, .statistics-card {
  padding: 24px
}
.fairness-note {
  display: flex;
  align-items: center;
}
.label-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 22px;
}
.label-grid label > span, .count-field > span {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  color: var(--c-text-body);
  font-size: 12px;
  font-weight: 650;
}
.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
.dot.heads {
  background: #f59e0b;
}
.dot.tails {
  background: #8b5cf6;
}
.count-field {
  display: block;
  margin-top: 18px;
}
.count-field :deep(.el-radio-group) {
  width: 100%;
}
.count-field :deep(.el-radio-button) {
  flex: 1;
}
.count-field :deep(.el-radio-button__inner) {
  width: 100%;
}
.fairness-note {
  gap: 10px;
  margin-top: 18px;
  padding: 14px;
  border-radius: var(--radius-md);
  color: #059669;
  background: #ecfdf5;
}
.fairness-note .el-icon {
  font-size: 20px;
}
.fairness-note strong, .fairness-note span {
  display: block;
}
.fairness-note strong {
  font-size: 12px;
}
.fairness-note span {
  margin-top: 3px;
  color: var(--c-text-secondary);
  font-size: 11px;
}
.toss-card {
  display: flex;
  min-height: 390px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: radial-gradient(circle at 50% 40%, #fffbeb, #fff 62%);
}
.eyebrow {
  color: #d97706;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .22em;
}
.coin-stage {
  width: 132px;
  height: 132px;
  margin-top: 18px;
  perspective: 800px;
}
.coin-object {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform .35s ease;
}
.coin-stage.tails:not(.flipping) .coin-object {
  transform: rotateY(180deg);
}
.coin-stage.flipping.heads .coin-object {
  animation: flip-head .9s cubic-bezier(.2, .7, .25, 1) both;
}
.coin-stage.flipping.tails .coin-object {
  animation: flip-tail .9s cubic-bezier(.2, .7, .25, 1) both;
}
.coin-face {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 8px solid #fbbf24;
  border-radius: 50%;
  backface-visibility: hidden;
  color: #92400e;
  background: radial-gradient(circle at 35% 25%, #fef3c7, #fbbf24 48%, #d97706 100%);
  box-shadow: inset 0 0 0 4px #fde68a, 0 17px 35px rgba(217, 119, 6, .25);
}
.coin-face::before {
  position: absolute;
  inset: 12px;
  border: 2px dashed rgba(146, 64, 14, .35);
  border-radius: 50%;
  content: '';
}
.coin-face span {
  z-index: 1;
  max-width: 80px;
  overflow: hidden;
  font-size: 21px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.coin-back {
  color: #5b21b6;
  background: radial-gradient(circle at 35% 25%, #f5f3ff, #c4b5fd 48%, #7c3aed 100%);
  border-color: #8b5cf6;
  transform: rotateY(180deg);
  box-shadow: inset 0 0 0 4px #ddd6fe, 0 17px 35px rgba(124, 58, 237, .24);
}
@keyframes flip-head {
  from {
    transform: rotateY(0) translateY(0);
  }
  45% {
    transform: rotateY(900deg) translateY(-38px) scale(1.08);
  }
  to {
    transform: rotateY(1800deg) translateY(0);
  }
}
@keyframes flip-tail {
  from {
    transform: rotateY(0) translateY(0);
  }
  45% {
    transform: rotateY(990deg) translateY(-38px) scale(1.08);
  }
  to {
    transform: rotateY(1980deg) translateY(0);
  }
}
.result-copy {
  min-height: 73px;
  margin-top: 18px;
  text-align: center;
}
.result-copy strong, .result-copy span {
  display: block;
}
.result-copy strong {
  color: var(--c-text-primary);
  font-size: 28px;
}
.result-copy span {
  margin-top: 4px;
  color: var(--c-text-muted);
  font-size: 11px;
}
.toss-card > .el-button {
  width: 190px;
  margin-top: 10px;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 20px;
}
.stats-grid > div {
  padding: 14px 16px;
  border-radius: var(--radius-md);
  background: var(--c-surface-subtle);
}
.stats-grid span, .stats-grid strong, .stats-grid small {
  display: block;
}
.stats-grid span {
  color: var(--c-text-secondary);
  font-size: 11px;
}
.stats-grid strong {
  margin-top: 4px;
  color: var(--c-text-strong);
  font-size: 22px;
}
.stats-grid small {
  margin-top: 2px;
  color: var(--c-text-muted);
  font-size: 10px;
}
.stats-grid .heads-stat strong {
  color: #d97706;
}
.stats-grid .tails-stat strong {
  color: #7c3aed;
}
.distribution-track {
  display: flex;
  height: 8px;
  margin-top: 14px;
  overflow: hidden;
  border-radius: var(--radius-full);
}
.distribution-track i {
  height: 100%;
  transition: width .3s ease;
}
.heads-bar {
  background: #f59e0b;
}
.tails-bar {
  background: #8b5cf6;
}
.distribution-track.empty {
  opacity: .35;
}
.history-header {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
  color: var(--c-text-secondary);
  font-size: 11px;
}
.history-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 10px;
}
.history-list span {
  max-width: 120px;
  overflow: hidden;
  padding: 5px 9px;
  border-radius: var(--radius-xs);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.history-list .heads {
  color: #92400e;
  background: #fef3c7;
}
.history-list .tails {
  color: #5b21b6;
  background: #ede9fe;
}
.empty-history {
  display: flex;
  min-height: 65px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  color: var(--c-text-muted);
  font-size: 11px;
}
.guide-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.guide-grid div {
  padding: 14px;
  border-radius: var(--radius-md);
  background: var(--c-surface-subtle);
}
.guide-grid strong, .guide-grid span {
  display: block;
}
.guide-grid strong {
  color: var(--c-text-strong);
  font-size: 13px;
}
.guide-grid span {
  margin-top: 5px;
  color: var(--c-text-secondary);
  font-size: 12px;
  line-height: 1.65;
}
:global(html.dark .coin-page .settings-card), :global(html.dark .coin-page .toss-card), :global(html.dark .coin-page .statistics-card) {
  border-color: var(--c-border);
  background: var(--c-surface);
  box-shadow: none;
}
:global(html.dark .coin-page .toss-card) {
  background: radial-gradient(circle at 50% 40%, rgba(120, 53, 15, .25), #1e293b 65%);
}
:global(html.dark .coin-page .label-grid label > span), :global(html.dark .coin-page .count-field > span), :global(html.dark .coin-page .result-copy strong), :global(html.dark .coin-page .stats-grid strong), :global(html.dark .coin-page .guide-grid strong) {
  color: var(--c-text-primary);
}
:global(html.dark .coin-page .stats-grid > div), :global(html.dark .coin-page .guide-grid div) {
  background: var(--c-surface-subtle);
}
:global(html.dark .coin-page .fairness-note) {
  background: rgba(6, 78, 59, .25);
}
@media (max-width: 860px) {
  .workspace-grid {
    grid-template-columns: 1fr;
  }
  .toss-card {
    min-height: 410px;
  }
}
@media (max-width: 640px) {
  .settings-card, .toss-card, .statistics-card {
    padding: 18px;
  }
  .label-grid, .stats-grid, .guide-grid {
    grid-template-columns: 1fr;
  }
}
</style>
