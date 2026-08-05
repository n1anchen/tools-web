export type Delimiter = ',' | '\t' | ';' | '|'
export type JsonShape = 'records' | 'matrix'

export interface DataSheet {
  id: string
  name: string
  rows: string[][]
}

interface SheetAnalysis {
  rows: number
  columns: number
  filledCells: number
  emptyCells: number
  duplicateHeaders: string[]
  numericColumns: number
}

const DELIMITERS: Delimiter[] = [',', '\t', ';', '|']

function scalarText(value: unknown) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function removeTrailingEmptyArea(source: string[][]) {
  const rows = source.map(row => row.map(cell => scalarText(cell)))
  while (rows.length > 1 && rows[rows.length - 1]?.every(cell => cell === '')) rows.pop()
  let columns = Math.max(1, ...rows.map(row => row.reduce((last, cell, index) => cell !== '' ? index + 1 : last, 0)))
  if (rows[0]) columns = Math.max(columns, rows[0].length)
  return rows.map(row => Array.from({ length: columns }, (_, index) => row[index] ?? ''))
}

export function detectDelimiter(text: string): Delimiter {
  const sample = text.replace(/^\uFEFF/, '').split(/\r?\n/).slice(0, 8).join('\n')
  const scores = new Map<Delimiter, number>(DELIMITERS.map(item => [item, 0]))
  let quoted = false
  for (let index = 0; index < sample.length; index += 1) {
    const char = sample[index]
    if (char === '"') {
      if (quoted && sample[index + 1] === '"') index += 1
      else quoted = !quoted
      continue
    }
    if (!quoted && scores.has(char as Delimiter)) scores.set(char as Delimiter, (scores.get(char as Delimiter) ?? 0) + 1)
  }
  return DELIMITERS.reduce((best, item) => (scores.get(item) ?? 0) > (scores.get(best) ?? 0) ? item : best, ',')
}

export function parseDelimited(text: string, requestedDelimiter?: Delimiter) {
  const source = text.replace(/^\uFEFF/, '')
  if (!source) return [['']]
  const delimiter = requestedDelimiter ?? detectDelimiter(source)
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  const pushCell = () => { row.push(cell); cell = '' }
  const pushRow = () => { pushCell(); rows.push(row); row = [] }

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    if (char === '"') {
      if (quoted && source[index + 1] === '"') { cell += '"'; index += 1 }
      else quoted = !quoted
    } else if (!quoted && char === delimiter) pushCell()
    else if (!quoted && (char === '\n' || char === '\r')) {
      if (char === '\r' && source[index + 1] === '\n') index += 1
      pushRow()
    } else cell += char
  }
  if (cell !== '' || row.length || !rows.length) pushRow()
  if (rows.length > 1 && rows[rows.length - 1]?.every(value => value === '') && /(?:\r\n|\r|\n)$/.test(source)) rows.pop()
  return removeTrailingEmptyArea(rows)
}

