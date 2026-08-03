<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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
const input = ref('')
const analysisInput = ref('')
const activeResultKey = ref('')
const activeCategory = ref<'all' | 'basic' | 'polite' | 'mood' | 'voice'>('all')
const recentInputs = ref<string[]>(readRecentInputs())

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

const normalizedInput = computed(() => analysisInput.value.trim())
const isEmpty = computed(() => input.value.trim() === '')
const results = computed<Result[]>(() => analyzeVerb(normalizedInput.value))
const hasAnalyzed = computed(() => normalizedInput.value !== '')
const activeResult = computed(() => results.value.find(result => result.key === activeResultKey.value) || results.value[0] || null)

const categoryTabs = [
  { id: 'all' as const, label: '全部活用' },
  { id: 'basic' as const, label: '基础形' },
  { id: 'polite' as const, label: '礼貌体' },
  { id: 'mood' as const, label: '语气与条件' },
  { id: 'voice' as const, label: '语态变化' },
]

const visibleRows = computed(() => {
  if (!activeResult.value) return []
  if (activeCategory.value === 'all') return activeResult.value.rows
  return activeResult.value.rows.filter(row => rowCategory(row.label) === activeCategory.value)
})

watch(results, value => {
  if (!value.some(result => result.key === activeResultKey.value)) {
    activeResultKey.value = value[0]?.key || ''
  }
}, { immediate: true })

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
  return { 'form-chip': true, matched: isMatched }
}

function fillSample(value: string) {
  input.value = value
  runAnalysis()
}

function clear() {
  input.value = ''
  analysisInput.value = ''
  activeResultKey.value = ''
}

function runAnalysis() {
  const value = input.value.trim()
  if (!value) return
  analysisInput.value = value
  activeCategory.value = 'all'
  addRecentInput(value)
}

function readRecentInputs() {
  try {
    const parsed = JSON.parse(localStorage.getItem('japaneseVerbRecentInputs') || '[]')
    return Array.isArray(parsed) ? parsed.filter(value => typeof value === 'string').slice(0, 6) : []
  } catch {
    return []
  }
}

function addRecentInput(value: string) {
  recentInputs.value = [value, ...recentInputs.value.filter(item => item !== value)].slice(0, 6)
  localStorage.setItem('japaneseVerbRecentInputs', JSON.stringify(recentInputs.value))
}

function rowCategory(label: string): 'basic' | 'polite' | 'mood' | 'voice' {
  if (label === 'ます形') return 'polite'
  if (['意向形', '命令形', '条件形', 'たい形'].includes(label)) return 'mood'
  if (['可能形', '被动形', '使役形', '使役被动形'].includes(label)) return 'voice'
  return 'basic'
}

function rowDescription(label: string) {
  const descriptions: Record<string, string> = {
    '辞书形': '词典收录与普通体现在时',
    '连用形': '连接助动词或构成复合表达',
    'ます形': '礼貌体的肯定、过去与否定',
    'て形': '连接动作、请求和进行表达',
    'た形': '普通体过去与假定表达',
    'ない形': '普通体否定及过去否定',
    '意向形': '表达意志、提议或推测',
    '命令形': '直接命令，使用时需注意语气',
    '条件形': '表示“如果……就……”',
    '可能形': '表达能力或可能性',
    '被动形': '表达承受动作或受影响',
    '使役形': '表达让、使某人做某事',
    '使役被动形': '表达被迫做某事',
    'たい形': '表达说话人的愿望',
  }
  return descriptions[label] || ''
}

function confidenceLabel(value: number) {
  if (value >= 90) return '高可信'
  if (value >= 80) return '较可信'
  return '可能候选'
}

