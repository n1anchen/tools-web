import test from 'node:test'
import assert from 'node:assert/strict'
import {
  base64ToBytes,
  decodeUtf8Base64,
  detectMimeFromBytes,
  encodeUtf8Base64,
  estimateBase64DecodedBytes,
  parseBase64Input,
  sanitizeBase64Filename,
} from '../src/utils/base64Tools.ts'

test('Base64 文本编解码完整支持中文和 Emoji', () => {
  const source = '你好，Base64 👋\nsecond line'
  const encoded = encodeUtf8Base64(source)
  assert.equal(decodeUtf8Base64(encoded), source)
  assert.equal(estimateBase64DecodedBytes(encoded), new TextEncoder().encode(source).length)
})

test('Base64 URL 和 Data URL 会被规范化并保留 MIME', () => {
  assert.equal(decodeUtf8Base64('SGVsbG8tXw'), 'Hello-_')
  const parsed = parseBase64Input('data:text/plain;charset=utf-8;base64,SGVsbG8=')
  assert.equal(parsed.mime, 'text/plain')
  assert.equal(new TextDecoder().decode(base64ToBytes('data:text/plain;base64,SGVsbG8=').bytes), 'Hello')
})

test('无效 Base64、文件名和常用魔数得到安全结果', () => {
  assert.throws(() => base64ToBytes('%%%'), /无效/)
  assert.equal(sanitizeBase64Filename('../bad:name?.png'), 'bad-name-.png')
  assert.equal(detectMimeFromBytes(Uint8Array.from([0x89, 0x50, 0x4e, 0x47])), 'image/png')
  assert.equal(detectMimeFromBytes(Uint8Array.from([0x25, 0x50, 0x44, 0x46])), 'application/pdf')
})
