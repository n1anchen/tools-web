export type RetirementCategory = 'male' | 'female55' | 'female50'

export interface RetirementCategoryConfig {
  label: string
  shortLabel: string
  description: string
  originalAgeMonths: number
  transitionStart: string
  intervalMonths: number
  maxDelayMonths: number
}

export interface RetirementResult {
  category: RetirementCategory
  birthMonth: string
  currentMonth: string
  currentAgeMonths: number
  originalAgeMonths: number
  statutoryAgeMonths: number
  delayMonths: number
  originalRetirementMonth: string
  statutoryRetirementMonth: string
  earliestFlexibleAgeMonths: number
  earliestFlexibleMonth: string
  latestFlexibleAgeMonths: number
  latestFlexibleMonth: string
  monthsUntilStatutory: number
  minimumContributionYears: number
  policyApplies: boolean
}

export interface RetirementReferenceRow {
  delayMonths: number
  birthStart: string
  birthEnd: string | null
  birthRange: string
  retirementAgeMonths: number
  retirementAge: string
  retirementRange: string
}

export const retirementCategoryConfigs: Record<RetirementCategory, RetirementCategoryConfig> = {
  male: {
    label: '男职工',
    shortLabel: '男性',
    description: '原法定退休年龄为60周岁',
    originalAgeMonths: 60 * 12,
    transitionStart: '1965-01',
    intervalMonths: 4,
    maxDelayMonths: 36,
  },
  female55: {
    label: '原55岁退休的女职工',
    shortLabel: '女性（原55岁）',
    description: '是否属于该类别以档案和当地人社部门认定为准',
    originalAgeMonths: 55 * 12,
    transitionStart: '1970-01',
    intervalMonths: 4,
    maxDelayMonths: 36,
  },
  female50: {
    label: '原50岁退休的女职工',
    shortLabel: '女性（原50岁）',
    description: '是否属于该类别以档案和当地人社部门认定为准',
    originalAgeMonths: 50 * 12,
    transitionStart: '1975-01',
    intervalMonths: 2,
    maxDelayMonths: 60,
  },
}

function parseMonth(value: string) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value)
  if (!match) throw new Error('月份格式应为 YYYY-MM')
  return { year: Number(match[1]), month: Number(match[2]) }
}

export function monthValueToIndex(value: string) {
  const { year, month } = parseMonth(value)
  return year * 12 + month - 1
}

export function monthIndexToValue(index: number) {
  const normalized = Math.floor(index)
  const year = Math.floor(normalized / 12)
  const month = normalized - year * 12 + 1
  return `${year}-${String(month).padStart(2, '0')}`
}

export function addMonths(value: string, months: number) {
  return monthIndexToValue(monthValueToIndex(value) + Math.floor(months))
}

export function formatMonth(value: string) {
  const { year, month } = parseMonth(value)
  return `${year}年${month}月`
}

export function formatAge(ageMonths: number) {
  const months = Math.max(0, Math.floor(ageMonths))
  const years = Math.floor(months / 12)
  const rest = months % 12
  return rest ? `${years}岁${rest}个月` : `${years}岁`
}

export function minimumContributionYearsForYear(year: number) {
  if (year <= 2029) return 15
  return Math.min(20, 15 + (year - 2029) * 0.5)
}

export function calculateRetirement(
  birthMonth: string,
  category: RetirementCategory,
  currentMonth: string,
): RetirementResult {
  const config = retirementCategoryConfigs[category]
  const birthIndex = monthValueToIndex(birthMonth)
  const currentIndex = monthValueToIndex(currentMonth)
  const transitionStartIndex = monthValueToIndex(config.transitionStart)
  const policyStartIndex = monthValueToIndex('2025-01')
  const monthsIntoTransition = birthIndex - transitionStartIndex
  const delayMonths = monthsIntoTransition < 0
    ? 0
    : Math.min(
      config.maxDelayMonths,
      Math.floor(monthsIntoTransition / config.intervalMonths) + 1,
    )
  const statutoryAgeMonths = config.originalAgeMonths + delayMonths
  const originalRetirementIndex = birthIndex + config.originalAgeMonths
  const statutoryRetirementIndex = birthIndex + statutoryAgeMonths
  const policyApplies = originalRetirementIndex >= policyStartIndex
  const earliestFlexibleAgeMonths = policyApplies
    ? Math.max(config.originalAgeMonths, statutoryAgeMonths - 36)
    : statutoryAgeMonths
  const latestFlexibleAgeMonths = policyApplies
    ? statutoryAgeMonths + 36
    : statutoryAgeMonths
  const statutoryYear = Math.floor(statutoryRetirementIndex / 12)

  return {
    category,
    birthMonth,
    currentMonth,
    currentAgeMonths: currentIndex - birthIndex,
    originalAgeMonths: config.originalAgeMonths,
    statutoryAgeMonths,
    delayMonths,
    originalRetirementMonth: monthIndexToValue(originalRetirementIndex),
    statutoryRetirementMonth: monthIndexToValue(statutoryRetirementIndex),
    earliestFlexibleAgeMonths,
    earliestFlexibleMonth: monthIndexToValue(birthIndex + earliestFlexibleAgeMonths),
    latestFlexibleAgeMonths,
    latestFlexibleMonth: monthIndexToValue(birthIndex + latestFlexibleAgeMonths),
    monthsUntilStatutory: statutoryRetirementIndex - currentIndex,
    minimumContributionYears: minimumContributionYearsForYear(statutoryYear),
    policyApplies,
  }
}

export function generateReferenceRows(category: RetirementCategory): RetirementReferenceRow[] {
  const config = retirementCategoryConfigs[category]
  const startIndex = monthValueToIndex(config.transitionStart)
  return Array.from({ length: config.maxDelayMonths }, (_, index) => {
    const delayMonths = index + 1
    const birthStartIndex = startIndex + index * config.intervalMonths
    const birthEndIndex = birthStartIndex + config.intervalMonths - 1
    const birthStart = monthIndexToValue(birthStartIndex)
    const birthEnd = delayMonths === config.maxDelayMonths
      ? null
      : monthIndexToValue(birthEndIndex)
    const retirementAgeMonths = config.originalAgeMonths + delayMonths
    const retirementStart = monthIndexToValue(birthStartIndex + retirementAgeMonths)
    const retirementEnd = delayMonths === config.maxDelayMonths
      ? null
      : monthIndexToValue(birthEndIndex + retirementAgeMonths)

    return {
      delayMonths,
      birthStart,
      birthEnd,
      birthRange: birthEnd
        ? `${formatMonth(birthStart)}—${formatMonth(birthEnd)}`
        : `${formatMonth(birthStart)}及以后`,
      retirementAgeMonths,
      retirementAge: formatAge(retirementAgeMonths),
      retirementRange: retirementEnd
        ? `${formatMonth(retirementStart)}—${formatMonth(retirementEnd)}`
        : `${formatMonth(retirementStart)}及以后`,
    }
  })
}
