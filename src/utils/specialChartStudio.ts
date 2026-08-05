import { numberValue, parseTableRows as tableRows } from './chartParser.ts'

export type SpecialChartKind = 'treemap' | 'sankey' | 'boxplot' | 'calendar'
export type SpecialDataMode = 'table' | 'json'

export interface TreeNode { name: string; value?: number; children?: TreeNode[] }
export interface TreemapChartData { kind: 'treemap'; nodes: TreeNode[] }
export interface SankeyLink { source: string; target: string; value: number }
export interface SankeyChartData { kind: 'sankey'; nodes: string[]; links: SankeyLink[] }
export interface BoxGroup { name: string; values: [number, number, number, number, number]; outliers: number[]; samples?: number[] }
export interface BoxplotChartData { kind: 'boxplot'; groups: BoxGroup[] }
export interface CalendarItem { date: string; value: number }
export interface CalendarChartData { kind: 'calendar'; items: CalendarItem[]; years: number[] }
export type SpecialChartData = TreemapChartData | SankeyChartData | BoxplotChartData | CalendarChartData

export interface SpecialParseResult { data: SpecialChartData; errors: string[] }
export interface SpecialSample { id: string; title: string; hint: string; data: SpecialChartData }

export interface SpecialChartSettings {
  title: string
  subtitle: string
  titlePosition: 'left' | 'center' | 'right'
  variant: string
  palette: string[]
  showLabels: boolean
  treemapDepth: number
  showBreadcrumb: boolean
  sankeyAlign: 'justify' | 'left' | 'right'
  sankeyCurve: number
  boxColor: string
  showOutliers: boolean
  calendarYear: number
  calendarMinColor: string
  calendarMaxColor: string
  showVisualMap: boolean
}

const treemap = (nodes: TreeNode[]): TreemapChartData => ({ kind: 'treemap', nodes })
const sankey = (links: SankeyLink[]): SankeyChartData => ({ kind: 'sankey', links, nodes: [...new Set(links.flatMap(link => [link.source, link.target]))] })
const boxplot = (groups: BoxGroup[]): BoxplotChartData => ({ kind: 'boxplot', groups })
const calendar = (items: CalendarItem[]): CalendarChartData => ({ kind: 'calendar', items, years: [...new Set(items.map(item => Number(item.date.slice(0, 4))))].sort((a, b) => a - b) })

function calendarSample(year: number, days = 365, offset = 0) {
  const start = new Date(Date.UTC(year, 0, 1))
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start); date.setUTCDate(start.getUTCDate() + index + offset)
    return { date: date.toISOString().slice(0, 10), value: (index * 17 + index % 11 * 7 + 19) % 101 }
  })
}

