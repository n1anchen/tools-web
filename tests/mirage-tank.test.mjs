import test from 'node:test'
import assert from 'node:assert/strict'

class ImageDataPolyfill {
  constructor(data, width, height) {
    this.data = data
    this.width = width
    this.height = height
  }
}

globalThis.ImageData = ImageDataPolyfill

const { prismDecode, prismEncode } = await import('../src/components/Tools/MirageTank/mirage.ts')

function imageData(values, width, height) {
  return new ImageData(new Uint8ClampedArray(values), width, height)
}

test('光棱坦克编码会按设定纹理交错使用表面图与隐藏图', () => {
  const hidden = imageData([
    255, 128, 0, 255,
    255, 128, 0, 255,
    255, 128, 0, 255,
    255, 128, 0, 255,
  ], 2, 2)
  const cover = imageData([
    0, 128, 255, 255,
    0, 128, 255, 255,
    0, 128, 255, 255,
    0, 128, 255, 255,
  ], 2, 2)

  const result = prismEncode(hidden, cover, 32, 64, 0, 1, true, false)

  assert.equal(result.width, 2)
  assert.equal(result.height, 2)
  assert.deepEqual([...result.data.slice(0, 4)], [64, 159, 255, 255])
  assert.deepEqual([...result.data.slice(8, 12)], [32, 16, 0, 255])
})

test('反相编码会交换明暗映射而不改变输出尺寸', () => {
  const source = imageData([255, 0, 128, 200], 1, 1)
  const result = prismEncode(source, source, 32, 64, 0, 0, true, true)

  assert.deepEqual([...result.data], [255, 223, 239, 200])
  assert.equal(result.width, 1)
  assert.equal(result.height, 1)
})

test('显形模式会保留阈值范围内的像素并按策略处理表面像素', () => {
  const source = imageData([
    10, 10, 10, 180,
    200, 200, 200, 220,
  ], 2, 1)

  const black = prismDecode(source, 0, 20, 'black')
  assert.deepEqual([...black.data.slice(0, 4)], [128, 128, 128, 180])
  assert.deepEqual([...black.data.slice(4, 8)], [0, 0, 0, 255])

  const transparent = prismDecode(source, 0, 20, 'transparent')
  assert.deepEqual([...transparent.data.slice(4, 8)], [0, 0, 0, 0])
})

test('无效显形阈值返回透明黑色并保留原始透明度', () => {
  const source = imageData([80, 90, 100, 123], 1, 1)
  const result = prismDecode(source, 40, 40, 'white')
  assert.deepEqual([...result.data], [0, 0, 0, 123])
})
