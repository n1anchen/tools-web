import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildMd5Variants,
  countSqlStatements,
  formatFileSize,
  formatMediaTime,
  minifySqlSafely,
  normalizeMd5,
  summarizeReactionTimes,
  validateHlsUrl,
} from '../src/utils/workbenchTools.ts'

test('MD5 变体与校验结果保持标准长度', () => {
  const hash = '900150983cd24fb0d6963f7d28e17f72'
  assert.deepEqual(buildMd5Variants(hash), {
    lower32: hash,
    upper32: hash.toUpperCase(),
    lower16: '3cd24fb0d6963f7d',
    upper16: '3CD24FB0D6963F7D',
  })
  assert.equal(normalizeMd5(` ${hash.toUpperCase()} `), hash)
  assert.equal(normalizeMd5('not-a-hash'), '')
  assert.equal(formatFileSize(1_572_864), '1.5 MB')
})

test('反应测试汇总会计算中位数、区间与稳定性', () => {
  const summary = summarizeReactionTimes([210, 180, 240, 190])
  assert.equal(summary.best, 180)
  assert.equal(summary.worst, 240)
  assert.equal(summary.average, 205)
  assert.equal(summary.median, 200)
  assert.equal(summary.spread, 60)
  assert.ok(summary.consistency > 70)
})

test('HLS 地址只接受无凭据的 HTTP(S) URL', () => {
  assert.equal(validateHlsUrl('https://cdn.example.com/live/master.m3u8').valid, true)
  assert.match(validateHlsUrl('file:///tmp/live.m3u8').error, /HTTP/)
  assert.match(validateHlsUrl('https://user:pass@example.com/live.m3u8').error, /账号|密码/)
  assert.equal(formatMediaTime(3661), '1:01:01')
})

test('SQL 安全压缩不会破坏字符串、标识符和注释边界', () => {
  const sql = `SELECT  'hello   world', "My  Column"\nFROM users -- keep   comment\nWHERE note = 'a -- b' AND payload = $$line  one$$;\nSELECT 2;`
  const result = minifySqlSafely(sql)
  assert.match(result, /'hello   world'/)
  assert.match(result, /"My  Column"/)
  assert.match(result, /-- keep   comment\nWHERE/)
  assert.match(result, /\$\$line  one\$\$/)
  assert.equal(countSqlStatements(sql), 2)
})
