interface TextStatistics {
  characters: number
  charactersWithoutWhitespace: number
  chineseCharacters: number
  words: number
  latinLetters: number
  numbers: number
  punctuation: number
  symbols: number
  whitespace: number
  lines: number
  paragraphs: number
  readingMinutes: number
}

export function analyzeText(text: string): TextStatistics {
  if (!text) {
    return {
      characters: 0,
      charactersWithoutWhitespace: 0,
      chineseCharacters: 0,
      words: 0,
      latinLetters: 0,
      numbers: 0,
      punctuation: 0,
      symbols: 0,
      whitespace: 0,
      lines: 0,
      paragraphs: 0,
      readingMinutes: 0,
    }
  }

  const characters = Array.from(text)
  const chineseCharacters = characters.filter(char => /\p{Script=Han}/u.test(char)).length
  const nonChineseText = text.replace(/\p{Script=Han}/gu, ' ')
  const nonChineseWords = nonChineseText.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? []
  const words = chineseCharacters + nonChineseWords.length
  const trimmed = text.trim()

  return {
    characters: characters.length,
    charactersWithoutWhitespace: characters.filter(char => !/\s/u.test(char)).length,
    chineseCharacters,
    words,
    latinLetters: characters.filter(char => /[A-Za-z]/.test(char)).length,
    numbers: characters.filter(char => /\p{N}/u.test(char)).length,
    punctuation: characters.filter(char => /\p{P}/u.test(char)).length,
    symbols: characters.filter(char => /\p{S}/u.test(char)).length,
    whitespace: characters.filter(char => /\s/u.test(char)).length,
    lines: text.split(/\r\n|\r|\n/).length,
    paragraphs: trimmed ? trimmed.split(/(?:\r\n|\r|\n)\s*(?:\r\n|\r|\n)+/).filter(Boolean).length : 0,
    readingMinutes: trimmed ? Math.max(1, Math.ceil(chineseCharacters / 300 + nonChineseWords.length / 200)) : 0,
  }
}

export type DedupeMode = 'global' | 'adjacent'

interface DedupeOptions {
  trimLines: boolean
  ignoreEmpty: boolean
  caseSensitive: boolean
  mode: DedupeMode
  sort: boolean
}

interface DedupeResult {
  text: string
  originalLines: number
  resultLines: number
  removedLines: number
}

export function dedupeLines(text: string, options: DedupeOptions): DedupeResult {
  if (!text) return { text: '', originalLines: 0, resultLines: 0, removedLines: 0 }

  const sourceLines = text.split(/\r\n|\r|\n/)
  const result: string[] = []
  const seen = new Set<string>()
  let previousKey: string | null = null

  for (const sourceLine of sourceLines) {
    const outputLine = options.trimLines ? sourceLine.trim() : sourceLine
    if (options.ignoreEmpty && outputLine === '') continue

    const key = options.caseSensitive ? outputLine : outputLine.toLocaleLowerCase()
    const duplicate = options.mode === 'global' ? seen.has(key) : previousKey === key
    if (!duplicate) result.push(outputLine)
    seen.add(key)
    previousKey = key
  }

  if (options.sort) {
    result.sort((left, right) => left.localeCompare(right, 'zh-CN', { numeric: true }))
  }

  return {
    text: result.join('\n'),
    originalLines: sourceLines.length,
    resultLines: result.length,
    removedLines: sourceLines.length - result.length,
  }
}

export type UnicodeFormat = 'javascript' | 'codePoint'

interface UnicodeEncodeOptions {
  format: UnicodeFormat
  escapeAll: boolean
  uppercase: boolean
}

function unicodeHex(value: number, length: number, uppercase: boolean) {
  const result = value.toString(16).padStart(length, '0')
  return uppercase ? result.toUpperCase() : result
}

export function encodeUnicode(text: string, options: UnicodeEncodeOptions): string {
  let result = ''
  for (const char of text) {
    const codePoint = char.codePointAt(0) ?? 0
    if (!options.escapeAll && codePoint <= 0x7f) {
      result += char
      continue
    }

    if (options.format === 'codePoint') {
      result += `\\u{${unicodeHex(codePoint, 1, options.uppercase)}}`
    } else if (codePoint <= 0xffff) {
      result += `\\u${unicodeHex(codePoint, 4, options.uppercase)}`
    } else {
      const offset = codePoint - 0x10000
      const high = 0xd800 + (offset >> 10)
      const low = 0xdc00 + (offset & 0x3ff)
      result += `\\u${unicodeHex(high, 4, options.uppercase)}\\u${unicodeHex(low, 4, options.uppercase)}`
    }
  }
  return result
}

export function decodeUnicode(text: string): string {
  return text
    .replace(/\\u\{([0-9a-f]{1,6})\}/gi, (match, hex: string) => {
      const codePoint = Number.parseInt(hex, 16)
      return codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : match
    })
    .replace(/\\u(d[89ab][0-9a-f]{2})\\u(d[cdef][0-9a-f]{2})/gi, (_, highHex: string, lowHex: string) => {
      const high = Number.parseInt(highHex, 16)
      const low = Number.parseInt(lowHex, 16)
      return String.fromCodePoint(0x10000 + ((high - 0xd800) << 10) + (low - 0xdc00))
    })
    .replace(/\\u([0-9a-f]{4})/gi, (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)))
}

