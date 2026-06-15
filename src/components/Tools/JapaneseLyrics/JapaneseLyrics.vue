<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import * as wanakana from 'wanakana'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { copy } from '@/utils/string'
import {
  analyzeJapaneseText,
  cacheKuromojiDictionary,
  clearKuromojiDictionaryCache,
  KUROMOJI_DICTIONARY_CACHE_PREFERENCE_KEY,
  type JapaneseAnalysisToken,
} from '@/utils/japaneseAnalyzer'

type TokenType = 'word' | 'kana' | 'katakana' | 'okurigana' | 'particle' | 'ending' | 'auxiliary' | 'punctuation' | 'space' | 'latin'

interface LyricToken {
  text: string
  type: TokenType
  note: string
  reading?: string
  pos?: string
  baseForm?: string
}

interface RawLine {
  timeMs: number | null
  timeText: string
  text: string
  order: number
}

interface LyricLine {
  id: string
  timeMs: number | null
  timeText: string
  japanese: string
  romaji: string
  translation: string
  tokens: LyricToken[]
}

interface ParseResult {
  lines: LyricLine[]
  meta: Record<string, string>
  isLrc: boolean
}

interface StatItem {
  text: string
  count: number
}

const title = '日语歌词学习工具'
const sourceText = ref('')
const urlInput = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const loadingUrl = ref(false)
const preciseReading = ref(localStorage.getItem('japaneseLyricsPreciseReading') === 'true')
const cacheDictionary = ref(readCacheDictionaryPreference())
const analyzingPrecise = ref(false)
const cacheBusy = ref(false)
const analyzerError = ref('')
const preciseLineMap = ref<Record<string, Pick<LyricLine, 'tokens' | 'romaji'>>>({})

const sampleLyrics = `[00:12.40]君の知らない物語
[00:18.20]いつもどおりのある日の事
[00:18.20]一如往常的某一天
[00:23.60]君は突然立ち上がり言った
[00:23.60]你突然站起来说道
[00:29.10]「今夜星を見に行こう」
[00:29.10]今晚去看星星吧`

const PARTICLES = [
  'くらい',
  'ぐらい',
  'ばかり',
  'だけ',
  'しか',
  'まで',
  'から',
  'より',
  'でも',
  'って',
  'とは',
  'には',
  'では',
  'の',
  'は',
  'が',
  'を',
  'に',
  'へ',
  'と',
  'で',
  'も',
  'や',
  'か',
  'ね',
  'よ',
  'ぞ',
  'さ',
].sort((a, b) => b.length - a.length)

const ENDINGS = [
  'ませんでした',
  'させられない',
  'させられる',
  'させられた',
  'られない',
  'られる',
  'れない',
  'れる',
  'なかった',
  'たかった',
  'たくない',
  'ました',
  'ません',
  'ている',
  'でいる',
  'ていた',
  'でいた',
  'てる',
  'でる',
  'ない',
  'たい',
  'ます',
  'よう',
  'そう',
  'た',
  'て',
  'だ',
].sort((a, b) => b.length - a.length)

const AUXILIARIES = [
  'くれる',
  'あげる',
  'もらう',
  'しまう',
  'みたい',
  'らしい',
  'ながら',
  'なら',
  'ので',
  'けど',
]

const COMMON_KANJI_WORDS = [
  '物語',
  '突然',
  '今夜',
  '今日',
  '明日',
  '昨日',
  '世界',
  '未来',
  '記憶',
  '時間',
  '心',
  '夢',
  '声',
  '歌',
  '愛',
  '恋',
  '空',
  '星',
  '月',
  '夜',
  '朝',
  '君',
  '僕',
  '私',
  '事',
].sort((a, b) => b.length - a.length)

const COMMON_HIRAGANA_WORDS = [
  'いつも',
  'どおり',
  'ありがとう',
  'さよなら',
  'ここ',
  'そこ',
  'あそこ',
  'これ',
  'それ',
  'あれ',
  'きみ',
  'ぼく',
  'わたし',
  'あなた',
  'もう',
  'まだ',
  'ただ',
  'ずっと',
  'きっと',
  'そっと',
  'もっと',
].sort((a, b) => b.length - a.length)

