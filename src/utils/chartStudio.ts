import { isFiniteNumber, splitDelimitedLine } from './chartParser.ts'

export type ChartKind = 'bar' | 'line' | 'pie' | 'scatter' | 'funnel'
export type ChartDataMode = 'table' | 'json'
type ChartTitlePosition = 'left' | 'center' | 'right'

interface ChartDataRow {
  name: string
  value: number
  x?: number
  y?: number
}

interface ChartParseResult {
  rows: ChartDataRow[]
  errors: string[]
}

interface ChartSample {
  id: string
  title: string
  hint: string
  rows: ChartDataRow[]
}

export interface ChartSettings {
  title: string
  subtitle: string
  titlePosition: ChartTitlePosition
  variant: string
  palette: string[]
  showLegend: boolean
  showLabels: boolean
  smooth: boolean
  axisNameX: string
  axisNameY: string
  pointSize: number
  funnelSort: 'descending' | 'ascending' | 'none'
}

export const CHART_PALETTES = [
  { id: 'ocean', title: '远海蓝', colors: ['#2563EB', '#0EA5E9', '#14B8A6', '#6366F1', '#8B5CF6', '#EC4899'] },
  { id: 'sunset', title: '日落橙', colors: ['#F97316', '#F59E0B', '#EF4444', '#EC4899', '#A855F7', '#6366F1'] },
  { id: 'forest', title: '森野绿', colors: ['#059669', '#10B981', '#84CC16', '#EAB308', '#0D9488', '#0284C7'] },
  { id: 'slate', title: '商务灰', colors: ['#334155', '#64748B', '#94A3B8', '#475569', '#0F766E', '#1D4ED8'] },
] as const

export const CHART_SAMPLES: Record<ChartKind, ChartSample[]> = {
  bar: [
    { id: 'revenue', title: '月度营收', hint: '适合趋势对比', rows: [['1 月', 32], ['2 月', 41], ['3 月', 38], ['4 月', 56], ['5 月', 63], ['6 月', 72]].map(([name, value]) => ({ name: String(name), value: Number(value) })) },
    { id: 'ranking', title: '渠道排行', hint: '适合横向柱状图', rows: [['自然搜索', 86], ['内容社区', 73], ['合作渠道', 61], ['线下活动', 48], ['广告投放', 35]].map(([name, value]) => ({ name: String(name), value: Number(value) })) },
    { id: 'survey', title: '满意度调查', hint: '适合分类比较', rows: [['非常满意', 126], ['满意', 98], ['一般', 42], ['不满意', 18]].map(([name, value]) => ({ name: String(name), value: Number(value) })) },
  ],
  line: [
    { id: 'visits', title: '七日访问量', hint: '观察连续变化', rows: [['周一', 230], ['周二', 310], ['周三', 286], ['周四', 425], ['周五', 398], ['周六', 516], ['周日', 482]].map(([name, value]) => ({ name: String(name), value: Number(value) })) },
    { id: 'temperature', title: '逐月气温', hint: '支持负数数据', rows: [['1 月', -2], ['2 月', 3], ['3 月', 11], ['4 月', 18], ['5 月', 24], ['6 月', 29]].map(([name, value]) => ({ name: String(name), value: Number(value) })) },
    { id: 'retention', title: '用户留存', hint: '适合面积图', rows: [['第 1 天', 100], ['第 3 天', 72], ['第 7 天', 55], ['第 14 天', 42], ['第 30 天', 31]].map(([name, value]) => ({ name: String(name), value: Number(value) })) },
  ],
  pie: [
    { id: 'traffic', title: '流量来源', hint: '展示构成占比', rows: [['自然搜索', 42], ['直接访问', 26], ['内容推荐', 18], ['社交媒体', 9], ['其他', 5]].map(([name, value]) => ({ name: String(name), value: Number(value) })) },
    { id: 'budget', title: '预算分配', hint: '适合环形图', rows: [['研发', 38], ['市场', 24], ['运营', 19], ['行政', 11], ['预备金', 8]].map(([name, value]) => ({ name: String(name), value: Number(value) })) },
    { id: 'devices', title: '终端占比', hint: '快速对比份额', rows: [['移动端', 68], ['桌面端', 25], ['平板', 7]].map(([name, value]) => ({ name: String(name), value: Number(value) })) },
  ],
  scatter: [
    { id: 'height-weight', title: '身高与体重', hint: '观察两个变量关系', rows: [[158, 48], [162, 52], [168, 59], [171, 63], [176, 72], [181, 78]].map(([x, y], index) => ({ name: `样本 ${index + 1}`, value: y, x, y })) },
    { id: 'price-sales', title: '价格与销量', hint: '识别相关趋势', rows: [[49, 920], [69, 810], [89, 690], [109, 565], [129, 470], [159, 350]].map(([x, y], index) => ({ name: `产品 ${index + 1}`, value: y, x, y })) },
    { id: 'efficiency', title: '投入与产出', hint: '定位异常样本', rows: [[12, 24], [18, 31], [24, 45], [31, 52], [36, 68], [44, 63]].map(([x, y], index) => ({ name: `项目 ${index + 1}`, value: y, x, y })) },
  ],
  funnel: [
    { id: 'conversion', title: '电商转化', hint: '观察逐层流失', rows: [['访问首页', 12000], ['查看商品', 7600], ['加入购物车', 3100], ['提交订单', 1680], ['完成支付', 1320]].map(([name, value]) => ({ name: String(name), value: Number(value) })) },
    { id: 'recruiting', title: '招聘流程', hint: '展示流程转化', rows: [['收到简历', 480], ['初步筛选', 216], ['技术面试', 94], ['终轮面试', 38], ['发出 Offer', 21]].map(([name, value]) => ({ name: String(name), value: Number(value) })) },
    { id: 'sales', title: '销售线索', hint: '适合倒序漏斗', rows: [['潜在线索', 860], ['有效沟通', 410], ['方案演示', 185], ['商务谈判', 72], ['签约客户', 36]].map(([name, value]) => ({ name: String(name), value: Number(value) })) },
  ],
}

