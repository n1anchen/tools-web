<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { Delete, VideoPause, VideoPlay } from '@element-plus/icons-vue'
import CopyButton from '@/components/Common/CopyButton.vue'
import SplitWorkspace from '@/components/Common/SplitWorkspace.vue'
import SwapButton from '@/components/Common/SwapButton.vue'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import { copy } from '@/utils/string'
import { morseCodeMap, toMorse, toText } from '@/utils/morse'

type Mode = 'encode' | 'decode'
type SymbolStyle = 'classic' | 'visual'

const mode = ref<Mode>('encode')
const input = ref('SOS 求救信号 2026')
const symbolStyle = ref<SymbolStyle>('classic')
const wordsPerMinute = ref(18)
const isPlaying = ref(false)
let audioContext: AudioContext | null = null
let playbackTimer: ReturnType<typeof setTimeout> | null = null

const rawResult = computed(() => mode.value === 'encode' ? toMorse(input.value) : toText(input.value))
const result = computed(() => {
  if (mode.value !== 'encode' || symbolStyle.value === 'classic') return rawResult.value
  return rawResult.value.replace(/\./g, '·').replace(/-/g, '—')
})
const playableCode = computed(() => mode.value === 'encode' ? toMorse(input.value) : input.value)
const codeTokens = computed(() => playableCode.value.trim().split(/\s+/).filter(Boolean))
const stats = computed(() => ({
  characters: mode.value === 'encode' ? Array.from(input.value).filter(character => !/\s/.test(character)).length : codeTokens.value.filter(token => token !== '/' && token !== '|').length,
  dots: (playableCode.value.match(/[.·•]/g) || []).length,
  dashes: (playableCode.value.match(/[-—–_]/g) || []).length,
  seconds: estimatePlaybackSeconds(playableCode.value, wordsPerMinute.value),
}))

const references = Object.entries(morseCodeMap)
  .filter(([character]) => /^[A-Z0-9]$/.test(character))

function estimatePlaybackSeconds(code: string, wpm: number) {
  const unit = 1.2 / wpm
  let units = 0
  const tokens = code.trim().split(/\s+/).filter(Boolean)
  tokens.forEach((token, index) => {
    if (token === '/' || token === '|') {
      units += 4
      return
    }
    const symbols = Array.from(token)
    units += symbols.reduce((sum, symbol) => sum + (/[—–_-]/.test(symbol) ? 3 : 1), 0)
    units += Math.max(0, symbols.length - 1)
    if (index < tokens.length - 1) units += 3
  })
  return Number((units * unit).toFixed(1))
}

function switchMode() {
  input.value = result.value
  mode.value = mode.value === 'encode' ? 'decode' : 'encode'
}

function loadExample() {
  input.value = mode.value === 'encode'
    ? 'HELLO WORLD\n中文摩斯 2026'
    : '... --- ... / .---- ..--- ...--'
}

function clear() {
  stopPlayback()
  input.value = ''
}

function stopPlayback() {
  if (playbackTimer) clearTimeout(playbackTimer)
  playbackTimer = null
  if (audioContext) void audioContext.close()
  audioContext = null
  isPlaying.value = false
}

function play() {
  stopPlayback()
  const normalized = playableCode.value
    .replace(/[·•]/g, '.')
    .replace(/[—–_]/g, '-')
  const tokens = normalized.trim().split(/\s+/).filter(Boolean)
  if (!tokens.length) return

  const context = new AudioContext()
  audioContext = context
  const unit = 1.2 / wordsPerMinute.value
  let cursor = context.currentTime + 0.08

  tokens.forEach(token => {
    if (token === '/' || token === '|') {
      cursor += 4 * unit
      return
    }
    Array.from(token).forEach((symbol, index) => {
      if (symbol !== '.' && symbol !== '-') return
      const duration = symbol === '-' ? 3 * unit : unit
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.frequency.value = 650
      gain.gain.setValueAtTime(0.0001, cursor)
      gain.gain.exponentialRampToValueAtTime(0.18, cursor + 0.005)
      gain.gain.setValueAtTime(0.18, Math.max(cursor + 0.005, cursor + duration - 0.008))
      gain.gain.exponentialRampToValueAtTime(0.0001, cursor + duration)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start(cursor)
      oscillator.stop(cursor + duration)
      cursor += duration
      if (index < token.length - 1) cursor += unit
    })
    cursor += 3 * unit
  })

  isPlaying.value = true
  playbackTimer = setTimeout(stopPlayback, Math.max(0, (cursor - context.currentTime) * 1000 + 100))
}

onUnmounted(stopPlayback)
</script>

