<script setup lang="ts">
import { computed, ref } from 'vue'
import { CopyDocument, DataAnalysis, Delete, Document, Reading, Timer } from '@element-plus/icons-vue'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { copy } from '@/utils/string'
import { analyzeText } from '@/utils/textTools'

const title = '在线字数统计'
const content = ref('')
const statistics = computed(() => analyzeText(content.value))

const samples = [
  {
    label: '中英文示例',
    value: '在线工具箱让日常工作更轻松。\nTools should be simple, useful, and private.',
  },
  {
    label: '两段文章',
    value: '第一段介绍主题，并给出必要的背景信息。\n\n第二段继续展开观点，包含数字 2026 和符号。',
  },
]

const primaryStats = computed(() => [
  { label: '总字符', value: statistics.value.characters, hint: '按 Unicode 字符计数', tone: 'blue' },
  { label: '不含空白', value: statistics.value.charactersWithoutWhitespace, hint: '排除空格与换行', tone: 'cyan' },
  { label: '汉字', value: statistics.value.chineseCharacters, hint: 'CJK 汉字字符', tone: 'violet' },
  { label: '估算词数', value: statistics.value.words, hint: '汉字与单词合计', tone: 'amber' },
])

const secondaryStats = computed(() => [
  { label: '英文字母', value: statistics.value.latinLetters },
  { label: '数字', value: statistics.value.numbers },
  { label: '标点', value: statistics.value.punctuation },
  { label: '符号 / Emoji', value: statistics.value.symbols },
  { label: '空白字符', value: statistics.value.whitespace },
  { label: '行数', value: statistics.value.lines },
  { label: '段落', value: statistics.value.paragraphs },
])

const compositionRows = computed(() => [
  { label: '汉字', value: statistics.value.chineseCharacters, color: '#8b5cf6' },
  { label: '英文字母', value: statistics.value.latinLetters, color: '#3b82f6' },
  { label: '数字', value: statistics.value.numbers, color: '#06b6d4' },
  { label: '标点与符号', value: statistics.value.punctuation + statistics.value.symbols, color: '#f59e0b' },
])

function percentage(value: number) {
  if (!statistics.value.characters) return 0
  return Math.min(100, Math.round(value / statistics.value.characters * 100))
}

function useSample(value: string) {
  content.value = value
}
</script>