function parseTable(text: string, kind: ChartKind): ChartParseResult {
  const sourceLines = text.replace(/^\uFEFF/, '').split(/\r?\n/)
  const firstLine = sourceLines.find(line => line.trim()) ?? ''
  const delimiter = firstLine.includes('\t') ? '\t' : ','
  const rawRows = sourceLines
    .map((line, index) => ({ line: index + 1, cells: splitDelimitedLine(line, delimiter) }))
    .filter(row => row.cells.some(cell => cell !== ''))
  const errors: string[] = []
  const rows: ChartDataRow[] = []

  if (!rawRows.length) return { rows, errors: ['至少输入一行有效数据'] }

  const first = rawRows[0].cells
  const hasHeader = kind === 'scatter'
    ? !isFiniteNumber(first[0]) || !isFiniteNumber(first[1])
    : !isFiniteNumber(first[1])

  for (const raw of rawRows.slice(hasHeader ? 1 : 0)) {
    const [firstCell, secondCell, thirdCell] = raw.cells
    if (kind === 'scatter') {
      if (!isFiniteNumber(firstCell) || !isFiniteNumber(secondCell)) {
        errors.push(`第 ${raw.line} 行：X、Y 必须都是有效数字`)
        continue
      }
      rows.push({
        name: thirdCell?.trim() || `样本 ${rows.length + 1}`,
        value: Number(secondCell),
        x: Number(firstCell),
        y: Number(secondCell),
      })
    } else {
      if (!firstCell?.trim()) {
        errors.push(`第 ${raw.line} 行：名称不能为空`)
        continue
      }
      if (!isFiniteNumber(secondCell)) {
        errors.push(`第 ${raw.line} 行：数值必须是有效数字`)
        continue
      }
      const value = Number(secondCell)
      if ((kind === 'pie' || kind === 'funnel') && value < 0) {
        errors.push(`第 ${raw.line} 行：${kind === 'pie' ? '占比' : '阶段'}数值不能为负数`)
        continue
      }
      rows.push({ name: firstCell.trim(), value })
    }
  }

  if (rows.length > 200) {
    errors.push('为保证浏览器绘制流畅，最多使用前 200 行数据')
    rows.splice(200)
  }
  if (!rows.length && !errors.length) errors.push('至少输入一行有效数据')
  return { rows, errors }
}

