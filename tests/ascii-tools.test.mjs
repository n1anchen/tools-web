import test from 'node:test'
import assert from 'node:assert/strict'
import { createAsciiEntries, filterAsciiEntries, findAsciiEntry } from '../src/utils/asciiTools.ts'

const entries = createAsciiEntries()

test('ASCII 数据覆盖 0–255 并保持多进制值一致', () => {
  assert.equal(entries.length, 256)
  const letterA = entries[65]
  assert.deepEqual([letterA.symbol, letterA.oct, letterA.hex, letterA.binary], ['A', '101', '41', '01000001'])
  assert.equal(entries[10].name, 'LF')
  assert.equal(entries[128].symbol, '€')
})

test('ASCII 搜索支持分类、名称、十六进制与直接查询', () => {
  assert.equal(filterAsciiEntries(entries, '', 'control').length, 33)
  assert.equal(filterAsciiEntries(entries, '换行', 'all')[0].name, 'LF')
  assert.equal(findAsciiEntry(entries, '0x41')?.symbol, 'A')
  assert.equal(findAsciiEntry(entries, 'U+0042')?.symbol, 'B')
  assert.equal(findAsciiEntry(entries, '中'), undefined)
})
