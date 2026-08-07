/**
 * 千分位格式化（zh-CN locale）；整数无小数，非整数最多 2 位小数。
 * 图表工作台/工具页共用。
 */
export function formatNumber(value: number): string {
  return Number.isInteger(value)
    ? value.toLocaleString('zh-CN')
    : value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

/**
 * 根据字符偏移量计算行列（1-based）；兼容 \r\n，越界安全。
 * 放在本文件（纯函数、无第三方依赖）便于 node --test 直接 import。
 */
export function getLineColumn(text: string, index: number) {
  const safeIndex = Math.max(0, Math.min(text.length, index))
  const before = text.slice(0, safeIndex)
  const lines = before.split(/\r?\n/)
  return { line: lines.length, column: (lines[lines.length - 1]?.length ?? 0) + 1 }
}
