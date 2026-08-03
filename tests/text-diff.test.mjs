import test from 'node:test'
import assert from 'node:assert/strict'
import { buildDiffRows, createUnifiedDiffText, normalizeComparisonText, summarizeDiffRows } from '../src/utils/textDiff.ts'

test('文本对比规范化支持忽略空白、大小写和空行', () => {
  const source = '  Hello   WORLD  \r\n\r\n Next\tLine '
  assert.equal(normalizeComparisonText(source, { ignoreWhitespace: true, ignoreCase: true, ignoreBlankLines: true }), 'hello world\nnext line')
})

test('差异行会配对修改内容并保留左右行号', () => {
  const rows = buildDiffRows([
    { value: 'same\n' },
    { value: 'old one\nold two\n', removed: true },
    { value: 'new one\n', added: true },
    { value: 'tail\n' },
  ])
  assert.deepEqual(rows.map(row => row.type), ['same', 'changed', 'removed', 'same'])
  assert.deepEqual(rows.map(row => [row.leftLine, row.rightLine]), [[1, 1], [2, 2], [3, undefined], [4, 3]])

  const summary = summarizeDiffRows(rows)
  assert.deepEqual(summary, { additions: 1, removals: 2, unchanged: 2, changedBlocks: 1, oldLines: 4, newLines: 3, similarity: 50 })
})

test('统一差异文本带文件头和增删前缀', () => {
  const rows = buildDiffRows([{ value: 'old\n', removed: true }, { value: 'new\n', added: true }])
  assert.equal(createUnifiedDiffText(rows, 'before.txt', 'after.txt'), '--- before.txt\n+++ after.txt\n-old\n+new')
})
