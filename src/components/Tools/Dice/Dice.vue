<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Clock, CopyDocument, Delete, MagicStick, RefreshRight, SetUp, TrendCharts } from '@element-plus/icons-vue'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import SectionHeading from '@/components/Common/SectionHeading.vue'
import DiceCore from '@/components/Tools/Dice/DiceCore.vue'
import { copy } from '@/utils/string'

interface DiceInstance {
  throwDice: () => Promise<void>
}

interface RollHistory {
  id: number
  values: number[]
  modifier: number
  total: number
}

const diceCount = ref(2)
const modifier = ref(0)
const rolling = ref(false)
const diceRefs = ref<DiceInstance[]>([])
const resetKey = ref(0)
const diceResults = ref<number[]>([1, 1])
const history = ref<RollHistory[]>([])

const rawTotal = computed(() => diceResults.value.reduce((sum, value) => sum + value, 0))
const finalTotal = computed(() => rawTotal.value + Number(modifier.value))
const average = computed(() => rawTotal.value / diceResults.value.length)

watch(diceCount, () => resetDice())

function handleResult(index: number, point: number) {
  diceResults.value[index] = point
  diceResults.value = [...diceResults.value]
  if (!rolling.value) recordRoll()
}

function recordRoll() {
  history.value = [{
    id: Date.now(),
    values: [...diceResults.value],
    modifier: Number(modifier.value),
    total: finalTotal.value,
  }, ...history.value].slice(0, 8)
}

async function rollAll() {
  if (rolling.value) return
  rolling.value = true
  try {
    await Promise.all((diceRefs.value ?? []).map(die => die.throwDice()))
    recordRoll()
  } finally {
    rolling.value = false
  }
}

function resetDice() {
  resetKey.value += 1
  diceResults.value = Array.from({ length: Number(diceCount.value) }, () => 1)
}

function usePreset(count: number) {
  diceCount.value = count
}

function copyCurrent() {
  copy(`骰子：${diceResults.value.join(' + ')}\n点数合计：${rawTotal.value}\n修正值：${modifier.value >= 0 ? '+' : ''}${modifier.value}\n最终结果：${finalTotal.value}`)
}
</script>

<template>
  <div class="dice-page flex flex-col mt-3 flex-1">
    <ToolHero />

    <section class="workspace-card">
      <SectionHeading :icon="SetUp" title="设置骰子组合" description="支持 1～6 颗六面骰，并可添加结果修正值" tone="blue">
        <template #actions>
          <div class="preset-row">
            <span>快捷数量</span>
            <button v-for="count in [1, 2, 3, 5, 6]" :key="count" type="button" :class="{ active: diceCount === count }" @click="usePreset(count)">
              {{ count }} 颗
            </button>
          </div>
        </template>
      </SectionHeading>

      <div class="control-row">
        <label>
          <span>骰子数量</span>
          <el-input-number v-model="diceCount" :min="1" :max="6" controls-position="right" />
        </label>
        <label>
          <span>结果修正值</span>
          <el-input-number v-model="modifier" :min="-100" :max="100" controls-position="right" />
        </label>
        <div class="control-note">例如角色属性 +3，可在骰子点数合计后自动加上修正值。</div>
      </div>
    </section>

    <section class="dice-board">
      <span class="eyebrow">ROLL THE DICE</span>
      <div class="dice-grid" :class="`count-${diceCount}`">
        <div v-for="index in diceCount" :key="`${resetKey}-${index}`" class="die-shell">
          <span>{{ index }}</span>
          <DiceCore
            ref="diceRefs"
            @throw-end="point => handleResult(index - 1, point)"
          />
          <strong>{{ diceResults[index - 1] }} 点</strong>
        </div>
      </div>
      <p>点击单颗骰子可只重掷该颗</p>
      <div class="board-actions">
        <el-button type="primary" size="large" :icon="MagicStick" :loading="rolling" @click="rollAll">
          {{ rolling ? '骰子滚动中' : '投掷全部骰子' }}
        </el-button>
        <el-button size="large" :icon="RefreshRight" :disabled="rolling" @click="resetDice">重置为 1</el-button>
      </div>
    </section>

    <section class="result-card">
      <div class="result-summary">
        <div class="total-block">
          <span>最终结果</span>
          <strong>{{ finalTotal }}</strong>
          <small>{{ diceResults.join(' + ') }}{{ modifier ? ` ${modifier > 0 ? '+' : '-'} ${Math.abs(modifier)}` : '' }}</small>
        </div>
        <div class="result-metrics">
          <div><span>骰面合计</span><b>{{ rawTotal }}</b></div>
          <div><span>平均点数</span><b>{{ average.toFixed(1) }}</b></div>
          <div><span>最高点</span><b>{{ Math.max(...diceResults) }}</b></div>
          <div><span>最低点</span><b>{{ Math.min(...diceResults) }}</b></div>
        </div>
        <el-button :icon="CopyDocument" @click="copyCurrent">复制本次结果</el-button>
      </div>

      <div class="history-section">
        <SectionHeading :icon="Clock" title="投掷历史" description="保留最近 8 组结果" tone="green">
          <template #actions>
            <el-button text :icon="Delete" :disabled="!history.length" @click="history = []">清空历史</el-button>
          </template>
        </SectionHeading>
        <div v-if="history.length" class="history-list">
          <button v-for="item in history" :key="item.id" type="button" @click="copy(item.values.join(', '))">
            <span class="history-total">{{ item.total }}</span>
            <div><strong>{{ item.values.join(' · ') }}</strong><small>骰面 {{ item.values.reduce((sum, value) => sum + value, 0) }}{{ item.modifier ? `，修正 ${item.modifier > 0 ? '+' : ''}${item.modifier}` : '' }}</small></div>
            <el-icon><CopyDocument /></el-icon>
          </button>
        </div>
        <div v-else class="empty-history"><el-icon><TrendCharts /></el-icon><span>完成投掷后会生成历史记录</span></div>
      </div>
    </section>

    <ToolGuide title="使用提示">
      <div class="guide-grid">
        <div><strong>点击单颗重新投掷</strong><span>只想替换其中一个结果时，可以直接点击对应骰子，无需重投全部。</span></div>
        <div><strong>修正值自动计入总分</strong><span>适合桌游、跑团或属性检定，支持 -100 到 +100 的整数修正。</span></div>
        <div><strong>安全随机点数</strong><span>每颗骰子使用浏览器 Crypto API 独立生成 1～6 的均匀随机整数。</span></div>
      </div>
    </ToolGuide>
  </div>