export const SPECIAL_SAMPLES: Record<SpecialChartKind, SpecialSample[]> = {
  treemap: [
    { id: 'products', title: '产品收入结构', hint: '三层路径与占比', data: treemap([
      { name: '核心产品', children: [{ name: '旗舰版', value: 420 }, { name: '专业版', value: 280 }, { name: '团队版', value: 190 }] },
      { name: '增值服务', children: [{ name: '实施服务', value: 150 }, { name: '培训', value: 86 }, { name: '支持计划', value: 64 }] },
      { name: '生态合作', children: [{ name: '应用市场', value: 118 }, { name: '渠道分成', value: 92 }] },
    ]) },
    { id: 'storage', title: '项目空间占用', hint: '定位大目录', data: treemap([
      { name: 'src', children: [{ name: 'components', value: 382 }, { name: 'assets', value: 186 }, { name: 'utils', value: 94 }] },
      { name: 'public', children: [{ name: 'images', value: 248 }, { name: 'fonts', value: 122 }] },
      { name: 'tests', value: 76 },
    ]) },
    { id: 'regions', title: '区域销售构成', hint: '大区与城市钻取', data: treemap([
      { name: '华东', children: [{ name: '上海', value: 310 }, { name: '杭州', value: 225 }, { name: '南京', value: 168 }] },
      { name: '华南', children: [{ name: '深圳', value: 272 }, { name: '广州', value: 241 }, { name: '厦门', value: 96 }] },
      { name: '华北', children: [{ name: '北京', value: 288 }, { name: '天津', value: 104 }] },
    ]) },
  ],
  sankey: [
    { id: 'traffic', title: '访问转化路径', hint: '渠道到结果的流向', data: sankey([
      { source: '访问流量', target: '搜索引擎', value: 1200 }, { source: '访问流量', target: '直接访问', value: 600 }, { source: '访问流量', target: '社交媒体', value: 360 },
      { source: '搜索引擎', target: '注册用户', value: 410 }, { source: '搜索引擎', target: '浏览离开', value: 790 }, { source: '直接访问', target: '注册用户', value: 230 },
      { source: '直接访问', target: '浏览离开', value: 370 }, { source: '社交媒体', target: '注册用户', value: 140 }, { source: '社交媒体', target: '浏览离开', value: 220 },
    ]) },
    { id: 'energy', title: '能源流向', hint: '来源、转换与消耗', data: sankey([
      { source: '太阳能', target: '电力供应', value: 46 }, { source: '风能', target: '电力供应', value: 34 }, { source: '天然气', target: '电力供应', value: 28 },
      { source: '电力供应', target: '工业', value: 44 }, { source: '电力供应', target: '商业', value: 31 }, { source: '电力供应', target: '居民', value: 27 }, { source: '电力供应', target: '损耗', value: 6 },
    ]) },
    { id: 'budget', title: '预算分配', hint: '总预算到项目投入', data: sankey([
      { source: '年度预算', target: '研发', value: 520 }, { source: '年度预算', target: '市场', value: 310 }, { source: '年度预算', target: '运营', value: 260 },
      { source: '研发', target: '核心产品', value: 330 }, { source: '研发', target: '基础设施', value: 190 }, { source: '市场', target: '品牌', value: 130 }, { source: '市场', target: '增长', value: 180 },
    ]) },
  ],
  boxplot: [
    { id: 'latency', title: '接口延迟分布', hint: '原始样本与异常值', data: boxplot([
      makeBoxGroup('首页接口', [82, 91, 96, 101, 106, 110, 115, 121, 132, 188]),
      makeBoxGroup('搜索接口', [104, 112, 118, 124, 129, 135, 142, 151, 164, 238]),
      makeBoxGroup('支付接口', [126, 132, 139, 146, 152, 159, 168, 178, 196, 282]),
    ]) },
    { id: 'scores', title: '班级成绩分布', hint: '比较四组离散程度', data: boxplot([
      makeBoxGroup('一班', [62, 68, 72, 76, 79, 82, 84, 87, 91, 96]), makeBoxGroup('二班', [58, 66, 70, 73, 77, 81, 85, 88, 90, 94]),
      makeBoxGroup('三班', [64, 71, 74, 78, 80, 83, 86, 89, 93, 97]), makeBoxGroup('四班', [55, 63, 69, 75, 78, 82, 86, 92, 95, 99]),
    ]) },
    { id: 'summary', title: '季度交付周期', hint: '直接录入五数概括', data: boxplot([
      { name: '第一季度', values: [6, 8, 10, 13, 18], outliers: [] }, { name: '第二季度', values: [5, 7, 9, 11, 15], outliers: [21] },
      { name: '第三季度', values: [4, 6, 8, 10, 14], outliers: [] }, { name: '第四季度', values: [4, 5, 7, 9, 12], outliers: [18] },
    ]) },
  ],
  calendar: [
    { id: 'activity', title: '2026 活跃度', hint: '全年连续日期', data: calendar(calendarSample(2026)) },
    { id: 'campaign', title: '季度活动热度', hint: '部分日期与缺失提醒', data: calendar(calendarSample(2026, 91, 90)) },
    { id: 'reading', title: '年度阅读记录', hint: '每日分钟数', data: calendar(calendarSample(2025).filter((_item, index) => index % 3 !== 0).map((item, index) => ({ ...item, value: 10 + (index * 13) % 76 }))) },
  ],
}

function emptyData(kind: SpecialChartKind): SpecialChartData {
  if (kind === 'treemap') return treemap([])
  if (kind === 'sankey') return sankey([])
  if (kind === 'boxplot') return boxplot([])
  return calendar([])
}

