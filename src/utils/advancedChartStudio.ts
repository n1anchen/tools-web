import { numberValue, parseTableRows as tableRows } from './chartParser.ts'

export type AdvancedChartKind = 'radar' | 'gauge' | 'heatmap' | 'candlestick' | 'stack'
export type AdvancedDataMode = 'table' | 'json'

export interface NamedSeries { name: string; values: number[] }
export interface RadarChartData { kind: 'radar'; dimensions: string[]; maxima: number[]; series: NamedSeries[] }
export interface GaugeChartData { kind: 'gauge'; items: { name: string; value: number }[] }
export interface HeatmapChartData { kind: 'heatmap'; xCategories: string[]; yCategories: string[]; points: { x: string; y: string; value: number }[] }
export interface CandlestickChartData { kind: 'candlestick'; items: { date: string; open: number; close: number; low: number; high: number }[] }
export interface StackChartData { kind: 'stack'; categories: string[]; series: NamedSeries[] }
export type AdvancedChartData = RadarChartData | GaugeChartData | HeatmapChartData | CandlestickChartData | StackChartData

export interface AdvancedParseResult { data: AdvancedChartData; errors: string[] }
export interface AdvancedSample { id: string; title: string; hint: string; data: AdvancedChartData }

export interface AdvancedChartSettings {
  title: string
  subtitle: string
  titlePosition: 'left' | 'center' | 'right'
  variant: string
  palette: string[]
  showLegend: boolean
  showLabels: boolean
  unit: string
  radarMaxMode: 'auto' | 'fixed'
  radarMax: number
  fillOpacity: number
  gaugeMin: number
  gaugeMax: number
  gaugeSplit: number
  heatMinColor: string
  heatMaxColor: string
  upColor: string
  downColor: string
  showZoom: boolean
  showTotal: boolean
}

const radar = (dimensions: string[], series: NamedSeries[], maxima = dimensions.map(() => 100)): RadarChartData => ({ kind: 'radar', dimensions, series, maxima })
const gauge = (items: { name: string; value: number }[]): GaugeChartData => ({ kind: 'gauge', items })
const heatmap = (points: { x: string; y: string; value: number }[]): HeatmapChartData => ({ kind: 'heatmap', xCategories: [...new Set(points.map(point => point.x))], yCategories: [...new Set(points.map(point => point.y))], points })
const candlestick = (items: CandlestickChartData['items']): CandlestickChartData => ({ kind: 'candlestick', items })
const stack = (categories: string[], series: NamedSeries[]): StackChartData => ({ kind: 'stack', categories, series })

