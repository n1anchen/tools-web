<script setup lang="ts">
import { computed, ref } from 'vue'
import { Connection, Grid, MagicStick } from '@element-plus/icons-vue'
import CopyButton from '@/components/Common/CopyButton.vue'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import SectionHeading from '@/components/Common/SectionHeading.vue'
import PanelHeading from '@/components/Common/PanelHeading.vue'
import SplitWorkspace from '@/components/Common/SplitWorkspace.vue'
import SwapButton from '@/components/Common/SwapButton.vue'
import { decodeUnicode, encodeUnicode, type UnicodeFormat } from '@/utils/textTools'

type Mode = 'encode' | 'decode'

const mode = ref<Mode>('encode')
const input = ref('')
const format = ref<UnicodeFormat>('javascript')
const escapeAll = ref(false)
const uppercase = ref(false)

const output = computed(() => mode.value === 'encode'
  ? encodeUnicode(input.value, { format: format.value, escapeAll: escapeAll.value, uppercase: uppercase.value })
  : decodeUnicode(input.value))

const inputBytes = computed(() => new TextEncoder().encode(input.value).length)
const outputBytes = computed(() => new TextEncoder().encode(output.value).length)
const currentCharacters = computed(() => Array.from(mode.value === 'encode' ? input.value : output.value))
const characterRows = computed(() => currentCharacters.value.slice(0, 10).map(char => ({
  char: /\s/u.test(char) ? (char === ' ' ? '空格' : char === '\n' ? '换行' : '空白') : char,
  codePoint: `U+${(char.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, '0')}`,
  utf16: encodeUnicode(char, { format: 'javascript', escapeAll: true, uppercase: true }),
})))

const samples = [
  { label: '中文与 Emoji', mode: 'encode' as Mode, value: '你好，工具箱 😀' },
  { label: '\\u 转义', mode: 'decode' as Mode, value: '\\u4F60\\u597D\\uFF0C\\u5DE5\\u5177\\u7BB1 \\uD83D\\uDE00' },
  { label: '码点格式', mode: 'decode' as Mode, value: '\\u{4F60}\\u{597D} \\u{1F680}' },
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
  <div class="unicode-page flex flex-col mt-3 flex-1">
    <ToolHero />

    <section class="workspace-card">
      <SectionHeading :icon="Connection" title="Unicode 编码转换" description="支持 JavaScript 转义、Unicode 码点和 Emoji" tone="blue">
        <template #actions>
          <el-radio-group v-model="mode">
            <el-radio-button value="encode">文本 → Unicode</el-radio-button>
            <el-radio-button value="decode">Unicode → 文本</el-radio-button>
          </el-radio-group>
        </template>
      </SectionHeading>

      <div v-if="mode === 'encode'" class="option-row">
        <label>
          <span>输出格式</span>
          <el-radio-group v-model="format">
            <el-radio-button value="javascript">JavaScript \uXXXX</el-radio-button>
            <el-radio-button value="codePoint">码点 \u&#123;...&#125;</el-radio-button>
          </el-radio-group>
        </label>
        <el-checkbox v-model="escapeAll">同时转换 ASCII 字符</el-checkbox>
        <el-checkbox v-model="uppercase">十六进制使用大写</el-checkbox>
      </div>

      <SplitWorkspace :actions-width="72" :gap="12" :margin-top="18" :collapse="900">
        <template #input>
          <article class="editor-panel">
            <PanelHeading :title="mode === 'encode' ? '原始文本' : 'Unicode 内容'" :stats="`${input.length} 字符 · ${inputBytes} Bytes`">
              <template #actions><el-button text @click="input = ''">清空</el-button></template>
            </PanelHeading>
            <el-input
              v-model="input"
              type="textarea"
              :rows="10"
              resize="none"
              :placeholder="mode === 'encode' ? '输入中文、英文或 Emoji' : '输入 \\u4F60\\u597D 或 \\u{1F600}'"
            />
          </article>
        </template>

        <template #actions>
          <el-icon><MagicStick /></el-icon>
          <SwapButton @click="switchDirection" />
        </template>

        <template #output>
          <article class="editor-panel result-panel">
            <PanelHeading title="转换结果" :stats="`${output.length} 字符 · ${outputBytes} Bytes`">
              <template #actions><CopyButton text-btn :text="output" :disabled="!output" /></template>
            </PanelHeading>
            <el-input :model-value="output" type="textarea" :rows="10" resize="none" readonly placeholder="转换结果会实时显示" />
          </article>
        </template>
      </SplitWorkspace>

      <div class="sample-row">
        <span>快速示例</span>
        <button v-for="sample in samples" :key="sample.label" type="button" @click="useSample(sample)">{{ sample.label }}</button>
      </div>
    </section>

    <section class="inspector-card">
      <SectionHeading :icon="Grid" title="字符码点检查" description="显示前 10 个转换后字符的码点和 UTF-16 表示" tone="green" />

      <div v-if="characterRows.length" class="character-grid">
        <article v-for="(row, index) in characterRows" :key="`${row.codePoint}-${index}`">
          <div class="character">{{ row.char }}</div>
          <strong>{{ row.codePoint }}</strong>
          <code>{{ row.utf16 }}</code>
        </article>
      </div>
      <div v-else class="empty-inspector">输入内容后查看每个字符对应的 Unicode 码点</div>
    </section>

    <ToolGuide title="格式说明">
      <div class="detail-grid">
        <div><h4>JavaScript 转义</h4><p>基本平面字符使用 \uXXXX；Emoji 等增补平面字符会输出为一对 UTF-16 代理项。</p></div>
        <div><h4>Unicode 码点</h4><p>使用 \u&#123;1F600&#125; 形式直接表示完整码点，可读性更好，但需要目标环境支持。</p></div>
        <div><h4>解码兼容</h4><p>解码同时识别 \uXXXX、UTF-16 代理项和 \u&#123;...&#125; 三种常见写法。</p></div>
      </div>
    </ToolGuide>
  </div>
</template>

<style scoped>
.unicode-page { gap: 18px; }
.workspace-card {padding: 24px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-card);
  background: var(--c-surface);
  box-shadow: var(--shadow-card);}
