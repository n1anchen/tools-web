export interface RegexMatchResult {
  index: number
  end: number
  value: string
  groups: Array<string | undefined>
  namedGroups: Record<string, string>
  line: number
  column: number
}

export interface RegexAnalysis {
  matches: RegexMatchResult[]
  error: string
  durationMs: number
  coverage: number
}

export interface HighlightSegment {
  value: string
  matched: boolean
  matchIndex?: number
}

const allowedRegexFlags = new Set(['g', 'i', 'm', 's', 'u', 'y'])

export function normalizeRegexFlags(flags: string) {
  const unique: string[] = []
  for (const flag of flags) {
    if (!allowedRegexFlags.has(flag)) throw new Error(`不支持正则标志“${flag}”`)
    if (!unique.includes(flag)) unique.push(flag)
  }
  return unique.join('')
}

function getLineColumn(text: string, index: number) {
  const before = text.slice(0, index)
  const lines = before.split('\n')
  return { line: lines.length, column: (lines[lines.length - 1]?.length ?? 0) + 1 }
}

function advanceStringIndex(text: string, index: number, unicode: boolean) {
  if (!unicode || index + 1 >= text.length) return index + 1
  const first = text.charCodeAt(index)
  if (first < 0xD800 || first > 0xDBFF) return index + 1
  const second = text.charCodeAt(index + 1)
  return second >= 0xDC00 && second <= 0xDFFF ? index + 2 : index + 1
}

export function analyzeRegex(text: string, source: string, flags = 'g'): RegexAnalysis {
  if (!source) return { matches: [], error: '', durationMs: 0, coverage: 0 }
  const startedAt = typeof performance === 'undefined' ? Date.now() : performance.now()
  try {
    const normalizedFlags = normalizeRegexFlags(flags)
    const regex = new RegExp(source, normalizedFlags)
    const matches: RegexMatchResult[] = []
    let match: RegExpExecArray | null

    do {
      match = regex.exec(text)
      if (!match) break
      const location = getLineColumn(text, match.index)
      matches.push({
        index: match.index,
        end: match.index + match[0].length,
        value: match[0],
        groups: match.slice(1),
        namedGroups: { ...(match.groups ?? {}) },
        ...location,
      })
      if (!regex.global && !regex.sticky) break
      if (match[0] === '') regex.lastIndex = advanceStringIndex(text, regex.lastIndex, regex.unicode)
    } while (regex.lastIndex <= text.length)

    const coveredCharacters = matches.reduce((sum, item) => sum + item.value.length, 0)
    const endedAt = typeof performance === 'undefined' ? Date.now() : performance.now()
    return {
      matches,
      error: '',
      durationMs: Number((endedAt - startedAt).toFixed(3)),
      coverage: text.length ? Math.min(100, coveredCharacters / text.length * 100) : 0,
    }
  } catch (error) {
    const endedAt = typeof performance === 'undefined' ? Date.now() : performance.now()
    return {
      matches: [],
      error: error instanceof Error ? error.message : '正则表达式无效',
      durationMs: Number((endedAt - startedAt).toFixed(3)),
      coverage: 0,
    }
  }
}

export function buildHighlightSegments(text: string, matches: RegexMatchResult[]): HighlightSegment[] {
  if (!matches.length) return [{ value: text, matched: false }]
  const segments: HighlightSegment[] = []
  let cursor = 0
  matches.forEach((match, index) => {
    if (match.index > cursor) segments.push({ value: text.slice(cursor, match.index), matched: false })
    if (match.end > match.index) {
      segments.push({ value: text.slice(match.index, match.end), matched: true, matchIndex: index + 1 })
      cursor = Math.max(cursor, match.end)
    }
  })
  if (cursor < text.length) segments.push({ value: text.slice(cursor), matched: false })
  return segments
}

export function replaceRegex(text: string, source: string, replacement: string, flags = 'g') {
  if (!source) return { value: text, error: '' }
  try {
    return { value: text.replace(new RegExp(source, normalizeRegexFlags(flags)), replacement), error: '' }
  } catch (error) {
    return { value: text, error: error instanceof Error ? error.message : '正则表达式无效' }
  }
}

export interface SearchableHttpStatus {
  code: number
  name: string
  description: string
  common?: boolean
  tags?: string[]
}

export function filterHttpStatuses<T extends SearchableHttpStatus>(
  statuses: T[],
  query = '',
  category = 'all',
  commonOnly = false,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  return statuses.filter(status => {
    if (category !== 'all' && Math.floor(status.code / 100).toString() !== category) return false
    if (commonOnly && !status.common) return false
    if (!normalizedQuery) return true
    return [status.code, status.name, status.description, ...(status.tags ?? [])]
      .some(value => String(value).toLocaleLowerCase().includes(normalizedQuery))
  })
}
