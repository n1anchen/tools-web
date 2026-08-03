import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildIcoBytes,
  getIcoCompatibleSizes,
  getSourceQuality,
  normalizeIconSizes,
  sanitizeIconName,
} from '../src/utils/icoEngine.ts'

test('图标尺寸会去重、排序并过滤无效范围', () => {
  assert.deepEqual(normalizeIconSizes([256, 16, 16, 7, 32.4, 4096]), [16, 32, 256])
  assert.deepEqual(getIcoCompatibleSizes([512, 48, 256, 16]), [16, 48, 256])
})

test('ICO 二进制目录会写入多尺寸 PNG 图层与正确偏移', () => {
  const small = new Uint8Array([1, 2, 3])
  const large = new Uint8Array([4, 5, 6, 7])
  const bytes = buildIcoBytes([
    { size: 256, bytes: large },
    { size: 16, bytes: small },
    { size: 16, bytes: new Uint8Array([9]) },
  ])
  const view = new DataView(bytes.buffer)

  assert.equal(view.getUint16(2, true), 1)
  assert.equal(view.getUint16(4, true), 2)
  assert.equal(view.getUint8(6), 16)
  assert.equal(view.getUint8(22), 0)
  assert.equal(view.getUint32(18, true), 38)
  assert.equal(view.getUint32(34, true), 41)
  assert.deepEqual([...bytes.slice(38)], [1, 2, 3, 4, 5, 6, 7])
})

test('文件名与源图清晰度诊断提供安全结果', () => {
  assert.equal(sanitizeIconName('  My App?.png  '), 'My-App')
  assert.equal(sanitizeIconName('...'), 'icon')
  assert.equal(getSourceQuality(1024, 1024, [16, 256]).level, 'excellent')
  assert.equal(getSourceQuality(128, 128, [256]).level, 'warning')
})
