<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { MdEditor, type ToolbarNames } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import { ElMessage, ElMessageBox } from 'element-plus'
import { CopyDocument, Delete, Download, FolderOpened, Refresh } from '@element-plus/icons-vue'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import MetricsBar from '@/components/Common/MetricsBar.vue'
import { autoDown } from '@/utils/file'
import { useSettingStore } from '@/store/modules/setting'
import { copy } from '@/utils/string'
import { analyzeText } from '@/utils/textTools'
import {
  buildDocumentFilename,
  buildStandaloneHtml,
  countMarkdownHeadings,
  formatDocumentBytes,
  sanitizeDocumentName,
} from '@/utils/documentStudio'

interface MarkdownDraft {
  title: string
  content: string
  updatedAt: number
}

const DRAFT_KEY = 'tools-web:markdown-draft:v1'
const MAX_FILE_SIZE = 2 * 1024 * 1024
const settingStore = useSettingStore()
const editorTheme = computed(() => settingStore.isDark ? 'dark' : 'light')
const unavailableToolbars: ToolbarNames[] = ['mermaid', 'katex', 'prettier']
const fileInputRef = ref<HTMLInputElement | null>(null)
const title = ref('未命名文档')
const content = ref('')
const renderedHtml = ref('')
const lastSavedAt = ref<number | null>(null)
const draftRestored = ref(false)
const dirty = ref(false)
let saveTimer: ReturnType<typeof setTimeout> | null = null

const templates = [
  {
    title: '项目 README',
    note: '介绍、安装与使用',
    content: '# 项目名称\n\n一句话介绍这个项目解决的问题。\n\n## 功能特性\n\n- 功能一\n- 功能二\n\n## 快速开始\n\n```bash\npnpm install\npnpm dev\n```\n\n## 使用说明\n\n补充主要用法、配置项与注意事项。\n',
  },
  {
    title: '会议纪要',
    note: '议题、结论与行动项',
    content: '# 会议纪要\n\n- **日期：** \n- **参与人：** \n- **主题：** \n\n## 讨论要点\n\n1. \n2. \n\n## 结论\n\n> 在这里记录本次会议的关键结论。\n\n## 行动项\n\n- [ ] 负责人 · 任务 · 截止日期\n',
  },
  {
    title: '每周复盘',
    note: '成果、问题与计划',
    content: '# 本周复盘\n\n## 本周完成\n\n- \n\n## 数据与反馈\n\n| 指标 | 本周 | 上周 |\n| --- | ---: | ---: |\n| 示例 | 0 | 0 |\n\n## 遇到的问题\n\n- \n\n## 下周计划\n\n1. \n2. \n',
  },
]

