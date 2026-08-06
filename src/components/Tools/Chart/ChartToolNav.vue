<script setup lang="ts">
export type ChartToolKey = 'bar' | 'line' | 'pie' | 'scatter' | 'funnel' | 'radar' | 'gauge' | 'heatmap' | 'candlestick' | 'stack' | 'treemap' | 'sankey' | 'boxplot' | 'calendar'

const props = defineProps<{ current: ChartToolKey }>()

// 点击当前工具则不导航（同类切换的动画与滚动由 App 层按家族判断统一处理）
function onNavClick(event: MouseEvent, type: ChartToolKey) {
  if (type === props.current) {
    event.preventDefault()
    return
  }
}

const groups: { title: string; description: string; tools: { type: ChartToolKey; label: string }[] }[] = [
  { title: '常用比较', description: '分类、趋势、占比与转化', tools: [{ type: 'bar', label: '柱状图' }, { type: 'line', label: '折线图' }, { type: 'pie', label: '饼图' }, { type: 'scatter', label: '散点图' }, { type: 'funnel', label: '漏斗图' }] },
  { title: '分析图表', description: '多维、矩阵、行情与构成', tools: [{ type: 'radar', label: '雷达图' }, { type: 'gauge', label: '仪表盘' }, { type: 'heatmap', label: '热力图' }, { type: 'candlestick', label: 'K 线图' }, { type: 'stack', label: '堆叠图' }] },
  { title: '结构统计', description: '层级、流向、分布与日期', tools: [{ type: 'treemap', label: '矩形树图' }, { type: 'sankey', label: '桑基图' }, { type: 'boxplot', label: '箱线图' }, { type: 'calendar', label: '日历图' }] },
]
</script>

<template>
  <nav class="chart-tool-nav" aria-label="全部图表工具快速切换">
    <div class="nav-intro"><span>ALL CHARTS</span><strong>图表工具快速切换</strong><small>按数据问题分组，14 个工具可直接跳转</small></div>
    <div class="nav-groups">
      <section v-for="group in groups" :key="group.title" class="nav-group">
        <header><strong>{{ group.title }}</strong><small>{{ group.description }}</small></header>
        <div><router-link v-for="tool in group.tools" :key="tool.type" :to="`/${tool.type}/`" :class="{ active: current === tool.type }" :aria-current="current === tool.type ? 'page' : undefined" @click="onNavClick($event, tool.type)">{{ tool.label }}</router-link></div>
      </section>
    </div>
  </nav>
</template>

<style scoped>
.chart-tool-nav{display:grid;grid-template-columns:190px minmax(0,1fr);align-items:stretch;gap:12px;padding:12px;border: 1px solid var(--c-border);border-radius:22px;background:#fff;box-shadow:0 14px 38px rgba(15,23,42,.06)}.nav-intro{display:flex;justify-content:center;flex-direction:column;padding:8px 12px;border-radius:14px;background:linear-gradient(135deg,#f8fafc,#eff6ff)}.nav-intro span{color:var(--accent);font-size:10px;font-weight:900;letter-spacing:.15em}.nav-intro strong{margin-top:4px;color: var(--c-text-primary);font-size:14px}.nav-intro small{margin-top:4px;color: var(--c-text-secondary);font-size:11px;line-height:1.45}.nav-groups{display:grid;grid-template-columns:1.08fr 1.08fr .92fr;gap:8px}.nav-group{min-width:0;padding:8px 9px;border:1px solid #e8edf4;border-radius:13px;background:#fbfdff}.nav-group header{display:flex;align-items:baseline;gap:7px;padding:0 3px 6px}.nav-group header strong{flex:none;color:#334155;font-size:12px}.nav-group header small{min-width:0;overflow:hidden;color: var(--c-text-muted);font-size:10px;text-overflow:ellipsis;white-space:nowrap}.nav-group>div{display:flex;flex-wrap:wrap;gap:4px}.nav-group a{flex:none;padding:6px 8px;border:1px solid transparent;border-radius:8px;color: var(--c-text-body);font-size:11px;font-weight:800;text-decoration:none;transition:.16s}.nav-group a:hover{background:#f1f5f9;color:var(--accent)}.nav-group a.active{border-color:color-mix(in srgb,var(--accent),#fff 58%);background:var(--accent-soft);color:var(--accent);box-shadow:0 1px 5px color-mix(in srgb,var(--accent),transparent 86%)}
:global(html.dark .chart-tool-nav){border-color:#334155;background:#1e293b;box-shadow:none}:global(html.dark .nav-intro){background:linear-gradient(135deg,#0f172a,#172554)}:global(html.dark .nav-intro strong){color:#f8fafc}:global(html.dark .nav-group){border-color:#334155;background:#172033}:global(html.dark .nav-group header strong){color:#cbd5e1}:global(html.dark .nav-group a){color:#cbd5e1}:global(html.dark .nav-group a:hover){background:#334155}:global(html.dark .nav-group a.active){border-color:var(--accent);background:color-mix(in srgb,var(--accent),#0f172a 74%);color:#fff}
@media(max-width:1180px){.chart-tool-nav{grid-template-columns:1fr}.nav-intro{display:grid;grid-template-columns:auto 1fr;align-items:center;column-gap:10px}.nav-intro span{grid-row:1/3}.nav-intro strong{margin:0}.nav-intro small{margin:0}.nav-groups{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:760px){.chart-tool-nav{display:block;padding:10px;border-radius:16px}.nav-intro{display:block;margin-bottom:9px;padding:8px 10px}.nav-intro small{display:block;margin-top:3px}.nav-groups{display:grid;grid-template-columns:1fr;gap:7px}.nav-group{padding:9px}.nav-group header{padding-bottom:5px}.nav-group a{padding:7px 9px;font-size:12px}}
</style>
