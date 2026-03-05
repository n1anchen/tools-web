/**
 * 兽语 编码器
 * 算法来源：兽音译者（兽语翻译）SDK https://github.com/SycAlright/beast_sdk
 *
 * 编码流程：明文 → 逐字符 Unicode 转 4 位十六进制 → 每位十六进制加位移 → 映射为兽音字符对
 * 解码流程：兽音字符对 → 查字典 → 减位移 → 还原十六进制 → 重组 Unicode → 明文
 */
import type { Encoder } from './types'

/** 兽语字典，4 个字符，索引 0-3 */
const BEAST_DICT = ['嗷', '呜', '啊', '~'] as const

/** 预建索引映射，O(1) 查找 */
const BEAST_INDEX = new Map<string, number>(BEAST_DICT.map((c, i) => [c, i]))

function encode(rawStr: string): string {
  // 每个字符 → 4 位十六进制
  let unicodeHexStr = ''
  for (const ch of rawStr) {
    unicodeHexStr += ch.charCodeAt(0).toString(16).padStart(4, '0')
  }

  let beastStr = ''
  for (let i = 0; i < unicodeHexStr.length; i++) {
    const hexVal = parseInt(unicodeHexStr[i], 16)
    let k = hexVal + (i % 0x10)
    if (k >= 0x10) k -= 0x10
    beastStr += BEAST_DICT[Math.floor(k / 4)] + BEAST_DICT[k % 4]
  }
  return beastStr
}

function decode(beastStr: string): string {
  // 每两个字符为一组
  let unicodeHexStr = ''
  for (let i = 0; i <= beastStr.length - 2; i += 2) {
    const pos1 = BEAST_INDEX.get(beastStr[i])
    const pos2 = BEAST_INDEX.get(beastStr[i + 1])
    if (pos1 === undefined || pos2 === undefined) {
      throw new Error(`非法字符：${beastStr[i]}${beastStr[i + 1]}`)
    }
    let k = pos1 * 4 + pos2
    let hexVal = k - (Math.floor(i / 2) % 0x10)
    if (hexVal < 0) hexVal += 0x10
    unicodeHexStr += hexVal.toString(16)
  }

  // 每 4 位十六进制还原为一个字符
  let rawStr = ''
  for (let i = 0; i + 4 <= unicodeHexStr.length; i += 4) {
    rawStr += String.fromCharCode(parseInt(unicodeHexStr.substring(i, i + 4), 16))
  }
  return rawStr
}

/** 原版兽音译者标记 */
const BEAST_HEAD = '~呜嗷'
const BEAST_TAIL = '啊'

const beast: Encoder = {
  key: 'beast',
  label: '兽语',
  prefix: '',
  encode: async (plain) => BEAST_HEAD + encode(plain) + BEAST_TAIL,
  decode: async (encoded) => {
    // 容错：去除所有空白
    let s = encoded.replace(/\s/g, '')
    if (!s) return ''
    // 剥离头尾标记（兼容有标记和无标记两种格式）
    if (s.startsWith(BEAST_HEAD)) s = s.slice(BEAST_HEAD.length)
    if (s.endsWith(BEAST_TAIL)) s = s.slice(0, -BEAST_TAIL.length)
    return decode(s)
  },
}

export default beast