const PROTECTED_PARTS = [
  'いつも',
  '上がり',
  '上がる',
  '下がり',
  '下がる',
  '曲がり',
  '曲がる',
  '繋がり',
  '繋がる',
  'つながり',
  'つながる',
  'もの',
  'こと',
  'ので',
  'のに',
]

const parsed = computed<ParseResult>(() => parseLyrics(sourceText.value))
const lyricLines = computed(() => parsed.value.lines)
const displayLines = computed(() => {
  if (!preciseReading.value) return lyricLines.value
  return lyricLines.value.map(line => {
    const precise = preciseLineMap.value[line.id]
    return precise ? { ...line, ...precise } : line
  })
})
const hasLyrics = computed(() => lyricLines.value.length > 0)
const japaneseLineCount = computed(() => displayLines.value.filter(line => line.japanese).length)
const translationLineCount = computed(() => displayLines.value.filter(line => line.translation).length)
const tokenCount = computed(() => displayLines.value.reduce((sum, line) => sum + line.tokens.filter(token => token.type !== 'space' && token.type !== 'punctuation').length, 0))

const particleStats = computed(() => topStats('particle'))
const endingStats = computed(() => topStats('ending'))
const katakanaStats = computed(() => topStats('katakana'))

const canFetchUrl = computed(() => isHttpUrl(urlInput.value.trim()))
const canCopy = computed(() => hasLyrics.value)

watch([lyricLines, preciseReading], () => {
  refreshPreciseAnalysis()
}, { immediate: true })

watch(preciseReading, (value) => {
  localStorage.setItem('japaneseLyricsPreciseReading', String(value))
})

watch(cacheDictionary, async (value) => {
  localStorage.setItem(KUROMOJI_DICTIONARY_CACHE_PREFERENCE_KEY, String(value))
  localStorage.removeItem('japaneseLyricsCacheDictionary')
  localStorage.removeItem('japaneseRomajiCacheDictionary')
  cacheBusy.value = true
  try {
    if (value) {
      await cacheKuromojiDictionary()
      ElMessage.success('日语词典已加入离线缓存')
    } else {
      await clearKuromojiDictionaryCache()
      ElMessage.success('日语词典缓存已清理')
    }
  } catch (error) {
    ElMessage.error(value ? '词典缓存失败，请稍后重试' : '词典缓存清理失败')
    cacheDictionary.value = !value
  } finally {
    cacheBusy.value = false
  }
})

function readCacheDictionaryPreference() {
  const sharedPreference = localStorage.getItem(KUROMOJI_DICTIONARY_CACHE_PREFERENCE_KEY)
  if (sharedPreference !== null) return sharedPreference === 'true'

  return localStorage.getItem('japaneseLyricsCacheDictionary') === 'true'
    || localStorage.getItem('japaneseRomajiCacheDictionary') === 'true'
}

function isHttpUrl(value: string) {
  return /^https?:\/\/\S+$/i.test(value)
}

function hasKana(value: string) {
  return /[\u3040-\u30ff]/.test(value)
}

function isJapaneseLike(value: string) {
  return hasKana(value) || /[々〆〤]/.test(value)
}

function isKanjiText(value: string) {
  return /^[\u3400-\u9fff々〆〤]+$/.test(value)
}

function isHiraganaText(value: string) {
  return /^[\u3040-\u309f]+$/.test(value)
}

function isKatakanaText(value: string) {
  return /^[\u30a0-\u30ffー]+$/.test(value)
}

function hasCjk(value: string) {
  return /[\u3400-\u9fff々〆〤]/.test(value)
}

