export const RADIX_DEFINITIONS = [
  { base: 2, label: '二进制', alphabet: '01', description: '0–1' },
  { base: 8, label: '八进制', alphabet: '01234567', description: '0–7' },
  { base: 10, label: '十进制', alphabet: '0123456789', description: '0–9' },
  { base: 16, label: '十六进制', alphabet: '0123456789abcdef', description: '0–9、A–F' },
  { base: 32, label: '三十二进制', alphabet: '0123456789ABCDEFGHJKMNPQRSTVWXYZ', description: 'Crockford：不含 I、L、O、U' },
  { base: 58, label: '五十八进制', alphabet: '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', description: 'Bitcoin：不含 0、O、I、l' },
  { base: 62, label: '六十二进制', alphabet: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', description: '0–9、a–z、A–Z' },
  { base: 64, label: '六十四进制', alphabet: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/', description: '0–9、a–z、A–Z、+、/' },
] as const

export type SupportedRadix = typeof RADIX_DEFINITIONS[number]['base']

function getRadixDefinition(base: number) {
  const definition = RADIX_DEFINITIONS.find(item => item.base === base)
  if (!definition) throw new Error(`暂不支持 ${base} 进制`)
  return definition
}

function normalizeRadixInput(value: string) {
  return value.trim().replace(/[\s_]/g, '')
}

export function parseRadixInteger(value: string, base: number): bigint {
  const definition = getRadixDefinition(base)
  const normalized = normalizeRadixInput(value)
  if (!normalized) throw new Error('请输入需要转换的整数')

  const negative = normalized.startsWith('-')
  const unsigned = /^[+-]/.test(normalized) ? normalized.slice(1) : normalized
  if (!unsigned) throw new Error('请输入有效整数')

  let result = 0n
  for (const rawCharacter of unsigned) {
    const character = base <= 36 || base === 32 ? rawCharacter.toUpperCase() : rawCharacter
    const alphabet = base <= 16 ? definition.alphabet.toUpperCase() : definition.alphabet
    const index = alphabet.indexOf(character)
    if (index < 0 || index >= base) {
      throw new Error(`字符“${rawCharacter}”不是有效的 ${base} 进制数字`)
    }
    result = result * BigInt(base) + BigInt(index)
  }
  return negative ? -result : result
}

export function formatRadixInteger(value: bigint, base: number, uppercase = false): string {
  const definition = getRadixDefinition(base)
  if (value === 0n) return '0'

  const negative = value < 0n
  let remaining = negative ? -value : value
  let result = ''
  while (remaining > 0n) {
    const index = Number(remaining % BigInt(base))
    result = definition.alphabet[index] + result
    remaining /= BigInt(base)
  }

  if (uppercase && base <= 36) result = result.toUpperCase()
  return `${negative ? '-' : ''}${result}`
}

export function convertRadix(value: string, fromBase: number, toBase: number, uppercase = false): string {
  return formatRadixInteger(parseRadixInteger(value, fromBase), toBase, uppercase)
}

export function groupRadixDigits(value: string, groupSize = 4): string {
  const sign = value.startsWith('-') ? '-' : ''
  const unsigned = sign ? value.slice(1) : value
  return sign + unsigned.replace(new RegExp(`\\B(?=(.{${groupSize}})+$)`, 'g'), ' ')
}

export type TimestampUnit = 'seconds' | 'milliseconds' | 'microseconds'

export interface NormalizedTimestamp {
  milliseconds: number
  unit: TimestampUnit
  source: string
}

const timestampUnitLabels: Record<TimestampUnit, string> = {
  seconds: '秒（s）',
  milliseconds: '毫秒（ms）',
  microseconds: '微秒（μs）',
}

export function getTimestampUnitLabel(unit: TimestampUnit) {
  return timestampUnitLabels[unit]
}

export function normalizeTimestamp(value: string | number | bigint, forcedUnit?: TimestampUnit): NormalizedTimestamp {
  const source = String(value).trim()
  if (!/^[+-]?\d+$/.test(source)) throw new Error('时间戳只能包含整数')

  const digits = source.replace(/^[+-]?0*/, '').length || 1
  const unit = forcedUnit ?? (digits <= 10 ? 'seconds' : digits <= 13 ? 'milliseconds' : digits <= 16 ? 'microseconds' : null)
  if (!unit) throw new Error('时间戳位数过长，请检查输入单位')

  const integer = BigInt(source)
  const millisecondsBigInt = unit === 'seconds'
    ? integer * 1000n
    : unit === 'microseconds'
      ? integer / 1000n
      : integer
  const milliseconds = Number(millisecondsBigInt)
  if (!Number.isSafeInteger(milliseconds)) throw new Error('时间戳超出可安全处理范围')
  if (Number.isNaN(new Date(milliseconds).getTime())) throw new Error('时间戳超出日期范围')

  return { milliseconds, unit, source }
}

function pad(value: number, length = 2) {
  return String(value).padStart(length, '0')
}

export function formatDateTime(milliseconds: number, zone: 'local' | 'utc' = 'local') {
  const date = new Date(milliseconds)
  if (Number.isNaN(date.getTime())) throw new Error('无效日期')
  const year = zone === 'utc' ? date.getUTCFullYear() : date.getFullYear()
  const month = (zone === 'utc' ? date.getUTCMonth() : date.getMonth()) + 1
  const day = zone === 'utc' ? date.getUTCDate() : date.getDate()
  const hour = zone === 'utc' ? date.getUTCHours() : date.getHours()
  const minute = zone === 'utc' ? date.getUTCMinutes() : date.getMinutes()
  const second = zone === 'utc' ? date.getUTCSeconds() : date.getSeconds()
  return `${pad(year, 4)}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}:${pad(second)}`
}

export function parseDateTime(value: string, zone: 'local' | 'utc' = 'local') {
  const match = value.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/)
  if (!match) throw new Error('请使用 YYYY-MM-DD HH:mm:ss 格式')
  const [, yearText, monthText, dayText, hourText = '0', minuteText = '0', secondText = '0'] = match
  const parts = [yearText, monthText, dayText, hourText, minuteText, secondText].map(Number)
  const [year, month, day, hour, minute, second] = parts
  const milliseconds = zone === 'utc'
    ? Date.UTC(year, month - 1, day, hour, minute, second)
    : new Date(year, month - 1, day, hour, minute, second).getTime()
  const normalized = formatDateTime(milliseconds, zone)
  const expected = `${pad(year, 4)}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}:${pad(second)}`
  if (normalized !== expected) throw new Error('日期或时间超出有效范围')
  return milliseconds
}

export type JwtTemporalState = 'valid' | 'expired' | 'not-yet-valid' | 'no-expiry'

export interface JwtTemporalAnalysis {
  state: JwtTemporalState
  title: string
  detail: string
  expiresInSeconds?: number
}

function numericClaim(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function formatDuration(seconds: number) {
  const rounded = Math.max(0, Math.ceil(seconds))
  const days = Math.floor(rounded / 86_400)
  const hours = Math.floor((rounded % 86_400) / 3_600)
  const minutes = Math.floor((rounded % 3_600) / 60)
  if (days >= 365) return `${Math.floor(days / 365)} 年 ${days % 365} 天`
  if (days > 0) return `${days} 天 ${hours} 小时`
  if (hours > 0) return `${hours} 小时 ${minutes} 分钟`
  if (minutes > 0) return `${minutes} 分钟`
  return `${rounded} 秒`
}

export function analyzeJwtClaims(payload: Record<string, unknown>, nowSeconds = Math.floor(Date.now() / 1000)): JwtTemporalAnalysis {
  const notBefore = numericClaim(payload.nbf)
  const expiresAt = numericClaim(payload.exp)
  if (notBefore !== undefined && notBefore > nowSeconds) {
    return {
      state: 'not-yet-valid',
      title: '尚未生效',
      detail: `${formatDuration(notBefore - nowSeconds)}后生效`,
    }
  }
  if (expiresAt !== undefined && expiresAt <= nowSeconds) {
    return {
      state: 'expired',
      title: '已过期',
      detail: `已过期 ${formatDuration(nowSeconds - expiresAt)}`,
      expiresInSeconds: expiresAt - nowSeconds,
    }
  }
  if (expiresAt !== undefined) {
    return {
      state: 'valid',
      title: '时间范围内有效',
      detail: `${formatDuration(expiresAt - nowSeconds)}后过期`,
      expiresInSeconds: expiresAt - nowSeconds,
    }
  }
  return {
    state: 'no-expiry',
    title: '未声明过期时间',
    detail: 'Payload 中没有 exp 字段',
  }
}

export function formatUnixClaim(value: unknown) {
  const numeric = numericClaim(value)
  if (numeric === undefined) return '—'
  try {
    return `${formatDateTime(numeric * 1000, 'local')}（本地）`
  } catch {
    return '时间值超出可显示范围'
  }
}