<template>
  <div class="morse-page flex flex-col mt-3 flex-1">
    <ToolHero summary="把文字变成节奏，也把节奏还原成文字" />

    <section class="workspace-card">
      <div class="toolbar">
        <div class="mode-switch" aria-label="转换模式">
          <button :class="{ active: mode === 'encode' }" @click="mode = 'encode'">文字 → 电码</button>
          <button :class="{ active: mode === 'decode' }" @click="mode = 'decode'">电码 → 文字</button>
        </div>
        <div class="toolbar-actions">
          <el-button @click="loadExample">载入示例</el-button>
          <el-button :icon="Delete" @click="clear">清空</el-button>
        </div>
      </div>

      <SplitWorkspace :actions-width="42" :gap="0" :margin-top="20" :collapse="640">
        <template #input>
          <div class="editor-panel">
            <div class="panel-heading">
              <div>
                <span class="panel-kicker">INPUT</span>
                <strong>{{ mode === 'encode' ? '原始文字' : '摩斯电码' }}</strong>
              </div>
              <span>{{ input.length }} 字符</span>
            </div>
            <el-input
              v-model="input"
              type="textarea"
              :rows="10"
              resize="none"
              :placeholder="mode === 'encode' ? '输入文字，例如 SOS 或 中文' : '输入 .- 与 -，字符间用空格、单词间用 /'"
            />
          </div>
        </template>

        <template #actions>
          <SwapButton label="把结果带到另一侧继续转换" @click="switchMode" />
        </template>

        <template #output>
          <div class="editor-panel output-panel">
            <div class="panel-heading">
              <div>
                <span class="panel-kicker">OUTPUT</span>
                <strong>{{ mode === 'encode' ? '摩斯电码' : '解码文字' }}</strong>
              </div>
              <CopyButton link type="primary" :text="result" />
            </div>
            <div class="result-box" :class="{ 'morse-output': mode === 'encode' }">
              {{ result || '转换结果会显示在这里' }}
            </div>
          </div>
        </template>
      </SplitWorkspace>

      <div class="control-strip">
        <div v-if="mode === 'encode'" class="control-group">
          <span>符号样式</span>
          <el-radio-group v-model="symbolStyle" size="small">
            <el-radio-button value="classic">.-</el-radio-button>
            <el-radio-button value="visual">·—</el-radio-button>
          </el-radio-group>
        </div>
        <div class="control-group speed-control">
          <span>播放速度</span>
          <el-slider v-model="wordsPerMinute" :min="10" :max="30" :show-tooltip="false" />
          <strong>{{ wordsPerMinute }} WPM</strong>
        </div>
        <el-button v-if="!isPlaying" type="primary" round :icon="VideoPlay" @click="play">试听电码</el-button>
        <el-button v-else type="danger" round :icon="VideoPause" @click="stopPlayback">停止播放</el-button>
      </div>

      <div class="stats-grid">
        <div><span>有效字符</span><strong>{{ stats.characters }}</strong></div>
        <div><span>短信号 ·</span><strong>{{ stats.dots }}</strong></div>
        <div><span>长信号 —</span><strong>{{ stats.dashes }}</strong></div>
        <div><span>预计播放</span><strong>{{ stats.seconds }} 秒</strong></div>
      </div>
    </section>

    <section class="reference-card">
      <div class="section-heading">
        <div><span class="eyebrow">QUICK REFERENCE</span><h3>国际摩斯速查</h3></div>
        <p>字符之间用空格，单词之间用斜杠 /</p>
      </div>
      <div class="reference-grid">
        <button v-for="([character, code]) in references" :key="character" @click="copy(code)">
          <strong>{{ character }}</strong><span>{{ code }}</span>
        </button>
      </div>
    </section>

    <ToolGuide title="使用说明">
      <el-text>
        国际摩斯电码使用短信号与长信号组合表示字符。本工具优先按国际标准解析英文、数字和标点；中文使用扩展编码，因此与不同中文摩斯实现之间可能不兼容。试听功能只在当前浏览器内生成声音，不会上传文本。
      </el-text>
    </ToolGuide>
  </div>
</template>

