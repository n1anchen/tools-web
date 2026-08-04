<script setup lang="ts">
import { computed, ref } from 'vue'
import * as XLSX from 'xlsx'
import { ElMessage, ElMessageBox } from 'element-plus'
import { CopyDocument, Delete, DocumentAdd, Download, EditPen, FolderOpened, Plus, Refresh, UploadFilled } from '@element-plus/icons-vue'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import ChartDataGrid from '@/components/Tools/Chart/ChartDataGrid.vue'
import { copy } from '@/utils/string'
import {
  analyzeSheet,
  inferJsonScalar,
  makeUniqueSheetName,
  parseDelimited,
  parseJsonSheets,
  rowsToJson,
  serializeDelimited,
  sheetsToJson,
  type DataSheet,
  type Delimiter,
  type JsonShape,
} from '@/utils/spreadsheetConverter'

type ExportFormat = 'xlsx' | 'delimited' | 'json'
type ImportEncoding = 'utf-8' | 'gb18030'
type EditorMode = 'delimited' | 'json' | 'grid'

const MAX_FILE_BYTES = 25 * 1024 * 1024
const MAX_ROWS = 5001
const MAX_COLUMNS = 100
let idSeed = 0

function nextId(prefix = 'sheet') { idSeed += 1; return `${prefix}-${Date.now()}-${idSeed}` }
function cloneRows(rows: string[][]) { return rows.map(row => [...row]) }
function sampleSheets(): DataSheet[] {
  return [
    {
      id: nextId('sample'), name: '销售明细', rows: [
        ['日期', '区域', '产品', '数量', '销售额', '已回款'],
        ['2026-07-01', '华东', '专业版', '12', '35880', 'true'],
        ['2026-07-02', '华南', '团队版', '8', '15920', 'true'],
        ['2026-07-03', '华北', '旗舰版', '3', '26880', 'false'],
        ['2026-07-04', '西南', '专业版', '6', '17940', 'true'],
        ['2026-07-05', '华东', '团队版', '10', '19900', 'false'],
      ],
    },
    {
      id: nextId('sample'), name: '区域汇总', rows: [
        ['区域', '订单数', '销售额'], ['华东', '22', '55780'], ['华南', '8', '15920'], ['华北', '3', '26880'], ['西南', '6', '17940'],
      ],
    },
  ]
}

const sheets = ref<DataSheet[]>(sampleSheets())
const activeSheetId = ref(sheets.value[0].id)
const fileInput = ref<HTMLInputElement | null>(null)
const sourceName = ref('示例工作簿')
const sourceSize = ref(0)
const importEncoding = ref<ImportEncoding>('utf-8')
const exportFormat = ref<ExportFormat>('xlsx')
const delimiter = ref<Delimiter>(',')
const includeBom = ref(true)
const quoteAll = ref(false)
const firstRowHeader = ref(true)
const jsonShape = ref<JsonShape>('records')
const inferTypes = ref(true)
const exportAllSheets = ref(true)
const outputBaseName = ref('table-data')
const editingSheetId = ref('')
const editingSheetName = ref('')
const dragging = ref(false)
const editorMode = ref<EditorMode>('delimited')
const sourceText = ref(serializeDelimited(sheets.value[0].rows))
const sourceError = ref('')

const activeSheet = computed(() => sheets.value.find(sheet => sheet.id === activeSheetId.value) ?? sheets.value[0])
const gridText = computed({
  get: () => activeSheet.value ? serializeDelimited(activeSheet.value.rows) : '',
  set: value => { if (activeSheet.value) activeSheet.value.rows = parseDelimited(value, ',') },
})
const analysis = computed(() => analyzeSheet(activeSheet.value?.rows ?? [['']], firstRowHeader.value))
const totalRows = computed(() => sheets.value.reduce((sum, sheet) => sum + analyzeSheet(sheet.rows, firstRowHeader.value).rows, 0))
const totalCells = computed(() => sheets.value.reduce((sum, sheet) => {
  const item = analyzeSheet(sheet.rows, firstRowHeader.value)
  return sum + item.filledCells
}, 0))
const sourceLines = computed(() => sourceText.value ? sourceText.value.split(/\r?\n/).length : 0)
const sourceMeta = computed(() => {
  if (sourceSize.value) return `${(sourceSize.value / 1024).toFixed(1)} KB`
  if (sourceName.value === '示例工作簿') return '内置示例数据'
  return sourceName.value.startsWith('粘贴') ? '在线粘贴内容' : '本地数据'
})
const outputExtension = computed(() => exportFormat.value === 'xlsx' ? 'xlsx' : exportFormat.value === 'json' ? 'json' : delimiter.value === '\t' ? 'tsv' : 'csv')
const outputFilename = computed(() => `${sanitizeFilename(outputBaseName.value || 'table-data')}.${outputExtension.value}`)
const formatNote = computed(() => {
  if (exportFormat.value === 'xlsx') return `保留 ${exportAllSheets.value ? sheets.value.length : 1} 个工作表，自动设置可读列宽`
  if (exportFormat.value === 'json') return `${jsonShape.value === 'records' ? '对象数组' : '二维数组'} · ${exportAllSheets.value ? '按工作表名称分组' : '仅当前工作表'}`
  return `${delimiterName(delimiter.value)} · UTF-8${includeBom.value ? ' BOM' : ''} · 仅导出当前工作表`
})
const previewText = computed(() => {
  if (!activeSheet.value) return ''
  if (exportFormat.value === 'json') {
    const scoped = exportAllSheets.value ? sheets.value : [activeSheet.value]
    return JSON.stringify(sheetsToJson(scoped, { shape: jsonShape.value, firstRowHeader: firstRowHeader.value, inferTypes: inferTypes.value, allSheets: exportAllSheets.value }), null, 2)
  }
  const rows = activeSheet.value.rows.slice(0, 16)
  return serializeDelimited(rows, exportFormat.value === 'xlsx' ? '\t' : delimiter.value, quoteAll.value)
})

