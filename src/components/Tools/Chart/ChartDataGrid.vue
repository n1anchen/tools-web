<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { gridColumnLabel, mergeGridPaste, parseChartGrid, parseSpreadsheetClipboard, serializeChartGrid } from '@/utils/chartGrid'

const props = withDefaults(defineProps<{ modelValue: string; minColumns?: number; maxRows?: number; maxColumns?: number; ariaLabel?: string; footerHint?: string }>(), {
  minColumns: 2, maxRows: 1001, maxColumns: 30, ariaLabel: '图表数据表格', footerHint: 'Enter 跳到下一行，修改后图表实时刷新',
})
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const gridRoot = ref<HTMLElement | null>(null)
const cells = ref<string[][]>([])
const pasteNotice = ref('')
let lastEmitted = ''
let noticeTimer: ReturnType<typeof setTimeout> | null = null

function hydrate(value: string) {
  const parsed = parseChartGrid(value)
  const columnCount = Math.max(props.minColumns, ...parsed.map(row => row.length), 1)
  const rowCount = Math.max(parsed.length, 7)
  cells.value = Array.from({ length: rowCount }, (_, rowIndex) => Array.from({ length: columnCount }, (_cell, columnIndex) => parsed[rowIndex]?.[columnIndex] ?? ''))
}

watch(() => props.modelValue, value => {
  if (value === lastEmitted) { lastEmitted = ''; return }
  hydrate(value)
}, { immediate: true })

function emitGrid() {
  lastEmitted = serializeChartGrid(cells.value)
  emit('update:modelValue', lastEmitted)
}

function updateCell(rowIndex: number, columnIndex: number, event: Event) {
  cells.value[rowIndex][columnIndex] = (event.target as HTMLInputElement).value
  emitGrid()
}

function showNotice(message: string) {
  pasteNotice.value = message
  if (noticeTimer) clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => { pasteNotice.value = '' }, 2600)
}

function pasteCells(event: ClipboardEvent, rowIndex: number, columnIndex: number) {
  const text = event.clipboardData?.getData('text/plain') ?? ''
  if (!text.includes('\t') && !/[\r\n]/.test(text)) return
  event.preventDefault()
  const pasted = parseSpreadsheetClipboard(text)
  cells.value = mergeGridPaste(cells.value, pasted, rowIndex, columnIndex, { maxRows: props.maxRows, maxColumns: props.maxColumns })
  emitGrid()
  showNotice(`已粘贴 ${pasted.length} 行 × ${Math.max(...pasted.map(row => row.length))} 列`)
}

function addRow() {
  if (cells.value.length >= props.maxRows) return showNotice(`最多保留 ${props.maxRows - 1} 行数据`)
  cells.value.push(Array(cells.value[0]?.length ?? props.minColumns).fill(''))
  nextTick(() => focusCell(cells.value.length - 1, 0))
}

function removeRow(rowIndex: number) {
  if (rowIndex === 0) return
  cells.value.splice(rowIndex, 1)
  emitGrid()
}

function addColumn() {
  if ((cells.value[0]?.length ?? 0) >= props.maxColumns) return showNotice(`最多支持 ${props.maxColumns} 列`)
  cells.value.forEach(row => row.push(''))
  nextTick(() => focusCell(0, cells.value[0].length - 1))
}

function removeColumn() {
  if ((cells.value[0]?.length ?? 0) <= props.minColumns) return
  cells.value.forEach(row => row.pop())
  emitGrid()
}

function trimBlankRows() {
  const header = cells.value[0] ?? Array(props.minColumns).fill('')
  const dataRows = cells.value.slice(1).filter(row => row.some(cell => cell.trim()))
  const columnCount = Math.max(props.minColumns, header.length)
  cells.value = [header, ...dataRows, ...Array.from({ length: Math.max(3, 6 - dataRows.length) }, () => Array(columnCount).fill(''))]
  emitGrid()
  showNotice('已整理空白行')
}

function focusCell(rowIndex: number, columnIndex: number) {
  const input = gridRoot.value?.querySelector<HTMLInputElement>(`[data-grid-cell="${rowIndex}-${columnIndex}"]`)
  input?.focus(); input?.select()
}

function handleKeydown(event: KeyboardEvent, rowIndex: number, columnIndex: number) {
  if (event.key !== 'Enter') return
  event.preventDefault()
  if (rowIndex === cells.value.length - 1) addRow()
  nextTick(() => focusCell(Math.min(rowIndex + 1, cells.value.length - 1), columnIndex))
}
</script>

