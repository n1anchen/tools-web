<script setup lang="ts">
import { computed, ref } from 'vue'
import { CopyDocument, Delete, Money, Reading, Tickets } from '@element-plus/icons-vue'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import { copy, numberToChinese } from '@/utils/string'

const inputValue = ref('100001')

const examples = [
  { label: '整数示例', value: '100' },
  { label: '跨万位', value: '100001' },
  { label: '一亿元', value: '100000000' },
  { label: '连续数字', value: '123456789' },
]

const normalizedValue = computed(() => inputValue.value.trim().replace(/,/g, ''))
const validationMessage = computed(() => {
  if (!normalizedValue.value) return '输入数字后，这里会实时生成中文大写'
  if (!/^\d+$/.test(normalizedValue.value)) return '仅支持非负整数，请勿输入小数、负号或其他字符'
  if (normalizedValue.value.length > 13) return '数字不能超过 13 位'
  const value = Number(normalizedValue.value)
  if (!Number.isSafeInteger(value) || value > 9_999_999_999_999) return '请输入不超过 9,999,999,999,999 的整数'
  return ''
})

const result = computed(() => {
  if (validationMessage.value) return ''
  return numberToChinese(Number(normalizedValue.value))
})

const formattedNumber = computed(() => {
  if (!result.value) return '—'
  return new Intl.NumberFormat('zh-CN').format(Number(normalizedValue.value))
})

const digitCount = computed(() => normalizedValue.value.replace(/^0+(?=\d)/, '').length || 0)

function useExample(value: string) {
  inputValue.value = value
}

function clear() {
  inputValue.value = ''
}
</script>

<template>
  <div class="number-page flex flex-col mt-3 flex-1">
    <ToolHero />

    <section class="workspace-card">
      <div class="section-heading">
        <div class="heading-icon"><el-icon><Money /></el-icon></div>
        <div>
          <h2>输入阿拉伯数字</h2>
          <p>支持 0 至 13 位非负整数，输入后实时转换</p>
        </div>
      </div>

      <div class="input-shell">
        <label for="amount-input">待转换数字</label>
        <el-input
          id="amount-input"
          v-model="inputValue"
          size="large"
          inputmode="numeric"
          clearable
          placeholder="例如：100001"
        >
          <template #prefix>¥</template>
        </el-input>
        <div class="input-meta">
          <span>{{ digitCount }} / 13 位</span>
          <span>可直接粘贴带千分位逗号的数字</span>
        </div>
      </div>

      <div class="example-row">
        <span class="example-label">快速示例</span>
        <button v-for="item in examples" :key="item.value" type="button" @click="useExample(item.value)">
          <strong>{{ item.label }}</strong>
          <small>{{ Number(item.value).toLocaleString('zh-CN') }}</small>
        </button>
      </div>
    </section>

    <section class="result-card" :class="{ 'result-card-empty': !result }">
      <div class="result-topline">
        <div class="section-heading compact">
          <div class="heading-icon green"><el-icon><Tickets /></el-icon></div>
          <div>
            <h2>转换结果</h2>
            <p>人民币票据常用中文大写</p>
          </div>
        </div>
        <div v-if="result" class="result-actions">
          <el-button :icon="CopyDocument" @click="copy(result)">复制结果</el-button>
          <el-button :icon="Delete" @click="clear">清空</el-button>
        </div>
      </div>

      <div v-if="result" class="result-content">
        <div class="result-main">{{ result }}</div>
        <div class="result-summary">
          <div>
            <span>原始数字</span>
            <strong>{{ formattedNumber }}</strong>
          </div>
          <div>
            <span>数字位数</span>
            <strong>{{ digitCount }} 位</strong>
          </div>
          <div>
            <span>转换方式</span>
            <strong>人民币大写</strong>
          </div>
        </div>
      </div>
      <div v-else class="empty-state" :class="{ error: normalizedValue && validationMessage }">
        <el-icon><Reading /></el-icon>
        <p>{{ validationMessage }}</p>
      </div>
    </section>

    <ToolGuide title="使用说明">
      <div class="detail-grid">
        <div>
          <h4>适用场景</h4>
          <p>用于支票、收据、合同与财务凭证中的整数金额大写。转换在浏览器本地完成。</p>
        </div>
        <div>
          <h4>当前规则</h4>
          <p>支持零及非负整数，不包含“人民币”“元整”等业务后缀，也不处理角、分小数位。</p>
        </div>
      </div>
    </ToolGuide>
  </div>
</template>

<style scoped>
.number-page {
  gap: 18px;
}

.workspace-card {padding: 24px;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.05);}

.section-heading,
.result-topline {
  display: flex;
  align-items: center;
}

.section-heading {
  gap: 12px;
}

.section-heading h2 {
  margin: 0;
  color: #0f172a;
  font-size: 18px;
  font-weight: 700;
}

.section-heading p {
  margin: 3px 0 0;
  color: #64748b;
  font-size: 13px;
}

