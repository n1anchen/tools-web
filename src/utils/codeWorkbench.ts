export interface CodeMetrics {
  characters: number
  bytes: number
  lines: number
  nonEmptyLines: number
}

export interface JsonAnalysis {
  valid: boolean
  error: string
  line: number
  column: number
  rootType: string
  depth: number
  entries: number
}

export function getCodeMetrics(source: string): CodeMetrics {
  const lines = source ? source.split(/\r?\n/).length : 0
  return {
    characters: Array.from(source).length,
    bytes: new TextEncoder().encode(source).length,
    lines,
    nonEmptyLines: source ? source.split(/\r?\n/).filter(line => line.trim()).length : 0,
  }
}

function getValueType(value: unknown) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'Array'
  return typeof value === 'object' ? 'Object' : typeof value
}

function getDepth(value: unknown): number {
  if (!value || typeof value !== 'object') return 0
  const values = Array.isArray(value) ? value : Object.values(value)
  return 1 + Math.max(0, ...values.map(getDepth))
}

function getEntries(value: unknown) {
  if (Array.isArray(value)) return value.length
  if (value && typeof value === 'object') return Object.keys(value).length
  return 1
}

function getLineColumn(source: string, index: number) {
  const safeIndex = Math.max(0, Math.min(source.length, index))
  const before = source.slice(0, safeIndex)
  const lines = before.split(/\r?\n/)
  return { line: lines.length, column: (lines[lines.length - 1]?.length ?? 0) + 1 }
}

function locateJsonError(source: string, message: string) {
  const positionMatch = message.match(/position\s+(\d+)/i)
  if (positionMatch) return getLineColumn(source, Number(positionMatch[1]))
  const locationMatch = message.match(/line\s+(\d+)\s+column\s+(\d+)/i)
  if (locationMatch) return { line: Number(locationMatch[1]), column: Number(locationMatch[2]) }
  return { line: 1, column: 1 }
}

export function analyzeJson(source: string): JsonAnalysis {
  if (!source.trim()) return { valid: false, error: '等待 JSON 内容', line: 0, column: 0, rootType: '—', depth: 0, entries: 0 }
  try {
    const value = JSON.parse(source) as unknown
    return {
      valid: true,
      error: '',
      line: 0,
      column: 0,
      rootType: getValueType(value),
      depth: getDepth(value),
      entries: getEntries(value),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '无效 JSON'
    return { valid: false, error: message, ...locateJsonError(source, message), rootType: '—', depth: 0, entries: 0 }
  }
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonValue)
  if (!value || typeof value !== 'object') return value
  return Object.keys(value).sort((a, b) => a.localeCompare(b)).reduce<Record<string, unknown>>((result, key) => {
    result[key] = sortJsonValue((value as Record<string, unknown>)[key])
    return result
  }, {})
}

export function formatJsonDocument(source: string, indent: number | '\t' = 2, sortKeys = false) {
  const value = JSON.parse(source) as unknown
  return JSON.stringify(sortKeys ? sortJsonValue(value) : value, null, indent)
}

export function minifyJsonDocument(source: string) {
  return JSON.stringify(JSON.parse(source))
}

export function escapeJsonString(source: string) {
  return JSON.stringify(source).slice(1, -1)
}

export function unescapeJsonString(source: string) {
  return JSON.parse(`"${source}"`) as string
}

export interface MarkupAnalysis {
  tags: number
  comments: number
  scripts: number
  styles: number
  headings: number
}

export function analyzeMarkup(source: string): MarkupAnalysis {
  return {
    tags: (source.match(/<\/?[a-z][^>]*>/gi) ?? []).length,
    comments: (source.match(/<!--[\s\S]*?-->/g) ?? []).length,
    scripts: (source.match(/<script\b/gi) ?? []).length,
    styles: (source.match(/<style\b/gi) ?? []).length,
    headings: (source.match(/<h[1-6]\b/gi) ?? []).length,
  }
}

