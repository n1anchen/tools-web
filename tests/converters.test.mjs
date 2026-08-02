import test from 'node:test'
import assert from 'node:assert/strict'
import {
  analyzeJwtClaims,
  convertRadix,
  formatRadixInteger,
  normalizeTimestamp,
  parseDateTime,
  parseRadixInteger,
} from '../src/utils/converters.ts'
import { toMorse, toText } from '../src/utils/morse.ts'

test('任意精度进制转换不会丢失大整数精度', () => {
  const decimal = '90071992547409931234567890'
  const hexadecimal = convertRadix(decimal, 10, 16)
  assert.equal(convertRadix(hexadecimal, 16, 10), decimal)
  assert.equal(formatRadixInteger(parseRadixInteger('-1_024', 10), 2), '-10000000000')
  assert.equal(convertRadix('0', 10, 64), '0')
  assert.throws(() => parseRadixInteger('102', 2), /字符/)
})

test('时间戳可自动识别秒、毫秒和微秒', () => {
  assert.deepEqual(normalizeTimestamp('1735689600'), {
    milliseconds: 1735689600000,
    unit: 'seconds',
    source: '1735689600',
  })
  assert.equal(normalizeTimestamp('1735689600000').milliseconds, 1735689600000)
  assert.equal(normalizeTimestamp('1735689600000000').milliseconds, 1735689600000)
  assert.equal(parseDateTime('2025-01-01 00:00:00', 'utc'), 1735689600000)
  assert.throws(() => parseDateTime('2025-02-30 00:00:00', 'utc'), /有效范围/)
})

test('JWT 时间声明能区分有效、过期、尚未生效和无过期时间', () => {
  assert.equal(analyzeJwtClaims({ exp: 200 }, 100).state, 'valid')
  assert.equal(analyzeJwtClaims({ exp: 99 }, 100).state, 'expired')
  assert.equal(analyzeJwtClaims({ nbf: 101, exp: 200 }, 100).state, 'not-yet-valid')
  assert.equal(analyzeJwtClaims({ sub: 'user' }, 100).state, 'no-expiry')
})

test('摩斯电码支持中英文、数字、空格和中文符号样式', () => {
  assert.equal(toText(toMorse('SOS 2026')), 'SOS 2026')
  assert.equal(toText(toMorse('中文')), '中文')
  assert.equal(toText('··· ——— ···'), 'SOS')
})