function delimiterName(value: Delimiter) {
  return value === ',' ? '逗号分隔' : value === '\t' ? 'Tab 分隔' : value === ';' ? '分号分隔' : '管道符分隔'
}

function sanitizeFilename(value: string) {
  return value.trim().replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'table-data'
}

function normalizedRows(source: unknown[][], sheetName: string) {
  const clippedRows = source.slice(0, MAX_ROWS)
  const clipped = clippedRows.map(row => row.slice(0, MAX_COLUMNS).map(cell => {
    if (cell === null || cell === undefined) return ''
    if (cell instanceof Date) return Number.isNaN(cell.getTime()) ? '' : cell.toISOString().slice(0, 10)
    return typeof cell === 'object' ? JSON.stringify(cell) : String(cell)
  }))
  if (source.length > MAX_ROWS || source.some(row => row.length > MAX_COLUMNS)) {
    ElMessage.warning(`${sheetName} 超出在线编辑范围，已保留前 ${MAX_ROWS - 1} 行数据、${MAX_COLUMNS} 列`)
  }
  return clipped.length ? clipped : [['列 1', '列 2'], ['', '']]
}

function refreshSource(mode = editorMode.value) {
  sourceError.value = ''
  if (!activeSheet.value || mode === 'grid') { sourceText.value = ''; return }
  if (mode === 'delimited') sourceText.value = serializeDelimited(activeSheet.value.rows)
  else sourceText.value = JSON.stringify(rowsToJson(activeSheet.value.rows, { shape: 'records', firstRowHeader: firstRowHeader.value, inferTypes: inferTypes.value }), null, 2)
}

function applySource(showMessage = true) {
  sourceError.value = ''
  if (!sourceText.value.trim()) {
    sourceError.value = editorMode.value === 'json' ? '请粘贴 JSON 或 JSON Lines 内容' : '请粘贴 CSV 或 TSV 内容'
    if (showMessage) ElMessage.warning(sourceError.value)
    return false
  }
  try {
    if (editorMode.value === 'delimited') {
      if (!activeSheet.value) return false
      activeSheet.value.rows = normalizedRows(parseDelimited(sourceText.value), activeSheet.value.name)
      sourceName.value = '粘贴的 CSV / TSV'
      sourceSize.value = 0
      if (showMessage) ElMessage.success(`已转换为 ${analysis.value.rows} 行 × ${analysis.value.columns} 列表格`)
    } else if (editorMode.value === 'json') {
      const imported = parseJsonSheets(sourceText.value).map(sheet => ({ ...sheet, id: nextId('paste-json'), rows: normalizedRows(sheet.rows, sheet.name) }))
      if (imported.length > 1) {
        sheets.value = imported
        activeSheetId.value = imported[0].id
        exportAllSheets.value = true
      } else if (activeSheet.value && imported[0]) {
        activeSheet.value.rows = imported[0].rows
        if (imported[0].name !== 'Sheet1') {
          const otherNames = sheets.value.filter(sheet => sheet.id !== activeSheet.value?.id).map(sheet => sheet.name)
          activeSheet.value.name = makeUniqueSheetName(otherNames, imported[0].name)
        }
      }
      sourceName.value = '粘贴的 JSON'
      sourceSize.value = 0
      if (showMessage) ElMessage.success(imported.length > 1 ? `已转换为 ${imported.length} 个工作表` : `已转换为 ${analysis.value.rows} 行表格`)
    }
    return true
  } catch (error) {
    sourceError.value = error instanceof Error ? error.message : '内容解析失败'
    if (showMessage) ElMessage.error(sourceError.value)
    return false
  }
}

function changeEditorMode(mode: EditorMode) {
  if (mode === editorMode.value) return
  if (editorMode.value !== 'grid' && !applySource(false)) return ElMessage.error(sourceError.value)
  editorMode.value = mode
  if (mode !== 'grid') refreshSource(mode)
}

function convertSourceToGrid() {
  if (!applySource()) return
  editorMode.value = 'grid'
}