function parseTimeToMs(value: string) {
  const match = value.match(/^(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?$/)
  if (!match) return null
  const minutes = Number(match[1])
  const seconds = Number(match[2])
  const fraction = match[3] ? Number(match[3].padEnd(3, '0').slice(0, 3)) : 0
  return minutes * 60 * 1000 + seconds * 1000 + fraction
}

function formatTime(ms: number | null) {
  if (ms === null) return ''
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  const centiseconds = Math.floor((ms % 1000) / 10)
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`
}

function parseRawLines(input: string) {
  const meta: Record<string, string> = {}
  const rawLines: RawLine[] = []
  const lines = input.replace(/\r\n?/g, '\n').split('\n')
  let isLrc = false

  lines.forEach((line, index) => {
    const value = line.trim()
    if (!value) return

    const metaMatch = value.match(/^\[(ti|ar|al|by|offset):(.+)]$/i)
    if (metaMatch) {
      meta[metaMatch[1].toLowerCase()] = metaMatch[2].trim()
      isLrc = true
      return
    }

    const timeMatches = [...value.matchAll(/\[(\d{1,3}:\d{2}(?:[.:]\d{1,3})?)]/g)]
    if (timeMatches.length === 0) {
      rawLines.push({ timeMs: null, timeText: '', text: value, order: index })
      return
    }

    isLrc = true
    const text = value.replace(/\[(\d{1,3}:\d{2}(?:[.:]\d{1,3})?)]/g, '').trim()
    if (!text) return

    for (const match of timeMatches) {
      const timeMs = parseTimeToMs(match[1])
      rawLines.push({
        timeMs,
        timeText: formatTime(timeMs),
        text,
        order: index,
      })
    }
  })

  if (isLrc) {
    rawLines.sort((a, b) => {
      if (a.timeMs === null && b.timeMs === null) return a.order - b.order
      if (a.timeMs === null) return 1
      if (b.timeMs === null) return -1
      return a.timeMs === b.timeMs ? a.order - b.order : a.timeMs - b.timeMs
    })
  }

  return { rawLines, meta, isLrc }
}

function splitInlineTranslation(text: string) {
  const separators = [' // ', ' ｜ ', ' | ', ' / ', ' — ', ' -- ', ' - ', '\t']
  for (const separator of separators) {
    if (!text.includes(separator)) continue
    const parts = text.split(separator).map(part => part.trim()).filter(Boolean)
    if (parts.length < 2) continue
    const japaneseIndex = parts.findIndex(part => isJapaneseLike(part))
    const translationIndex = parts.findIndex((part, index) => index !== japaneseIndex && !isJapaneseLike(part))
    if (japaneseIndex >= 0 && translationIndex >= 0) {
      return {
        japanese: parts[japaneseIndex],
        translation: parts[translationIndex],
      }
    }
  }
  return null
}

function shouldAttachTranslation(current: RawLine, next?: RawLine) {
  if (!next) return false
  if (!current.text || !next.text) return false
  if (!isJapaneseLike(current.text) || isJapaneseLike(next.text)) return false
  if (current.timeMs !== null && next.timeMs !== null) return current.timeMs === next.timeMs
  return true
}

function parseLyrics(input: string): ParseResult {
  const { rawLines, meta, isLrc } = parseRawLines(input)
  const lines: LyricLine[] = []

  for (let index = 0; index < rawLines.length; index += 1) {
    const raw = rawLines[index]
    const inline = splitInlineTranslation(raw.text)
    let japanese = ''
    let translation = ''

    if (inline) {
      japanese = inline.japanese
      translation = inline.translation
    } else if (isJapaneseLike(raw.text)) {
      japanese = raw.text
      if (shouldAttachTranslation(raw, rawLines[index + 1])) {
        translation = rawLines[index + 1].text
        index += 1
      }
    } else {
      translation = raw.text
    }

    const tokens = japanese ? tokenizeLine(japanese) : []
    lines.push({
      id: `${raw.timeText || 'line'}-${raw.order}-${index}`,
      timeMs: raw.timeMs,
      timeText: raw.timeText,
      japanese,
      translation,
      romaji: japanese ? toRomajiLine(tokens) : '',
      tokens,
    })
  }

  return { lines, meta, isLrc }
}

function pushContentToken(tokens: LyricToken[], text: string) {
  if (!text) return

  const auxiliary = AUXILIARIES.find(suffix => text.endsWith(suffix) && text.length > suffix.length)
  if (auxiliary) {
    pushContentToken(tokens, text.slice(0, -auxiliary.length))
    tokens.push({ text: auxiliary, type: 'auxiliary', note: '补助表达 / 接续表达' })
    return
  }

  const ending = ENDINGS.find(suffix => text.endsWith(suffix) && text.length > suffix.length)
  if (ending) {
    pushContentToken(tokens, text.slice(0, -ending.length))
    tokens.push({ text: ending, type: 'ending', note: '常见活用 / 黏着语尾' })
    return
  }

  pushSegmentedContent(tokens, text)
}

function pushSegmentedContent(tokens: LyricToken[], text: string) {
  const runs = text.match(/[\u3400-\u9fff々〆〤]+|[\u3040-\u309f]+|[\u30a0-\u30ffー]+|[A-Za-z0-9'’-]+|./g) || []

  for (let index = 0; index < runs.length; index += 1) {
    const run = runs[index]
    const nextRun = runs[index + 1] || ''

    if (isKanjiText(run)) {
      if (isHiraganaText(nextRun)) {
        pushKanjiWithOkurigana(tokens, run, nextRun)
        index += 1
      } else {
        pushKnownWordTokens(tokens, run, COMMON_KANJI_WORDS, 'word', '汉字词 / 名词块')
      }
      continue
    }

    if (isHiraganaText(run)) {
      pushHiraganaTokens(tokens, run)
      continue
    }

    if (isKatakanaText(run)) {
      tokens.push({ text: run, type: 'katakana', note: '片假名词 / 外来语' })
      continue
    }

    tokens.push({ text: run, type: 'latin', note: '数字 / 拉丁字符' })
  }
}

function pushKanjiWithOkurigana(tokens: LyricToken[], kanji: string, okurigana: string) {
  const stemHead = kanji.length > 1 ? kanji.slice(0, -1) : ''
  const stemTail = kanji.slice(-1)

  if (stemHead) {
    pushKnownWordTokens(tokens, stemHead, COMMON_KANJI_WORDS, 'word', '汉字词 / 名词块')
  }

  tokens.push({ text: stemTail, type: 'word', note: '词干 / 汉字' })
  pushOkuriganaTokens(tokens, okurigana)
}

function pushOkuriganaTokens(tokens: LyricToken[], text: string) {
  if (!text) return

  const ending = ENDINGS.find(suffix => text.endsWith(suffix) && text.length > suffix.length)
  if (ending) {
    const okurigana = text.slice(0, -ending.length)
    if (okurigana) tokens.push({ text: okurigana, type: 'okurigana', note: '送假名' })
    tokens.push({ text: ending, type: 'ending', note: '常见活用 / 黏着语尾' })
    return
  }

  tokens.push({ text, type: 'okurigana', note: '送假名' })
}

function pushHiraganaTokens(tokens: LyricToken[], text: string) {
  const ending = ENDINGS.find(suffix => text.endsWith(suffix) && text.length > suffix.length)
  if (ending) {
    pushKnownWordTokens(tokens, text.slice(0, -ending.length), COMMON_HIRAGANA_WORDS, 'kana', '假名词块')
    tokens.push({ text: ending, type: 'ending', note: '常见活用 / 黏着语尾' })
    return
  }

  pushKnownWordTokens(tokens, text, COMMON_HIRAGANA_WORDS, 'kana', '假名词块')
}

function pushKnownWordTokens(tokens: LyricToken[], text: string, knownWords: string[], type: TokenType, note: string) {
  let index = 0
  let buffer = ''

  while (index < text.length) {
    const matched = knownWords.find(word => text.startsWith(word, index))
    if (matched) {
      if (buffer) {
        tokens.push({ text: buffer, type, note })
        buffer = ''
      }
      tokens.push({ text: matched, type, note })
      index += matched.length
      continue
    }

    buffer += text[index]
    index += 1
  }

  if (buffer) {
    tokens.push({ text: buffer, type, note })
  }
}

function tokenizeJapaneseChunk(text: string) {
  const tokens: LyricToken[] = []
  let buffer = ''
  let index = 0

  while (index < text.length) {
    const particle = PARTICLES.find(item => canSplitParticle(text, index, item))
    if (particle) {
      pushContentToken(tokens, buffer)
      buffer = ''
      tokens.push({ text: particle, type: 'particle', note: '助词 / 语气词' })
      index += particle.length
      continue
    }

    buffer += text[index]
    index += 1
  }

  pushContentToken(tokens, buffer)
  return tokens
}

function canSplitParticle(text: string, index: number, particle: string) {
  if (index === 0 || !text.startsWith(particle, index)) return false

  const around = text.slice(Math.max(0, index - 3), index + particle.length + 3)
  if (PROTECTED_PARTS.some(part => around.includes(part))) return false

  if (particle.length > 1) return true

  const next = text[index + particle.length] || ''
  if (!next) return true

  if (/[\u3040-\u309f]/.test(next)) {
    if (particle === 'の' && /^[あいうえおな]/.test(next)) return true
    return particle === 'は' || particle === 'を' || particle === 'へ'
  }

  return true
}

function tokenizeLine(text: string) {
  const tokens: LyricToken[] = []
  const chunks = text.match(/[\s]+|[、。！？!?…・「」『』（）()[\]♪,.]+|[A-Za-z0-9'’-]+|[\u3040-\u30ffー々〆〤\u3400-\u9fff]+|./g) || []

  for (const chunk of chunks) {
    if (/^\s+$/.test(chunk)) {
      tokens.push({ text: chunk, type: 'space', note: '空格' })
    } else if (/^[、。！？!?…・「」『』（）()[\]♪,.]+$/.test(chunk)) {
      tokens.push({ text: chunk, type: 'punctuation', note: '标点' })
    } else if (/^[\u3040-\u30ffー々〆〤\u3400-\u9fff]+$/.test(chunk)) {
      tokens.push(...tokenizeJapaneseChunk(chunk))
    } else {
      tokens.push({ text: chunk, type: 'latin', note: '数字 / 拉丁字符' })
    }
  }

  return tokens
}

function toRomajiLine(tokens: LyricToken[]) {
  const parts: string[] = []

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    const nextToken = tokens[index + 1]

    if (token.type === 'space') {
      parts.push(' ')
    } else if (token.type === 'punctuation') {
      parts.push(token.text)
    } else if (token.reading) {
      const nextReading = nextToken ? readableKana(nextToken) : ''
      if (token.reading.endsWith('っ') && nextReading) {
        parts.push(wanakana.toRomaji(`${token.reading}${nextReading}`))
        index += 1
      } else if (nextToken?.type === 'ending' && nextToken.text === 'う') {
        parts.push(wanakana.toRomaji(`${token.reading}う`))
        index += 1
      } else {
        parts.push(wanakana.toRomaji(token.reading))
      }
    } else if (token.text === 'っ' && nextToken && /[\u3040-\u30ff]/.test(nextToken.text)) {
      parts.push(wanakana.toRomaji(`${token.text}${nextToken.text}`))
      index += 1
    } else {
      parts.push(wanakana.toRomaji(token.text))
    }
  }

  return parts
    .join(' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([、。！？!?…・」』）),.])/g, '$1')
    .replace(/([「『（])\s+/g, '$1')
    .trim()
}

function readableKana(token: LyricToken) {
  if (token.reading) return token.reading
  if (/[\u3040-\u30ff]/.test(token.text)) return wanakana.toHiragana(token.text)
  return ''
}

function tokenRomaji(token: LyricToken, nextToken?: LyricToken) {
  if (token.type === 'space' || token.type === 'punctuation') return ''
  const kana = tokenKanaForRomaji(token)
  if (!kana && hasCjk(token.text)) return ''

  if (kana.endsWith('っ') && nextToken) {
    const nextKana = tokenKanaForRomaji(nextToken)
    if (nextKana) {
      const merged = wanakana.toRomaji(`${kana}${nextKana}`)
      const nextRomaji = wanakana.toRomaji(nextKana)
      return nextRomaji && merged.endsWith(nextRomaji)
        ? merged.slice(0, -nextRomaji.length)
        : merged
    }
  }

  return wanakana.toRomaji(kana || token.text)
}

function tokenKanaForRomaji(token: LyricToken) {
  if (token.type === 'particle') {
    if (token.text === 'は') return 'わ'
    if (token.text === 'へ') return 'え'
    if (token.text === 'を') return 'お'
  }
  return readableKana(token)
}

function tokenClass(token: LyricToken) {
  const base = 'inline-flex min-w-[2.5rem] flex-col items-center justify-center gap-0.5 rounded-md border px-2 py-1.5 text-center text-sm leading-tight transition-colors'
  if (token.type === 'space') return 'inline-block w-2'
  if (token.type === 'punctuation') return 'inline-flex min-w-[1rem] flex-col items-center justify-center px-0.5 py-1.5 text-slate-500 dark:text-slate-300'
  if (token.type === 'particle') return `${base} border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-200`
  if (token.type === 'ending') return `${base} border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-200`
  if (token.type === 'auxiliary') return `${base} border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200`
  if (token.type === 'katakana') return `${base} border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-400/30 dark:bg-violet-400/10 dark:text-violet-200`
  if (token.type === 'okurigana') return `${base} border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-400/30 dark:bg-teal-400/10 dark:text-teal-200`
  if (token.type === 'kana') return `${base} border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200`
  if (token.type === 'latin') return `${base} border-slate-200 bg-white text-slate-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300`
  return `${base} border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100`
}

function topStats(type: TokenType) {
  const map = new Map<string, number>()
  for (const line of displayLines.value) {
    for (const token of line.tokens) {
      if (token.type !== type) continue
      map.set(token.text, (map.get(token.text) || 0) + 1)
    }
  }
  return [...map.entries()]
    .map(([text, count]) => ({ text, count }))
    .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text))
    .slice(0, 8)
}

function statLabel(items: StatItem[], emptyText: string) {
  if (items.length === 0) return emptyText
  return items.map(item => `${item.text} x${item.count}`).join('、')
}

function fillSample() {
  sourceText.value = sampleLyrics
}

function clearAll() {
  sourceText.value = ''
  urlInput.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

async function fetchUrlLyrics() {
  const url = urlInput.value.trim()
  if (!isHttpUrl(url)) {
    ElMessage.warning('请输入 http 或 https 开头的歌词 URL')
    return
  }

  loadingUrl.value = true
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    sourceText.value = await response.text()
    ElMessage.success('歌词 URL 读取成功')
  } catch (error) {
    ElMessage.error('读取失败，可能是 URL 不可访问或目标站点未允许跨域请求')
  } finally {
    loadingUrl.value = false
  }
}

async function refreshPreciseAnalysis() {
  const currentLines = lyricLines.value
  const runId = currentLines.map(line => `${line.id}:${line.japanese}`).join('|')

  if (!preciseReading.value) {
    preciseLineMap.value = {}
    analyzerError.value = ''
    analyzingPrecise.value = false
    return
  }

  const japaneseLines = currentLines.filter(line => line.japanese)
  if (japaneseLines.length === 0) {
    preciseLineMap.value = {}
    analyzerError.value = ''
    analyzingPrecise.value = false
    return
  }

  analyzingPrecise.value = true
  analyzerError.value = ''

  try {
    if (cacheDictionary.value) {
      await cacheKuromojiDictionary()
    }

    const entries = await Promise.all(japaneseLines.map(async line => {
      const analyzed = await analyzeJapaneseText(line.japanese)
      const tokens = analyzed.map(toPreciseToken)
      return [line.id, { tokens, romaji: toRomajiLine(tokens) }] as const
    }))

    const latestRunId = lyricLines.value.map(line => `${line.id}:${line.japanese}`).join('|')
    if (runId !== latestRunId || !preciseReading.value) return

    preciseLineMap.value = Object.fromEntries(entries)
  } catch (error) {
    analyzerError.value = '精准读音加载失败，请检查网络或稍后重试'
    preciseLineMap.value = {}
  } finally {
    analyzingPrecise.value = false
  }
}

function toPreciseToken(token: JapaneseAnalysisToken): LyricToken {
  const type = preciseTokenType(token)
  const details = [token.pos, token.posDetail, token.conjugatedForm].filter(Boolean).join(' / ')
  const reading = hasCjk(token.surface) && token.reading ? token.reading : ''
  return {
    text: token.surface,
    type,
    reading,
    pos: details,
    baseForm: token.basicForm,
    note: [
      details || '形态素',
      token.basicForm && token.basicForm !== token.surface ? `原形：${token.basicForm}` : '',
      reading ? `读音：${reading}` : '',
    ].filter(Boolean).join('\n'),
  }
}

function preciseTokenType(token: JapaneseAnalysisToken): TokenType {
  if (/^\s+$/.test(token.surface)) return 'space'
  if (/^[、。！？!?…・「」『』（）()[\]♪,.]+$/.test(token.surface) || token.pos === '記号') return 'punctuation'
  if (token.pos === '助詞') return 'particle'
  if (token.pos === '助動詞') return 'ending'
  if (token.pos === '接尾') return 'ending'
  if (token.pos === '動詞' && token.conjugatedForm) return 'word'
  if (isKatakanaText(token.surface)) return 'katakana'
  if (isHiraganaText(token.surface)) return 'kana'
  return hasCjk(token.surface) ? 'word' : 'latin'
}

function openFilePicker() {
  fileInput.value?.click()
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    sourceText.value = String(reader.result || '')
    ElMessage.success(`已读取 ${file.name}`)
  }
  reader.onerror = () => {
    ElMessage.error('歌词文件读取失败')
  }
  reader.readAsText(file)
}

function copyResult() {
  const result = displayLines.value
    .map(line => {
      const parts = [
        line.timeText ? `[${line.timeText}] ${line.japanese || line.translation}` : (line.japanese || line.translation),
        line.romaji ? `Romaji: ${line.romaji}` : '',
        line.translation && line.japanese ? `翻译: ${line.translation}` : '',
      ].filter(Boolean)
      return parts.join('\n')
    })
    .join('\n\n')
  copy(result)
}
</script>

<template>
  <div class="flex flex-col mt-3 flex-1">
    <DetailHeader :title="title" />

    <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-300 space-y-4">
      <div class="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div>
          <label class="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
            粘贴歌词文本 / LRC
          </label>
          <el-input
            v-model="sourceText"
            type="textarea"
            :rows="12"
            placeholder="支持纯文本、LRC 时间轴歌词、双语歌词。也可以在右侧粘贴歌词 URL 或上传 .lrc / .txt 文件。"
            resize="none"
          />
        </div>

        <aside class="space-y-3">
          <div>
            <label class="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              歌词 URL
            </label>
            <el-input
              v-model="urlInput"
              placeholder="https://example.com/song.lrc"
              clearable
            />
          </div>

          <button
            :disabled="!canFetchUrl || loadingUrl"
            @click="fetchUrlLyrics"
            class="w-full px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            {{ loadingUrl ? '读取中...' : '读取 URL 歌词' }}
          </button>

          <input
            ref="fileInput"
            type="file"
            accept=".lrc,.txt,text/plain,.srt"
            class="hidden"
            @change="handleFileChange"
          />
          <button
            @click="openFilePicker"
            class="w-full px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium transition-colors"
          >
            上传歌词文件
          </button>

          <div class="grid grid-cols-2 gap-2">
            <button
              @click="fillSample"
              class="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-700 text-sm text-slate-700 dark:text-slate-200 transition-colors"
            >
              示例
            </button>
            <button
              :disabled="!sourceText && !urlInput"
              @click="clearAll"
              class="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-slate-900 dark:hover:bg-slate-700 text-sm text-slate-700 dark:text-slate-200 transition-colors"
            >
              清空
            </button>
          </div>

          <div class="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 p-3 space-y-3">
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="text-sm font-medium text-slate-700 dark:text-slate-200">精准汉字读音</div>
                <div class="text-xs text-slate-500 dark:text-slate-400">按需加载 kuromoji 词典</div>
              </div>
              <el-switch v-model="preciseReading" :loading="analyzingPrecise" />
            </div>
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="text-sm font-medium text-slate-700 dark:text-slate-200">离线缓存词典</div>
                <div class="text-xs text-slate-500 dark:text-slate-400">与罗马音工具共用缓存</div>
              </div>
              <el-switch v-model="cacheDictionary" :loading="cacheBusy" />
            </div>
            <div v-if="analyzingPrecise" class="text-xs text-blue-600 dark:text-blue-300">
              正在加载日语词典并分析读音...
            </div>
            <div v-if="analyzerError" class="text-xs text-rose-600 dark:text-rose-300">
              {{ analyzerError }}
            </div>
          </div>

          <button
            :disabled="!canCopy"
            @click="copyResult"
            class="w-full px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            复制学习稿
          </button>

          <div class="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 p-3 text-sm text-slate-600 dark:text-slate-300 space-y-2">
            <div class="flex justify-between gap-3">
              <span>歌词行</span>
              <b class="text-slate-800 dark:text-slate-100">{{ lyricLines.length }}</b>
            </div>
            <div class="flex justify-between gap-3">
              <span>日语行</span>
              <b class="text-slate-800 dark:text-slate-100">{{ japaneseLineCount }}</b>
            </div>
            <div class="flex justify-between gap-3">
              <span>翻译行</span>
              <b class="text-slate-800 dark:text-slate-100">{{ translationLineCount }}</b>
            </div>
            <div class="flex justify-between gap-3">
              <span>学习标记</span>
              <b class="text-slate-800 dark:text-slate-100">{{ tokenCount }}</b>
            </div>
          </div>
        </aside>
      </div>

      <div class="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-100">
        「离线缓存词典」会缓存同一份 kuromoji 词典，日语歌词学习工具和日语转罗马音工具共用；在任一工具中关闭该开关都会清理这份共享词典缓存。
      </div>

      <div
        v-if="Object.keys(parsed.meta).length > 0"
        class="flex flex-wrap gap-2 text-sm"
      >
        <span
          v-for="(value, key) in parsed.meta"
          :key="key"
          class="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-slate-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300"
        >
          {{ key }}: {{ value }}
        </span>
      </div>

      <div
        v-if="hasLyrics"
        class="grid gap-3 md:grid-cols-3"
      >
        <div class="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800 dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-100">
          <div class="font-semibold mb-1">助词观察</div>
          <div>{{ statLabel(particleStats, '暂未识别到高频助词') }}</div>
        </div>
        <div class="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-100">
          <div class="font-semibold mb-1">活用语尾</div>
          <div>{{ statLabel(endingStats, '暂未识别到常见活用') }}</div>
        </div>
        <div class="rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-800 dark:border-violet-400/30 dark:bg-violet-400/10 dark:text-violet-100">
          <div class="font-semibold mb-1">片假名词</div>
          <div>{{ statLabel(katakanaStats, '暂未识别到片假名词') }}</div>
        </div>
      </div>

      <div
        v-if="!hasLyrics && sourceText.trim()"
        class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100"
      >
        暂未解析到有效歌词行，请检查输入内容是否为空行或只有 LRC 元信息。
      </div>
    </div>

    <div
      v-if="hasLyrics"
      class="mt-3 space-y-3"
    >
      <section
        v-for="(line, index) in displayLines"
        :key="line.id"
        class="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden"
      >
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-4 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700">
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-md bg-slate-200 dark:bg-slate-700 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">
              #{{ index + 1 }}
            </span>
            <span
              v-if="line.timeText"
              class="rounded-md bg-blue-100 dark:bg-blue-400/20 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-200"
            >
              {{ line.timeText }}
            </span>
            <span
              v-if="line.translation"
              class="rounded-md bg-emerald-100 dark:bg-emerald-400/20 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-200"
            >
              双语
            </span>
          </div>
          <span class="text-xs text-slate-400 dark:text-slate-500">
            {{ line.tokens.length }} 个片段
          </span>
        </div>

        <div class="p-4 space-y-3">
          <div v-if="line.japanese">
            <div class="flex flex-wrap items-stretch gap-1.5 text-base leading-none select-all">
              <span
                v-for="(token, tokenIndex) in line.tokens"
                :key="`${token.text}-${tokenIndex}`"
                :class="tokenClass(token)"
                :title="token.note"
              >
                <template v-if="token.type !== 'space'">
                  <span class="min-h-[12px] text-[10px] leading-none text-slate-500 dark:text-slate-400">
                    {{ token.reading }}
                  </span>
                  <span class="text-base font-medium leading-tight">
                    {{ token.text }}
                  </span>
                  <span class="min-h-[14px] text-[11px] leading-tight text-slate-500 dark:text-slate-400">
                    {{ tokenRomaji(token, line.tokens[tokenIndex + 1]) }}
                  </span>
                </template>
              </span>
            </div>
          </div>

          <div v-if="line.translation">
            <div class="border-l-2 border-emerald-200 pl-3 text-sm leading-relaxed text-slate-700 dark:border-emerald-400/40 dark:text-slate-200">
              {{ line.translation }}
            </div>
          </div>
        </div>
      </section>
    </div>

    <ToolDetail title="使用说明">
      <el-text>
        支持粘贴纯文本歌词、LRC 歌词、歌词 URL，或上传 .lrc / .txt 文件。LRC 的 [mm:ss.xx] 时间戳会显示为 0:12.40 这类更易读的时间标记。<br />
        若歌词是双语格式，工具会尝试识别「同时间戳的下一行翻译」「日语行后紧跟翻译行」以及「日语 / 翻译」这类同行写法。<br />
        彩色标记会辅助拆分助词、常见动词/形容词活用语尾、补助表达和片假名词；默认轻量模式只转换假名，开启「精准汉字读音」后会按需加载 kuromoji 词典，为汉字词显示假名读音并改进罗马音。
      </el-text>
    </ToolDetail>
  </div>
</template>