.option-row, .sample-row {display: flex; align-items: center;}

.option-row {
  flex-wrap: wrap;
  gap: 12px 22px;
  margin-top: 18px;
  padding: 13px 15px;
  border-radius: var(--radius-md);
  background: var(--c-surface-subtle);
}
.option-row label { display: flex; align-items: center; gap: 10px; }
.option-row label > span { color: var(--c-text-body); font-size: 12px; font-weight: 650; }
.editor-panel {
  min-width: 0;
  padding: 15px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  background: var(--c-surface-subtle);
}
.result-panel { border-color: var(--c-primary-200); background: #f8fbff; }
.editor-panel :deep(.el-textarea__inner) {
  min-height: 250px !important;
  border-radius: var(--radius-sm);
  color: #1e293b;
  background: var(--c-surface);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  line-height: 1.7;
  box-shadow: 0 0 0 1px #dbe3ef inset;
}
.unicode-page :deep(.split-actions .el-icon) { color: var(--c-primary); font-size: 24px; }
.sample-row { flex-wrap: wrap; gap: 8px; margin-top: 14px; }
.sample-row > span { color: var(--c-text-secondary); font-size: 12px; }
.sample-row button {
  padding: 6px 11px;
  border: 1px solid var(--c-primary-100);
  border-radius: var(--radius-full);
  color: var(--c-primary);
  background: var(--c-primary-50);
  font-size: 12px;
  cursor: pointer;
}
.sample-row button:hover { border-color: var(--c-primary-400); background: var(--c-primary-100); }
.character-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  margin-top: 20px;
}
.character-grid article {
  min-width: 0;
  padding: 13px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface-subtle);
}
.character {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: var(--radius-sm);
  color: var(--c-primary-700);
  background: var(--c-primary-100);
  font-size: 18px;
  font-weight: 700;
}
.character-grid strong,
.character-grid code { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.character-grid strong { margin-top: 10px; color: #1e293b; font-size: 13px; }
.character-grid code { margin-top: 3px; color: var(--c-text-secondary); font-size: 11px; }
.empty-inspector {
  margin-top: 18px;
  padding: 34px 20px;
  border: 1px dashed #cbd5e1;
  border-radius: var(--radius-md);
  color: var(--c-text-muted);
  background: var(--c-surface-subtle);
  text-align: center;
}
.detail-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 22px; }
.detail-grid h4 { margin: 0 0 6px; color: #1e293b; }
.detail-grid p { margin: 0; color: var(--c-text-secondary); line-height: 1.7; }

:global(html.dark .unicode-page .workspace-card),
:global(html.dark .unicode-page .inspector-card) { border-color: var(--c-border); background: var(--c-surface-subtle); box-shadow: none; }
:global(html.dark .unicode-page .detail-grid h4) { color: #f1f5f9; }
:global(html.dark .unicode-page .option-row),
:global(html.dark .unicode-page .editor-panel),
:global(html.dark .unicode-page .character-grid article),
:global(html.dark .unicode-page .empty-inspector) { border-color: var(--c-border); background: #111c2f; }
:global(html.dark .unicode-page .result-panel) { border-color: #1e3a5f; background: #0d1d33; }
:global(html.dark .unicode-page .editor-panel .el-textarea__inner) {
  color: var(--c-text-primary);
  background: #0b1324;
  box-shadow: 0 0 0 1px #334155 inset;
}
:global(html.dark .unicode-page .character-grid strong) { color: var(--c-text-primary); }@media (max-width: 1000px) {
  .character-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }}@media (max-width: 640px) {
  .workspace-card,
  .inspector-card { padding: 18px; border-radius: var(--radius-lg); }
  .option-row { align-items: flex-start; flex-direction: column; }
  .option-row label { align-items: flex-start; flex-direction: column; width: 100%; }
  .option-row :deep(.el-radio-group) { width: 100%; }
  .option-row :deep(.el-radio-button) { flex: 1; }
  .option-row :deep(.el-radio-button__inner) { width: 100%; font-size: 12px; }
  .editor-panel :deep(.el-textarea__inner) { min-height: 215px !important; }
  .character-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .detail-grid { grid-template-columns: 1fr; }}</style>
