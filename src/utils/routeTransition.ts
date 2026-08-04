// 同类工具家族分组：同一分组内的路由切换视为「同类工具快速切换」，
// 跳过页面过渡动画与加载遮罩，并保持当前滚动位置。
const FAMILY_GROUPS: string[][] = [
  // 数据图表（ChartToolNav 快速切换的 14 个工具）
  ['bar', 'line', 'pie', 'scatter', 'funnel', 'radar', 'gauge', 'heatmap', 'candlestick', 'stack', 'treemap', 'sankey', 'boxplot', 'calendar'],
  // 单位换算（UnitWorkbench 分类 + 家族入口）
  ['unit', 'length', 'area', 'weight', 'time', 'temperature', 'pressure', 'heat', 'power'],
]

function pathKey(path: string): string {
  return path.replace(/\/+$/, '') || '/'
}

// 判断两次导航是否属于同一工具家族（即「同类工具快速切换」）
export function isSameFamily(fromPath: string, toPath: string): boolean {
  const from = pathKey(fromPath)
  const to = pathKey(toPath)
  if (from === to) return false
  return FAMILY_GROUPS.some(group =>
    group.some(slug => `/${slug}` === from) && group.some(slug => `/${slug}` === to),
  )
}