function parseJson(text: string, kind: ChartKind): ChartParseResult {
  let source: unknown
  try {
    source = JSON.parse(text)
  } catch (error) {
    return { rows: [], errors: [`JSON 解析失败：${error instanceof Error ? error.message : '格式不正确'}`] }
  }
  if (!Array.isArray(source)) return { rows: [], errors: ['JSON 顶层必须是数组'] }

  const rows: ChartDataRow[] = []
  const errors: string[] = []
  source.slice(0, 200).forEach((item, index) => {
    const label = `第 ${index + 1} 项`
    if (kind === 'scatter') {
      const x = Array.isArray(item) ? item[0] : typeof item === 'object' && item ? (item as Record<string, unknown>).x : undefined
      const y = Array.isArray(item) ? item[1] : typeof item === 'object' && item ? (item as Record<string, unknown>).y : undefined
      const name = Array.isArray(item) ? item[2] : typeof item === 'object' && item ? (item as Record<string, unknown>).name : undefined
      if (!isFiniteNumber(x) || !isFiniteNumber(y)) {
        errors.push(`${label}：需要有效的 x、y 数值`)
        return
      }
      rows.push({ name: String(name || `样本 ${rows.length + 1}`), value: Number(y), x: Number(x), y: Number(y) })
      return
    }

    const name = Array.isArray(item) ? item[0] : typeof item === 'object' && item ? (item as Record<string, unknown>).name : undefined
    const value = Array.isArray(item) ? item[1] : typeof item === 'object' && item ? (item as Record<string, unknown>).value : undefined
    if (typeof name !== 'string' || !name.trim()) {
      errors.push(`${label}：name 不能为空`)
      return
    }
    if (!isFiniteNumber(value)) {
      errors.push(`${label}：value 必须是有效数字`)
      return
    }
    const numericValue = Number(value)
    if ((kind === 'pie' || kind === 'funnel') && numericValue < 0) {
      errors.push(`${label}：${kind === 'pie' ? '占比' : '阶段'}数值不能为负数`)
      return
    }
    rows.push({ name: name.trim(), value: numericValue })
  })

  if (source.length > 200) errors.push('为保证浏览器绘制流畅，最多使用前 200 项数据')
  if (!rows.length && !errors.length) errors.push('至少输入一项有效数据')
  return { rows, errors }
}

export function parseChartData(text: string, kind: ChartKind, mode: ChartDataMode): ChartParseResult {
  return mode === 'json' ? parseJson(text.trim(), kind) : parseTable(text, kind)
}