.heading-icon {
  display: grid;
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  place-items: center;
  border-radius: 13px;
  color: #2563eb;
  background: #eff6ff;
  font-size: 20px;
}

.heading-icon.green {
  color: #059669;
  background: #ecfdf5;
}

.input-shell {
  margin-top: 22px;
  padding: 18px;
  border: 1px solid #dbeafe;
  border-radius: 16px;
  background: linear-gradient(135deg, #f8fbff 0%, #f1f7ff 100%);
}

.input-shell label {
  display: block;
  margin-bottom: 9px;
  color: #334155;
  font-size: 13px;
  font-weight: 650;
}

.input-shell :deep(.el-input__wrapper) {
  min-height: 52px;
  border-radius: 12px;
  font-size: 19px;
  box-shadow: 0 0 0 1px #cbd5e1 inset;
}

.input-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 9px;
  color: #64748b;
  font-size: 12px;
}

.example-row {
  display: flex;
  align-items: stretch;
  gap: 10px;
  margin-top: 18px;
  overflow-x: auto;
}

.example-label {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  color: #64748b;
  font-size: 13px;
}

.example-row button {
  min-width: 112px;
  padding: 9px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  color: #334155;
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition: 0.2s ease;
}

.example-row button:hover {
  border-color: #93c5fd;
  color: #1d4ed8;
  transform: translateY(-1px);
}

.example-row strong,
.example-row small {
  display: block;
}

.example-row strong {
  font-size: 12px;
}

.example-row small {
  margin-top: 3px;
  color: #94a3b8;
}

.result-topline {
  justify-content: space-between;
  gap: 16px;
}

.result-actions {
  display: flex;
  gap: 8px;
}

.result-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

.result-content {
  margin-top: 20px;
}

.result-main {
  padding: 26px;
  border: 1px solid #bbf7d0;
  border-radius: 16px;
  color: #065f46;
  background: linear-gradient(135deg, #f0fdf4, #ecfdf5);
  font-family: "Noto Serif SC", "Songti SC", serif;
  font-size: clamp(24px, 3.2vw, 38px);
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.result-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.result-summary div {
  padding: 12px 14px;
  border-radius: 12px;
  background: #f8fafc;
}

.result-summary span,
.result-summary strong {
  display: block;
}

.result-summary span {
  color: #64748b;
  font-size: 12px;
}

.result-summary strong {
  margin-top: 3px;
  color: #1e293b;
  font-size: 14px;
}

.empty-state {
  display: grid;
  min-height: 150px;
  margin-top: 18px;
  place-items: center;
  align-content: center;
  border: 1px dashed #cbd5e1;
  border-radius: 16px;
  color: #94a3b8;
  background: #f8fafc;
}

.empty-state .el-icon {
  font-size: 28px;
}

.empty-state p {
  margin: 8px 16px 0;
  text-align: center;
}

.empty-state.error {
  border-color: #fecaca;
  color: #dc2626;
  background: #fff7f7;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}

.detail-grid h4 {
  margin: 0 0 6px;
  color: #1e293b;
}

.detail-grid p {
  margin: 0;
  color: #64748b;
  line-height: 1.75;
}

:global(html.dark .number-page .workspace-card),
:global(html.dark .number-page .result-card) {
  border-color: #334155;
  background: #0f172a;
  box-shadow: none;
}

:global(html.dark .number-page .section-heading h2),
:global(html.dark .number-page .detail-grid h4) {
  color: #f1f5f9;
}

:global(html.dark .number-page .section-heading p),
:global(html.dark .number-page .detail-grid p) {
  color: #94a3b8;
}

:global(html.dark .number-page .input-shell) {
  border-color: #1e3a5f;
  background: linear-gradient(135deg, #111c31, #0f2038);
}

:global(html.dark .number-page .input-shell label) {
  color: #cbd5e1;
}

:global(html.dark .number-page .example-row button),
:global(html.dark .number-page .result-summary div),
:global(html.dark .number-page .empty-state) {
  border-color: #334155;
  color: #cbd5e1;
  background: #111c2f;
}

:global(html.dark .number-page .result-main) {
  border-color: #14532d;
  color: #6ee7b7;
  background: linear-gradient(135deg, #082f2a, #052e24);
}

:global(html.dark .number-page .result-summary strong) {
  color: #e2e8f0;
}

:global(html.dark .number-page .empty-state.error) {
  border-color: #7f1d1d;
  color: #fca5a5;
  background: #2b1217;
}

@media (max-width: 640px) {
  .workspace-card,
  .result-card {
    padding: 18px;
    border-radius: 16px;
  }

  .input-meta,
  .result-topline {
    align-items: flex-start;
    flex-direction: column;
  }

  .result-summary,
  .detail-grid {
    grid-template-columns: 1fr;
  }

  .result-actions {
    width: 100%;
  }

  .result-actions :deep(.el-button) {
    flex: 1;
  }

  .result-main {
    padding: 20px;
    font-size: 24px;
  }
}
</style>