<template>
  <div class="word-count-page flex flex-col mt-3 flex-1">
    <DetailHeader :title="title" />

    <section class="workspace-card">
      <div class="editor-header">
        <div class="section-heading">
          <div class="heading-icon"><el-icon><Document /></el-icon></div>
          <div>
            <h2>输入或粘贴文本</h2>
            <p>内容变化时实时更新，不会上传文本</p>
          </div>
        </div>
        <div class="editor-actions">
          <el-button :icon="CopyDocument" :disabled="!content" @click="copy(content)">复制文本</el-button>
          <el-button :icon="Delete" :disabled="!content" @click="content = ''">清空</el-button>
        </div>
      </div>

      <el-input
        v-model="content"
        class="main-editor"
        type="textarea"
        :rows="13"
        resize="vertical"
        placeholder="在这里输入文章、文案、论文或任意文本…"
      />

      <div class="editor-footer">
        <div class="sample-row">
          <span>快速示例</span>
          <button v-for="sample in samples" :key="sample.label" type="button" @click="useSample(sample.value)">
            {{ sample.label }}
          </button>
        </div>
        <span class="live-status"><i></i> 实时统计中</span>
      </div>
    </section>

    <section class="statistics-card">
      <div class="section-heading">
        <div class="heading-icon green"><el-icon><DataAnalysis /></el-icon></div>
        <div>
          <h2>文本概览</h2>
          <p>字符、结构与阅读时间的综合统计</p>
        </div>
      </div>

      <div class="primary-grid">
        <article v-for="item in primaryStats" :key="item.label" class="stat-card" :class="`tone-${item.tone}`">
          <span>{{ item.label }}</span>
          <strong>{{ item.value.toLocaleString('zh-CN') }}</strong>
          <small>{{ item.hint }}</small>
        </article>
      </div>

      <div class="analysis-grid">
        <div class="detail-panel">
          <div class="panel-title">
            <el-icon><Reading /></el-icon>
            <strong>详细统计</strong>
          </div>
          <div class="secondary-grid">
            <div v-for="item in secondaryStats" :key="item.label">
              <span>{{ item.label }}</span>
              <strong>{{ item.value.toLocaleString('zh-CN') }}</strong>
            </div>
          </div>
        </div>

        <div class="detail-panel">
          <div class="panel-title">
            <el-icon><DataAnalysis /></el-icon>
            <strong>内容构成</strong>
          </div>
          <div class="composition-list">
            <div v-for="row in compositionRows" :key="row.label" class="composition-row">
              <div>
                <span>{{ row.label }}</span>
                <strong>{{ row.value }} · {{ percentage(row.value) }}%</strong>
              </div>
              <div class="progress-track">
                <i :style="{ width: `${percentage(row.value)}%`, background: row.color }"></i>
              </div>
            </div>
          </div>
        </div>

        <div class="reading-panel">
          <el-icon><Timer /></el-icon>
          <span>预计阅读时间</span>
          <strong>{{ statistics.readingMinutes || 0 }}<small> 分钟</small></strong>
          <p>按中文约 300 字/分钟、英文约 200 词/分钟估算，仅供参考。</p>
        </div>
      </div>
    </section>

    <ToolDetail title="统计口径">
      <div class="detail-copy">
        <p><strong>总字符</strong>按 Unicode 码点统计，Emoji 会作为一个字符；空白字符包括空格、制表符和换行。</p>
        <p><strong>估算词数</strong>将每个汉字计为一个词，并识别连续的英文或数字单词，适合快速评估文本长度。</p>
        <p><strong>段落</strong>通过空行区分；仅换行但没有空行时仍视为同一段落。</p>
      </div>
    </ToolDetail>
  </div>
</template>

<style scoped>
.word-count-page { gap: 18px; }

.workspace-card,
.statistics-card {
  padding: 24px;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.05);
}

.editor-header,
.section-heading,
.editor-footer,
.sample-row,
.panel-title {
  display: flex;
  align-items: center;
}

.editor-header,
.editor-footer {
  justify-content: space-between;
  gap: 16px;
}

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

.section-heading h2 {
  margin: 0;
  color: #0f172a;
  font-size: 18px;
}

.section-heading p {
  margin: 3px 0 0;
  color: #64748b;
  font-size: 13px;
}

.editor-actions { display: flex; gap: 8px; }
.editor-actions :deep(.el-button + .el-button) { margin-left: 0; }

.main-editor { margin-top: 20px; }
.main-editor :deep(.el-textarea__inner) {
  min-height: 285px !important;
  padding: 16px;
  border-radius: 14px;
  color: #1e293b;
  background: #fbfdff;
  line-height: 1.75;
  box-shadow: 0 0 0 1px #dbe3ef inset;
}

.editor-footer { margin-top: 13px; }
.sample-row { flex-wrap: wrap; gap: 8px; }
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

.live-status { color: #64748b; font-size: 12px; white-space: nowrap; }
.live-status i {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-right: 4px;
  border-radius: 50%;
  background: #10b981;
}

.primary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 20px;
}

