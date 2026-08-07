<script setup lang="ts">
import { computed, ref } from 'vue'
import { Connection, Document, Grid, Lock, Switch } from '@element-plus/icons-vue'
import CopyButton from '@/components/Common/CopyButton.vue'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import SectionHeading from '@/components/Common/SectionHeading.vue'
import PanelHeading from '@/components/Common/PanelHeading.vue'
import { copy } from '@/utils/string'
import { countHtmlEntityChanges, decodeHtmlEntities, encodeHtmlEntities } from '@/utils/textTools'

type Mode = 'encode' | 'decode'

const mode = ref<Mode>('encode')
const input = ref('')
const encodeNonAscii = ref(false)

const output = computed(() => mode.value === 'encode'
  ? encodeHtmlEntities(input.value, encodeNonAscii.value)
  : decodeHtmlEntities(input.value))

const entityPattern = /&(?:#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi
const changeCount = computed(() => mode.value === 'encode'
  ? countHtmlEntityChanges(input.value, output.value)
  : (input.value.match(entityPattern) ?? []).length)

const referenceEntities = [
  { char: '&', entity: '&amp;', meaning: '与号' },
  { char: '<', entity: '&lt;', meaning: '小于号' },
  { char: '>', entity: '&gt;', meaning: '大于号' },
  { char: '"', entity: '&quot;', meaning: '双引号' },
  { char: "'", entity: '&#39;', meaning: '单引号' },
  { char: '空格', entity: '&nbsp;', meaning: '不换行空格' },
]

const samples = [
  { label: 'HTML 标签', mode: 'encode' as Mode, value: '<div class="notice">杭州 & 西湖</div>' },
  { label: '常用实体', mode: 'decode' as Mode, value: '&lt;strong&gt;Tom &amp; Jerry&lt;/strong&gt;' },
  { label: '数字实体', mode: 'decode' as Mode, value: '&#20013;&#25991; &#x1F600;' },
]

function switchDirection() {
  if (output.value) input.value = output.value
  mode.value = mode.value === 'encode' ? 'decode' : 'encode'
}

function useSample(sample: typeof samples[number]) {
  mode.value = sample.mode
  input.value = sample.value
}
</script>

<template>
  <div class="entity-page flex flex-col mt-3 flex-1">
    <ToolHero />

    <section class="workspace-card">
      <SectionHeading :icon="Document" title="HTML 实体转换" description="安全处理标签、引号、与号以及数字实体" tone="pink">
        <template #actions>
          <el-radio-group v-model="mode">
            <el-radio-button value="encode">HTML → 实体</el-radio-button>
            <el-radio-button value="decode">实体 → 文本</el-radio-button>
          </el-radio-group>
        </template>
      </SectionHeading>

      <div class="status-row">
        <el-checkbox v-if="mode === 'encode'" v-model="encodeNonAscii">中文和 Emoji 也转换为十六进制实体</el-checkbox>
        <span><strong>{{ changeCount }}</strong> 个实体{{ mode === 'encode' ? '已生成' : '已识别' }}</span>
      </div>

      <div class="editor-grid">
        <article class="editor-panel">
          <PanelHeading :title="mode === 'encode' ? 'HTML / 普通文本' : '实体内容'" :stats="`${input.length} 字符`">
            <template #actions><el-button text @click="input = ''">清空</el-button></template>
          </PanelHeading>
          <el-input
            v-model="input"
            type="textarea"
            :rows="10"
            resize="none"
            :placeholder="mode === 'encode' ? '输入需要安全显示的 HTML 或文本' : '输入 &lt;div&gt;、&#20013; 等实体'"
          />
        </article>

        <div class="direction-column">
          <el-icon><Connection /></el-icon>
          <el-button :icon="Switch" circle title="交换输入输出" aria-label="交换输入输出" @click="switchDirection" />
        </div>

        <article class="editor-panel result-panel">
          <PanelHeading title="转换结果" :stats="`${output.length} 字符`">
            <template #actions><CopyButton text-btn :text="output" :disabled="!output" /></template>
          </PanelHeading>
          <el-input :model-value="output" type="textarea" :rows="10" resize="none" readonly placeholder="转换结果会实时显示" />
        </article>
      </div>

      <div class="sample-row">
        <span>快速示例</span>
        <button v-for="sample in samples" :key="sample.label" type="button" @click="useSample(sample)">{{ sample.label }}</button>
      </div>
    </section>

    <section class="reference-card">
      <SectionHeading :icon="Grid" title="常用实体对照" description="点击任意实体即可复制" tone="green">
        <template #actions>
          <div class="safety-badge"><el-icon><Lock /></el-icon> 结果仅以纯文本显示</div>
        </template>
      </SectionHeading>

      <div class="entity-grid">
        <button v-for="item in referenceEntities" :key="item.entity" type="button" @click="copy(item.entity)">
          <span class="entity-char">{{ item.char }}</span>
          <code>{{ item.entity }}</code>
          <small>{{ item.meaning }}</small>
        </button>
      </div>
    </section>

    <ToolGuide title="使用说明">
      <div class="detail-grid">
        <div><h4>HTML 转实体</h4><p>将 &、&lt;、&gt;、单双引号转换为安全实体，适合展示代码片段或避免文本被当作标签解析。</p></div>
        <div><h4>实体转文本</h4><p>支持常用命名实体、十进制数字实体与十六进制数字实体，未知实体会原样保留。</p></div>
        <div><h4>安全显示</h4><p>输入和输出始终使用只读文本框呈现，不会把转换后的标签插入页面执行。</p></div>
      </div>
    </ToolGuide>
  </div>
</template>

<style scoped>
.entity-page { gap: 18px; }
.workspace-card {padding: 24px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-card);
  background: var(--c-surface);
  box-shadow: var(--shadow-card);}
