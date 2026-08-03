import test from 'node:test'
import assert from 'node:assert/strict'
import {
  convertAllUnits,
  convertUnitValue,
  formatUnitValue,
  isBelowAbsoluteZero,
  normalizeUnitCategory,
} from '../src/utils/unitConverter.ts'

const closeTo = (actual, expected, tolerance = 1e-9) => {
  assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${actual} ≉ ${expected}`)
}

test('长度、市制与面积使用精确定义且支持往返', () => {
  closeTo(convertUnitValue('length', 1, 'mi', 'm'), 1609.344)
  closeTo(convertUnitValue('length', 1, 'chi', 'm'), 1 / 3)
  closeTo(convertUnitValue('length', 500, 'm', 'li'), 1)
  closeTo(convertUnitValue('area', 1, 'acre', 'm2'), 4046.8564224)
  closeTo(convertUnitValue('area', 1, 'mu', 'm2'), 2000 / 3)
})

test('温度公式正确处理偏移量、兰氏度和绝对零度', () => {
  closeTo(convertUnitValue('temperature', 32, 'f', 'c'), 0)
  closeTo(convertUnitValue('temperature', 273.15, 'k', 'c'), 0)
  closeTo(convertUnitValue('temperature', 491.67, 'r', 'c'), 0)
  closeTo(convertUnitValue('temperature', 100, 'c', 'f'), 212)
  assert.equal(isBelowAbsoluteZero('temperature', -274, 'c'), true)
  assert.equal(isBelowAbsoluteZero('temperature', 0, 'k'), false)
})

test('时间、压力、能量和功率覆盖常用工程换算', () => {
  closeTo(convertUnitValue('time', 1, 'day', 's'), 86400)
  closeTo(convertUnitValue('time', 1, 'year', 'day'), 365.2425)
  closeTo(convertUnitValue('pressure', 1, 'atm', 'pa'), 101325)
  closeTo(convertUnitValue('energy', 1, 'kwh', 'mj'), 3.6)
  closeTo(convertUnitValue('power', 1, 'hp', 'w'), 745.6998715822702)
})

test('全量结果、旧查询别名和极端数字格式化保持稳定', () => {
  const results = convertAllUnits('mass', 1, 'kg')
  assert.ok(results.length >= 15)
  closeTo(results.find(item => item.key === 'lb').value, 2.2046226218487757)
  assert.equal(normalizeUnitCategory('weight'), 'mass')
  assert.equal(normalizeUnitCategory('heat'), 'energy')
  assert.equal(normalizeUnitCategory('unknown'), 'length')
  assert.match(formatUnitValue(1.602176634e-19), /e-19/)
  assert.equal(formatUnitValue(-0), '0')
})
