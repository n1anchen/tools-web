import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeFontSample, buildFontCss, quoteFontFamily } from '../src/utils/fontPreview.ts'

test('字体样本文本会分别统计中英文、数字和真实行数', () => {
  assert.deepEqual(analyzeFontSample('字形 Abc 12\n第二行'), {
    characters: 12,
    lines: 2,
    hanCharacters: 5,
    latinLetters: 3,
    digits: 2,
  })
  assert.equal(analyzeFontSample('').lines, 0)
})

test('字体家族会安全加引号并保留 CSS 通用家族', () => {
  assert.equal(quoteFontFamily('PingFang SC'), '"PingFang SC"')
  assert.equal(quoteFontFamily('sans-serif'), 'sans-serif')
  assert.equal(quoteFontFamily('A"B'), '"A\\"B"')
})

test('CSS 片段会规范字号、字重和颜色', () => {
  const css = buildFontCss({
    family: 'system-ui, sans-serif', size: 31.6, weight: 463, style: 'italic',
    lineHeight: 1.45, letterSpacing: -0.5, color: '#1e293b',
  })
  assert.match(css, /font-size: 32px;/)
  assert.match(css, /font-weight: 500;/)
  assert.match(css, /line-height: 1\.45;/)
  assert.match(css, /color: #1E293B;/)
})
