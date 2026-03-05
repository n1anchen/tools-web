/**
 * 如是我闻 编码器
 * 算法来源：与佛论禅 原版网站 + TudouCode (https://github.com/lersh/TudouCode)
 *
 * 编码流程：明文 → UTF-8 → ZIP(Deflate) → AES-256-CBC → 字节映射（1:1，256字符）→ 前缀"如是我闻："
 * 解码流程：去前缀 → 逆映射 → AES-256-CBC 解密 → 自动检测格式(ZIP / 7-zip) → 解压 → UTF-8 → 明文
 */
import type { Encoder } from './types'
import {
  BlobWriter,
  Uint8ArrayReader,
  Uint8ArrayWriter,
  ZipReader,
  ZipWriter,
} from '@zip.js/zip.js'
// 直接引用 lzma_worker.js 源文件，跳过 index.js 中使用 __dirname 的 Node.js 专用逻辑
// esbuild 会将 CJS 的顶层 this 替换为 exports，此文件在浏览器中可正常运行
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import lzmaWorker from 'lzma/src/lzma_worker.js'
const lzmaDecompress: (data: Uint8Array) => Uint8Array | string =
  (lzmaWorker as any).LZMA_WORKER?.decompress ?? (lzmaWorker as any).decompress

// 7-zip 魔数：37 7A BC AF 27 1C
const SEVEN_ZIP_SIG = new Uint8Array([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c])
// ZIP 魔数：PK (50 4B)
const ZIP_SIG = new Uint8Array([0x50, 0x4b])

const KEY_STR = 'XDXDtudou@KeyFansClub^_^Encode!!'
const IV_STR = 'Potato@Key@_@=_='

// 256 字符映射表，下标即字节值（0-255）
// 来源：TudouCode/TudouSharp/Tudou2.cs 中 TudouChar 数组
const TUDOU2: readonly string[] = [
  '謹', '穆', '僧', '室', '藝', '瑟', '彌', '提', '蘇', '醯', '盧', '呼', '舍', '參', '沙', '伊',
  '隸', '麼', '遮', '闍', '度', '蒙', '孕', '薩', '夷', '他', '姪', '豆', '特', '逝', '輸', '楞',
  '栗', '寫', '數', '曳', '諦', '羅', '故', '實', '訶', '知', '三', '藐', '耨', '依', '槃', '涅',
  '竟', '究', '想', '夢', '倒', '顛', '遠', '怖', '恐', '礙', '以', '亦', '智', '盡', '老', '至',
  '吼', '足', '幽', '王', '告', '须', '弥', '灯', '护', '金', '刚', '游', '戏', '宝', '胜', '通',
  '药', '师', '琉', '璃', '普', '功', '德', '山', '善', '住', '过', '去', '七', '未', '来', '贤',
  '劫', '千', '五', '百', '万', '花', '亿', '定', '六', '方', '名', '号', '东', '月', '殿', '妙',
  '尊', '树', '根', '西', '皂', '焰', '北', '清', '数', '精', '进', '首', '下', '寂', '量', '诸',
  '多', '释', '迦', '牟', '尼', '勒', '阿', '閦', '陀', '中', '央', '众', '生', '在', '界', '者',
  '行', '于', '及', '虚', '空', '慈', '忧', '各', '令', '安', '稳', '休', '息', '昼', '夜', '修',
  '持', '心', '求', '诵', '此', '经', '能', '灭', '死', '消', '除', '毒', '害', '高', '开', '文',
  '殊', '利', '凉', '如', '念', '即', '说', '曰', '帝', '毘', '真', '陵', '乾', '梭', '哈', '敬',
  '禮', '奉', '祖', '先', '孝', '雙', '親', '守', '重', '師', '愛', '兄', '弟', '信', '朋', '友',
  '睦', '宗', '族', '和', '鄉', '夫', '婦', '教', '孫', '時', '便', '廣', '積', '陰', '難', '濟',
  '急', '恤', '孤', '憐', '貧', '創', '廟', '宇', '印', '造', '經', '捨', '藥', '施', '茶', '戒',
  '殺', '放', '橋', '路', '矜', '寡', '拔', '困', '粟', '惜', '福', '排', '解', '紛', '捐', '資',
]

// 预建逆映射
const TUDOU2_INDEX = new Map<string, number>(TUDOU2.map((c, i) => [c, i]))

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

/** 将 Uint8Array 压缩为 ZIP 字节（含名为 "default" 的条目，Deflate 压缩） */
async function zipCompress(data: Uint8Array): Promise<Uint8Array> {
  const blobWriter = new BlobWriter()
  const zipWriter = new ZipWriter(blobWriter)
  await zipWriter.add('default', new Uint8ArrayReader(data))
  await zipWriter.close()
  const blob = await blobWriter.getData()
  return new Uint8Array(await blob.arrayBuffer())
}