<style scoped>
.morse-page {
  --accent: var(--c-primary-700);
  --accent-soft: var(--c-primary-100);
  gap: 16px;
}
.workspace-card, .reference-card {
  border: 1px solid var(--c-border);
  border-radius: 24px;
  background: var(--c-surface);
  box-shadow: var(--shadow-card);
}
.eyebrow, .panel-kicker {
  color: var(--accent);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .14em;
}
.section-heading p {
  margin: 0;
  color: var(--c-text-secondary);
}
.workspace-card {
  padding: 22px;
}
.toolbar, .panel-heading, .control-strip, .section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}
.mode-switch {
  display: inline-flex;
  padding: 4px;
  border-radius: var(--radius-md);
  background: #f1f5f9;
}
.mode-switch button {
  padding: 8px 15px;
  border: 0;
  border-radius: var(--radius-sm);
  color: var(--c-text-secondary);
  background: transparent;
  cursor: pointer;
  font-weight: 700;
  transition: .2s ease;
}
.mode-switch button.active {
  color: var(--c-on-accent);
  background: var(--accent);
  box-shadow: 0 5px 14px rgb(15 118 110 / 25%);
}
.editor-panel {
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  background: var(--c-surface-subtle);
}
.panel-heading {
  margin-bottom: 12px;
}
.panel-heading > div {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.panel-heading strong {
  color: #1e293b;
}
.panel-heading > span {
  color: var(--c-text-muted);
  font-size: 12px;
}
.editor-panel :deep(.el-textarea__inner) {
  padding: 0;
  border: 0;
  box-shadow: none;
  color: #1e293b;
  background: transparent;
  font: 14px/1.75 ui-monospace, SFMono-Regular, Menlo, monospace;
}
.result-box {
  min-height: 220px;
  color: var(--c-text-secondary);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font: 14px/1.75 ui-monospace, SFMono-Regular, Menlo, monospace;
}
.result-box.morse-output {
  color: var(--c-primary-700);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: .055em;
}
.output-panel {
  background: linear-gradient(145deg, var(--c-primary-50), #f8fafc);
}

.control-strip {
  flex-wrap: wrap;
  margin-top: 18px;
  padding: 14px 16px;
  border-radius: var(--radius-lg);
  background: var(--c-surface-subtle);
}
.control-group {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--c-text-secondary);
  font-size: 13px;
}
.speed-control {
  flex: 1;
  min-width: 260px;
  max-width: 430px;
}
.speed-control :deep(.el-slider) {
  flex: 1;
}
.speed-control strong {
  min-width: 58px;
  color: var(--c-text-strong);
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-top: 14px;
}
.stats-grid > div {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 13px 15px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
}
.stats-grid span {
  color: var(--c-text-secondary);
  font-size: 12px;
}
.stats-grid strong {
  color: var(--c-text-primary);
  font-size: 17px;
}
.reference-card {
  padding: 24px;
}
.section-heading h3 {
  margin: 5px 0 0;
  color: var(--c-text-primary);
  font-size: 19px;
}
.reference-grid {
  display: grid;
  grid-template-columns: repeat(9, minmax(0, 1fr));
  gap: 7px;
  margin-top: 18px;
}
.reference-grid button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 0;
  padding: 9px 3px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  color: var(--c-text-strong);
  background: var(--c-surface-subtle);
  cursor: pointer;
}
.reference-grid button:hover {
  border-color: var(--c-primary-300);
  background: var(--c-primary-50);
}
.reference-grid span {
  color: var(--c-primary-700);
  font: 10px ui-monospace, monospace;
}
:global(html.dark .morse-page) {
  --accent: var(--c-primary-300);
  --accent-soft: #134e4a;
}
:global(html.dark .morse-page .workspace-card), :global(html.dark .morse-page .reference-card) {
  border-color: var(--c-border);
  background: var(--c-surface);
  box-shadow: none;
}
:global(html.dark .morse-page h3), :global(html.dark .morse-page .panel-heading strong), :global(html.dark .morse-page .stats-grid strong) {
  color: #f8fafc;
}
:global(html.dark .morse-page p), :global(html.dark .morse-page .panel-heading > span), :global(html.dark .morse-page .control-group), :global(html.dark .morse-page .result-box) {
  color: var(--c-text-muted);
}
:global(html.dark .morse-page .mode-switch), :global(html.dark .morse-page .editor-panel), :global(html.dark .morse-page .control-strip), :global(html.dark .morse-page .reference-grid button) {
  border-color: var(--c-border);
  background: var(--c-surface-subtle);
}
:global(html.dark .morse-page .output-panel) {
  background: linear-gradient(145deg, #123b3a, #0f172a);
}
:global(html.dark .morse-page .editor-panel .el-textarea__inner) {
  color: var(--c-text-primary);
}
:global(html.dark .morse-page .result-box.morse-output), :global(html.dark .morse-page .speed-control strong) {
  color: var(--c-primary-300);
}
:global(html.dark .morse-page .stats-grid > div) {
  border-color: var(--c-border);
}
:global(html.dark .morse-page .reference-grid button) {
  color: var(--c-text-primary);
}
@media (max-width: 900px) {
  .reference-grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 640px) {
  .workspace-card, .reference-card {
    padding: 16px;
    border-radius: var(--radius-card);
  }
  .toolbar {
    align-items: stretch;
    flex-direction: column;
  }
  .toolbar-actions {
    display: flex;
    justify-content: flex-end;
  }
  .mode-switch {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  :deep(.split-actions .swap-button) {
    transform: rotate(90deg);
  }
  .result-box {
    min-height: 180px;
  }
  .speed-control {
    min-width: 100%;
  }
  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }
  .section-heading {
    align-items: flex-start;
    flex-direction: column;
  }
  .reference-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
