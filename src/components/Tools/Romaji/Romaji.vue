<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import * as wanakana from 'wanakana'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import { autoDown } from '@/utils/file'
import { copy } from '@/utils/string'
import {
  analyzeJapaneseText,
  analysisTokensToRomaji,
  cacheKuromojiDictionary,
  clearKuromojiDictionaryCache,
  KUROMOJI_DICTIONARY_CACHE_PREFERENCE_KEY,
  type JapaneseAnalysisToken,
} from '@/utils/japaneseAnalyzer'

const input = ref('')
const baseResult = ref('')
const tokenLines = ref<JapaneseAnalysisToken[][]>([])
const mode = ref<'fast' | 'precise'>(localStorage.getItem('japaneseRomajiPreciseReading') === 'true' ? 'precise' : 'fast')
const outputView = ref<'romaji' | 'hiragana' | 'katakana'>('romaji')
const letterCase = ref<'lower' | 'title' | 'upper'>('lower')
const cacheDictionary = ref(readCacheDictionaryPreference())
const converting = ref(false)
const cacheBusy = ref(false)
const analyzerError = ref('')
let suppressCacheWatcher = false

const examples = [
  { label: '日常问候', text: 'はじめまして。どうぞよろしくおねがいします。' },
  { label: '汉字混排', text: '東京駅から新宿まで電車で行きます。' },
  { label: '片假名', text: 'コンピューターとインターネット' },
]

const inputStats = computed(() => {
  const value = input.value
  return {
    characters: [...value].length,
    lines: value ? value.replace(/\r\n?/g, '\n').split('\n').length : 0,
    kanji: (value.match(/[\u3400-\u9fff]/g) || []).length,
    kana: (value.match(/[\u3040-\u30ff]/g) || []).length,
  }
})
const isEmpty = computed(() => input.value.trim() === '')
const hasResult = computed(() => baseResult.value !== '')
const flattenedTokens = computed(() => tokenLines.value.flat())

const hiraganaResult = computed(() => {
  if (mode.value === 'precise' && tokenLines.value.length) {
    return tokenLines.value.map(tokens => tokens.map(token => token.reading || token.surface).join('')).join('\n')
  }
  return wanakana.toHiragana(input.value)
})
const katakanaResult = computed(() => wanakana.toKatakana(hiraganaResult.value))
const formattedRomaji = computed(() => formatRomaji(baseResult.value, letterCase.value))
const displayedResult = computed(() => {
  if (outputView.value === 'hiragana') return hiraganaResult.value
  if (outputView.value === 'katakana') return katakanaResult.value
  return formattedRomaji.value
})

watch(mode, value => {
  localStorage.setItem('japaneseRomajiPreciseReading', String(value === 'precise'))
  baseResult.value = ''
  tokenLines.value = []
  analyzerError.value = ''
})

watch(input, () => {
  if (hasResult.value) {
    baseResult.value = ''
    tokenLines.value = []
  }
  analyzerError.value = ''
})

watch(cacheDictionary, async (value, oldValue) => {
  if (suppressCacheWatcher) return
  localStorage.setItem(KUROMOJI_DICTIONARY_CACHE_PREFERENCE_KEY, String(value))
  localStorage.removeItem('japaneseRomajiCacheDictionary')
  localStorage.removeItem('japaneseLyricsCacheDictionary')
  cacheBusy.value = true
  try {
    if (value) {
      await cacheKuromojiDictionary()
      ElMessage.success('日语词典已加入离线缓存')
    } else {
      await clearKuromojiDictionaryCache()
      ElMessage.success('日语词典缓存已清理')
    }
  } catch {
    suppressCacheWatcher = true
    cacheDictionary.value = oldValue
    localStorage.setItem(KUROMOJI_DICTIONARY_CACHE_PREFERENCE_KEY, String(oldValue))
    await nextTick()
    suppressCacheWatcher = false
    ElMessage.error(value ? '词典缓存失败，请稍后重试' : '词典缓存清理失败')
  } finally {
    cacheBusy.value = false
  }
})