const statistics = computed(() => analyzeText(content.value))
const headingCount = computed(() => countMarkdownHeadings(content.value))
const byteSize = computed(() => new TextEncoder().encode(content.value).byteLength)
const saveStatus = computed(() => {
  if (!content.value.trim()) return '空白文档'
  if (dirty.value) return '等待自动保存'
  if (!lastSavedAt.value) return '尚未保存'
  return `已保存 ${new Date(lastSavedAt.value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
})

function safeReadDraft(): MarkdownDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<MarkdownDraft>
    if (typeof value.title !== 'string' || typeof value.content !== 'string' || typeof value.updatedAt !== 'number') return null
    return value as MarkdownDraft
  } catch {
    return null
  }
}

function saveDraft(showMessage = false) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = null
  if (!content.value.trim()) {
    localStorage.removeItem(DRAFT_KEY)
    dirty.value = false
    lastSavedAt.value = null
    if (showMessage) ElMessage.info('空白文档无需保存')
    return
  }
  const updatedAt = Date.now()
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ title: title.value, content: content.value, updatedAt }))
  lastSavedAt.value = updatedAt
  dirty.value = false
  if (showMessage) ElMessage.success('草稿已保存到当前浏览器')
}

function scheduleAutoSave() {
  dirty.value = Boolean(content.value.trim())
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => saveDraft(), 700)
}

function handleHtmlChanged(value: string) {
  renderedHtml.value = value
}

function applyTemplate(template: typeof templates[number]) {
  title.value = template.title
  content.value = template.content
  ElMessage.success(`已载入“${template.title}”模板`)
}

function triggerImport() {
  fileInputRef.value?.click()
}

async function importMarkdown(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (file.size > MAX_FILE_SIZE) {
    ElMessage.error('文档不能超过 2 MB')
    return
  }
  if (!/\.(?:md|markdown|txt)$/i.test(file.name)) {
    ElMessage.error('请选择 .md、.markdown 或 .txt 文件')
    return
  }
  try {
    content.value = await file.text()
    title.value = sanitizeDocumentName(file.name, '导入文档')
    await nextTick()
    ElMessage.success(`已导入 ${file.name}`)
  } catch {
    ElMessage.error('文档读取失败')
  }
}

function download(contentValue: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([contentValue], { type }))
  autoDown(url, filename)
}

function exportMarkdown() {
  if (!content.value.trim()) return ElMessage.warning('请先输入 Markdown 内容')
  download(content.value, buildDocumentFilename(title.value, 'md'), 'text/markdown;charset=utf-8')
  ElMessage.success('Markdown 文档已导出')
}

function exportHtml() {
  if (!content.value.trim()) return ElMessage.warning('请先输入 Markdown 内容')
  download(buildStandaloneHtml(title.value, renderedHtml.value), buildDocumentFilename(title.value, 'html'), 'text/html;charset=utf-8')
  ElMessage.success('独立 HTML 已导出')
}

async function clearDocument() {
  if (content.value.trim()) {
    try {
      await ElMessageBox.confirm('将清空当前内容和浏览器草稿，是否继续？', '新建空白文档', { type: 'warning', confirmButtonText: '清空', cancelButtonText: '取消' })
    } catch {
      return
    }
  }
  title.value = '未命名文档'
  content.value = ''
  renderedHtml.value = ''
  localStorage.removeItem(DRAFT_KEY)
  lastSavedAt.value = null
  dirty.value = false
  ElMessage.success('已新建空白文档')
}

watch(() => [title.value, content.value], scheduleAutoSave, { flush: 'post' })

onMounted(() => {
  const draft = safeReadDraft()
  if (!draft?.content.trim()) return
  title.value = draft.title
  content.value = draft.content
  lastSavedAt.value = draft.updatedAt
  draftRestored.value = true
  dirty.value = false
  ElMessage.success('已恢复上次保存在浏览器中的 Markdown 草稿')
})

onBeforeUnmount(() => {
  if (saveTimer) clearTimeout(saveTimer)
  if (dirty.value) saveDraft()
})
</script>

<template>
  <div class="markdown-page flex flex-col mt-3 flex-1">
    <ToolHero summary="从一个想法，到一份可以交付的文档">
      <template #metrics>
        <MetricsBar :items="[{ label: '有效字符', value: statistics.charactersWithoutWhitespace }, { label: '标题层级', value: headingCount }, { label: '分钟阅读', value: statistics.readingMinutes || '—' }]" />
      </template>
    </ToolHero>

    <section class="document-bar">
      <label class="title-field"><span>文档名称</span><el-input v-model="title" maxlength="60" aria-label="Markdown 文档名称" /></label>
      <div class="document-state"><i :class="{ dirty }"></i><div><strong>{{ saveStatus }}</strong><span>{{ draftRestored ? '已恢复本地草稿 · 继续编辑会自动保存' : '内容变化后 0.7 秒自动保存' }}</span></div></div>
      <div class="bar-actions">
        <input ref="fileInputRef" class="file-input" type="file" hidden tabindex="-1" aria-hidden="true" accept=".md,.markdown,.txt,text/markdown,text/plain" @change="importMarkdown">
        <button type="button" aria-label="导入 Markdown 文档" @click="triggerImport"><el-icon><FolderOpened /></el-icon>导入</button>
        <button type="button" aria-label="复制 Markdown 原文" :disabled="!content" @click="copy(content)"><el-icon><CopyDocument /></el-icon>复制</button>
        <button type="button" class="primary" aria-label="导出 Markdown 文档" :disabled="!content" @click="exportMarkdown"><el-icon><Download /></el-icon>导出 MD</button>
      </div>
    </section>

    <div class="workspace-grid">
      <section class="editor-card">
        <header class="card-heading"><div><span class="eyebrow">WRITE & PREVIEW</span><h3>编辑与实时预览</h3></div><button type="button" aria-label="立即保存 Markdown 草稿" @click="saveDraft(true)"><el-icon><Refresh /></el-icon>立即保存</button></header>
        <MdEditor
          v-model="content"
          :theme="editorTheme"
          language="zh-CN"
          no-highlight
          no-prettier
          no-upload-img
          no-mermaid
          no-katex
          no-echarts
          show-code-row-number
          :toolbars-exclude="unavailableToolbars"
          @on-html-changed="handleHtmlChanged"
          @on-save="saveDraft(true)"
        />
      </section>

      <aside class="side-column">
        <section class="insight-card">
          <header class="card-heading"><div><span class="eyebrow">DOCUMENT PULSE</span><h3>文档概览</h3></div></header>
          <div class="summary-list">
            <div><span>字符数</span><strong>{{ statistics.characters }}</strong></div>
            <div><span>段落 / 行</span><strong>{{ statistics.paragraphs }} / {{ statistics.lines }}</strong></div>
            <div><span>标题数量</span><strong>{{ headingCount }}</strong></div>
            <div><span>文档体积</span><strong>{{ formatDocumentBytes(byteSize) }}</strong></div>
          </div>
          <div class="reading-card"><span>预计阅读时间</span><strong>{{ statistics.readingMinutes || 0 }}<small> 分钟</small></strong><p>按中文与英文常见阅读速度估算</p></div>
        </section>

        <section class="template-card">
          <header class="card-heading"><div><span class="eyebrow">QUICK START</span><h3>文档模板</h3></div></header>
          <div class="template-list"><button v-for="template in templates" :key="template.title" type="button" @click="applyTemplate(template)"><strong>{{ template.title }}</strong><span>{{ template.note }}</span></button></div>
        </section>

        <section class="export-card">
          <span class="eyebrow">DELIVERY</span><h3>交付与整理</h3>
          <button type="button" aria-label="导出 Markdown 渲染后的独立 HTML" :disabled="!content" @click="exportHtml"><el-icon><Download /></el-icon>导出独立 HTML</button>
          <button type="button" aria-label="复制 Markdown 渲染后的 HTML" :disabled="!renderedHtml" @click="copy(renderedHtml)"><el-icon><CopyDocument /></el-icon>复制渲染 HTML</button>
          <button type="button" class="danger" aria-label="新建空白 Markdown 文档" @click="clearDocument"><el-icon><Delete /></el-icon>新建空白文档</button>
        </section>
      </aside>
    </div>

    <ToolGuide title="本地草稿与导出说明"><div class="detail-copy">编辑内容会在停止输入后自动保存到当前浏览器，本工具不会把正文发送到服务器。导入支持 Markdown 与纯文本文件，导出可选择原始 Markdown 或带基础排版样式的独立 HTML；清除浏览器数据后，本地草稿也会一并消失，重要内容请及时下载备份。</div></ToolGuide>
  </div>
</template>

<style scoped>
.markdown-page{gap:18px}.document-bar,.editor-card,.insight-card,.template-card,.export-card{border: 1px solid var(--c-border);border-radius:22px;background:#fff;box-shadow:0 14px 36px rgba(15,23,42,.06)}.eyebrow{display:block;margin-bottom:8px;color:#c4b5fd;font-size:11px;font-weight:900;letter-spacing:.17em}.document-bar{display:grid;grid-template-columns:minmax(220px,1fr) minmax(240px,.8fr) auto;align-items:end;gap:18px;padding:18px 20px}.title-field{display:flex;flex-direction:column;gap:7px}.title-field>span{color: var(--c-text-secondary);font-size:11px;font-weight:800}.document-state{display:flex;align-items:center;gap:10px;padding-bottom:7px}.document-state i{width:9px;height:9px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 4px #dcfce7}.document-state i.dirty{background:#f59e0b;box-shadow:0 0 0 4px #fef3c7}.document-state strong,.document-state span{display:block}.document-state strong{color:#334155;font-size:12px}.document-state span{margin-top:3px;color: var(--c-text-muted);font-size:10px}.bar-actions{display:flex;gap:8px}.bar-actions button,.card-heading>button,.export-card button{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:38px;padding:0 12px;border:1px solid #dbe3ef;border-radius:10px;background:#fff;color: var(--c-text-body);font-weight:750;cursor:pointer}.bar-actions button.primary{border-color:#7c3aed;background:#7c3aed;color:#fff}.bar-actions button:disabled,.export-card button:disabled{cursor:not-allowed;opacity:.45}.file-input{position:absolute;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none}.workspace-grid{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(280px,.58fr);align-items:start;gap:18px}.editor-card,.insight-card,.template-card,.export-card{padding:22px}.card-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:18px}.card-heading h3,.export-card h3{margin:0;color: var(--c-text-primary);font-size:20px}.card-heading>button{min-height:34px}.editor-card :deep(.md-editor){height:650px;border: 1px solid var(--c-border);border-radius:14px;overflow:hidden}.side-column{display:flex;flex-direction:column;gap:18px}.summary-list{display:grid;gap:1px;overflow:hidden;border: 1px solid var(--c-border);border-radius:13px;background:#e2e8f0}.summary-list div{display:flex;justify-content:space-between;padding:12px;background: var(--c-surface-subtle);color: var(--c-text-secondary);font-size:12px}.summary-list strong{color:#1e293b}.reading-card{margin-top:14px;padding:17px;border-radius:14px;background:linear-gradient(135deg,#4c1d95,#7c3aed);color:#fff}.reading-card span,.reading-card p{color:#ddd6fe;font-size:11px}.reading-card strong{display:block;margin-top:5px;font-size:34px}.reading-card small{font-size:12px}.reading-card p{margin:5px 0 0}.template-list{display:grid;gap:8px}.template-list button{display:flex;flex-direction:column;gap:4px;padding:12px;border: 1px solid var(--c-border);border-radius:11px;background: var(--c-surface-subtle);color:#334155;text-align:left;cursor:pointer}.template-list button:hover{border-color:#a78bfa;background:#f5f3ff}.template-list span{color: var(--c-text-muted);font-size:11px}.export-card{display:flex;flex-direction:column}.export-card h3{margin-bottom:14px}.export-card button+button{margin-top:8px}.export-card button.danger{border-color:#fecaca;color:#b91c1c}.dark .card-heading h3,.dark .export-card h3,.dark .document-state strong{color:#f8fafc}.dark .bar-actions button,.dark .card-heading>button,.dark .export-card button{border-color:#475569;background:#0f172a;color:#cbd5e1}.dark .summary-list{border-color:#334155;background:#334155}.dark .summary-list div,.dark .template-list button{border-color:#334155;background:#0f172a;color: var(--c-text-muted)}.dark .summary-list strong{color:#e2e8f0}.dark .template-list button:hover{border-color:#a78bfa;background:#261846}.dark .editor-card :deep(.md-editor){border-color:#334155}@media(max-width:1100px){.document-bar{grid-template-columns:1fr 1fr}.bar-actions{grid-column:1/-1}.workspace-grid{grid-template-columns:1fr}.side-column{display:grid;grid-template-columns:1fr 1fr}.export-card{grid-column:1/-1}}@media(max-width:680px){.markdown-page{gap:14px}.document-bar,.editor-card,.insight-card,.template-card,.export-card{border-radius:18px}.document-bar{grid-template-columns:1fr;padding:15px}.bar-actions{grid-column:auto;display:grid;grid-template-columns:1fr 1fr}.bar-actions button.primary{grid-column:1/-1}.editor-card,.insight-card,.template-card,.export-card{padding:15px}.editor-card :deep(.md-editor){height:560px}.side-column{display:flex}.card-heading{align-items:center}.document-state{padding-bottom:0}}
.dark .bar-actions button,.dark .card-heading>button,.dark .export-card button{color:#e2e8f0}.dark .summary-list div,.dark .template-list button{color:#cbd5e1}.dark .summary-list strong,.dark .template-list strong{color:#f8fafc}.dark .template-list span{color:#cbd5e1}</style>
