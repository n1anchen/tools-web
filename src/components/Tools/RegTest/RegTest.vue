<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { CopyDocument, Delete, MagicStick } from '@element-plus/icons-vue'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { copy } from '@/utils/string'
import { analyzeRegex, buildHighlightSegments, replaceRegex } from '@/utils/developerTools'

const sampleText = `用户记录：
alice@example.com · 13812345678 · https://tools.nianchen.top/reg
bob+test@example.org · 2026-08-03 · 192.168.1.12
订单号：ORD-2026-0088，状态：PAID`

const sourceText = ref(sampleText)
const pattern = ref('(?<name>[\\w.+-]+)@(?<domain>[\\w.-]+\\.[A-Za-z]{2,})')
const flags = reactive({ g: true, i: true, m: false, s: false, u: true })
const flagOptions: Array<{ key: keyof typeof flags; label: string }> = [
  { key: 'g', label: '全局' },
  { key: 'i', label: '忽略大小写' },
  { key: 'm', label: '多行' },
  { key: 's', label: '点号跨行' },
  { key: 'u', label: 'Unicode' },
]
const replacementEnabled = ref(false)
const replacement = ref('$<name> at $<domain>')

const presets = [
  { name: '邮箱', pattern: '[\\w.+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}', tags: '常用' },
  { name: '网址 URL', pattern: 'https?://[^\\s，。]+', tags: '网络' },
  { name: '中国大陆手机号', pattern: '(?<!\\d)1[3-9]\\d{9}(?!\\d)', tags: '常用' },
  { name: 'IPv4', pattern: '(?<!\\d)(?:(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)(?!\\d)', tags: '网络' },
  { name: '日期 YYYY-MM-DD', pattern: '\\b\\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\d|3[01])\\b', tags: '日期' },
  { name: '中文字符', pattern: '[\\u{4E00}-\\u{9FFF}]+', tags: 'Unicode' },
  { name: '整数与小数', pattern: '[+-]?(?:\\d+\\.?\\d*|\\.\\d+)', tags: '数字' },
  { name: '命名捕获组', pattern: '(?<prefix>[A-Z]+)-(?<year>\\d{4})-(?<id>\\d+)', tags: '分组' },
]

const activeFlags = computed(() => Object.entries(flags).filter(([, enabled]) => enabled).map(([flag]) => flag).join(''))
const analysis = computed(() => analyzeRegex(sourceText.value, pattern.value, activeFlags.value))
const highlightSegments = computed(() => buildHighlightSegments(sourceText.value, analysis.value.matches))
const visibleMatches = computed(() => analysis.value.matches.slice(0, 200))
const captureCount = computed(() => analysis.value.matches.reduce((sum, match) => sum + match.groups.filter(value => value !== undefined).length, 0))
const replacementResult = computed(() => replaceRegex(sourceText.value, pattern.value, replacement.value, activeFlags.value))

function usePreset(value: string) {
  pattern.value = value
}

function clearAll() {
  sourceText.value = ''
  pattern.value = ''
}
</script>