/**
 * 从 7-zip (.7z) 字节中提取 LZMA 压缩流并解压
 *
 * 7-zip SignatureHeader (32 bytes) 结构：
 *   [0-5]  magic: 37 7A BC AF 27 1C
 *   [6-7]  version
 *   [8-11] StartHeaderCRC
 *   [12-19] NextHeaderOffset (uint64 LE) = 压缩流的字节数（从 byte 32 开始）
 *   [20-27] NextHeaderSize
 *   [28-31] NextHeaderCRC
 * 压缩流 (LZMA) 位于 [32 : 32+NextHeaderOffset]
 * LZMA 流格式：5字节属性 + 8字节原始大小 + 压缩数据（lzma.js 支持此标准格式）
 */
function decompress7zip(data: Uint8Array): Uint8Array {
  for (let i = 0; i < 6; i++) {
    if (data[i] !== SEVEN_ZIP_SIG[i]) throw new Error('Not a 7-zip file')
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  // NextHeaderOffset 位于 [12-19]，取低 32 位即可（数据量不会超过 4GB）
  const lzmaLength = view.getUint32(12, true)
  const lzmaStream = data.slice(32, 32 + lzmaLength)

  // lzma.js 同步解压：接受 Uint8Array，返回 Uint8Array | string
  const result = lzmaDecompress(lzmaStream)
  if (typeof result === 'string') {
    return new TextEncoder().encode(result)
  }
  return result
}

/** 自动检测格式（7-zip / ZIP），解压并返回原始字节 */
async function decompressAuto(data: Uint8Array): Promise<Uint8Array> {
  // 检测 7-zip 魔数 (37 7A ...)
  if (data[0] === SEVEN_ZIP_SIG[0] && data[1] === SEVEN_ZIP_SIG[1]) {
    return decompress7zip(data)
  }
  // 检测 ZIP 魔数 (PK = 50 4B)
  if (data[0] === ZIP_SIG[0] && data[1] === ZIP_SIG[1]) {
    return zipDecompressInner(data)
  }
  throw new Error('未知的压缩格式（既非 ZIP 也非 7-zip）')
}

/** 从 ZIP 字节中解压名为 "default" 的条目（支持 Deflate / LZMA 等多种压缩方式） */
async function zipDecompressInner(data: Uint8Array): Promise<Uint8Array> {
  const zipReader = new ZipReader(new Uint8ArrayReader(data))
  const entries = await zipReader.getEntries()
  const entry = entries.find((e) => e.filename === 'default') ?? entries[0]
  if (!entry) throw new Error('ZIP 压缩包中未找到有效条目')
  // getData 仅存在于 FileEntry，使用断言绕过 DirectoryEntry union 类型
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getData = (entry as any).getData
  if (!getData) throw new Error('ZIP 条目不可读取')
  const writer = new Uint8ArrayWriter()
  const result = await getData.call(entry, writer) as Uint8Array
  await zipReader.close()
  return result
}

async function encode(plain: string): Promise<string> {
  if (!plain) return ''
  const key = await getCryptoKey()
  const iv = getIV()

  // UTF-8 → ZIP(Deflate)
  const utf8 = new TextEncoder().encode(plain)
  const compressed = await zipCompress(utf8)

  // AES-256-CBC 加密（Web Crypto API 自动 PKCS7）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const encryptedBuf = await crypto.subtle.encrypt({ name: 'AES-CBC', iv: iv as any }, key, compressed as any)
  const encrypted = new Uint8Array(encryptedBuf)

  // 字节 → 1:1 字符映射
  return Array.from(encrypted, (b) => TUDOU2[b]).join('')
}

async function decode(encoded: string): Promise<string> {
  if (!encoded) return ''

  // 字符 → 字节
  const bytes = new Uint8Array(encoded.length)
  for (let i = 0; i < encoded.length; i++) {
    const idx = TUDOU2_INDEX.get(encoded[i])
    if (idx === undefined) throw new Error(`非法字符: ${encoded[i]}`)
    bytes[i] = idx
  }

  // AES-256-CBC 解密
  const key = await getCryptoKey()
  const iv = getIV()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const decryptedBuf = await crypto.subtle.decrypt({ name: 'AES-CBC', iv: iv as any }, key, bytes as any)
  const decrypted = new Uint8Array(decryptedBuf)

  // ZIP/7-zip 解压 → UTF-8
  const decompressed = await decompressAuto(decrypted)
  return new TextDecoder('utf-8').decode(decompressed)
}

const ruShiWoWen: Encoder = {
  key: 'ruShiWoWen',
  label: '如是我闻',
  prefix: '如是我闻：',
  encode: async (plain) => {
    const body = await encode(plain)
    return body ? '如是我闻：' + body : ''
  },
  decode: async (encoded) => {
    const body = encoded.startsWith('如是我闻：') ? encoded.slice(5) : encoded
    return decode(body)
  },
}

export default ruShiWoWen
