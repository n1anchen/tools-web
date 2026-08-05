interface Md5Variants {
  lower32: string
  upper32: string
  lower16: string
  upper16: string
}

export function buildMd5Variants(hash: string): Md5Variants {
  const lower32 = hash.trim().toLowerCase()
  const upper32 = lower32.toUpperCase()
  return {
    lower32,
    upper32,
    lower16: lower32.slice(8, 24),
    upper16: upper32.slice(8, 24),
  }
}

export function normalizeMd5(value: string) {
  const normalized = value.trim().toLowerCase()
  return /^[a-f0-9]{32}$/.test(normalized) ? normalized : ''
}

export function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / 1024 ** index
  return `${value >= 100 || index === 0 ? Math.round(value) : value.toFixed(1)} ${units[index]}`
}

interface ReactionSummary {
  count: number
  best: number
  worst: number
  average: number
  median: number
  spread: number
  consistency: number
  rating: string
}

export function summarizeReactionTimes(values: number[]): ReactionSummary {
  const times = values.filter(value => Number.isFinite(value) && value >= 0).map(Math.round)
  if (!times.length) return { count: 0, best: 0, worst: 0, average: 0, median: 0, spread: 0, consistency: 0, rating: '等待测试' }
  const sorted = [...times].sort((first, second) => first - second)
  const average = Math.round(times.reduce((sum, value) => sum + value, 0) / times.length)
  const middle = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2)
  const variance = times.reduce((sum, value) => sum + (value - average) ** 2, 0) / times.length
  const deviation = Math.sqrt(variance)
  const consistency = Math.max(0, Math.min(100, Math.round(100 - deviation / Math.max(average, 1) * 180)))
  const rating = average <= 160 ? '闪电反应' : average <= 200 ? '非常敏捷' : average <= 250 ? '稳定发挥' : average <= 320 ? '状态不错' : '继续热身'
  return {
    count: times.length,
    best: sorted[0],
    worst: sorted[sorted.length - 1],
    average,
    median,
    spread: sorted[sorted.length - 1] - sorted[0],
    consistency,
    rating,
  }
}

export function validateHlsUrl(value: string) {
  const source = value.trim()
  if (!source) return { valid: false, url: '', error: '请输入 HLS 流地址' }
  try {
    const url = new URL(source)
    if (!['http:', 'https:'].includes(url.protocol)) return { valid: false, url: '', error: '仅支持 HTTP 或 HTTPS 地址' }
    if (url.username || url.password) return { valid: false, url: '', error: '请勿在地址中包含账号或密码' }
    return { valid: true, url: url.toString(), error: '' }
  } catch {
    return { valid: false, url: '', error: '地址格式无效，请输入完整 URL' }
  }
}

export function formatMediaTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '--:--'
  const total = Math.floor(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor(total % 3600 / 60)
  const remain = total % 60
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remain).padStart(2, '0')}` : `${minutes}:${String(remain).padStart(2, '0')}`
}

function quotedEnd(source: string, start: number, opener: string, closer = opener) {
  let index = start + opener.length
  while (index < source.length) {
    if (source.startsWith(closer, index)) {
      if (opener.length === 1 && source.startsWith(closer + closer, index)) {
        index += closer.length * 2
        continue
      }
      return index + closer.length
    }
    if (source[index] === '\\' && opener !== '[') index += 2
    else index += 1
  }
  return source.length
}

function dollarQuoteAt(source: string, index: number) {
  return source.slice(index).match(/^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/)?.[0] ?? ''
}

export function minifySqlSafely(source: string) {
  let output = ''
  let pendingSpace = false
  let index = 0

  const appendSpace = () => {
    if (output && !output.endsWith(' ') && !output.endsWith('\n')) output += ' '
  }

  while (index < source.length) {
    const char = source[index]
    if (/\s/.test(char)) {
      pendingSpace = true
      index += 1
      continue
    }

    if (source.startsWith('--', index)) {
      if (pendingSpace) appendSpace()
      const end = source.indexOf('\n', index)
      output += end === -1 ? source.slice(index) : `${source.slice(index, end).trimEnd()}\n`
      index = end === -1 ? source.length : end + 1
      pendingSpace = false
      continue
    }

    if (source.startsWith('/*', index)) {
      if (pendingSpace) appendSpace()
      const close = source.indexOf('*/', index + 2)
      const end = close === -1 ? source.length : close + 2
      output += source.slice(index, end)
      index = end
      pendingSpace = true
      continue
    }

    const dollar = char === '$' ? dollarQuoteAt(source, index) : ''
    if (dollar) {
      if (pendingSpace) appendSpace()
      const close = source.indexOf(dollar, index + dollar.length)
      const end = close === -1 ? source.length : close + dollar.length
      output += source.slice(index, end)
      index = end
      pendingSpace = false
      continue
    }

    const quote = char === '[' ? { opener: '[', closer: ']' } : ['\'', '"', '`'].includes(char) ? { opener: char, closer: char } : null
    if (quote) {
      if (pendingSpace) appendSpace()
      const end = quotedEnd(source, index, quote.opener, quote.closer)
      output += source.slice(index, end)
      index = end
      pendingSpace = false
      continue
    }

    if (pendingSpace) appendSpace()
    output += char
    pendingSpace = false
    index += 1
  }

  return output.trim()
}

export function countSqlStatements(source: string) {
  const compact = minifySqlSafely(source)
  if (!compact) return 0
  let count = 0
  let hasContent = false
  let index = 0
  while (index < compact.length) {
    const char = compact[index]
    if (compact.startsWith('--', index)) {
      const end = compact.indexOf('\n', index)
      index = end === -1 ? compact.length : end + 1
      continue
    }
    if (compact.startsWith('/*', index)) {
      const close = compact.indexOf('*/', index + 2)
      index = close === -1 ? compact.length : close + 2
      continue
    }
    const dollar = char === '$' ? dollarQuoteAt(compact, index) : ''
    if (dollar) {
      const close = compact.indexOf(dollar, index + dollar.length)
      index = close === -1 ? compact.length : close + dollar.length
      hasContent = true
      continue
    }
    const quote = char === '[' ? { opener: '[', closer: ']' } : ['\'', '"', '`'].includes(char) ? { opener: char, closer: char } : null
    if (quote) {
      index = quotedEnd(compact, index, quote.opener, quote.closer)
      hasContent = true
      continue
    }
    if (char === ';') {
      if (hasContent) count += 1
      hasContent = false
    } else if (!/\s/.test(char)) {
      hasContent = true
    }
    index += 1
  }
  return count + (hasContent ? 1 : 0)
}
