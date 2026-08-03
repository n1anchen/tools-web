import { parseDelimited, serializeDelimited } from './spreadsheetConverter.ts'

export interface GridLimits { maxRows?: number; maxColumns?: number }

export function parseChartGrid(text: string) {
  if (!text.trim()) return [] as string[][]
  return parseDelimited(text)
}

export function serializeChartGrid(source: string[][]) {
  const rows = source.map(row => row.map(cell => String(cell ?? '')))
  while (rows.length && rows[rows.length - 1].every(cell => !cell.trim())) rows.pop()
  if (!rows.length) return ''
  let columnCount = Math.max(...rows.map(row => row.reduce((last, cell, index) => cell.trim() ? index + 1 : last, 0)), 1)
  columnCount = Math.max(columnCount, rows[0].length ? rows[0].reduce((last, cell, index) => cell.trim() ? index + 1 : last, 0) : 0)
  const normalized = rows.map(row => Array.from({ length: columnCount }, (_, index) => row[index] ?? ''))
  return serializeDelimited(normalized).replace(/\r\n/g, '\n')
}

export function parseSpreadsheetClipboard(text: string) {
  const rows = text.replace(/\r/g, '').split('\n')
  while (rows.length > 1 && rows[rows.length - 1] === '') rows.pop()
  return rows.map(row => row.includes('\t') ? row.split('\t') : [row])
}

export function mergeGridPaste(source: string[][], pasted: string[][], startRow: number, startColumn: number, limits: GridLimits = {}) {
  const maxRows = limits.maxRows ?? 1001; const maxColumns = limits.maxColumns ?? 30
  const rows = source.map(row => [...row])
  const requiredRows = Math.min(maxRows, startRow + pasted.length)
  const requiredColumns = Math.min(maxColumns, Math.max(rows[0]?.length ?? 0, startColumn + Math.max(0, ...pasted.map(row => row.length))))
  while (rows.length < requiredRows) rows.push([])
  rows.forEach(row => { while (row.length < requiredColumns) row.push('') })
  pasted.slice(0, maxRows - startRow).forEach((row, rowOffset) => row.slice(0, maxColumns - startColumn).forEach((cell, columnOffset) => { rows[startRow + rowOffset][startColumn + columnOffset] = cell.trim() }))
  return rows
}

export function gridColumnLabel(index: number) {
  let value = index + 1; let label = ''
  while (value > 0) { value -= 1; label = String.fromCharCode(65 + value % 26) + label; value = Math.floor(value / 26) }
  return label
}