function cloneTree(nodes: TreeNode[]) { return nodes.map(node => ({ name: node.name, ...(node.value === undefined ? {} : { value: node.value }), ...(node.children ? { children: cloneTree(node.children) } : {}) })) }

function treeFromPaths(rows: { line: number; cells: string[] }[], errors: string[]) {
  const roots: TreeNode[] = []
  const leaves = new Set<string>()
  rows.forEach(row => {
    const parts = (row.cells[0] ?? '').split('/').map(part => part.trim()).filter(Boolean)
    const value = numberValue(row.cells[1])
    if (!parts.length || value === null || value < 0) { errors.push(`第 ${row.line} 行：层级路径不能为空，数值必须是非负数`); return }
    const key = parts.join('/')
    if (leaves.has(key)) { errors.push(`第 ${row.line} 行：路径“${key}”重复`); return }
    let nodes = roots
    let invalid = false
    for (let index = 0; index < parts.length; index += 1) {
      const name = parts[index]
      let node = nodes.find(item => item.name === name)
      if (!node) { node = { name }; nodes.push(node) }
      if (index === parts.length - 1) {
        if (node.children?.length) { errors.push(`第 ${row.line} 行：路径“${key}”已经是其他项目的父级`); invalid = true; break }
        node.value = value
      } else {
        if (node.value !== undefined) { errors.push(`第 ${row.line} 行：路径“${parts.slice(0, index + 1).join('/')}”已经作为叶节点使用`); invalid = true; break }
        node.children ??= []; nodes = node.children
      }
    }
    if (!invalid) leaves.add(key)
  })
  return roots
}

function hasPath(start: string, goal: string, graph: Map<string, Set<string>>, seen = new Set<string>()): boolean {
  if (start === goal) return true
  if (seen.has(start)) return false
  seen.add(start)
  return [...(graph.get(start) ?? [])].some(next => hasPath(next, goal, graph, seen))
}

function sankeyFromRows(rows: { line: number; cells: string[] }[], errors: string[]) {
  const links: SankeyLink[] = []; const graph = new Map<string, Set<string>>(); const keys = new Set<string>()
  rows.forEach(row => {
    const source = row.cells[0]?.trim(); const target = row.cells[1]?.trim(); const value = numberValue(row.cells[2])
    if (!source || !target || value === null || value <= 0) { errors.push(`第 ${row.line} 行：来源、目标和大于 0 的流量必须有效`); return }
    if (source === target) { errors.push(`第 ${row.line} 行：来源与目标不能相同`); return }
    const key = `${source}\u0000${target}`
    if (keys.has(key)) { errors.push(`第 ${row.line} 行：流向“${source} → ${target}”重复`); return }
    if (hasPath(target, source, graph)) { errors.push(`第 ${row.line} 行：流向“${source} → ${target}”会形成环路，已跳过`); return }
    keys.add(key); links.push({ source, target, value })
    if (!graph.has(source)) graph.set(source, new Set()); graph.get(source)!.add(target)
  })
  return sankey(links)
}

function quantile(sorted: number[], position: number) {
  const index = (sorted.length - 1) * position; const lower = Math.floor(index); const fraction = index - lower
  return sorted[lower] + (sorted[lower + 1] === undefined ? 0 : fraction * (sorted[lower + 1] - sorted[lower]))
}

export function makeBoxGroup(name: string, rawSamples: number[]): BoxGroup {
  const samples = rawSamples.filter(Number.isFinite).sort((a, b) => a - b)
  if (!samples.length) return { name, values: [0, 0, 0, 0, 0], outliers: [], samples: [] }
  const q1 = quantile(samples, .25); const median = quantile(samples, .5); const q3 = quantile(samples, .75); const iqr = q3 - q1
  const lowFence = q1 - 1.5 * iqr; const highFence = q3 + 1.5 * iqr
  const regular = samples.filter(value => value >= lowFence && value <= highFence); const outliers = samples.filter(value => value < lowFence || value > highFence)
  return { name, values: [regular[0] ?? samples[0], q1, median, q3, regular[regular.length - 1] ?? samples[samples.length - 1]], outliers, samples }
}

