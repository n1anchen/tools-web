<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Delete, EditPen, RefreshRight, Search, Switch } from '@element-plus/icons-vue'
import CopyButton from '@/components/Common/CopyButton.vue'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import SectionHeading from '@/components/Common/SectionHeading.vue'
import PanelHeading from '@/components/Common/PanelHeading.vue'
import { replaceText, type ReplaceScope } from '@/utils/textTools'

const inputText = ref('')
const findText = ref('')
const replacementText = ref('')
const options = reactive({
  useRegex: false,
  caseSensitive: true,
  scope: 'all' as ReplaceScope,
})

const result = computed(() => replaceText(inputText.value, findText.value, replacementText.value, options))
const characterDelta = computed(() => result.value.text.length - inputText.value.length)
const sampleText = '订单号：ORDER-2025-001\n订单号：ORDER-2025-002\n订单号：order-2025-003'

function loadSample() {
  inputText.value = sampleText
  findText.value = 'ORDER-(\\d{4})-(\\d{3})'
  replacementText.value = '$1/$2'
  options.useRegex = true
  options.caseSensitive = false
  options.scope = 'all'
}

function clearAll() {
  inputText.value = ''
  findText.value = ''
  replacementText.value = ''
}

function useResultAsInput() {
  if (!result.value.text) return
  inputText.value = result.value.text
}
</script>

<template>
  <div class="replace-page flex flex-col mt-3 flex-1">
    <ToolHero />

    <section class="workspace-card">
      <SectionHeading :icon="Search" title="设置查找与替换规则" description="普通文字和正则表达式均支持实时预览" tone="blue">
        <template #actions>
          <el-radio-group v-model="options.scope">
            <el-radio-button value="all">替换全部</el-radio-button>
            <el-radio-button value="first">仅第一处</el-radio-button>
          </el-radio-group>
        </template>
      </SectionHeading>

      <div class="rule-grid">
        <label>
          <span>查找内容</span>
          <el-input v-model="findText" size="large" clearable placeholder="输入文字或正则表达式">
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
        </label>
        <div class="rule-arrow">→</div>
        <label>
          <span>替换为 <small>留空即可批量删除</small></span>
          <el-input v-model="replacementText" size="large" clearable placeholder="输入新的内容">
            <template #prefix><el-icon><EditPen /></el-icon></template>
          </el-input>
        </label>
      </div>

      <div class="option-row">
        <el-checkbox v-model="options.useRegex">使用正则表达式</el-checkbox>
        <el-checkbox v-model="options.caseSensitive">区分大小写</el-checkbox>
        <span class="regex-tip">正则模式支持捕获组，如 $1、$2</span>
      </div>

      <div v-if="result.error" class="error-banner">
        <strong>正则表达式有误</strong>
        <span>{{ result.error }}</span>
      </div>

      <div class="editor-grid">
        <article class="editor-panel">
          <PanelHeading title="原始文本" :stats="`${Array.from(inputText).length} 个字符`" size="bar">
            <template #actions><el-button text :icon="Delete" :disabled="!inputText" @click="inputText = ''">清空</el-button></template>
          </PanelHeading>
          <el-input v-model="inputText" type="textarea" :rows="12" resize="none" placeholder="粘贴需要批量查找和替换的文本" />
        </article>

        <div class="direction-column">
          <div class="match-badge">
            <strong>{{ result.replacementCount }}</strong>
            <span>处替换</span>
          </div>
          <el-icon><Switch /></el-icon>
        </div>

        <article class="editor-panel result-panel" :class="{ invalid: result.error }">
          <PanelHeading title="替换结果" :stats="`${Array.from(result.text).length} 个字符`" size="bar">
            <template #actions><CopyButton text-btn :text="result.text" :disabled="!result.text || !!result.error" /></template>
          </PanelHeading>
          <el-input
            :model-value="result.text"
            type="textarea"
            :rows="12"
            resize="none"
            readonly
            :placeholder="result.error ? '修正规则后显示结果' : '替换结果会实时显示在这里'"
          />
        </article>
      </div>

      <div class="workspace-footer">
        <button type="button" class="sample-button" @click="loadSample">载入正则示例</button>
        <div>
          <el-button :icon="Delete" :disabled="!inputText && !findText && !replacementText" @click="clearAll">全部清空</el-button>
          <el-button :icon="RefreshRight" :disabled="!result.text || !!result.error" @click="useResultAsInput">用结果继续处理</el-button>
          <CopyButton type="primary" :text="result.text" :disabled="!result.text || !!result.error" label="复制结果" />
        </div>
      </div>
    </section>

    <section class="summary-card">
      <div><span>匹配总数</span><strong>{{ result.matchCount }}</strong><small>符合当前查找规则</small></div>
      <div><span>实际替换</span><strong>{{ result.replacementCount }}</strong><small>{{ options.scope === 'all' ? '替换全部匹配' : '仅替换第一处' }}</small></div>
      <div><span>字符变化</span><strong>{{ characterDelta > 0 ? '+' : '' }}{{ characterDelta }}</strong><small>替换前后字符数差值</small></div>
      <div><span>处理模式</span><strong>{{ options.useRegex ? '正则' : '普通' }}</strong><small>{{ options.caseSensitive ? '区分大小写' : '忽略大小写' }}</small></div>
    </section>

    <ToolGuide title="使用技巧">
      <div class="guide-grid">
        <div><strong>普通替换更直观</strong><span>输入内容会按纯文字匹配，替换值中的 $、\ 等字符也会原样保留。</span></div>
        <div><strong>正则处理结构化文本</strong><span>可用括号捕获内容，并在替换值中通过 $1、$2 调整顺序或格式。</span></div>
        <div><strong>逐步清洗复杂数据</strong><span>完成一次替换后选择“用结果继续处理”，可连续应用多组规则。</span></div>
      </div>
    </ToolGuide>
  </div>