function readCacheDictionaryPreference() {
  const sharedPreference = localStorage.getItem(KUROMOJI_DICTIONARY_CACHE_PREFERENCE_KEY)
  if (sharedPreference !== null) return sharedPreference === 'true'
  return localStorage.getItem('japaneseRomajiCacheDictionary') === 'true'
    || localStorage.getItem('japaneseLyricsCacheDictionary') === 'true'
}

async function convert() {
  if (isEmpty.value || converting.value) return
  converting.value = true
  analyzerError.value = ''
  try {
    if (mode.value === 'precise') {
      if (cacheDictionary.value) await cacheKuromojiDictionary()
      const lines = input.value.replace(/\r\n?/g, '\n').split('\n')
      tokenLines.value = await Promise.all(lines.map(line => line.trim() ? analyzeJapaneseText(line) : []))
      baseResult.value = tokenLines.value.map(tokens => analysisTokensToRomaji(tokens)).join('\n')
    } else {
      tokenLines.value = []
      baseResult.value = wanakana.toRomaji(input.value)
    }
    outputView.value = 'romaji'
  } catch {
    analyzerError.value = '精准转换失败，请检查网络或稍后重试'
    ElMessage.error(analyzerError.value)
  } finally {
    converting.value = false
  }
}

async function loadExample(text: string) {
  input.value = text
  await nextTick()
  await convert()
}

function clearAll() {
  input.value = ''
  baseResult.value = ''
  tokenLines.value = []
  analyzerError.value = ''
}

function copyResult() {
  copy(displayedResult.value)
}