function protectMarkupBlocks(source: string, preserveComments: boolean) {
  const blocks: string[] = []
  const protect = (value: string) => {
    const token = `\uE000BLOCK${blocks.length}\uE001`
    blocks.push(value)
    return token
  }
  let output = source.replace(/<(pre|textarea|script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, protect)
  output = output.replace(/<!--[\s\S]*?-->/g, comment => preserveComments || /^<!--\s*\[if/i.test(comment) ? protect(comment) : '')
  return { output, blocks }
}

function collapseTagWhitespace(tag: string) {
  let output = ''
  let quote = ''
  let pendingSpace = false
  for (const character of tag) {
    if (quote) {
      output += character
      if (character === quote) quote = ''
      continue
    }
    if (character === '"' || character === "'") {
      if (pendingSpace && output && !output.endsWith('<')) output += ' '
      pendingSpace = false
      quote = character
      output += character
      continue
    }
    if (/\s/.test(character)) {
      pendingSpace = true
      continue
    }
    if (pendingSpace && output && !output.endsWith('<') && character !== '>') output += ' '
    pendingSpace = false
    output += character
  }
  return output
}

function tokenizeMarkup(source: string) {
  const tokens: Array<{ tag: boolean; value: string }> = []
  let buffer = ''
  let inTag = false
  let quote = ''
  for (const character of source) {
    if (!inTag && character === '<') {
      if (buffer) tokens.push({ tag: false, value: buffer })
      buffer = '<'
      inTag = true
      continue
    }
    buffer += character
    if (!inTag) continue
    if (quote) {
      if (character === quote) quote = ''
      continue
    }
    if (character === '"' || character === "'") quote = character
    else if (character === '>') {
      tokens.push({ tag: true, value: buffer })
      buffer = ''
      inTag = false
    }
  }
  if (buffer) tokens.push({ tag: inTag, value: buffer })
  return tokens
}

export function minifyMarkup(source: string, preserveComments = true) {
  const { output, blocks } = protectMarkupBlocks(source, preserveComments)
  const minified = tokenizeMarkup(output).map(token => token.tag ? collapseTagWhitespace(token.value) : token.value.replace(/\s+/g, ' ')).join('').trim()
  return blocks.reduce((result, block, index) => result.replace(`\uE000BLOCK${index}\uE001`, block), minified)
}

const HTML_VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'])

export function formatMarkup(source: string, indentSize = 2) {
  const { output, blocks } = protectMarkupBlocks(source, true)
  const tokens = tokenizeMarkup(output)
  const lines: string[] = []
  let depth = 0
  const indent = () => ' '.repeat(Math.max(0, depth) * indentSize)

  for (const token of tokens) {
    if (!token.tag) {
      const parts = token.value.split(/(\uE000BLOCK\d+\uE001)/g).filter(Boolean)
      for (const part of parts) {
        if (/^\uE000BLOCK\d+\uE001$/.test(part)) lines.push(`${indent()}${part}`)
        else {
          const text = part.replace(/\s+/g, ' ').trim()
          if (text) lines.push(`${indent()}${text}`)
        }
      }
      continue
    }

    const tag = collapseTagWhitespace(token.value).trim()
    const closing = /^<\//.test(tag)
    const declaration = /^<(?:!|\?)/.test(tag)
    const tagName = tag.match(/^<\/?\s*([\w:-]+)/)?.[1]?.toLowerCase() ?? ''
    const selfClosing = /\/\s*>$/.test(tag) || HTML_VOID_TAGS.has(tagName)
    if (closing) depth = Math.max(0, depth - 1)
    lines.push(`${indent()}${tag}`)
    if (!closing && !declaration && !selfClosing) depth += 1
  }

  const formatted = lines.join('\n')
  return blocks.reduce((result, block, index) => result.replace(`\uE000BLOCK${index}\uE001`, block), formatted)
}

export function analyzeCss(source: string) {
  return {
    rules: (source.match(/[^@{}][^{]*\{/g) ?? []).length,
    declarations: (source.match(/[\w-]+\s*:\s*[^;{}]+[;}]/g) ?? []).length,
    variables: (source.match(/--[\w-]+\s*:/g) ?? []).length,
    mediaQueries: (source.match(/@media\b/gi) ?? []).length,
    colors: new Set((source.match(/#[\da-f]{3,8}\b|(?:rgb|hsl)a?\([^)]*\)/gi) ?? []).map(color => color.toLowerCase())).size,
  }
}

export function analyzeJavaScript(source: string) {
  return {
    functions: (source.match(/\bfunction\b|(?:^|[=(:,])\s*(?:async\s*)?\([^)]*\)\s*=>|\b(?:async\s+)?[a-z_$][\w$]*\s*=>/gim) ?? []).length,
    imports: (source.match(/^\s*import\b/gm) ?? []).length,
    exports: (source.match(/^\s*export\b/gm) ?? []).length,
    consoleCalls: (source.match(/\bconsole\.[a-z]+\s*\(/gi) ?? []).length,
    comments: (source.match(/\/\*[\s\S]*?\*\/|(^|[^:])\/\/.*$/gm) ?? []).length,
  }
}

export function getCompressionReport(before: string, after: string) {
  const saved = Math.max(0, new TextEncoder().encode(before).length - new TextEncoder().encode(after).length)
  const originalBytes = new TextEncoder().encode(before).length
  return { saved, percent: originalBytes ? Math.round(saved / originalBytes * 100) : 0 }
}
