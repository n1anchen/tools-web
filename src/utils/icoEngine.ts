export type IconPresetKey = 'favicon' | 'windows' | 'app' | 'custom'

interface IconPreset {
  key: Exclude<IconPresetKey, 'custom'>
  label: string
  description: string
  sizes: number[]
  formats: Array<'png' | 'ico'>
  faviconNaming: boolean
}

interface IcoPngEntry {
  size: number
  bytes: Uint8Array
}

export const ICON_PRESETS: IconPreset[] = [
  {
    key: 'favicon',
    label: '网站 Favicon',
    description: '浏览器、iOS 收藏与 Android 桌面图标',
    sizes: [16, 32, 48, 150, 180, 192, 512],
    formats: ['png', 'ico'],
    faviconNaming: true,
  },
  {
    key: 'windows',
    label: 'Windows 图标',
    description: '快捷方式、桌面程序与资源管理器',
    sizes: [16, 24, 32, 48, 64, 128, 256],
    formats: ['png', 'ico'],
    faviconNaming: false,
  },
  {
    key: 'app',
    label: '应用图标',
    description: '高分辨率应用、PWA 与商店素材',
    sizes: [64, 128, 256, 512, 1024],
    formats: ['png'],
    faviconNaming: false,
  },
]

export function normalizeIconSizes(sizes: number[], maxSize = 2048) {
  return Array.from(new Set(
    sizes
      .map(size => Math.round(Number(size)))
      .filter(size => Number.isFinite(size) && size >= 8 && size <= maxSize),
  )).sort((a, b) => a - b)
}

export function getIcoCompatibleSizes(sizes: number[]) {
  return normalizeIconSizes(sizes).filter(size => size <= 256)
}

export function sanitizeIconName(name: string) {
  const normalized = name
    .trim()
    .replace(/\.[^.]+$/, '')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[.-]+/g, '-')
    .replace(/^-|-$/g, '')
  return normalized || 'icon'
}

export function buildIcoBytes(entries: IcoPngEntry[]) {
  const normalized = entries
    .filter(entry => entry.bytes.byteLength > 0 && entry.size >= 8 && entry.size <= 256)
    .sort((a, b) => a.size - b.size)
    .filter((entry, index, list) => index === 0 || entry.size !== list[index - 1].size)

  if (!normalized.length) {
    throw new Error('ICO 至少需要一个 8–256px 的 PNG 图层')
  }

  const directorySize = 6 + (normalized.length * 16)
  const totalSize = directorySize + normalized.reduce((sum, entry) => sum + entry.bytes.byteLength, 0)
  const output = new Uint8Array(totalSize)
  const view = new DataView(output.buffer)

  view.setUint16(0, 0, true)
  view.setUint16(2, 1, true)
  view.setUint16(4, normalized.length, true)

  let dataOffset = directorySize
  normalized.forEach((entry, index) => {
    const entryOffset = 6 + (index * 16)
    view.setUint8(entryOffset, entry.size === 256 ? 0 : entry.size)
    view.setUint8(entryOffset + 1, entry.size === 256 ? 0 : entry.size)
    view.setUint8(entryOffset + 2, 0)
    view.setUint8(entryOffset + 3, 0)
    view.setUint16(entryOffset + 4, 1, true)
    view.setUint16(entryOffset + 6, 32, true)
    view.setUint32(entryOffset + 8, entry.bytes.byteLength, true)
    view.setUint32(entryOffset + 12, dataOffset, true)
    output.set(entry.bytes, dataOffset)
    dataOffset += entry.bytes.byteLength
  })

  return output
}

export function getSourceQuality(sourceWidth: number, sourceHeight: number, selectedSizes: number[]) {
  const normalizedSizes = normalizeIconSizes(selectedSizes)
  const maxSize = normalizedSizes[normalizedSizes.length - 1] || 0
  const minSide = Math.min(sourceWidth, sourceHeight)
  if (!sourceWidth || !sourceHeight) return { level: 'empty', label: '等待图片', maxSize }
  if (minSide >= maxSize * 2) return { level: 'excellent', label: '清晰度充足', maxSize }
  if (minSide >= maxSize) return { level: 'good', label: '适合当前尺寸', maxSize }
  return { level: 'warning', label: `放大到 ${maxSize}px 可能模糊`, maxSize }
}
