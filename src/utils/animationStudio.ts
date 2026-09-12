export interface AnimationRect {
  x: number
  y: number
  width: number
  height: number
}

export interface SpriteSliceRect extends AnimationRect {
  row: number
  column: number
  index: number
}

export interface ContainDrawPlan {
  dx: number
  dy: number
  dw: number
  dh: number
}

function safeInteger(value: number, fallback = 1) {
  if (!Number.isFinite(value)) return fallback
  return Math.max(1, Math.round(value))
}

export function clampDurationMs(value: number, fallback = 100) {
  if (!Number.isFinite(value)) return fallback
  return Math.min(60_000, Math.max(10, value))
}

export function framesToMilliseconds(frames: number, fps: number) {
  return clampDurationMs(safeInteger(frames) * 1000 / Math.min(120, Math.max(1, safeInteger(fps, 24))))
}

export function millisecondsToFrames(milliseconds: number, fps: number) {
  return Math.max(1, Math.round(clampDurationMs(milliseconds) * Math.min(120, Math.max(1, safeInteger(fps, 24))) / 1000))
}

export function buildTimelineEnds(durations: number[]) {
  let elapsed = 0
  return durations.map(duration => {
    elapsed += clampDurationMs(duration)
    return elapsed
  })
}

export function findFrameAtTime(timelineEnds: number[], timeMs: number) {
  if (!timelineEnds.length) return -1
  const duration = timelineEnds[timelineEnds.length - 1]
  const safeTime = Math.min(Math.max(0, Number.isFinite(timeMs) ? timeMs : 0), Math.max(0, duration - Number.EPSILON))
  let low = 0
  let high = timelineEnds.length - 1
  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    if (safeTime < timelineEnds[middle]) high = middle
    else low = middle + 1
  }
  return low
}

export function buildSpriteRects(
  imageWidth: number,
  imageHeight: number,
  crop: AnimationRect,
  cellWidth: number,
  cellHeight: number,
): SpriteSliceRect[] {
  const width = safeInteger(imageWidth)
  const height = safeInteger(imageHeight)
  const x = Math.min(width - 1, Math.max(0, Math.round(crop.x)))
  const y = Math.min(height - 1, Math.max(0, Math.round(crop.y)))
  const cropWidth = Math.min(width - x, safeInteger(crop.width))
  const cropHeight = Math.min(height - y, safeInteger(crop.height))
  const frameWidth = Math.min(cropWidth, safeInteger(cellWidth))
  const frameHeight = Math.min(cropHeight, safeInteger(cellHeight))
  const columns = Math.floor(cropWidth / frameWidth)
  const rows = Math.floor(cropHeight / frameHeight)
  const rects: SpriteSliceRect[] = []

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      rects.push({
        row,
        column,
        index: row * columns + column,
        x: x + column * frameWidth,
        y: y + row * frameHeight,
        width: frameWidth,
        height: frameHeight,
      })
    }
  }
  return rects
}

export function getSpriteRemainder(crop: AnimationRect, cellWidth: number, cellHeight: number) {
  const width = safeInteger(crop.width)
  const height = safeInteger(crop.height)
  const frameWidth = Math.min(width, safeInteger(cellWidth))
  const frameHeight = Math.min(height, safeInteger(cellHeight))
  return { right: width % frameWidth, bottom: height % frameHeight }
}

export function getContainDrawPlan(sourceWidth: number, sourceHeight: number, canvasWidth: number, canvasHeight: number): ContainDrawPlan {
  const sw = safeInteger(sourceWidth)
  const sh = safeInteger(sourceHeight)
  const cw = safeInteger(canvasWidth)
  const ch = safeInteger(canvasHeight)
  const scale = Math.min(cw / sw, ch / sh)
  const dw = Math.max(1, Math.round(sw * scale))
  const dh = Math.max(1, Math.round(sh * scale))
  return {
    dx: Math.round((cw - dw) / 2),
    dy: Math.round((ch - dh) / 2),
    dw,
    dh,
  }
}

export function naturalCompare(left: string, right: string) {
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' })
}

export function formatDuration(milliseconds: number) {
  const seconds = Math.max(0, Number.isFinite(milliseconds) ? milliseconds : 0) / 1000
  return `${seconds < 10 ? seconds.toFixed(2) : seconds.toFixed(1)} 秒`
}

export function sanitizeAnimationName(value: string, fallback = 'animation') {
  const cleaned = value
    .replace(/\.[^.]+$/, '')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned || fallback
}
