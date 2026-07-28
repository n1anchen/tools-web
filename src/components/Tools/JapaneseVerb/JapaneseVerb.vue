<script setup lang="ts">
import { computed } from 'vue'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { copy } from '@/utils/string'

type VerbKind = 'godan' | 'ichidan' | 'suru' | 'kuru' | 'aru'
type GodanEnding = 'う' | 'く' | 'ぐ' | 'す' | 'つ' | 'ぬ' | 'ぶ' | 'む' | 'る'
type GodanRow = 'a' | 'i' | 'e' | 'o'

interface Candidate {
  dictionary: string
  kind: VerbKind
  source: string
  confidence: number
}

interface FormRow {
  label: string
  values: string[]
  note?: string
}

interface Result {
  key: string
  dictionary: string
  kind: VerbKind
  kindLabel: string
  source: string
  confidence: number
  rows: FormRow[]
  matchedLabels: string[]
}

const title = '日语动词变化'
const input = defineModel<string>({ default: '' })

const GODAN_ENDINGS: GodanEnding[] = ['う', 'く', 'ぐ', 'す', 'つ', 'ぬ', 'ぶ', 'む', 'る']
const GODAN_ROWS: Record<GodanEnding, Record<GodanRow, string>> = {
  'う': { a: 'わ', i: 'い', e: 'え', o: 'お' },
  'く': { a: 'か', i: 'き', e: 'け', o: 'こ' },
  'ぐ': { a: 'が', i: 'ぎ', e: 'げ', o: 'ご' },
  'す': { a: 'さ', i: 'し', e: 'せ', o: 'そ' },
  'つ': { a: 'た', i: 'ち', e: 'て', o: 'と' },
  'ぬ': { a: 'な', i: 'に', e: 'ね', o: 'の' },
  'ぶ': { a: 'ば', i: 'び', e: 'べ', o: 'ぼ' },
  'む': { a: 'ま', i: 'み', e: 'め', o: 'も' },
  'る': { a: 'ら', i: 'り', e: 'れ', o: 'ろ' },
}

const ROW_TO_ENDING = {
  a: Object.fromEntries(GODAN_ENDINGS.map(ending => [GODAN_ROWS[ending].a, ending])) as Record<string, GodanEnding>,
  i: Object.fromEntries(GODAN_ENDINGS.map(ending => [GODAN_ROWS[ending].i, ending])) as Record<string, GodanEnding>,
  e: Object.fromEntries(GODAN_ENDINGS.map(ending => [GODAN_ROWS[ending].e, ending])) as Record<string, GodanEnding>,
  o: Object.fromEntries(GODAN_ENDINGS.map(ending => [GODAN_ROWS[ending].o, ending])) as Record<string, GodanEnding>,
}

const ICHIDAN_HINTS = new Set(['い', 'き', 'ぎ', 'し', 'じ', 'ち', 'に', 'ひ', 'び', 'ぴ', 'み', 'り', 'え', 'け', 'げ', 'せ', 'ぜ', 'て', 'で', 'ね', 'へ', 'べ', 'ぺ', 'め', 'れ'])

const kindLabels: Record<VerbKind, string> = {
  godan: '五段动词',
  ichidan: '一段动词',
  suru: 'サ变动词',
  kuru: 'カ变动词',
  aru: '特殊动词',
}

const normalizedInput = computed(() => input.value.trim())
const isEmpty = computed(() => normalizedInput.value === '')
const results = computed<Result[]>(() => analyzeVerb(normalizedInput.value))

function addCandidate(candidates: Candidate[], candidate: Candidate) {
  if (!candidate.dictionary) return
  if (candidates.some(item => item.dictionary === candidate.dictionary && item.kind === candidate.kind)) return
  candidates.push(candidate)
}

function stripSuffix(value: string, suffix: string) {
  if (!value.endsWith(suffix)) return null
  return value.slice(0, value.length - suffix.length)
}

