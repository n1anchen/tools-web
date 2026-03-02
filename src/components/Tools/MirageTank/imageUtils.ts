export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = reader.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function getImageData(img: HTMLImageElement): ImageData {
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}

/** 双线性插值缩放，使用 cover 模式（裁切居中）以匹配目标尺寸 */
export function resizeCover(src: ImageData, targetW: number, targetH: number): ImageData {
  const { width: sw, height: sh, data: sd } = src
  if (sw === targetW && sh === targetH) return new ImageData(sd.slice(), sw, sh)

  const origAspect = sw / sh
  const targetAspect = targetW / targetH

  let resW: number, resH: number, offX = 0, offY = 0
  if (origAspect > targetAspect) {
    resH = targetH
    resW = Math.max(Math.round(targetH * origAspect), targetW)
    offX = Math.floor((resW - targetW) / 2)
  } else {
    resW = targetW
    resH = Math.max(Math.round(targetW / origAspect), targetH)
    offY = Math.floor((resH - targetH) / 2)
  }

  const result = new Uint8ClampedArray(targetW * targetH * 4)
  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const srcXf = ((x + offX) * (sw - 1)) / (resW - 1)
      const srcYf = ((y + offY) * (sh - 1)) / (resH - 1)
      const x0 = Math.floor(srcXf), y0 = Math.floor(srcYf)
      const x1 = Math.min(x0 + 1, sw - 1), y1 = Math.min(y0 + 1, sh - 1)
      const wx = srcXf - x0, wy = srcYf - y0
      for (let c = 0; c < 4; c++) {
        const v =
          (1 - wx) * (1 - wy) * sd[(y0 * sw + x0) * 4 + c] +
          wx * (1 - wy) * sd[(y0 * sw + x1) * 4 + c] +
          (1 - wx) * wy * sd[(y1 * sw + x0) * 4 + c] +
          wx * wy * sd[(y1 * sw + x1) * 4 + c]
        result[(y * targetW + x) * 4 + c] = Math.round(v)
      }
    }
  }
  return new ImageData(result, targetW, targetH)
}

/** 对比度调整 */
export function adjustContrast(contrast: number, src: ImageData): ImageData {
  const d = new Uint8ClampedArray(src.data.length)
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast))
  for (let i = 0; i < src.data.length; i += 4) {
    d[i]     = Math.min(Math.max(0, factor * (src.data[i]     - 128) + 128), 255)
    d[i + 1] = Math.min(Math.max(0, factor * (src.data[i + 1] - 128) + 128), 255)
    d[i + 2] = Math.min(Math.max(0, factor * (src.data[i + 2] - 128) + 128), 255)
    d[i + 3] = src.data[i + 3]
  }
  return new ImageData(d, src.width, src.height)
}

/** 灰度化（亮度权重法） */
export function toGray(src: ImageData): ImageData {
  const d = new Uint8ClampedArray(src.data.length)
  for (let i = 0; i < src.data.length; i += 4) {
    const g = src.data[i] * 0.299 + src.data[i + 1] * 0.587 + src.data[i + 2] * 0.114
    d[i] = d[i + 1] = d[i + 2] = g
    d[i + 3] = src.data[i + 3]
  }
  return new ImageData(d, src.width, src.height)
}

/** 将 ImageData 绘制到 canvas */
export function drawToCanvas(canvas: HTMLCanvasElement, imgData: ImageData) {
  canvas.width = imgData.width
  canvas.height = imgData.height
  canvas.getContext('2d')!.putImageData(imgData, 0, 0)
}