</template>

<style scoped>
.replace-page {
  gap: 18px;
}
.workspace-card {
  padding: 24px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-card);
  background: var(--c-surface);
  box-shadow: var(--shadow-card);
}
.option-row, .workspace-footer {
  display: flex;
  align-items: center;
}
.workspace-footer {
  justify-content: space-between;
  gap: 18px;
}
.rule-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 30px minmax(0, 1fr);
  align-items: end;
  gap: 10px;
  margin-top: 22px;
}
.rule-grid label > span {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  color: var(--c-text-strong);
  font-size: 13px;
  font-weight: 650;
}
.rule-grid small {
  color: var(--c-text-muted);
  font-weight: 400;
}
.rule-arrow {
  padding-bottom: 9px;
  color: var(--c-text-muted);
  text-align: center;
}
.option-row {
  gap: 22px;
  margin-top: 15px;
  padding: 13px 15px;
  border-radius: var(--radius-md);
  background: var(--c-surface-subtle);
}
.regex-tip {
  margin-left: auto;
  color: var(--c-text-muted);
  font-size: 11px;
}
.error-banner {
  display: flex;
  gap: 10px;
  margin-top: 12px;
  padding: 11px 14px;
  border: 1px solid #fecaca;
  border-radius: var(--radius-md);
  color: #b91c1c;
  background: #fef2f2;
  font-size: 12px;
}
.editor-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 72px minmax(0, 1fr);
  gap: 12px;
  margin-top: 18px;
}
.editor-panel {
  overflow: hidden;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface-subtle);
}
.editor-panel.result-panel {
  border-color: #bfdbfe;
  background: #eff6ff;
}
.editor-panel.invalid {
  border-color: #fecaca;
  background: #fef2f2;
}
.editor-panel :deep(.el-textarea__inner) {
  border: 0;
  border-top: 1px solid var(--c-border);
  border-radius: 0;
  box-shadow: none;
  font: 13px/1.7 ui-monospace, SFMono-Regular, Menlo, monospace;
}
.result-panel :deep(.el-textarea__inner) {
  background: #f8fbff;
}
.direction-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--c-text-muted);
}
.match-badge {
  display: grid;
  width: 58px;
  height: 58px;
  place-items: center;
  align-content: center;
  border-radius: var(--radius-lg);
  color: #2563eb;
  background: #dbeafe;
}
.match-badge strong {
  font-size: 20px;
  line-height: 1;
}
.match-badge span {
  margin-top: 4px;
  font-size: 9px;
}
.workspace-footer {
  margin-top: 16px;
}
.sample-button {
  color: #2563eb;
  font-size: 12px;
}
.summary-card {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  padding: 0;
  overflow: hidden;
}
.summary-card > div {
  padding: 18px 20px;
  border-right: 1px solid var(--c-border);
}
.summary-card > div:last-child {
  border: 0;
}
.summary-card span, .summary-card strong, .summary-card small {
  display: block;
}
.summary-card span {
  color: var(--c-text-secondary);
  font-size: 11px;
}
.summary-card strong {
  margin-top: 5px;
  color: var(--c-text-primary);
  font-size: 22px;
}
.summary-card small {
  margin-top: 3px;
  color: var(--c-text-muted);
  font-size: 10px;
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
:global(html.dark .replace-page .workspace-card), :global(html.dark .replace-page .summary-card) {
  border-color: var(--c-border);
  background: var(--c-surface);
  box-shadow: none;
}
:global(html.dark .replace-page .rule-grid label > span), :global(html.dark .replace-page .summary-card strong), :global(html.dark .replace-page .guide-grid strong) {
  color: var(--c-text-primary);
}
:global(html.dark .replace-page .option-row), :global(html.dark .replace-page .editor-panel), :global(html.dark .replace-page .guide-grid div) {
  border-color: var(--c-border);
  background: var(--c-surface-subtle);
}
:global(html.dark .replace-page .result-panel) {
  border-color: #1e3a5f;
  background: #0d1d33;
}
:global(html.dark .replace-page .editor-panel .el-textarea__inner) {
  border-color: var(--c-border);
  background: #111c2f;
}
:global(html.dark .replace-page .summary-card > div) {
  border-color: var(--c-border);
}
@media (max-width: 820px) {
  .editor-grid {
    grid-template-columns: 1fr;
  }
  .direction-column {
    flex-direction: row;
  }
  .direction-column > .el-icon {
    transform: rotate(90deg);
  }
  .summary-card {
    grid-template-columns: repeat(2, 1fr);
  }
  .summary-card > div:nth-child(2) {
    border-right: 0;
  }
  .summary-card > div:nth-child(-n+2) {
    border-bottom: 1px solid var(--c-border);
  }
}
@media (max-width: 640px) {
  .workspace-card {
    padding: 18px;
  }
  .workspace-footer {
    align-items: stretch;
    flex-direction: column;
  }
  .rule-grid {
    grid-template-columns: 1fr;
  }
  .rule-arrow {
    padding: 0;
    transform: rotate(90deg);
  }
  .option-row {
    align-items: flex-start;
    flex-direction: column;
    gap: 5px;
  }
  .regex-tip {
    margin: 5px 0 0;
  }
  .workspace-footer > div {
    display: grid;
    gap: 8px;
  }
  .workspace-footer .el-button {
    width: 100%;
    margin: 0;
  }
  .guide-grid {
    grid-template-columns: 1fr;
  }
}
</style>
