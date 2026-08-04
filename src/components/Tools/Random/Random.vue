<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { CopyDocument, DataAnalysis, MagicStick, RefreshRight, SetUp } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import { generateRandomIntegers } from '@/utils/generators'
import { copy } from '@/utils/string'

interface HistoryItem {
  id: number
  range: string
  values: number[]
}

const title = '随机数生成器'
const minimum = ref(1)
const maximum = ref(100)
const count = ref(1)
const unique = ref(false)
const results = ref<number[]>([])
const history = ref<HistoryItem[]>([])
const generationId = ref(0)

const presets = [
  { label: '百分制', min: 1, max: 100, count: 1 },
  { label: '掷骰子', min: 1, max: 6, count: 1 },
  { label: '二选一', min: 0, max: 1, count: 1 },
  { label: '正负 100', min: -100, max: 100, count: 5 },
]

const summary = computed(() => {
  if (!results.value.length) return null
  const total = results.value.reduce((sum, value) => sum + value, 0)
  return {
    minimum: Math.min(...results.value),
    maximum: Math.max(...results.value),
    average: total / results.value.length,
  }
})

function formatNumber(value: number) {
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(value)
}

function generate() {
  try {
    const values = generateRandomIntegers(
      Number(minimum.value),
      Number(maximum.value),
      Number(count.value),
      unique.value,
    )
    results.value = values
    generationId.value += 1
    history.value = [
      { id: Date.now(), range: `${minimum.value} ～ ${maximum.value}`, values },
      ...history.value,
    ].slice(0, 5)
  } catch (error) {
    const message = error instanceof RangeError && error.message.includes('Unique')
      ? '不重复数量不能超过可选数字总数'
      : error instanceof RangeError && error.message.includes('too large')
        ? '起止范围过大，请将跨度控制在 2³² 以内'
        : '请输入有效整数，数量范围为 1～100'
    ElMessage.warning(message)
  }
}

function applyPreset(preset: typeof presets[number]) {
  minimum.value = preset.min
  maximum.value = preset.max
  count.value = preset.count
  unique.value = false
  generate()
}

function copyResults(values = results.value) {
  copy(values.join('\n'))
}

onMounted(generate)
</script>

<template>
  <div class="random-page flex flex-col mt-3 flex-1">
    <ToolHero :title="title" />

    <section class="workspace-card">
      <div class="section-heading">
        <div class="heading-icon"><el-icon><SetUp /></el-icon></div>
        <div>
          <h2>设置随机范围</h2>
          <p>支持负整数、批量生成与不重复抽取</p>
        </div>
      </div>

      <div class="preset-row">
        <span>快捷场景</span>
        <button v-for="preset in presets" :key="preset.label" type="button" @click="applyPreset(preset)">
          {{ preset.label }}
        </button>
      </div>

      <div class="control-grid">
        <label>
          <span>最小值</span>
          <el-input-number v-model="minimum" :min="-2147483648" :max="2147483647" controls-position="right" />
        </label>
        <div class="range-arrow">→</div>
        <label>
          <span>最大值</span>
          <el-input-number v-model="maximum" :min="-2147483648" :max="2147483647" controls-position="right" />
        </label>
        <label>
          <span>生成数量</span>
          <el-input-number v-model="count" :min="1" :max="100" controls-position="right" />
        </label>
        <div class="unique-control">
          <div><strong>结果不重复</strong><small>适合抽签与点名</small></div>
          <el-switch v-model="unique" />
        </div>
        <el-button type="primary" size="large" :icon="MagicStick" @click="generate">立即生成</el-button>
      </div>
    </section>

    <section class="result-card">
      <div class="result-header">
        <div class="section-heading">
          <div class="heading-icon green"><el-icon><DataAnalysis /></el-icon></div>
          <div>
            <h2>生成结果</h2>
            <p>{{ results.length }} 个整数 · 密码学安全随机源</p>
          </div>
        </div>
        <div class="result-actions">
          <el-button :icon="RefreshRight" @click="generate">再生成一次</el-button>
          <el-button :icon="CopyDocument" :disabled="!results.length" @click="copyResults()">复制结果</el-button>
        </div>
      </div>

      <div v-if="results.length === 1" :key="generationId" class="single-result result-enter">
        <span>本次随机数</span>
        <strong>{{ formatNumber(results[0]) }}</strong>
        <small>范围 {{ formatNumber(minimum) }} ～ {{ formatNumber(maximum) }}</small>
      </div>

      <div v-else-if="results.length" :key="generationId" class="batch-results result-enter">
        <button v-for="(value, index) in results" :key="`${index}-${value}`" type="button" @click="copy(String(value))">
          <span>{{ index + 1 }}</span><strong>{{ formatNumber(value) }}</strong>
        </button>
      </div>

      <div v-if="summary && results.length > 1" class="summary-row">
        <div><span>最小结果</span><strong>{{ formatNumber(summary.minimum) }}</strong></div>
        <div><span>最大结果</span><strong>{{ formatNumber(summary.maximum) }}</strong></div>
        <div><span>平均值</span><strong>{{ formatNumber(summary.average) }}</strong></div>
      </div>
    </section>

    <section v-if="history.length" class="history-card">
      <div class="history-header">
        <div><strong>最近生成</strong><span>保留最近 5 组，刷新页面后清除</span></div>
        <button type="button" @click="history = []">清空记录</button>
      </div>
      <div class="history-list">
        <button v-for="item in history" :key="item.id" type="button" @click="copyResults(item.values)">
          <span>{{ item.range }}</span>
          <code>{{ item.values.join(', ') }}</code>
          <el-icon><CopyDocument /></el-icon>
        </button>
      </div>
    </section>

    <ToolGuide title="使用说明">
      <div class="guide-grid">
        <div><strong>包含边界值</strong><span>最小值与最大值均可能出现在结果中。</span></div>
        <div><strong>安全随机源</strong><span>使用浏览器 Crypto API，并通过拒绝采样避免取模偏差。</span></div>
        <div><strong>不重复抽取</strong><span>开启后每批结果不会重复，数量不能超过范围内整数总数。</span></div>
      </div>
    </ToolGuide>
  </div>