function escapeCsvCell(value: string) {
  return /[",\n\t]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

export function serializeChartData(rows: ChartDataRow[], kind: ChartKind, mode: ChartDataMode) {
  if (mode === 'json') {
    const data = kind === 'scatter'
      ? rows.map(row => ({ x: row.x ?? 0, y: row.y ?? row.value, name: row.name }))
      : rows.map(row => ({ name: row.name, value: row.value }))
    return JSON.stringify(data, null, 2)
  }
  const header = kind === 'scatter' ? 'X,Y,名称（可选）' : '名称,数值'
  const lines = rows.map(row => kind === 'scatter'
    ? [row.x ?? 0, row.y ?? row.value, escapeCsvCell(row.name)].join(',')
    : [escapeCsvCell(row.name), row.value].join(','))
  return [header, ...lines].join('\n')
}

function titleLeft(position: ChartTitlePosition) {
  return position === 'left' ? 24 : position === 'right' ? 'right' : 'center'
}

export function buildChartOption(kind: ChartKind, rows: ChartDataRow[], settings: ChartSettings, dark = false) {
  const textColor = dark ? '#E2E8F0' : '#334155'
  const mutedColor = dark ? '#94A3B8' : '#64748B'
  const splitLine = dark ? '#334155' : '#E2E8F0'
  const common = {
    animationDuration: 600,
    color: settings.palette,
    backgroundColor: 'transparent',
    title: {
      text: settings.title,
      subtext: settings.subtitle,
      left: titleLeft(settings.titlePosition),
      top: 14,
      textStyle: { color: textColor, fontSize: 18, fontWeight: 700 },
      subtextStyle: { color: mutedColor, fontSize: 12 },
    },
    tooltip: { trigger: kind === 'scatter' ? 'item' : kind === 'line' || kind === 'bar' ? 'axis' : 'item' },
    legend: { show: settings.showLegend, bottom: 10, textStyle: { color: mutedColor } },
  }

  if (kind === 'pie') {
    return {
      ...common,
      series: [{
        name: settings.title || '占比',
        type: 'pie',
        radius: settings.variant === 'doughnut' ? ['42%', '68%'] : ['0%', '68%'],
        center: ['50%', '54%'],
        avoidLabelOverlap: true,
        label: { show: settings.showLabels, color: textColor, formatter: '{b}\n{d}%' },
        labelLine: { show: settings.showLabels },
        itemStyle: { borderColor: dark ? '#1E293B' : '#FFFFFF', borderWidth: 3, borderRadius: 7 },
        data: rows.map(row => ({ name: row.name, value: row.value })),
      }],
    }
  }

  if (kind === 'funnel') {
    return {
      ...common,
      series: [{
        name: settings.title || '流程',
        type: 'funnel',
        left: '12%',
        top: 82,
        bottom: 48,
        width: '76%',
        minSize: '12%',
        maxSize: '100%',
        sort: settings.funnelSort,
        gap: 5,
        label: { show: settings.showLabels, position: settings.variant === 'inside' ? 'inside' : 'outside', color: settings.variant === 'inside' ? '#FFFFFF' : textColor, formatter: '{b}  {c}' },
        labelLine: { show: settings.showLabels && settings.variant !== 'inside', length: 18 },
        itemStyle: { borderColor: dark ? '#1E293B' : '#FFFFFF', borderWidth: 2, borderRadius: 5 },
        data: rows.map(row => ({ name: row.name, value: row.value })),
      }],
    }
  }

  if (kind === 'scatter') {
    return {
      ...common,
      grid: { left: 60, right: 30, top: 82, bottom: settings.showLegend ? 62 : 45, containLabel: true },
      xAxis: { type: 'value', scale: true, name: settings.axisNameX, nameLocation: 'middle', nameGap: 30, axisLabel: { color: mutedColor }, nameTextStyle: { color: mutedColor }, splitLine: { lineStyle: { color: splitLine } } },
      yAxis: { type: 'value', scale: true, name: settings.axisNameY, nameLocation: 'middle', nameGap: 42, axisLabel: { color: mutedColor }, nameTextStyle: { color: mutedColor }, splitLine: { lineStyle: { color: splitLine } } },
      series: [{
        name: settings.title || '样本',
        type: 'scatter',
        symbolSize: settings.variant === 'bubble' ? settings.pointSize * 1.55 : settings.pointSize,
        label: { show: settings.showLabels, position: 'top', color: textColor, formatter: '{@[2]}' },
        itemStyle: { opacity: 0.82, borderColor: dark ? '#CBD5E1' : '#FFFFFF', borderWidth: 1 },
        data: rows.map(row => [row.x ?? 0, row.y ?? row.value, row.name]),
      }],
    }
  }

  const horizontal = kind === 'bar' && settings.variant === 'horizontal'
  const categories = rows.map(row => row.name)
  const values = rows.map(row => row.value)
  const categoryAxis = { type: 'category', data: categories, axisLabel: { color: mutedColor, hideOverlap: true }, axisLine: { lineStyle: { color: splitLine } }, axisTick: { show: false } }
  const valueAxis = { type: 'value', name: horizontal ? settings.axisNameX : settings.axisNameY, axisLabel: { color: mutedColor }, nameTextStyle: { color: mutedColor }, splitLine: { lineStyle: { color: splitLine } } }
  return {
    ...common,
    grid: { left: horizontal ? 26 : 50, right: 28, top: 82, bottom: settings.showLegend ? 62 : 42, containLabel: true },
    xAxis: horizontal ? { ...valueAxis, nameLocation: 'middle', nameGap: 30 } : { ...categoryAxis, name: settings.axisNameX, nameLocation: 'middle', nameGap: 28, nameTextStyle: { color: mutedColor } },
    yAxis: horizontal ? { ...categoryAxis, inverse: true, name: settings.axisNameY, nameTextStyle: { color: mutedColor } } : valueAxis,
    series: [{
      name: settings.title || (kind === 'line' ? '趋势' : '数值'),
      type: kind,
      data: values,
      smooth: kind === 'line' ? settings.smooth : undefined,
      areaStyle: kind === 'line' && settings.variant === 'area' ? { opacity: 0.2 } : undefined,
      symbolSize: kind === 'line' ? 8 : undefined,
      showSymbol: kind === 'line',
      lineStyle: kind === 'line' ? { width: 3 } : undefined,
      itemStyle: kind === 'bar' ? { borderRadius: horizontal ? [0, 7, 7, 0] : [7, 7, 0, 0] } : undefined,
      label: { show: settings.showLabels, position: horizontal ? 'right' : 'top', color: textColor },
    }],
  }
}

export function getChartStats(rows: ChartDataRow[], kind: ChartKind) {
  const values = rows.map(row => row.value)
  const sum = values.reduce((total, value) => total + value, 0)
  const min = values.length ? Math.min(...values) : 0
  const max = values.length ? Math.max(...values) : 0
  return {
    count: rows.length,
    sum,
    average: values.length ? sum / values.length : 0,
    min,
    max,
    range: max - min,
    primaryLabel: kind === 'scatter' ? '样本数' : '数据项',
  }
}
