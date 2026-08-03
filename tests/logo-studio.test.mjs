import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildLogoFilename,
  calculateSplitLogoLayout,
  getScaledDimensions,
} from '../src/utils/logoStudio.ts'

test('双栏徽标自适应布局会居中内容并保留文字间距', () => {
  const layout = calculateSplitLogoLayout({
    leftWidth: 200,
    rightWidth: 100,
    fontSize: 120,
    paddingX: 20,
    paddingY: 20,
    gap: 10,
    margin: 40,
    shape: 'auto',
  })
  assert.equal(layout.canvasWidth, 430)
  assert.equal(layout.canvasHeight, 240)
  assert.equal(layout.contentWidth, 350)
  assert.equal(layout.startX, 40)
  assert.equal(layout.boxX, 250)
})

test('正方形与圆形画布会扩展尺寸且保持内容居中', () => {
  const input = { leftWidth: 80, rightWidth: 60, fontSize: 80, paddingX: 12, paddingY: 10, gap: 8, margin: 20 }
  const square = calculateSplitLogoLayout({ ...input, shape: 'square' })
  const circle = calculateSplitLogoLayout({ ...input, shape: 'circle' })
  assert.equal(square.canvasWidth, square.canvasHeight)
  assert.equal(circle.canvasWidth, circle.canvasHeight)
  assert.ok(circle.canvasWidth > square.canvasWidth)
  assert.equal(square.startX, (square.canvasWidth - square.contentWidth) / 2)
})

test('导出尺寸与文件名会规范倍率和非法字符', () => {
  assert.deepEqual(getScaledDimensions(900, 250, 3), { width: 2700, height: 750, scale: 3 })
  assert.deepEqual(getScaledDimensions(100, 50, 9), { width: 400, height: 200, scale: 4 })
  assert.equal(buildLogoFilename([' Tools / ', 'Web:*'], 'split logo'), 'Tools-Web-split-logo.png')
  assert.equal(buildLogoFilename(['  '], ''), 'untitled-logo.png')
})
