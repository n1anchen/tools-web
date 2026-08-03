export type WatermarkPosition = 'topLeft' | 'topRight' | 'center' | 'bottomLeft' | 'bottomRight' | 'tile'
export type StitchMode = 'vertical' | 'horizontal' | 'caption'

export interface ImageSize {
  width: number
  height: number
}

export interface SliceRect {
  row: number
  column: number
  x: number
  y: number
  width: number
  height: number
}

export interface StitchDraw {
  imageIndex: number
  sx: number
  sy: number
  sw: number
  sh: number
  dx: number
  dy: number
  dw: number
  dh: number
}

export interface StitchPlan {
  width: number
  height: number
  draws: StitchDraw[]
}

export interface WatermarkPoint {
  x: number
  y: number
}

function positiveInteger(value: number, fallback = 1) {
  if (!Number.isFinite(value)) return fallback
  return Math.max(1, Math.round(value))
}

export function buildSliceRects(width: number, height: number, rows: number, columns: number): SliceRect[] {
  const safeWidth = positiveInteger(width)
  const safeHeight = positiveInteger(height)
  const safeRows = Math.min(safeHeight, positiveInteger(rows))
  const safeColumns = Math.min(safeWidth, positiveInteger(columns))
  const results: SliceRect[] = []

  for (let row = 0; row < safeRows; row += 1) {
    const top = Math.round(row * safeHeight / safeRows)
    const bottom = Math.round((row + 1) * safeHeight / safeRows)
    for (let column = 0; column < safeColumns; column += 1) {
      const left = Math.round(column * safeWidth / safeColumns)
      const right = Math.round((column + 1) * safeWidth / safeColumns)
      results.push({
        row,
        column,
        x: left,
        y: top,
        width: Math.max(1, right - left),
        height: Math.max(1, bottom - top),
      })
    }
  }

  return results
}

export function getRotatedBounds(width: number, height: number, angleDegrees: number): ImageSize {
  const radians = Math.abs(angleDegrees % 180) * Math.PI / 180
  const cos = Math.abs(Math.cos(radians))
  const sin = Math.abs(Math.sin(radians))
  return {
    width: Math.ceil(width * cos + height * sin),
    height: Math.ceil(width * sin + height * cos),
  }
}

export function getWatermarkPlacements(
  canvasWidth: number,
  canvasHeight: number,
  markWidth: number,
  markHeight: number,
  position: WatermarkPosition,
  padding = 24,
  tileGap = 80,
): WatermarkPoint[] {
  const width = positiveInteger(canvasWidth)
  const height = positiveInteger(canvasHeight)
  const safeMarkWidth = Math.min(width, positiveInteger(markWidth))
  const safeMarkHeight = Math.min(height, positiveInteger(markHeight))
  const safePadding = Math.max(0, Math.min(padding, width / 2, height / 2))
  const left = Math.min(width / 2, safePadding + safeMarkWidth / 2)
  const right = Math.max(width / 2, width - safePadding - safeMarkWidth / 2)
  const top = Math.min(height / 2, safePadding + safeMarkHeight / 2)
  const bottom = Math.max(height / 2, height - safePadding - safeMarkHeight / 2)

  if (position === 'topLeft') return [{ x: left, y: top }]
  if (position === 'topRight') return [{ x: right, y: top }]
  if (position === 'bottomLeft') return [{ x: left, y: bottom }]
  if (position === 'bottomRight') return [{ x: right, y: bottom }]
  if (position === 'center') return [{ x: width / 2, y: height / 2 }]

  const points: WatermarkPoint[] = []
  const stepX = Math.max(1, safeMarkWidth + Math.max(12, tileGap))
  const stepY = Math.max(1, safeMarkHeight + Math.max(12, tileGap * .75))
  let row = 0
  for (let y = top; y <= height - safeMarkHeight / 2; y += stepY) {
    const offset = row % 2 === 0 ? 0 : stepX / 2
    for (let x = left - offset; x <= width - safeMarkWidth / 2; x += stepX) {
      if (x >= safeMarkWidth / 2) points.push({ x, y })
    }
    row += 1
  }
  return points.length ? points : [{ x: width / 2, y: height / 2 }]
}

export function buildStitchPlan(
  images: ImageSize[],
  mode: StitchMode,
  gap = 0,
  captionRange: [number, number] = [70, 95],
): StitchPlan {
  const safeImages = images
    .map(image => ({ width: positiveInteger(image.width), height: positiveInteger(image.height) }))
    .filter(image => image.width > 0 && image.height > 0)
  if (!safeImages.length) return { width: 0, height: 0, draws: [] }

  const safeGap = Math.max(0, Math.round(gap))
  const draws: StitchDraw[] = []

  if (mode === 'horizontal') {
    const height = Math.min(...safeImages.map(image => image.height))
    let x = 0
    safeImages.forEach((image, imageIndex) => {
      const width = Math.max(1, Math.round(image.width * height / image.height))
      draws.push({ imageIndex, sx: 0, sy: 0, sw: image.width, sh: image.height, dx: x, dy: 0, dw: width, dh: height })
      x += width + safeGap
    })
    return { width: x - safeGap, height, draws }
  }

  const width = Math.min(...safeImages.map(image => image.width))
  if (mode === 'vertical') {
    let y = 0
    safeImages.forEach((image, imageIndex) => {
      const height = Math.max(1, Math.round(image.height * width / image.width))
      draws.push({ imageIndex, sx: 0, sy: 0, sw: image.width, sh: image.height, dx: 0, dy: y, dw: width, dh: height })
      y += height + safeGap
    })
    return { width, height: y - safeGap, draws }
  }

  const start = Math.max(0, Math.min(100, Math.min(...captionRange)))
  const end = Math.max(start, Math.min(100, Math.max(...captionRange)))
  let y = 0
  safeImages.forEach((image, imageIndex) => {
    const isFirst = imageIndex === 0
    const isLast = imageIndex === safeImages.length - 1
    const sy = safeImages.length === 1 || isFirst ? 0 : Math.round(image.height * start / 100)
    const bottom = safeImages.length === 1 || isLast ? image.height : Math.round(image.height * end / 100)
    const sh = Math.max(1, bottom - sy)
    const height = Math.max(1, Math.round(sh * width / image.width))
    draws.push({ imageIndex, sx: 0, sy, sw: image.width, sh, dx: 0, dy: y, dw: width, dh: height })
    y += height
  })
  return { width, height: y, draws }
}

export function exceedsPixelBudget(width: number, height: number, limit = 80_000_000) {
  return Math.max(0, width) * Math.max(0, height) > limit
}
