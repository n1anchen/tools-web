import { getContainDrawPlan } from '@/utils/animationStudio'
import type { AnimationFrameItem, AnimationImageSource, RenderOptions } from './types'

export function drawAnimationFrame(
  canvas: HTMLCanvasElement,
  source: AnimationImageSource,
  frame: AnimationFrameItem,
  options: RenderOptions,
) {
  if (canvas.width !== options.width) canvas.width = options.width
  if (canvas.height !== options.height) canvas.height = options.height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('浏览器无法创建画布')
  context.clearRect(0, 0, canvas.width, canvas.height)
  if (options.includeBackground) {
    context.fillStyle = options.backgroundColor
    context.fillRect(0, 0, canvas.width, canvas.height)
  }
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  const draw = getContainDrawPlan(frame.sourceRect.width, frame.sourceRect.height, options.width, options.height)
  context.drawImage(
    source.image,
    frame.sourceRect.x,
    frame.sourceRect.y,
    frame.sourceRect.width,
    frame.sourceRect.height,
    draw.dx,
    draw.dy,
    draw.dw,
    draw.dh,
  )
  return context
}

export function drawNativeFrame(canvas: HTMLCanvasElement, source: AnimationImageSource, frame: AnimationFrameItem) {
  canvas.width = frame.sourceRect.width
  canvas.height = frame.sourceRect.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('浏览器无法创建画布')
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.drawImage(
    source.image,
    frame.sourceRect.x,
    frame.sourceRect.y,
    frame.sourceRect.width,
    frame.sourceRect.height,
    0,
    0,
    canvas.width,
    canvas.height,
  )
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png', quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('图片编码失败')), type, quality)
  })
}

export function loadImageBlob(blob: Blob) {
  return new Promise<{ image: HTMLImageElement; url: string }>((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => resolve({ image, url })
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片无法读取或格式不受支持'))
    }
    image.src = url
  })
}

export function renderFramePixels(
  source: AnimationImageSource,
  frame: AnimationFrameItem,
  options: RenderOptions,
) {
  const canvas = document.createElement('canvas')
  const context = drawAnimationFrame(canvas, source, frame, options)
  return new Uint8ClampedArray(context.getImageData(0, 0, canvas.width, canvas.height).data)
}