export const ADVANCED_SAMPLES: Record<AdvancedChartKind, AdvancedSample[]> = {
  radar: [
    { id: 'product', title: '产品能力对比', hint: '双系列多维比较', data: radar(['性能', '易用性', '稳定性', '生态', '成本'], [{ name: '方案 A', values: [86, 72, 91, 68, 78] }, { name: '方案 B', values: [74, 89, 76, 84, 65] }]) },
    { id: 'skills', title: '团队能力盘点', hint: '识别能力长短板', data: radar(['产品', '设计', '研发', '测试', '运营', '协作'], [{ name: '当前团队', values: [78, 83, 91, 74, 69, 87] }]) },
    { id: 'campaign', title: '活动复盘', hint: '维度最大值可独立设置', data: radar(['曝光', '互动', '转化', '口碑', '复购'], [{ name: '春季活动', values: [920, 680, 420, 760, 510] }, { name: '夏季活动', values: [780, 820, 530, 710, 620] }], [1000, 1000, 800, 1000, 800]) },
  ],
  gauge: [
    { id: 'completion', title: '项目完成度', hint: '单指标进度', data: gauge([{ name: '完成率', value: 76 }]) },
    { id: 'quality', title: '质量看板', hint: '多指针对比', data: gauge([{ name: '稳定性', value: 92 }, { name: '性能', value: 84 }, { name: '体验', value: 78 }]) },
    { id: 'service', title: '服务健康度', hint: '百分制业务指标', data: gauge([{ name: '可用性', value: 99.2 }, { name: '响应速度', value: 88 }]) },
  ],
  heatmap: [
    { id: 'traffic', title: '一周访问热度', hint: '星期 × 时段', data: heatmap(['周一', '周二', '周三', '周四', '周五', '周六', '周日'].flatMap((x, xi) => ['上午', '下午', '晚上'].map((y, yi) => ({ x, y, value: [18, 35, 56, 24, 42, 64, 29, 47, 71, 32, 53, 76, 38, 62, 88, 55, 78, 92, 49, 70, 84][xi * 3 + yi] })))) },
    { id: 'meeting', title: '会议室占用', hint: '日期 × 会议室', data: heatmap(['周一', '周二', '周三', '周四', '周五'].flatMap((x, xi) => ['A 室', 'B 室', 'C 室'].map((y, yi) => ({ x, y, value: [6, 3, 5, 8, 6, 4, 7, 9, 5, 9, 7, 8, 5, 4, 6][xi * 3 + yi] })))) },
    { id: 'risk', title: '风险矩阵', hint: '概率 × 影响', data: heatmap(['低概率', '中概率', '高概率'].flatMap((x, xi) => ['低影响', '中影响', '高影响'].map((y, yi) => ({ x, y, value: (xi + 1) * (yi + 1) })))) },
  ],
  candlestick: [
    { id: 'stock', title: '十日行情', hint: '标准 OHLC 数据', data: candlestick([
      ['08-01', 120.2, 125.5, 118.5, 127.2], ['08-02', 127.2, 131.1, 126.5, 134], ['08-03', 130.6, 128.6, 126.1, 132.5], ['08-04', 131, 126.4, 123.5, 132.1], ['08-05', 126.3, 124.7, 122.3, 127.5], ['08-06', 125, 127.9, 122.1, 129.5], ['08-07', 124.9, 128.4, 123.2, 131], ['08-08', 127.5, 130.3, 126.4, 132.4], ['08-09', 128.6, 129.7, 127.1, 131.4], ['08-10', 130.6, 127.1, 125.5, 132.8],
    ].map(([date, open, close, low, high]) => ({ date: String(date), open: Number(open), close: Number(close), low: Number(low), high: Number(high) }))) },
    { id: 'fund', title: '基金净值区间', hint: '适合小数价格', data: candlestick([
      ['第 1 周', 1.24, 1.29, 1.21, 1.31], ['第 2 周', 1.29, 1.27, 1.25, 1.33], ['第 3 周', 1.27, 1.34, 1.26, 1.36], ['第 4 周', 1.34, 1.31, 1.29, 1.37], ['第 5 周', 1.31, 1.38, 1.30, 1.40],
    ].map(([date, open, close, low, high]) => ({ date: String(date), open: Number(open), close: Number(close), low: Number(low), high: Number(high) }))) },
    { id: 'commodity', title: '商品价格波动', hint: '支持长序列缩放', data: candlestick(Array.from({ length: 18 }, (_, index) => { const open = 80 + index * 1.2 + (index % 3) * 2; const close = open + (index % 2 ? -2.8 : 3.4); return { date: `${index + 1} 日`, open, close, low: Math.min(open, close) - 2, high: Math.max(open, close) + 2.6 } })) },
  ],
  stack: [
    { id: 'channels', title: '渠道流量构成', hint: '多系列堆叠柱', data: stack(['周一', '周二', '周三', '周四', '周五'], [{ name: '自然搜索', values: [120, 132, 148, 165, 176] }, { name: '内容推荐', values: [86, 98, 112, 124, 139] }, { name: '广告投放', values: [64, 72, 68, 83, 91] }]) },
    { id: 'cost', title: '部门成本趋势', hint: '适合堆叠面积线', data: stack(['1 月', '2 月', '3 月', '4 月', '5 月', '6 月'], [{ name: '研发', values: [42, 46, 51, 54, 58, 63] }, { name: '市场', values: [28, 34, 31, 39, 45, 48] }, { name: '运营', values: [22, 24, 26, 29, 31, 33] }]) },
    { id: 'orders', title: '订单状态分布', hint: '开启总量标签', data: stack(['华东', '华南', '华北', '西南'], [{ name: '已完成', values: [860, 720, 640, 510] }, { name: '处理中', values: [160, 142, 128, 105] }, { name: '退款', values: [42, 38, 35, 29] }]) },
  ],
}

