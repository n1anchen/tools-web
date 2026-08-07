<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import * as wanakana from 'wanakana'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import MetricsBar from '@/components/Common/MetricsBar.vue'
import { downloadText } from '@/utils/file'
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

const LYRIC_FONT_SIZE_STORAGE_KEY = 'japaneseLyricsFontSize'
const DEFAULT_LYRIC_FONT_SIZE = 16
const MIN_LYRIC_FONT_SIZE = 14
const MAX_LYRIC_FONT_SIZE = 32
const sourceText = ref('')
const urlInput = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const loadingUrl = ref(false)
const preciseReading = ref(localStorage.getItem('japaneseLyricsPreciseReading') === 'true')
const cacheDictionary = ref(readCacheDictionaryPreference())
const lyricFontSize = ref(readLyricFontSize())
const analyzingPrecise = ref(false)
const cacheBusy = ref(false)
const analyzerError = ref('')
const preciseLineMap = ref<Record<string, Pick<LyricLine, 'tokens' | 'romaji'>>>({})
const displayMode = ref<'all' | 'focus'>('all')
const activeLineIndex = ref(0)
const showReading = ref(true)
const showRomaji = ref(true)
const showTranslation = ref(true)
const completedLineIds = ref<string[]>([])

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
const timedLineCount = computed(() => displayLines.value.filter(line => line.timeMs !== null).length)
const activeLine = computed(() => displayLines.value[activeLineIndex.value] ?? null)
const renderedLines = computed(() => displayMode.value === 'focus' && activeLine.value ? [activeLine.value] : displayLines.value)
const completedCount = computed(() => displayLines.value.filter(line => completedLineIds.value.includes(line.id)).length)
const learningProgress = computed(() => displayLines.value.length ? Math.round(completedCount.value / displayLines.value.length * 100) : 0)

const particleStats = computed(() => topStats('particle'))
const endingStats = computed(() => topStats('ending'))
const katakanaStats = computed(() => topStats('katakana'))

const canFetchUrl = computed(() => isHttpUrl(urlInput.value.trim()))
const lyricReadingFontSize = computed(() => Math.max(12, Math.round(lyricFontSize.value * 0.68)))
const lyricRomajiFontSize = computed(() => Math.max(12, Math.round(lyricFontSize.value * 0.72)))
const lyricTokenMinWidth = computed(() => Math.max(40, Math.round(lyricFontSize.value * 2.5)))

watch([lyricLines, preciseReading], () => {
  refreshPreciseAnalysis()
}, { immediate: true })

watch(preciseReading, (value) => {
  localStorage.setItem('japaneseLyricsPreciseReading', String(value))
})

watch(displayLines, lines => {
  activeLineIndex.value = Math.min(activeLineIndex.value, Math.max(0, lines.length - 1))
  completedLineIds.value = completedLineIds.value.filter(id => lines.some(line => line.id === id))
})