function copyRow(row: FormRow) {
  copy(`${row.label}：${row.values.join(' / ')}`)
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
  <div class="verb-tool flex flex-col mt-3 flex-1">
    <DetailHeader :title="title" />

    <section class="hero-card">
      <div>
        <div class="eyebrow">JAPANESE VERB LAB</div>
        <h2>从任意活用形，反推动词原形</h2>
        <p>识别输入属于哪种变化，再按基础形、礼貌体、语气和语态整理完整活用。</p>
      </div>
      <div class="hero-metrics">
        <div><span>识别原形</span><strong>{{ activeResult?.dictionary || '—' }}</strong></div>
        <div><span>动词类型</span><strong>{{ activeResult?.kindLabel || '等待输入' }}</strong></div>
        <div><span>候选数量</span><strong>{{ results.length }}</strong></div>
      </div>
    </section>

    <section class="search-card">
      <div class="search-heading">
        <div><span>VERB INPUT</span><h3>输入一个动词形式</h3></div>
        <button v-if="input || hasAnalyzed" class="text-button" @click="clear">清空</button>
      </div>
      <div class="search-shell">
        <span class="search-mark">動</span>
        <input
          v-model="input"
          lang="ja"
          spellcheck="false"
          autofocus
          placeholder="例如：食べました、書いて、勉強できる、来ます"
          @keyup.enter="runAnalysis"
        />
        <button :disabled="isEmpty" @click="runAnalysis">分析活用</button>
      </div>
      <p class="search-tip">支持辞书形、ます形、て形、た形、否定、可能、被动、使役等常见形式。</p>

      <div class="quick-inputs">
        <div><span>典型示例</span><button v-for="sample in ['食べました', '書いて', '話せます', '勉強できる', '来ない']" :key="sample" @click="fillSample(sample)">{{ sample }}</button></div>
        <div v-if="recentInputs.length"><span>最近分析</span><button v-for="item in recentInputs" :key="item" @click="fillSample(item)">{{ item }}</button></div>
      </div>
    </section>

    <section v-if="hasAnalyzed && results.length === 0" class="notice-card warning">
      <span>?</span>
      <div><strong>暂未识别到常见活用</strong><p>请确认只输入一个动词形式，例如「読む」「読みます」「読んだ」，不要附带助词或完整句子。</p></div>
    </section>

    <section v-if="results.length" class="result-workbench">
      <aside class="candidate-panel">
        <div class="panel-label">推定候选</div>
        <button
          v-for="(result, index) in results"
          :key="result.key"
          :class="{ active: activeResult?.key === result.key }"
          @click="activeResultKey = result.key"
        >
          <span class="candidate-index">{{ String(index + 1).padStart(2, '0') }}</span>
          <span><strong>{{ result.dictionary }}</strong><small>{{ result.kindLabel }}</small></span>
          <span class="confidence">{{ result.confidence }}%</span>
        </button>
        <div class="candidate-note">同一个「る」结尾可能同时符合一段与五段规则，请结合词义确认。</div>
      </aside>

      <div v-if="activeResult" class="forms-panel">
        <div class="result-header">
          <div>
            <span class="result-kicker">DICTIONARY FORM</span>
            <div class="dictionary-line"><h3>{{ activeResult.dictionary }}</h3><span>{{ activeResult.kindLabel }}</span></div>
            <p>根据「{{ activeResult.source }}」识别，输入匹配：{{ activeResult.matchedLabels.join('、') }}</p>
          </div>
          <div class="result-actions">
            <span :class="['confidence-badge', activeResult.confidence >= 90 ? 'high' : 'medium']">{{ confidenceLabel(activeResult.confidence) }} · {{ activeResult.confidence }}%</span>
            <button @click="copyResult(activeResult)">复制全部</button>
          </div>
        </div>

        <div class="matched-banner">
          <span>输入形式</span><strong>{{ normalizedInput }}</strong><span>已高亮显示在下方结果中</span>
        </div>

        <nav class="form-tabs" aria-label="活用分类">
          <button v-for="tab in categoryTabs" :key="tab.id" :class="{ active: activeCategory === tab.id }" @click="activeCategory = tab.id">{{ tab.label }}</button>
        </nav>

        <div class="form-grid">
          <article v-for="row in visibleRows" :key="row.label" class="form-card">
            <div class="form-card-heading">
              <div><strong>{{ row.label }}</strong><span>{{ rowDescription(row.label) }}</span></div>
              <button @click="copyRow(row)">复制</button>
            </div>
            <div class="form-values">
              <button v-for="value in row.values" :key="value" :class="valueClass(value)" @click="copy(value)">{{ value }}</button>
            </div>
            <p v-if="row.note" class="form-note">{{ row.note }}</p>
          </article>
        </div>
      </div>
    </section>

    <section v-else-if="!hasAnalyzed" class="onboarding-card">
      <div class="onboarding-main">
        <span class="large-glyph">書 → 書く</span>
        <h3>输入变化后的形式也没关系</h3>
        <p>工具会先识别末尾变化，再反推辞书形。点击上方示例可以直接查看完整结果。</p>
      </div>
      <div class="rule-preview">
        <div><span>01</span><strong>判断输入形式</strong><p>从「ました」「て」「ない」等结尾识别活用。</p></div>
        <div><span>02</span><strong>反推辞书形</strong><p>同时保留合理的一段、五段或不规则候选。</p></div>
        <div><span>03</span><strong>生成完整对照</strong><p>按用途整理 14 类常见活用形式。</p></div>
      </div>
    </section>

    <section class="reference-card">
      <div class="reference-heading"><span>QUICK REFERENCE</span><h3>五段动词「て形 / た形」速查</h3></div>
      <div class="reference-grid">
        <div><strong>う・つ・る</strong><span>って / った</span><small>買う → 買って</small></div>
        <div><strong>む・ぶ・ぬ</strong><span>んで / んだ</span><small>読む → 読んで</small></div>
        <div><strong>く・ぐ</strong><span>いて / いで</span><small>書く → 書いて</small></div>
        <div><strong>す</strong><span>して / した</span><small>話す → 話して</small></div>
        <div class="exception"><strong>行く（特例）</strong><span>行って / 行った</span><small>不使用「行いて」</small></div>
      </div>
    </section>

    <ToolDetail title="使用说明">
      <el-text>
        输入一个日语动词的常见活用形式，工具会尝试反推出辞书形，并列出ます形、て形、た形、ない形、意向形、命令形、条件形、可能形、被动形、使役形等形式。对「見る / 帰る」这类一段、五段都可能成立的形式，会保留多个候选；高亮项即为输入形式。本工具按常见规则在本地推导，不含完整词典，少数特殊动词、敬语或复合表达仍需人工确认。
      </el-text>
    </ToolDetail>
  </div>
</template>

<style scoped>
.verb-tool { --accent:#6d4fc2; --ink:#292a36; --muted:#747384; }
.hero-card { display:flex; align-items:flex-end; justify-content:space-between; gap:24px; padding:26px; border:1px solid #e1dcf0; border-radius:24px; background:linear-gradient(135deg,#fbf9ff,#f3efff 58%,#eff7ff); box-shadow:0 14px 34px rgba(73,60,113,.07); }.eyebrow,.search-heading span,.result-kicker,.reference-heading>span { color:#7a64aa; font-size:13px; font-weight:800; letter-spacing:.12em; }.hero-card h2 { margin:6px 0 8px; color:var(--ink); font-size:25px; line-height:1.3; font-weight:800; }.hero-card p { margin:0; color:var(--muted); font-size:14px; line-height:1.7; }.hero-metrics { display:grid; grid-template-columns:repeat(3,minmax(110px,1fr)); min-width:430px; padding:13px 0; border:1px solid rgba(134,114,183,.22); border-radius:17px; background:rgba(255,255,255,.72); }.hero-metrics div { padding:0 17px; border-right:1px solid #e5e0ef; }.hero-metrics div:last-child { border-right:0; }.hero-metrics span { display:block; color:#898398; font-size:13px; }.hero-metrics strong { display:block; margin-top:5px; overflow:hidden; color:#413b53; font-size:15px; white-space:nowrap; text-overflow:ellipsis; }
.search-card,.reference-card,.onboarding-card,.result-workbench,.notice-card { margin-top:14px; border:1px solid #e1e2e9; border-radius:19px; background:#fff; box-shadow:0 10px 26px rgba(48,43,64,.045); }.search-card { padding:21px; }.search-heading { display:flex; align-items:center; justify-content:space-between; }.search-heading h3,.reference-heading h3 { margin:4px 0 0; color:var(--ink); font-size:18px; font-weight:800; }.text-button { border:0; background:transparent; color:#7657bc; font-size:13px; font-weight:700; cursor:pointer; }.search-shell { display:flex; align-items:center; gap:8px; margin-top:15px; padding:6px; border:1px solid #d7d5e1; border-radius:14px; background:#fbfbfd; }.search-shell:focus-within { border-color:#9a82d4; box-shadow:0 0 0 3px rgba(109,79,194,.08); }.search-mark { display:grid; place-items:center; width:42px; height:42px; flex:none; border-radius:11px; background:#eee9fc; color:#7054b3; font-size:16px; font-weight:800; }.search-shell input { flex:1; min-width:0; border:0; outline:0; background:transparent; color:#302d39; font-size:17px; font-family:"Hiragino Sans","Yu Gothic",sans-serif; }.search-shell>button { flex:none; border:0; border-radius:10px; padding:12px 17px; background:var(--accent); color:#fff; font-size:14px; font-weight:750; cursor:pointer; }.search-shell>button:disabled { opacity:.42; cursor:not-allowed; }.search-tip { margin:8px 2px 0; color:#898493; font-size:13px; }.quick-inputs { display:grid; gap:9px; margin-top:15px; padding-top:14px; border-top:1px solid #eceaf0; }.quick-inputs>div { display:flex; align-items:center; flex-wrap:wrap; gap:7px; }.quick-inputs span { width:64px; color:#777184; font-size:13px; font-weight:700; }.quick-inputs button { border:1px solid #dedbe7; border-radius:8px; padding:6px 10px; background:#fff; color:#5d5768; font-size:14px; cursor:pointer; }.quick-inputs button:hover { border-color:#a996d7; color:#6549aa; background:#faf8ff; }
.notice-card { display:flex; align-items:flex-start; gap:12px; padding:15px 17px; }.notice-card>span { display:grid; place-items:center; width:34px; height:34px; border-radius:50%; background:#fff1d8; color:#9b681b; font-weight:900; }.notice-card strong { color:#6c512a; font-size:14px; }.notice-card p { margin:3px 0 0; color:#8f7550; font-size:13px; line-height:1.55; }
.result-workbench { display:grid; grid-template-columns:220px minmax(0,1fr); overflow:hidden; }.candidate-panel { padding:16px 12px; border-right:1px solid #e5e3eb; background:#f9f8fb; }.panel-label { padding:2px 7px 10px; color:#888292; font-size:13px; font-weight:800; letter-spacing:.08em; }.candidate-panel>button { display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:9px; width:100%; margin-bottom:7px; padding:11px 9px; border:1px solid transparent; border-radius:12px; background:transparent; text-align:left; cursor:pointer; }.candidate-panel>button.active { border-color:#b8a8df; background:#fff; box-shadow:0 5px 15px rgba(77,61,113,.07); }.candidate-index { color:#aaa3b1; font:700 12px ui-monospace,SFMono-Regular,Menlo,monospace; }.candidate-panel strong,.candidate-panel small { display:block; }.candidate-panel strong { color:#373341; font-size:15px; }.candidate-panel small { margin-top:2px; color:#898290; font-size:13px; }.confidence { color:#7056ae; font-size:13px; font-weight:750; }.candidate-note { margin:12px 7px 0; padding-top:12px; border-top:1px solid #e3e0e8; color:#918a98; font-size:13px; line-height:1.55; }
.forms-panel { min-width:0; padding:22px; }.result-header { display:flex; align-items:flex-start; justify-content:space-between; gap:18px; }.dictionary-line { display:flex; align-items:center; gap:10px; margin-top:4px; }.dictionary-line h3 { margin:0; color:#2e2a36; font-size:26px; font-family:"Hiragino Sans","Yu Gothic",sans-serif; }.dictionary-line span { padding:5px 9px; border-radius:8px; background:#eeeafd; color:#654aa7; font-size:13px; font-weight:700; }.result-header p { margin:7px 0 0; color:#7d7685; font-size:13px; }.result-actions { display:flex; align-items:center; gap:8px; flex-wrap:wrap; justify-content:flex-end; }.confidence-badge { padding:7px 9px; border-radius:8px; background:#fff3df; color:#956522; font-size:13px; font-weight:700; }.confidence-badge.high { background:#e7f7ef; color:#287555; }.result-actions button { border:1px solid #d8d0e8; border-radius:8px; padding:7px 10px; background:#fff; color:#684da9; font-size:13px; font-weight:700; cursor:pointer; }.matched-banner { display:flex; align-items:center; flex-wrap:wrap; gap:8px; margin-top:17px; padding:11px 13px; border-radius:12px; background:#fff8e9; color:#8b7047; font-size:13px; }.matched-banner strong { color:#714d17; font-size:15px; }.matched-banner span:last-child { color:#9b8667; }.form-tabs { display:flex; gap:5px; margin-top:17px; padding:4px; overflow-x:auto; border-radius:11px; background:#f1eff4; }.form-tabs button { flex:none; border:0; border-radius:8px; padding:8px 12px; background:transparent; color:#746d7a; font-size:13px; font-weight:700; cursor:pointer; }.form-tabs button.active { background:#fff; color:#674aae; box-shadow:0 2px 8px rgba(65,52,85,.08); }.form-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; margin-top:13px; }.form-card { min-width:0; padding:14px; border:1px solid #e4e1e8; border-radius:13px; background:#fff; }.form-card-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }.form-card-heading strong,.form-card-heading span { display:block; }.form-card-heading strong { color:#433e49; font-size:14px; }.form-card-heading span { margin-top:3px; color:#96909a; font-size:13px; line-height:1.4; }.form-card-heading button { border:0; background:transparent; color:#8268bd; font-size:13px; cursor:pointer; }.form-values { display:flex; flex-wrap:wrap; gap:7px; margin-top:12px; }.form-chip { border:1px solid #ddd9e4; border-radius:8px; padding:7px 9px; background:#faf9fb; color:#3f3a45; font-size:15px; font-family:"Hiragino Sans","Yu Gothic",sans-serif; cursor:pointer; }.form-chip:hover { border-color:#aa98d2; }.form-chip.matched { border-color:#e6ae48; background:#fff4d9; color:#744a09; box-shadow:0 0 0 2px rgba(230,174,72,.12); }.form-note { margin:9px 0 0; color:#9a7380; font-size:13px; }
.onboarding-card { display:grid; grid-template-columns:minmax(260px,.8fr) minmax(0,1.2fr); overflow:hidden; }.onboarding-main { display:grid; place-items:center; align-content:center; padding:28px; text-align:center; background:linear-gradient(135deg,#faf8ff,#f4f0ff); }.large-glyph { color:#7256b7; font:800 26px ui-monospace,SFMono-Regular,Menlo,monospace; }.onboarding-main h3 { margin:13px 0 5px; color:#403a49; font-size:17px; }.onboarding-main p { margin:0; max-width:360px; color:#817a87; font-size:13px; line-height:1.65; }.rule-preview { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; padding:20px; }.rule-preview div { padding:15px; border:1px solid #e5e2e9; border-radius:13px; }.rule-preview span { color:#917dc0; font-size:13px; font-weight:800; }.rule-preview strong { display:block; margin-top:7px; color:#4d4754; font-size:14px; }.rule-preview p { margin:5px 0 0; color:#8a838d; font-size:13px; line-height:1.55; }
.reference-card { padding:20px; }.reference-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:8px; margin-top:14px; }.reference-grid div { padding:12px; border:1px solid #e4e1e7; border-radius:12px; background:#fbfafc; }.reference-grid strong,.reference-grid span,.reference-grid small { display:block; }.reference-grid strong { color:#514b58; font-size:14px; }.reference-grid span { margin-top:6px; color:#684ca9; font-size:15px; font-weight:750; }.reference-grid small { margin-top:4px; color:#908995; font-size:13px; }.reference-grid .exception { border-color:#ecd5a9; background:#fffbf1; }.reference-grid .exception span { color:#9a681e; }
:global(.dark) .verb-tool { --ink:#f1edf4; --muted:#a9a1ae; }:global(.dark) .hero-card { border-color:#443a58; background:linear-gradient(135deg,#252033,#2a223b 58%,#1d2a3b); }:global(.dark) .hero-metrics,:global(.dark) .search-card,:global(.dark) .reference-card,:global(.dark) .onboarding-card,:global(.dark) .result-workbench,:global(.dark) .notice-card { border-color:#3e4656; background:#1b2637; }:global(.dark) .hero-metrics div,:global(.dark) .quick-inputs,:global(.dark) .candidate-panel,:global(.dark) .candidate-note { border-color:#41495a; }:global(.dark) .hero-metrics strong,:global(.dark) .search-shell input,:global(.dark) .candidate-panel strong,:global(.dark) .dictionary-line h3,:global(.dark) .form-card-heading strong,:global(.dark) .form-chip,:global(.dark) .reference-grid strong { color:#ece7ef; }:global(.dark) .search-shell,:global(.dark) .candidate-panel,:global(.dark) .form-tabs,:global(.dark) .onboarding-main { border-color:#41495a; background:#202b3d; }:global(.dark) .quick-inputs button,:global(.dark) .candidate-panel>button.active,:global(.dark) .result-actions button,:global(.dark) .form-card,:global(.dark) .form-tabs button.active,:global(.dark) .form-chip,:global(.dark) .reference-grid div { border-color:#465063; background:#202c3f; color:#c7becd; }:global(.dark) .form-chip.matched { border-color:#b98a38; background:#3b3120; color:#ffd98f; }:global(.dark) .matched-banner { background:#352f24; }:global(.dark) .onboarding-main h3 { color:#ece6ef; }:global(.dark) .rule-preview div { border-color:#41495a; }:global(.dark) .reference-grid .exception { border-color:#705a35; background:#342e24; }
@media (max-width:900px) { .hero-card { align-items:stretch; flex-direction:column; }.hero-metrics { min-width:0; }.result-workbench { grid-template-columns:1fr; }.candidate-panel { display:flex; gap:7px; overflow-x:auto; border-right:0; border-bottom:1px solid #e5e3eb; }.panel-label,.candidate-note { display:none; }.candidate-panel>button { flex:0 0 190px; margin:0; }.reference-grid { grid-template-columns:repeat(3,1fr); }.onboarding-card { grid-template-columns:1fr; } }
@media (max-width:640px) { .hero-card,.search-card,.forms-panel,.reference-card { padding:18px 15px; }.hero-card h2 { font-size:21px; }.hero-metrics { grid-template-columns:1fr; padding:0; }.hero-metrics div { padding:11px 14px; border-right:0; border-bottom:1px solid #e5e0ef; }.hero-metrics div:last-child { border-bottom:0; }.search-shell { flex-wrap:wrap; }.search-shell input { min-width:calc(100% - 58px); }.search-shell>button { width:100%; }.quick-inputs>div { align-items:flex-start; }.quick-inputs span { width:100%; }.result-header { flex-direction:column; }.result-actions { justify-content:flex-start; }.form-grid { grid-template-columns:1fr; }.rule-preview,.reference-grid { grid-template-columns:1fr; }.onboarding-main { padding:24px 17px; } }
</style>
