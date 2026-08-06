<script setup lang="ts">
import { computed, ref } from 'vue'
import * as Diff from 'diff'
import { ElMessage, ElMessageBox } from 'element-plus'
import { CopyDocument, Delete, Download, FolderOpened, Refresh } from '@element-plus/icons-vue'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import MetricsBar from '@/components/Common/MetricsBar.vue'
import { autoDown } from '@/utils/file'
import { copy } from '@/utils/string'
import { sanitizeDocumentName } from '@/utils/documentStudio'
import { buildDiffRows, createUnifiedDiffText, normalizeComparisonText, summarizeDiffRows } from '@/utils/textDiff'

type ViewMode = 'unified' | 'side-by-side' | 'line-by-line'
type HighlightLevel = 'char' | 'word'

const samples = [
  {
    title: '产品说明',
    note: '适合普通中文文本',
    left: '产品名称：云端笔记\n版本：2.3.0\n\n新增功能：\n- 快速搜索\n- Markdown 编辑\n\n同步间隔：10 分钟',
    right: '产品名称：云端笔记 Pro\n版本：2.4.0\n\n新增功能：\n- 全文快速搜索\n- Markdown 实时预览\n- 离线草稿\n\n同步间隔：5 分钟',
  },
  {
    title: '配置文件',
    note: '观察键值与行变化',
    left: '{\n  "theme": "light",\n  "retry": 3,\n  "cache": false\n}',
    right: '{\n  "theme": "dark",\n  "retry": 5,\n  "cache": true,\n  "region": "cn-east"\n}',
  },
  {
    title: '邮件修订',
    note: '忽略空格与大小写',
    left: 'Hello Team,\n\nThe report will be ready on Friday.\nPlease review the final numbers.\n\nThanks,\nAlex',
    right: 'Hello team,\n\nThe report will be ready this Friday.\nPlease review the updated numbers.\n\nThank you,\nAlex',
  },
]

const leftText = ref(samples[0].left)
const rightText = ref(samples[0].right)
const viewMode = ref<ViewMode>('side-by-side')
const highlightLevel = ref<HighlightLevel>('char')
const ignoreWhitespace = ref(false)
const ignoreCase = ref(false)
const ignoreBlankLines = ref(false)
const leftInputRef = ref<HTMLInputElement | null>(null)
const rightInputRef = ref<HTMLInputElement | null>(null)
const maxFileSize = 2 * 1024 * 1024

const comparisonOptions = computed(() => ({
  ignoreWhitespace: ignoreWhitespace.value,
  ignoreCase: ignoreCase.value,
  ignoreBlankLines: ignoreBlankLines.value,
}))
const comparedLeft = computed(() => normalizeComparisonText(leftText.value, comparisonOptions.value))
const comparedRight = computed(() => normalizeComparisonText(rightText.value, comparisonOptions.value))
const lineChanges = computed(() => Diff.diffLines(comparedLeft.value, comparedRight.value))
const rows = computed(() => buildDiffRows(lineChanges.value))
const summary = computed(() => summarizeDiffRows(rows.value))
const inlineChanges = computed(() => highlightLevel.value === 'char'
  ? Diff.diffChars(comparedLeft.value, comparedRight.value)
  : Diff.diffWordsWithSpace(comparedLeft.value, comparedRight.value))
const unifiedText = computed(() => createUnifiedDiffText(rows.value, 'original.txt', 'revised.txt'))
const leftLines = computed(() => leftText.value ? leftText.value.replace(/\r\n?/g, '\n').split('\n').length : 0)
const rightLines = computed(() => rightText.value ? rightText.value.replace(/\r\n?/g, '\n').split('\n').length : 0)
const hasInput = computed(() => Boolean(leftText.value || rightText.value))
const changedLines = computed(() => summary.value.additions + summary.value.removals)

function applySample(sample: typeof samples[number]) {
  leftText.value = sample.left
  rightText.value = sample.right
  ElMessage.success(`已载入“${sample.title}”示例`)
}

function swapTexts() {
  const current = leftText.value
  leftText.value = rightText.value
  rightText.value = current
  ElMessage.success('已交换原始版本和修改版本')
}

