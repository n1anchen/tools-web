<script setup lang="ts">
import { computed, ref } from 'vue'
import { Collection, CopyDocument, DataLine, Files, InfoFilled } from '@element-plus/icons-vue'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import SectionHeading from '@/components/Common/SectionHeading.vue'
import { copy } from '@/utils/string'

type Standard = 'binary' | 'decimal'

const inputValue = ref('1024')
const fromUnit = ref('B')
const standard = ref<Standard>('binary')

const unitDefinitions = [
  { label: 'bit', name: '比特', value: 'bit', exponent: -1 },
  { label: 'B', name: '字节', value: 'B', exponent: 0 },
  { label: 'KB', name: '千字节', value: 'KB', exponent: 1 },
  { label: 'MB', name: '兆字节', value: 'MB', exponent: 2 },
  { label: 'GB', name: '吉字节', value: 'GB', exponent: 3 },
  { label: 'TB', name: '太字节', value: 'TB', exponent: 4 },
  { label: 'PB', name: '拍字节', value: 'PB', exponent: 5 },
  { label: 'EB', name: '艾字节', value: 'EB', exponent: 6 },
]

const presets = [
  { label: '1 KB', value: '1', unit: 'KB' },
  { label: '1 MB', value: '1', unit: 'MB' },
  { label: '4.7 GB', value: '4.7', unit: 'GB' },
  { label: '1 TB', value: '1', unit: 'TB' },
]

const base = computed(() => standard.value === 'binary' ? 1024 : 1000)
const standardLabel = computed(() => standard.value === 'binary' ? '二进制（1024）' : '十进制（1000）')
const rawNumber = computed(() => Number(inputValue.value))
const hasValidInput = computed(() => inputValue.value.trim() !== '' && Number.isFinite(rawNumber.value) && rawNumber.value >= 0)

function unitBytes(unit: typeof unitDefinitions[number]) {
  if (unit.value === 'bit') return 1 / 8
  return base.value ** unit.exponent
}

function formatValue(value: number) {
  if (value === 0) return '0'
  const absolute = Math.abs(value)
  if (absolute >= 1e15 || absolute < 1e-7) return value.toExponential(6).replace(/\.0+e/, 'e')
  return new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: absolute < 1 ? 10 : absolute < 100 ? 8 : 4,
    useGrouping: true,
  }).format(value)
}

const results = computed(() => {
  if (!hasValidInput.value) return []
  const source = unitDefinitions.find(unit => unit.value === fromUnit.value) ?? unitDefinitions[1]
  const totalBytes = rawNumber.value * unitBytes(source)
  return unitDefinitions.map(unit => ({
    ...unit,
    numericValue: totalBytes / unitBytes(unit),
    formattedValue: formatValue(totalBytes / unitBytes(unit)),
  }))
})

const bestResult = computed(() => {
  const byteUnits = results.value.filter(item => item.value !== 'bit')
  const readable = byteUnits.filter(item => item.numericValue >= 1)
  return readable[readable.length - 1] ?? byteUnits[0]
})

const sourceLabel = computed(() => unitDefinitions.find(unit => unit.value === fromUnit.value)?.label ?? 'B')

function usePreset(preset: typeof presets[number]) {
  inputValue.value = preset.value
  fromUnit.value = preset.unit
}

function copyAll() {
  if (!results.value.length) return
  copy(results.value.map(item => `${item.formattedValue} ${item.label}`).join('\n'))
}
</script>

