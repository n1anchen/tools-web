<script setup lang="ts">
import { computed, ref } from 'vue'
import { CopyDocument, MagicStick } from '@element-plus/icons-vue'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import { copy } from '@/utils/string'
import {
  RADIX_DEFINITIONS,
  formatRadixInteger,
  groupRadixDigits,
  parseRadixInteger,
  type SupportedRadix,
} from '@/utils/converters'

const input = ref('9007199254740993')
const sourceBase = ref<SupportedRadix>(10)
const uppercase = ref(false)
const groupDigits = ref(false)

const parsedInput = computed(() => {
  if (!input.value.trim()) return { value: null as bigint | null, error: '' }
  try {
    return { value: parseRadixInteger(input.value, sourceBase.value), error: '' }
  } catch (error) {
    return { value: null, error: error instanceof Error ? error.message : '无法转换该数值' }
  }
})

const results = computed(() => {
  if (parsedInput.value.value === null) return []
  return RADIX_DEFINITIONS.map(definition => {
    const raw = formatRadixInteger(parsedInput.value.value!, definition.base, uppercase.value)
    const groupSize = definition.base === 10 ? 3 : 4
    return {
      ...definition,
      raw,
      display: groupDigits.value ? groupRadixDigits(raw, groupSize) : raw,
      digits: raw.replace('-', '').length,
    }
  })
})

const sourceDefinition = computed(() => RADIX_DEFINITIONS.find(item => item.base === sourceBase.value)!)
const decimalSummary = computed(() => results.value.find(item => item.base === 10)?.raw || '')

const presets = [
  { label: '最大安全整数', value: '9007199254740991', base: 10 as SupportedRadix },
  { label: '超大整数', value: '90071992547409931234567890', base: 10 as SupportedRadix },
  { label: '十六进制颜色', value: 'FF6B35', base: 16 as SupportedRadix },
  { label: '二进制示例', value: '1111_0000_1010', base: 2 as SupportedRadix },
]

function usePreset(preset: typeof presets[number]) {
  input.value = preset.value
  sourceBase.value = preset.base
}

