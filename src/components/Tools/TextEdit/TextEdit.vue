<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import type { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import '@wangeditor/editor/dist/css/style.css'
import { ElMessage, ElMessageBox } from 'element-plus'
import { CopyDocument, Delete, Download, FolderOpened, Refresh } from '@element-plus/icons-vue'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import { copy } from '@/utils/string'
import { analyzeText } from '@/utils/textTools'
import {
  buildDocumentFilename,
  buildStandaloneHtml,
  formatDocumentBytes,
  htmlToPlainText,
  plainTextToHtml,
  sanitizeDocumentName,
} from '@/utils/documentStudio'

interface RichTextDraft {
  title: string
  html: string
  updatedAt: number
}

const DRAFT_KEY = 'tools-web:rich-text-draft:v1'
const MAX_FILE_SIZE = 2 * 1024 * 1024
const editorRef = shallowRef<IDomEditor | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const title = ref('未命名内容')
const content = ref('<p><br></p>')
const outputMode = ref<'html' | 'text'>('html')
const lastSavedAt = ref<number | null>(null)
const draftRestored = ref(false)
const dirty = ref(false)
let saveTimer: ReturnType<typeof setTimeout> | null = null

const toolbarConfig: Partial<IToolbarConfig> = {
  excludeKeys: ['uploadImage', 'group-video', 'insertImage', 'insertVideo'],
}
const editorConfig: Partial<IEditorConfig> = {
  placeholder: '开始编写正文，或从右侧选择一个模板…',
  autoFocus: false,
  maxLength: 100_000,
}
const outputOptions = [{ label: 'HTML 源码', value: 'html' }, { label: '纯文本', value: 'text' }]
const templates = [
  {
    title: '产品公告',
    note: '标题、摘要与更新项',
    html: '<h1>产品更新公告</h1><p>用一段简短的话说明本次更新为用户带来的价值。</p><h2>本次更新</h2><ul><li>新增功能</li><li>体验优化</li><li>问题修复</li></ul><blockquote>提示：重要信息可以放在引用区块中。</blockquote>',
  },
  {
    title: '活动通知',
    note: '时间、地点与注意事项',
    html: '<h1>活动通知</h1><p>你好，欢迎参加本次活动。</p><h2>活动信息</h2><p><strong>时间：</strong>待填写</p><p><strong>地点：</strong>待填写</p><h2>注意事项</h2><ol><li>请提前到场</li><li>准备相关材料</li></ol>',
  },
  {
    title: '内容提纲',
    note: '适合文章与说明文',
    html: '<h1>文章标题</h1><p>在这里写一段能够概括全文的开场。</p><h2>背景</h2><p>介绍问题和上下文。</p><h2>核心内容</h2><p>展开主要观点与论据。</p><h2>总结</h2><p>回顾重点，并给出下一步行动。</p>',
  },
]

const plainText = computed(() => htmlToPlainText(content.value))
const statistics = computed(() => analyzeText(plainText.value))
const hasContent = computed(() => Boolean(plainText.value.trim()))
const htmlBytes = computed(() => new TextEncoder().encode(content.value).byteLength)
const outputValue = computed(() => outputMode.value === 'html' ? content.value : plainText.value)
const displayOutput = computed(() => outputMode.value === 'html' ? content.value.replace(/></g, '>\n<') : plainText.value)
const saveStatus = computed(() => {
  if (!hasContent.value) return '空白文档'
  if (dirty.value) return '等待自动保存'
  if (!lastSavedAt.value) return '尚未保存'
  return `已保存 ${new Date(lastSavedAt.value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
})

function handleCreated(editor: IDomEditor) {
  editorRef.value = editor
}

function safeReadDraft(): RichTextDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<RichTextDraft>
    if (typeof value.title !== 'string' || typeof value.html !== 'string' || typeof value.updatedAt !== 'number') return null
    return value as RichTextDraft
  } catch {
    return null
  }
}

const initialDraft = safeReadDraft()
if (initialDraft && htmlToPlainText(initialDraft.html)) {
  title.value = initialDraft.title
  content.value = initialDraft.html
  lastSavedAt.value = initialDraft.updatedAt
  draftRestored.value = true
}

function saveDraft(showMessage = false) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = null
  if (!hasContent.value) {
    localStorage.removeItem(DRAFT_KEY)
    lastSavedAt.value = null
    dirty.value = false
    if (showMessage) ElMessage.info('空白文档无需保存')
    return
  }
  const updatedAt = Date.now()
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ title: title.value, html: content.value, updatedAt }))
  lastSavedAt.value = updatedAt
  dirty.value = false
  if (showMessage) ElMessage.success('草稿已保存到当前浏览器')
}

function scheduleAutoSave() {
  dirty.value = hasContent.value
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => saveDraft(), 700)
}

function applyTemplate(template: typeof templates[number]) {
  title.value = template.title
  content.value = template.html
  ElMessage.success(`已载入“${template.title}”模板`)
}

function sanitizeImportedHtml(html: string) {
  const parsed = new DOMParser().parseFromString(html, 'text/html')
  parsed.querySelectorAll('script,style,iframe,object,embed,form,meta,link').forEach(node => node.remove())
  parsed.body.querySelectorAll('*').forEach(node => {
    for (const attribute of Array.from(node.attributes)) {
      if (/^on/i.test(attribute.name)) node.removeAttribute(attribute.name)
      if ((attribute.name === 'href' || attribute.name === 'src') && /^\s*(?:javascript|data:text\/html)/i.test(attribute.value)) node.removeAttribute(attribute.name)
    }
  })
  return parsed.body.innerHTML || '<p><br></p>'
}

function triggerImport() {
  fileInputRef.value?.click()
}

async function importDocument(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (file.size > MAX_FILE_SIZE) {
    ElMessage.error('文档不能超过 2 MB')
    return
  }
  if (!/\.(?:html?|txt)$/i.test(file.name)) {
    ElMessage.error('请选择 .html、.htm 或 .txt 文件')
    return
  }
  try {
    const source = await file.text()
    content.value = /\.txt$/i.test(file.name) ? plainTextToHtml(source) : sanitizeImportedHtml(source)
    title.value = sanitizeDocumentName(file.name, '导入内容')
    ElMessage.success(`已导入 ${file.name}`)
  } catch {
    ElMessage.error('文档读取失败')
  }
}

function download(value: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([value], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function exportHtml() {
  if (!hasContent.value) return ElMessage.warning('请先输入内容')
  download(buildStandaloneHtml(title.value, content.value), buildDocumentFilename(title.value, 'html'), 'text/html;charset=utf-8')
  ElMessage.success('HTML 文档已导出')
}

function exportText() {
  if (!hasContent.value) return ElMessage.warning('请先输入内容')
  download(plainText.value, buildDocumentFilename(title.value, 'txt'), 'text/plain;charset=utf-8')
  ElMessage.success('纯文本文档已导出')
}

async function clearDocument() {
  if (hasContent.value) {
    try {
      await ElMessageBox.confirm('将清空编辑内容和浏览器草稿，是否继续？', '新建空白内容', { type: 'warning', confirmButtonText: '清空', cancelButtonText: '取消' })
    } catch {
      return
    }
  }
  title.value = '未命名内容'
  content.value = '<p><br></p>'
  localStorage.removeItem(DRAFT_KEY)
  lastSavedAt.value = null
  dirty.value = false
  ElMessage.success('已新建空白内容')
}

watch(() => [title.value, content.value], scheduleAutoSave, { flush: 'post' })

onMounted(() => {
  if (draftRestored.value) ElMessage.success('已恢复上次保存在浏览器中的富文本草稿')
})

onBeforeUnmount(() => {
  if (saveTimer) clearTimeout(saveTimer)
  if (dirty.value) saveDraft()
  editorRef.value?.destroy()
})
</script>

<template>
  <div class="rich-page flex flex-col mt-3 flex-1">
    <ToolHero title="富文本与 HTML 工作台" legacy>

    <section class="studio-hero">
      <div><span class="eyebrow">RICH CONTENT STUDIO</span><h2>专注写内容，HTML 交付自然完成</h2><p>使用可视化工具栏编排正文，同时获得干净的 HTML 和纯文本；支持模板、导入、本地草稿与多格式导出。</p></div>
      <div class="hero-stats"><div><strong>{{ statistics.charactersWithoutWhitespace }}</strong><span>有效字符</span></div><div><strong>{{ statistics.paragraphs }}</strong><span>内容段落</span></div><div><strong>{{ statistics.readingMinutes || '—' }}</strong><span>分钟阅读</span></div></div>
    </section>
    </ToolHero>

    <section class="document-bar">
      <label class="title-field"><span>内容名称</span><el-input v-model="title" maxlength="60" aria-label="富文本内容名称" /></label>
      <div class="document-state"><i :class="{ dirty }"></i><div><strong>{{ saveStatus }}</strong><span>{{ draftRestored ? '已恢复本地草稿 · 后续变化会自动保存' : '所有编辑仅在当前浏览器处理' }}</span></div></div>
      <div class="bar-actions">
        <input ref="fileInputRef" class="file-input" type="file" hidden tabindex="-1" aria-hidden="true" accept=".html,.htm,.txt,text/html,text/plain" @change="importDocument">
        <button type="button" aria-label="导入 HTML 或纯文本文档" @click="triggerImport"><el-icon><FolderOpened /></el-icon>导入</button>
        <button type="button" :disabled="!hasContent" aria-label="复制富文本 HTML" @click="copy(content)"><el-icon><CopyDocument /></el-icon>复制 HTML</button>
        <button type="button" class="primary" :disabled="!hasContent" aria-label="导出富文本 HTML 文档" @click="exportHtml"><el-icon><Download /></el-icon>导出 HTML</button>
      </div>
    </section>

    <div class="workspace-grid">
      <section class="editor-card">
        <header class="card-heading"><div><span class="eyebrow">VISUAL EDITOR</span><h3>可视化内容编辑</h3></div><button type="button" aria-label="立即保存富文本草稿" @click="saveDraft(true)"><el-icon><Refresh /></el-icon>立即保存</button></header>
        <div class="editor-shell">
          <Toolbar :editor="editorRef || undefined" :default-config="toolbarConfig" mode="default" />
          <Editor v-model="content" :default-config="editorConfig" mode="default" @on-created="handleCreated" />
        </div>
      </section>

      <aside class="side-column">
        <section class="insight-card">
          <header class="card-heading"><div><span class="eyebrow">CONTENT PULSE</span><h3>内容概览</h3></div></header>
          <div class="summary-list"><div><span>字符数</span><strong>{{ statistics.characters }}</strong></div><div><span>段落 / 行</span><strong>{{ statistics.paragraphs }} / {{ statistics.lines }}</strong></div><div><span>阅读时间</span><strong>{{ statistics.readingMinutes || 0 }} 分钟</strong></div><div><span>HTML 体积</span><strong>{{ formatDocumentBytes(htmlBytes) }}</strong></div></div>
        </section>
        <section class="template-card">
          <header class="card-heading"><div><span class="eyebrow">QUICK START</span><h3>内容模板</h3></div></header>
          <div class="template-list"><button v-for="template in templates" :key="template.title" type="button" @click="applyTemplate(template)"><strong>{{ template.title }}</strong><span>{{ template.note }}</span></button></div>
        </section>
      </aside>
    </div>

    <section class="source-card">
      <header class="source-heading"><div><span class="eyebrow">DELIVERY SOURCE</span><h3>交付源码</h3><p>随编辑器实时更新，可复制 HTML 或提取纯文本</p></div><div class="source-actions"><el-segmented v-model="outputMode" :options="outputOptions" /><button type="button" aria-label="复制当前富文本交付内容" :disabled="!outputValue" @click="copy(outputValue)"><el-icon><CopyDocument /></el-icon>复制当前内容</button></div></header>
      <pre aria-label="富文本交付源码">{{ displayOutput || '开始编辑后，这里会出现可交付的源码。' }}</pre>
      <div class="delivery-actions"><button type="button" aria-label="导出富文本的纯文本内容" :disabled="!hasContent" @click="exportText"><el-icon><Download /></el-icon>导出纯文本</button><button type="button" class="danger" aria-label="新建空白富文本内容" @click="clearDocument"><el-icon><Delete /></el-icon>新建空白内容</button></div>
    </section>

    <ToolGuide title="导入、安全与隐私说明"><div class="detail-copy">支持导入 HTML 与纯文本文件；导入 HTML 时会移除脚本、嵌入框架、事件属性和危险链接，再交给编辑器处理。正文、草稿和导出文件都在当前浏览器中生成，不会上传到服务器。工具栏不提供图片或视频上传，以避免误以为媒体文件会被托管。</div></ToolGuide>
  </div>
</template>

<style scoped>
.rich-page{gap:18px}.studio-hero,.document-bar,.editor-card,.insight-card,.template-card,.source-card{border:1px solid #e2e8f0;border-radius:22px;background:#fff;box-shadow:0 14px 36px rgba(15,23,42,.06)}.studio-hero{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:26px;padding:30px;background:radial-gradient(circle at 86% 8%,rgba(45,212,191,.28),transparent 36%),linear-gradient(135deg,#042f2e,#115e59 58%,#0f766e);color:#fff}.eyebrow{display:block;margin-bottom:8px;color:#99f6e4;font-size:11px;font-weight:900;letter-spacing:.17em}.studio-hero h2{margin:0;font-size:28px;line-height:1.25}.studio-hero p{max-width:720px;margin:12px 0 0;color:#ccfbf1;line-height:1.8}.hero-stats{display:grid;grid-template-columns:repeat(3,104px);align-items:center}.hero-stats div{text-align:center;border-left:1px solid rgba(255,255,255,.18)}.hero-stats strong,.hero-stats span{display:block}.hero-stats strong{font-size:22px}.hero-stats span{margin-top:5px;color:#ccfbf1;font-size:11px}.document-bar{display:grid;grid-template-columns:minmax(220px,1fr) minmax(240px,.8fr) auto;align-items:end;gap:18px;padding:18px 20px}.title-field{display:flex;flex-direction:column;gap:7px}.title-field>span{color:#64748b;font-size:11px;font-weight:800}.document-state{display:flex;align-items:center;gap:10px;padding-bottom:7px}.document-state i{width:9px;height:9px;border-radius:50%;background:#14b8a6;box-shadow:0 0 0 4px #ccfbf1}.document-state i.dirty{background:#f59e0b;box-shadow:0 0 0 4px #fef3c7}.document-state strong,.document-state span{display:block}.document-state strong{color:#334155;font-size:12px}.document-state span{margin-top:3px;color:#94a3b8;font-size:10px}.bar-actions{display:flex;gap:8px}.bar-actions button,.card-heading>button,.source-actions button,.delivery-actions button{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:38px;padding:0 12px;border:1px solid #dbe3ef;border-radius:10px;background:#fff;color:#475569;font-weight:750;cursor:pointer}.bar-actions button.primary{border-color:#0d9488;background:#0d9488;color:#fff}.bar-actions button:disabled,.source-actions button:disabled,.delivery-actions button:disabled{cursor:not-allowed;opacity:.45}.file-input{position:absolute;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none}.workspace-grid{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(280px,.58fr);gap:18px}.editor-card,.insight-card,.template-card,.source-card{padding:22px}.card-heading,.source-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:18px}.card-heading h3,.source-heading h3{margin:0;color:#0f172a;font-size:20px}.card-heading>button{min-height:34px}.editor-shell{height:620px;overflow:hidden;border:1px solid #e2e8f0;border-radius:14px;background:#fff}.editor-shell :deep(.w-e-toolbar){overflow-x:auto;border-bottom:1px solid #e2e8f0}.editor-shell :deep(.w-e-text-container){height:570px!important}.side-column{display:flex;flex-direction:column;gap:18px}.summary-list{display:grid;gap:1px;overflow:hidden;border:1px solid #e2e8f0;border-radius:13px;background:#e2e8f0}.summary-list div{display:flex;justify-content:space-between;padding:13px;background:#f8fafc;color:#64748b;font-size:12px}.summary-list strong{color:#1e293b}.template-list{display:grid;gap:8px}.template-list button{display:flex;flex-direction:column;gap:4px;padding:12px;border:1px solid #e2e8f0;border-radius:11px;background:#f8fafc;color:#334155;text-align:left;cursor:pointer}.template-list button:hover{border-color:#2dd4bf;background:#f0fdfa}.template-list span{color:#94a3b8;font-size:11px}.source-heading p{margin:5px 0 0;color:#64748b;font-size:12px}.source-actions{display:flex;gap:8px}.source-actions :deep(.el-segmented){min-width:210px}.source-card pre{box-sizing:border-box;min-height:210px;max-height:420px;margin:0;padding:18px;overflow:auto;border:1px solid #e2e8f0;border-radius:14px;background:#0f172a;color:#cbd5e1;font:12px/1.75 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;word-break:break-word}.delivery-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}.delivery-actions button.danger{border-color:#fecaca;color:#b91c1c}.detail-copy{color:#64748b;font-size:14px;line-height:1.9}.dark .document-bar,.dark .editor-card,.dark .insight-card,.dark .template-card,.dark .source-card{border-color:#334155;background:#1e293b}.dark .card-heading h3,.dark .source-heading h3,.dark .document-state strong{color:#f8fafc}.dark .bar-actions button,.dark .card-heading>button,.dark .source-actions button,.dark .delivery-actions button{border-color:#475569;background:#0f172a;color:#cbd5e1}.dark .summary-list{border-color:#334155;background:#334155}.dark .summary-list div,.dark .template-list button{border-color:#334155;background:#0f172a;color:#94a3b8}.dark .summary-list strong{color:#e2e8f0}.dark .template-list button:hover{border-color:#2dd4bf;background:#073b38}.dark .editor-shell{border-color:#334155;background:#0f172a}.dark .editor-shell :deep(.w-e-toolbar){border-color:#334155;background:#0f172a;color:#cbd5e1}.dark .editor-shell :deep(.w-e-text-container),.dark .editor-shell :deep(.w-e-scroll){background:#111827;color:#e2e8f0}.dark .editor-shell :deep(.w-e-text-placeholder){color:#64748b}@media(max-width:1100px){.document-bar{grid-template-columns:1fr 1fr}.bar-actions{grid-column:1/-1}.workspace-grid{grid-template-columns:1fr}.side-column{display:grid;grid-template-columns:1fr 1fr}}@media(max-width:680px){.rich-page{gap:14px}.studio-hero,.document-bar,.editor-card,.insight-card,.template-card,.source-card{border-radius:18px}.studio-hero{grid-template-columns:1fr;padding:22px 18px}.studio-hero h2{font-size:24px}.hero-stats{grid-template-columns:repeat(3,1fr)}.hero-stats div:first-child{border-left:0}.document-bar{grid-template-columns:1fr;padding:15px}.bar-actions{grid-column:auto;display:grid;grid-template-columns:1fr 1fr}.bar-actions button.primary{grid-column:1/-1}.editor-card,.insight-card,.template-card,.source-card{padding:15px}.editor-shell{height:560px}.editor-shell :deep(.w-e-text-container){height:510px!important}.side-column{display:flex}.source-heading{flex-direction:column}.source-actions{display:grid;width:100%}.source-actions :deep(.el-segmented){min-width:0;width:100%}.delivery-actions{display:grid;grid-template-columns:1fr 1fr}.document-state{padding-bottom:0}}@media(max-width:430px){.hero-stats strong{font-size:19px}}
</style>
