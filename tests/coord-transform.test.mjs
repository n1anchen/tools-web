import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildBatchCoordinateSets,
  buildCoordinateSet,
  coordinateResultsToCsv,
  parseCoordinateRows,
  validateCoordinate,
} from '../src/utils/coordTransformEngine.ts'

test('单点转换生成五种坐标且保留输入基准值', () => {
  const result = buildCoordinateSet('gcj02', { lng: 116.397428, lat: 39.90923 })
  assert.deepEqual(result.gcj02, { lng: 116.397428, lat: 39.90923 })
  assert.ok(Math.abs(result.wgs84.lng - 116.391) < 0.01)
  assert.ok(Math.abs(result.bd09.lng - 116.404) < 0.02)
  assert.ok(result.mercator.x > 12_000_000)
})

test('批量输入支持标题、名称、逗号与制表符', () => {
  const input = [
    '名称,经度,纬度',
    '天安门,116.397428,39.909230',
    '西湖\t120.155070\t30.274085',
    '# 这一行是注释',
    '121.473701 31.230416',
  ].join('\n')
  const parsed = parseCoordinateRows(input, 'gcj02')
  assert.equal(parsed.errors.length, 0)
  assert.equal(parsed.rows.length, 3)
  assert.equal(parsed.rows[0].label, '天安门')
  assert.equal(parsed.rows[2].label, '点 3')
})

test('批量输入会报告行号、非法数字和越界坐标', () => {
  const parsed = parseCoordinateRows('正常,116,39\n坏数据,abc,30\n越界,181,20', 'wgs84')
  assert.equal(parsed.rows.length, 1)
  assert.deepEqual(parsed.errors.map(error => error.line), [2, 3])
  assert.match(parsed.errors[0].message, /有效数字/)
  assert.match(parsed.errors[1].message, /经度范围/)
  assert.match(validateCoordinate('mercator', { x: 30_000_000, y: 0 }), /Web Mercator/)
})

test('批量结果可导出包含全部坐标系的 CSV', () => {
  const converted = buildBatchCoordinateSets('示例,116.397428,39.909230', 'gcj02')
  const csv = coordinateResultsToCsv(converted.results)
  assert.match(csv, /WGS84 经度/)
  assert.match(csv, /Web Mercator Y/)
  assert.match(csv, /示例/)
  assert.equal(csv.split('\n').length, 2)
})
