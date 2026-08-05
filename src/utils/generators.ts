import { secureRandomInt } from './random.ts'

type RandomInteger = (min: number, max: number) => number

interface DecisionOption {
  label: string
  weight: number
}

function uniqueCharacters(value: string) {
  return [...new Set(Array.from(value))].join('')
}

/**
 * Build a password while guaranteeing that every selected character set appears.
 */
export function generatePassword(
  characterSets: string[],
  length: number,
  randomInteger: RandomInteger = secureRandomInt,
) {
  const sets = characterSets.map(uniqueCharacters).filter(Boolean)
  if (!sets.length) throw new RangeError('At least one character set is required')
  if (!Number.isInteger(length) || length < sets.length) {
    throw new RangeError('Password length must cover every character set')
  }

  const pool = uniqueCharacters(sets.join(''))
  const result = sets.map(set => Array.from(set)[randomInteger(0, Array.from(set).length - 1)])
  while (result.length < length) {
    result.push(Array.from(pool)[randomInteger(0, Array.from(pool).length - 1)])
  }

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInteger(0, index)
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result.join('')
}

export function estimatePasswordEntropy(poolSize: number, length: number) {
  if (poolSize <= 0 || length <= 0) return 0
  return length * Math.log2(poolSize)
}

/**
 * Generate one or more secure integers, optionally without duplicates.
 */
export function generateRandomIntegers(
  min: number,
  max: number,
  count: number,
  unique: boolean,
  randomInteger: RandomInteger = secureRandomInt,
) {
  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min > max) {
    throw new RangeError('Invalid random integer range')
  }
  if (!Number.isInteger(count) || count < 1 || count > 100) {
    throw new RangeError('Random integer count must be between 1 and 100')
  }

  const range = max - min + 1
  if (range > 0x1_0000_0000) throw new RangeError('Random integer range is too large')
  if (unique && count > range) throw new RangeError('Unique count exceeds the available range')

  if (!unique) {
    return Array.from({ length: count }, () => randomInteger(min, max))
  }

  if (range <= 10_000) {
    const pool = Array.from({ length: range }, (_, index) => min + index)
    for (let index = 0; index < count; index += 1) {
      const swapIndex = randomInteger(index, pool.length - 1)
      ;[pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]]
    }
    return pool.slice(0, count)
  }

  const values = new Set<number>()
  while (values.size < count) values.add(randomInteger(min, max))
  return [...values]
}

/** Parse comma/newline separated options. A trailing `| 3` sets an integer weight. */
export function parseDecisionOptions(value: string): DecisionOption[] {
  return value
    .split(/[\n,，]+/)
    .map(item => item.trim())
    .filter(Boolean)
    .map((item) => {
      const weighted = item.match(/^(.*?)\s*\|\s*(\d+)$/)
      if (!weighted) return { label: item, weight: 1 }
      return {
        label: weighted[1].trim(),
        weight: Math.min(100, Math.max(1, Number(weighted[2]))),
      }
    })
    .filter(option => Boolean(option.label))
}

export function pickDecision(
  options: DecisionOption[],
  excludedLabel = '',
  randomInteger: RandomInteger = secureRandomInt,
) {
  const available = options.length > 1 && excludedLabel
    ? options.filter(option => option.label !== excludedLabel)
    : options
  if (!available.length) throw new RangeError('At least one decision option is required')

  const totalWeight = available.reduce((sum, option) => sum + option.weight, 0)
  let cursor = randomInteger(1, totalWeight)
  for (const option of available) {
    cursor -= option.weight
    if (cursor <= 0) return option
  }
  return available[available.length - 1]
}

interface UuidFormatOptions {
  uppercase: boolean
  hyphens: boolean
  braces: boolean
}

export function formatUuid(value: string, options: UuidFormatOptions) {
  let result = options.hyphens ? value : value.replace(/-/g, '')
  result = options.uppercase ? result.toUpperCase() : result.toLowerCase()
  return options.braces ? `{${result}}` : result
}
