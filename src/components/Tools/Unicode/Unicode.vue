<script setup lang="ts">
import { computed, ref } from 'vue'
import { Connection, CopyDocument, Grid, MagicStick, Switch } from '@element-plus/icons-vue'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import { copy } from '@/utils/string'
import { decodeUnicode, encodeUnicode, type UnicodeFormat } from '@/utils/textTools'

type Mode = 'encode' | 'decode'

const title = 'Unicode转中文'
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
    <ToolHero :title="title" />

    <section class="workspace-card">
      <div class="settings-header">
        <div class="section-heading">
          <div class="heading-icon"><el-icon><Connection /></el-icon></div>
          <div>
            <h2>Unicode 编码转换</h2>
            <p>支持 JavaScript 转义、Unicode 码点和 Emoji</p>
          </div>
        </div>
        <el-segmented
          v-model="mode"
          :options="[
            { label: '文本 → Unicode', value: 'encode' },
            { label: 'Unicode → 文本', value: 'decode' },
          ]"
        />
      </div>

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

      <div class="editor-grid">
        <article class="editor-panel">
          <div class="editor-title">
            <div><strong>{{ mode === 'encode' ? '原始文本' : 'Unicode 内容' }}</strong><span>{{ input.length }} 字符 · {{ inputBytes }} Bytes</span></div>
            <el-button text @click="input = ''">清空</el-button>
          </div>
          <el-input
            v-model="input"
            type="textarea"
            :rows="10"
            resize="none"
            :placeholder="mode === 'encode' ? '输入中文、英文或 Emoji' : '输入 \\u4F60\\u597D 或 \\u{1F600}'"
          />
        </article>

        <div class="direction-column">
          <el-icon><MagicStick /></el-icon>
          <el-button :icon="Switch" circle title="交换输入输出" aria-label="交换输入输出" @click="switchDirection" />
        </div>

        <article class="editor-panel result-panel">
          <div class="editor-title">
            <div><strong>转换结果</strong><span>{{ output.length }} 字符 · {{ outputBytes }} Bytes</span></div>
            <el-button text :icon="CopyDocument" :disabled="!output" @click="copy(output)">复制</el-button>
          </div>
          <el-input :model-value="output" type="textarea" :rows="10" resize="none" readonly placeholder="转换结果会实时显示" />
        </article>
      </div>

      <div class="sample-row">
        <span>快速示例</span>
        <button v-for="sample in samples" :key="sample.label" type="button" @click="useSample(sample)">{{ sample.label }}</button>
      </div>
    </section>

    <section class="inspector-card">
      <div class="section-heading">
        <div class="heading-icon green"><el-icon><Grid /></el-icon></div>
        <div>
          <h2>字符码点检查</h2>
          <p>显示前 10 个转换后字符的码点和 UTF-16 表示</p>
        </div>
      </div>

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
.workspace-card,
.inspector-card {
  padding: 24px;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.05);
}
.settings-header,
.section-heading,
.option-row,
.editor-title,
.sample-row { display: flex; align-items: center; }
.settings-header { justify-content: space-between; gap: 18px; }
.section-heading { gap: 12px; }
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
.heading-icon.green { color: #059669; background: #ecfdf5; }
.section-heading h2 { margin: 0; color: #0f172a; font-size: 18px; }
.section-heading p { margin: 3px 0 0; color: #64748b; font-size: 13px; }
.option-row {
  flex-wrap: wrap;
  gap: 12px 22px;
  margin-top: 18px;
  padding: 13px 15px;
  border-radius: 12px;
  background: #f8fafc;
}
.option-row label { display: flex; align-items: center; gap: 10px; }
.option-row label > span { color: #475569; font-size: 12px; font-weight: 650; }
.editor-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 72px minmax(0, 1fr);
  gap: 12px;
  margin-top: 18px;
}
.editor-panel {
  min-width: 0;
  padding: 15px;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #f8fafc;
}
.result-panel { border-color: #bfdbfe; background: #f8fbff; }
.editor-title { min-height: 34px; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
.editor-title strong,
.editor-title span { display: block; }
.editor-title strong { color: #1e293b; font-size: 14px; }
.editor-title span { margin-top: 2px; color: #94a3b8; font-size: 11px; }
.editor-panel :deep(.el-textarea__inner) {
  min-height: 250px !important;
  border-radius: 11px;
  color: #1e293b;
  background: #fff;
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
  color: #2563eb;
}
.direction-column > .el-icon { font-size: 24px; }
.sample-row { flex-wrap: wrap; gap: 8px; margin-top: 14px; }
.sample-row > span { color: #64748b; font-size: 12px; }
.sample-row button {
  padding: 6px 11px;
  border: 1px solid #dbeafe;
  border-radius: 999px;
  color: #2563eb;
  background: #eff6ff;
  font-size: 12px;
  cursor: pointer;
}
.sample-row button:hover { border-color: #60a5fa; background: #dbeafe; }
.character-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  margin-top: 20px;
}
.character-grid article {
  min-width: 0;
  padding: 13px;
  border: 1px solid #e2e8f0;
  border-radius: 13px;
  background: #f8fafc;
}
.character {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 10px;
  color: #1d4ed8;
  background: #dbeafe;
  font-size: 18px;
  font-weight: 700;
}
.character-grid strong,
.character-grid code { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.character-grid strong { margin-top: 10px; color: #1e293b; font-size: 13px; }
.character-grid code { margin-top: 3px; color: #64748b; font-size: 11px; }
.empty-inspector {
  margin-top: 18px;
  padding: 34px 20px;
  border: 1px dashed #cbd5e1;
  border-radius: 14px;
  color: #94a3b8;
  background: #f8fafc;
  text-align: center;
}
.detail-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 22px; }
.detail-grid h4 { margin: 0 0 6px; color: #1e293b; }
.detail-grid p { margin: 0; color: #64748b; line-height: 1.7; }

:global(html.dark .unicode-page .workspace-card),
:global(html.dark .unicode-page .inspector-card) { border-color: #334155; background: #0f172a; box-shadow: none; }
:global(html.dark .unicode-page .section-heading h2),
:global(html.dark .unicode-page .editor-title strong),
:global(html.dark .unicode-page .detail-grid h4) { color: #f1f5f9; }
:global(html.dark .unicode-page .section-heading p),
:global(html.dark .unicode-page .detail-grid p) { color: #94a3b8; }
:global(html.dark .unicode-page .option-row),
:global(html.dark .unicode-page .editor-panel),
:global(html.dark .unicode-page .character-grid article),
:global(html.dark .unicode-page .empty-inspector) { border-color: #334155; background: #111c2f; }
:global(html.dark .unicode-page .result-panel) { border-color: #1e3a5f; background: #0d1d33; }
:global(html.dark .unicode-page .editor-panel .el-textarea__inner) {
  color: #e2e8f0;
  background: #0b1324;
  box-shadow: 0 0 0 1px #334155 inset;
}
:global(html.dark .unicode-page .character-grid strong) { color: #e2e8f0; }

@media (max-width: 1000px) {
  .character-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 900px) {
  .settings-header { align-items: flex-start; flex-direction: column; }
  .editor-grid { grid-template-columns: 1fr; }
  .direction-column { flex-direction: row; }
}
@media (max-width: 640px) {
  .workspace-card,
  .inspector-card { padding: 18px; border-radius: 16px; }
  .settings-header :deep(.el-segmented) { width: 100%; }
  .option-row { align-items: flex-start; flex-direction: column; }
  .option-row label { align-items: flex-start; flex-direction: column; width: 100%; }
  .option-row :deep(.el-radio-group) { width: 100%; }
  .option-row :deep(.el-radio-button) { flex: 1; }
  .option-row :deep(.el-radio-button__inner) { width: 100%; font-size: 12px; }
  .editor-panel :deep(.el-textarea__inner) { min-height: 215px !important; }
  .character-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .detail-grid { grid-template-columns: 1fr; }
}
</style>
