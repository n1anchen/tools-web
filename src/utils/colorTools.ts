export interface RgbColor {
  r: number
  g: number
  b: number
}

const clampChannel = (value: number) => Math.max(0, Math.min(255, Math.round(value)))

export function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map(value => clampChannel(value).toString(16).padStart(2, '0')).join('').toUpperCase()}`
}

export function rgbToHsl(r: number, g: number, b: number) {
  const [red, green, blue] = [r, g, b].map(value => clampChannel(value) / 255)
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const lightness = (max + min) / 2
  let hue = 0
  let saturation = 0
  if (max !== min) {
    const delta = max - min
    saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min)
    if (max === red) hue = (green - blue) / delta + (green < blue ? 6 : 0)
    else if (max === green) hue = (blue - red) / delta + 2
    else hue = (red - green) / delta + 4
    hue /= 6
  }
  return `hsl(${Math.round(hue * 360)}, ${Math.round(saturation * 100)}%, ${Math.round(lightness * 100)}%)`
}

export function rgbToHsv(r: number, g: number, b: number) {
  const [red, green, blue] = [r, g, b].map(value => clampChannel(value) / 255)
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const delta = max - min
  let hue = 0
  if (delta) {
    if (max === red) hue = 60 * (((green - blue) / delta) % 6)
    else if (max === green) hue = 60 * ((blue - red) / delta + 2)
    else hue = 60 * ((red - green) / delta + 4)
  }
  if (hue < 0) hue += 360
  const saturation = max === 0 ? 0 : delta / max
  return `hsv(${Math.round(hue)}, ${Math.round(saturation * 100)}%, ${Math.round(max * 100)}%)`
}

export function rgbToCmyk(r: number, g: number, b: number) {
  const [red, green, blue] = [r, g, b].map(value => clampChannel(value) / 255)
  const black = 1 - Math.max(red, green, blue)
  if (black === 1) return 'cmyk(0%, 0%, 0%, 100%)'
  const cyan = (1 - red - black) / (1 - black)
  const magenta = (1 - green - black) / (1 - black)
  const yellow = (1 - blue - black) / (1 - black)
  return `cmyk(${Math.round(cyan * 100)}%, ${Math.round(magenta * 100)}%, ${Math.round(yellow * 100)}%, ${Math.round(black * 100)}%)`
}

export function relativeLuminance(r: number, g: number, b: number) {
  const channels = [r, g, b].map(value => {
    const channel = clampChannel(value) / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

export function recommendedTextColor(r: number, g: number, b: number) {
  return relativeLuminance(r, g, b) > 0.179 ? '#111827' : '#FFFFFF'
}

function colorDistance(first: RgbColor, second: RgbColor) {
  return Math.sqrt((first.r - second.r) ** 2 + (first.g - second.g) ** 2 + (first.b - second.b) ** 2)
}

export function extractDominantColors(data: Uint8ClampedArray, limit = 8, sampleEvery = 4) {
  const buckets = new Map<string, { count: number; r: number; g: number; b: number }>()
  const step = Math.max(1, Math.floor(sampleEvery)) * 4
  for (let index = 0; index < data.length; index += step) {
    if (data[index + 3] < 128) continue
    const r = data[index]
    const g = data[index + 1]
    const b = data[index + 2]
    const key = `${r >> 4}-${g >> 4}-${b >> 4}`
    const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 }
    bucket.count += 1
    bucket.r += r
    bucket.g += g
    bucket.b += b
    buckets.set(key, bucket)
  }

  const candidates = [...buckets.values()]
    .sort((first, second) => second.count - first.count)
    .map(bucket => ({
      r: Math.round(bucket.r / bucket.count),
      g: Math.round(bucket.g / bucket.count),
      b: Math.round(bucket.b / bucket.count),
      count: bucket.count,
    }))

  const selected: Array<RgbColor & { count: number }> = []
  for (const candidate of candidates) {
    if (selected.every(color => colorDistance(color, candidate) >= 42)) selected.push(candidate)
    if (selected.length >= limit) break
  }
  return selected.map(color => ({ ...color, hex: rgbToHex(color.r, color.g, color.b) }))
}