<template>
  <div class="regex-page flex flex-col mt-3 flex-1">
    <DetailHeader title="正则表达式测试" />

    <section class="hero-card">
      <div><span class="eyebrow">REGEX LAB</span><h2>边写边看见每一次匹配</h2><p>实时高亮、捕获组拆解、替换预览和准确的错误定位。</p></div>
      <div class="hero-expression">/ pattern / <strong>{{ activeFlags || '—' }}</strong></div>
    </section>

    <section class="pattern-card">
      <div class="section-heading">
        <div><span class="eyebrow">EXPRESSION</span><h3>正则表达式</h3></div>
        <div class="header-actions"><el-button text @click="sourceText = sampleText">载入示例</el-button><el-button text :icon="Delete" @click="clearAll">清空</el-button></div>
      </div>
      <div class="pattern-input" :class="{ invalid: analysis.error }">
        <span>/</span>
        <el-input v-model="pattern" placeholder="输入正则表达式，不需要首尾斜杠" />
        <span>/{{ activeFlags }}</span>
      </div>
      <div v-if="analysis.error" class="error-message">{{ analysis.error }}</div>
      <div class="flag-row">
        <label v-for="option in flagOptions" :key="option.key">
          <el-switch v-model="flags[option.key]" size="small" /><code>{{ option.key }}</code><span>{{ option.label }}</span>
        </label>
      </div>
    </section>

    <section class="preset-card">
      <div class="preset-label"><el-icon><MagicStick /></el-icon><span>常用模板</span></div>
      <div class="preset-list">
        <button v-for="preset in presets" :key="preset.name" @click="usePreset(preset.pattern)"><strong>{{ preset.name }}</strong><span>{{ preset.tags }}</span></button>
      </div>
    </section>

    <div class="workspace-grid">
      <section class="editor-card">
        <div class="panel-heading"><div><span class="eyebrow">TEST TEXT</span><h3>测试文本</h3></div><span>{{ sourceText.length }} 字符 · {{ sourceText.split('\n').length }} 行</span></div>
        <el-input v-model="sourceText" type="textarea" :rows="15" resize="none" placeholder="输入要测试的文本" />
      </section>

      <section class="preview-card">
        <div class="panel-heading"><div><span class="eyebrow">HIGHLIGHT</span><h3>匹配高亮</h3></div><span v-if="analysis.matches.length">点击下方结果查看位置</span></div>
        <div class="highlight-box">
          <template v-for="(segment, index) in highlightSegments" :key="index">
            <mark v-if="segment.matched" :title="`匹配 #${segment.matchIndex}`">{{ segment.value }}</mark><span v-else>{{ segment.value }}</span>
          </template>
          <span v-if="!sourceText" class="placeholder">高亮结果会显示在这里</span>
        </div>
      </section>
    </div>

    <section class="stats-grid">
      <div><span>匹配数量</span><strong>{{ analysis.matches.length }}</strong></div>
      <div><span>捕获内容</span><strong>{{ captureCount }}</strong></div>
      <div><span>文本覆盖</span><strong>{{ analysis.coverage.toFixed(1) }}%</strong></div>
      <div><span>执行耗时</span><strong>{{ analysis.durationMs }} ms</strong></div>
    </section>

    <section class="matches-card">
      <div class="section-heading">
        <div><span class="eyebrow">MATCH DETAILS</span><h3>匹配详情</h3></div>
        <span v-if="analysis.matches.length > 200">仅展示前 200 项</span>
      </div>
      <div v-if="visibleMatches.length" class="match-list">
        <article v-for="(match, index) in visibleMatches" :key="`${match.index}-${index}`">
          <div class="match-index">#{{ index + 1 }}</div>
          <div class="match-value"><code>{{ match.value || '零长度匹配' }}</code><span>索引 {{ match.index }} · 第 {{ match.line }} 行 {{ match.column }} 列</span></div>
          <div v-if="match.groups.length || Object.keys(match.namedGroups).length" class="group-list">
            <span v-for="(group, groupIndex) in match.groups" :key="groupIndex"><b>${{ groupIndex + 1 }}</b>{{ group ?? '未参与' }}</span>
            <span v-for="(group, name) in match.namedGroups" :key="name"><b>{{ name }}</b>{{ group }}</span>
          </div>
          <el-button link type="primary" :icon="CopyDocument" @click="copy(match.value)">复制</el-button>
        </article>
      </div>
      <div v-else class="empty-state">{{ pattern && !analysis.error ? '当前表达式没有匹配内容' : '输入有效表达式后，这里会列出每一次匹配' }}</div>
    </section>

    <section class="replacement-card">
      <div class="section-heading">
        <div><span class="eyebrow">REPLACEMENT</span><h3>替换预览</h3></div>
        <el-switch v-model="replacementEnabled" active-text="启用" />
      </div>
      <div v-if="replacementEnabled" class="replacement-grid">
        <div><label>替换模板</label><el-input v-model="replacement" placeholder="支持 $1、$&、$<name>" /></div>
        <div><label>替换结果</label><pre>{{ replacementResult.value }}</pre></div>
      </div>
      <p v-else>开启后可使用 JavaScript 替换语法，结果仅预览，不会修改原文。</p>
    </section>

    <ToolDetail title="正则提示">
      <el-text>本工具使用浏览器的 JavaScript 正则引擎。g 表示全局匹配，i 忽略大小写，m 改变 ^ 与 $ 的行行为，s 允许点号匹配换行，u 启用 Unicode 语义。复杂回溯表达式可能占用较长时间，请避免对不可信表达式输入超长文本。</el-text>
    </ToolDetail>
  </div>
</template>

