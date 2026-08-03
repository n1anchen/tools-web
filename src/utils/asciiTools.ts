export type AsciiGroup = 'control' | 'printable' | 'extended'

export interface AsciiEntry {
  value: number
  dec: string
  oct: string
  hex: string
  binary: string
  unicode: string
  symbol: string
  character: string
  name: string
  description: string
  group: AsciiGroup
  category: string
}

const CONTROL_NAMES = ['NUL','SOH','STX','ETX','EOT','ENQ','ACK','BEL','BS','HT','LF','VT','FF','CR','SO','SI','DLE','DC1','DC2','DC3','DC4','NAK','SYN','ETB','CAN','EM','SUB','ESC','FS','GS','RS','US']
const CONTROL_DESCRIPTIONS = ['空字符','标题开始','正文开始','正文结束','传输结束','询问','确认收到','响铃','退格','水平制表','换行','垂直制表','换页','回车','移出','移入','数据链路转义','设备控制 1','设备控制 2','设备控制 3','设备控制 4','拒绝接收','同步空闲','传输块结束','取消','介质结束','替换','转义','文件分隔','组分隔','记录分隔','单元分隔']
const CP1252: Record<number, string> = {
  128: '€', 130: '‚', 131: 'ƒ', 132: '„', 133: '…', 134: '†', 135: '‡', 136: 'ˆ', 137: '‰', 138: 'Š', 139: '‹', 140: 'Œ', 142: 'Ž',
  145: '‘', 146: '’', 147: '“', 148: '”', 149: '•', 150: '–', 151: '—', 152: '˜', 153: '™', 154: 'š', 155: '›', 156: 'œ', 158: 'ž', 159: 'Ÿ',
}

function standardDescription(value: number, character: string) {
  if (value === 32) return '空格'
  if (value >= 48 && value <= 57) return `数字 ${character}`
  if (value >= 65 && value <= 90) return `大写英文字母 ${character}`
  if (value >= 97 && value <= 122) return `小写英文字母 ${character}`
  return '可打印标点或符号'
}

function standardCategory(value: number) {
  if (value >= 48 && value <= 57) return '数字'
  if (value >= 65 && value <= 90) return '大写字母'
  if (value >= 97 && value <= 122) return '小写字母'
  return value === 32 ? '空白' : '标点符号'
}

export function createAsciiEntries(): AsciiEntry[] {
  return Array.from({ length: 256 }, (_, value) => {
    const isControl = value < 32 || value === 127
    const isPrintable = value >= 32 && value <= 126
    const character = isControl ? String.fromCharCode(value) : isPrintable ? String.fromCharCode(value) : value < 160 ? (CP1252[value] ?? '') : String.fromCharCode(value)
    const name = value < 32 ? CONTROL_NAMES[value] : value === 127 ? 'DEL' : value === 32 ? 'Space' : character || `未定义 ${value}`
    const description = value < 32 ? CONTROL_DESCRIPTIONS[value] : value === 127 ? '删除字符' : isPrintable ? standardDescription(value, character) : character ? 'Windows-1252 扩展字符' : 'Windows-1252 未定义控制位'
    return {
      value,
      dec: String(value),
      oct: value.toString(8).padStart(3, '0'),
      hex: value.toString(16).toUpperCase().padStart(2, '0'),
      binary: value.toString(2).padStart(8, '0'),
      unicode: `U+${(character ? character.codePointAt(0) as number : value).toString(16).toUpperCase().padStart(4, '0')}`,
      symbol: isControl ? name : value === 32 ? 'SP' : character || '—',
      character,
      name,
      description,
      group: isControl ? 'control' : isPrintable ? 'printable' : 'extended',
      category: isControl ? '控制字符' : isPrintable ? standardCategory(value) : '扩展字符',
    }
  })
}

export function filterAsciiEntries(entries: AsciiEntry[], query: string, group: 'all' | AsciiGroup) {
  const keyword = query.trim().toLowerCase().replace(/^0x/, '')
  return entries.filter(entry => {
    if (group !== 'all' && entry.group !== group) return false
    if (!keyword) return true
    return [entry.dec, entry.oct, entry.hex, entry.binary, entry.unicode, entry.symbol, entry.name, entry.description, entry.category]
      .some(value => value.toLowerCase().includes(keyword))
  })
}

export function findAsciiEntry(entries: AsciiEntry[], input: string) {
  const value = input.trim()
  if (!value) return undefined
  let code: number
  if (/^0x[\da-f]+$/i.test(value)) code = Number.parseInt(value.slice(2), 16)
  else if (/^u\+[\da-f]+$/i.test(value)) code = Number.parseInt(value.slice(2), 16)
  else if (/^\d+$/.test(value)) code = Number(value)
  else code = value.codePointAt(0) ?? -1
  return entries.find(entry => entry.value === code)
}
