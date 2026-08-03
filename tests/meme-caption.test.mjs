import test from 'node:test'
import assert from 'node:assert/strict'
import { buildMemeFilename, calculateCaptionLayout, getMemeOutputDimensions, wrapCaptionText } from '../src/utils/memeCaption.ts'

test('字幕自动换行会遵守宽度、手动换行和最大行数', () => {
  const lines = wrapCaptionText('一二三四五\nabcdef', 4, (value) => [...value].length, 3)
  assert.deepEqual(lines, ['一二三四', '五', 'abcd'])
})

test('字幕条在顶部和底部均保持在画布范围内', () => {
  const bottom = calculateCaptionLayout({ canvasHeight: 400, fontSize: 40, lineCount: 2, padding: 10, offset: 30, placement: 'bottom' })
  assert.equal(bottom.barHeight, 124)
  assert.equal(bottom.barY, 246)
  assert.equal(bottom.maxOffset, 276)
  const top = calculateCaptionLayout({ canvasHeight: 400, fontSize: 40, lineCount: 2, padding: 10, offset: 999, placement: 'top' })
  assert.equal(top.barY, 276)
})

test('梗图输出尺寸和文件名会规范输入', () => {
  assert.deepEqual(getMemeOutputDimensions(1001, 601, 3), { width: 334, height: 200 })
  assert.equal(buildMemeFilename('聊天/截图.png', 'jpeg'), '聊天-截图-caption.jpg')
})
