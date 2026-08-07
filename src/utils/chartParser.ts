// 图表工作室共用的表格 / CSV 解析辅助
// 供 chartStudio / advancedChartStudio / specialChartStudio 复用，避免三份重复实现

interface TableRow {
  line: number
  cells: string[]
}

/**
 * 拆分单行 CSV 文本为单元格数组，支持双引号包裹与转义（"" → "）
 */
export function splitDelimitedLine(line: string, delimiter: string): string[] {
  const cells: string[] = []
  let value = ''
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (char === delimiter && !quoted) {
      cells.push(value.trim())
      value = ''
    } else {
      value += char
    }
  }
  cells.push(value.trim())
  return cells
}

/**
 * 将整段文本拆成带行号的表格行：去 BOM、按换行拆分、过滤空行、
 * 自动识别分隔符（tab 优先于逗号）
 */
export function parseTableRows(text: string): TableRow[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim())
  const delimiter = (lines[0] ?? '').includes('\t') ? '\t' : ','
  return lines.map((line, index) => ({ line: index + 1, cells: splitDelimitedLine(line, delimiter) }))
}

/**
 * 判断值是否为有效数字（数字或非空字符串，且可被 Number 解析为有限值）
 */
export function isFiniteNumber(value: unknown): boolean {
  if (typeof value === 'number') return Number.isFinite(value)
  return typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))
}

/**
 * 与 isFiniteNumber 同判定，返回数字或 null
 */
export function numberValue(value: unknown): number | null {
  return isFiniteNumber(value) ? Number(value) : null
}

/** CSV 单元格转义：含逗号/引号/换行/tab 时加双引号并转义引号（三图表工作室共用） */
export function escapeCsvCell(value: string) {
  return /[",\n\t]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/** 图表标题位置映射：left → 24px，right → "right"，否则 "center" */
export function titleLeft(position: "left" | "right" | "center") {
  return position === "left" ? 24 : position === "right" ? "right" : "center"
}
