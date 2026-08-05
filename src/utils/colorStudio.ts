export interface RgbColor { r: number; g: number; b: number }

export function hexToRgb(hex: string): RgbColor | null {
  const source = hex.trim().replace(/^#/, '')
  const normalized = source.length === 3 ? source.split('').map(char => char + char).join('') : source.slice(0, 6)
  if (!/^[\da-f]{6}$/i.test(normalized)) return null
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

export function rgbToHex({ r, g, b }: RgbColor) {
  const channel = (value: number) => Math.min(255, Math.max(0, Math.round(value))).toString(16).padStart(2, '0')
  return `#${channel(r)}${channel(g)}${channel(b)}`.toUpperCase()
}

export function relativeLuminance(hex: string) {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0
  const channel = (value: number) => {
    const normalized = value / 255
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b)
}

export function contrastRatio(foreground: string, background: string) {
  const first = relativeLuminance(foreground)
  const second = relativeLuminance(background)
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}

export function getContrastChecks(ratio: number) {
  return {
    normalAA: ratio >= 4.5,
    largeAA: ratio >= 3,
    normalAAA: ratio >= 7,
    uiAA: ratio >= 3,
  }
}

export function pickReadableText(background: string) {
  return contrastRatio('#FFFFFF', background) >= contrastRatio('#111827', background) ? '#FFFFFF' : '#111827'
}

function mixHexColors(first: string, second: string, amount: number) {
  const from = hexToRgb(first)
  const to = hexToRgb(second)
  if (!from || !to) return first
  const ratio = Math.min(1, Math.max(0, amount))
  return rgbToHex({
    r: from.r + (to.r - from.r) * ratio,
    g: from.g + (to.g - from.g) * ratio,
    b: from.b + (to.b - from.b) * ratio,
  })
}

export function createColorScale(hex: string) {
  return [
    ['50', mixHexColors(hex, '#FFFFFF', 0.9)],
    ['100', mixHexColors(hex, '#FFFFFF', 0.78)],
    ['200', mixHexColors(hex, '#FFFFFF', 0.62)],
    ['300', mixHexColors(hex, '#FFFFFF', 0.42)],
    ['400', mixHexColors(hex, '#FFFFFF', 0.2)],
    ['500', rgbToHex(hexToRgb(hex) ?? { r: 0, g: 0, b: 0 })],
    ['600', mixHexColors(hex, '#000000', 0.15)],
    ['700', mixHexColors(hex, '#000000', 0.3)],
    ['800', mixHexColors(hex, '#000000', 0.45)],
    ['900', mixHexColors(hex, '#000000', 0.6)],
  ].map(([label, color]) => ({ label, color }))
}