function selectSheet(id: string) {
  if (id === activeSheetId.value) return
  if (editorMode.value !== 'grid' && !applySource(false)) return ElMessage.error(sourceError.value)
  activeSheetId.value = id
  if (editorMode.value !== 'grid') refreshSource()
}

async function importFile(file: File) {
  if (file.size > MAX_FILE_BYTES) return ElMessage.error('文件超过 25 MB，建议先拆分后再导入')
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  try {
    let imported: DataSheet[] = []
    if (['xlsx', 'xls', 'xlsm', 'xlsb', 'ods'].includes(extension)) {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
      imported = workbook.SheetNames.map((name, index) => {
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, raw: false, defval: '', dateNF: 'yyyy-mm-dd' }) as unknown[][]
        return { id: nextId('xlsx'), name: makeUniqueSheetName(workbook.SheetNames.slice(0, index), name), rows: normalizedRows(rows, name) }
      })
    } else {
      const text = new TextDecoder(importEncoding.value).decode(await file.arrayBuffer())
      if (extension === 'json' || extension === 'jsonl' || extension === 'ndjson') {
        imported = parseJsonSheets(text).map(sheet => ({ ...sheet, id: nextId('json'), rows: normalizedRows(sheet.rows, sheet.name) }))
      } else {
        const baseName = file.name.replace(/\.[^.]+$/, '') || 'Sheet1'
        const rows = parseDelimited(text, extension === 'tsv' ? '\t' : undefined)
        imported = [{ id: nextId('text'), name: makeUniqueSheetName([], baseName), rows: normalizedRows(rows, baseName) }]
      }
    }
    if (!imported.length) throw new Error('文件中没有可读取的工作表')
    sheets.value = imported
    activeSheetId.value = imported[0].id
    editorMode.value = 'grid'
    sourceText.value = ''
    sourceError.value = ''
    sourceName.value = file.name
    sourceSize.value = file.size
    outputBaseName.value = file.name.replace(/\.[^.]+$/, '') || 'table-data'
    exportAllSheets.value = imported.length > 1
    ElMessage.success(`已在本地读取 ${imported.length} 个工作表`)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '文件读取失败，请确认格式是否正确')
  }
}

function handleFileInput(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) void importFile(file)
  input.value = ''
}

function handleDrop(event: DragEvent) {
  dragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) void importFile(file)
}

function resetSample() {
  sheets.value = sampleSheets()
  activeSheetId.value = sheets.value[0].id
  sourceName.value = '示例工作簿'
  sourceSize.value = 0
  outputBaseName.value = 'table-data'
  exportAllSheets.value = true
  editorMode.value = 'delimited'
  refreshSource('delimited')
}

function addSheet() {
  if (editorMode.value !== 'grid' && !applySource(false)) return ElMessage.error(sourceError.value)
  const name = makeUniqueSheetName(sheets.value.map(sheet => sheet.name))
  const sheet = { id: nextId('blank'), name, rows: [['列 1', '列 2'], ['', '']] }
  sheets.value.push(sheet)
  activeSheetId.value = sheet.id
  if (editorMode.value !== 'grid') refreshSource()
  startRename(sheet)
}

function duplicateSheet() {
  if (editorMode.value !== 'grid' && !applySource(false)) return ElMessage.error(sourceError.value)
  if (!activeSheet.value) return
  const sheet = { id: nextId('copy'), name: makeUniqueSheetName(sheets.value.map(item => item.name), `${activeSheet.value.name} 副本`), rows: cloneRows(activeSheet.value.rows) }
  sheets.value.push(sheet)
  activeSheetId.value = sheet.id
  if (editorMode.value !== 'grid') refreshSource()
  ElMessage.success('已复制当前工作表')
}

function startRename(sheet = activeSheet.value) {
  if (!sheet) return
  editingSheetId.value = sheet.id
  editingSheetName.value = sheet.name
}

function commitRename() {
  const sheet = sheets.value.find(item => item.id === editingSheetId.value)
  if (!sheet) return
  const otherNames = sheets.value.filter(item => item.id !== sheet.id).map(item => item.name)
  sheet.name = makeUniqueSheetName(otherNames, editingSheetName.value)
  editingSheetId.value = ''
}

