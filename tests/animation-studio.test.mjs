import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildSpriteRects,
  buildTimelineEnds,
  findFrameAtTime,
  formatDuration,
  framesToMilliseconds,
  getContainDrawPlan,
  getSpriteRemainder,
  millisecondsToFrames,
  naturalCompare,
  sanitizeAnimationName,
} from '../src/utils/animationStudio.ts'

test('精灵图只生成范围内的完整帧并报告剩余像素', () => {
  const crop = { x: 10, y: 20, width: 101, height: 65 }
  const rects = buildSpriteRects(256, 128, crop, 32, 32)
  assert.equal(rects.length, 6)
  assert.deepEqual(rects[0], { index: 0, row: 0, column: 0, x: 10, y: 20, width: 32, height: 32 })
  assert.deepEqual(rects.at(-1), { index: 5, row: 1, column: 2, x: 74, y: 52, width: 32, height: 32 })
  assert.deepEqual(getSpriteRemainder(crop, 32, 32), { right: 5, bottom: 1 })
})

test('精灵图范围会被约束到图片内部', () => {
  const rects = buildSpriteRects(100, 80, { x: 90, y: 70, width: 50, height: 50 }, 20, 20)
  assert.deepEqual(rects, [{ index: 0, row: 0, column: 0, x: 90, y: 70, width: 10, height: 10 }])
})

test('播放时间轴在帧边界切换并正确处理末端', () => {
  const ends = buildTimelineEnds([100, 250, 50])
  assert.deepEqual(ends, [100, 350, 400])
  assert.equal(findFrameAtTime(ends, 0), 0)
  assert.equal(findFrameAtTime(ends, 99.9), 0)
  assert.equal(findFrameAtTime(ends, 100), 1)
  assert.equal(findFrameAtTime(ends, 399.9), 2)
  assert.equal(findFrameAtTime(ends, 400), 2)
})

test('秒与帧延时可以按项目 FPS 换算', () => {
  assert.ok(Math.abs(framesToMilliseconds(1, 24) - 41.6666666667) < 0.001)
  assert.equal(millisecondsToFrames(125, 24), 3)
  assert.equal(millisecondsToFrames(framesToMilliseconds(5, 30), 30), 5)
})

test('不同尺寸素材按 contain 等比居中到统一动画画布', () => {
  assert.deepEqual(getContainDrawPlan(800, 400, 1000, 1000), { dx: 0, dy: 250, dw: 1000, dh: 500 })
  assert.deepEqual(getContainDrawPlan(300, 600, 900, 600), { dx: 300, dy: 0, dw: 300, dh: 600 })
})

test('ZIP 文件名自然排序且导出文件名可安全使用', () => {
  const files = ['frame10.png', 'frame2.png', 'frame1.png'].sort(naturalCompare)
  assert.deepEqual(files, ['frame1.png', 'frame2.png', 'frame10.png'])
  assert.equal(sanitizeAnimationName('角色:行走?.png'), '角色-行走-')
})

test('时长展示允许零值和超过单帧上限的总时长', () => {
  assert.equal(formatDuration(0), '0.00 秒')
  assert.equal(formatDuration(61_000), '61.0 秒')
})
