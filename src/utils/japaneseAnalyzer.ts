import * as wanakana from 'wanakana'
import type { KuromojiToken, Tokenizer } from 'kuromoji'
import zlibGunzipUrl from 'zlibjs/bin/gunzip.min.js?url'

export interface JapaneseAnalysisToken {
  surface: string
  reading: string
  romaji: string
  pos: string
  posDetail: string
  basicForm: string
  conjugatedForm: string
  wordType: string
}

const DICT_PATH = '/dicts/kuromoji/'
const DICT_CACHE_NAME = 'japanese-kuromoji-dict'
export const KUROMOJI_DICTIONARY_CACHE_PREFERENCE_KEY = 'japaneseKuromojiCacheDictionary'
const DICT_FILES = [
  'base.dat.gz',
  'cc.dat.gz',
  'check.dat.gz',
  'tid.dat.gz',
  'tid_map.dat.gz',
  'tid_pos.dat.gz',
  'unk.dat.gz',
  'unk_char.dat.gz',
  'unk_compat.dat.gz',
  'unk_invoke.dat.gz',
  'unk_map.dat.gz',
  'unk_pos.dat.gz',
]

let tokenizerPromise: Promise<Tokenizer> | null = null
let zlibScriptPromise: Promise<void> | null = null

export function getKuromojiTokenizer() {
  if (!tokenizerPromise) {
    tokenizerPromise = buildBrowserTokenizer()
  }

  return tokenizerPromise
}

async function buildBrowserTokenizer() {
  const [
    tokenizerModule,
    dictionaryLoaderModule,
  ] = await Promise.all([
    import('kuromoji/src/Tokenizer'),
    import('kuromoji/src/loader/DictionaryLoader'),
  ])

  const TokenizerClass = getDefaultExport(tokenizerModule)
  const DictionaryLoaderClass = getDefaultExport(dictionaryLoaderModule)

  class BrowserDictionaryLoader extends DictionaryLoaderClass {
    constructor(dicPath: string) {
      super(dicPath)
    }

    loadArrayBuffer(url: string, callback: (err: Error | null, buffer: ArrayBuffer | null) => void) {
      fetch(url)
        .then(response => {
          if (!response.ok) throw new Error(response.statusText || `HTTP ${response.status}`)
          return response.arrayBuffer()
        })
        .then(async arrayBuffer => {
          callback(null, await gunzipIfNeeded(arrayBuffer))
        })
        .catch(error => callback(error, null))
    }
  }

  return new Promise<Tokenizer>((resolve, reject) => {
    const loader = new BrowserDictionaryLoader(DICT_PATH)
    loader.load((err, dictionary) => {
      if (err) {
        tokenizerPromise = null
        reject(err)
        return
      }
      resolve(new TokenizerClass(dictionary))
    })
  })
}

export async function analyzeJapaneseText(text: string) {
  const tokenizer = await getKuromojiTokenizer()
  return tokenizer.tokenize(text).map(normalizeToken)
}

export function analysisTokensToRomaji(tokens: JapaneseAnalysisToken[]) {
  const parts: string[] = []

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    const nextToken = tokens[index + 1]

    if (/^\s+$/.test(token.surface)) {
      parts.push(' ')
      continue
    }

    if (isPunctuation(token)) {
      parts.push(token.surface)
      continue
    }

    const kana = tokenToKana(token)
    const nextKana = nextToken ? tokenToKana(nextToken) : ''

    if (kana.endsWith('っ') && nextKana) {
      parts.push(wanakana.toRomaji(`${kana}${nextKana}`))
      index += 1
    } else if (nextToken?.pos === '助動詞' && nextToken.surface === 'う') {
      parts.push(wanakana.toRomaji(`${kana}う`))
      index += 1
    } else {
      parts.push(wanakana.toRomaji(kana || token.surface))
    }
  }

  return parts
    .join(' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([、。！？!?…・」』）),.])/g, '$1')
    .replace(/([「『（])\s+/g, '$1')
    .trim()
}

export async function cacheKuromojiDictionary() {
  if (!('caches' in window)) return false
  const cache = await caches.open(DICT_CACHE_NAME)
  await cache.addAll(DICT_FILES.map(file => `${DICT_PATH}${file}`))
  return true
}

export async function clearKuromojiDictionaryCache() {
  if (!('caches' in window)) return false
  return caches.delete(DICT_CACHE_NAME)
}

function normalizeToken(token: KuromojiToken): JapaneseAnalysisToken {
  const reading = normalizeReading(token)
  return {
    surface: token.surface_form,
    reading,
    romaji: reading ? wanakana.toRomaji(reading) : wanakana.toRomaji(token.surface_form),
    pos: token.pos,
    posDetail: [token.pos_detail_1, token.pos_detail_2, token.pos_detail_3].filter(value => value && value !== '*').join(' / '),
    basicForm: token.basic_form && token.basic_form !== '*' ? token.basic_form : token.surface_form,
    conjugatedForm: token.conjugated_form && token.conjugated_form !== '*' ? token.conjugated_form : '',
    wordType: token.word_type,
  }
}

function normalizeReading(token: KuromojiToken) {
  if (!token.reading || token.reading === '*') {
    return hasKana(token.surface_form) ? wanakana.toHiragana(token.surface_form) : ''
  }
  return wanakana.toHiragana(token.reading)
}

function hasKana(value: string) {
  return /[\u3040-\u30ff]/.test(value)
}

function tokenToKana(token: JapaneseAnalysisToken) {
  if (token.pos === '助詞') {
    if (token.surface === 'は') return 'わ'
    if (token.surface === 'へ') return 'え'
    if (token.surface === 'を') return 'お'
  }

  if (token.reading) return token.reading
  if (hasKana(token.surface)) return wanakana.toHiragana(token.surface)
  return token.surface
}

function isPunctuation(token: JapaneseAnalysisToken) {
  return token.pos === '記号' || /^[、。！？!?…・「」『』（）()[\]♪,.]+$/.test(token.surface)
}

async function gunzipIfNeeded(arrayBuffer: ArrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer)

  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) {
    return arrayBuffer
  }

  const DecompressionStreamClass = (globalThis as any).DecompressionStream

  if (DecompressionStreamClass) {
    const stream = new Blob([bytes])
      .stream()
      .pipeThrough(new DecompressionStreamClass('gzip'))
    return new Response(stream).arrayBuffer()
  }

  const zlib = await loadZlibGunzip()
  const gunzip = new zlib.Gunzip(bytes)
  const decompressed = gunzip.decompress()
  return decompressed.buffer.slice(
    decompressed.byteOffset,
    decompressed.byteOffset + decompressed.byteLength,
  )
}

async function loadZlibGunzip() {
  const existing = (globalThis as any).Zlib
  if (existing?.Gunzip) return existing

  if (!zlibScriptPromise) {
    zlibScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = zlibGunzipUrl
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => {
        zlibScriptPromise = null
        reject(new Error('zlibjs gunzip 加载失败'))
      }
      document.head.appendChild(script)
    })
  }

  await zlibScriptPromise

  const zlib = (globalThis as any).Zlib
  if (!zlib?.Gunzip) {
    throw new Error('zlibjs gunzip 初始化失败')
  }

  return zlib
}

function getDefaultExport<T>(module: T): any {
  return (module as any).default || module
}