<template>
  <div class="storage-page flex flex-col mt-3 flex-1">
    <ToolHero />

    <section class="workspace-card">
      <SectionHeading :icon="Files" title="设置原始容量" description="输入一次，同时查看 bit 到 EB 的全部换算结果" tone="blue" />

      <div class="control-grid">
        <label class="field-block value-field">
          <span>数值</span>
          <el-input v-model="inputValue" size="large" type="number" min="0" inputmode="decimal" placeholder="输入非负数值" />
        </label>
        <label class="field-block">
          <span>原始单位</span>
          <el-select v-model="fromUnit" size="large">
            <el-option
              v-for="unit in unitDefinitions"
              :key="unit.value"
              :label="`${unit.label}（${unit.name}）`"
              :value="unit.value"
            />
          </el-select>
        </label>
        <label class="field-block">
          <span>换算标准</span>
          <el-segmented
            v-model="standard"
            :options="[
              { label: '二进制 1024', value: 'binary' },
              { label: '十进制 1000', value: 'decimal' },
            ]"
          />
        </label>
      </div>

      <div class="preset-row">
        <span>常用容量</span>
        <button v-for="preset in presets" :key="preset.label" type="button" @click="usePreset(preset)">
          {{ preset.label }}
        </button>
      </div>
    </section>

    <section class="results-card">
      <SectionHeading :icon="DataLine" title="换算结果" :description="(standardLabel) + ' · 自动保留有效小数'" tone="green">
        <template #actions>
          <el-button :icon="CopyDocument" :disabled="!results.length" @click="copyAll">复制全部</el-button>
        </template>
      </SectionHeading>

      <div v-if="results.length && bestResult" class="result-summary">
        <span>{{ inputValue || 0 }} {{ sourceLabel }} 约等于</span>
        <strong>{{ bestResult.formattedValue }} <small>{{ bestResult.label }}</small></strong>
      </div>

      <div v-if="results.length" class="result-grid">
        <button
          v-for="item in results"
          :key="item.value"
          type="button"
          class="result-item"
          :class="{ highlighted: item.value === bestResult?.value }"
          :title="`复制 ${item.label} 结果`"
          @click="copy(`${item.formattedValue} ${item.label}`)"
        >
          <div class="unit-badge">{{ item.label }}</div>
          <div class="result-value">{{ item.formattedValue }}</div>
          <div class="result-name">{{ item.name }} · 点击复制</div>
        </button>
      </div>

      <div v-else class="empty-state">
        <el-icon><InfoFilled /></el-icon>
        <p>请输入有效的非负数值</p>
      </div>
    </section>

    <ToolGuide title="换算标准与参考">
      <div class="detail-layout">
        <div class="reference-card">
          <el-icon><Collection /></el-icon>
          <div>
            <h4>二进制标准</h4>
            <p>1 KB = 1024 B，常见于操作系统、内存容量和传统文件大小显示。</p>
          </div>
        </div>
        <div class="reference-card">
          <el-icon><Collection /></el-icon>
          <div>
            <h4>十进制标准</h4>
            <p>1 KB = 1000 B，常见于硬盘厂商标称容量、网络速率和国际单位制表达。</p>
          </div>
        </div>
        <div class="reference-card">
          <el-icon><InfoFilled /></el-icon>
          <div>
            <h4>为什么容量会不同？</h4>
            <p>同一字节数采用 1000 与 1024 进位时显示值不同，这通常不是设备容量丢失。</p>
          </div>
        </div>
      </div>
    </ToolGuide>
  </div>
</template>

<style scoped>
.storage-page {
  gap: 18px;
}

.workspace-card {padding: 24px;
  border: 1px solid var(--c-border);
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.05);}

.preset-row, .reference-card {display: flex;
  align-items: center;}



.control-grid {
  display: grid;
  grid-template-columns: minmax(180px, 1.1fr) minmax(190px, 0.8fr) minmax(280px, 1fr);
  gap: 14px;
  margin-top: 22px;
}

.field-block > span {
  display: block;
  margin-bottom: 8px;
  color: var(--c-text-strong);
  font-size: 13px;
  font-weight: 650;
}

.field-block :deep(.el-input),
.field-block :deep(.el-select),
.field-block :deep(.el-segmented) {
  width: 100%;
}

.preset-row {
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;
}

.preset-row > span {
  color: var(--c-text-secondary);
  font-size: 13px;
}

.preset-row button {
  padding: 6px 12px;
  border: 1px solid #dbeafe;
  border-radius: 999px;
  color: #2563eb;
  background: #eff6ff;
  font-size: 12px;
  cursor: pointer;
}

