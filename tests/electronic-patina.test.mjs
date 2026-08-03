import test from 'node:test'
import assert from 'node:assert/strict'
import { applyPatinaPixels, buildPatinaFilename, calculatePatinaScore, getPatinaProfile } from '../src/utils/electronicPatina.ts'

test('包浆强度会随压缩次数增加和质量降低而上升', () => {
  assert.ok(calculatePatinaScore(40, 20) > calculatePatinaScore(10, 80))
  assert.equal(getPatinaProfile(100, 1).label, '极限包浆')
})

test('包浆像素转换保留透明度并产生色度偏移', () => {
  const pixels = new Uint8ClampedArray([200, 120, 60, 128])
  const result = applyPatinaPixels(pixels)
  assert.equal(result[3], 128)
  assert.notDeepEqual([...result.slice(0, 3)], [200, 120, 60])
})

test('包浆文件名包含关键参数并清理非法字符', () => {
  assert.equal(buildPatinaFilename('表情/原图.png', 24, 45), '表情-原图-patina-24x-q45.jpg')
})