watch(lyricFontSize, (value) => {
  localStorage.setItem(LYRIC_FONT_SIZE_STORAGE_KEY, String(clampLyricFontSize(value)))
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

function readLyricFontSize() {
  const value = Number(localStorage.getItem(LYRIC_FONT_SIZE_STORAGE_KEY))
  if (!Number.isFinite(value)) return DEFAULT_LYRIC_FONT_SIZE
  return clampLyricFontSize(value)
}

function clampLyricFontSize(value: number) {
  return Math.min(MAX_LYRIC_FONT_SIZE, Math.max(MIN_LYRIC_FONT_SIZE, Math.round(value)))
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
  activeLineIndex.value = 0
  completedLineIds.value = []
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
  ElMessage.success('学习稿已复制')
}

function lineIndex(line: LyricLine) {
  return displayLines.value.findIndex(item => item.id === line.id)
}

function selectLine(line: LyricLine) {
  const index = lineIndex(line)
  if (index >= 0) activeLineIndex.value = index
}

function moveFocus(offset: number) {
  if (!displayLines.value.length) return
  activeLineIndex.value = Math.min(displayLines.value.length - 1, Math.max(0, activeLineIndex.value + offset))
}

function toggleCompleted(line: LyricLine) {
  completedLineIds.value = completedLineIds.value.includes(line.id)
    ? completedLineIds.value.filter(id => id !== line.id)
    : [...completedLineIds.value, line.id]
}

function copyLine(line: LyricLine) {
  const result = [line.japanese, line.romaji, line.translation].filter(Boolean).join('\n')
  copy(result)
  ElMessage.success('本行学习内容已复制')
}

function downloadStudyNotes() {
  if (!hasLyrics.value) return
  const result = displayLines.value.map((line, index) => [
    `#${index + 1}${line.timeText ? ` [${line.timeText}]` : ''}`,
    line.japanese,
    line.romaji ? `Romaji: ${line.romaji}` : '',
    line.translation ? `翻译: ${line.translation}` : '',
  ].filter(Boolean).join('\n')).join('\n\n')
  downloadText(result, 'japanese-lyrics-study.txt')
}
</script>

<template>
  <div class="lyrics-tool flex flex-col mt-3 flex-1">
    <ToolHero summary="把一段歌词，拆成可以逐行学习的材料">
      <template #metrics>
        <MetricsBar :items="[{ label: '歌词行', value: lyricLines.length }, { label: '学习词块', value: tokenCount }, { label: '学习进度', value: (learningProgress) + '%' }]" />
      </template>
    </ToolHero>

    <section class="source-workbench">
      <div class="source-main">
        <header class="section-header"><div><span>LYRIC SOURCE</span><h3>粘贴歌词文本或 LRC</h3><p>输入后即时解析；支持相同时间戳双语行与同行翻译。</p></div><div class="header-actions"><el-button @click="fillSample">载入示例</el-button><el-button :disabled="!sourceText && !urlInput" @click="clearAll">清空</el-button></div></header>
        <el-input v-model="sourceText" type="textarea" :rows="13" placeholder="粘贴日语歌词、LRC 时间轴或双语歌词……" resize="vertical" />
        <div v-if="Object.keys(parsed.meta).length" class="meta-row"><span v-for="(value,key) in parsed.meta" :key="key"><b>{{ key }}</b>{{ value }}</span></div>
        <div v-if="!hasLyrics && sourceText.trim()" class="parse-warning">暂未解析到有效歌词行，请检查内容是否只有 LRC 元信息或空行。</div>
      </div>

      <aside class="source-sidebar">
        <header><span>IMPORT</span><h3>其他导入方式</h3></header>
        <label class="url-field"><span>歌词 URL</span><el-input v-model="urlInput" placeholder="https://example.com/song.lrc" clearable /></label>
        <el-button type="primary" class="sidebar-action" :disabled="!canFetchUrl || loadingUrl" :loading="loadingUrl" @click="fetchUrlLyrics">{{ loadingUrl ? '正在读取…' : '读取 URL 歌词' }}</el-button>
        <input ref="fileInput" type="file" accept=".lrc,.txt,text/plain,.srt" class="hidden" @change="handleFileChange" />
        <el-button class="sidebar-action" @click="openFilePicker">上传 .lrc / .txt 文件</el-button>

        <div class="settings-group">
          <div class="setting-row"><div><strong>精准汉字读音</strong><span>使用 kuromoji 形态素词典</span></div><el-switch v-model="preciseReading" :loading="analyzingPrecise" /></div>
          <div class="setting-row"><div><strong>离线缓存词典</strong><span>与日语转罗马音共用缓存</span></div><el-switch v-model="cacheDictionary" :loading="cacheBusy" /></div>
          <p v-if="analyzingPrecise" class="info-text">正在加载词典并分析读音…</p><p v-if="analyzerError" class="error-text">{{ analyzerError }}</p>
        </div>

        <div class="font-setting"><div><span>歌词字号</span><strong>{{ lyricFontSize }}px</strong></div><el-slider v-model="lyricFontSize" :min="MIN_LYRIC_FONT_SIZE" :max="MAX_LYRIC_FONT_SIZE" :step="1" :show-tooltip="false" /></div>
      </aside>
    </section>

    <template v-if="hasLyrics">
      <section class="study-toolbar">
        <div class="view-switch"><button :class="{active:displayMode==='all'}" @click="displayMode='all'">全部歌词</button><button :class="{active:displayMode==='focus'}" @click="displayMode='focus'">逐行专注</button></div>
        <div class="display-switches"><label><el-switch v-model="showReading" size="small" />假名</label><label><el-switch v-model="showRomaji" size="small" />罗马音</label><label><el-switch v-model="showTranslation" size="small" />翻译</label></div>
        <div class="export-actions"><el-button @click="copyResult">复制学习稿</el-button><el-button @click="downloadStudyNotes">下载 TXT</el-button></div>
      </section>

      <section class="insight-grid">
        <article class="sky"><span>助</span><div><strong>助词观察</strong><p>{{ statLabel(particleStats,'暂未识别到高频助词') }}</p></div></article>
        <article class="rose"><span>活</span><div><strong>活用语尾</strong><p>{{ statLabel(endingStats,'暂未识别到常见活用') }}</p></div></article>
        <article class="violet"><span>外</span><div><strong>片假名词</strong><p>{{ statLabel(katakanaStats,'暂未识别到片假名词') }}</p></div></article>
        <article class="green"><span>轴</span><div><strong>内容结构</strong><p>{{ japaneseLineCount }} 行日语 · {{ translationLineCount }} 行翻译 · {{ timedLineCount }} 个时间点</p></div></article>
      </section>

      <section v-if="displayMode==='focus'" class="focus-nav">
        <el-button :disabled="activeLineIndex===0" @click="moveFocus(-1)">← 上一句</el-button>
        <div><span>专注进度</span><strong>{{ activeLineIndex + 1 }} / {{ displayLines.length }}</strong><div class="progress-track"><i :style="{width:`${(activeLineIndex+1)/displayLines.length*100}%`}"></i></div></div>
        <el-button :disabled="activeLineIndex===displayLines.length-1" @click="moveFocus(1)">下一句 →</el-button>
      </section>

      <section class="lyrics-list" :class="{focused:displayMode==='focus'}">
        <article v-for="line in renderedLines" :key="line.id" class="lyric-card" :class="{active:activeLine?.id===line.id,completed:completedLineIds.includes(line.id)}" @click="selectLine(line)">
          <header>
            <div class="line-badges"><span class="index-badge">#{{ lineIndex(line)+1 }}</span><span v-if="line.timeText" class="time-badge">{{ line.timeText }}</span><span v-if="line.translation" class="translation-badge">双语</span><span v-if="completedLineIds.includes(line.id)" class="done-badge">已学习</span></div>
            <div class="line-actions"><span>{{ line.tokens.filter(token=>token.type!=='space').length }} 个片段</span><button @click.stop="copyLine(line)">复制</button><button @click.stop="toggleCompleted(line)">{{ completedLineIds.includes(line.id)?'取消完成':'标记完成' }}</button></div>
          </header>
          <div class="line-content">
            <div v-if="line.japanese" class="token-row">
              <span v-for="(token,tokenIndex) in line.tokens" :key="`${token.text}-${tokenIndex}`" :class="tokenClass(token)" :style="{minWidth:token.type==='space'||token.type==='punctuation'?undefined:`${lyricTokenMinWidth}px`}" :title="token.note">
                <template v-if="token.type!=='space'">
                  <span v-if="showReading" class="token-reading" :style="{fontSize:`${lyricReadingFontSize}px`}">{{ token.reading }}</span>
                  <span class="token-text" :style="{fontSize:`${lyricFontSize}px`}">{{ token.text }}</span>
                  <span v-if="showRomaji" class="token-romaji" :style="{fontSize:`${lyricRomajiFontSize}px`}">{{ tokenRomaji(token,line.tokens[tokenIndex+1]) }}</span>
                </template>
              </span>
            </div>
            <div v-if="showTranslation && line.translation" class="line-translation" :style="{fontSize:`${Math.max(14,lyricFontSize-2)}px`}">{{ line.translation }}</div>
          </div>
        </article>
      </section>

      <section class="legend-card"><strong>颜色图例</strong><div><span class="legend-particle">助词</span><span class="legend-ending">活用语尾</span><span class="legend-katakana">片假名</span><span class="legend-word">词语</span></div><p>悬停词块可查看词性、原形和读音说明；精准模式的结果依赖本地加载的日语词典。</p></section>
    </template>

    <section v-else class="empty-study"><span>詞</span><strong>等待一段日语歌词</strong><p>可粘贴文本、读取 URL、上传文件，或先载入示例体验逐行学习。</p><el-button type="primary" @click="fillSample">使用示例歌词</el-button></section>

    <ToolGuide title="使用说明"><div class="detail-copy"><p>支持纯文本、LRC、同时间戳双语歌词、相邻翻译行和“日语 / 翻译”同行写法。</p><p>全部歌词适合整体浏览；逐行专注模式可前后切换并标记学习进度。显示开关只影响页面阅读，不会改变原始文本。</p><p>默认轻量模式主要转换假名；精准读音会加载 kuromoji 词典，改进汉字词读音、词性与原形信息。</p></div></ToolGuide>
  </div>
</template>

<style scoped>
.lyrics-tool {
  --ink: #293247;
  --muted:#6b7890
}
.source-workbench,.study-toolbar,.focus-nav,.legend-card,.empty-study {
  border: 1px solid #e1e5f0;
  border-radius: 24px;
  background: var(--c-surface);
  box-shadow:0 12px 30px rgba(51,65,85,.06)
}
.section-header>div>span,.source-sidebar header>span {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: .14em;
  color:#7761aa
}
.section-header p {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  color:var(--muted)
}
.source-workbench {
  display: grid;
  grid-template-columns: minmax(0,1fr) 320px;
  gap: 18px;
  margin-top: 14px;
  padding:18px
}
.source-main,.source-sidebar {
  min-width:0
}
.section-header {
  display: flex;
  justify-content: space-between;
  gap: 15px;
  margin-bottom:13px
}
.section-header h3,.source-sidebar h3 {
  margin: 4px 0;
  font-size: 18px;
  color:var(--ink)
}
.header-actions,.export-actions {
  display: flex;
  gap: 8px;
  align-items:flex-start
}
.line-actions button {
  padding: 8px 11px;
  border: 1px solid #d8deea;
  border-radius: var(--radius-sm);
  background: var(--c-surface);
  font-size: 13px;
  color:#526078
}
.meta-row {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
  margin-top:10px
}
.meta-row span {
  padding: 6px 9px;
  border: 1px solid #dfe4ed;
  border-radius: var(--radius-sm);
  background: #f7f9fc;
  font-size: 12px;
  color:#667489
}
.meta-row b {
  margin-right: 5px;
  color:#46556d
}
.parse-warning,.error-text {
  margin-top: 10px;
  padding: 10px;
  border-radius: var(--radius-sm);
  background: #fff1f0;
  font-size: 13px;
  color:#b85252
}
.source-sidebar {
  padding: 15px;
  border: 1px solid #e2e5ee;
  border-radius: var(--radius-lg);
  background:#fafbfe
}
.url-field {
  display: block;
  margin-top:14px
}
.url-field>span {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 700;
  color:#69758a
}
.sidebar-action {
  width: 100%;
  margin-top: 9px;
}
.settings-group,.font-setting {
  margin-top: 13px;
  padding: 12px;
  border: 1px solid #e0e5ee;
  border-radius: var(--radius-md);
  background:var(--c-surface)
}
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding:5px 0
}
.setting-row strong,.setting-row span {
  display:block
}
.setting-row strong {
  font-size: 13px;
  color:var(--ink)
}
.setting-row span {
  margin-top: 2px;
  font-size: 12px;
  color:#7a8799
}
.info-text,.error-text {
  font-size:12px
}
.info-text {
  color:#4c76b4
}
.font-setting>div {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color:#56647a
}
.study-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: 14px;
  padding:13px 16px
}
.view-switch {
  display: flex;
  padding: 4px;
  border-radius: var(--radius-sm);
  background:#eef1f6
}
.view-switch button {
  padding: 7px 12px;
  border-radius: var(--radius-xs);
  font-size: 13px;
  color:#69758a
}
.view-switch button.active {
  background: var(--c-surface);
  color: #6746ba;
  box-shadow:0 3px 10px rgba(51,65,85,.1)
}
.display-switches {
  display: flex;
  gap: 14px;
  flex-wrap:wrap
}
.display-switches label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color:#5f6c80
}
.insight-grid {
  display: grid;
  grid-template-columns: repeat(4,1fr);
  gap: 10px;
  margin-top:12px
}
.insight-grid article {
  display: flex;
  gap: 11px;
  min-width: 0;
  padding: 14px;
  border: 1px solid;
  border-radius:var(--radius-lg)
}
.insight-grid article>span {
  display: grid;
  place-items: center;
  flex: 0 0 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  font-weight:800
}
.insight-grid strong {
  font-size: 13px;
  color:var(--ink)
}
.insight-grid p {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color:#68768b
}
.insight-grid .sky {
  border-color: #cfe6fa;
  background:#f3faff
}
.insight-grid .sky>span {
  background: #dff1ff;
  color:#2874aa
}
.insight-grid .rose {
  border-color: #f4d5db;
  background:#fff7f8
}
.insight-grid .rose>span {
  background: #ffe4e8;
  color:#b54e64
}
.insight-grid .violet {
  border-color: #e2d8f6;
  background:#faf7ff
}
.insight-grid .violet>span {
  background: #eee5ff;
  color:#7252b3
}
.insight-grid .green {
  border-color: #cfeadc;
  background:#f5fcf8
}
.insight-grid .green>span {
  background: #dcf5e8;
  color:#33855a
}
.focus-nav {
  display: grid;
  grid-template-columns: auto minmax(180px,420px) auto;
  align-items: center;
  justify-content: center;
  gap: 22px;
  margin-top: 12px;
  padding:13px 18px
}
.focus-nav>div {
  text-align:center
}
.focus-nav span {
  font-size: 12px;
  color:#7a8799
}
.focus-nav strong {
  display: block;
  font-size: 14px;
  color:var(--ink)
}
.progress-track {
  height: 5px;
  margin-top: 7px;
  border-radius: var(--radius-full);
  background: #e7eaf1;
  overflow:hidden
}
.progress-track i {
  display: block;
  height: 100%;
  background:linear-gradient(90deg,#805ad5,#4c83df)
}
.lyrics-list {
  display: grid;
  gap: 11px;
  margin-top:12px
}
.lyrics-list.focused {
  max-width: 920px;
  margin-left: auto;
  margin-right:auto
}
.lyric-card {
  overflow: hidden;
  border: 1px solid #e1e6ef;
  border-radius: 19px;
  background: var(--c-surface);
  box-shadow: 0 8px 22px rgba(51,65,85,.05);
  transition:.2s
}
.lyric-card.active {
  border-color: #b9a5ea;
  box-shadow:0 0 0 3px rgba(118,85,202,.07),0 9px 24px rgba(51,65,85,.06)
}
.lyric-card.completed {
  border-left:4px solid #43aa75
}
.lyric-card>header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid #e8ebf1;
  background:#f8f9fc
}
.line-badges,.line-actions {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap:wrap
}
.line-badges>span {
  padding: 5px 8px;
  border-radius: var(--radius-xs);
  font-size:12px
}
.index-badge {
  background: #e9edf3;
  color:#5f6b7e
}
.time-badge {
  background: #e5f1ff;
  color:#3971b1
}
.translation-badge {
  background: #e3f7ec;
  color:#317b55
}
.done-badge {
  background: #dcf6e7;
  color:#2c8153
}
.line-actions>span {
  font-size: 12px;
  color:#8a96a8
}
.line-actions button {
  padding: 5px 8px;
  font-size:12px
}
.line-content {
  padding:18px
}
.token-row {
  display: flex;
  align-items: stretch;
  gap: 6px;
  flex-wrap: wrap;
  line-height:1
}
.token-row>span {
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
  border-radius: var(--radius-sm);
  padding:5px 4px
}
.token-reading,.token-romaji {
  min-height: 14px;
  color: #748196;
  line-height:1.2
}
.token-text {
  font-weight: 600;
  line-height:1.35
}
.line-translation {
  margin-top: 14px;
  padding: 11px 13px;
  border-left: 3px solid #76c89a;
  border-radius: 0 10px 10px 0;
  background: #f4fbf7;
  line-height: 1.7;
  color:#435266
}
.legend-card {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: 12px;
  padding:14px 17px
}
.legend-card strong {
  font-size: 13px;
  color:var(--ink)
}
.legend-card>div {
  display: flex;
  gap:7px
}
.legend-card>div span {
  padding: 5px 8px;
  border-radius: var(--radius-xs);
  font-size:12px
}
.legend-particle {
  background: #e1f2ff;
  color:#3477aa
}
.legend-ending {
  background: #ffe5ea;
  color:#ad5064
}
.legend-katakana {
  background: #eee4ff;
  color:#6e50ad
}
.legend-word {
  background: #edf0f5;
  color:#5b687b
}
.legend-card p {
  flex: 1;
  margin: 0;
  font-size: 12px;
  color:#778498
}
.empty-study {
  display: flex;
  min-height: 300px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-top: 14px;
  text-align:center
}
.empty-study>span {
  display: grid;
  place-items: center;
  width: 58px;
  height: 58px;
  border-radius: 17px;
  background: #eee7ff;
  color: #7655ca;
  font-size: 22px;
  font-weight:800
}
.empty-study strong {
  margin-top: 13px;
  font-size: 17px;
  color:var(--ink)
}
.empty-study p {
  font-size: 13px;
  color:var(--muted)
}
.empty-study button {
  border-color: #b9a7e4;
  color:#6749af
}
.detail-copy {
  font-size: 14px;
  line-height: 1.9;
  color: var(--c-text-secondary)
}
.detail-copy p {
  margin:0 0 8px
}
.dark .source-workbench,.dark .study-toolbar,.dark .focus-nav,.dark .legend-card,.dark .empty-study,.dark .lyric-card {
  border-color: #344155;
  background:#172033
}
.dark .section-header p {
  color:#a9b5c6
}
.dark .source-sidebar,.dark .settings-group,.dark .font-setting {
  border-color: #344155;
  background:#111a2a
}
.dark .line-actions button {
  border-color: #3b485d;
  background: #1a2638;
  color:#cbd6e4
}
.dark .meta-row span {
  border-color: #3b485d;
  background: #111a2a;
  color:#aab6c7
}
.dark .study-toolbar .view-switch {
  background:#111a2a
}
.dark .view-switch button.active {
  background: #29354a;
  color:#c7b8f2
}
.dark .insight-grid article {
  border-color: #344155;
  background:#172033
}
.dark .lyric-card>header {
  border-color: #344155;
  background:#111a2a
}
.dark .line-translation {
  background: #142b22;
  color:#c9d8cf
}
.dark .detail-copy {
  color:#aab7c8
}
@media(max-width:1050px) {
  .source-workbench {
    grid-template-columns:1fr
  }
  .insight-grid {
    grid-template-columns:repeat(2,1fr)
  }
}
@media(max-width:680px) {
  .source-workbench {
    padding:13px
  }
  .section-header,.study-toolbar,.lyric-card>header {
    align-items: flex-start;
    flex-direction:column
  }
  .header-actions,.export-actions {
    width:100%
  }
  .header-actions :deep(.el-button),.export-actions :deep(.el-button) {
    flex:1
  }
  .study-toolbar {
    padding:13px
  }
  .display-switches {
    width: 100%;
    justify-content:space-between
  }
  .insight-grid {
    grid-template-columns:1fr
  }
  .focus-nav {
    grid-template-columns:1fr 1fr
  }
  .focus-nav>div {
    grid-column: 1/-1;
    grid-row:1
  }
  .line-actions {
    width:100%
  }
  .line-content {
    padding:14px
  }
  .legend-card {
    align-items: flex-start;
    flex-direction:column
  }
  .empty-study {
    min-height:250px
  }
}
</style>