async function clearTexts() {
  if (hasInput.value) {
    try {
      await ElMessageBox.confirm('将清空两侧文本，是否继续？', '清空对比内容', { type: 'warning', confirmButtonText: '清空', cancelButtonText: '取消' })
    } catch {
      return
    }
  }
  leftText.value = ''
  rightText.value = ''
}

function triggerImport(side: 'left' | 'right') {
  (side === 'left' ? leftInputRef : rightInputRef).value?.click()
}

async function importText(event: Event, side: 'left' | 'right') {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (file.size > maxFileSize) return ElMessage.error('文本文件不能超过 2 MB')
  try {
    const value = await file.text()
    if (side === 'left') leftText.value = value
    else rightText.value = value
    ElMessage.success(`已导入 ${file.name}`)
  } catch {
    ElMessage.error('文件读取失败')
  }
}

function downloadDiff() {
  if (!hasInput.value) return ElMessage.warning('请先输入需要对比的文本')
  const url = URL.createObjectURL(new Blob([unifiedText.value], { type: 'text/plain;charset=utf-8' }))
  autoDown(url, `${sanitizeDocumentName('文本差异', 'comparison')}.diff`)
  ElMessage.success('差异文件已导出')
}
</script>

<template>
  <div class="diff-page flex flex-col mt-3 flex-1">
    <ToolHero summary="不只标红，还要看清改了多少">
      <template #metrics>
        <MetricsBar :items="[{ label: '行相似度', value: summary.similarity + '%' }, { label: '增删行数', value: changedLines }, { label: '变更区块', value: summary.changedBlocks }]" />
      </template>
    </ToolHero>

    <section class="command-card">
      <div class="sample-list"><span>载入示例</span><button v-for="sample in samples" :key="sample.title" type="button" @click="applySample(sample)"><strong>{{ sample.title }}</strong><small>{{ sample.note }}</small></button></div>
      <div class="command-actions"><button type="button" aria-label="交换两侧文本" @click="swapTexts"><el-icon><Refresh /></el-icon>交换两侧</button><button type="button" class="danger" aria-label="清空两侧文本" @click="clearTexts"><el-icon><Delete /></el-icon>清空</button></div>
    </section>

    <section class="rule-card">
      <div><span class="eyebrow">COMPARE RULES</span><h3>对比规则</h3></div>
      <div class="rule-options"><el-checkbox v-model="ignoreWhitespace">忽略空白差异</el-checkbox><el-checkbox v-model="ignoreCase">忽略大小写</el-checkbox><el-checkbox v-model="ignoreBlankLines">忽略空行</el-checkbox></div>
      <label><span>高亮精度</span><el-segmented v-model="highlightLevel" :options="[{ label: '字符级', value: 'char' }, { label: '词组级', value: 'word' }]" /></label>
    </section>

    <section class="input-grid">
      <article class="text-card original">
        <header><div><span>ORIGINAL</span><h3>原始版本</h3><small>{{ leftLines }} 行 · {{ leftText.length }} 字符</small></div><div><button type="button" aria-label="导入原始文本" @click="triggerImport('left')"><el-icon><FolderOpened /></el-icon>导入</button><button type="button" aria-label="复制原始文本" :disabled="!leftText" @click="copy(leftText)"><el-icon><CopyDocument /></el-icon>复制</button></div></header>
        <input ref="leftInputRef" type="file" hidden tabindex="-1" aria-hidden="true" accept=".txt,.md,.json,.xml,.html,.css,.js,.ts,.csv,text/*" @change="importText($event, 'left')">
        <el-input v-model="leftText" type="textarea" :rows="14" resize="vertical" placeholder="粘贴原始版本，或导入文本文件…" aria-label="原始版本文本" />
      </article>
      <article class="text-card revised">
        <header><div><span>REVISED</span><h3>修改版本</h3><small>{{ rightLines }} 行 · {{ rightText.length }} 字符</small></div><div><button type="button" aria-label="导入修改文本" @click="triggerImport('right')"><el-icon><FolderOpened /></el-icon>导入</button><button type="button" aria-label="复制修改文本" :disabled="!rightText" @click="copy(rightText)"><el-icon><CopyDocument /></el-icon>复制</button></div></header>
        <input ref="rightInputRef" type="file" hidden tabindex="-1" aria-hidden="true" accept=".txt,.md,.json,.xml,.html,.css,.js,.ts,.csv,text/*" @change="importText($event, 'right')">
        <el-input v-model="rightText" type="textarea" :rows="14" resize="vertical" placeholder="粘贴修改版本，或导入文本文件…" aria-label="修改版本文本" />
      </article>
    </section>

    <section class="result-card">
      <header class="result-heading">
        <div><span class="eyebrow">DIFF RESULT</span><h3>差异结果</h3><p>忽略规则会先规范化文本，再生成下方结果</p></div>
        <div class="result-actions"><el-segmented v-model="viewMode" :options="[{ label: '并排', value: 'side-by-side' }, { label: '混合', value: 'unified' }, { label: '逐行', value: 'line-by-line' }]" /><button type="button" :disabled="!hasInput" aria-label="复制统一差异文本" @click="copy(unifiedText)"><el-icon><CopyDocument /></el-icon>复制差异</button><button type="button" :disabled="!hasInput" aria-label="导出差异文件" @click="downloadDiff"><el-icon><Download /></el-icon>导出 .diff</button></div>
      </header>

      <div class="summary-strip"><div class="added"><span>新增</span><strong>+{{ summary.additions }}</strong></div><div class="removed"><span>删除</span><strong>-{{ summary.removals }}</strong></div><div><span>未变化</span><strong>{{ summary.unchanged }}</strong></div><div><span>左右行数</span><strong>{{ summary.oldLines }} / {{ summary.newLines }}</strong></div></div>

      <div v-if="!hasInput" class="empty-state">在上方输入两个版本后，这里会实时生成差异。</div>
      <div v-else-if="viewMode === 'unified'" class="unified-view" aria-label="混合差异结果"><template v-for="(part, index) in inlineChanges" :key="index"><span :class="{ added: part.added, removed: part.removed }">{{ part.value }}</span></template></div>
      <div v-else-if="viewMode === 'side-by-side'" class="side-view" aria-label="并排差异结果">
        <div class="side-header"><span>原始版本</span><span>修改版本</span></div>
        <div v-for="(row, index) in rows" :key="index" :class="['diff-row', row.type]">
          <div :class="{ empty: row.left === undefined }"><b>{{ row.leftLine ?? '' }}</b><code>{{ row.left ?? '' }}</code></div>
          <div :class="{ empty: row.right === undefined }"><b>{{ row.rightLine ?? '' }}</b><code>{{ row.right ?? '' }}</code></div>
        </div>
      </div>
      <div v-else class="line-view" aria-label="逐行差异结果">
        <template v-for="(row, index) in rows" :key="index">
          <div v-if="row.type === 'same'" class="line-row same"><b>{{ row.leftLine }}</b><span> </span><code>{{ row.left }}</code></div>
          <div v-else-if="row.left !== undefined" class="line-row removed"><b>{{ row.leftLine }}</b><span>−</span><code>{{ row.left }}</code></div>
          <div v-if="row.type !== 'same' && row.right !== undefined" class="line-row added"><b>{{ row.rightLine }}</b><span>+</span><code>{{ row.right }}</code></div>
        </template>
      </div>
    </section>

    <ToolGuide title="对比范围与隐私说明"><div class="detail-copy">字符级适合短文本和精确校对，词组级更适合自然语言；并排视图便于逐行核对，混合视图用于观察局部字词变化，导出的 .diff 文件可用于留档。文件导入和所有差异计算都在当前浏览器完成，文本不会上传到服务器。</div></ToolGuide>
  </div>