function downloadResult() {
  const blob = new Blob([displayedResult.value], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  autoDown(url, `japanese-${outputView.value}.txt`)
}

function formatRomaji(value: string, style: typeof letterCase.value) {
  if (style === 'upper') return value.toUpperCase()
  if (style === 'title') return value.toLowerCase().replace(/(^|[\s\n])([a-z])/g, (_, prefix, letter) => `${prefix}${letter.toUpperCase()}`)
  return value.toLowerCase()
}
</script>

<template>
  <div class="romaji-tool flex flex-col mt-3 flex-1">
    <ToolHero summary="把日语读音拆开看，也能直接带走">
      <template #metrics>
        <div class="hero-metrics">
          <div><span>字符</span><strong>{{ inputStats.characters }}</strong></div>
          <div><span>假名</span><strong>{{ inputStats.kana }}</strong></div>
          <div><span>汉字</span><strong>{{ inputStats.kanji }}</strong></div>
          <div><span>行数</span><strong>{{ inputStats.lines }}</strong></div>
        </div>
      </template>
    </ToolHero>

    <section class="mode-grid" aria-label="转换模式">
      <button type="button" :class="{ active: mode === 'fast' }" @click="mode = 'fast'">
        <span class="mode-mark">速</span>
        <span><strong>轻量假名转换</strong><small>即时转换平假名与片假名，无需加载词典</small></span>
        <span class="mode-status">{{ mode === 'fast' ? '已选择' : '选择' }}</span>
      </button>
      <button type="button" :class="{ active: mode === 'precise' }" @click="mode = 'precise'">
        <span class="mode-mark precise">読</span>
        <span><strong>精准汉字读音</strong><small>识别词语、助词和汉字读音，首次需加载词典</small></span>
        <span class="mode-status">{{ mode === 'precise' ? '已选择' : '选择' }}</span>
      </button>
    </section>

    <section class="workspace-card">
      <div class="editor-pane">
        <div class="pane-heading">
          <div><span>INPUT</span><h3>日语原文</h3></div>
          <button v-if="input" type="button" class="text-button" @click="clearAll">清空</button>
        </div>
        <textarea
          v-model="input"
          rows="11"
          spellcheck="false"
          placeholder="输入平假名、片假名或汉字混排文本…&#10;例如：東京駅から新宿まで電車で行きます。"
        ></textarea>
        <div class="editor-footer">
          <span>{{ inputStats.characters }} 字符 · {{ inputStats.lines }} 行</span>
          <button class="primary-button" type="button" :disabled="isEmpty || converting" @click="convert">
            <span v-if="converting" class="loading-dot"></span>{{ converting ? '正在分析读音' : '开始转换' }}
          </button>
        </div>
      </div>

      <div class="result-pane">
        <div class="result-toolbar">
          <div class="output-tabs">
            <button :class="{ active: outputView === 'romaji' }" :disabled="!hasResult" @click="outputView = 'romaji'">罗马音</button>
            <button :class="{ active: outputView === 'hiragana' }" :disabled="!hasResult" @click="outputView = 'hiragana'">平假名</button>
            <button :class="{ active: outputView === 'katakana' }" :disabled="!hasResult" @click="outputView = 'katakana'">片假名</button>
          </div>
          <div v-if="hasResult" class="result-actions">
            <button @click="copyResult">复制</button>
            <button @click="downloadResult">下载 TXT</button>
          </div>
        </div>

        <div v-if="hasResult" class="result-content" :class="outputView">
          {{ displayedResult }}
        </div>
        <div v-else class="empty-result">
          <div class="empty-glyph">あ → A</div>
          <strong>转换结果会显示在这里</strong>
          <p>{{ mode === 'precise' ? '精准模式还能查看词语、读音与词性对照。' : '输入假名后点击“开始转换”。' }}</p>
        </div>

        <div v-if="outputView === 'romaji' && hasResult" class="case-switcher">
          <span>字母样式</span>
          <button :class="{ active: letterCase === 'lower' }" @click="letterCase = 'lower'">lowercase</button>
          <button :class="{ active: letterCase === 'title' }" @click="letterCase = 'title'">Title Case</button>
          <button :class="{ active: letterCase === 'upper' }" @click="letterCase = 'upper'">UPPERCASE</button>
        </div>
      </div>
    </section>

    <div v-if="analyzerError" class="error-banner">{{ analyzerError }}</div>

    <section v-if="mode === 'precise'" class="dictionary-card">
      <div>
        <span class="dictionary-icon">辞</span>
        <div><strong>Kuromoji 日语词典</strong><p>用于识别汉字读音；与“日语歌词学习”工具共用同一份离线缓存。</p></div>
      </div>
      <label class="switch-label">
        <span>{{ cacheBusy ? '处理中…' : cacheDictionary ? '已开启离线缓存' : '仅在使用时加载' }}</span>
        <el-switch v-model="cacheDictionary" :loading="cacheBusy" />
      </label>
    </section>

    <section v-if="mode === 'precise' && flattenedTokens.length" class="token-card">
      <div class="section-heading">
        <div><span>WORD BREAKDOWN</span><h3>词语与读音对照</h3></div>
        <span class="token-count">共 {{ flattenedTokens.length }} 个词元</span>
      </div>
      <div class="token-table-wrap">
        <table>
          <thead><tr><th>原文</th><th>平假名读音</th><th>罗马音</th><th>词性</th><th>基本形</th></tr></thead>
          <tbody>
            <tr v-for="(token, index) in flattenedTokens" :key="`${token.surface}-${index}`">
              <td class="japanese">{{ token.surface }}</td>
              <td class="japanese">{{ token.reading || '—' }}</td>
              <td class="romaji">{{ token.romaji || '—' }}</td>
              <td>{{ token.pos }}<small v-if="token.posDetail">{{ token.posDetail }}</small></td>
              <td class="japanese">{{ token.basicForm }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="examples-card">
      <div><strong>不知道从哪开始？</strong><span>载入一条示例并立即转换</span></div>
      <div class="example-list">
        <button v-for="example in examples" :key="example.label" @click="loadExample(example.text)">
          <strong>{{ example.label }}</strong><span>{{ example.text }}</span>
        </button>
      </div>
    </section>

    <ToolGuide title="使用说明">
      <el-text>
        轻量模式使用 WanaKana，适合平假名和片假名；精准模式使用 Kuromoji 分词并补全汉字读音，适合普通句子。精准模式首次需要加载日语词典，开启离线缓存后可与“日语歌词学习”工具共用。人名、地名、歌词特殊读法仍可能存在多音或分词差异，重要内容建议人工核对。
      </el-text>
    </ToolGuide>
  </div>
</template>

<style scoped>
.romaji-tool { --accent:#e85d45; --ink:#2e2d36; --muted:#756f78; }
.pane-heading span,.section-heading>div>span { color:#a66b59; font-size:13px; font-weight:800; letter-spacing:.12em; }
.hero-metrics { display:grid; grid-template-columns:repeat(4,minmax(96px,1fr)); min-width:400px; overflow:hidden; border:1px solid #e0e9f4; border-radius:18px; background:rgba(255,255,255,.78); }.hero-metrics div { padding:12px 14px; text-align:center; border-left:1px solid #e5edf6; }.hero-metrics div:first-child { border-left:0; }.hero-metrics span,.hero-metrics strong { display:block; }.hero-metrics span { margin-top:4px; color:#7a899c; font-size:12px; }.hero-metrics strong { overflow:hidden; color:#334155; font-size:18px; text-overflow:ellipsis; white-space:nowrap; }
.mode-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; margin-top:14px; }.mode-grid>button { display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:13px; padding:15px; border:1px solid #e2e3e8; border-radius:16px; background:#fff; text-align:left; cursor:pointer; transition:.2s; }.mode-grid>button:hover { border-color:#e2a28f; transform:translateY(-1px); }.mode-grid>button.active { border-color:#e57a61; box-shadow:0 0 0 3px rgba(232,93,69,.08); background:#fffaf8; }.mode-mark { display:grid; place-items:center; width:42px; height:42px; border-radius:12px; color:#c84f3b; background:#fff0eb; font-size:17px; font-weight:800; }.mode-mark.precise { color:#7350a6; background:#f3edff; }.mode-grid strong { display:block; color:#373642; font-size:15px; }.mode-grid small { display:block; margin-top:4px; color:#817b85; font-size:13px; line-height:1.45; }.mode-status { color:#a098a2; font-size:13px; font-weight:700; }.mode-grid button.active .mode-status { color:#d5533e; }
.workspace-card { display:grid; grid-template-columns:1fr 1fr; margin-top:14px; overflow:hidden; border:1px solid #e2e3e8; border-radius:20px; background:#fff; box-shadow:0 12px 30px rgba(56,46,48,.05); }.editor-pane,.result-pane { min-width:0; padding:20px; }.editor-pane { border-right:1px solid #e6e4e6; background:#fffdfb; }.pane-heading,.result-toolbar,.section-heading { display:flex; align-items:center; justify-content:space-between; gap:12px; }.pane-heading h3,.section-heading h3 { margin:4px 0 0; color:var(--ink); font-size:18px; font-weight:800; }.text-button,.result-actions button { border:0; background:transparent; color:#a05c4b; font-size:13px; font-weight:700; cursor:pointer; }.editor-pane textarea { display:block; width:100%; min-height:260px; margin-top:14px; padding:15px; resize:vertical; border:1px solid #dddde3; border-radius:14px; outline:0; background:#fff; color:#33313a; font-size:16px; line-height:1.8; font-family:"Hiragino Sans","Yu Gothic",sans-serif; box-sizing:border-box; }.editor-pane textarea:focus { border-color:#e29a86; box-shadow:0 0 0 3px rgba(232,93,69,.08); }.editor-footer { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:12px; }.editor-footer>span { color:#8b858e; font-size:13px; }.primary-button { display:inline-flex; align-items:center; gap:7px; border:0; border-radius:11px; padding:11px 17px; background:var(--accent); color:white; font-size:14px; font-weight:750; cursor:pointer; }.primary-button:disabled { opacity:.45; cursor:not-allowed; }.loading-dot { width:13px; height:13px; border:2px solid rgba(255,255,255,.45); border-top-color:#fff; border-radius:50%; animation:spin .8s linear infinite; }@keyframes spin{to{transform:rotate(360deg)}}
.output-tabs { display:flex; gap:4px; padding:4px; border-radius:11px; background:#f1eff1; }.output-tabs button { border:0; border-radius:8px; padding:7px 11px; background:transparent; color:#77717a; font-size:13px; font-weight:700; cursor:pointer; }.output-tabs button.active { background:#fff; color:#bd4e3b; box-shadow:0 2px 8px rgba(55,45,47,.08); }.output-tabs button:disabled { cursor:not-allowed; }.result-actions { display:flex; gap:8px; }.result-content { min-height:260px; margin-top:14px; padding:16px; overflow-wrap:anywhere; white-space:pre-wrap; border:1px solid #e3e1e4; border-radius:14px; background:#faf9fa; color:#34313a; font-size:16px; line-height:1.85; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; box-sizing:border-box; }.result-content.hiragana,.result-content.katakana { font-family:"Hiragino Sans","Yu Gothic",sans-serif; font-size:17px; }.empty-result { display:grid; place-items:center; align-content:center; min-height:260px; margin-top:14px; padding:18px; border:1px dashed #d8d3d6; border-radius:14px; text-align:center; background:#fbfafb; }.empty-glyph { margin-bottom:12px; color:#bd7564; font:800 24px ui-monospace,SFMono-Regular,Menlo,monospace; }.empty-result strong { color:#5e5861; font-size:15px; }.empty-result p { margin:5px 0 0; color:#918a93; font-size:13px; }.case-switcher { display:flex; align-items:center; flex-wrap:wrap; gap:6px; margin-top:12px; }.case-switcher>span { margin-right:3px; color:#817a84; font-size:13px; font-weight:700; }.case-switcher button { border:1px solid #dedbe0; border-radius:8px; padding:6px 9px; background:#fff; color:#77717a; font-size:13px; cursor:pointer; }.case-switcher button.active { border-color:#e39b87; color:#c3513d; background:#fff6f2; }
.error-banner { margin-top:12px; padding:12px 14px; border:1px solid #f2b7b4; border-radius:12px; background:#fff3f2; color:#b23b37; font-size:14px; font-weight:650; }.dictionary-card { display:flex; align-items:center; justify-content:space-between; gap:18px; margin-top:14px; padding:16px 18px; border:1px solid #e2e0e7; border-radius:16px; background:#fff; }.dictionary-card>div { display:flex; align-items:center; gap:12px; }.dictionary-icon { display:grid; place-items:center; width:42px; height:42px; border-radius:12px; color:#7350a6; background:#f3edff; font-size:17px; font-weight:800; }.dictionary-card strong { color:#423d49; font-size:14px; }.dictionary-card p { margin:3px 0 0; color:#817a86; font-size:13px; line-height:1.5; }.switch-label { display:flex; align-items:center; gap:10px; flex:none; }.switch-label>span { color:#756e79; font-size:13px; font-weight:650; }
.token-card,.examples-card { margin-top:14px; padding:20px; border:1px solid #e2e2e7; border-radius:18px; background:#fff; }.token-count { color:#847d87; font-size:13px; }.token-table-wrap { margin-top:15px; overflow-x:auto; border:1px solid #e4e2e6; border-radius:13px; }.token-table-wrap table { width:100%; min-width:720px; border-collapse:collapse; }.token-table-wrap th,.token-table-wrap td { padding:11px 13px; border-bottom:1px solid #ebe9ec; color:#635d67; font-size:13px; text-align:left; }.token-table-wrap th { background:#f8f6f8; color:#756e78; font-weight:750; }.token-table-wrap tr:last-child td { border-bottom:0; }.token-table-wrap td.japanese { color:#37333c; font-size:15px; }.token-table-wrap td.romaji { color:#ad4d3d; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; }.token-table-wrap td small { display:block; margin-top:3px; color:#9a939c; font-size:13px; }
.examples-card { display:flex; align-items:center; gap:20px; }.examples-card>div:first-child { flex:none; }.examples-card>div:first-child strong,.examples-card>div:first-child span { display:block; }.examples-card>div:first-child strong { color:#4b4650; font-size:14px; }.examples-card>div:first-child span { margin-top:3px; color:#8b848e; font-size:13px; }.example-list { display:grid; grid-template-columns:repeat(3,1fr); flex:1; gap:8px; }.example-list button { min-width:0; padding:11px 12px; border:1px solid #e2dfe3; border-radius:11px; background:#fbfafb; text-align:left; cursor:pointer; }.example-list button:hover { border-color:#e3a795; background:#fff8f5; }.example-list strong,.example-list span { display:block; }.example-list strong { color:#5a535e; font-size:13px; }.example-list span { margin-top:4px; overflow:hidden; color:#89828b; font-size:13px; white-space:nowrap; text-overflow:ellipsis; }
:global(.dark) .romaji-tool { --ink:#f2edf3; --muted:#aaa0ab; }:global(.dark) .workspace-card { border-color:#4a3d42; background:rgba(39,30,33,.8); }:global(.dark) .hero-metrics { border-color:#4a3d42; background:rgba(39,30,33,.8); }:global(.dark) .hero-metrics div { border-color:#493c40; }:global(.dark) .hero-metrics strong { color:#eadde1; }:global(.dark) .hero-metrics span { color:#a8b4c5; }:global(.dark) .mode-grid>button,:global(.dark) .workspace-card,:global(.dark) .dictionary-card,:global(.dark) .token-card,:global(.dark) .examples-card { border-color:#3d4655; background:#1e293b; }:global(.dark) .mode-grid>button.active { border-color:#ba6655; background:#2e272b; }:global(.dark) .mode-grid strong,:global(.dark) .dictionary-card strong,:global(.dark) .examples-card>div:first-child strong { color:#e9e2ea; }:global(.dark) .editor-pane { border-color:#3d4655; background:#202a3a; }:global(.dark) .editor-pane textarea,:global(.dark) .result-content { border-color:#435063; background:#172132; color:#e7e2e8; }:global(.dark) .output-tabs,:global(.dark) .empty-result { border-color:#435063; background:#172132; }:global(.dark) .output-tabs button.active { background:#2b3749; color:#ff9b83; }:global(.dark) .case-switcher button,:global(.dark) .example-list button { border-color:#435063; background:#202b3d; color:#bdb4bf; }:global(.dark) .token-table-wrap { border-color:#435063; }:global(.dark) .token-table-wrap th { background:#202b3d; }:global(.dark) .token-table-wrap th,:global(.dark) .token-table-wrap td { border-color:#3c485a; color:#bcb2be; }:global(.dark) .token-table-wrap td.japanese { color:#eee8ef; }
@media (max-width:900px) { .workspace-card { grid-template-columns:1fr; }.editor-pane { border-right:0; border-bottom:1px solid #e6e4e6; }.examples-card { align-items:stretch; flex-direction:column; }.example-list { width:100%; } }
@media (max-width:640px) { .hero-metrics { grid-template-columns:1fr; }.hero-metrics div { border-left:0; border-bottom:1px solid #e5edf6; }.hero-metrics div:last-child { border-bottom:0; }.mode-grid { grid-template-columns:1fr; }.mode-grid>button { grid-template-columns:auto 1fr; }.mode-status { display:none; }.editor-pane,.result-pane,.token-card,.examples-card { padding:16px; }.editor-pane textarea,.result-content,.empty-result { min-height:220px; }.result-toolbar { align-items:flex-start; flex-direction:column; }.example-list { grid-template-columns:1fr; }.dictionary-card { align-items:flex-start; flex-direction:column; }.switch-label { width:100%; justify-content:space-between; } }
</style>