function delimitedCell(value: string, delimiter: Delimiter, quoteAll: boolean) {
  const escaped = value.replace(/"/g, '""')
  return quoteAll || value.includes(delimiter) || /["\r\n]/.test(value) || /^\s|\s$/.test(value) ? `"${escaped}"` : escaped
}

export function serializeDelimited(rows: string[][], delimiter: Delimiter = ',', quoteAll = false) {
  return removeTrailingEmptyArea(rows).map(row => row.map(cell => delimitedCell(cell, delimiter, quoteAll)).join(delimiter)).join('\r\n')
}

function datasetToRows(dataset: unknown) {
  if (!Array.isArray(dataset)) {
    if (dataset && typeof dataset === 'object') {
      const record = dataset as Record<string, unknown>
      return [Object.keys(record), Object.values(record).map(scalarText)]
    }
    return [['value'], [scalarText(dataset)]]
  }
  if (!dataset.length) return [['']]
  if (dataset.every(row => Array.isArray(row))) return removeTrailingEmptyArea((dataset as unknown[][]).map(row => row.map(scalarText)))
  if (dataset.every(row => row && typeof row === 'object' && !Array.isArray(row))) {
    const records = dataset as Record<string, unknown>[]
    const headers = [...new Set(records.flatMap(record => Object.keys(record)))]
    return [headers, ...records.map(record => headers.map(header => scalarText(record[header])))]
  }
  return [['value'], ...dataset.map(value => [scalarText(value)])]
}

function safeSheetName(name: string, fallback: string) {
  return name.replace(/[\\/?*\[\]:]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31) || fallback
}

export function parseJsonSheets(text: string) {
  let source: unknown
  try {
    source = JSON.parse(text)
  } catch {
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
    if (!lines.length) throw new Error('JSON 内容为空')
    try { source = lines.map(line => JSON.parse(line)) }
    catch { throw new Error('无法解析 JSON 或 JSON Lines，请检查括号、引号和逗号') }
  }

  const datasets: { name: string; value: unknown }[] = []
  if (source && !Array.isArray(source) && typeof source === 'object') {
    const entries = Object.entries(source as Record<string, unknown>)
    const arrayEntries = entries.filter(([, value]) => Array.isArray(value))
    if (arrayEntries.length) arrayEntries.forEach(([name, value]) => datasets.push({ name, value }))
    else datasets.push({ name: 'Sheet1', value: source })
  } else datasets.push({ name: 'Sheet1', value: source })

  return datasets.map((dataset, index) => ({
    id: `json-${index}-${Date.now()}`,
    name: safeSheetName(dataset.name, `Sheet${index + 1}`),
    rows: datasetToRows(dataset.value),
  }))
}

function uniqueHeaders(row: string[], columnCount: number) {
  const used = new Map<string, number>()
  return Array.from({ length: columnCount }, (_, index) => {
    const base = row[index]?.trim() || `Column ${index + 1}`
    const count = (used.get(base) ?? 0) + 1
    used.set(base, count)
    return count === 1 ? base : `${base}_${count}`
  })
}

export function inferJsonScalar(value: string) {
  const trimmed = value.trim()
  const lower = trimmed.toLowerCase()
  if (!trimmed) return null
  if (lower === 'true') return true
  if (lower === 'false') return false
  if (lower === 'null') return null
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(trimmed) && !/^-?0\d/.test(trimmed)) {
    const number = Number(trimmed)
    if (Number.isFinite(number)) return number
  }
  return value
}

export function rowsToJson(rows: string[][], options: { shape?: JsonShape; firstRowHeader?: boolean; inferTypes?: boolean } = {}) {
  const normalized = removeTrailingEmptyArea(rows)
  const shape = options.shape ?? 'records'
  const inferTypes = options.inferTypes ?? true
  const convert = (value: string) => inferTypes ? inferJsonScalar(value) : value
  if (shape === 'matrix') return normalized.map(row => row.map(convert))

  const columnCount = Math.max(1, ...normalized.map(row => row.length))
  const hasHeader = options.firstRowHeader ?? true
  const headers = uniqueHeaders(hasHeader ? normalized[0] ?? [] : [], columnCount)
  const dataRows = hasHeader ? normalized.slice(1) : normalized
  return dataRows.filter(row => row.some(cell => cell !== '')).map(row => Object.fromEntries(headers.map((header, index) => [header, convert(row[index] ?? '')])))
}

export function sheetsToJson(sheets: Pick<DataSheet, 'name' | 'rows'>[], options: { shape?: JsonShape; firstRowHeader?: boolean; inferTypes?: boolean; allSheets?: boolean } = {}) {
  const convert = (sheet: Pick<DataSheet, 'name' | 'rows'>) => rowsToJson(sheet.rows, options)
  if (options.allSheets) return Object.fromEntries(sheets.map(sheet => [sheet.name, convert(sheet)]))
  return sheets[0] ? convert(sheets[0]) : []
}

export function analyzeSheet(rows: string[][], firstRowHeader = true): SheetAnalysis {
  const normalized = removeTrailingEmptyArea(rows)
  const columns = Math.max(1, ...normalized.map(row => row.length))
  const dataRows = firstRowHeader ? normalized.slice(1) : normalized
  const filledCells = dataRows.reduce((sum, row) => sum + Array.from({ length: columns }, (_, index) => row[index] ?? '').filter(Boolean).length, 0)
  const header = firstRowHeader ? normalized[0] ?? [] : []
  const counts = new Map<string, number>()
  header.map(item => item.trim()).filter(Boolean).forEach(item => counts.set(item, (counts.get(item) ?? 0) + 1))
  const numericColumns = Array.from({ length: columns }, (_, column) => dataRows.map(row => row[column] ?? '').filter(Boolean)).filter(values => values.length > 0 && values.every(value => Number.isFinite(Number(value)))).length
  return {
    rows: dataRows.filter(row => row.some(cell => cell !== '')).length,
    columns,
    filledCells,
    emptyCells: Math.max(0, dataRows.length * columns - filledCells),
    duplicateHeaders: [...counts.entries()].filter(([, count]) => count > 1).map(([name]) => name),
    numericColumns,
  }
}

export function makeUniqueSheetName(existing: string[], requested = '新工作表') {
  const base = safeSheetName(requested, '新工作表')
  if (!existing.includes(base)) return base
  let suffix = 2
  while (existing.includes(`${base} ${suffix}`.slice(0, 31))) suffix += 1
  return `${base} ${suffix}`.slice(0, 31)
}