function boxplotFromRows(header: string[], rows: { line: number; cells: string[] }[], errors: string[]) {
  const isSamples = header.length < 6 || /样本|sample/i.test(header[1] ?? '')
  if (isSamples) {
    const groups = new Map<string, number[]>()
    rows.forEach(row => {
      const name = row.cells[0]?.trim(); const value = numberValue(row.cells[1])
      if (!name || value === null) { errors.push(`第 ${row.line} 行：分组和样本值必须有效`); return }
      if (!groups.has(name)) groups.set(name, []); groups.get(name)!.push(value)
    })
    const result = [...groups].map(([name, samples]) => {
      if (samples.length < 4) errors.push(`分组“${name}”至少需要 4 个样本值`)
      return makeBoxGroup(name, samples)
    }).filter(group => (group.samples?.length ?? 0) >= 4)
    return boxplot(result)
  }
  const groups: BoxGroup[] = []
  rows.forEach(row => {
    const name = row.cells[0]?.trim(); const values = row.cells.slice(1, 6).map(numberValue)
    if (!name || values.some(value => value === null)) { errors.push(`第 ${row.line} 行：分组和五数概括必须有效`); return }
    const tuple = values as [number, number, number, number, number]
    if (tuple.some((value, index) => index > 0 && value < tuple[index - 1])) { errors.push(`第 ${row.line} 行：最小值、Q1、中位数、Q3、最大值必须依次递增`); return }
    const outliers = (row.cells[6] ?? '').split(/[;；|]/).map(numberValue).filter((value): value is number => value !== null)
    groups.push({ name, values: tuple, outliers })
  })
  return boxplot(groups)
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function calendarFromRows(rows: { line: number; cells: string[] }[], errors: string[]) {
  const items: CalendarItem[] = []; const dates = new Set<string>()
  rows.forEach(row => {
    const date = row.cells[0]?.trim(); const value = numberValue(row.cells[1])
    if (!date || !isValidDate(date) || value === null) { errors.push(`第 ${row.line} 行：日期必须为有效的 YYYY-MM-DD，数值必须有效`); return }
    if (dates.has(date)) { errors.push(`第 ${row.line} 行：日期 ${date} 重复`); return }
    dates.add(date); items.push({ date, value })
  })
  items.sort((a, b) => a.date.localeCompare(b.date)); return calendar(items)
}

function parseTable(text: string, kind: SpecialChartKind): SpecialParseResult {
  const rows = tableRows(text); const errors: string[] = []
  if (rows.length < 2) return { data: emptyData(kind), errors: ['请保留表头并至少输入一行数据'] }
  const limit = kind === 'calendar' ? 1000 : 300; const body = rows.slice(1, limit + 1)
  if (rows.length > limit + 1) errors.push(`为保证绘制流畅，最多使用前 ${limit} 行数据`)
  if (kind === 'treemap') return { data: treemap(treeFromPaths(body, errors)), errors }
  if (kind === 'sankey') return { data: sankeyFromRows(body, errors), errors }
  if (kind === 'boxplot') return { data: boxplotFromRows(rows[0].cells, body, errors), errors }
  return { data: calendarFromRows(body, errors), errors }
}

function validTreeNodes(source: unknown, errors: string[], path = ''): TreeNode[] {
  if (!Array.isArray(source)) { errors.push(path ? `${path} 的 children 必须是数组` : 'JSON 顶层必须是节点数组'); return [] }
  const names = new Set<string>(); const nodes: TreeNode[] = []
  source.forEach((item: any, index) => {
    const label = path ? `${path}/${item?.name ?? index + 1}` : String(item?.name ?? index + 1)
    if (!item || typeof item !== 'object' || !String(item.name ?? '').trim()) { errors.push(`节点 ${label} 缺少有效名称`); return }
    const name = String(item.name).trim()
    if (names.has(name)) { errors.push(`同级节点“${name}”重复`); return }
    names.add(name)
    if (Array.isArray(item.children) && item.children.length) { nodes.push({ name, children: validTreeNodes(item.children, errors, label) }); return }
    const value = numberValue(item.value)
    if (value === null || value < 0) { errors.push(`叶节点“${label}”需要非负数值`); return }
    nodes.push({ name, value })
  })
  return nodes
}

function parseJson(text: string, kind: SpecialChartKind): SpecialParseResult {
  let source: unknown
  try { source = JSON.parse(text) } catch (error) { return { data: emptyData(kind), errors: [`JSON 解析失败：${error instanceof Error ? error.message : '格式不正确'}`] } }
  const errors: string[] = []
  if (kind === 'treemap') return { data: treemap(validTreeNodes(source, errors)), errors }
  if (!Array.isArray(source)) return { data: emptyData(kind), errors: ['JSON 顶层必须是数组'] }
  if (kind === 'sankey') return { data: sankeyFromRows(source.map((item: any, index) => ({ line: index + 1, cells: [String(item?.source ?? ''), String(item?.target ?? ''), String(item?.value ?? '')] })), errors), errors }
  if (kind === 'calendar') return { data: calendarFromRows(source.map((item: any, index) => ({ line: index + 1, cells: [String(item?.date ?? ''), String(item?.value ?? '')] })), errors), errors }
  const groups: BoxGroup[] = []
  source.forEach((item: any, index) => {
    const name = String(item?.name ?? '').trim()
    if (!name) { errors.push(`第 ${index + 1} 组缺少名称`); return }
    if (Array.isArray(item.samples)) {
      const samples = item.samples.map(numberValue)
      if (samples.length < 4 || samples.some(value => value === null)) { errors.push(`分组“${name}”至少需要 4 个有效样本值`); return }
      groups.push(makeBoxGroup(name, samples as number[])); return
    }
    const values = Array.isArray(item.values) ? item.values.map(numberValue) : []
    if (values.length !== 5 || values.some(value => value === null)) { errors.push(`分组“${name}”需要 samples 或 5 项 values`); return }
    const tuple = values as [number, number, number, number, number]
    if (tuple.some((value, valueIndex) => valueIndex > 0 && value < tuple[valueIndex - 1])) { errors.push(`分组“${name}”的五数概括必须依次递增`); return }
    const outliers = Array.isArray(item.outliers) ? item.outliers.map(numberValue).filter((value): value is number => value !== null) : []
    groups.push({ name, values: tuple, outliers })
  })
  return { data: boxplot(groups), errors }
}

export function parseSpecialChartData(text: string, kind: SpecialChartKind, mode: SpecialDataMode): SpecialParseResult {
  return mode === 'json' ? parseJson(text.trim(), kind) : parseTable(text, kind)
}

function csv(value: string) { return /[",\n\t]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value }
function flattenTree(nodes: TreeNode[], parent = ''): { path: string; value: number }[] {
  return nodes.flatMap(node => {
    const path = parent ? `${parent}/${node.name}` : node.name
    return node.children?.length ? flattenTree(node.children, path) : [{ path, value: node.value ?? 0 }]
  })
}

export function serializeSpecialChartData(data: SpecialChartData, mode: SpecialDataMode) {
  if (mode === 'json') {
    if (data.kind === 'treemap') return JSON.stringify(cloneTree(data.nodes), null, 2)
    if (data.kind === 'sankey') return JSON.stringify(data.links, null, 2)
    if (data.kind === 'calendar') return JSON.stringify(data.items, null, 2)
    return JSON.stringify(data.groups.map(group => group.samples?.length ? { name: group.name, samples: group.samples } : { name: group.name, values: group.values, outliers: group.outliers }), null, 2)
  }
  if (data.kind === 'treemap') return ['层级路径,数值', ...flattenTree(data.nodes).map(item => `${csv(item.path)},${item.value}`)].join('\n')
  if (data.kind === 'sankey') return ['来源,目标,流量', ...data.links.map(link => `${csv(link.source)},${csv(link.target)},${link.value}`)].join('\n')
  if (data.kind === 'calendar') return ['日期,数值', ...data.items.map(item => `${item.date},${item.value}`)].join('\n')
  if (data.groups.every(group => group.samples?.length)) return ['分组,样本值', ...data.groups.flatMap(group => group.samples!.map(value => `${csv(group.name)},${value}`))].join('\n')
  return ['分组,最小值,Q1,中位数,Q3,最大值,异常值（分号分隔）', ...data.groups.map(group => `${csv(group.name)},${group.values.join(',')},${group.outliers.join(';')}`)].join('\n')
}

function titleLeft(position: SpecialChartSettings['titlePosition']) { return position === 'left' ? 24 : position === 'right' ? 'right' : 'center' }
function treeValue(nodes: TreeNode[]): number { return nodes.reduce((sum, node) => sum + (node.children?.length ? treeValue(node.children) : node.value ?? 0), 0) }

export function buildSpecialChartOption(kind: SpecialChartKind, data: SpecialChartData, settings: SpecialChartSettings, dark = false) {
  const text = dark ? '#E2E8F0' : '#334155'; const muted = dark ? '#94A3B8' : '#64748B'; const grid = dark ? '#334155' : '#E2E8F0'
  const common = { animationDuration: 600, color: settings.palette, backgroundColor: 'transparent', title: { text: settings.title, subtext: settings.subtitle, left: titleLeft(settings.titlePosition), top: 14, textStyle: { color: text, fontSize: 18 }, subtextStyle: { color: muted, fontSize: 12 } }, tooltip: {} }
  if (kind === 'treemap' && data.kind === 'treemap') return { ...common, tooltip: { formatter: (params: any) => `${params.treePathInfo?.slice(1).map((item: any) => item.name).join(' / ') ?? params.name}<br/>${params.value}` }, series: [{ type: 'treemap', top: 82, left: 18, right: 18, bottom: settings.showBreadcrumb ? 36 : 18, data: data.nodes, leafDepth: settings.treemapDepth, roam: false, sort: settings.variant === 'ordered' ? 'desc' : null, breadcrumb: { show: settings.showBreadcrumb, bottom: 5, itemStyle: { color: dark ? '#334155' : '#E2E8F0', textStyle: { color: text } } }, label: { show: settings.showLabels, formatter: '{b}\n{c}', fontSize: 12, lineHeight: 17 }, upperLabel: { show: true, height: 26, color: text, fontWeight: 700 }, itemStyle: { borderColor: dark ? '#0F172A' : '#FFFFFF', borderWidth: 2, gapWidth: 2 }, levels: [{ itemStyle: { borderWidth: 0, gapWidth: 3 } }, { colorSaturation: [.35, .72], itemStyle: { gapWidth: 2, borderWidth: 3 } }, { colorSaturation: [.25, .68], itemStyle: { gapWidth: 1, borderWidth: 2 } }] }] }
  if (kind === 'sankey' && data.kind === 'sankey') return { ...common, tooltip: { trigger: 'item' }, series: [{ type: 'sankey', top: 86, left: 24, right: 30, bottom: 28, orient: settings.variant === 'vertical' ? 'vertical' : 'horizontal', nodeAlign: settings.sankeyAlign, draggable: true, emphasis: { focus: 'adjacency' }, data: data.nodes.map(name => ({ name })), links: data.links, label: { show: settings.showLabels, color: text, fontSize: 12 }, lineStyle: { color: 'gradient', curveness: settings.sankeyCurve, opacity: .42 }, itemStyle: { borderColor: dark ? '#64748B' : '#CBD5E1', borderWidth: 1 } }] }
  if (kind === 'boxplot' && data.kind === 'boxplot') {
    const horizontal = settings.variant === 'horizontal'; const categories = data.groups.map(group => group.name)
    const outliers = data.groups.flatMap((group, index) => group.outliers.map(value => horizontal ? [value, index] : [index, value]))
    const categoryAxis = { type: 'category', data: categories, boundaryGap: true, axisLabel: { color: muted, hideOverlap: true }, axisLine: { lineStyle: { color: grid } } }
    const valueAxis = { type: 'value', scale: true, axisLabel: { color: muted }, splitLine: { lineStyle: { color: grid } } }
    return { ...common, tooltip: { trigger: 'item' }, grid: { top: 86, left: 48, right: 30, bottom: 45, containLabel: true }, xAxis: horizontal ? valueAxis : categoryAxis, yAxis: horizontal ? categoryAxis : valueAxis, series: [{ name: '分布', type: 'boxplot', data: data.groups.map(group => group.values), itemStyle: { color: settings.boxColor, borderColor: settings.boxColor, opacity: .58 }, tooltip: { formatter: (params: any) => { const values = (params.value ?? params.data ?? []).slice(-5); return `${params.name}<br/>最大值：${values[4]}<br/>Q3：${values[3]}<br/>中位数：${values[2]}<br/>Q1：${values[1]}<br/>最小值：${values[0]}` } } }, ...(settings.showOutliers ? [{ name: '异常值', type: 'scatter', data: outliers, symbolSize: 8, itemStyle: { color: '#EF4444' } }] : [])] }
  }
  if (kind === 'calendar' && data.kind === 'calendar') {
    const selected = data.items.filter(item => Number(item.date.slice(0, 4)) === settings.calendarYear); const values = selected.map(item => item.value); const min = values.length ? Math.min(...values) : 0; const max = values.length ? Math.max(...values) : 1
    return { ...common, tooltip: { formatter: (params: any) => `${params.data?.[0] ?? ''}<br/>数值：${params.data?.[1] ?? ''}` }, visualMap: { show: settings.showVisualMap, min, max, calculable: true, orient: 'horizontal', left: 'center', bottom: 12, inRange: { color: [settings.calendarMinColor, settings.calendarMaxColor] }, textStyle: { color: muted } }, calendar: [{ top: 100, left: 46, right: 28, bottom: settings.showVisualMap ? 70 : 28, range: String(settings.calendarYear), cellSize: ['auto', 17], itemStyle: { color: dark ? '#172033' : '#F8FAFC', borderColor: dark ? '#334155' : '#E2E8F0', borderWidth: 2, borderRadius: settings.variant === 'rounded' ? 4 : 0 }, dayLabel: { color: muted, firstDay: 1, nameMap: 'ZH' }, monthLabel: { color: muted, nameMap: 'ZH' }, yearLabel: { show: false } }], series: [{ type: 'heatmap', coordinateSystem: 'calendar', data: selected.map(item => [item.date, item.value]), label: { show: settings.showLabels } }] }
  }
  return { ...common, series: [] }
}

function maxTreeDepth(nodes: TreeNode[], depth = 1): number { return nodes.length ? Math.max(...nodes.map(node => node.children?.length ? maxTreeDepth(node.children, depth + 1) : depth)) : 0 }
function daysInYear(year: number) { return new Date(Date.UTC(year + 1, 0, 1)).getTime() - new Date(Date.UTC(year, 0, 1)).getTime() === 366 * 86400000 ? 366 : 365 }

export function getSpecialStats(data: SpecialChartData, selectedYear?: number) {
  if (data.kind === 'treemap') { const leaves = flattenTree(data.nodes); return { count: leaves.length, groups: data.nodes.length, max: Math.max(0, ...leaves.map(item => item.value)), total: treeValue(data.nodes), detail: `${maxTreeDepth(data.nodes)} 层` } }
  if (data.kind === 'sankey') return { count: data.links.length, groups: data.nodes.length, max: Math.max(0, ...data.links.map(link => link.value)), total: data.links.reduce((sum, link) => sum + link.value, 0), detail: `${data.nodes.length} 个节点` }
  if (data.kind === 'boxplot') return { count: data.groups.length, groups: data.groups.length, max: Math.max(0, ...data.groups.flatMap(group => [...group.values, ...group.outliers])), total: data.groups.reduce((sum, group) => sum + (group.samples?.length ?? 0), 0), detail: `${data.groups.reduce((sum, group) => sum + group.outliers.length, 0)} 个异常值` }
  const year = selectedYear ?? data.years[0] ?? 0; const current = data.items.filter(item => Number(item.date.slice(0, 4)) === year)
  return { count: current.length, groups: data.years.length, max: Math.max(0, ...current.map(item => item.value)), total: current.reduce((sum, item) => sum + item.value, 0), detail: year ? `${Math.max(0, daysInYear(year) - current.length)} 天缺失` : '无年份' }
}