</template>

<style scoped>
.diff-page{--blue:#2563eb;gap:18px}.command-card, .rule-card, .text-card {border: 1px solid var(--c-border);border-radius:22px;background:#fff;box-shadow:0 14px 38px rgba(15,23,42,.06)}.eyebrow{display:block;margin-bottom:7px;color:#93c5fd;font-size:12px;font-weight:900;letter-spacing:.16em}.command-card{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:13px 16px}.sample-list,.command-actions{display:flex;align-items:center;gap:8px}.sample-list>span{flex:none;color: var(--c-text-secondary);font-size:13px}.sample-list button{display:flex;flex-direction:column;gap:2px;padding:9px 13px;border:1px solid #dbe3ef;border-radius:11px;background: var(--c-surface-subtle);color:#334155;text-align:left;cursor:pointer}.sample-list strong{font-size:14px}.sample-list small{color: var(--c-text-muted);font-size:12px}.command-actions button,.text-card header button,.result-actions button{display:inline-flex;align-items:center;justify-content:center;gap:5px;min-height:36px;padding:0 11px;border:1px solid #dbe3ef;border-radius:9px;background:#fff;color: var(--c-text-body);font-size:13px;font-weight:750;cursor:pointer}.command-actions button.danger{color:#dc2626}.command-actions button:disabled,.text-card header button:disabled,.result-actions button:disabled{cursor:not-allowed;opacity:.45}.rule-card{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:24px;padding:17px 20px}.rule-card h3{margin:0;color: var(--c-text-primary);font-size:18px}.rule-card .eyebrow{margin-bottom:3px;color:var(--blue)}.rule-options{display:flex;align-items:center;justify-content:center;gap:6px 20px}.rule-card>label{display:flex;align-items:center;gap:9px;color: var(--c-text-secondary);font-size:13px}.input-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.text-card{min-width:0;padding:20px}.text-card.original{border-top:3px solid #f97316}.text-card.revised{border-top:3px solid #10b981}.text-card header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.text-card header>div:first-child>span{color: var(--c-text-secondary);font-size:12px;font-weight:900;letter-spacing:.14em}.text-card h3{display:inline;margin:0 8px 0 0;color: var(--c-text-primary);font-size:19px}.text-card header small{color: var(--c-text-muted);font-size:12px}.text-card header>div:last-child{display:flex;gap:7px}.text-card :deep(.el-textarea__inner){min-height:320px!important;padding:14px;border-radius:13px;font:14px/1.7 ui-monospace,SFMono-Regular,Consolas,monospace}.result-card{padding:22px}.result-heading{display:flex;align-items:center;justify-content:space-between;gap:18px}.result-heading .eyebrow{color:var(--blue)}.result-heading h3{display:inline;margin:0 8px 0 0;color: var(--c-text-primary);font-size:21px}.result-heading p{display:inline;margin:0;color: var(--c-text-muted);font-size:13px}.result-actions{display:flex;align-items:center;gap:8px}.summary-strip{display:grid;grid-template-columns:repeat(4,1fr);margin:18px 0;border: 1px solid var(--c-border);border-radius:14px;overflow:hidden}.summary-strip div{padding:13px 15px;border-right:1px solid #e2e8f0}.summary-strip div:last-child{border:0}.summary-strip span,.summary-strip strong{display:block}.summary-strip span{color: var(--c-text-muted);font-size:12px}.summary-strip strong{margin-top:3px;color:#334155;font-size:18px}.summary-strip .added strong{color:#059669}.summary-strip .removed strong{color:#dc2626}.empty-state{display:grid;min-height:210px;place-items:center;border:1px dashed #cbd5e1;border-radius:14px;color: var(--c-text-muted)}.unified-view,.side-view,.line-view{max-height:620px;overflow:auto;border:1px solid #dbe3ef;border-radius:14px;background: var(--c-surface-subtle)}.unified-view{padding:18px;color:#334155;font:14px/1.75 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere}.unified-view .removed,.line-row.removed{color:#b91c1c;background:#fee2e2;text-decoration:line-through}.unified-view .added,.line-row.added{color:#047857;background:#d1fae5;font-weight:700}.side-header{position:sticky;top:0;z-index:2;display:grid;grid-template-columns:1fr 1fr;background:#e2e8f0}.side-header span{padding:10px 45px;color: var(--c-text-body);font-size:12px;font-weight:800}.diff-row{display:grid;grid-template-columns:1fr 1fr}.diff-row>div{display:grid;grid-template-columns:40px minmax(0,1fr);min-width:0;border-top:1px solid #e2e8f0}.diff-row>div:first-child{border-right:1px solid #cbd5e1}.diff-row b,.line-row b{padding:8px;color: var(--c-text-muted);background:#f1f5f9;font:12px ui-monospace,monospace;text-align:right}.diff-row code,.line-row code{padding:8px 10px;color:#334155;font:13px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere}.diff-row.changed>div:first-child,.diff-row.removed>div:first-child{background:#fff1f2}.diff-row.changed>div:last-child,.diff-row.added>div:last-child{background:#ecfdf5}.diff-row .empty{background:#f1f5f9!important}.line-row{display:grid;grid-template-columns:42px 28px minmax(0,1fr);border-top:1px solid #e2e8f0}.line-row>span{display:grid;place-items:center;font-weight:900}.line-row.same>span{background: var(--c-surface-subtle)}:global(html.dark .diff-page .command-card),:global(html.dark .diff-page .rule-card),:global(html.dark .diff-page .text-card),:global(html.dark .diff-page .result-card){border-color:#334155;background:#1e293b;box-shadow:none}:global(html.dark .diff-page h3){color:#f8fafc}:global(html.dark .diff-page .sample-list button),:global(html.dark .diff-page .command-actions button),:global(html.dark .diff-page .text-card header button),:global(html.dark .diff-page .result-actions button){border-color:#475569;background:#0f172a;color:#e2e8f0}:global(html.dark .diff-page .unified-view),:global(html.dark .diff-page .side-view),:global(html.dark .diff-page .line-view){border-color:#475569;background:#0f172a}:global(html.dark .diff-page .summary-strip){border-color:#334155}:global(html.dark .diff-page .summary-strip div),:global(html.dark .diff-page .diff-row>div),:global(html.dark .diff-page .line-row){border-color:#334155}:global(html.dark .diff-page .summary-strip strong),:global(html.dark .diff-page .unified-view),:global(html.dark .diff-page .diff-row code),:global(html.dark .diff-page .line-row code){color:#e2e8f0}:global(html.dark .diff-page .side-header){background:#334155}:global(html.dark .diff-page .side-header span){color:#e2e8f0}:global(html.dark .diff-page .diff-row b),:global(html.dark .diff-page .line-row b),:global(html.dark .diff-page .diff-row .empty){background:#1e293b}:global(html.dark .diff-page .diff-row.changed>div:first-child),:global(html.dark .diff-page .diff-row.removed>div:first-child){background:#3f1d2e}:global(html.dark .diff-page .diff-row.changed>div:last-child),:global(html.dark .diff-page .diff-row.added>div:last-child){background:#12372a}:global(html.dark .diff-page .line-row.removed){background:#3f1d2e;color:#fecdd3}:global(html.dark .diff-page .line-row.added){background:#12372a;color:#a7f3d0}
@media(max-width:980px){.rule-card{grid-template-columns:1fr}.rule-options{justify-content:flex-start}.input-grid{grid-template-columns:1fr}.result-heading{align-items:flex-start;flex-direction:column}.result-actions{width:100%;flex-wrap:wrap}}@media(max-width:680px){.diff-page{gap:14px}.command-card{align-items:stretch;flex-direction:column}.sample-list{overflow-x:auto}.command-actions{display:grid;grid-template-columns:1fr 1fr}.rule-card,.text-card,.result-card{padding:15px}.rule-options{align-items:flex-start;flex-direction:column}.rule-card>label{align-items:flex-start;flex-direction:column}.text-card header{align-items:flex-start;flex-direction:column}.text-card header>div:last-child{width:100%}.text-card header button{flex:1}.text-card :deep(.el-textarea__inner){min-height:260px!important}.result-actions{display:grid;grid-template-columns:1fr 1fr}.result-actions :deep(.el-segmented){grid-column:1/-1;width:100%}.summary-strip{grid-template-columns:1fr 1fr}.summary-strip div:nth-child(2){border-right:0}.summary-strip div:nth-child(-n+2){border-bottom:1px solid #e2e8f0}.side-view{overflow-x:auto}.side-header,.diff-row{min-width:720px}.result-heading p{display:block;margin-top:4px}}
</style>