function emptyData(kind: AdvancedChartKind): AdvancedChartData {
  if (kind === 'radar') return radar([], [])
  if (kind === 'gauge') return gauge([])
  if (kind === 'heatmap') return heatmap([])
  if (kind === 'candlestick') return candlestick([])
  return stack([], [])
}

function parseTable(text: string, kind: AdvancedChartKind): AdvancedParseResult {
  const rows = tableRows(text)
  const errors: string[] = []
  if (rows.length < 2) return { data: emptyData(kind), errors: ['请保留表头并至少输入一行数据'] }
  const header = rows[0].cells
  const body = rows.slice(1, 201)
  if (rows.length > 201) errors.push('为保证绘制流畅，最多使用前 200 行数据')

  if (kind === 'gauge') {
    const items: GaugeChartData['items'] = []
    body.forEach(row => {
      const value = numberValue(row.cells[1])
      if (!row.cells[0] || value === null) errors.push(`第 ${row.line} 行：指标名称和数值必须有效`)
      else items.push({ name: row.cells[0], value })
    })
    return { data: gauge(items), errors }
  }
  if (kind === 'heatmap') {
    const points: HeatmapChartData['points'] = []
    body.forEach(row => {
      const value = numberValue(row.cells[2])
      if (!row.cells[0] || !row.cells[1] || value === null) errors.push(`第 ${row.line} 行：X、Y 分类和数值必须有效`)
      else points.push({ x: row.cells[0], y: row.cells[1], value })
    })
    return { data: heatmap(points), errors }
  }
  if (kind === 'candlestick') {
    const items: CandlestickChartData['items'] = []
    body.forEach(row => {
      const values = row.cells.slice(1, 5).map(numberValue)
      if (!row.cells[0] || values.some(value => value === null)) { errors.push(`第 ${row.line} 行：日期及开、收、低、高必须有效`); return }
      const [open, close, low, high] = values as number[]
      if (low > Math.min(open, close) || high < Math.max(open, close) || low > high) { errors.push(`第 ${row.line} 行：最低价不能高于开收盘，最高价不能低于开收盘`); return }
      items.push({ date: row.cells[0], open, close, low, high })
    })
    return { data: candlestick(items), errors }
  }

  const seriesHeaders = header.slice(1).filter(Boolean)
  const maxIndex = kind === 'radar' ? seriesHeaders.findIndex(name => /^(最大值|max)$/i.test(name)) : -1
  const seriesNames = seriesHeaders.filter((_name, index) => index !== maxIndex)
  const categories: string[] = []
  const series = seriesNames.map(name => ({ name, values: [] as number[] }))
  const maxima: number[] = []
  body.forEach(row => {
    if (!row.cells[0]) { errors.push(`第 ${row.line} 行：${kind === 'radar' ? '维度' : '分类'}不能为空`); return }
    const values = seriesNames.map((_name, seriesIndex) => numberValue(row.cells[seriesIndex + 1]))
    if (values.some(value => value === null)) { errors.push(`第 ${row.line} 行：所有系列都必须填写有效数字`); return }
    categories.push(row.cells[0])
    values.forEach((value, index) => series[index].values.push(value as number))
    if (kind === 'radar') {
      const sourceIndex = maxIndex < 0 ? -1 : maxIndex + 1
      const explicit = sourceIndex < 0 ? null : numberValue(row.cells[sourceIndex])
      maxima.push(explicit && explicit > 0 ? explicit : Math.max(...values.map(Number), 1) * 1.2)
    }
  })
  if (!series.length) errors.push('表头中至少需要一个数据系列')
  return { data: kind === 'radar' ? radar(categories, series, maxima) : stack(categories, series), errors }
}

