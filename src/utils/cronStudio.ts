export type CronCycle = 'everyMinute' | 'everyHour' | 'everyDay' | 'weekdays' | 'everyWeek' | 'everyMonth' | 'everyNSeconds' | 'everyNMinutes' | 'everyNHours' | 'everyNDays'

interface CronBuilderSettings {
  cycle: CronCycle
  minute?: number
  hour?: number
  dayOfWeek?: number
  dayOfMonth?: number
  interval?: number
}

interface CronFieldInfo {
  key: string
  label: string
  value: string
  hint: string
}

const FIELD_DEFINITIONS = {
  second: ['second', '秒', '0–59'],
  minute: ['minute', '分钟', '0–59'],
  hour: ['hour', '小时', '0–23'],
  dayOfMonth: ['dayOfMonth', '日期', '1–31'],
  month: ['month', '月份', '1–12 或 JAN–DEC'],
  dayOfWeek: ['dayOfWeek', '星期', '0–7 或 SUN–SAT'],
} as const

function bounded(value: number | undefined, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.round(value as number)))
}

export function buildCronExpression(settings: CronBuilderSettings) {
  const minute = bounded(settings.minute, 0, 59, 0)
  const hour = bounded(settings.hour, 0, 23, 9)
  const interval = bounded(settings.interval, 1, 59, 1)
  switch (settings.cycle) {
    case 'everyMinute': return '* * * * *'
    case 'everyHour': return `${minute} * * * *`
    case 'everyDay': return `${minute} ${hour} * * *`
    case 'weekdays': return `${minute} ${hour} * * 1-5`
    case 'everyWeek': return `${minute} ${hour} * * ${bounded(settings.dayOfWeek, 0, 6, 1)}`
    case 'everyMonth': return `${minute} ${hour} ${bounded(settings.dayOfMonth, 1, 31, 1)} * *`
    case 'everyNSeconds': return `*/${bounded(settings.interval, 1, 59, 5)} * * * * *`
    case 'everyNMinutes': return `*/${interval} * * * *`
    case 'everyNHours': return `${minute} */${bounded(settings.interval, 1, 23, 2)} * * *`
    case 'everyNDays': return `${minute} ${hour} */${bounded(settings.interval, 1, 31, 2)} * *`
  }
}

export function inspectCronFields(expression: string) {
  const parts = expression.trim().split(/\s+/).filter(Boolean)
  if (![5, 6].includes(parts.length)) return { dialect: '格式待确认', fields: [] as CronFieldInfo[] }
  const definitions = parts.length === 6
    ? [FIELD_DEFINITIONS.second, FIELD_DEFINITIONS.minute, FIELD_DEFINITIONS.hour, FIELD_DEFINITIONS.dayOfMonth, FIELD_DEFINITIONS.month, FIELD_DEFINITIONS.dayOfWeek]
    : [FIELD_DEFINITIONS.minute, FIELD_DEFINITIONS.hour, FIELD_DEFINITIONS.dayOfMonth, FIELD_DEFINITIONS.month, FIELD_DEFINITIONS.dayOfWeek]
  const fields = definitions.map(([key, label, hint], index) => ({ key, label, hint, value: parts[index] }))
  return { dialect: parts.length === 6 ? '6 位 · 含秒' : '5 位 · 标准', fields }
}

export const CRON_PRESETS = [
  { label: '每分钟', note: '持续轮询', expression: '* * * * *' },
  { label: '每 5 分钟', note: '常用巡检', expression: '*/5 * * * *' },
  { label: '每天 09:00', note: '日报任务', expression: '0 9 * * *' },
  { label: '工作日 09:30', note: '办公提醒', expression: '30 9 * * 1-5' },
  { label: '每周一 10:00', note: '周报任务', expression: '0 10 * * 1' },
  { label: '每月 1 日', note: '月度归档', expression: '0 0 1 * *' },
]
