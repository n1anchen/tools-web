<script setup lang="ts">
import { computed, ref } from 'vue'
import { CopyDocument, Delete, Download, RefreshLeft, Search } from '@element-plus/icons-vue'
import AceEditor from '@/components/Common/AceEditor.vue'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import { autoDown } from '@/utils/file'
import { copy } from '@/utils/string'
import { getCodeMetrics } from '@/utils/codeWorkbench'

export interface WorkbenchSample {
  label: string
  note: string
  value: string
}

export interface WorkbenchMetric {
  label: string
  value: string | number
}

export interface WorkbenchTip {
  title: string
  description: string
}

const props = withDefaults(defineProps<{
  modelValue: string
  eyebrow: string
  headline: string
  language: string
  mode: string
  accent?: 'blue' | 'violet' | 'orange' | 'cyan'
  status: string
  statusTone?: 'idle' | 'success' | 'error' | 'working'
  statusDetail?: string
  samples: WorkbenchSample[]
  metrics: WorkbenchMetric[]
  tips: WorkbenchTip[]
  primaryLabel: string
  secondaryLabel?: string
  canRestore?: boolean
  busy?: boolean
  filename: string
  tabSize?: number
}>(), {
  accent: 'blue',
  statusTone: 'idle',
  statusDetail: '',
  secondaryLabel: '',
  canRestore: false,
  busy: false,
  tabSize: 2,
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
  (event: 'primary'): void
  (event: 'secondary'): void
  (event: 'restore'): void
  (event: 'clear'): void
  (event: 'sample', sample: WorkbenchSample): void
}>()

const editorRef = ref<InstanceType<typeof AceEditor>>()
const showWhitespace = ref(false)
const showLineNumbers = ref(true)
const wordWrap = ref(true)
const code = computed({ get: () => props.modelValue, set: value => emit('update:modelValue', value) })
const sourceMetrics = computed(() => getCodeMetrics(code.value))

function toggleWhitespace() {
  showWhitespace.value = !showWhitespace.value
  editorRef.value?.toggleWhitespace()
}

function toggleLineNumbers() {
  showLineNumbers.value = !showLineNumbers.value
  editorRef.value?.toggleLineNumbers()
}

function toggleWordWrap() {
  wordWrap.value = !wordWrap.value
  editorRef.value?.toggleWordWrap()
}

async function copyCode() {
  if (!code.value) return
  await copy(code.value)
}

function downloadCode() {
  if (!code.value) return
  const url = URL.createObjectURL(new Blob([code.value], { type: 'text/plain;charset=utf-8' }))
  autoDown(url, props.filename)
}

function formatEditor() {
  editorRef.value?.formatCode()
}

function openSearchBox() {
  editorRef.value?.openSearchBox()
}

defineExpose({ formatEditor, openSearchBox })
</script>

<template>
  <div :class="['code-workbench-page', `accent-${accent}`, 'flex', 'flex-col', 'mt-3', 'flex-1']">
    <ToolHero :summary="headline" />

    <section class="sample-card">
      <span>载入示例</span>
      <button v-for="sample in samples" :key="sample.label" @click="emit('sample', sample)"><strong>{{ sample.label }}</strong><small>{{ sample.note }}</small></button>
    </section>

    <section class="workspace">
      <article class="editor-card">
        <div class="editor-heading">
          <div><span :class="['status-dot', statusTone]" /><strong>{{ status }}</strong><small v-if="statusDetail">{{ statusDetail }}</small></div>
          <div class="utility-actions">
            <el-button :icon="RefreshLeft" :disabled="!canRestore" @click="emit('restore')">撤回</el-button>
            <el-button :icon="CopyDocument" :disabled="!code" @click="copyCode">复制</el-button>
            <el-button :icon="Download" :disabled="!code" @click="downloadCode">导出</el-button>
          </div>
        </div>
        <AceEditor
          ref="editorRef"
          v-model="code"
          :mode="mode"
          :tab-size="tabSize"
          :show-whitespace="showWhitespace"
          :show-line-numbers="showLineNumbers"
          :word-wrap="wordWrap"
          height="500px"
        />
        <div class="editor-footer">
          <div><span>{{ sourceMetrics.lines }} 行</span><span>{{ sourceMetrics.characters }} 字符</span><span>{{ sourceMetrics.bytes }} Bytes</span><span>{{ sourceMetrics.nonEmptyLines }} 有效行</span></div>
          <div>
            <button :class="{ active: showLineNumbers }" @click="toggleLineNumbers">行号</button>
            <button :class="{ active: wordWrap }" @click="toggleWordWrap">换行</button>
            <button :class="{ active: showWhitespace }" @click="toggleWhitespace">空白</button>
            <button aria-label="搜索" @click="openSearchBox"><el-icon><Search /></el-icon></button>
          </div>
        </div>
      </article>

      <aside class="settings-card">
        <div class="section-heading"><div><span class="eyebrow">WORKBENCH SETTINGS</span><h3>处理设置</h3></div><span>{{ language }}</span></div>
        <div class="options"><slot name="options" /></div>
        <div class="main-actions">
          <el-button type="primary" size="large" :loading="busy" @click="emit('primary')">{{ primaryLabel }}</el-button>
          <el-button v-if="secondaryLabel" size="large" :disabled="busy" @click="emit('secondary')">{{ secondaryLabel }}</el-button>
          <el-button link type="danger" :icon="Delete" @click="emit('clear')">清空</el-button>
        </div>
        <slot name="aside-footer" />
      </aside>
    </section>

    <section class="metric-strip"><div v-for="metric in metrics" :key="metric.label"><span>{{ metric.label }}</span><strong>{{ metric.value }}</strong></div></section>

    <section class="tips-grid"><article v-for="(tip, index) in tips" :key="tip.title"><span>0{{ index + 1 }}</span><div><strong>{{ tip.title }}</strong><p>{{ tip.description }}</p></div></article></section>

    <ToolGuide title="使用说明"><slot name="usage" /></ToolGuide>
  </div>
</template>

<style scoped>
.code-workbench-page { --accent: #2563eb; --accent-soft: #eff6ff; --accent-border: #bfdbfe; gap: 16px; }.accent-violet { --accent: #7c3aed; --accent-soft: #f5f3ff; --accent-border: #ddd6fe; }.accent-orange { --accent: #ea580c; --accent-soft: #fff7ed; --accent-border: #fed7aa; }.accent-cyan { --accent: #0891b2; --accent-soft: #ecfeff; --accent-border: #a5f3fc; }.sample-card, .editor-card, .settings-card, .metric-strip, .tips-grid article { border: 1px solid var(--c-border); border-radius: 22px; background: #fff; box-shadow: 0 12px 35px rgb(15 23 42 / 6%); }.eyebrow { color: var(--accent); font-size:12px; font-weight: 800; letter-spacing: .15em; }.sample-card { display: flex; align-items: center; gap: 7px; padding: 10px 13px; overflow-x: auto; }.sample-card > span { flex: none; color: var(--c-text-muted); font-size:12px; }.sample-card button { display: flex; align-items: flex-start; flex-direction: column; flex: none; padding: 6px 9px; border: 1px solid var(--c-border); border-radius: 9px; color: var(--c-text-body); background: var(--c-surface-subtle); cursor: pointer; }.sample-card strong { font-size:12px; }.sample-card small { color: var(--c-text-muted); font-size:12px; }
.workspace { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(285px, .55fr); align-items: start; gap: 16px; }.editor-card { min-width: 0; overflow: hidden; }.editor-heading { display: flex; min-height: 58px; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 13px; }.editor-heading > div:first-child { display: flex; min-width: 0; align-items: center; gap: 7px; }.editor-heading strong { color: var(--c-text-body); font-size:12px; }.editor-heading small { overflow: hidden; color: var(--c-text-muted); text-overflow: ellipsis; font-size:12px; white-space: nowrap; }.status-dot { width: 8px; height: 8px; flex: none; border-radius: 50%; background: #94a3b8; }.status-dot.success { background: #22c55e; box-shadow: 0 0 0 4px #dcfce7; }.status-dot.error { background: #ef4444; box-shadow: 0 0 0 4px #fee2e2; }.status-dot.working { background: #f59e0b; animation: blink 1s ease infinite; }.utility-actions { display: flex; flex: none; }.editor-card :deep(.ace-editor) { border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; }.editor-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 12px; }.editor-footer > div { display: flex; align-items: center; gap: 5px; }.editor-footer span { padding: 3px 6px; border-radius: 6px; color: var(--c-text-secondary); background: #f1f5f9; font-size:12px; }.editor-footer button { display: grid; min-width: 27px; height: 24px; place-items: center; border: 0; border-radius: 6px; color: var(--c-text-muted); background: transparent; font-size:12px; cursor: pointer; }.editor-footer button.active { color: var(--accent); background: var(--accent-soft); }
.settings-card { position: sticky; top: 14px; padding: 19px; }.section-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }.section-heading h3 { margin: 3px 0 0; color: var(--c-text-primary); font-size: 16px; }.section-heading > span { padding: 3px 6px; border-radius: 6px; color: var(--accent); background: var(--accent-soft); font-size:12px; font-weight: 700; }.options { display: flex; flex-direction: column; gap: 13px; margin-top: 17px; }.options :deep(.option-field) { display: flex; flex-direction: column; gap: 5px; }.options :deep(.option-field > span), .options :deep(.switch-field > span) { color: var(--c-text-secondary); font-size:12px; }.options :deep(.switch-field) { display: flex; align-items: center; justify-content: space-between; gap: 10px; }.options :deep(.el-select), .options :deep(.el-input-number) { width: 100%; }.main-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; margin-top: 18px; }.main-actions .el-button { margin: 0; }.main-actions .el-button:last-child { grid-column: 1 / -1; }.settings-card :deep(.notice-card) { margin-top: 13px; padding: 11px; border-radius: 12px; color: var(--c-text-secondary); background: var(--accent-soft); font-size:12px; line-height: 1.55; }.settings-card :deep(.notice-card.error) { color: #b91c1c; background: #fef2f2; }
.metric-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); padding: 10px 14px; }.metric-strip div { display: flex; align-items: center; flex-direction: column; padding: 7px 10px; border-right: 1px solid #e2e8f0; }.metric-strip div:last-child { border: 0; }.metric-strip span { color: var(--c-text-muted); font-size:12px; }.metric-strip strong { margin-top: 2px; color: #334155; font-size:12px; }.tips-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; }.tips-grid article { display: flex; gap: 10px; padding: 14px; border-radius: 15px; }.tips-grid article > span { display: grid; width: 31px; height: 31px; flex: none; place-items: center; border-radius: 9px; color: var(--accent); background: var(--accent-soft); font: 800 12px ui-monospace, monospace; }.tips-grid strong { color: #334155; font-size:12px; }.tips-grid p { margin: 3px 0 0; color: var(--c-text-secondary); font-size:12px; line-height: 1.55; }
:global(html.dark .code-workbench-page .sample-card), :global(html.dark .code-workbench-page .editor-card), :global(html.dark .code-workbench-page .settings-card), :global(html.dark .code-workbench-page .metric-strip), :global(html.dark .code-workbench-page .tips-grid article) { border-color: #334155; background: #1e293b; box-shadow: none; }:global(html.dark .code-workbench-page h2), :global(html.dark .code-workbench-page h3), :global(html.dark .code-workbench-page .metric-strip strong), :global(html.dark .code-workbench-page .tips-grid strong) { color: #f8fafc; }:global(html.dark .code-workbench-page .section-heading > span), :global(html.dark .code-workbench-page .editor-footer button.active), :global(html.dark .code-workbench-page .settings-card .notice-card) { border-color: color-mix(in srgb, var(--accent) 65%, #334155); color: #e2e8f0; background: color-mix(in srgb, var(--accent) 22%, #0f172a); }:global(html.dark .code-workbench-page .sample-card button), :global(html.dark .code-workbench-page .editor-footer span) { border-color: #334155; color: #cbd5e1; background: #0f172a; }:global(html.dark .code-workbench-page .editor-card .ace-editor), :global(html.dark .code-workbench-page .metric-strip div) { border-color: #334155; }
.sample-card { gap: 10px; padding: 13px 16px; }.sample-card > span { font-size: 13px; }.sample-card button { gap: 3px; padding: 10px 14px; }.sample-card strong { font-size: 14px; }.editor-heading strong { font-size: 13px; }.editor-footer span { font-size: 12px; }.editor-footer button { min-width: 32px; height: 28px; }.settings-card :deep(.notice-card) { font-size: 13px; line-height: 1.65; }.metric-strip { padding-block: 14px; }.metric-strip strong { margin-top: 4px; font-size: 14px; }.tips-grid article { padding: 17px; }.tips-grid article > span { width: 38px; height: 38px; }.tips-grid strong { font-size: 14px; }.tips-grid p { margin-top: 5px; font-size: 13px; line-height: 1.65; }
:global(html.dark .code-workbench-page .editor-heading strong), :global(html.dark .code-workbench-page .editor-heading small), :global(html.dark .code-workbench-page .sample-card > span), :global(html.dark .code-workbench-page .sample-card small), :global(html.dark .code-workbench-page .metric-strip span), :global(html.dark .code-workbench-page .tips-grid p), :global(html.dark .code-workbench-page .option-field > span), :global(html.dark .code-workbench-page .switch-field > span) { color: #cbd5e1; }
@keyframes blink { 50% { opacity: .32; } }
@media (max-width: 930px) { .workspace { grid-template-columns: 1fr; }.settings-card { position: static; } }
@media (max-width: 640px) { .editor-heading { align-items: flex-start; flex-direction: column; }.utility-actions { display: grid; width: 100%; grid-template-columns: repeat(3, 1fr); }.utility-actions .el-button { margin: 0; }.editor-card :deep(.ace-editor) { height: 410px !important; }.editor-footer { align-items: flex-start; flex-direction: column; }.editor-footer > div:last-child { align-self: flex-end; }.settings-card { padding: 17px; }.metric-strip { grid-template-columns: repeat(2, 1fr); }.metric-strip div { border-bottom: 1px solid #e2e8f0; }.tips-grid { grid-template-columns: 1fr; } }
</style>