async function removeSheet() {
  if (editorMode.value !== 'grid' && !applySource(false)) return ElMessage.error(sourceError.value)
  if (!activeSheet.value) return
  if (sheets.value.length === 1) return ElMessage.warning('至少保留一个工作表')
  try {
    await ElMessageBox.confirm(`确定删除工作表“${activeSheet.value.name}”吗？`, '删除工作表', { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' })
    const index = sheets.value.findIndex(sheet => sheet.id === activeSheetId.value)
    sheets.value.splice(index, 1)
    activeSheetId.value = sheets.value[Math.max(0, index - 1)].id
    if (editorMode.value !== 'grid') refreshSource()
  } catch { /* 用户取消 */ }
}

function typedRows(rows: string[][]) {
  return rows.map(row => row.map(cell => inferTypes.value ? inferJsonScalar(cell) : cell))
}

function autoColumns(rows: string[][]) {
  const count = Math.max(1, ...rows.map(row => row.length))
  return Array.from({ length: count }, (_, column) => ({ wch: Math.min(42, Math.max(10, ...rows.slice(0, 300).map(row => String(row[column] ?? '').length + 2))) }))
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function exportData() {
  if (!activeSheet.value) return
  try {
    if (exportFormat.value === 'xlsx') {
      const workbook = XLSX.utils.book_new()
      const scoped = exportAllSheets.value ? sheets.value : [activeSheet.value]
      scoped.forEach(sheet => {
        const worksheet = XLSX.utils.aoa_to_sheet(typedRows(sheet.rows))
        worksheet['!cols'] = autoColumns(sheet.rows)
        XLSX.utils.book_append_sheet(workbook, worksheet, makeUniqueSheetName(workbook.SheetNames, sheet.name))
      })
      const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array', compression: true }) as ArrayBuffer
      downloadBlob(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), outputFilename.value)
    } else if (exportFormat.value === 'json') {
      const scoped = exportAllSheets.value ? sheets.value : [activeSheet.value]
      const data = sheetsToJson(scoped, { shape: jsonShape.value, firstRowHeader: firstRowHeader.value, inferTypes: inferTypes.value, allSheets: exportAllSheets.value })
      downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' }), outputFilename.value)
    } else {
      const content = serializeDelimited(activeSheet.value.rows, delimiter.value, quoteAll.value)
      downloadBlob(new Blob([includeBom.value ? `\uFEFF${content}` : content], { type: 'text/csv;charset=utf-8' }), outputFilename.value)
    }
    ElMessage.success(`已生成 ${outputFilename.value}`)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '导出失败')
  }
}

function copyPreview() {
  copy(previewText.value)
  ElMessage.success('已复制当前转换预览')
}
</script>

<template>
  <div class="sheet-page flex flex-col mt-3 flex-1">
    <ToolHero summary="XLSX、CSV 与 JSON，在一张表里自由往返">
      <template #metrics>
        <div class="hero-metrics">
          <div><span>工作表</span><strong>{{ sheets.length }}</strong></div>
          <div><span>数据行</span><strong>{{ totalRows.toLocaleString() }}</strong></div>
          <div><span>有效单元格</span><strong>{{ totalCells.toLocaleString() }}</strong></div>
        </div>
      </template>
    </ToolHero>

    <section class="source-card">
      <div class="section-title"><div><span class="eyebrow">01 · IMPORT</span><h3>导入文件或从示例开始</h3><p>XLSX / XLS / ODS 会保留多个工作表；CSV、TSV、JSON 与 JSON Lines 会自动识别结构。</p></div><el-button :icon="Refresh" @click="resetSample">恢复示例</el-button></div>
      <div class="import-layout">
        <div class="drop-zone" :class="{ dragging }" @dragenter.prevent="dragging = true" @dragover.prevent @dragleave.prevent="dragging = false" @drop.prevent="handleDrop">
          <el-icon><UploadFilled /></el-icon><div><strong>拖入表格数据文件</strong><span>最大 25 MB · 文件全程留在本机</span></div>
          <button type="button" @click="fileInput?.click()">选择文件</button>
          <input ref="fileInput" type="file" accept=".xlsx,.xls,.xlsm,.xlsb,.ods,.csv,.tsv,.json,.jsonl,.ndjson" hidden @change="handleFileInput">
        </div>
        <div class="source-summary">
          <div><span>当前来源</span><strong>{{ sourceName }}</strong><small>{{ sourceMeta }}</small></div>
          <label><span>文本文件编码</span><select v-model="importEncoding"><option value="utf-8">UTF-8</option><option value="gb18030">GBK / GB18030</option></select><small>仅影响 CSV、TSV 与 JSON 导入</small></label>
        </div>
      </div>
    </section>

    <section class="editor-card">
      <div class="section-title"><div><span class="eyebrow">02 · INPUT & EDIT</span><h3>粘贴数据并转换，或直接编辑表格</h3><p>CSV / TSV、JSON 与可视表格是对等入口，切换时自动解析并同步当前数据。</p></div><div class="sheet-actions"><button type="button" aria-label="新建工作表" @click="addSheet"><el-icon><Plus /></el-icon>新建</button><button type="button" aria-label="复制当前工作表" @click="duplicateSheet"><el-icon><DocumentAdd /></el-icon>复制</button><button type="button" aria-label="重命名当前工作表" @click="startRename()"><el-icon><EditPen /></el-icon>重命名</button><button type="button" class="danger" aria-label="删除当前工作表" @click="removeSheet"><el-icon><Delete /></el-icon>删除</button></div></div>
      <div class="editor-mode-tabs" aria-label="数据输入方式">
        <button type="button" :class="{ active: editorMode === 'delimited' }" @click="changeEditorMode('delimited')"><strong>CSV / TSV</strong><span>粘贴分隔文本</span></button>
        <button type="button" :class="{ active: editorMode === 'json' }" @click="changeEditorMode('json')"><strong>JSON</strong><span>对象、数组或 JSON Lines</span></button>
        <button type="button" :class="{ active: editorMode === 'grid' }" @click="changeEditorMode('grid')"><strong>可视表格</strong><span>像 Excel 一样编辑</span></button>
      </div>
      <div class="sheet-tabs" aria-label="工作表选择">
        <button v-for="sheet in sheets" :key="sheet.id" type="button" :class="{ active: sheet.id === activeSheetId }" @click="selectSheet(sheet.id)"><el-icon><FolderOpened /></el-icon>{{ sheet.name }}<span>{{ analyzeSheet(sheet.rows, firstRowHeader).rows }}</span></button>
      </div>
      <div v-if="editingSheetId" class="rename-bar"><label>工作表名称<input v-model="editingSheetName" maxlength="31" autofocus @keydown.enter="commitRename" @keydown.esc="editingSheetId = ''"></label><button type="button" @click="commitRename">保存</button><button type="button" @click="editingSheetId = ''">取消</button></div>
      <div v-if="editorMode !== 'grid'" class="source-editor">
        <header><div><strong>{{ editorMode === 'json' ? '粘贴 JSON 数据' : '粘贴 CSV / TSV 数据' }}</strong><span>{{ editorMode === 'json' ? '支持对象数组、二维数组、多数据集对象与 JSON Lines' : '自动识别逗号、Tab、分号和管道符，支持带引号字段' }}</span></div><button type="button" @click="convertSourceToGrid">转换为可视表格</button></header>
        <textarea v-model="sourceText" :aria-label="editorMode === 'json' ? 'JSON 数据输入' : 'CSV 或 TSV 数据输入'" spellcheck="false" :placeholder="editorMode === 'json' ? '[{ &quot;name&quot;: &quot;示例&quot;, &quot;value&quot;: 12 }]' : '名称,数值\n示例,12'"></textarea>
        <footer :class="{ error: sourceError }"><span v-if="sourceError" role="alert">{{ sourceError }}</span><span v-else>{{ sourceLines }} 行 · {{ sourceText.length.toLocaleString() }} 个字符</span><small>点击转换后进入表格，也可以直接切换到另一种格式继续互转</small></footer>
      </div>
      <ChartDataGrid v-else v-model="gridText" :min-columns="2" :max-rows="MAX_ROWS" :max-columns="MAX_COLUMNS" :aria-label="`${activeSheet?.name ?? '当前'}工作表在线编辑`" footer-hint="Enter 跳到下一行，修改后转换预览实时刷新" />
      <div class="quality-grid">
        <div><span>有效数据</span><strong>{{ analysis.rows }} 行 × {{ analysis.columns }} 列</strong></div>
        <div><span>已填写单元格</span><strong>{{ analysis.filledCells.toLocaleString() }}</strong></div>
        <div><span>纯数字列</span><strong>{{ analysis.numericColumns }}</strong></div>
        <div :class="{ warning: analysis.duplicateHeaders.length }"><span>表头检查</span><strong>{{ analysis.duplicateHeaders.length ? `${analysis.duplicateHeaders.length} 个重名` : '未发现重名' }}</strong></div>
      </div>
    </section>

    <section class="convert-card">
      <div class="section-title"><div><span class="eyebrow">03 · CONVERT</span><h3>设置输出格式</h3><p>同一份编辑结果可反复导出，不需要重新上传或转换。</p></div></div>
      <div class="convert-layout">
        <div class="format-panel">
          <div class="format-tabs" aria-label="输出格式">
            <button type="button" :class="{ active: exportFormat === 'xlsx' }" @click="exportFormat = 'xlsx'">XLSX<small>完整工作簿</small></button>
            <button type="button" :class="{ active: exportFormat === 'delimited' }" @click="exportFormat = 'delimited'">CSV / TSV<small>当前工作表</small></button>
            <button type="button" :class="{ active: exportFormat === 'json' }" @click="exportFormat = 'json'">JSON<small>对象或矩阵</small></button>
          </div>
          <div class="option-grid">
            <label><span>输出文件名</span><input v-model="outputBaseName" placeholder="table-data"><small>将导出为 {{ outputFilename }}</small></label>
            <label v-if="exportFormat === 'delimited'"><span>分隔符</span><select v-model="delimiter"><option value=",">逗号 CSV</option><option :value="'\t'">Tab TSV</option><option value=";">分号</option><option value="|">管道符</option></select></label>
            <label v-if="exportFormat === 'json'"><span>JSON 结构</span><select v-model="jsonShape"><option value="records">对象数组</option><option value="matrix">二维数组</option></select></label>
            <label class="toggle-field"><span>首行为表头</span><el-switch v-model="firstRowHeader" /><small>对象数组使用首行作为键名</small></label>
            <label v-if="exportFormat !== 'delimited'" class="toggle-field"><span>自动推断类型</span><el-switch v-model="inferTypes" /><small>数字、布尔值和 null 不再加引号</small></label>
            <label v-if="exportFormat !== 'delimited'" class="toggle-field"><span>导出全部工作表</span><el-switch v-model="exportAllSheets" /><small>关闭后仅导出 {{ activeSheet?.name }}</small></label>
            <label v-if="exportFormat === 'delimited'" class="toggle-field"><span>加入 UTF-8 BOM</span><el-switch v-model="includeBom" /><small>提高中文 CSV 在 Excel 中的兼容性</small></label>
            <label v-if="exportFormat === 'delimited'" class="toggle-field"><span>所有字段加引号</span><el-switch v-model="quoteAll" /><small>适合需要严格文本字段的系统</small></label>
          </div>
          <div class="export-summary"><div><strong>{{ outputFilename }}</strong><span>{{ formatNote }}</span></div><el-button type="primary" size="large" :icon="Download" @click="exportData">生成并下载</el-button></div>
        </div>
        <div class="preview-panel">
          <header><div><span>转换预览</span><small>{{ exportFormat === 'xlsx' ? '以 TSV 形式预览当前工作表前 15 行' : '根据当前设置实时生成' }}</small></div><el-button :icon="CopyDocument" @click="copyPreview">复制</el-button></header>
          <pre>{{ previewText }}</pre>
        </div>
      </div>
    </section>

    <ToolGuide title="格式说明与使用建议">
      <div class="detail-grid">
        <article><strong>XLSX / XLS / ODS</strong><p>导入时读取所有工作表和单元格显示值；在线编辑后可重新生成 XLSX。为避免执行不可信内容，公式按当前结果值读取，宏不会被保留。</p></article>
        <article><strong>CSV / TSV</strong><p>自动识别逗号、Tab、分号和管道符，支持引号、字段内换行与中文 BOM。CSV 只能承载一个工作表，因此始终导出当前页。</p></article>
        <article><strong>JSON / JSON Lines</strong><p>支持对象数组、二维数组、单个对象及以工作表名分组的对象。重名表头导出对象时会自动追加编号，空单元格输出为 null。</p></article>
        <article><strong>处理边界</strong><p>单文件上限 25 MB；在线编辑保留每个工作表前 5,000 行、100 列。超大数据集建议使用桌面表格软件或数据库工具。</p></article>
      </div>
    </ToolGuide>
  </div>
</template>

<style scoped>
.sheet-page{--accent:#2563eb;--accent-soft:#eff6ff;gap:18px}.source-card,.editor-card,.convert-card{border:1px solid #e2e8f0;border-radius:22px;background:#fff;box-shadow:0 14px 38px rgba(15,23,42,.055)}.eyebrow{display:block;color:var(--accent);font-size:11px;font-weight:900;letter-spacing:.14em}.hero-metrics{display:grid;grid-template-columns:repeat(3,minmax(96px,1fr));min-width:320px;overflow:hidden;border:1px solid #e0e9f4;border-radius:18px;background:rgba(255,255,255,.78)}.hero-metrics div{padding:12px 14px;text-align:center;border-left:1px solid #e5edf6}.hero-metrics div:first-child{border-left:0}.hero-metrics span,.hero-metrics strong{display:block}.hero-metrics span{margin-top:4px;color:#7a899c;font-size:12px}.hero-metrics strong{overflow:hidden;color:#334155;font-size:18px;text-overflow:ellipsis;white-space:nowrap}.source-card,.editor-card,.convert-card{padding:22px}.section-title{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.section-title h3{margin:4px 0 5px;color:#0f172a;font-size:19px}.section-title p{margin:0;color:#64748b;font-size:13px;line-height:1.6}.import-layout{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(250px,.5fr);gap:14px;margin-top:17px}.drop-zone{display:flex;min-height:112px;align-items:center;gap:14px;padding:18px;border:1.5px dashed #bfdbfe;border-radius:16px;background:#f8fbff;transition:.18s}.drop-zone.dragging{border-color:var(--accent);background:#eff6ff;transform:translateY(-2px)}.drop-zone>.el-icon{flex:none;color:var(--accent);font-size:31px}.drop-zone div{flex:1}.drop-zone strong,.drop-zone span{display:block}.drop-zone strong{color:#1e293b;font-size:14px}.drop-zone span{margin-top:4px;color:#64748b;font-size:12px}.drop-zone button,.sheet-actions button,.rename-bar button{min-height:34px;padding:0 12px;border:1px solid #dbe3ef;border-radius:9px;background:#fff;color:#334155;font-size:12px;font-weight:800;cursor:pointer}.drop-zone button{border-color:var(--accent);color:var(--accent)}.source-summary{display:grid;grid-template-columns:1fr 1fr;gap:10px}.source-summary>div,.source-summary>label{display:flex;min-width:0;flex-direction:column;justify-content:center;padding:13px;border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc}.source-summary span,.option-grid label>span{color:#64748b;font-size:12px;font-weight:750}.source-summary strong{overflow:hidden;margin-top:5px;color:#1e293b;font-size:14px;text-overflow:ellipsis;white-space:nowrap}.source-summary small,.option-grid small{margin-top:5px;color:#94a3b8;font-size:11px;line-height:1.4}.source-summary select,.option-grid input,.option-grid select,.rename-bar input{height:35px;margin-top:6px;padding:0 9px;border:1px solid #dbe3ef;border-radius:8px;background:#fff;color:#334155;font-size:12px}.sheet-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:6px}.sheet-actions button{display:flex;align-items:center;gap:5px}.sheet-actions button:hover{border-color:var(--accent);color:var(--accent)}.sheet-actions button.danger:hover{border-color:#ef4444;color:#dc2626}.editor-mode-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:17px;padding:7px;border:1px solid #dbe3ef;border-radius:15px;background:#f1f5f9}.editor-mode-tabs button{padding:10px 12px;border:1px solid transparent;border-radius:10px;background:transparent;color:#64748b;text-align:left;cursor:pointer}.editor-mode-tabs strong,.editor-mode-tabs span{display:block}.editor-mode-tabs strong{font-size:13px}.editor-mode-tabs span{margin-top:3px;font-size:11px}.editor-mode-tabs button.active{border-color:#bfdbfe;background:#fff;color:#1d4ed8;box-shadow:0 4px 12px rgba(37,99,235,.1)}.sheet-tabs{display:flex;gap:7px;margin:10px 0 0;padding:8px;overflow-x:auto;border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc}.sheet-tabs button{display:flex;flex:none;align-items:center;gap:6px;padding:9px 11px;border:1px solid transparent;border-radius:9px;background:transparent;color:#475569;font-size:12px;font-weight:800;cursor:pointer}.sheet-tabs button span{min-width:21px;padding:2px 5px;border-radius:999px;background:#e2e8f0;color:#64748b;font-size:10px;text-align:center}.sheet-tabs button.active{border-color:#bfdbfe;background:#fff;color:var(--accent);box-shadow:0 3px 10px rgba(37,99,235,.1)}.sheet-tabs button.active span{background:#dbeafe;color:#1d4ed8}.rename-bar{display:flex;align-items:flex-end;gap:7px;margin-top:10px;padding:10px;border-radius:12px;background:#eff6ff}.rename-bar label{display:flex;flex:1;flex-direction:column;color:#475569;font-size:11px;font-weight:800}.rename-bar input{margin-top:4px}.source-editor{margin-top:11px;overflow:hidden;border:1px solid #dbe3ef;border-radius:15px;background:#fff}.source-editor header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 13px;border-bottom:1px solid #e2e8f0;background:#f8fafc}.source-editor header strong,.source-editor header span{display:block}.source-editor header strong{color:#1e293b;font-size:13px}.source-editor header span{margin-top:3px;color:#64748b;font-size:11px}.source-editor header button{flex:none;min-height:34px;padding:0 13px;border:0;border-radius:9px;background:var(--accent);color:#fff;font-size:12px;font-weight:850;cursor:pointer}.source-editor textarea{display:block;width:100%;min-height:290px;padding:14px;border:0;outline:0;resize:vertical;background:#0f172a;color:#dbeafe;font:12px/1.65 ui-monospace,SFMono-Regular,Menlo,monospace;tab-size:2}.source-editor textarea:focus{box-shadow:inset 0 0 0 2px var(--accent)}.source-editor footer{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:38px;padding:7px 12px;border-top:1px solid #e2e8f0;background:#f8fafc;color:#64748b;font-size:11px}.source-editor footer.error{color:#b91c1c;background:#fff1f2}.source-editor footer small{font-size:11px}.quality-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-top:11px}.quality-grid>div{padding:11px 13px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc}.quality-grid span,.quality-grid strong{display:block}.quality-grid span{color:#64748b;font-size:11px}.quality-grid strong{margin-top:4px;color:#1e293b;font-size:13px}.quality-grid .warning{border-color:#fed7aa;background:#fff7ed}.quality-grid .warning strong{color:#c2410c}.convert-layout{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(330px,.85fr);gap:14px;margin-top:17px}.format-panel,.preview-panel{border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc}.format-panel{padding:13px}.format-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.format-tabs button{padding:11px 8px;border:1px solid #dbe3ef;border-radius:11px;background:#fff;color:#475569;font-size:13px;font-weight:850;cursor:pointer}.format-tabs small{display:block;margin-top:3px;color:#94a3b8;font-size:10px;font-weight:600}.format-tabs button.active{border-color:#93c5fd;background:#eff6ff;color:#1d4ed8;box-shadow:0 3px 12px rgba(37,99,235,.1)}.option-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:11px}.option-grid label{display:flex;min-height:75px;flex-direction:column;padding:10px;border:1px solid #e2e8f0;border-radius:11px;background:#fff}.option-grid .toggle-field{display:grid;grid-template-columns:1fr auto;align-content:center;align-items:center}.option-grid .toggle-field small{grid-column:1/3}.export-summary{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:12px;padding:12px;border-radius:12px;background:#eaf2ff}.export-summary strong,.export-summary span{display:block}.export-summary strong{color:#1e3a8a;font-size:14px}.export-summary span{margin-top:4px;color:#64748b;font-size:11px}.preview-panel{display:flex;min-height:430px;flex-direction:column;overflow:hidden;background:#0f172a}.preview-panel header{display:flex;align-items:center;justify-content:space-between;padding:12px 13px;border-bottom:1px solid #334155}.preview-panel header span,.preview-panel header small{display:block}.preview-panel header span{color:#f8fafc;font-size:13px;font-weight:850}.preview-panel header small{margin-top:3px;color:#94a3b8;font-size:10px}.preview-panel pre{flex:1;max-height:425px;margin:0;padding:14px;overflow:auto;color:#bfdbfe;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:1.65;white-space:pre}.detail-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.detail-grid article{padding:15px;border:1px solid #e2e8f0;border-radius:13px;background:#f8fafc}.detail-grid strong{color:#1e293b;font-size:13px}.detail-grid p{margin:6px 0 0;color:#64748b;font-size:12px;line-height:1.7}
:global(html.dark .sheet-page){--accent:#60a5fa;--accent-soft:#172554}:global(html.dark .sheet-page .hero-metrics){border-color:#40516a;background:rgba(15,23,42,.5)}:global(html.dark .sheet-page .hero-metrics div){border-color:#40516a}:global(html.dark .sheet-page .hero-metrics strong){color:#e7edf6}:global(html.dark .sheet-page .hero-metrics span){color:#a8b4c5}:global(html.dark .source-card),:global(html.dark .editor-card),:global(html.dark .convert-card){border-color:#334155;background:#1e293b;box-shadow:none}:global(html.dark .section-title h3),:global(html.dark .drop-zone strong),:global(html.dark .source-summary strong),:global(html.dark .quality-grid strong),:global(html.dark .detail-grid strong),:global(html.dark .source-editor header strong){color:#f1f5f9}:global(html.dark .drop-zone){border-color:#334155;background:#172033}:global(html.dark .source-summary>div),:global(html.dark .source-summary>label),:global(html.dark .sheet-tabs),:global(html.dark .quality-grid>div),:global(html.dark .format-panel),:global(html.dark .detail-grid article),:global(html.dark .editor-mode-tabs),:global(html.dark .source-editor),:global(html.dark .source-editor header),:global(html.dark .source-editor footer){border-color:#334155;background:#172033}:global(html.dark .source-summary select),:global(html.dark .option-grid input),:global(html.dark .option-grid select),:global(html.dark .rename-bar input),:global(html.dark .option-grid label),:global(html.dark .format-tabs button),:global(html.dark .sheet-actions button),:global(html.dark .rename-bar button),:global(html.dark .editor-mode-tabs button.active){border-color:#475569;background:#0f172a;color:#cbd5e1}:global(html.dark .editor-mode-tabs button){color:#94a3b8}:global(html.dark .editor-mode-tabs button.active){border-color:#3b82f6;color:#93c5fd}:global(html.dark .sheet-tabs button){color:#cbd5e1}:global(html.dark .sheet-tabs button.active){border-color:#3b82f6;background:#172554;color:#93c5fd}:global(html.dark .export-summary){background:#172554}:global(html.dark .export-summary strong){color:#bfdbfe}:global(html.dark .quality-grid .warning){border-color:#9a3412;background:#431407}:global(html.dark .source-editor footer.error){color:#fecaca;background:#450a0a}
@media(max-width:1050px){.convert-layout{grid-template-columns:1fr}.preview-panel{min-height:340px}.preview-panel pre{max-height:340px}}
@media(max-width:760px){.sheet-page{gap:12px}.source-card,.editor-card,.convert-card{border-radius:16px}.hero-metrics{grid-template-columns:1fr}.hero-metrics div{border-left:0;border-bottom:1px solid #e5edf6}.hero-metrics div:last-child{border-bottom:0}.source-card,.editor-card,.convert-card{padding:15px}.section-title{flex-direction:column}.import-layout{grid-template-columns:1fr}.source-summary{grid-template-columns:1fr 1fr}.drop-zone{align-items:flex-start;flex-wrap:wrap}.drop-zone div{min-width:170px}.sheet-actions{width:100%;justify-content:flex-start}.sheet-actions button{flex:1;justify-content:center;padding:0 7px}.editor-mode-tabs button{padding:9px 7px;text-align:center}.editor-mode-tabs span{font-size:10px}.source-editor header{align-items:flex-start;flex-direction:column}.source-editor header button{width:100%}.source-editor textarea{min-height:260px}.source-editor footer{align-items:flex-start;flex-direction:column}.quality-grid{grid-template-columns:repeat(2,1fr)}.option-grid{grid-template-columns:1fr}.format-tabs button{font-size:12px}.export-summary{align-items:stretch;flex-direction:column}.detail-grid{grid-template-columns:1fr}.rename-bar{align-items:stretch;flex-wrap:wrap}.rename-bar label{flex-basis:100%}}
@media(max-width:430px){.source-summary{grid-template-columns:1fr}.format-tabs small,.editor-mode-tabs span{display:none}}
</style>
