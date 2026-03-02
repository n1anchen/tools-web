export type DecodeMethod = 'black' | 'white' | 'transparent' | 'ltavg'

/** 核心算法：显形（解码） */
export function prismDecode(
  src: ImageData,
  lowerThreshold: number,
  higherThreshold: number,
  method: DecodeMethod
): ImageData {
  const { data, width, height } = src
  const newData = new Uint8ClampedArray(data.length)

  if (higherThreshold <= lowerThreshold) {
    for (let i = 0; i < newData.length; i += 4) {
      newData[i + 3] = data[i + 3]
    }
    return new ImageData(newData, width, height)
  }

  const scaleRatio = 255 / (higherThreshold - lowerThreshold)
  const scale = (v: number) => Math.max(Math.min((v - lowerThreshold) * scaleRatio, 255), 0)

  const processCover = (i: number) => {
    if (method === 'black') {
      newData[i] = 0; newData[i + 1] = 0; newData[i + 2] = 0; newData[i + 3] = 255
    } else if (method === 'white') {
      newData[i] = 255; newData[i + 1] = 255; newData[i + 2] = 255; newData[i + 3] = 255
    } else if (method === 'transparent') {
      newData[i] = 0; newData[i + 1] = 0; newData[i + 2] = 0; newData[i + 3] = 0
    } else { // ltavg
      const idx = i / 4
      if (idx === 0) {
        newData[i] = 0; newData[i + 1] = 0; newData[i + 2] = 0; newData[i + 3] = 255; return
      }
      const top = i - width * 4
      const isFirstRow = top < 0
      const isFirstCol = idx % width === 0
      if (isFirstRow) {
        const l = i - 4
        newData[i] = newData[l]; newData[i + 1] = newData[l + 1]
        newData[i + 2] = newData[l + 2]; newData[i + 3] = newData[l + 3]
      } else if (isFirstCol) {
        newData[i] = newData[top]; newData[i + 1] = newData[top + 1]
        newData[i + 2] = newData[top + 2]; newData[i + 3] = newData[top + 3]
      } else {
        const left = i - 4, lt = i - width * 4 - 4
        newData[i] = (newData[left] + newData[top] + newData[lt]) / 3
        newData[i + 1] = (newData[left + 1] + newData[top + 1] + newData[lt + 1]) / 3
        newData[i + 2] = (newData[left + 2] + newData[top + 2] + newData[lt + 2]) / 3
        newData[i + 3] = (newData[left + 3] + newData[top + 3] + newData[lt + 3]) / 3
      }
    }
  }

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2]
    const l = r * 0.299 + g * 0.587 + b * 0.114
    if (l >= lowerThreshold && l <= higherThreshold) {
      newData[i] = scale(r); newData[i + 1] = scale(g)
      newData[i + 2] = scale(b); newData[i + 3] = data[i + 3]
    } else {
      processCover(i)
    }
  }
  return new ImageData(newData, width, height)
}

/** 核心算法：制作（编码） */
export function prismEncode(
  innerData: ImageData,
  coverData: ImageData,  // 已调整至与 innerData 同尺寸
  innerThreshold: number,
  coverThreshold: number,
  slope: number,
  gap: number,
  isRow: boolean,
  isReverse: boolean
): ImageData {
  const { width, height } = innerData
  const result = new Uint8ClampedArray(innerData.data.length)

  const isCoverPixel = (x: number, y: number) => {
    if (slope === 0) return (isRow ? y : x) % (gap + 1) < gap
    if (isRow) return (y / slope + x) % (gap + 1) < gap
    return (x / slope + y) % (gap + 1) < gap
  }

  const scaleInner = (v: number, t: number) =>
    isReverse ? Math.floor(255 - t + (v * t) / 255) : Math.floor((v * t) / 255)
  const scaleCover = (v: number, t: number) =>
    isReverse ? Math.floor((v * (255 - t)) / 255) : Math.floor(t + (v * (255 - t)) / 255)

  let x = 0, y = 0
  for (let i = 0; i < innerData.data.length; i += 4) {
    if (isCoverPixel(x, y)) {
      result[i] = scaleCover(coverData.data[i], coverThreshold)
      result[i + 1] = scaleCover(coverData.data[i + 1], coverThreshold)
      result[i + 2] = scaleCover(coverData.data[i + 2], coverThreshold)
      result[i + 3] = coverData.data[i + 3]
    } else {
      result[i] = scaleInner(innerData.data[i], innerThreshold)
      result[i + 1] = scaleInner(innerData.data[i + 1], innerThreshold)
      result[i + 2] = scaleInner(innerData.data[i + 2], innerThreshold)
      result[i + 3] = innerData.data[i + 3]
    }
    x++
    if (x >= width) { x = 0; y++ }
  }
  return new ImageData(result, width, height)
}
