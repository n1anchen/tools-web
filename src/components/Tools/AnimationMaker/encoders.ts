import { BlobReader, BlobWriter, ZipWriter } from '@zip.js/zip.js'
import gifWorkerUrl from 'modern-gif/worker?url'
import { sanitizeAnimationName } from '@/utils/animationStudio'
import { canvasToBlob, drawNativeFrame, renderFramePixels } from './renderer'
import type { AnimationFormat, AnimationFrameItem, AnimationImageSource, RenderOptions } from './types'

interface EncodeProjectOptions {
  frames: AnimationFrameItem[]
  sources: Map<string, AnimationImageSource>
  render: RenderOptions
  format: AnimationFormat
  maxColors: number
  onProgress?: (value: number, message: string) => void
}

function getSource(sources: Map<string, AnimationImageSource>, frame: AnimationFrameItem) {
  const source = sources.get(frame.sourceId)
  if (!source) throw new Error(`找不到帧素材：${frame.name}`)
  return source
}

async function renderAllFrames(options: EncodeProjectOptions) {
  const buffers: Uint8ClampedArray[] = []
  for (let index = 0; index < options.frames.length; index += 1) {
    const frame = options.frames[index]
    buffers.push(renderFramePixels(getSource(options.sources, frame), frame, options.render))
    options.onProgress?.(Math.round((index + 1) / options.frames.length * 55), `正在渲染第 ${index + 1} 帧`)
    if (index % 4 === 3) await new Promise<void>(resolve => setTimeout(resolve, 0))
  }
  return buffers
}

export async function encodeAnimation(options: EncodeProjectOptions) {
  const pixels = await renderAllFrames(options)
  const delays = options.frames.map(frame => Math.max(10, Math.round(frame.durationMs)))
  options.onProgress?.(62, `正在编码 ${options.format.toUpperCase()}`)

  if (options.format === 'gif') {
    const { encode } = await import('modern-gif')
    const blob = await encode({
      format: 'blob',
      workerUrl: gifWorkerUrl,
      width: options.render.width,
      height: options.render.height,
      looped: true,
      loopCount: 0,
      maxColors: Math.min(255, Math.max(16, Math.round(options.maxColors))),
      dither: 'floyd-steinberg',
      ditherTransparency: 'floyd-steinberg',
      frames: pixels.map((data, index) => ({ data: new Uint8Array(data).buffer, delay: delays[index] })),
    })
    options.onProgress?.(100, 'GIF 编码完成')
    return blob
  }

  const UPNG = await import('upng-js')
  const buffers = pixels.map(data => new Uint8Array(data).buffer)
  const encoded = UPNG.encode(buffers, options.render.width, options.render.height, 0, delays)
  options.onProgress?.(100, `${options.format === 'png' ? 'PNG' : 'APNG'} 编码完成`)
  return new Blob([encoded], { type: options.format === 'png' ? 'image/png' : 'image/apng' })
}

export async function encodePngSequence(
  frames: AnimationFrameItem[],
  sources: Map<string, AnimationImageSource>,
  baseName: string,
  onProgress?: (value: number, message: string) => void,
) {
  if (!frames.length) throw new Error('没有可以导出的素材')
  const zip = new ZipWriter(new BlobWriter('application/zip'))
  const canvas = document.createElement('canvas')
  try {
    for (let index = 0; index < frames.length; index += 1) {
      const frame = frames[index]
      drawNativeFrame(canvas, getSource(sources, frame), frame)
      const blob = await canvasToBlob(canvas)
      const order = String(index + 1).padStart(Math.max(3, String(frames.length).length), '0')
      const location = frame.row !== undefined && frame.column !== undefined
        ? `-r${frame.row + 1}c${frame.column + 1}`
        : ''
      await zip.add(`${sanitizeAnimationName(baseName)}-${order}${location}.png`, new BlobReader(blob))
      onProgress?.(Math.round((index + 1) / frames.length * 95), `正在打包第 ${index + 1} 张图片`)
    }
    const result = await zip.close()
    onProgress?.(100, 'PNG 序列已打包')
    return result
  } catch (error) {
    await zip.close().catch(() => undefined)
    throw error
  } finally {
    canvas.width = 1
    canvas.height = 1
  }
}
