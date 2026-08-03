import test from 'node:test'
import assert from 'node:assert/strict'
import {
  estimateBarrageDuration,
  getAsciiMetrics,
  getContrastSummary,
  normalizeBarrageMessages,
} from '../src/utils/displayStudio.ts'

test('ASCII 输出度量会忽略末尾换行并保留真实宽度', () => {
  assert.deepEqual(getAsciiMetrics('ABC\n12\n'), {
    rows: 2,
    columns: 3,
    characters: 5,
    bytes: 7,
  })
  assert.deepEqual(getAsciiMetrics(''), { rows: 0, columns: 0, characters: 0, bytes: 0 })
})

test('弹幕消息会清理空行并限制条数和单条长度', () => {
  assert.deepEqual(normalizeBarrageMessages('  第一条  \n\n第二条很长\n第三条', 2, 4), ['第一条', '第二条很'])
})

test('弹幕时长随内容和字号增加，并保持安全上下限', () => {
  const shortDuration = estimateBarrageDuration(['Hi'], 40, 120, 800)
  const longDuration = estimateBarrageDuration(['欢迎来到在线工具箱'], 100, 120, 800)
  assert.ok(longDuration > shortDuration)
  assert.equal(estimateBarrageDuration([], 12, 10000, 240), 3)
  assert.equal(estimateBarrageDuration(['很长'.repeat(200)], 400, 1, 1920), 120)
})

test('颜色对比度能够区分清晰与低对比组合', () => {
  assert.deepEqual(getContrastSummary('#ffffff', '#000000'), {
    ratio: 21,
    level: 'excellent',
    label: '高对比，远距离清晰',
  })
  assert.equal(getContrastSummary('#777777', '#888888').level, 'low')
  assert.equal(getContrastSummary('invalid', '#ffffff').ratio, 1)
})
