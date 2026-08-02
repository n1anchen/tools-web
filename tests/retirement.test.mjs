import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateRetirement,
  generateReferenceRows,
  minimumContributionYearsForYear,
} from '../src/components/Tools/RetirementCalculator/retirement.ts'

test('男职工按每4个出生月份延迟1个月计算', () => {
  const first = calculateRetirement('1965-01', 'male', '2026-08')
  assert.equal(first.delayMonths, 1)
  assert.equal(first.statutoryAgeMonths, 60 * 12 + 1)
  assert.equal(first.statutoryRetirementMonth, '2025-02')

  const example = calculateRetirement('1972-09', 'male', '2026-08')
  assert.equal(example.delayMonths, 24)
  assert.equal(example.statutoryAgeMonths, 62 * 12)
  assert.equal(example.statutoryRetirementMonth, '2034-09')
})

test('三类职工达到最终目标年龄后不再增加延迟月数', () => {
  const male = calculateRetirement('1985-01', 'male', '2026-08')
  const female55 = calculateRetirement('1990-01', 'female55', '2026-08')
  const female50 = calculateRetirement('1990-01', 'female50', '2026-08')
  assert.equal(male.statutoryAgeMonths, 63 * 12)
  assert.equal(female55.statutoryAgeMonths, 58 * 12)
  assert.equal(female50.statutoryAgeMonths, 55 * 12)
})

test('原50岁退休女职工按每2个出生月份延迟1个月计算', () => {
  const first = calculateRetirement('1975-01', 'female50', '2026-08')
  const second = calculateRetirement('1975-03', 'female50', '2026-08')
  assert.equal(first.delayMonths, 1)
  assert.equal(first.statutoryRetirementMonth, '2025-02')
  assert.equal(second.delayMonths, 2)
  assert.equal(second.statutoryRetirementMonth, '2025-05')
})

test('弹性退休区间遵守最多3年且不早于原法定年龄', () => {
  const transitional = calculateRetirement('1972-09', 'male', '2026-08')
  assert.equal(transitional.earliestFlexibleAgeMonths, 60 * 12)
  assert.equal(transitional.latestFlexibleAgeMonths, 65 * 12)

  const female50 = calculateRetirement('1990-01', 'female50', '2026-08')
  assert.equal(female50.earliestFlexibleAgeMonths, 52 * 12)
  assert.equal(female50.latestFlexibleAgeMonths, 58 * 12)
})

test('2025年前已达到原法定年龄的人员不适用新办法', () => {
  const result = calculateRetirement('1964-12', 'male', '2026-08')
  assert.equal(result.policyApplies, false)
  assert.equal(result.delayMonths, 0)
  assert.equal(result.earliestFlexibleAgeMonths, result.statutoryAgeMonths)
  assert.equal(result.latestFlexibleAgeMonths, result.statutoryAgeMonths)
})

test('最低缴费年限从2030年起每年增加6个月并封顶20年', () => {
  assert.equal(minimumContributionYearsForYear(2029), 15)
  assert.equal(minimumContributionYearsForYear(2030), 15.5)
  assert.equal(minimumContributionYearsForYear(2039), 20)
  assert.equal(minimumContributionYearsForYear(2045), 20)
})

test('参考表覆盖全部延迟档位并正确生成最终开放区间', () => {
  const maleRows = generateReferenceRows('male')
  const female50Rows = generateReferenceRows('female50')
  assert.equal(maleRows.length, 36)
  assert.equal(maleRows.at(-1).birthStart, '1976-09')
  assert.equal(maleRows.at(-1).birthEnd, null)
  assert.equal(female50Rows.length, 60)
  assert.equal(female50Rows.at(-1).birthStart, '1984-11')
  assert.equal(female50Rows.at(-1).retirementAgeMonths, 55 * 12)
})