function parseJson(text: string, kind: AdvancedChartKind): AdvancedParseResult {
  let source: unknown
  try { source = JSON.parse(text) } catch (error) { return { data: emptyData(kind), errors: [`JSON 解析失败：${error instanceof Error ? error.message : '格式不正确'}`] } }
  const errors: string[] = []
  if (kind === 'gauge' || kind === 'heatmap' || kind === 'candlestick') {
    if (!Array.isArray(source)) return { data: emptyData(kind), errors: ['JSON 顶层必须是数组'] }
    if (kind === 'gauge') return parseTable(['指标,数值', ...source.map((item: any) => `${item?.name ?? ''},${item?.value ?? ''}`)].join('\n'), kind)
    if (kind === 'heatmap') return parseTable(['X,Y,数值', ...source.map((item: any) => `${item?.x ?? ''},${item?.y ?? ''},${item?.value ?? ''}`)].join('\n'), kind)
    return parseTable(['日期,开盘,收盘,最低,最高', ...source.map((item: any) => `${item?.date ?? ''},${item?.open ?? ''},${item?.close ?? ''},${item?.low ?? ''},${item?.high ?? ''}`)].join('\n'), kind)
  }
  if (!source || typeof source !== 'object' || Array.isArray(source)) return { data: emptyData(kind), errors: ['JSON 顶层必须是包含分类和系列的对象'] }
  const object = source as Record<string, any>
  const categories = kind === 'radar' ? object.dimensions : object.categories
  if (!Array.isArray(categories) || !Array.isArray(object.series)) return { data: emptyData(kind), errors: ['需要有效的 dimensions/categories 与 series 数组'] }
  const series: NamedSeries[] = object.series.map((item: any, index: number) => {
    const values = Array.isArray(item?.values) ? item.values.map(numberValue) : []
    if (!item?.name || values.length !== categories.length || values.some(value => value === null)) errors.push(`第 ${index + 1} 个系列名称、数量或数值无效`)
    return { name: String(item?.name ?? `系列 ${index + 1}`), values: values.map(value => value ?? 0) }
  })
  if (errors.length) return { data: emptyData(kind), errors }
  if (kind === 'radar') {
    const maxima = Array.isArray(object.maxima) && object.maxima.length === categories.length ? object.maxima.map((value: unknown) => numberValue(value) ?? 0) : categories.map((_item: string, index: number) => Math.max(...series.map(item => item.values[index]), 1) * 1.2)
    return { data: radar(categories.map(String), series, maxima), errors }
  }
  return { data: stack(categories.map(String), series), errors }
}

export function parseAdvancedChartData(text: string, kind: AdvancedChartKind, mode: AdvancedDataMode): AdvancedParseResult {
  return mode === 'json' ? parseJson(text.trim(), kind) : parseTable(text, kind)
}