</template>

<style scoped>
.random-page { gap: 18px; }
.workspace-card, .result-card, .history-card { padding: 24px; border: 1px solid #e2e8f0; border-radius: 20px; background: #fff; box-shadow: 0 12px 32px rgba(15, 23, 42, .05); }
.section-heading, .result-header, .preset-row, .control-grid, .unique-control, .history-header { display: flex; align-items: center; }
.section-heading { gap: 12px; }
.heading-icon { display: grid; width: 42px; height: 42px; flex: 0 0 42px; place-items: center; border-radius: 13px; color: #ea580c; background: #fff7ed; font-size: 20px; }
.heading-icon.green { color: #059669; background: #ecfdf5; }
.section-heading h2 { margin: 0; color: #0f172a; font-size: 18px; }
.section-heading p { margin: 3px 0 0; color: #64748b; font-size: 13px; }
.preset-row { gap: 8px; margin-top: 20px; }
.preset-row > span { margin-right: 3px; color: #64748b; font-size: 12px; }
.preset-row button { padding: 6px 11px; border: 1px solid #e2e8f0; border-radius: 999px; color: #475569; background: #f8fafc; font-size: 12px; }
.preset-row button:hover { border-color: #fdba74; color: #c2410c; background: #fff7ed; }
.control-grid { gap: 12px; margin-top: 16px; padding: 17px; border-radius: 15px; background: #f8fafc; }
.control-grid label { min-width: 0; flex: 1; }
.control-grid label > span { display: block; margin-bottom: 7px; color: #475569; font-size: 12px; font-weight: 650; }
.control-grid label :deep(.el-input-number) { width: 100%; }
.range-arrow { align-self: flex-end; padding-bottom: 8px; color: #94a3b8; }
.unique-control { align-self: flex-end; gap: 12px; min-height: 32px; padding: 0 4px; }
.unique-control strong, .unique-control small { display: block; white-space: nowrap; }
.unique-control strong { color: #334155; font-size: 12px; }
.unique-control small { margin-top: 2px; color: #94a3b8; font-size: 10px; }
.control-grid > .el-button { align-self: flex-end; }
.result-header { justify-content: space-between; gap: 18px; }
.result-actions { display: flex; }
.single-result { display: flex; min-height: 245px; flex-direction: column; align-items: center; justify-content: center; margin-top: 20px; border-radius: 18px; color: #475569; background: radial-gradient(circle at 50% 10%, #ffedd5, #fff 62%); }
.single-result > span { font-size: 13px; letter-spacing: .12em; }
.single-result strong { margin: 9px 0; color: #ea580c; font-size: clamp(64px, 11vw, 112px); line-height: 1; word-break: break-all; }
.single-result small { color: #94a3b8; }
.batch-results { display: grid; grid-template-columns: repeat(auto-fill, minmax(116px, 1fr)); gap: 10px; margin-top: 20px; }
.batch-results button { display: flex; min-height: 72px; align-items: center; gap: 10px; padding: 14px; border: 1px solid #fed7aa; border-radius: 14px; color: #c2410c; background: #fff7ed; }
.batch-results button:hover { border-color: #fb923c; transform: translateY(-1px); }
.batch-results span { color: #fdba74; font-size: 10px; }
.batch-results strong { overflow: hidden; font-size: 20px; text-overflow: ellipsis; }
.summary-row { display: grid; grid-template-columns: repeat(3, 1fr); margin-top: 16px; overflow: hidden; border: 1px solid #e2e8f0; border-radius: 14px; }
.summary-row div { padding: 13px 18px; border-right: 1px solid #e2e8f0; }
.summary-row div:last-child { border: 0; }
.summary-row span, .summary-row strong { display: block; }
.summary-row span { color: #94a3b8; font-size: 11px; }
.summary-row strong { margin-top: 3px; color: #334155; font-size: 16px; }
.result-enter { animation: result-pop .3s ease both; }
@keyframes result-pop { from { opacity: .3; transform: scale(.985); } to { opacity: 1; transform: scale(1); } }
.history-header { justify-content: space-between; }
.history-header strong, .history-header span { display: block; }
.history-header strong { color: #334155; font-size: 15px; }
.history-header span { margin-top: 3px; color: #94a3b8; font-size: 11px; }
.history-header button { color: #64748b; font-size: 12px; }
.history-list { display: grid; gap: 8px; margin-top: 15px; }
.history-list button { display: grid; grid-template-columns: 130px minmax(0, 1fr) 20px; align-items: center; gap: 12px; padding: 11px 13px; border-radius: 11px; color: #64748b; background: #f8fafc; text-align: left; }
.history-list code { overflow: hidden; color: #334155; text-overflow: ellipsis; white-space: nowrap; }
.guide-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.guide-grid div { padding: 14px; border-radius: 13px; background: #f8fafc; }
.guide-grid strong, .guide-grid span { display: block; }
.guide-grid strong { color: #334155; font-size: 13px; }
.guide-grid span { margin-top: 5px; color: #64748b; font-size: 12px; line-height: 1.65; }
:global(html.dark .random-page .workspace-card), :global(html.dark .random-page .result-card), :global(html.dark .random-page .history-card) { border-color: #334155; background: #1e293b; box-shadow: none; }
:global(html.dark .random-page .section-heading h2), :global(html.dark .random-page .unique-control strong), :global(html.dark .random-page .summary-row strong), :global(html.dark .random-page .history-header strong), :global(html.dark .random-page .history-list code), :global(html.dark .random-page .guide-grid strong) { color: #e2e8f0; }
:global(html.dark .random-page .control-grid), :global(html.dark .random-page .preset-row button), :global(html.dark .random-page .history-list button), :global(html.dark .random-page .guide-grid div) { border-color: #334155; background: #0f172a; }
:global(html.dark .random-page .single-result) { background: radial-gradient(circle at 50% 10%, rgba(154, 52, 18, .25), #0f172a 65%); }
:global(html.dark .random-page .summary-row), :global(html.dark .random-page .summary-row div) { border-color: #334155; }
@media (max-width: 900px) { .control-grid { display: grid; grid-template-columns: 1fr 24px 1fr; } .control-grid label:nth-of-type(3), .unique-control, .control-grid > .el-button { grid-column: span 1; } .control-grid > .el-button { align-self: end; } }
@media (max-width: 680px) { .workspace-card, .result-card, .history-card { padding: 18px; } .preset-row { flex-wrap: wrap; } .control-grid { display: grid; grid-template-columns: 1fr; } .range-arrow { display: none; } .control-grid label:nth-of-type(3), .unique-control, .control-grid > .el-button { grid-column: auto; } .result-header { align-items: flex-start; flex-direction: column; } .result-actions { width: 100%; } .result-actions .el-button { flex: 1; } .summary-row, .guide-grid { grid-template-columns: 1fr; } .summary-row div { border-right: 0; border-bottom: 1px solid #e2e8f0; } .history-list button { grid-template-columns: 90px minmax(0, 1fr) 18px; } }
</style>
