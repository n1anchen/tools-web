interface ParsedBase64Input {
  base64: string
  mime: string
}

const BASE64_MIME_BY_EXTENSION: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp', ico: 'image/x-icon', avif: 'image/avif',
  pdf: 'application/pdf', txt: 'text/plain', csv: 'text/csv', json: 'application/json', xml: 'text/xml', html: 'text/html', css: 'text/css', js: 'text/javascript', md: 'text/markdown',
  zip: 'application/zip', gz: 'application/gzip', mp3: 'audio/mpeg', mp4: 'video/mp4', wav: 'audio/wav', webm: 'video/webm', avi: 'video/avi',
}

export const BASE64_EXTENSION_BY_MIME = Object.entries(BASE64_MIME_BY_EXTENSION).reduce<Record<string, string>>((result, [extension, mime]) => {
  if (!result[mime]) result[mime] = extension
  return result
}, {})

export function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  return btoa(binary)
}

export function parseBase64Input(value: string): ParsedBase64Input {
  const trimmed = value.trim()
  const dataUrl = trimmed.match(/^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,([\s\S]*)$/i)
  const mime = dataUrl?.[1]?.toLowerCase() ?? ''
  let base64 = (dataUrl?.[2] ?? trimmed).replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/')
  if (!base64) return { base64: '', mime }
  if (!/^[a-z\d+/]*={0,2}$/i.test(base64) || /=/.test(base64.slice(0, -2)) || base64.length % 4 === 1) throw new Error('无效的 Base64 内容')
  base64 = base64.replace(/=+$/, '')
  base64 += '='.repeat((4 - (base64.length % 4)) % 4)
  return { base64, mime }
}

export function base64ToBytes(value: string) {
  const parsed = parseBase64Input(value)
  if (!parsed.base64) return { bytes: new Uint8Array(), mime: parsed.mime }
  let binary = ''
  try {
    binary = atob(parsed.base64)
  } catch {
    throw new Error('无效的 Base64 内容')
  }
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index)
  return { bytes, mime: parsed.mime }
}

export function encodeUtf8Base64(value: string) {
  return bytesToBase64(new TextEncoder().encode(value))
}

export function decodeUtf8Base64(value: string) {
  const { bytes } = base64ToBytes(value)
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    throw new Error('Base64 可以解码，但内容不是有效的 UTF-8 文本')
  }
}

export function estimateBase64DecodedBytes(value: string) {
  try {
    const { base64 } = parseBase64Input(value)
    if (!base64) return 0
    const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
    return Math.max(0, (base64.length * 3) / 4 - padding)
  } catch {
    return 0
  }
}

export function getMimeForFilename(filename: string) {
  const extension = filename.split('.').pop()?.toLowerCase() ?? ''
  return BASE64_MIME_BY_EXTENSION[extension] ?? 'application/octet-stream'
}

export function detectMimeFromBytes(bytes: Uint8Array) {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png'
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif'
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return 'application/pdf'
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && [0x03, 0x05, 0x07].includes(bytes[2])) return 'application/zip'
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) return 'application/gzip'
  if (bytes.length > 11 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
    if (bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp'
    if (bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45) return 'audio/wav'
    if (bytes[8] === 0x41 && bytes[9] === 0x56 && bytes[10] === 0x49 && bytes[11] === 0x20) return 'video/avi'
  }
  if (bytes.length > 7 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) return 'video/mp4'
  return ''
}

export function sanitizeBase64Filename(value: string, fallback = 'decoded-file') {
  const sanitized = value.trim().replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').replace(/\s+/g, ' ').replace(/^[.-]+|[.-]+$/g, '')
  return sanitized || fallback
}
