export type LogoShape = 'auto' | 'square' | 'circle'

export interface SplitLogoLayoutInput {
  leftWidth: number
  rightWidth: number
  fontSize: number
  paddingX: number
  paddingY: number
  gap: number
  margin: number
  shape: LogoShape
}

export interface SplitLogoLayout {
  canvasWidth: number
  canvasHeight: number
  contentWidth: number
  rightBoxWidth: number
  rightBoxHeight: number
  startX: number
  textY: number
  boxX: number
  boxY: number
}

export function calculateSplitLogoLayout(input: SplitLogoLayoutInput): SplitLogoLayout {
  const fontSize = Math.max(1, input.fontSize)
  const paddingX = Math.max(0, input.paddingX)
  const paddingY = Math.max(0, input.paddingY)
  const margin = Math.max(0, input.margin)
  const leftWidth = Math.max(0, input.leftWidth)
  const rightWidth = Math.max(0, input.rightWidth)
  const gap = leftWidth > 0 && rightWidth > 0 ? Math.max(0, input.gap) : 0
  const rightBoxWidth = rightWidth > 0 ? rightWidth + paddingX * 2 : 0
  const rightBoxHeight = rightWidth > 0 ? fontSize + paddingY * 2 : fontSize + paddingY * 2
  const contentWidth = leftWidth + gap + rightBoxWidth
  let canvasWidth = Math.max(1, Math.ceil(contentWidth + margin * 2))
  let canvasHeight = Math.max(1, Math.ceil(rightBoxHeight + margin * 2))

  if (input.shape === 'square') {
    const size = Math.max(canvasWidth, canvasHeight)
    canvasWidth = size
    canvasHeight = size
  } else if (input.shape === 'circle') {
    const diameter = Math.ceil(Math.max(canvasWidth, canvasHeight) * 1.2)
    canvasWidth = diameter
    canvasHeight = diameter
  }

  const startX = (canvasWidth - contentWidth) / 2
  const textY = canvasHeight / 2
  const boxX = startX + leftWidth + gap
  const boxY = (canvasHeight - rightBoxHeight) / 2
  return { canvasWidth, canvasHeight, contentWidth, rightBoxWidth, rightBoxHeight, startX, textY, boxX, boxY }
}

export function getScaledDimensions(width: number, height: number, scale: number) {
  const safeScale = Math.max(1, Math.min(4, Math.round(scale)))
  return {
    width: Math.max(1, Math.round(width * safeScale)),
    height: Math.max(1, Math.round(height * safeScale)),
    scale: safeScale,
  }
}

export function buildLogoFilename(parts: string[], suffix = 'logo') {
  const base = parts
    .map(part => part.trim())
    .filter(Boolean)
    .join('-')
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 72)
  const normalizedSuffix = suffix.replace(/[^\w-]+/g, '-').replace(/^-|-$/g, '') || 'logo'
  return `${base || 'untitled'}-${normalizedSuffix}.png`
}

export function canvasToPngBlob(canvas: HTMLCanvasElement, scale = 1): Promise<Blob> {
  const dimensions = getScaledDimensions(canvas.width, canvas.height, scale)
  const output = dimensions.scale === 1 ? canvas : document.createElement('canvas')
  if (dimensions.scale !== 1) {
    output.width = dimensions.width
    output.height = dimensions.height
    const context = output.getContext('2d')
    if (!context) return Promise.reject(new Error('Canvas context unavailable'))
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(canvas, 0, 0, output.width, output.height)
  }
  return new Promise((resolve, reject) => {
    output.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG encoding failed')), 'image/png')
  })
}

