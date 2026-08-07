<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Delete, Link, Promotion, RefreshRight, Switch } from '@element-plus/icons-vue'
import CopyButton from '@/components/Common/CopyButton.vue'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import SectionHeading from '@/components/Common/SectionHeading.vue'

type Mode = 'encode' | 'decode'
type Scope = 'component' | 'url'

const mode = ref<Mode>('encode')
const scope = ref<Scope>('component')
const input = ref('')
const output = ref('')
const errorMessage = ref('')

const examples = [
  { label: '中文参数', value: '杭州 西湖' },
  { label: '查询字符串', value: 'keyword=在线工具&sort=最新' },
  { label: '完整网址', value: 'https://example.com/search?q=中文 测试&from=tools' },
]

const inputBytes = computed(() => new TextEncoder().encode(input.value).length)
const outputBytes = computed(() => new TextEncoder().encode(output.value).length)
const actionLabel = computed(() => mode.value === 'encode' ? '开始编码' : '开始解码')
const inputPlaceholder = computed(() => mode.value === 'encode'
  ? '输入网址、查询参数或任意需要编码的文本'
  : '粘贴包含 %E4%B8%AD 一类转义字符的内容')

watch([mode, scope], () => {
  output.value = ''
  errorMessage.value = ''
})

watch(input, () => {
  if (errorMessage.value) errorMessage.value = ''
})

function transform() {
  errorMessage.value = ''
  if (!input.value) {
    output.value = ''
    errorMessage.value = '请先输入需要处理的内容'
    return
  }

  try {
    if (mode.value === 'encode') {
      output.value = scope.value === 'component' ? encodeURIComponent(input.value) : encodeURI(input.value)
    } else {
      output.value = scope.value === 'component' ? decodeURIComponent(input.value) : decodeURI(input.value)
    }
  } catch {
    output.value = ''
    errorMessage.value = '解码失败：内容中存在不完整或无效的百分号编码'
  }
}

function switchDirection() {
  if (output.value) input.value = output.value
  mode.value = mode.value === 'encode' ? 'decode' : 'encode'
  output.value = ''
  errorMessage.value = ''
}

function clearAll() {
  input.value = ''
  output.value = ''
  errorMessage.value = ''
}

function useExample(value: string) {
  input.value = value
  mode.value = 'encode'
  transform()
}
</script>

<template>
  <div class="url-page flex flex-col mt-3 flex-1">
    <ToolHero />

    <section class="workspace-card">
      <div class="mode-panel">
        <SectionHeading :icon="Link" title="选择处理方式" description="组件模式会编码保留字符，完整 URL 模式保留路径结构" tone="blue" />

        <div class="mode-controls">
          <el-radio-group v-model="mode">
            <el-radio-button value="encode">URL 编码</el-radio-button>
            <el-radio-button value="decode">URL 解码</el-radio-button>
          </el-radio-group>
          <el-radio-group v-model="scope">
            <el-radio-button value="component">参数 / 文本</el-radio-button>
            <el-radio-button value="url">完整 URL</el-radio-button>
          </el-radio-group>
        </div>
      </div>

      <div class="editor-grid">
        <article class="editor-panel">
          <div class="editor-header">
            <div>
              <strong>输入内容</strong>
              <span>{{ input.length }} 字符 · {{ inputBytes }} Bytes</span>
            </div>
            <el-button text :icon="Delete" @click="clearAll">清空</el-button>
          </div>
          <el-input v-model="input" type="textarea" :rows="10" resize="none" :placeholder="inputPlaceholder" />
        </article>

        <div class="direction-column">
          <el-button type="primary" :icon="Promotion" round @click="transform">{{ actionLabel }}</el-button>
          <el-button :icon="Switch" circle title="交换方向" aria-label="交换方向" @click="switchDirection" />
        </div>

        <article class="editor-panel result-panel" :class="{ error: errorMessage }">
          <div class="editor-header">
            <div>
              <strong>处理结果</strong>
              <span>{{ output.length }} 字符 · {{ outputBytes }} Bytes</span>
            </div>
            <CopyButton text-btn :text="output" :disabled="!output" />
          </div>
          <div v-if="errorMessage" class="editor-message error-message">{{ errorMessage }}</div>
          <div v-else-if="!output" class="editor-message">
            <el-icon><RefreshRight /></el-icon>
            <span>点击“{{ actionLabel }}”后在这里查看结果</span>
          </div>
          <el-input v-else v-model="output" type="textarea" :rows="10" resize="none" readonly />
        </article>
      </div>

      <div class="example-row">
        <span>试试示例</span>
        <button v-for="item in examples" :key="item.label" type="button" @click="useExample(item.value)">
          {{ item.label }}
        </button>
      </div>
    </section>

    <ToolGuide title="编码模式说明">
      <div class="detail-grid">
        <div>
          <h4>参数 / 文本模式</h4>
          <p>使用 encodeURIComponent / decodeURIComponent，适合查询参数值、表单字段和普通文本。</p>
        </div>
        <div>
          <h4>完整 URL 模式</h4>
          <p>使用 encodeURI / decodeURI，会保留 : / ? & = # 等网址结构字符，适合处理整条链接。</p>
        </div>
        <div>
          <h4>隐私说明</h4>
          <p>所有转换均在本地浏览器中完成，不会上传输入的网址或参数内容。</p>
        </div>
      </div>
    </ToolGuide>
  </div>
