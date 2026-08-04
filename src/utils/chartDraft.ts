// 每个图表工具独立的草稿持久化（localStorage），跨工具切换 / 刷新后保留输入数据与配置
export interface ChartDraft<T> {
  dataText: string
  dataMode: string
  activeSample: string
  chartHeight: number
  currentPaletteId: string
  settings: T
}

const PREFIX = 'rbl-tools:chart-draft:'

export function loadChartDraft<T>(type: string): ChartDraft<T> | null {
  try {
    const raw = localStorage.getItem(PREFIX + type)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<ChartDraft<T>>
    if (!parsed || typeof parsed.dataText !== 'string' || typeof parsed.dataMode !== 'string') return null
    return parsed as ChartDraft<T>
  } catch {
    return null
  }
}

export function saveChartDraft<T>(type: string, draft: ChartDraft<T>) {
  try {
    localStorage.setItem(PREFIX + type, JSON.stringify(draft))
  } catch {
    // 忽略存储失败（隐私模式 / 配额不足）
  }
}

export function clearChartDraft(type: string) {
  try {
    localStorage.removeItem(PREFIX + type)
  } catch {
    // ignore
  }
}