<style scoped>
.regex-page { --accent: #2563eb; gap: 16px; }
.hero-card, .pattern-card, .preset-card, .editor-card, .preview-card, .matches-card, .replacement-card { border: 1px solid #e2e8f0; border-radius: 22px; background: #fff; box-shadow: 0 12px 35px rgb(15 23 42 / 6%); }
.hero-card { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 25px 28px; background: radial-gradient(circle at 90% 20%, #dbeafe, transparent 30%), linear-gradient(135deg, #eff6ff, #fff); }
.eyebrow { color: var(--accent); font-size: 10px; font-weight: 800; letter-spacing: .15em; }
.hero-card h2 { margin: 6px 0 4px; color: #0f172a; font-size: clamp(21px, 3vw, 28px); }
.hero-card p, .replacement-card > p { margin: 0; color: #64748b; font-size: 13px; }
.hero-expression { padding: 13px 17px; border: 1px solid #bfdbfe; border-radius: 14px; color: #1e40af; background: rgb(255 255 255 / 80%); font: 700 14px ui-monospace, monospace; }
.hero-expression strong { color: #dc2626; }
.pattern-card, .matches-card, .replacement-card { padding: 22px; }
.section-heading, .panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.section-heading h3, .panel-heading h3 { margin: 4px 0 0; color: #0f172a; font-size: 18px; }
.section-heading > span, .panel-heading > span { color: #94a3b8; font-size: 11px; }
.pattern-input { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 9px; margin-top: 17px; padding: 7px 13px; border: 1px solid #cbd5e1; border-radius: 14px; color: #2563eb; background: #f8fafc; font: 700 16px ui-monospace, monospace; }
.pattern-input.invalid { border-color: #f87171; box-shadow: 0 0 0 3px #fee2e2; }
.pattern-input :deep(.el-input__wrapper) { padding: 0; box-shadow: none; background: transparent; }
.pattern-input :deep(.el-input__inner) { font: 14px ui-monospace, monospace; }
.error-message { margin-top: 8px; color: #dc2626; font: 12px ui-monospace, monospace; }
.flag-row { display: flex; flex-wrap: wrap; gap: 9px 18px; margin-top: 15px; }
.flag-row label { display: flex; align-items: center; gap: 6px; color: #64748b; font-size: 11px; }
.flag-row code { color: #1d4ed8; font-weight: 800; }
.preset-card { display: flex; align-items: flex-start; gap: 18px; padding: 17px 20px; }
.preset-label { display: flex; align-items: center; gap: 6px; flex: none; padding-top: 6px; color: #475569; font-size: 12px; font-weight: 700; }
.preset-list { display: flex; flex-wrap: wrap; gap: 7px; }
.preset-list button { display: flex; align-items: center; gap: 6px; padding: 6px 10px; border: 0; border-radius: 999px; color: #1e40af; background: #eff6ff; cursor: pointer; }
.preset-list strong { font-size: 11px; }.preset-list span { color: #60a5fa; font-size: 9px; }
.workspace-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.editor-card, .preview-card { min-width: 0; padding: 20px; }
.editor-card :deep(.el-textarea__inner) { margin-top: 14px; padding: 15px; border: 0; box-shadow: none; color: #334155; background: #f8fafc; font: 13px/1.75 ui-monospace, monospace; }
.highlight-box { min-height: 345px; margin-top: 14px; padding: 15px; border-radius: 13px; color: #334155; overflow-wrap: anywhere; white-space: pre-wrap; background: #f8fafc; font: 13px/1.75 ui-monospace, monospace; }
.highlight-box mark { padding: 1px 2px; border-radius: 4px; color: #1e3a8a; background: #bfdbfe; box-shadow: inset 0 -2px #60a5fa; }
.placeholder { color: #94a3b8; }
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.stats-grid > div { display: flex; align-items: baseline; justify-content: space-between; padding: 14px 16px; border: 1px solid #e2e8f0; border-radius: 15px; background: #fff; }
.stats-grid span { color: #64748b; font-size: 11px; }.stats-grid strong { color: #0f172a; font-size: 18px; }
.match-list { display: grid; gap: 8px; margin-top: 16px; }
.match-list article { display: grid; grid-template-columns: 42px minmax(150px, .8fr) minmax(0, 1.4fr) auto; align-items: center; gap: 12px; padding: 11px 13px; border: 1px solid #e2e8f0; border-radius: 13px; background: #f8fafc; }
.match-index { color: #2563eb; font: 800 11px ui-monospace, monospace; }
.match-value { display: flex; min-width: 0; flex-direction: column; }.match-value code { color: #1e293b; overflow-wrap: anywhere; }.match-value span { color: #94a3b8; font-size: 9px; }
.group-list { display: flex; min-width: 0; flex-wrap: wrap; gap: 5px; }.group-list span { display: flex; gap: 5px; padding: 4px 7px; border-radius: 7px; color: #475569; background: #e2e8f0; font-size: 10px; overflow-wrap: anywhere; }.group-list b { color: #2563eb; }
.empty-state { margin-top: 16px; padding: 32px; border-radius: 14px; color: #94a3b8; background: #f8fafc; text-align: center; }
.replacement-grid { display: grid; grid-template-columns: minmax(220px, .55fr) minmax(0, 1.45fr); gap: 13px; margin-top: 16px; }.replacement-grid > div { min-width: 0; }.replacement-grid label { display: block; margin-bottom: 7px; color: #64748b; font-size: 11px; }.replacement-grid pre { min-height: 70px; margin: 0; padding: 12px; border-radius: 12px; color: #334155; overflow-wrap: anywhere; white-space: pre-wrap; background: #f8fafc; font: 12px/1.6 ui-monospace, monospace; }
.replacement-card > p { margin-top: 13px; }

:global(html.dark .regex-page .hero-card), :global(html.dark .regex-page .pattern-card), :global(html.dark .regex-page .preset-card), :global(html.dark .regex-page .editor-card), :global(html.dark .regex-page .preview-card), :global(html.dark .regex-page .matches-card), :global(html.dark .regex-page .replacement-card), :global(html.dark .regex-page .stats-grid > div) { border-color: #334155; background: #1e293b; box-shadow: none; }
:global(html.dark .regex-page .hero-card) { background: radial-gradient(circle at 90% 20%, #1e3a8a, transparent 30%), #1e293b; }
:global(html.dark .regex-page h2), :global(html.dark .regex-page h3), :global(html.dark .regex-page .stats-grid strong) { color: #f8fafc; }
:global(html.dark .regex-page .hero-expression) { border-color: #1d4ed8; color: #93c5fd; background: #0f172a; }
:global(html.dark .regex-page .pattern-input), :global(html.dark .regex-page .editor-card .el-textarea__inner), :global(html.dark .regex-page .highlight-box), :global(html.dark .regex-page .match-list article), :global(html.dark .regex-page .empty-state), :global(html.dark .regex-page .replacement-grid pre) { border-color: #334155; color: #cbd5e1; background: #0f172a; }
:global(html.dark .regex-page .pattern-input.invalid) { border-color: #ef4444; box-shadow: 0 0 0 3px rgb(127 29 29 / 45%); }
:global(html.dark .regex-page .pattern-input .el-input__inner), :global(html.dark .regex-page .match-value code) { color: #e2e8f0; }
:global(html.dark .regex-page .preset-list button) { color: #bfdbfe; background: #172554; }
:global(html.dark .regex-page .group-list span) { color: #cbd5e1; background: #334155; }
:global(html.dark .regex-page .highlight-box mark) { color: #dbeafe; background: #1e40af; box-shadow: inset 0 -2px #60a5fa; }

@media (max-width: 820px) { .workspace-grid { grid-template-columns: 1fr; }.stats-grid { grid-template-columns: repeat(2, 1fr); }.match-list article { grid-template-columns: 36px minmax(0, 1fr) auto; }.group-list { grid-column: 2 / -1; } }
@media (max-width: 640px) { .hero-card { align-items: flex-start; flex-direction: column; padding: 21px; }.hero-expression { align-self: stretch; text-align: center; }.pattern-card, .matches-card, .replacement-card, .editor-card, .preview-card { padding: 17px; border-radius: 19px; }.preset-card { flex-direction: column; gap: 8px; }.header-actions { display: flex; }.flag-row { display: grid; grid-template-columns: repeat(2, 1fr); }.stats-grid { grid-template-columns: 1fr 1fr; }.replacement-grid { grid-template-columns: 1fr; }.match-list article { grid-template-columns: 34px minmax(0, 1fr); }.match-list article > .el-button { grid-column: 2; justify-self: flex-start; }.group-list { grid-column: 2; } }
</style>
