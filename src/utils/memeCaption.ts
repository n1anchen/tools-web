export type CaptionPlacement = 'top' | 'bottom'

export interface CaptionLayout {
  lineHeight: number
  barHeight: number
  barY: number
  maxOffset: number
}

export function wrapCaptionText(
  text: string,
  maxWidth: number,
  measure: (value: string) => number,
  maxLines = 5,
): string[] {
  const lines: string[] = []
  for (const paragraph of text.replace(/\r/g, '').split('\n')) {
    if (!paragraph.trim()) continue
    let line = ''
    for (const character of paragraph) {
      const candidate = line + character
      if (line && measure(candidate) > maxWidth) {
        lines.push(line.trim())
        line = character.trimStart()
        if (lines.length >= maxLines) break
      } else {
        line = candidate
      }
    }
    if (lines.length >= maxLines) break
    if (line.trim()) lines.push(line.trim())
    if (lines.length >= maxLines) break
  }
  return lines.slice(0, Math.max(1, maxLines))
}

export function calculateCaptionLayout(options: {
  canvasHeight: number
  fontSize: number
  lineCount: number
  padding: number
  offset: number
  placement: CaptionPlacement
}): CaptionLayout {
  const lineHeight = Math.max(1, options.fontSize * 1.3)
  const barHeight = options.lineCount > 0 ? lineHeight * options.lineCount + Math.max(0, options.padding) * 2 : 0
  const maxOffset = Math.max(0, options.canvasHeight - barHeight)
  const offset = Math.min(maxOffset, Math.max(0, options.offset))
  return {
    lineHeight,
    barHeight,
    barY: options.placement === 'top' ? offset : options.canvasHeight - offset - barHeight,
    maxOffset,
  }
}

export function getMemeOutputDimensions(width: number, height: number, divisor: number) {
  const safeDivisor = Math.max(1, Math.round(divisor))
  return {
    width: Math.max(1, Math.round(width / safeDivisor)),
    height: Math.max(1, Math.round(height / safeDivisor)),
  }
}

export function buildMemeFilename(sourceName: string, format: 'jpeg' | 'png') {
  const basename = sourceName.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]/g, '-').trim().slice(0, 48) || 'meme'
  return `${basename}-caption.${format === 'jpeg' ? 'jpg' : 'png'}`
}
