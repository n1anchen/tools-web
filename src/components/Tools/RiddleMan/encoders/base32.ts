/**
 * Base32 编码器
 * 遵循 RFC 4648，字母表：A-Z2-7，使用 = 补齐
 * 正确处理 UTF-8 多字节字符（先转 UTF-8 字节序列再编码）
 */
import type { Encoder } from './types'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const DECODE_MAP = new Map<string, number>(ALPHABET.split('').map((c, i) => [c, i]))

function encodeBase32(plain: string): string {
  const bytes = new TextEncoder().encode(plain)
  let bits = 0
  let value = 0
  let result = ''

  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      bits -= 5
      result += ALPHABET[(value >>> bits) & 0x1f]
    }
  }

  if (bits > 0) {
    result += ALPHABET[(value << (5 - bits)) & 0x1f]
  }

  // 补齐到 8 的倍数
  while (result.length % 8 !== 0) result += '='

  return result
}

function decodeBase32(encoded: string): string {
  // 去除补齐字符和空白，转大写
  const s = encoded.replace(/=+$/, '').replace(/\s/g, '').toUpperCase()

  let bits = 0
  let value = 0
  const bytes: number[] = []

  for (const ch of s) {
    const v = DECODE_MAP.get(ch)
    if (v === undefined) throw new Error(`非法 Base32 字符：${ch}`)
    value = (value << 5) | v
    bits += 5
    if (bits >= 8) {
      bits -= 8
      bytes.push((value >>> bits) & 0xff)
    }
  }

  return new TextDecoder('utf-8').decode(new Uint8Array(bytes))
}

const base32: Encoder = {
  key: 'base32',
  label: 'Base32',
  prefix: '',
  encode: async (plain) => (plain ? encodeBase32(plain) : ''),
  decode: async (encoded) => (encoded ? decodeBase32(encoded) : ''),
}

export default base32
