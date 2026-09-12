import { BlobReader, BlobWriter, ZipReader } from '@zip.js/zip.js'
import { naturalCompare } from '@/utils/animationStudio'

export const MAX_FRAME_COUNT = 300
export const MAX_IMAGE_BYTES = 30 * 1024 * 1024
export const MAX_ZIP_BYTES = 100 * 1024 * 1024
export const MAX_ZIP_OUTPUT_BYTES = 200 * 1024 * 1024

const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}

export function imageMimeForName(name: string) {
  const extension = name.split('.').pop()?.toLowerCase() ?? ''
  return IMAGE_MIME_BY_EXTENSION[extension] ?? ''
}

export function isSupportedImageFile(file: File) {
  return Boolean(IMAGE_MIME_BY_EXTENSION[file.name.split('.').pop()?.toLowerCase() ?? ''])
    || ['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
}

export function isZipFile(file: File) {
  return file.type === 'application/zip' || file.name.toLowerCase().endsWith('.zip')
}

export async function extractImagesFromZip(file: File, remaining: number) {
  if (file.size > MAX_ZIP_BYTES) throw new Error('ZIP 压缩包不能超过 100 MB')
  const reader = new ZipReader(new BlobReader(file), {
    checkOverlappingEntry: true,
    checkSignature: true,
  })
  try {
    const entries = await reader.getEntries()
    const candidates = entries
      .filter(entry => !entry.directory)
      .filter(entry => !entry.encrypted)
      .filter(entry => !/(^|\/)__MACOSX\//i.test(entry.filename) && !/(^|\/)\./.test(entry.filename))
      .filter(entry => Boolean(imageMimeForName(entry.filename)))
      .sort((left, right) => naturalCompare(left.filename, right.filename))

    if (!candidates.length) throw new Error('ZIP 中没有可用的 PNG、JPEG 或 WebP 图片')
    const selected = candidates.slice(0, Math.max(0, remaining))
    const totalSize = selected.reduce((sum, entry) => sum + entry.uncompressedSize, 0)
    if (totalSize > MAX_ZIP_OUTPUT_BYTES) throw new Error('ZIP 内图片解压后不能超过 200 MB')
    if (selected.some(entry => entry.uncompressedSize > MAX_IMAGE_BYTES)) throw new Error('ZIP 中存在超过 30 MB 的图片')

    const results: Array<{ file: File; path: string }> = []
    for (const entry of selected) {
      if (entry.directory) continue
      const mime = imageMimeForName(entry.filename)
      const blob = await entry.getData(new BlobWriter(mime))
      results.push({ file: new File([blob], entry.filename.split('/').pop() || 'frame.png', { type: mime }), path: entry.filename })
    }
    return { files: results, skipped: Math.max(0, candidates.length - selected.length) }
  } finally {
    await reader.close()
  }
}