</template>

<style scoped>
.dice-page {
  gap: 18px;
}
.workspace-card {
  padding: 24px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-card);
  background: var(--c-surface);
  box-shadow: var(--shadow-card);
}
.control-row, .result-summary {
  display: flex;
  align-items: center;
}
.preset-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.preset-row > span {
  margin-right: 4px;
  color: var(--c-text-secondary);
  font-size: 11px;
}
.preset-row button {
  padding: 6px 10px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-full);
  color: var(--c-text-secondary);
  background: var(--c-surface-subtle);
  font-size: 11px;
}
.preset-row button.active {
  border-color: var(--c-primary-300);
  color: var(--c-primary-700);
  background: var(--c-primary-50);
}
.control-row {
  gap: 14px;
  margin-top: 20px;
  padding: 15px;
  border-radius: var(--radius-md);
  background: var(--c-surface-subtle);
}
.control-row label {
  width: 160px;
}
.control-row label > span {
  display: block;
  margin-bottom: 7px;
  color: var(--c-text-body);
  font-size: 12px;
  font-weight: 650;
}
.control-row :deep(.el-input-number) {
  width: 100%;
}
.control-note {
  flex: 1;
  color: var(--c-text-muted);
  font-size: 11px;
  line-height: 1.6;
}
.dice-board {
  display: flex;
  min-height: 390px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: radial-gradient(circle at 50% 45%, var(--c-primary-50), #fff 64%);
}
.eyebrow {
  color: var(--c-primary);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .22em;
}
.dice-grid {
  display: grid;
  grid-template-columns: repeat(3, 150px);
  justify-content: center;
  gap: 16px;
  margin-top: 20px;
}
.dice-grid.count-1 {
  grid-template-columns: 170px;
}
.dice-grid.count-2 {
  grid-template-columns: repeat(2, 170px);
}
.die-shell {
  position: relative;
  display: flex;
  min-height: 145px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--c-primary-100);
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, .78);
  transition: .2s ease;
}
.die-shell:hover {
  border-color: var(--c-primary-400);
  transform: translateY(-2px);
  box-shadow: 0 10px 24px color-mix(in srgb, var(--c-primary) 10%, transparent);
}
.die-shell > span {
  position: absolute;
  top: 9px;
  left: 11px;
  display: grid;
  width: 21px;
  height: 21px;
  place-items: center;
  border-radius: var(--radius-xs);
  color: var(--c-primary);
  background: var(--c-primary-100);
  font-size: 9px;
  font-weight: 700;
}
.die-shell > strong {
  margin-top: 5px;
  color: var(--c-text-strong);
  font-size: 11px;
}
.dice-board > p {
  margin: 14px 0 0;
  color: var(--c-text-muted);
  font-size: 11px;
}
.board-actions {
  display: flex;
  margin-top: 15px;
}
.board-actions .el-button:first-child {
  min-width: 190px;
}
.result-card {
  padding: 0;
  overflow: hidden;
}
.result-summary {
  gap: 24px;
  padding: 22px 24px;
}
.total-block {
  min-width: 170px;
  padding-right: 24px;
  border-right: 1px solid var(--c-border);
}
.total-block span, .total-block strong, .total-block small {
  display: block;
}
.total-block span {
  color: var(--c-text-secondary);
  font-size: 11px;
}
.total-block strong {
  margin-top: 3px;
  color: var(--c-primary);
  font-size: 42px;
  line-height: 1;
}
.total-block small {
  margin-top: 7px;
  color: var(--c-text-muted);
  font-size: 10px;
}
.result-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(90px, 1fr));
  flex: 1;
  gap: 8px;
}
.result-metrics div {
  padding: 11px 13px;
  border-radius: var(--radius-sm);
  background: var(--c-surface-subtle);
}
.result-metrics span, .result-metrics b {
  display: block;
}
.result-metrics span {
  color: var(--c-text-muted);
  font-size: 10px;
}
.result-metrics b {
  margin-top: 3px;
  color: var(--c-text-strong);
  font-size: 17px;
}
.history-section {
  padding: 20px 24px 24px;
  border-top: 1px solid var(--c-border);
}
.history-list {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 9px;
  margin-top: 16px;
}
.history-list button {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) 18px;
  align-items: center;
  gap: 9px;
  padding: 11px;
  border-radius: var(--radius-md);
  color: var(--c-text-muted);
  background: var(--c-surface-subtle);
  text-align: left;
}
.history-list button:hover {
  color: var(--c-primary);
  background: var(--c-primary-50);
}
.history-total {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: var(--radius-sm);
  color: var(--c-primary-700);
  background: var(--c-primary-100);
  font-size: 17px;
  font-weight: 800;
}
.history-list strong, .history-list small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.history-list strong {
  color: var(--c-text-strong);
  font-size: 12px;
}
.history-list small {
  margin-top: 3px;
  color: var(--c-text-muted);
  font-size: 9px;
}
.empty-history {
  display: flex;
  min-height: 82px;
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
:global(html.dark .dice-page .workspace-card), :global(html.dark .dice-page .dice-board), :global(html.dark .dice-page .result-card) {
  border-color: var(--c-border);
  background: var(--c-surface);
  box-shadow: none;
}
:global(html.dark .dice-page .dice-board) {
  background: radial-gradient(circle at 50% 45%, rgba(30, 64, 175, .22), #1e293b 66%);
}
:global(html.dark .dice-page .control-row label > span), :global(html.dark .dice-page .die-shell > strong), :global(html.dark .dice-page .result-metrics b), :global(html.dark .dice-page .history-list strong), :global(html.dark .dice-page .guide-grid strong) {
  color: var(--c-text-primary);
}
:global(html.dark .dice-page .control-row), :global(html.dark .dice-page .result-metrics div), :global(html.dark .dice-page .history-list button), :global(html.dark .dice-page .guide-grid div) {
  background: var(--c-surface-subtle);
}
:global(html.dark .dice-page .die-shell) {
  border-color: var(--c-border);
  background: rgba(15, 23, 42, .8);
}
:global(html.dark .dice-page .total-block), :global(html.dark .dice-page .history-section) {
  border-color: var(--c-border);
}
@media (max-width: 900px) {
  .dice-grid {
    grid-template-columns: repeat(3, 135px);
  }
  .result-summary {
    align-items: stretch;
    flex-direction: column;
  }
  .total-block {
    border-right: 0;
    border-bottom: 1px solid var(--c-border);
    padding: 0 0 18px;
  }
  .history-list {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 640px) {
  .workspace-card, .dice-board {
    padding: 18px;
  }
  .preset-row {
    flex-wrap: wrap;
  }
  .control-row {
    align-items: stretch;
    flex-direction: column;
  }
  .control-row label {
    width: 100%;
  }
  .dice-grid, .dice-grid.count-2 {
    grid-template-columns: repeat(2, 130px);
  }
  .dice-grid.count-1 {
    grid-template-columns: 150px;
  }
  .board-actions {
    width: 100%;
    flex-direction: column;
    gap: 8px;
  }
  .board-actions .el-button {
    width: 100%;
    margin: 0;
  }
  .result-metrics {
    grid-template-columns: repeat(2, 1fr);
  }
  .history-list, .guide-grid {
    grid-template-columns: 1fr;
  }
}
</style>
