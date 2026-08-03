import test from 'node:test'
import assert from 'node:assert/strict'
import { contrastRatio, createColorScale, getContrastChecks, hexToRgb, pickReadableText } from '../src/utils/colorStudio.ts'

test('颜色对比度遵循 WCAG 相对亮度公式', () => {
  assert.deepEqual(hexToRgb('#fff'), { r: 255, g: 255, b: 255 })
  assert.equal(contrastRatio('#000000', '#FFFFFF'), 21)
  assert.equal(getContrastChecks(4.5).normalAA, true)
  assert.equal(getContrastChecks(2.9).largeAA, false)
})

test('文字颜色与色阶根据背景生成可读结果', () => {
  assert.equal(pickReadableText('#111827'), '#FFFFFF')
  assert.equal(pickReadableText('#F8FAFC'), '#111827')
  const scale = createColorScale('#409EFF')
  assert.equal(scale.length, 10)
  assert.equal(scale[5].color, '#409EFF')
})
