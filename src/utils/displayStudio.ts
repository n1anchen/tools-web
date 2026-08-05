import { contrastRatio, hexToRgb } from './colorStudio.ts'

export interface AsciiMetrics {
  rows: number
  columns: number
  characters: number
  bytes: number
}

export interface ContrastSummary {
  ratio: number
  level: 'excellent' | 'good' | 'low'
  label: string
}

export function getAsciiMetrics(value: string): AsciiMetrics {
  if (!value) return { rows: 0, columns: 0, characters: 0, bytes: 0 }

  const normalized = value.replace(/\r\n?/g, '\n').replace(/\n$/, '')
  const lines = normalized.split('\n')
  return {
    rows: lines.length,
    columns: Math.max(0, ...lines.map(line => Array.from(line).length)),
    characters: Array.from(normalized).filter(character => character !== '\n').length,
    bytes: new TextEncoder().encode(value).length,
  }
}

export function normalizeBarrageMessages(value: string, limit = 12, maxLength = 80): string[] {
  const normalizedLimit = Math.max(1, Math.floor(limit))
  const normalizedMaxLength = Math.max(1, Math.floor(maxLength))
  return value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(message => message.trim())
    .filter(Boolean)
    .slice(0, normalizedLimit)
    .map(message => Array.from(message).slice(0, normalizedMaxLength).join(''))
}

export function estimateBarrageDuration(
  messages: string[],
  fontSize: number,
  speed: number,
  viewportWidth = 1280,
): number {
  const contentLength = Array.from(messages.join(' ✦ ')).length
  const safeFontSize = Math.max(12, Number.isFinite(fontSize) ? fontSize : 12)
  const safeSpeed = Math.max(1, Number.isFinite(speed) ? speed : 1)
  const safeViewport = Math.max(240, Number.isFinite(viewportWidth) ? viewportWidth : 1280)
  const estimatedContentWidth = Math.max(safeFontSize * 2, contentLength * safeFontSize * 0.72)
  return Math.round(Math.min(120, Math.max(3, (safeViewport + estimatedContentWidth) / safeSpeed)) * 10) / 10
}

export function getContrastSummary(foreground: string, background: string): ContrastSummary {
  const foregroundRgb = hexToRgb(foreground)
  const backgroundRgb = hexToRgb(background)
  if (!foregroundRgb || !backgroundRgb) return { ratio: 1, level: 'low', label: '颜色格式无效' }

  const ratio = contrastRatio(foreground, background)
  const rounded = Math.round(ratio * 100) / 100
  if (ratio >= 7) return { ratio: rounded, level: 'excellent', label: '高对比，远距离清晰' }
  if (ratio >= 4.5) return { ratio: rounded, level: 'good', label: '对比良好' }
  return { ratio: rounded, level: 'low', label: '对比较低，建议换色' }
}

