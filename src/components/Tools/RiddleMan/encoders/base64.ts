/**
 * Base64 编码器
 * 使用 TextEncoder/TextDecoder + btoa/atob 实现，正确处理 UTF-8 多字节字符
 */
import type { Encoder } from './types'

function encodeBase64(plain: string): string {
  const bytes = new TextEncoder().encode(plain)
  // Uint8Array → Latin-1 string → btoa
  return btoa(String.fromCharCode(...bytes))
}

function decodeBase64(b64: string): string {
  const binary = atob(b64)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder('utf-8').decode(bytes)
}

const base64: Encoder = {
  key: 'base64',
  label: 'Base64',
  prefix: '',
  encode: async (plain) => (plain ? encodeBase64(plain) : ''),
  decode: async (encoded) => (encoded ? decodeBase64(encoded) : ''),
}

export default base64