<template>
  <div ref="gridRoot" class="grid-editor" :aria-label="ariaLabel">
    <div class="grid-toolbar">
      <div><strong>像 Excel 一样编辑</strong><span>选中单元格后，可直接粘贴 Excel / WPS 中复制的区域</span></div>
      <div class="grid-actions">
        <button type="button" @click="addRow">＋ 行</button>
        <button type="button" @click="addColumn">＋ 列</button>
        <button type="button" :disabled="(cells[0]?.length ?? 0) <= minColumns" @click="removeColumn">－ 末列</button>
        <button type="button" @click="trimBlankRows">整理</button>
      </div>
    </div>
    <div class="grid-scroll">
      <table>
        <thead><tr><th class="corner"></th><th v-for="(_cell, columnIndex) in cells[0]" :key="columnIndex">{{ gridColumnLabel(columnIndex) }}</th><th class="action-head"></th></tr></thead>
        <tbody>
          <tr v-for="(row, rowIndex) in cells" :key="rowIndex" :class="{ 'header-row': rowIndex === 0 }">
            <th class="row-number">{{ rowIndex === 0 ? '表头' : rowIndex }}</th>
            <td v-for="(cell, columnIndex) in row" :key="columnIndex">
              <input :value="cell" :data-grid-cell="`${rowIndex}-${columnIndex}`" :aria-label="`${rowIndex === 0 ? '表头' : `第 ${rowIndex} 行`} ${gridColumnLabel(columnIndex)} 列`" autocomplete="off" @input="updateCell(rowIndex, columnIndex, $event)" @paste="pasteCells($event, rowIndex, columnIndex)" @keydown="handleKeydown($event, rowIndex, columnIndex)">
            </td>
            <td class="row-action"><button v-if="rowIndex > 0" type="button" :aria-label="`删除第 ${rowIndex} 行`" @click="removeRow(rowIndex)">×</button></td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="grid-footer"><span><i></i>{{ cells.length - 1 }} 个可编辑数据行 · {{ cells[0]?.length ?? 0 }} 列</span><b v-if="pasteNotice">{{ pasteNotice }}</b><small v-else>{{ footerHint }}</small></div>
  </div>
</template>

<style scoped>
.grid-editor{margin-top:12px;border:1px solid #dbe3ef;border-radius:14px;overflow:hidden;background:#fff}.grid-toolbar{display:flex;min-height:56px;align-items:center;justify-content:space-between;gap:12px;padding:9px 11px;border-bottom:1px solid #e2e8f0;background:#f8fafc}.grid-toolbar strong,.grid-toolbar span{display:block}.grid-toolbar strong{color:#334155;font-size:13px}.grid-toolbar span{margin-top:2px;color:#64748b;font-size:12px;line-height:1.4}.grid-actions{display:flex;flex:none;gap:5px}.grid-actions button{min-height:30px;padding:0 8px;border:1px solid #dbe3ef;border-radius:8px;background:#fff;color:#475569;font-size:12px;font-weight:800;cursor:pointer}.grid-actions button:hover{border-color:var(--accent);color:var(--accent)}.grid-actions button:disabled{cursor:not-allowed;opacity:.4}.grid-scroll{height:260px;overflow:auto;overscroll-behavior:contain;background:#fff}table{min-width:100%;border-spacing:0;border-collapse:separate;table-layout:fixed}th,td{height:38px;padding:0;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0}thead th{position:sticky;z-index:4;top:0;width:132px;background:#eef2f7;color:#64748b;font-size:11px;font-weight:850;text-align:center}.corner,.row-number{position:sticky;z-index:5;left:0;width:46px;min-width:46px;max-width:46px}.corner{top:0}.action-head,.row-action{width:34px;min-width:34px;max-width:34px;border-right:0}.row-number{z-index:3;background:#f8fafc;color:#94a3b8;font-size:11px;text-align:center}.header-row td,.header-row .row-number{position:sticky;z-index:2;top:38px;background:#eff6ff}.header-row .row-number{z-index:4}.header-row input{color:#1d4ed8;font-weight:850}td input{display:block;width:100%;height:37px;padding:0 9px;border:0;outline:0;background:transparent;color:#334155;font-size:12px;font-weight:650}td input:focus{position:relative;z-index:1;background:#fff;box-shadow:inset 0 0 0 2px var(--accent)}.row-action{background:#f8fafc;text-align:center}.row-action button{width:24px;height:24px;border:0;border-radius:7px;background:transparent;color:#94a3b8;font-size:17px;cursor:pointer}.row-action button:hover{background:#fee2e2;color:#dc2626}.grid-footer{display:flex;min-height:38px;align-items:center;justify-content:space-between;gap:10px;padding:0 11px;border-top:1px solid #e2e8f0;background:#f8fafc;color:#64748b;font-size:11px}.grid-footer span{font-weight:750}.grid-footer i{display:inline-block;width:7px;height:7px;margin-right:6px;border-radius:50%;background:#10b981}.grid-footer b{color:#047857;font-size:11px}.grid-footer small{font-size:11px}
:global(html.dark .grid-editor),:global(html.dark .grid-scroll){border-color:#475569;background:#0f172a}:global(html.dark .grid-toolbar),:global(html.dark .grid-footer),:global(html.dark .row-number),:global(html.dark .row-action){border-color:#334155;background:#172033}:global(html.dark .grid-toolbar strong){color:#e2e8f0}:global(html.dark .grid-actions button){border-color:#475569;background:#0f172a;color:#cbd5e1}:global(html.dark .grid-editor th),:global(html.dark .grid-editor td){border-color:#334155}:global(html.dark .grid-editor thead th){background:#253248;color:#94a3b8}:global(html.dark .grid-editor .header-row td),:global(html.dark .grid-editor .header-row .row-number){background:#172554}:global(html.dark .grid-editor td input){color:#e2e8f0}:global(html.dark .grid-editor .header-row input){color:#93c5fd}:global(html.dark .grid-editor td input:focus){background:#1e293b}
@media(max-width:620px){.grid-toolbar{align-items:flex-start;flex-direction:column}.grid-actions{display:grid;width:100%;grid-template-columns:repeat(4,1fr)}.grid-actions button{padding:0 4px}.grid-scroll{height:250px}.grid-footer{align-items:flex-start;flex-direction:column;padding-top:7px;padding-bottom:7px}.grid-footer small{line-height:1.4}}
</style>
