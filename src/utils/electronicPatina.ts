interface PatinaProfile {
  score: number
  label: '轻微做旧' | '经典包浆' | '重度失真' | '极限包浆'
  description: string
}

export function calculatePatinaScore(compressionCount: number, quality: number): number {
  const passes = Math.min(100, Math.max(1, compressionCount))
  const safeQuality = Math.min(99, Math.max(1, quality))
  const damage = passes * (1.15 - safeQuality / 115)
  return Math.min(100, Math.max(1, Math.round(damage * 2.15)))
}

export function getPatinaProfile(compressionCount: number, quality: number): PatinaProfile {
  const score = calculatePatinaScore(compressionCount, quality)
  if (score < 24) return { score, label: '轻微做旧', description: '保留主体细节，只增加轻微色偏与压缩痕迹' }
  if (score < 52) return { score, label: '经典包浆', description: '绿色偏移和 JPEG 痕迹较明显，适合常规梗图' }
  if (score < 78) return { score, label: '重度失真', description: '颜色与边缘明显劣化，呈现多次转发后的质感' }
  return { score, label: '极限包浆', description: '强烈色偏和像素损伤，适合夸张实验效果' }
}

export function applyPatinaPixels(data: Uint8ClampedArray): Uint8ClampedArray {
  const clamp = (value: number) => value >= 0 ? (value <= 255 ? value : 255) : 0
  const clampUv = (value: number) => value >= -128 ? (value <= 127 ? value : 127) : -128
  for (let index = 0; index < data.length; index += 4) {
    const r = data[index]
    const g = data[index + 1]
    const b = data[index + 2]
    const y = clamp((77 * r + 150 * g + 29 * b) >> 8)
    const u = clampUv(((-43 * r - 85 * g + 128 * b) >> 8) - 1)
    const v = clampUv(((128 * r - 107 * g - 21 * b) >> 8) - 1)
    data[index] = clamp((65536 * y + 91881 * v) >> 16)
    data[index + 1] = clamp((65536 * y - 22553 * u - 46802 * v) >> 16)
    data[index + 2] = clamp((65536 * y + 116130 * u) >> 16)
  }
  return data
}

export function buildPatinaFilename(sourceName: string, count: number, quality: number): string {
  const basename = sourceName.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]/g, '-').trim().slice(0, 42) || 'image'
  return `${basename}-patina-${Math.round(count)}x-q${Math.round(quality)}.jpg`
}
