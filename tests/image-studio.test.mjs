import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildSliceRects,
  buildStitchPlan,
  exceedsPixelBudget,
  getRotatedBounds,
  getWatermarkPlacements,
} from '../src/utils/imageStudio.ts'

test('图片分割覆盖全部像素且不会因除不尽丢失边缘', () => {
  const rects = buildSliceRects(1001, 667, 3, 4)
  assert.equal(rects.length, 12)
  assert.equal(rects.reduce((sum, rect) => sum + rect.width * rect.height, 0), 1001 * 667)
  assert.equal(Math.max(...rects.map(rect => rect.x + rect.width)), 1001)
  assert.equal(Math.max(...rects.map(rect => rect.y + rect.height)), 667)
  assert.ok(rects.every(rect => rect.width > 0 && rect.height > 0))
})

test('纵向与横向拼接按最小边对齐并计入间距', () => {
  const images = [{ width: 1200, height: 800 }, { width: 600, height: 900 }]
  const vertical = buildStitchPlan(images, 'vertical', 20)
  assert.deepEqual({ width: vertical.width, height: vertical.height }, { width: 600, height: 1320 })
  assert.deepEqual(vertical.draws.map(draw => [draw.dw, draw.dh]), [[600, 400], [600, 900]])

  const horizontal = buildStitchPlan(images, 'horizontal', 12)
  assert.deepEqual({ width: horizontal.width, height: horizontal.height }, { width: 1745, height: 800 })
  assert.deepEqual(horizontal.draws.map(draw => [draw.dw, draw.dh]), [[1200, 800], [533, 800]])
})

test('台词拼接只保留首尾画面与中间台词条', () => {
  const plan = buildStitchPlan([
    { width: 1000, height: 1000 },
    { width: 1000, height: 1000 },
    { width: 1000, height: 1000 },
  ], 'caption', 0, [70, 90])
  assert.deepEqual(plan.draws.map(draw => [draw.sy, draw.sh]), [[0, 900], [700, 200], [700, 300]])
  assert.equal(plan.height, 1400)
})

test('水印定位考虑旋转后边界，平铺点均位于画布内', () => {
  const bounds = getRotatedBounds(240, 48, -30)
  assert.ok(bounds.width > 200)
  assert.ok(bounds.height > 48)

  const corner = getWatermarkPlacements(1200, 800, bounds.width, bounds.height, 'bottomRight', 32)
  assert.equal(corner.length, 1)
  assert.ok(corner[0].x < 1200 && corner[0].y < 800)

  const tiles = getWatermarkPlacements(1200, 800, bounds.width, bounds.height, 'tile', 32, 80)
  assert.ok(tiles.length > 3)
  assert.ok(tiles.every(point => (
    point.x >= bounds.width / 2 && point.x <= 1200 - bounds.width / 2
    && point.y >= bounds.height / 2 && point.y <= 800 - bounds.height / 2
  )))
  assert.equal(exceedsPixelBudget(10_000, 10_000), true)
})
