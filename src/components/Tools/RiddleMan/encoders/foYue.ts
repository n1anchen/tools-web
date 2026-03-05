/**
 * 佛曰 编码器
 * 算法来源：与佛论禅 (TudouCode) https://github.com/lersh/TudouCode
 * 原版实现：Tudou.cs
 *
 * 编码流程：明文 → UTF-16LE → PKCS7 → AES-256-CBC → 字节映射（含 BYTEMARK）→ 前缀"佛曰："
 * 解码流程：去前缀 → 逆字节映射 → AES-256-CBC 解密 → 去 PKCS7 → UTF-16LE → 明文
 */
import type { Encoder } from './types'

const KEY_STR = 'XDXDtudou@KeyFansClub^_^Encode!!'
const IV_STR = 'Potato@Key@_@=_='

// 128 字符映射表，下标即字节值（0-127）
const TUDOU: readonly string[] = [
  '滅', '苦', '婆', '娑', '耶', '陀', '跋', '多', '漫', '都', '殿', '悉', '夜', '爍', '帝', '吉',
  '利', '阿', '無', '南', '那', '怛', '喝', '羯', '勝', '摩', '伽', '謹', '波', '者', '穆', '僧',
  '室', '藝', '尼', '瑟', '地', '彌', '菩', '提', '蘇', '醯', '盧', '呼', '舍', '佛', '參', '沙',
  '伊', '隸', '麼', '遮', '闍', '度', '蒙', '孕', '薩', '夷', '迦', '他', '姪', '豆', '特', '逝',
  '朋', '輸', '楞', '栗', '寫', '數', '曳', '諦', '羅', '曰', '咒', '即', '密', '若', '般', '故',
  '不', '實', '真', '訶', '切', '一', '除', '能', '等', '是', '上', '明', '大', '神', '知', '三',
  '藐', '耨', '得', '依', '諸', '世', '槃', '涅', '竟', '究', '想', '夢', '倒', '顛', '離', '遠',
  '怖', '恐', '有', '礙', '心', '所', '以', '亦', '智', '道', '。', '集', '盡', '死', '老', '至',
]

// 12 个前缀字符，表示下一个字符对应的字节值需 +128（即字节值 0x80-0xFF）
const BYTEMARK: readonly string[] = [
  '冥', '奢', '梵', '呐', '俱', '哆', '怯', '諳', '罰', '侄', '缽', '皤',
]

// 预建索引映射，O(1) 查找
const TUDOU_INDEX = new Map<string, number>(TUDOU.map((c, i) => [c, i]))
const BYTEMARK_SET = new Set<string>(BYTEMARK)

let _cryptoKey: CryptoKey | null = null

async function getCryptoKey(): Promise<CryptoKey> {
  if (_cryptoKey) return _cryptoKey
  const raw = new TextEncoder().encode(KEY_STR)
  _cryptoKey = await crypto.subtle.importKey('raw', raw, { name: 'AES-CBC' }, false, [
    'encrypt',
    'decrypt',
  ])
  return _cryptoKey
}

function getIV(): Uint8Array {
  return new TextEncoder().encode(IV_STR)
}

/** 明文 → UTF-16LE 字节数组 */
function encodeUtf16le(text: string): Uint8Array {
  const buf = new Uint8Array(text.length * 2)
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    buf[i * 2] = code & 0xff
    buf[i * 2 + 1] = (code >> 8) & 0xff
  }
  return buf
}

/** UTF-16LE 字节数组 → 明文 */
function decodeUtf16le(data: Uint8Array): string {
  let result = ''
  for (let i = 0; i + 1 < data.length; i += 2) {
    result += String.fromCharCode(data[i] | (data[i + 1] << 8))
  }
  return result
}

async function encode(plain: string): Promise<string> {
  if (!plain) return ''
  const key = await getCryptoKey()
  const iv = getIV()
  // UTF-16LE → AES-256-CBC（Web Crypto API 自动 PKCS7）
  const plainBytes = encodeUtf16le(plain)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const encryptedBuf = await crypto.subtle.encrypt({ name: 'AES-CBC', iv: iv as any }, key, plainBytes as any)
  const encrypted = new Uint8Array(encryptedBuf)

  // 字节 → 字符映射
  let result = ''
  for (const byte of encrypted) {
    if (byte >= 0x80) {
      // 随机选一个 BYTEMARK 字符作前缀
      result += BYTEMARK[Math.floor(Math.random() * BYTEMARK.length)]
      result += TUDOU[byte ^ 0x80]
    } else {
      result += TUDOU[byte]
    }
  }
  return result
}

async function decode(encoded: string): Promise<string> {
  if (!encoded) return ''
  // 字符 → 字节
  const bytes: number[] = []
  let i = 0
  while (i < encoded.length) {
    const ch = encoded[i]
    if (BYTEMARK_SET.has(ch)) {
      i++
      const idx = TUDOU_INDEX.get(encoded[i])
      if (idx === undefined) throw new Error(`非法字符: ${encoded[i]}`)
      bytes.push(idx + 128)
    } else {
      const idx = TUDOU_INDEX.get(ch)
      if (idx === undefined) throw new Error(`非法字符: ${ch}`)
      bytes.push(idx)
    }
    i++
  }

  // AES-256-CBC 解密（Web Crypto API 自动去 PKCS7）
  const key = await getCryptoKey()
  const iv = getIV()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const decryptedBuf = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv: iv as any },
    key,
    new Uint8Array(bytes) as any,
  )
  return decodeUtf16le(new Uint8Array(decryptedBuf))
}

const foYue: Encoder = {
  key: 'foYue',
  label: '佛曰',
  prefix: '佛曰：',
  encode: async (plain) => {
    const body = await encode(plain)
    return body ? '佛曰：' + body : ''
  },
  decode: async (encoded) => {
    const body = encoded.startsWith('佛曰：') ? encoded.slice(3) : encoded
    return decode(body)
  },
}

export default foYue
