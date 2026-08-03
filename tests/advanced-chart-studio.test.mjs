import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ADVANCED_SAMPLES,
  buildAdvancedChartOption,
  getAdvancedStats,
  parseAdvancedChartData,
  serializeAdvancedChartData,
} from '../src/utils/advancedChartStudio.ts'

const settings = {
  title: '测试图表', subtitle: '本地测试', titlePosition: 'center', variant: 'polygon',
  palette: ['#2563EB', '#14B8A6'], showLegend: true, showLabels: false, unit: '%',
  radarMaxMode: 'auto', radarMax: 100, fillOpacity: 0.25,
  gaugeMin: 0, gaugeMax: 100, gaugeSplit: 10,
  heatMinColor: '#DBEAFE', heatMaxColor: '#1D4ED8',
  upColor: '#EF4444', downColor: '#10B981', showZoom: true, showTotal: false,
}

test('五类高级图表示例均可在表格和 JSON 间往返', () => {
  for (const kind of ['radar', 'gauge', 'heatmap', 'candlestick', 'stack']) {
    const data = ADVANCED_SAMPLES[kind][0].data
    for (const mode of ['table', 'json']) {
      const parsed = parseAdvancedChartData(serializeAdvancedChartData(data, mode), kind, mode)
      assert.equal(parsed.errors.length, 0, `${kind} ${mode}`)
      assert.ok(getAdvancedStats(parsed.data).count > 0)
    }
  }
})

test('K 线校验最低价与最高价必须包住开收盘', () => {
  const result = parseAdvancedChartData('日期,开盘,收盘,最低,最高\n08-01,10,12,11,13\n08-02,12,9,8,13', 'candlestick', 'table')
  assert.equal(result.data.items.length, 1)
  assert.match(result.errors[0], /最低价不能高于开收盘/)
})

test('雷达图和堆叠图支持多系列宽表', () => {
  const radar = parseAdvancedChartData('维度,方案 A,方案 B,最大值\n性能,80,72,100\n体验,68,91,100', 'radar', 'table')
  assert.deepEqual(radar.data.series.map(item => item.name), ['方案 A', '方案 B'])
  assert.deepEqual(radar.data.maxima, [100, 100])

  const stack = parseAdvancedChartData('分类,自然,广告\n周一,120,60\n周二,132,72', 'stack', 'table')
  assert.equal(stack.data.categories.length, 2)
  assert.deepEqual(stack.data.series[1].values, [60, 72])
})

test('高级图表配置包含对应 ECharts 系列和专属结构', () => {
  for (const kind of ['radar', 'gauge', 'heatmap', 'candlestick', 'stack']) {
    const data = ADVANCED_SAMPLES[kind][0].data
    const variant = { radar: 'circle', gauge: 'progress', heatmap: 'rounded', candlestick: 'standard', stack: 'bar' }[kind]
    const option = buildAdvancedChartOption(kind, data, { ...settings, variant }, true)
    assert.equal(option.series[0].type, kind === 'stack' ? 'bar' : kind)
  }
})