.preset-row button:hover {
  border-color: #60a5fa;
  background: #dbeafe;
}

.result-summary {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 20px;
  margin-top: 20px;
  padding: 20px 22px;
  border: 1px solid #bfdbfe;
  border-radius: 16px;
  color: var(--c-text-body);
  background: linear-gradient(135deg, #eff6ff, #f8fbff);
}

.result-summary strong {
  color: #1d4ed8;
  font-size: clamp(25px, 3vw, 36px);
  white-space: nowrap;
}

.result-summary small {
  font-size: 15px;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.result-item {
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--c-border);
  border-radius: 14px;
  color: inherit;
  background: var(--c-surface-subtle);
  text-align: left;
  cursor: pointer;
  transition: 0.2s ease;
}

.result-item:hover {
  border-color: #93c5fd;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.08);
  transform: translateY(-2px);
}

.result-item.highlighted {
  border-color: #86efac;
  background: #f0fdf4;
}

.unit-badge {
  display: inline-flex;
  min-width: 34px;
  height: 25px;
  align-items: center;
  justify-content: center;
  padding: 0 7px;
  border-radius: 8px;
  color: #2563eb;
  background: #dbeafe;
  font-size: 12px;
  font-weight: 700;
}

.highlighted .unit-badge {
  color: #047857;
  background: #d1fae5;
}

.result-value {
  margin-top: 13px;
  color: var(--c-text-primary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.result-name {
  margin-top: 5px;
  color: var(--c-text-muted);
  font-size: 11px;
}

.empty-state {
  display: grid;
  min-height: 180px;
  margin-top: 18px;
  place-items: center;
  align-content: center;
  border: 1px dashed #cbd5e1;
  border-radius: 16px;
  color: var(--c-text-muted);
  background: var(--c-surface-subtle);
}

.empty-state .el-icon {
  font-size: 28px;
}

.empty-state p {
  margin: 8px 0 0;
}

.detail-layout {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.reference-card {
  align-items: flex-start;
  gap: 10px;
}

.reference-card > .el-icon {
  flex: 0 0 auto;
  margin-top: 2px;
  color: #2563eb;
  font-size: 18px;
}

.reference-card h4 {
  margin: 0 0 5px;
  color: #1e293b;
}

.reference-card p {
  margin: 0;
  color: var(--c-text-secondary);
  line-height: 1.7;
}

:global(html.dark .storage-page .workspace-card),
:global(html.dark .storage-page .results-card) {
  border-color: var(--c-border);
  background: var(--c-surface-subtle);
  box-shadow: none;
}

:global(html.dark .storage-page .field-block > span),
:global(html.dark .storage-page .reference-card h4) {
  color: #f1f5f9;
}

:global(html.dark .storage-page .result-summary) {
  border-color: #1e3a5f;
  color: var(--c-text-muted);
  background: linear-gradient(135deg, #0d1d33, #111c2f);
}

:global(html.dark .storage-page .result-summary strong) {
  color: #60a5fa;
}

:global(html.dark .storage-page .result-item),
:global(html.dark .storage-page .empty-state) {
  border-color: var(--c-border);
  color: var(--c-text-secondary);
  background: #111c2f;
}

:global(html.dark .storage-page .result-item.highlighted) {
  border-color: #14532d;
  background: #082f2a;
}

:global(html.dark .storage-page .result-value) {
  color: var(--c-text-primary);
}@media (max-width: 900px) {
  .control-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .control-grid .field-block:last-child {
    grid-column: 1 / -1;
  }

  .result-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }}@media (max-width: 640px) {
  .workspace-card,
  .results-card {
    padding: 18px;
    border-radius: 16px;
  }

  .control-grid,
  .detail-layout {
    grid-template-columns: 1fr;
  }

  .control-grid .field-block:last-child {
    grid-column: auto;
  }

  .result-summary {
    align-items: flex-start;
    flex-direction: column;
  }

  .result-grid {
    grid-template-columns: 1fr;
  }}</style>