function lastChar(value: string) {
  return value.slice(-1)
}

function withoutLast(value: string) {
  return value.slice(0, -1)
}

function looksLikeIchidan(dictionary: string) {
  if (!dictionary.endsWith('る') || dictionary.length < 2) return false
  return ICHIDAN_HINTS.has(dictionary.slice(-2, -1))
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

function godanStem(dictionary: string) {
  return dictionary.slice(0, -1)
}

function godanEnding(dictionary: string) {
  return dictionary.slice(-1) as GodanEnding
}

function godanRow(dictionary: string, row: GodanRow) {
  const ending = godanEnding(dictionary)
  return `${godanStem(dictionary)}${GODAN_ROWS[ending][row]}`
}

function isGodanDictionary(value: string) {
  return GODAN_ENDINGS.includes(value.slice(-1) as GodanEnding)
}

function isIkuException(dictionary: string) {
  return dictionary === '行く' || dictionary === 'いく' || dictionary === 'ゆく'
}

function ichidanStem(dictionary: string) {
  return dictionary.slice(0, -1)
}

function ichidanSeries(base: string) {
  const stem = ichidanStem(base)
  return {
    plain: base,
    polite: `${stem}ます`,
    past: `${stem}た`,
    te: `${stem}て`,
    negative: `${stem}ない`,
  }
}

function generateGodanRows(dictionary: string): FormRow[] {
  const stem = godanStem(dictionary)
  const ending = godanEnding(dictionary)
  const te = isIkuException(dictionary)
    ? `${stem}って`
    : ending === 'く'
      ? `${stem}いて`
      : ending === 'ぐ'
        ? `${stem}いで`
        : ending === 'す'
          ? `${stem}して`
          : ['う', 'つ', 'る'].includes(ending)
            ? `${stem}って`
            : `${stem}んで`
  const past = te.endsWith('て') ? `${te.slice(0, -1)}た` : `${te.slice(0, -1)}だ`
  const potential = `${godanRow(dictionary, 'e')}る`
  const passive = `${godanRow(dictionary, 'a')}れる`
  const causative = `${godanRow(dictionary, 'a')}せる`
  const causativePassiveShort = `${godanRow(dictionary, 'a')}される`
  const causativePassiveLong = `${godanRow(dictionary, 'a')}せられる`

  return [
    { label: '辞书形', values: [dictionary] },
    { label: '连用形', values: [godanRow(dictionary, 'i')] },
    { label: 'ます形', values: [`${godanRow(dictionary, 'i')}ます`, `${godanRow(dictionary, 'i')}ました`, `${godanRow(dictionary, 'i')}ません`, `${godanRow(dictionary, 'i')}ませんでした`] },
    { label: 'て形', values: [te] },
    { label: 'た形', values: [past, `${past}ら`] },
    { label: 'ない形', values: [`${godanRow(dictionary, 'a')}ない`, `${godanRow(dictionary, 'a')}なかった`] },
    { label: '意向形', values: [`${godanRow(dictionary, 'o')}う`] },
    { label: '命令形', values: [godanRow(dictionary, 'e')] },
    { label: '条件形', values: [`${godanRow(dictionary, 'e')}ば`] },
    { label: '可能形', values: [potential, ichidanSeries(potential).polite, ichidanSeries(potential).past, ichidanSeries(potential).negative] },
    { label: '被动形', values: [passive, ichidanSeries(passive).polite, ichidanSeries(passive).past, ichidanSeries(passive).negative] },
    { label: '使役形', values: [causative, ichidanSeries(causative).polite, ichidanSeries(causative).past, ichidanSeries(causative).negative] },
    { label: '使役被动形', values: [causativePassiveShort, causativePassiveLong, ichidanSeries(causativePassiveShort).polite, ichidanSeries(causativePassiveLong).polite], note: '短缩形 / 标准形' },
    { label: 'たい形', values: [`${godanRow(dictionary, 'i')}たい`, `${godanRow(dictionary, 'i')}たかった`, `${godanRow(dictionary, 'i')}たくない`] },
  ]
}

function generateIchidanRows(dictionary: string): FormRow[] {
  const stem = ichidanStem(dictionary)
  const potential = `${stem}られる`
  const potentialCasual = `${stem}れる`
  const passive = `${stem}られる`
  const causative = `${stem}させる`
  const causativePassive = `${stem}させられる`

  return [
    { label: '辞书形', values: [dictionary] },
    { label: '连用形', values: [stem] },
    { label: 'ます形', values: [`${stem}ます`, `${stem}ました`, `${stem}ません`, `${stem}ませんでした`] },
    { label: 'て形', values: [`${stem}て`] },
    { label: 'た形', values: [`${stem}た`, `${stem}たら`] },
    { label: 'ない形', values: [`${stem}ない`, `${stem}なかった`] },
    { label: '意向形', values: [`${stem}よう`] },
    { label: '命令形', values: [`${stem}ろ`, `${stem}よ`] },
    { label: '条件形', values: [`${stem}れば`] },
    { label: '可能形', values: [potential, potentialCasual, ichidanSeries(potential).polite, ichidanSeries(potentialCasual).polite, ichidanSeries(potential).negative], note: 'ら抜き言葉也会列出' },
    { label: '被动形', values: [passive, ichidanSeries(passive).polite, ichidanSeries(passive).past, ichidanSeries(passive).negative] },
    { label: '使役形', values: [causative, ichidanSeries(causative).polite, ichidanSeries(causative).past, ichidanSeries(causative).negative] },
    { label: '使役被动形', values: [causativePassive, ichidanSeries(causativePassive).polite, ichidanSeries(causativePassive).past, ichidanSeries(causativePassive).negative] },
    { label: 'たい形', values: [`${stem}たい`, `${stem}たかった`, `${stem}たくない`] },
  ]
}

function generateSuruRows(dictionary: string): FormRow[] {
  const prefix = dictionary.slice(0, -2)
  const potential = `${prefix}できる`
  const passive = `${prefix}される`
  const causative = `${prefix}させる`
  const causativePassive = `${prefix}させられる`

  return [
    { label: '辞书形', values: [dictionary] },
    { label: '连用形', values: [`${prefix}し`] },
    { label: 'ます形', values: [`${prefix}します`, `${prefix}しました`, `${prefix}しません`, `${prefix}しませんでした`] },
    { label: 'て形', values: [`${prefix}して`] },
    { label: 'た形', values: [`${prefix}した`, `${prefix}したら`] },
    { label: 'ない形', values: [`${prefix}しない`, `${prefix}しなかった`] },
    { label: '意向形', values: [`${prefix}しよう`] },
    { label: '命令形', values: [`${prefix}しろ`, `${prefix}せよ`] },
    { label: '条件形', values: [`${prefix}すれば`] },
    { label: '可能形', values: [potential, ichidanSeries(potential).polite, ichidanSeries(potential).past, ichidanSeries(potential).negative] },
    { label: '被动形', values: [passive, ichidanSeries(passive).polite, ichidanSeries(passive).past, ichidanSeries(passive).negative] },
    { label: '使役形', values: [causative, ichidanSeries(causative).polite, ichidanSeries(causative).past, ichidanSeries(causative).negative] },
    { label: '使役被动形', values: [causativePassive, ichidanSeries(causativePassive).polite, ichidanSeries(causativePassive).past, ichidanSeries(causativePassive).negative] },
    { label: 'たい形', values: [`${prefix}したい`, `${prefix}したかった`, `${prefix}したくない`] },
  ]
}

function generateKuruRows(dictionary: string): FormRow[] {
  const isKana = dictionary === 'くる'
  const stems = isKana
    ? { ku: 'く', ki: 'き', ko: 'こ' }
    : { ku: '来', ki: '来', ko: '来' }
  const potential = `${stems.ko}られる`
  const causative = `${stems.ko}させる`
  const causativePassive = `${stems.ko}させられる`

  return [
    { label: '辞书形', values: [dictionary] },
    { label: '连用形', values: [stems.ki] },
    { label: 'ます形', values: [`${stems.ki}ます`, `${stems.ki}ました`, `${stems.ki}ません`, `${stems.ki}ませんでした`] },
    { label: 'て形', values: [`${stems.ki}て`] },
    { label: 'た形', values: [`${stems.ki}た`, `${stems.ki}たら`] },
    { label: 'ない形', values: [`${stems.ko}ない`, `${stems.ko}なかった`] },
    { label: '意向形', values: [`${stems.ko}よう`] },
    { label: '命令形', values: [`${stems.ko}い`] },
    { label: '条件形', values: [`${stems.ku}れば`] },
    { label: '可能形', values: [potential, ichidanSeries(potential).polite, ichidanSeries(potential).past, ichidanSeries(potential).negative] },
    { label: '被动形', values: [potential, ichidanSeries(potential).polite, ichidanSeries(potential).past, ichidanSeries(potential).negative] },
    { label: '使役形', values: [causative, ichidanSeries(causative).polite, ichidanSeries(causative).past, ichidanSeries(causative).negative] },
    { label: '使役被动形', values: [causativePassive, ichidanSeries(causativePassive).polite, ichidanSeries(causativePassive).past, ichidanSeries(causativePassive).negative] },
    { label: 'たい形', values: [`${stems.ki}たい`, `${stems.ki}たかった`, `${stems.ki}たくない`] },
  ]
}

function generateAruRows(): FormRow[] {
  return [
    { label: '辞书形', values: ['ある'] },
    { label: '连用形', values: ['あり'] },
    { label: 'ます形', values: ['あります', 'ありました', 'ありません', 'ありませんでした'] },
    { label: 'て形', values: ['あって'] },
    { label: 'た形', values: ['あった', 'あったら'] },
    { label: 'ない形', values: ['ない', 'なかった'], note: '「ある」的否定形不使用「あらない」' },
    { label: '意向形', values: ['あろう'] },
    { label: '命令形', values: ['あれ'] },
    { label: '条件形', values: ['あれば'] },
    { label: 'たい形', values: ['ありたい', 'ありたかった', 'ありたくない'] },
  ]
}

function generateRows(candidate: Candidate) {
  if (candidate.kind === 'godan') return generateGodanRows(candidate.dictionary)
  if (candidate.kind === 'ichidan') return generateIchidanRows(candidate.dictionary)
  if (candidate.kind === 'suru') return generateSuruRows(candidate.dictionary)
  if (candidate.kind === 'kuru') return generateKuruRows(candidate.dictionary)
  return generateAruRows()
}

function inferDictionaryCandidates(value: string) {
  const candidates: Candidate[] = []

  if (value === 'ある') {
    addCandidate(candidates, { dictionary: 'ある', kind: 'aru', source: '辞书形', confidence: 98 })
  }

  if (value === '来る' || value === 'くる') {
    addCandidate(candidates, { dictionary: value, kind: 'kuru', source: '辞书形', confidence: 98 })
  }

  if (value.endsWith('する')) {
    addCandidate(candidates, { dictionary: value, kind: 'suru', source: '辞书形', confidence: 96 })
  }

  if (isGodanDictionary(value)) {
    const confidence = value.endsWith('る') && looksLikeIchidan(value) ? 62 : 88
    addCandidate(candidates, { dictionary: value, kind: 'godan', source: '辞书形', confidence })
  }

  if (value.endsWith('る')) {
    const confidence = looksLikeIchidan(value) ? 90 : 72
    addCandidate(candidates, { dictionary: value, kind: 'ichidan', source: '辞书形', confidence })
  }

  inferIchidan(value, candidates)
  inferGodan(value, candidates)
  inferSuru(value, candidates)
  inferKuru(value, candidates)
  inferAru(value, candidates)

  return candidates.sort((a, b) => b.confidence - a.confidence)
}

function inferIchidan(value: string, candidates: Candidate[]) {
  const suffixes = [
    'ませんでした',
    'させられます',
    'させられました',
    'させられない',
    'させられた',
    'させられて',
    'られました',
    'られます',
    'られない',
    'られた',
    'られて',
    'れました',
    'れます',
    'れない',
    'れた',
    'れて',
    'させます',
    'させました',
    'させない',
    'させた',
    'させて',
    'ました',
    'ません',
    'ます',
    'なかった',
    'ない',
    'たら',
    'たい',
    'たかった',
    'たくない',
    'よう',
    'れば',
    'ろ',
    'よ',
    'た',
    'て',
  ]

  for (const suffix of suffixes) {
    const stem = stripSuffix(value, suffix)
    if (stem === null || stem === '') continue
    if (suffix === 'た' && (value.endsWith('ました') || value.endsWith('ませんでした'))) continue
    if (suffix === 'て' && value.endsWith('まして')) continue
    addCandidate(candidates, { dictionary: `${stem}る`, kind: 'ichidan', source: `${suffix} から推定`, confidence: suffix.length > 1 ? 78 : 68 })
  }
}

function inferGodanByRow(value: string, suffix: string, row: GodanRow, candidates: Candidate[], source: string, confidence: number) {
  const base = stripSuffix(value, suffix)
  if (base === null || base === '') return
  const ending = ROW_TO_ENDING[row][lastChar(base)]
  if (!ending) return
  addCandidate(candidates, {
    dictionary: `${withoutLast(base)}${ending}`,
    kind: 'godan',
    source,
    confidence,
  })
}

function inferGodan(value: string, candidates: Candidate[]) {
  for (const suffix of ['ませんでした', 'ました', 'ません', 'ます', 'たい', 'たかった', 'たくない']) {
    inferGodanByRow(value, suffix, 'i', candidates, `${suffix} から推定`, 84)
  }

  for (const suffix of ['なかった', 'ない', 'れる', 'れた', 'れて', 'れない', 'せる', 'せた', 'せて', 'せない', 'される', 'された', 'されて', 'されない', 'せられる', 'せられた', 'せられて', 'せられない']) {
    inferGodanByRow(value, suffix, 'a', candidates, `${suffix} から推定`, 82)
  }

  for (const suffix of ['る', 'ます', 'ました', 'ません', 'た', 'て', 'ない']) {
    inferGodanByRow(value, suffix, 'e', candidates, `可能形 ${suffix} から推定`, 76)
  }

  inferGodanByRow(value, 'う', 'o', candidates, '意向形から推定', 82)
  inferGodanByRow(value, 'ば', 'e', candidates, '条件形から推定', 82)

  if (value.length >= 2) {
    const ending = ROW_TO_ENDING.e[lastChar(value)]
    if (ending) {
      addCandidate(candidates, { dictionary: `${withoutLast(value)}${ending}`, kind: 'godan', source: '命令形から推定', confidence: 66 })
    }
  }

  const teTaMap: Array<[string, GodanEnding[], number]> = [
    ['って', ['う', 'つ', 'る'], 80],
    ['った', ['う', 'つ', 'る'], 80],
    ['んで', ['む', 'ぶ', 'ぬ'], 80],
    ['んだ', ['む', 'ぶ', 'ぬ'], 80],
    ['いて', ['く'], 86],
    ['いた', ['く'], 86],
    ['いで', ['ぐ'], 86],
    ['いだ', ['ぐ'], 86],
    ['して', ['す'], 86],
    ['した', ['す'], 86],
  ]

  for (const [suffix, endings, confidence] of teTaMap) {
    const stem = stripSuffix(value, suffix)
    if (stem === null || stem === '') continue
    if ((suffix === 'した' || suffix === 'して') && stem.endsWith('ま')) continue
    for (const ending of endings) {
      addCandidate(candidates, { dictionary: `${stem}${ending}`, kind: 'godan', source: `${suffix} から推定`, confidence })
    }
  }

  for (const suffix of ['って', 'った']) {
    const stem = stripSuffix(value, suffix)
    if (stem === '行' || stem === 'い' || stem === 'ゆ') {
      addCandidate(candidates, { dictionary: `${stem}く`, kind: 'godan', source: '行く特例から推定', confidence: 92 })
    }
  }
}

function inferSuru(value: string, candidates: Candidate[]) {
  const suffixes = [
    'しませんでした',
    'させられました',
    'させられます',
    'させられない',
    'させられた',
    'させられて',
    'されました',
    'されます',
    'されない',
    'された',
    'されて',
    'させました',
    'させます',
    'させない',
    'させた',
    'させて',
    'しました',
    'しません',
    'します',
    'しなかった',
    'しない',
    'したかった',
    'したくない',
    'したい',
    'しよう',
    'すれば',
    'しろ',
    'せよ',
    'して',
    'した',
  ]

  for (const suffix of suffixes) {
    const prefix = stripSuffix(value, suffix)
    if (prefix === null) continue
    if (suffix === 'した' && (value.endsWith('ました') || value.endsWith('ませんでした'))) continue
    if (suffix === 'して' && value.endsWith('まして')) continue
    addCandidate(candidates, { dictionary: `${prefix}する`, kind: 'suru', source: `${suffix} から推定`, confidence: prefix ? 74 : 90 })
  }

  for (const suffix of ['できる', 'できます', 'できました', 'できない', 'できた', 'できて']) {
    const prefix = stripSuffix(value, suffix)
    if (prefix === null) continue
    addCandidate(candidates, { dictionary: `${prefix}する`, kind: 'suru', source: `可能形 ${suffix} から推定`, confidence: prefix ? 96 : 88 })
  }
}

function inferKuru(value: string, candidates: Candidate[]) {
  for (const dictionary of ['来る', 'くる']) {
    const rows = generateKuruRows(dictionary)
    if (rows.some(row => row.values.includes(value))) {
      addCandidate(candidates, { dictionary, kind: 'kuru', source: 'カ变活用から推定', confidence: dictionary === value ? 98 : 90 })
    }
  }
}

function inferAru(value: string, candidates: Candidate[]) {
  const rows = generateAruRows()
  if (rows.some(row => row.values.includes(value))) {
    addCandidate(candidates, { dictionary: 'ある', kind: 'aru', source: '特殊活用から推定', confidence: value === 'ある' ? 98 : 86 })
  }
}

function analyzeVerb(value: string) {
  if (!value) return []

  const matchedResults = inferDictionaryCandidates(value)
    .map(candidate => {
      const rows = generateRows(candidate).map(row => ({
        ...row,
        values: unique(row.values),
      }))
      const matchedLabels = rows
        .filter(row => row.values.includes(value))
        .map(row => row.label)

      return {
        key: `${candidate.kind}-${candidate.dictionary}`,
        dictionary: candidate.dictionary,
        kind: candidate.kind,
        kindLabel: kindLabels[candidate.kind],
        source: candidate.source,
        confidence: candidate.confidence,
        rows,
        matchedLabels,
      }
    })
    .filter(result => result.matchedLabels.length > 0)

  const maxConfidence = Math.max(...matchedResults.map(result => result.confidence))
  const likelyResults = maxConfidence >= 80
    ? matchedResults.filter(result => result.confidence >= 75)
    : matchedResults

  return likelyResults.slice(0, 6)
}

function valueClass(value: string) {
  const isMatched = value === normalizedInput.value
  return [
    'inline-flex items-center rounded-md border px-2 py-1 text-sm leading-tight transition-colors',
    isMatched
      ? 'border-amber-400 bg-amber-100 text-amber-900 ring-2 ring-amber-200 dark:border-amber-300 dark:bg-amber-400/20 dark:text-amber-100 dark:ring-amber-300/20'
      : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200',
  ]
}

function fillSample(value: string) {
  input.value = value
}

function clear() {
  input.value = ''
}

function formatResult(result: Result) {
  const lines = [
    `${result.dictionary}（${result.kindLabel}）`,
    `输入匹配：${result.matchedLabels.join('、')}`,
    '',
    ...result.rows.map(row => `${row.label}：${row.values.join(' / ')}`),
  ]
  return lines.join('\n')
}

function copyResult(result: Result) {
  copy(formatResult(result))
}
</script>

<template>
  <div class="flex flex-col mt-3 flex-1">
    <DetailHeader :title="title" />

    <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-300 space-y-4">
      <div>
        <label class="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
          输入日语动词的任意形式
        </label>
        <el-input
          v-model="input"
          size="large"
          placeholder="例如：食べました、書いて、勉強できる、来ます"
          clearable
          autofocus
        />
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          v-for="sample in ['食べました', '書いて', '話せます', '勉強できる', '来ない']"
          :key="sample"
          @click="fillSample(sample)"
          class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-700 text-sm text-slate-700 dark:text-slate-200 transition-colors"
        >
          {{ sample }}
        </button>
        <button
          v-if="!isEmpty"
          @click="clear"
          class="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-sm text-slate-700 dark:text-slate-200 transition-colors"
        >
          清空
        </button>
      </div>

      <div v-if="!isEmpty && results.length === 0" class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100">
        暂未识别到常见动词活用。请确认输入的是单个动词形式，例如「読む」「読みます」「読んだ」。
      </div>

      <div v-if="results.length > 0" class="space-y-4">
        <section
          v-for="(result, index) in results"
          :key="result.key"
          class="rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden"
        >
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-4 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-600">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-base font-semibold text-slate-800 dark:text-slate-100">{{ result.dictionary }}</span>
                <span class="rounded px-2 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-400/20 dark:text-blue-200">{{ result.kindLabel }}</span>
                <span v-if="results.length > 1" class="rounded px-2 py-0.5 text-xs bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300">候选 {{ index + 1 }}</span>
              </div>
              <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                根据「{{ result.source }}」识别，输入匹配：{{ result.matchedLabels.join('、') }}
              </p>
            </div>
            <button
              @click="copyResult(result)"
              class="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-sm text-white transition-colors"
            >
              复制
            </button>
          </div>

          <div class="divide-y divide-slate-100 dark:divide-slate-700">
            <div
              v-for="row in result.rows"
              :key="row.label"
              class="grid gap-2 px-4 py-3 sm:grid-cols-[120px_1fr]"
            >
              <div class="text-sm font-medium text-slate-600 dark:text-slate-300">
                {{ row.label }}
                <div v-if="row.note" class="mt-0.5 text-xs font-normal text-slate-400 dark:text-slate-500">{{ row.note }}</div>
              </div>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="value in row.values"
                  :key="value"
                  :class="valueClass(value)"
                >
                  {{ value }}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <ToolDetail title="使用说明">
      <el-text>
        输入一个日语动词的常见活用形式，工具会尝试反推出辞书形，并列出ます形、て形、た形、ない形、意向形、命令形、条件形、可能形、被动形、使役形等形式。<br />
        对「見る / 帰る」这类一段、五段都可能成立的形式，会显示多个候选；黄色高亮即为你输入的形式。<br />
        本工具基于常见活用规则进行本地推导，不含完整词典，少数特殊动词、敬语或复合表达可能需要人工确认。
      </el-text>
    </ToolDetail>
  </div>
</template>