.stat-card {
  padding: 17px;
  border: 1px solid #dbeafe;
  border-radius: 15px;
  background: #f8fbff;
}
.stat-card span,
.stat-card strong,
.stat-card small { display: block; }
.stat-card span { color: #64748b; font-size: 12px; }
.stat-card strong { margin-top: 7px; color: #1d4ed8; font-size: 28px; line-height: 1; }
.stat-card small { margin-top: 8px; color: #94a3b8; font-size: 11px; }
.tone-cyan { border-color: #cffafe; background: #f0fdff; }
.tone-cyan strong { color: #0891b2; }
.tone-violet { border-color: #ede9fe; background: #faf8ff; }
.tone-violet strong { color: #7c3aed; }
.tone-amber { border-color: #fef3c7; background: #fffdf5; }
.tone-amber strong { color: #d97706; }

.analysis-grid {
  display: grid;
  grid-template-columns: 1.1fr 1fr 0.7fr;
  gap: 14px;
  margin-top: 14px;
}

.detail-panel,
.reading-panel {
  padding: 18px;
  border: 1px solid #e2e8f0;
  border-radius: 15px;
  background: #f8fafc;
}

.panel-title { gap: 8px; color: #1e293b; }
.panel-title .el-icon { color: #2563eb; font-size: 18px; }

.secondary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 15px;
}
.secondary-grid div { padding: 10px 11px; border-radius: 10px; background: #fff; }
.secondary-grid span,
.secondary-grid strong { display: block; }
.secondary-grid span { color: #94a3b8; font-size: 11px; }
.secondary-grid strong { margin-top: 2px; color: #334155; font-size: 15px; }

.composition-list { margin-top: 16px; }
.composition-row + .composition-row { margin-top: 13px; }
.composition-row > div:first-child { display: flex; justify-content: space-between; gap: 10px; }
.composition-row span,
.composition-row strong { color: #64748b; font-size: 11px; }
.progress-track { height: 7px; margin-top: 6px; overflow: hidden; border-radius: 999px; background: #e2e8f0; }
.progress-track i { display: block; height: 100%; border-radius: inherit; transition: width 0.25s ease; }

.reading-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  text-align: center;
}
.reading-panel > .el-icon { color: #059669; font-size: 28px; }
.reading-panel > span { margin-top: 8px; color: #64748b; font-size: 12px; }
.reading-panel > strong { margin-top: 4px; color: #047857; font-size: 34px; }
.reading-panel > strong small { font-size: 13px; }
.reading-panel p { margin: 8px 0 0; color: #94a3b8; font-size: 11px; line-height: 1.6; }

.detail-copy {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 22px;
}
.detail-copy p { margin: 0; color: #64748b; line-height: 1.75; }
.detail-copy strong { color: #1e293b; }

:global(html.dark .word-count-page .workspace-card),
:global(html.dark .word-count-page .statistics-card) {
  border-color: #334155;
  background: #0f172a;
  box-shadow: none;
}
:global(html.dark .word-count-page .section-heading h2),
:global(html.dark .word-count-page .panel-title),
:global(html.dark .word-count-page .detail-copy strong) { color: #f1f5f9; }
:global(html.dark .word-count-page .section-heading p),
:global(html.dark .word-count-page .detail-copy p) { color: #94a3b8; }
:global(html.dark .word-count-page .main-editor .el-textarea__inner) {
  color: #e2e8f0;
  background: #0b1324;
  box-shadow: 0 0 0 1px #334155 inset;
}
:global(html.dark .word-count-page .stat-card),
:global(html.dark .word-count-page .detail-panel),
:global(html.dark .word-count-page .reading-panel) {
  border-color: #334155;
  background: #111c2f;
}
:global(html.dark .word-count-page .secondary-grid div) { background: #0b1324; }
:global(html.dark .word-count-page .secondary-grid strong) { color: #e2e8f0; }
:global(html.dark .word-count-page .progress-track) { background: #334155; }

@media (max-width: 1000px) {
  .primary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .analysis-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .reading-panel { grid-column: 1 / -1; }
}

@media (max-width: 640px) {
  .workspace-card,
  .statistics-card { padding: 18px; border-radius: 16px; }
  .editor-header,
  .editor-footer { align-items: flex-start; flex-direction: column; }
  .editor-actions { width: 100%; }
  .editor-actions :deep(.el-button) { flex: 1; }
  .main-editor :deep(.el-textarea__inner) { min-height: 235px !important; }
  .primary-grid,
  .analysis-grid,
  .detail-copy { grid-template-columns: 1fr; }
  .reading-panel { grid-column: auto; }
}
</style>
