import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CHART_PALETTES,
  CHART_SAMPLES,
  buildChartOption,
  getChartStats,
  parseChartData,
  serializeChartData,
} from '../src/utils/chartStudio.ts'

const settings = {
  title: '示例图表',
  subtitle: '自动测试',
  titlePosition: 'center',
  variant: 'vertical',
  palette: [...CHART_PALETTES[0].colors],
  showLegend: true,
  showLabels: true,
  smooth: true,
  axisNameX: '分类',
  axisNameY: '数值',
  pointSize: 14,
  funnelSort: 'descending',
}

test('表格模式支持 CSV 引号、表头与逐行校验', () => {
  const result = parseChartData('名称,数值\n"自然,搜索",42\n直接访问,26\n无效项,abc', 'bar', 'table')
  assert.deepEqual(result.rows, [
    { name: '自然,搜索', value: 42 },
    { name: '直接访问', value: 26 },
  ])
  assert.match(result.errors[0], /第 4 行/)
})

test('散点图支持表格和 JSON 两种二维数据结构', () => {
  const table = parseChartData('X\tY\t名称（可选）\n158\t48\t样本 A\n168\t59\t样本 B', 'scatter', 'table')
  assert.equal(table.rows[1].x, 168)
  assert.equal(table.rows[1].name, '样本 B')

  const json = parseChartData('[{"x":12,"y":24,"name":"项目 A"}, [18, 31, "项目 B"]]', 'scatter', 'json')
  assert.equal(json.errors.length, 0)
  assert.deepEqual(json.rows.map(row => [row.x, row.y]), [[12, 24], [18, 31]])
})

test('占比图与漏斗图会拒绝负数，但折线图仍支持负值', () => {
  assert.match(parseChartData('名称,数值\n退款,-2', 'pie', 'table').errors[0], /不能为负数/)
  assert.equal(parseChartData('[{"name":"一月","value":-2}]', 'funnel', 'json').rows.length, 0)
  assert.equal(parseChartData('名称,数值\n一月,-2', 'line', 'table').rows[0].value, -2)
})

test('示例数据可往返序列化并生成五类有效配置', () => {
  for (const kind of ['bar', 'line', 'pie', 'scatter', 'funnel']) {
    const rows = CHART_SAMPLES[kind][0].rows
    const serialized = serializeChartData(rows, kind, 'json')
    assert.equal(parseChartData(serialized, kind, 'json').rows.length, rows.length)
    const option = buildChartOption(kind, rows, {
      ...settings,
      variant: kind === 'pie' ? 'doughnut' : kind === 'funnel' ? 'outside' : kind === 'scatter' ? 'bubble' : 'vertical',
    }, true)
    assert.ok(Array.isArray(option.series))
    assert.equal(option.series[0].type, kind)
  }
  assert.deepEqual(getChartStats([{ name: 'A', value: 10 }, { name: 'B', value: 20 }], 'bar'), {
    count: 2,
    sum: 30,
    average: 15,
    min: 10,
    max: 20,
    range: 10,
    primaryLabel: '数据项',
  })
})
