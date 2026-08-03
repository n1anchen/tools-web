export interface FontSampleMetrics {
  characters: number
  lines: number
  hanCharacters: number
  latinLetters: number
  digits: number
}

export interface FontCssSettings {
  family: string
  size: number
  weight: number
  style: 'normal' | 'italic'
  lineHeight: number
  letterSpacing: number
  color: string
}

export function analyzeFontSample(text: string): FontSampleMetrics {
  return {
    characters: [...text.replace(/\r?\n/g, '')].length,
    lines: text ? text.split(/\r?\n/).length : 0,
    hanCharacters: (text.match(/[\p{Script=Han}]/gu) || []).length,
    latinLetters: (text.match(/[A-Za-z]/g) || []).length,
    digits: (text.match(/\d/g) || []).length,
  }
}

export function quoteFontFamily(family: string): string {
  const trimmed = family.trim()
  if (!trimmed) return 'sans-serif'
  if (/^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-serif|ui-sans-serif|ui-monospace)$/i.test(trimmed)) {
    return trimmed
  }
  return `"${trimmed.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

export function buildFontCss(settings: FontCssSettings): string {
  return [
    `font-family: ${settings.family};`,
    `font-size: ${Math.max(1, Math.round(settings.size))}px;`,
    `font-weight: ${Math.min(900, Math.max(100, Math.round(settings.weight / 100) * 100))};`,
    `font-style: ${settings.style};`,
    `line-height: ${Math.max(0.8, settings.lineHeight).toFixed(2)};`,
    `letter-spacing: ${settings.letterSpacing.toFixed(1)}px;`,
    `color: ${settings.color.toUpperCase()};`,
  ].join('\n')
}