function csv(value: string) { return /[",\n\t]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value }

export function serializeAdvancedChartData(data: AdvancedChartData, mode: AdvancedDataMode) {
  if (mode === 'json') {
    if (data.kind === 'radar') return JSON.stringify({ dimensions: data.dimensions, maxima: data.maxima, series: data.series }, null, 2)
    if (data.kind === 'stack') return JSON.stringify({ categories: data.categories, series: data.series }, null, 2)
    if (data.kind === 'gauge') return JSON.stringify(data.items, null, 2)
    if (data.kind === 'heatmap') return JSON.stringify(data.points, null, 2)
    return JSON.stringify(data.items, null, 2)
  }
  if (data.kind === 'gauge') return ['指标,数值', ...data.items.map(item => `${csv(item.name)},${item.value}`)].join('\n')
  if (data.kind === 'heatmap') return ['X,Y,数值', ...data.points.map(item => `${csv(item.x)},${csv(item.y)},${item.value}`)].join('\n')
  if (data.kind === 'candlestick') return ['日期,开盘,收盘,最低,最高', ...data.items.map(item => `${csv(item.date)},${item.open},${item.close},${item.low},${item.high}`)].join('\n')
  const labels = data.kind === 'radar' ? data.dimensions : data.categories
  const header = [data.kind === 'radar' ? '维度' : '分类', ...data.series.map(item => csv(item.name)), ...(data.kind === 'radar' ? ['最大值'] : [])]
  return [header.join(','), ...labels.map((label, index) => [csv(label), ...data.series.map(item => item.values[index]), ...(data.kind === 'radar' ? [data.maxima[index]] : [])].join(','))].join('\n')
}

function titleLeft(position: AdvancedChartSettings['titlePosition']) { return position === 'left' ? 24 : position === 'right' ? 'right' : 'center' }

export function buildAdvancedChartOption(kind: AdvancedChartKind, data: AdvancedChartData, settings: AdvancedChartSettings, dark = false) {
  const text = dark ? '#E2E8F0' : '#334155'; const muted = dark ? '#94A3B8' : '#64748B'; const grid = dark ? '#334155' : '#E2E8F0'
  const common = { animationDuration: 600, color: settings.palette, backgroundColor: 'transparent', title: { text: settings.title, subtext: settings.subtitle, left: titleLeft(settings.titlePosition), top: 14, textStyle: { color: text, fontSize: 18 }, subtextStyle: { color: muted, fontSize: 12 } }, legend: { show: settings.showLegend, bottom: 8, textStyle: { color: muted } }, tooltip: {} }
  if (kind === 'radar' && data.kind === 'radar') {
    const maxima = settings.radarMaxMode === 'fixed' ? data.dimensions.map(() => Math.max(1, settings.radarMax)) : data.maxima.map((max, index) => Math.ceil(Math.max(max, ...data.series.map(item => item.values[index]), 1) * 1.05))
    return { ...common, radar: { center: ['50%', '54%'], radius: '62%', shape: settings.variant, splitNumber: 5, indicator: data.dimensions.map((name, index) => ({ name, max: maxima[index] })), axisName: { color: text, fontSize: 12 }, splitLine: { lineStyle: { color: grid } }, splitArea: { areaStyle: { color: dark ? ['#0F172A', '#172033'] : ['#FFFFFF', '#F8FAFC'] } } }, series: [{ type: 'radar', data: data.series.map(item => ({ name: item.name, value: item.values, areaStyle: { opacity: settings.fillOpacity } })), label: { show: settings.showLabels, color: text } }] }
  }
  if (kind === 'gauge' && data.kind === 'gauge') {
    const count = data.items.length
    return { ...common, series: [{ type: 'gauge', min: settings.gaugeMin, max: settings.gaugeMax, splitNumber: settings.gaugeSplit, center: ['50%', '56%'], radius: '72%', axisLine: { lineStyle: { width: 18, color: [[0.6, '#10B981'], [0.85, '#F59E0B'], [1, '#EF4444']] } }, progress: { show: settings.variant === 'progress', width: 18 }, pointer: { show: settings.variant !== 'progress', length: '62%', width: 6 }, axisTick: { distance: -25, splitNumber: 2 }, splitLine: { distance: -28, length: 12 }, axisLabel: { distance: 28, color: muted }, title: { color: muted, fontSize: 12 }, detail: { formatter: `{value}${settings.unit}`, color: text, fontSize: 20 }, data: data.items.map((item, index) => ({ ...item, title: { offsetCenter: [count === 1 ? '0%' : `${-52 + index * (104 / Math.max(1, count - 1))}%`, '72%'] }, detail: { offsetCenter: [count === 1 ? '0%' : `${-52 + index * (104 / Math.max(1, count - 1))}%`, '88%'] } })) }] }
  }
  if (kind === 'heatmap' && data.kind === 'heatmap') {
    const values = data.points.map(point => point.value); const min = values.length ? Math.min(...values) : 0; const max = values.length ? Math.max(...values) : 1
    const midpoint = min + (max - min) * 0.52
    return { ...common, grid: { top: 84, left: 38, right: 34, bottom: 92, containLabel: true }, xAxis: { type: 'category', data: data.xCategories, axisLabel: { color: muted, hideOverlap: true }, splitArea: { show: true } }, yAxis: { type: 'category', data: data.yCategories, axisLabel: { color: muted }, splitArea: { show: true } }, visualMap: { min, max, calculable: true, orient: 'horizontal', left: 'center', bottom: 16, inRange: { color: [settings.heatMinColor, settings.heatMaxColor] }, textStyle: { color: muted } }, series: [{ type: 'heatmap', data: data.points.map(point => ({ value: [data.xCategories.indexOf(point.x), data.yCategories.indexOf(point.y), point.value], label: { color: point.value >= midpoint ? '#FFFFFF' : '#0F172A' } })), label: { show: settings.showLabels }, itemStyle: { borderWidth: 2, borderColor: dark ? '#1E293B' : '#FFFFFF', borderRadius: settings.variant === 'rounded' ? 6 : 0 } }] }
  }
  if (kind === 'candlestick' && data.kind === 'candlestick') {
    return { ...common, tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } }, grid: { top: 82, left: 52, right: 28, bottom: settings.showZoom ? 82 : 42, containLabel: true }, xAxis: { type: 'category', data: data.items.map(item => item.date), boundaryGap: true, axisLabel: { color: muted, hideOverlap: true }, axisLine: { lineStyle: { color: grid } } }, yAxis: { scale: true, axisLabel: { color: muted }, splitLine: { lineStyle: { color: grid } } }, dataZoom: settings.showZoom ? [{ type: 'inside', start: 0, end: 100 }, { type: 'slider', bottom: 12, height: 20, start: 0, end: 100 }] : [], series: [{ type: 'candlestick', data: data.items.map(item => [item.open, item.close, item.low, item.high]), itemStyle: { color: settings.upColor, color0: settings.downColor, borderColor: settings.upColor, borderColor0: settings.downColor } }] }
  }
  if (kind === 'stack' && data.kind === 'stack') {
    const totals = data.categories.map((_item, index) => data.series.reduce((sum, item) => sum + item.values[index], 0))
    const series = data.series.map((item, seriesIndex) => ({ name: item.name, type: settings.variant === 'line' ? 'line' : 'bar', stack: 'total', smooth: settings.variant === 'line', areaStyle: settings.variant === 'line' ? { opacity: 0.22 } : undefined, emphasis: { focus: 'series' }, data: item.values.map((value, index) => settings.showTotal && seriesIndex === data.series.length - 1 ? { value, label: { show: true, position: 'top', color: text, formatter: String(totals[index] ?? '') } } : value), label: { show: false }, itemStyle: settings.variant === 'bar' ? { borderRadius: seriesIndex === data.series.length - 1 ? [5, 5, 0, 0] : 0 } : undefined }))
    return { ...common, tooltip: { trigger: 'axis', axisPointer: { type: settings.variant === 'line' ? 'line' : 'shadow' } }, grid: { top: 82, left: 48, right: 28, bottom: settings.showLegend ? 62 : 42, containLabel: true }, xAxis: { type: 'category', data: data.categories, axisLabel: { color: muted, hideOverlap: true }, axisLine: { lineStyle: { color: grid } } }, yAxis: { type: 'value', axisLabel: { color: muted }, splitLine: { lineStyle: { color: grid } } }, series }
  }
  return { ...common, series: [] }
}

export function getAdvancedStats(data: AdvancedChartData) {
  if (data.kind === 'radar') return { count: data.dimensions.length, series: data.series.length, max: Math.max(0, ...data.series.flatMap(item => item.values)) }
  if (data.kind === 'gauge') return { count: data.items.length, series: data.items.length, max: Math.max(0, ...data.items.map(item => item.value)) }
  if (data.kind === 'heatmap') return { count: data.points.length, series: data.yCategories.length, max: Math.max(0, ...data.points.map(item => item.value)) }
  if (data.kind === 'candlestick') return { count: data.items.length, series: 1, max: Math.max(0, ...data.items.map(item => item.high)) }
  return { count: data.categories.length, series: data.series.length, max: Math.max(0, ...data.series.flatMap(item => item.values)) }
}
