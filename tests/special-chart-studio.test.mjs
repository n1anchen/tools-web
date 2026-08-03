import test from 'node:test'
import assert from 'node:assert/strict'
import {
  SPECIAL_SAMPLES,
  buildSpecialChartOption,
  getSpecialStats,
  makeBoxGroup,
  parseSpecialChartData,
  serializeSpecialChartData,
} from '../src/utils/specialChartStudio.ts'

const settings = {
  title: '测试图表', subtitle: '本地测试', titlePosition: 'center', variant: 'ordered',
  palette: ['#2563EB', '#14B8A6'], showLabels: true,
  treemapDepth: 3, showBreadcrumb: true,
  sankeyAlign: 'justify', sankeyCurve: .5,
  boxColor: '#2563EB', showOutliers: true,
  calendarYear: 2026, calendarMinColor: '#DBEAFE', calendarMaxColor: '#1D4ED8', showVisualMap: true,
}

test('四类专用图表示例均可在表格和 JSON 间往返', () => {
  for (const kind of ['treemap', 'sankey', 'boxplot', 'calendar']) {
    const data = SPECIAL_SAMPLES[kind][0].data
    for (const mode of ['table', 'json']) {
      const parsed = parseSpecialChartData(serializeSpecialChartData(data, mode), kind, mode)
      assert.equal(parsed.errors.length, 0, `${kind} ${mode}`)
      assert.ok(getSpecialStats(parsed.data, 2026).count > 0)
    }
  }
})

test('矩形树图把斜线路径还原为父子层级并阻止路径冲突', () => {
  const result = parseSpecialChartData('层级路径,数值\n产品/专业版,120\n产品/团队版,80\n服务/培训,30', 'treemap', 'table')
  assert.equal(result.errors.length, 0)
  assert.equal(result.data.nodes[0].name, '产品')
  assert.deepEqual(result.data.nodes[0].children.map(item => item.name), ['专业版', '团队版'])
  assert.equal(getSpecialStats(result.data).total, 230)

  const invalid = parseSpecialChartData('层级路径,数值\n产品,100\n产品/专业版,80', 'treemap', 'table')
  assert.match(invalid.errors[0], /已经作为叶节点使用/)
})

test('桑基图跳过重复、自环和形成有向环的连线', () => {
  const result = parseSpecialChartData('来源,目标,流量\nA,B,10\nB,C,8\nC,A,3\nA,B,4\nD,D,2', 'sankey', 'table')
  assert.equal(result.data.links.length, 2)
  assert.ok(result.errors.some(error => /形成环路/.test(error)))
  assert.ok(result.errors.some(error => /重复/.test(error)))
  assert.ok(result.errors.some(error => /不能相同/.test(error)))
})

test('箱线图可由原始样本计算五数概括和 Tukey 异常值', () => {
  const group = makeBoxGroup('接口', [1, 2, 3, 4, 5, 6, 7, 30])
  assert.deepEqual(group.outliers, [30])
  assert.deepEqual(group.values, [1, 2.75, 4.5, 6.25, 7])

  const result = parseSpecialChartData('分组,样本值\nA,1\nA,2\nA,3\nA,4\nB,5\nB,6\nB,7', 'boxplot', 'table')
  assert.equal(result.data.groups.length, 1)
  assert.match(result.errors[0], /至少需要 4 个样本值/)

  const invalid = parseSpecialChartData('分组,最小值,Q1,中位数,Q3,最大值\nA,1,5,4,7,9', 'boxplot', 'table')
  assert.equal(invalid.data.groups.length, 0)
  assert.match(invalid.errors[0], /依次递增/)
})

test('日历图拒绝不存在的日期和重复日期，并统计年度缺失天数', () => {
  const result = parseSpecialChartData('日期,数值\n2026-02-28,12\n2026-02-29,13\n2026-02-28,18\n2025-12-31,8', 'calendar', 'table')
  assert.equal(result.data.items.length, 2)
  assert.ok(result.errors.some(error => /有效的 YYYY-MM-DD/.test(error)))
  assert.ok(result.errors.some(error => /重复/.test(error)))
  assert.equal(getSpecialStats(result.data, 2026).detail, '364 天缺失')
  assert.deepEqual(result.data.years, [2025, 2026])
})

test('四类配置输出对应 ECharts 系列与专属结构', () => {
  for (const kind of ['treemap', 'sankey', 'boxplot', 'calendar']) {
    const data = SPECIAL_SAMPLES[kind][0].data
    const option = buildSpecialChartOption(kind, data, { ...settings, calendarYear: data.kind === 'calendar' ? data.years[0] : 2026 }, true)
    assert.equal(option.series[0].type, kind === 'calendar' ? 'heatmap' : kind)
    if (kind === 'calendar') assert.equal(option.calendar[0].range, '2026')
    if (kind === 'sankey') assert.ok(option.series[0].links.length > 0)
  }
})