const HTML_ENTITY_ENCODE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

const HTML_ENTITY_DECODE_MAP: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
}

export function encodeHtmlEntities(text: string, encodeNonAscii = false): string {
  let result = ''
  for (const char of text) {
    if (HTML_ENTITY_ENCODE_MAP[char]) {
      result += HTML_ENTITY_ENCODE_MAP[char]
      continue
    }
    const codePoint = char.codePointAt(0) ?? 0
    result += encodeNonAscii && codePoint > 0x7f ? `&#x${codePoint.toString(16).toUpperCase()};` : char
  }
  return result
}

export function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const isHex = entity[1].toLowerCase() === 'x'
      const value = Number.parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10)
      return Number.isFinite(value) && value <= 0x10ffff ? String.fromCodePoint(value) : match
    }
    return HTML_ENTITY_DECODE_MAP[entity.toLowerCase()] ?? match
  })
}

export function countHtmlEntityChanges(input: string, output: string) {
  if (!input || input === output) return 0
  return (output.match(/&(?:#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi) ?? []).length
}

export type ReplaceScope = 'all' | 'first'

interface TextReplaceOptions {
  useRegex: boolean
  caseSensitive: boolean
  scope: ReplaceScope
}

interface TextReplaceResult {
  text: string
  matchCount: number
  replacementCount: number
  error: string
}

function escapeRegularExpression(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function replaceText(
  input: string,
  search: string,
  replacement: string,
  options: TextReplaceOptions,
): TextReplaceResult {
  if (!search) return { text: input, matchCount: 0, replacementCount: 0, error: '' }

  try {
    const source = options.useRegex ? search : escapeRegularExpression(search)
    const baseFlags = `${options.caseSensitive ? '' : 'i'}u`
    const countPattern = new RegExp(source, `${baseFlags}g`)
    const matchCount = Array.from(input.matchAll(countPattern)).length
    const replacePattern = new RegExp(source, `${baseFlags}${options.scope === 'all' ? 'g' : ''}`)
    const text = options.useRegex
      ? input.replace(replacePattern, replacement)
      : input.replace(replacePattern, () => replacement)

    return {
      text,
      matchCount,
      replacementCount: options.scope === 'all' ? matchCount : Math.min(1, matchCount),
      error: '',
    }
  } catch (error) {
    return {
      text: '',
      matchCount: 0,
      replacementCount: 0,
      error: error instanceof Error ? error.message : '无效的正则表达式',
    }
  }
}

interface WordFrequencyOptions {
  minLength: number
  caseSensitive: boolean
  excludeStopWords: boolean
  customStopWords?: string[]
  locale?: string
}

interface WordFrequencyItem {
  word: string
  count: number
  percentage: number
}

interface WordFrequencyResult {
  items: WordFrequencyItem[]
  totalWords: number
  uniqueWords: number
  diversity: number
}

const DEFAULT_STOP_WORDS = new Set([
  '的', '了', '是', '在', '和', '与', '及', '或', '也', '都', '就', '而', '被', '把', '这', '那', '一个',
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'is', 'it', 'of', 'on', 'or',
  'that', 'the', 'this', 'to', 'was', 'were', 'will', 'with',
])

interface WordSegment {
  segment: string
  isWordLike?: boolean
}

type SegmenterConstructor = new (
  locales?: string | string[],
  options?: { granularity: 'word' },
) => { segment: (input: string) => Iterable<WordSegment> }

function segmentWords(text: string, locale: string) {
  const Segmenter = (Intl as typeof Intl & { Segmenter?: SegmenterConstructor }).Segmenter
  if (Segmenter) {
    const segmenter = new Segmenter(locale, { granularity: 'word' })
    return [...segmenter.segment(text)]
      .filter(item => item.isWordLike)
      .map(item => item.segment)
  }
  return text.match(/[\p{Script=Han}]+|[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? []
}

export function analyzeWordFrequency(text: string, options: WordFrequencyOptions): WordFrequencyResult {
  const locale = options.locale ?? 'zh-CN'
  const customStopWords = options.customStopWords ?? []
  const stopWords = new Set([
    ...(options.excludeStopWords ? DEFAULT_STOP_WORDS : []),
    ...customStopWords.map(word => options.caseSensitive ? word : word.toLocaleLowerCase(locale)),
  ])
  const words = segmentWords(text, locale)
    .map(word => options.caseSensitive ? word : word.toLocaleLowerCase(locale))
    .filter(word => Array.from(word).length >= options.minLength)
    .filter(word => !stopWords.has(word))

  const frequencies = new Map<string, number>()
  for (const word of words) frequencies.set(word, (frequencies.get(word) ?? 0) + 1)

  const items = [...frequencies.entries()]
    .map(([word, count]) => ({
      word,
      count,
      percentage: words.length ? count / words.length * 100 : 0,
    }))
    .sort((left, right) => right.count - left.count || left.word.localeCompare(right.word, locale))

  return {
    items,
    totalWords: words.length,
    uniqueWords: items.length,
    diversity: words.length ? items.length / words.length * 100 : 0,
  }
}
