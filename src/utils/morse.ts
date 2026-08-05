import { encode, decode } from 'imorse'

export const morseCodeMap: Record<string, string> = {
  'A': '.-',
  'B': '-...',
  'C': '-.-.',
  'D': '-..',
  'E': '.',
  'F': '..-.',
  'G': '--.',
  'H': '....',
  'I': '..',
  'J': '.---',
  'K': '-.-',
  'L': '.-..',
  'M': '--',
  'N': '-.',
  'O': '---',
  'P': '.--.',
  'Q': '--.-',
  'R': '.-.',
  'S': '...',
  'T': '-',
  'U': '..-',
  'V': '...-',
  'W': '.--',
  'X': '-..-',
  'Y': '-.--',
  'Z': '--..',
  '0': '-----',
  '1': '.----',
  '2': '..---',
  '3': '...--',
  '4': '....-',
  '5': '.....',
  '6': '-....',
  '7': '--...',
  '8': '---..',
  '9': '----.',
  '.': '.-.-.-',
  ':': '---...',
  ',': '--..--',
  ';': '-.-.-.',
  '?': '..--..',
  '=': '-...-',
  "'": '.----.',
  '"': '.-..-.',
  '!': '-.-.--',
  '/': '-..-.',
  '\\': '-.---..',
  '(': '-.--.',
  ')': '-.--.-',
  '+': '.-.-.',
  '-': '-....-',
  '_': '..--.-',
  '@': '.--.-.',
  '$': '...-..-',
  '&': '.-...',
}

/**
 * 文本转摩斯密码(包含中文转)
 * @returns
 */
export function toMorse(text: string) {
  const tokens: string[] = []
  for (const sourceCharacter of text) {
    if (/\s/.test(sourceCharacter)) {
      if (tokens.length && tokens[tokens.length - 1] !== '/') tokens.push('/')
      continue
    }
    const character = sourceCharacter.toUpperCase()
    const standardCode = morseCodeMap[character]
    if (standardCode) {
      tokens.push(standardCode)
      continue
    }
    const encoded = encode(sourceCharacter)
    tokens.push(encoded && /^[.-]+$/.test(encoded) ? encoded : '?')
  }
  return tokens.join(' ')
}

/**
 * 摩斯电码转文本
 */
export function toText(morse: string) {
  const normalized = morse
    .replace(/[·•]/g, '.')
    .replace(/[—–_]/g, '-')
    .trim()
  if (!normalized) return ''

  const reverseMap = new Map(Object.entries(morseCodeMap).map(([character, code]) => [code, character]))
  return normalized
    .split(/\s+/)
    .map(token => {
      if (token === '/' || token === '|') return ' '
      const standardCharacter = reverseMap.get(token)
      if (standardCharacter) return standardCharacter
      if (!/^[.-]+$/.test(token)) return '?'
      try {
        const decoded = decode(token)
        return decoded && decoded !== token ? decoded : '?'
      } catch {
        return '?'
      }
    })
    .join('')
}