function continueFromResult(base: SupportedRadix, value: string) {
  sourceBase.value = base
  input.value = value
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <div class="radix-page flex flex-col mt-3 flex-1">
    <ToolHero />

    <section class="input-card">
      <div class="input-heading">
        <div>
          <span class="eyebrow">ARBITRARY PRECISION</span>
          <h2>任意精度整数进制转换</h2>
          <p>使用 BigInt 计算，超出 9,007,199,254,740,991 也不会丢失精度。</p>
        </div>
        <div class="precision-badge"><el-icon><MagicStick /></el-icon>无位数精度损失</div>
      </div>

      <div class="input-layout">
        <div class="base-picker">
          <label>输入进制</label>
          <el-select v-model="sourceBase" size="large">
            <el-option v-for="definition in RADIX_DEFINITIONS" :key="definition.base" :label="`${definition.base} 进制`" :value="definition.base" />
          </el-select>
          <small>{{ sourceDefinition.description }}</small>
        </div>
        <div class="number-input">
          <label>待转换整数</label>
          <el-input v-model="input" type="textarea" :rows="3" resize="none" placeholder="支持负号、空格和下划线分组" />
          <small>可使用空格或下划线分组；58 / 62 / 64 进制区分大小写。</small>
        </div>
      </div>

      <div class="preset-row">
        <span>试一试</span>
        <button v-for="preset in presets" :key="preset.label" @click="usePreset(preset)">{{ preset.label }}</button>
      </div>

      <div class="option-row">
        <div>
          <span>结果格式</span>
          <el-checkbox v-model="uppercase">2–36 进制使用大写字母</el-checkbox>
          <el-checkbox v-model="groupDigits">数字分组显示</el-checkbox>
        </div>
        <div v-if="decimalSummary" class="decimal-summary">
          <span>对应十进制</span><strong>{{ decimalSummary }}</strong>
        </div>
      </div>

      <div v-if="parsedInput.error" class="error-box">{{ parsedInput.error }}</div>
    </section>

    <section v-if="results.length" class="results-card">
      <div class="section-heading">
        <div><span class="eyebrow">CONVERSION MATRIX</span><h3>全部转换结果</h3></div>
        <span>点击卡片可把结果设为新的输入</span>
      </div>

      <div class="results-grid">
        <article
          v-for="result in results"
          :key="result.base"
          class="result-item"
          :class="{ source: result.base === sourceBase }"
          @click="continueFromResult(result.base, result.raw)"
        >
          <div class="result-meta">
            <div><strong>{{ result.base }}</strong><span>{{ result.label }}</span></div>
            <span>{{ result.digits }} 位</span>
          </div>
          <code>{{ result.display }}</code>
          <div class="result-footer">
            <small>{{ result.description }}</small>
            <el-button link type="primary" :icon="CopyDocument" @click.stop="copy(result.raw)">复制</el-button>
          </div>
        </article>
      </div>
    </section>

    <section class="alphabet-card">
      <div class="section-heading"><div><span class="eyebrow">ALPHABETS</span><h3>高进制字符表</h3></div></div>
      <div class="alphabet-list">
        <div v-for="definition in RADIX_DEFINITIONS.filter(item => item.base >= 32)" :key="definition.base">
          <strong>Base {{ definition.base }}</strong>
          <code>{{ definition.alphabet }}</code>
          <span>{{ definition.description }}</span>
        </div>
      </div>
    </section>

    <ToolGuide title="进制说明">
      <el-text>
        进制是用固定数量的数字符号表示数值的方法。2、8、10、16 进制常用于计算机系统；Base58 常用于区块链地址；Base62 常用于短链接。本工具只转换整数表示，不等同于 Base64 文本编码，也不会处理小数部分。
      </el-text>
    </ToolGuide>
  </div>
</template>

<style scoped>
.radix-page { --accent: #7c3aed; gap: 16px; }
.input-card, .results-card, .alphabet-card { padding: 24px; border: 1px solid #e2e8f0; border-radius: 23px; background: #fff; box-shadow: 0 12px 35px rgb(15 23 42 / 6%); }
.input-card { background: radial-gradient(circle at 92% 8%, #ede9fe 0, transparent 25%), #fff; }
.input-heading, .section-heading, .option-row, .result-meta, .result-footer { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.eyebrow { color: var(--accent); font-size: 10px; font-weight: 800; letter-spacing: .15em; }
.input-heading h2, .section-heading h3 { margin: 6px 0 3px; color: #0f172a; }
.input-heading h2 { font-size: clamp(20px, 3vw, 27px); }
.section-heading h3 { font-size: 19px; }
.input-heading p { margin: 0; color: #64748b; font-size: 13px; }
.precision-badge { display: flex; align-items: center; gap: 6px; flex: none; padding: 8px 12px; border: 1px solid #ddd6fe; border-radius: 999px; color: #6d28d9; background: #f5f3ff; font-size: 12px; font-weight: 700; }
.input-layout { display: grid; grid-template-columns: 190px minmax(0, 1fr); gap: 12px; margin-top: 24px; }
.base-picker, .number-input { display: flex; min-width: 0; flex-direction: column; padding: 15px; border: 1px solid #e2e8f0; border-radius: 16px; background: #f8fafc; }
.base-picker label, .number-input label { margin-bottom: 8px; color: #475569; font-size: 12px; font-weight: 700; }
.base-picker small, .number-input small { margin-top: 7px; color: #94a3b8; font-size: 10px; }
.number-input :deep(.el-textarea__inner) { padding: 4px 0; border: 0; box-shadow: none; color: #1e293b; background: transparent; font: 16px/1.65 ui-monospace, SFMono-Regular, Menlo, monospace; }
.preset-row { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; margin-top: 13px; color: #94a3b8; font-size: 11px; }
.preset-row button { padding: 5px 10px; border: 0; border-radius: 99px; color: #5b21b6; background: #f5f3ff; cursor: pointer; }
.option-row { flex-wrap: wrap; margin-top: 18px; padding: 14px 16px; border-radius: 15px; background: #f8fafc; }
.option-row > div:first-child { display: flex; align-items: center; flex-wrap: wrap; gap: 15px; }
.option-row > div:first-child > span { color: #64748b; font-size: 12px; font-weight: 700; }
.decimal-summary { display: flex; align-items: center; gap: 9px; min-width: 0; }
.decimal-summary span { color: #94a3b8; font-size: 11px; }
.decimal-summary strong { max-width: 300px; color: #334155; overflow: hidden; text-overflow: ellipsis; font: 12px ui-monospace, monospace; white-space: nowrap; }
.error-box { margin-top: 14px; padding: 12px 14px; border: 1px solid #fecaca; border-radius: 13px; color: #b91c1c; background: #fef2f2; font-size: 13px; }
.section-heading > span { color: #94a3b8; font-size: 11px; }
.results-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 11px; margin-top: 18px; }
.result-item { min-width: 0; padding: 15px; border: 1px solid #e2e8f0; border-radius: 16px; background: #f8fafc; cursor: pointer; transition: .18s ease; }
.result-item:hover { border-color: #c4b5fd; transform: translateY(-2px); box-shadow: 0 8px 20px rgb(76 29 149 / 8%); }
.result-item.source { border-color: #a78bfa; background: #faf5ff; box-shadow: inset 3px 0 #7c3aed; }
.result-meta > div { display: flex; align-items: center; gap: 8px; }
.result-meta strong { display: grid; width: 31px; height: 31px; place-items: center; border-radius: 9px; color: #fff; background: var(--accent); font-size: 12px; }
.result-meta span { color: #64748b; font-size: 11px; }
.result-item code { display: block; min-height: 48px; margin: 13px 0 8px; color: #1e293b; overflow-wrap: anywhere; white-space: pre-wrap; font: 700 14px/1.7 ui-monospace, SFMono-Regular, Menlo, monospace; }
.result-footer small { color: #94a3b8; font-size: 10px; }
.alphabet-list { display: grid; gap: 9px; margin-top: 17px; }
.alphabet-list > div { display: grid; grid-template-columns: 80px minmax(0, 1fr) 210px; align-items: center; gap: 12px; padding: 11px 13px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc; }
.alphabet-list strong { color: #475569; font-size: 12px; }
.alphabet-list code { color: #6d28d9; overflow-wrap: anywhere; font: 11px ui-monospace, monospace; }
.alphabet-list span { color: #94a3b8; font-size: 10px; text-align: right; }

:global(html.dark .radix-page .input-card), :global(html.dark .radix-page .results-card), :global(html.dark .radix-page .alphabet-card) { border-color: #334155; background: #1e293b; box-shadow: none; }
:global(html.dark .radix-page .input-card) { background: radial-gradient(circle at 92% 8%, #3b1f5e 0, transparent 28%), #1e293b; }
:global(html.dark .radix-page h2), :global(html.dark .radix-page h3), :global(html.dark .radix-page .result-item code) { color: #f8fafc; }
:global(html.dark .radix-page .base-picker label), :global(html.dark .radix-page .number-input label), :global(html.dark .radix-page .option-row > div:first-child > span) { color: #cbd5e1; }
:global(html.dark .radix-page .input-heading p), :global(html.dark .radix-page .result-meta span), :global(html.dark .radix-page .result-footer small) { color: #94a3b8; }
:global(html.dark .radix-page .precision-badge), :global(html.dark .radix-page .preset-row button) { border-color: #5b21b6; color: #c4b5fd; background: #2e1065; }
:global(html.dark .radix-page .base-picker), :global(html.dark .radix-page .number-input), :global(html.dark .radix-page .option-row), :global(html.dark .radix-page .result-item), :global(html.dark .radix-page .alphabet-list > div) { border-color: #334155; background: #0f172a; }
:global(html.dark .radix-page .number-input .el-textarea__inner) { color: #e2e8f0; }
:global(html.dark .radix-page .decimal-summary strong) { color: #cbd5e1; }
:global(html.dark .radix-page .error-box) { border-color: #7f1d1d; color: #fca5a5; background: #450a0a; }
:global(html.dark .radix-page .result-item.source) { border-color: #8b5cf6; background: #25143d; }
:global(html.dark .radix-page .alphabet-list code) { color: #c4b5fd; }

@media (max-width: 760px) {
  .input-card, .results-card, .alphabet-card { padding: 18px; border-radius: 20px; }
  .input-heading { align-items: flex-start; flex-direction: column; }
  .input-layout { grid-template-columns: 1fr; }
  .results-grid { grid-template-columns: 1fr; }
  .alphabet-list > div { grid-template-columns: 1fr; gap: 5px; }
  .alphabet-list span { text-align: left; }
}
</style>