.status-row, .sample-row, .safety-badge {display: flex; align-items: center;}
.status-row {
  min-height: 43px;
  justify-content: space-between;
  gap: 12px;
  margin-top: 17px;
  padding: 9px 13px;
  border-radius: var(--radius-sm);
  color: var(--c-text-secondary);
  background: var(--c-surface-subtle);
  font-size: 12px;
}
.status-row > span { margin-left: auto; }
.status-row strong { color: #db2777; font-size: 15px; }
.editor-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 72px minmax(0, 1fr);
  gap: 12px;
  margin-top: 16px;
}
.editor-panel {
  min-width: 0;
  padding: 15px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  background: var(--c-surface-subtle);
}
.result-panel { border-color: #fbcfe8; background: #fffafd; }
.editor-panel .el-textarea__inner { min-height: 220px !important; }
.editor-panel :deep(.el-textarea__inner) {
  min-height: 250px !important;
  border-radius: var(--radius-sm);
  color: #1e293b;
  background: var(--c-surface);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  line-height: 1.7;
  box-shadow: 0 0 0 1px #dbe3ef inset;
}
.direction-column {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  color: #db2777;
}
.direction-column > .el-icon { font-size: 24px; }
.sample-row { flex-wrap: wrap; gap: 8px; margin-top: 14px; }
.sample-row > span { color: var(--c-text-secondary); font-size: 12px; }
.sample-row button {
  padding: 6px 11px;
  border: 1px solid #fbcfe8;
  border-radius: var(--radius-full);
  color: #be185d;
  background: #fdf2f8;
  font-size: 12px;
  cursor: pointer;
}
.sample-row button:hover { border-color: #f472b6; background: #fce7f3; }
.safety-badge {
  gap: 6px;
  padding: 7px 11px;
  border-radius: var(--radius-full);
  color: #047857;
  background: #ecfdf5;
  font-size: 12px;
  white-space: nowrap;
}
.entity-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
  margin-top: 20px;
}
.entity-grid button {
  min-width: 0;
  padding: 15px 10px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  color: inherit;
  background: var(--c-surface-subtle);
  cursor: pointer;
  transition: 0.2s ease;
}
.entity-grid button:hover { border-color: #f9a8d4; box-shadow: 0 8px 16px rgba(219, 39, 119, 0.08); transform: translateY(-2px); }
.entity-char,
.entity-grid code,
.entity-grid small { display: block; }
.entity-char { color: #be185d; font-size: 20px; font-weight: 700; }
.entity-grid code { margin-top: 8px; color: var(--c-text-strong); font-size: 12px; }
.entity-grid small { margin-top: 4px; color: var(--c-text-muted); font-size: 10px; }
.detail-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 22px; }
.detail-grid h4 { margin: 0 0 6px; color: #1e293b; }
.detail-grid p { margin: 0; color: var(--c-text-secondary); line-height: 1.7; }

:global(html.dark .entity-page .workspace-card),
:global(html.dark .entity-page .reference-card) { border-color: var(--c-border); background: var(--c-surface-subtle); box-shadow: none; }
:global(html.dark .entity-page .detail-grid h4) { color: #f1f5f9; }
:global(html.dark .entity-page .status-row),
:global(html.dark .entity-page .editor-panel),
:global(html.dark .entity-page .entity-grid button) { border-color: var(--c-border); background: #111c2f; }
:global(html.dark .entity-page .result-panel) { border-color: #831843; background: #2b1020; }
:global(html.dark .entity-page .editor-panel .el-textarea__inner) {
  color: var(--c-text-primary);
  background: #0b1324;
  box-shadow: 0 0 0 1px #334155 inset;
}
:global(html.dark .entity-page .entity-grid code) { color: var(--c-text-primary); }@media (max-width: 1000px) {
  .entity-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }}@media (max-width: 900px) {
  .editor-grid { grid-template-columns: 1fr; }
  .direction-column { flex-direction: row; }}@media (max-width: 640px) {
  .workspace-card,
  .reference-card { padding: 18px; border-radius: var(--radius-lg); }
  .status-row,
  .status-row > span { margin-left: 0; }
  .editor-panel :deep(.el-textarea__inner) { min-height: 215px !important; }
  .entity-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .detail-grid { grid-template-columns: 1fr; }}</style>
