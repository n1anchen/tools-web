import test from 'node:test'
import assert from 'node:assert/strict'
import {
  estimatePasswordEntropy,
  formatUuid,
  generatePassword,
  generateRandomIntegers,
  parseDecisionOptions,
  pickDecision,
} from '../src/utils/generators.ts'

test('密码生成会覆盖每个已选字符组', () => {
  const chooseFirst = min => min
  const password = generatePassword(['0123456789', 'abc', 'XYZ', '!@'], 12, chooseFirst)
  assert.equal(password.length, 12)
  assert.match(password, /\d/)
  assert.match(password, /[a-z]/)
  assert.match(password, /[A-Z]/)
  assert.match(password, /[!@]/)
  assert.ok(estimatePasswordEntropy(72, 16) > 90)
})

test('批量随机数支持负数和不重复结果', () => {
  const chooseEnd = (_min, max) => max
  const values = generateRandomIntegers(-2, 2, 5, true, chooseEnd)
  assert.deepEqual([...values].sort((a, b) => a - b), [-2, -1, 0, 1, 2])
  assert.throws(() => generateRandomIntegers(1, 2, 3, true, chooseEnd))
})

test('决定选项支持逗号、换行和权重语法', () => {
  const options = parseDecisionOptions('火锅 | 3\n烧烤 | 1，散步')
  assert.deepEqual(options, [
    { label: '火锅', weight: 3 },
    { label: '烧烤', weight: 1 },
    { label: '散步', weight: 1 },
  ])
  assert.equal(pickDecision(options, '', () => 1).label, '火锅')
  assert.equal(pickDecision(options, '火锅', () => 1).label, '烧烤')
})

test('UUID 格式化支持大小写、连字符和大括号', () => {
  const uuid = '550e8400-e29b-41d4-a716-446655440000'
  assert.equal(
    formatUuid(uuid, { uppercase: true, hyphens: false, braces: true }),
    '{550E8400E29B41D4A716446655440000}',
  )
})