</template>

<style scoped>
.url-page {
  gap: 18px;
}

.workspace-card {
  padding: 24px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-card);
  background: var(--c-surface);
  box-shadow: var(--shadow-card);
}

.mode-panel, .mode-controls, .editor-header, .example-row {display: flex;
  align-items: center;}

.mode-panel {
  justify-content: space-between;
  gap: 18px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--c-border);
}



.mode-controls {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.editor-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 116px minmax(0, 1fr);
  gap: 14px;
  margin-top: 22px;
}

.editor-panel {
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  background: var(--c-surface-subtle);
}

.editor-panel.result-panel {
  border-color: #bfdbfe;
  background: #f8fbff;
}

.editor-panel.error {
  border-color: #fecaca;
  background: #fff8f8;
}

.editor-header {
  min-height: 32px;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.editor-header strong,
.editor-header span {
  display: block;
}

.editor-header strong {
  color: #1e293b;
  font-size: 14px;
}

.editor-header span {
  margin-top: 2px;
  color: var(--c-text-muted);
  font-size: 11px;
}

.editor-panel :deep(.el-textarea__inner) {
  min-height: 250px !important;
  border-radius: var(--radius-sm);
  color: #1e293b;
  background: var(--c-surface);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  line-height: 1.65;
  box-shadow: 0 0 0 1px #dbe3ef inset;
}

.direction-column {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 12px;
}

.direction-column :deep(.el-button + .el-button) {
  margin-left: 0;
}

.editor-message {
  display: flex;
  min-height: 250px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 9px;
  border: 1px dashed #bfdbfe;
  border-radius: var(--radius-sm);
  color: var(--c-text-muted);
  text-align: center;
}

.editor-message .el-icon {
  font-size: 28px;
}

.error-message {
  padding: 20px;
  border-color: #fecaca;
  color: #dc2626;
}

.example-row {
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.example-row > span {
  margin-right: 2px;
  color: var(--c-text-secondary);
  font-size: 13px;
}

.example-row button {
  padding: 6px 11px;
  border: 1px solid #dbeafe;
  border-radius: var(--radius-full);
  color: #2563eb;
  background: #eff6ff;
  font-size: 12px;
  cursor: pointer;
}

.example-row button:hover {
  border-color: #60a5fa;
  background: #dbeafe;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 22px;
}

.detail-grid h4 {
  margin: 0 0 6px;
  color: #1e293b;
}

.detail-grid p {
  margin: 0;
  color: var(--c-text-secondary);
  line-height: 1.7;
}

:global(html.dark .url-page .workspace-card) {
  border-color: var(--c-border);
  background: var(--c-surface-subtle);
  box-shadow: none;
}

:global(html.dark .url-page .mode-panel) {
  border-color: var(--c-border);
}

:global(html.dark .url-page .editor-header strong),
:global(html.dark .url-page .detail-grid h4) {
  color: #f1f5f9;
}

:global(html.dark .url-page .editor-panel) {
  border-color: var(--c-border);
  background: #111c2f;
}

:global(html.dark .url-page .editor-panel.result-panel) {
  border-color: #1e3a5f;
  background: #0d1d33;
}

:global(html.dark .url-page .editor-panel.error) {
  border-color: #7f1d1d;
  background: #2b1217;
}

:global(html.dark .url-page .editor-panel .el-textarea__inner) {
  color: var(--c-text-primary);
  background: #0b1324;
  box-shadow: 0 0 0 1px #334155 inset;
}

:global(html.dark .url-page .editor-message) {
  border-color: var(--c-border);
  color: var(--c-text-secondary);
}

:global(html.dark .url-page .error-message) {
  border-color: #7f1d1d;
  color: #fca5a5;
}@media (max-width: 900px) {
  .mode-panel {
    align-items: flex-start;
    flex-direction: column;
  }

  .mode-controls {
    width: 100%;
    justify-content: flex-start;
  }

  .editor-grid {
    grid-template-columns: 1fr;
  }

  .direction-column {
    flex-direction: row;
  }}@media (max-width: 640px) {
  .workspace-card {
    padding: 18px;
    border-radius: var(--radius-lg);
  }

  .mode-controls {
    align-items: stretch;
    flex-direction: column;
  }

  .mode-controls :deep(.el-radio-group) {
    width: 100%;
  }

  .mode-controls :deep(.el-radio-button) {
    flex: 1;
  }

  .mode-controls :deep(.el-radio-button__inner) {
    width: 100%;
  }

  .editor-panel :deep(.el-textarea__inner),
  .editor-message {
    min-height: 210px !important;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }}</style>
