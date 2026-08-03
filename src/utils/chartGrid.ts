export interface GridLimits { maxRows?: number; maxColumns?: number }

function splitDelimitedLine(line: string, delimiter: string) {
  const cells: string[] = []; let current = ''; let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      if (quoted && line[index + 1] === '"') { current += '"'; index += 1 } else quoted = !quoted
    } else if (char === delimiter && !quoted) { cells.push(current); current = '' } else current += char
  }
  cells.push(current)
  return cells
}

export function parseChartGrid(text: string) {
  const source = text.replace(/^\uFEFF/, '').replace(/\r/g, '')
  if (!source.trim()) return [] as string[][]
  const lines = source.split('\n')
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop()
  const delimiter = (lines[0] ?? '').includes('\t') ? '\t' : ','
  return lines.map(line => splitDelimitedLine(line, delimiter).map(cell => cell.trim()))
}

function csvCell(value: string) {
  return /[",\n\t]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

export function serializeChartGrid(source: string[][]) {
  const rows = source.map(row => row.map(cell => String(cell ?? '')))
  while (rows.length && rows[rows.length - 1].every(cell => !cell.trim())) rows.pop()
  if (!rows.length) return ''
  let columnCount = Math.max(...rows.map(row => row.reduce((last, cell, index) => cell.trim() ? index + 1 : last, 0)), 1)
  columnCount = Math.max(columnCount, rows[0].length ? rows[0].reduce((last, cell, index) => cell.trim() ? index + 1 : last, 0) : 0)
  return rows.map(row => Array.from({ length: columnCount }, (_, index) => csvCell(row[index] ?? '')).join(',')).join('\n')
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
