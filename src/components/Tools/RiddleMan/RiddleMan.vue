<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import MetricsBar from '@/components/Common/MetricsBar.vue'
import { copy } from '@/utils/string'
import { encoders } from './encoders/index'

interface HistoryItem {
  id: number
  sourceKey: string
  sourceLabel: string
  sourceText: string
  plainPreview: string
  time: string
}

const schemeInfo: Record<string, { tag: string; summary: string; detail: string }> = {
  plain: { tag: '明文', summary: '原始内容', detail: '不改变文本，适合作为全部趣味编码的起点。' },
  foYue: { tag: '可逆', summary: '与佛论禅 v1', detail: 'AES-256-CBC 与 UTF-16LE 字符映射，兼容 Tudou v1。' },
  ruShiWoWen: { tag: '可逆', summary: '与佛论禅 v2', detail: '压缩后进行 256 字符映射，兼容 ZIP / 7-zip 数据。' },
  beast: { tag: '可逆', summary: '兽音译者', detail: '使用四种兽语字符编码，可与常见兽音译者互转。' },
  base64: { tag: '可逆', summary: 'UTF-8 Base64', detail: '通用文本编码，适合接口、配置和临时传输。' },
  base32: { tag: '可逆', summary: 'RFC 4648', detail: '仅使用大写字母与数字，常用于密钥和标识符。' },
  md5: { tag: '不可逆', summary: '32 位摘要', detail: '单向哈希，只能从明文计算，不能还原原文。' },
}

const examples = [
  '工具应该让复杂的事情变简单。',
  '保持好奇，也保持清醒。',
  'Hello，欢迎来到在线工具箱！',
]

const reversibleEncoders = computed(() => encoders.filter(encoder => !encoder.readonly))
const sourceKey = ref('plain')
const sourceText = ref(examples[0])
const values = reactive<Record<string, string>>(Object.fromEntries(encoders.map(encoder => [encoder.key, ''])))
const errorMessage = ref('')
const converting = ref(false)
const history = ref<HistoryItem[]>([])
const lastPlainText = ref('')
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let conversionToken = 0

const sourceEncoder = computed(() => encoders.find(encoder => encoder.key === sourceKey.value) ?? encoders[0])
const filledResults = computed(() => encoders.filter(encoder => values[encoder.key]).length)
const sourceLength = computed(() => Array.from(sourceText.value).length)
const resultCards = computed(() => encoders.map(encoder => {
  const value = values[encoder.key]
  return {
    ...encoder,
    value,
    length: Array.from(value).length,
    ratio: lastPlainText.value ? Math.max(0.01, Array.from(value).length / Array.from(lastPlainText.value).length) : 0,
    info: schemeInfo[encoder.key],
  }
}))

function resetValues() {
  encoders.forEach(encoder => { values[encoder.key] = '' })
  lastPlainText.value = ''
}

async function convert(recordHistory = false) {
  if (debounceTimer) clearTimeout(debounceTimer)
  const input = sourceText.value
  if (!input.trim()) {
    resetValues()
    errorMessage.value = ''
    return
  }

  const token = ++conversionToken
  converting.value = true
  errorMessage.value = ''
  try {
    const plainText = await sourceEncoder.value.decode(input)
    const nextValues: Record<string, string> = {}
    for (const encoder of encoders) nextValues[encoder.key] = await encoder.encode(plainText)
    if (token !== conversionToken) return
    Object.assign(values, nextValues)
    lastPlainText.value = plainText
    if (recordHistory) {
      history.value.unshift({
        id: Date.now(),
        sourceKey: sourceKey.value,
        sourceLabel: sourceEncoder.value.label,
        sourceText: input,
        plainPreview: plainText.replace(/\s+/g, ' ').slice(0, 70),
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      })
      history.value = history.value.slice(0, 6)
      ElMessage.success('已完成全部方案转换')
    }
  } catch (error) {
    if (token !== conversionToken) return
    resetValues()
    errorMessage.value = error instanceof Error ? error.message : '解码失败，请检查来源类型和输入内容'
  } finally {
    if (token === conversionToken) converting.value = false
  }
}

function scheduleConvert() {
  errorMessage.value = ''
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => void convert(false), 320)
}

function changeSource(key: string) {
  sourceKey.value = key
  sourceText.value = values[key] || ''
  errorMessage.value = ''
  scheduleConvert()
}

function useExample(text: string) {
  sourceKey.value = 'plain'
  sourceText.value = text
  void convert(true)
}

function restoreHistory(item: HistoryItem) {
  sourceKey.value = item.sourceKey
  sourceText.value = item.sourceText
  void convert(false)
}

function clearAll() {
  conversionToken += 1
  sourceText.value = ''
  errorMessage.value = ''
  resetValues()
}

onMounted(() => { void convert(false) })
onBeforeUnmount(() => { if (debounceTimer) clearTimeout(debounceTimer) })
</script>

<template>
  <div class="riddle-page flex flex-col mt-3 flex-1">
    <ToolHero summary="一句话，同时看看七种“谜语”写法">
      <template #metrics>
        <MetricsBar :items="[{ label: '转换方案', value: encoders.length }, { label: '有效结果', value: filledResults }, { label: '输入字符', value: sourceLength }]" />
      </template>
    </ToolHero>

    <section class="workspace-card">
      <div class="section-heading">
        <div><span class="eyebrow">01 · SOURCE</span><h3>选择来源并输入内容</h3><p>来源类型必须与输入内容一致；MD5 不可逆，因此只出现在结果区。</p></div>
        <button type="button" class="ghost-button" @click="clearAll">清空内容</button>
      </div>

      <div class="source-tabs" aria-label="来源编码类型">
        <button v-for="encoder in reversibleEncoders" :key="encoder.key" type="button" :class="{ active: sourceKey === encoder.key }" @click="changeSource(encoder.key)">
          <strong>{{ encoder.label }}</strong><span>{{ schemeInfo[encoder.key].summary }}</span>
        </button>
      </div>

      <div class="source-editor" :class="{ error: errorMessage }">
        <header><div><strong>{{ sourceEncoder.label }}输入</strong><span>{{ schemeInfo[sourceEncoder.key].detail }}</span></div><span>{{ sourceLength }} 字符</span></header>
        <textarea v-model="sourceText" :aria-label="`${sourceEncoder.label}来源文本`" spellcheck="false" :placeholder="sourceEncoder.prefix ? `${sourceEncoder.prefix}……` : '输入或粘贴需要转换的内容'" @input="scheduleConvert"></textarea>
        <footer><span v-if="errorMessage" role="alert">{{ errorMessage }}</span><span v-else>停止输入约 0.3 秒后自动更新，也可以立即转换并记入历史。</span><button type="button" :disabled="converting || !sourceText.trim()" @click="convert(true)">{{ converting ? '转换中…' : '立即转换' }}</button></footer>
      </div>

      <div class="example-row"><span>载入示例</span><button v-for="(example, index) in examples" :key="example" type="button" @click="useExample(example)">示例 {{ index + 1 }} · {{ example.slice(0, 12) }}</button></div>
    </section>

    <section class="result-card">
      <div class="section-heading"><div><span class="eyebrow">02 · COMPARE</span><h3>全部方案结果对照</h3><p>长度倍率以解码后的明文为基准；点击复制不会修改当前来源。</p></div></div>
      <div class="result-grid">
        <article v-for="item in resultCards" :key="item.key" :class="{ source: item.key === sourceKey }">
          <header><div><strong>{{ item.label }}</strong><span>{{ item.info.summary }}</span></div><em :class="{ irreversible: item.readonly }">{{ item.info.tag }}</em></header>
          <textarea v-if="!item.singleLine" :value="item.value" :aria-label="`${item.label}转换结果`" readonly spellcheck="false" :placeholder="errorMessage ? '等待有效输入' : '转换结果将在这里显示'"></textarea>
          <input v-else :value="item.value" :aria-label="`${item.label}转换结果`" readonly placeholder="从明文计算 MD5">
          <footer><span>{{ item.length }} 字符<template v-if="item.ratio"> · {{ item.ratio.toFixed(2) }}×</template></span><button type="button" :disabled="!item.value" @click="copy(item.value)">复制结果</button></footer>
        </article>
      </div>
    </section>

    <section class="guide-card">
      <div class="guide-main">
        <div class="section-heading"><div><span class="eyebrow">03 · GUIDE</span><h3>方案说明</h3><p>“编码”不等于“加密”。趣味编码和 Base 系列不应用于保护敏感信息。</p></div></div>
        <div class="scheme-grid">
          <article v-for="encoder in encoders" :key="encoder.key"><span>{{ schemeInfo[encoder.key].tag }}</span><strong>{{ encoder.label }}</strong><p>{{ schemeInfo[encoder.key].detail }}</p></article>
        </div>
      </div>
      <aside class="history-panel">
        <header><div><span class="eyebrow">RECENT</span><strong>本次转换历史</strong></div><button v-if="history.length" type="button" @click="history = []">清空</button></header>
        <div v-if="history.length" class="history-list">
          <button v-for="item in history" :key="item.id" type="button" @click="restoreHistory(item)"><span>{{ item.sourceLabel }} · {{ item.time }}</span><strong>{{ item.plainPreview }}</strong></button>
        </div>
        <div v-else class="history-empty"><strong>暂无记录</strong><span>点击“立即转换”后会保留最近 6 次来源，刷新页面即清除。</span></div>
      </aside>
    </section>

    <ToolGuide title="兼容性与安全说明">
      <div class="detail-notes">
        <p><strong>佛曰 / 如是我闻：</strong>兼容对应 Tudou 版本；如遇来源被截断、缺少前缀或字符被替换，会提示解码失败。</p>
        <p><strong>兽语 / Base 系列：</strong>属于可逆表示方式，任何获得结果的人都能还原明文，请勿把它们当作密码学加密。</p>
        <p><strong>本地处理：</strong>所有编解码均在浏览器完成，输入内容不会上传；本次历史也只保存在当前页面内存中。</p>
      </div>
    </ToolGuide>
  </div>
</template>

<style scoped>
.riddle-page{--accent:#7c3aed;--accent-soft:#f5f3ff;gap:18px}.workspace-card,.result-card,.guide-card{border: 1px solid var(--c-border);border-radius:22px;background:#fff;box-shadow:0 14px 38px rgba(15,23,42,.055)}.eyebrow{display:block;color:var(--accent);font-size:12px;font-weight:900;letter-spacing:.12em}.workspace-card,.result-card{padding:22px}.section-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.section-heading h3{margin:4px 0 5px;color: var(--c-text-primary);font-size:19px}.section-heading p{margin:0;color: var(--c-text-secondary);font-size:13px;line-height:1.65}.ghost-button{min-height:36px;padding:0 14px;border:1px solid #d8b4fe;border-radius:10px;background:#fff;color:#7e22ce;font-size:12px;font-weight:800;cursor:pointer}.source-tabs{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:7px;margin-top:17px;padding:7px;border: 1px solid var(--c-border);border-radius:15px;background: var(--c-surface-subtle)}.source-tabs button{min-width:0;padding:10px 8px;border:1px solid transparent;border-radius:10px;background:transparent;color: var(--c-text-secondary);text-align:left;cursor:pointer}.source-tabs strong,.source-tabs span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.source-tabs strong{font-size:13px}.source-tabs span{margin-top:3px;font-size:12px}.source-tabs button.active{border-color:#c4b5fd;background:#fff;color:#6d28d9;box-shadow:0 4px 12px rgba(124,58,237,.12)}.source-editor{margin-top:11px;overflow:hidden;border:1px solid #dbe3ef;border-radius:15px;background:#fff}.source-editor.error{border-color:#fda4af}.source-editor header,.source-editor footer{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:11px 13px;background:#fafafa}.source-editor header{border-bottom: 1px solid var(--c-border)}.source-editor header strong,.source-editor header span{display:block}.source-editor header strong{color:#1e293b;font-size:14px}.source-editor header div span,.source-editor header>span{margin-top:3px;color: var(--c-text-secondary);font-size:12px}.source-editor textarea{display:block;width:100%;min-height:190px;padding:15px;border:0;outline:0;resize:vertical;background:#171026;color:#f5f3ff;font:13px/1.7 ui-monospace,SFMono-Regular,Menlo,monospace}.source-editor textarea:focus{box-shadow:inset 0 0 0 2px #8b5cf6}.source-editor footer{min-height:48px;border-top: 1px solid var(--c-border);color: var(--c-text-secondary);font-size:12px}.source-editor.error footer{color:#be123c;background:#fff1f2}.source-editor footer button{min-height:34px;padding:0 15px;border:0;border-radius:9px;background:var(--accent);color:#fff;font-size:12px;font-weight:850;cursor:pointer}.source-editor footer button:disabled{cursor:not-allowed;opacity:.5}.example-row{display:flex;align-items:center;gap:7px;margin-top:11px;overflow-x:auto}.example-row>span{flex:none;color: var(--c-text-secondary);font-size:12px;font-weight:800}.example-row button{flex:none;padding:7px 10px;border: 1px solid var(--c-border);border-radius:999px;background:#fafafa;color: var(--c-text-body);font-size:12px;cursor:pointer}.result-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px;margin-top:17px}.result-grid article{overflow:hidden;border: 1px solid var(--c-border);border-radius:15px;background: var(--c-surface-subtle)}.result-grid article:last-child{grid-column:1/-1}.result-grid article.source{border-color:#a78bfa;box-shadow:0 0 0 2px #ede9fe}.result-grid article>header,.result-grid article>footer{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px}.result-grid article>header strong,.result-grid article>header span{display:block}.result-grid article>header strong{color:#1e293b;font-size:14px}.result-grid article>header span{margin-top:2px;color: var(--c-text-secondary);font-size:12px}.result-grid em{padding:3px 7px;border-radius:999px;background:#ede9fe;color:#6d28d9;font-size:11px;font-style:normal;font-weight:850}.result-grid em.irreversible{background:#fff1f2;color:#be123c}.result-grid textarea,.result-grid input{display:block;width:100%;border:0;border-block:1px solid #e2e8f0;outline:0;background:#fff;color: var(--c-text-strong);font:12px/1.65 ui-monospace,SFMono-Regular,Menlo,monospace}.result-grid textarea{height:112px;padding:11px;resize:none}.result-grid input{height:46px;padding:0 11px}.result-grid article>footer{color: var(--c-text-secondary);font-size:12px}.result-grid footer button{border:0;background:transparent;color:#7c3aed;font-size:12px;font-weight:850;cursor:pointer}.result-grid footer button:disabled{color: var(--c-text-muted);cursor:not-allowed}.guide-card{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(280px,.5fr);overflow:hidden}.guide-main{padding:22px}.scheme-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:16px}.scheme-grid article{position:relative;padding:13px 13px 13px 76px;border: 1px solid var(--c-border);border-radius:13px;background: var(--c-surface-subtle)}.scheme-grid article>span{position:absolute;top:13px;left:12px;width:52px;padding:4px 5px;border-radius:7px;background:#ede9fe;color:#6d28d9;font-size:11px;font-weight:850;text-align:center}.scheme-grid strong{color:#1e293b;font-size:13px}.scheme-grid p{margin:4px 0 0;color: var(--c-text-secondary);font-size:12px;line-height:1.6}.history-panel{padding:20px;border-left: 1px solid var(--c-border);background:#fafafa}.history-panel>header{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.history-panel header strong{display:block;margin-top:4px;color:#1e293b;font-size:14px}.history-panel header button{border:0;background:transparent;color:#7c3aed;font-size:12px;font-weight:800;cursor:pointer}.history-list{display:grid;gap:7px;margin-top:14px}.history-list button{padding:10px;border: 1px solid var(--c-border);border-radius:10px;background:#fff;text-align:left;cursor:pointer}.history-list span,.history-list strong{display:block}.history-list span{color:#7c3aed;font-size:11px}.history-list strong{overflow:hidden;margin-top:4px;color: var(--c-text-body);font-size:12px;text-overflow:ellipsis;white-space:nowrap}.history-empty{display:flex;min-height:175px;align-items:center;justify-content:center;flex-direction:column;text-align:center}.history-empty strong{color: var(--c-text-strong);font-size:14px}.history-empty span{max-width:230px;margin-top:6px;color: var(--c-text-muted);font-size:12px;line-height:1.6}.detail-notes{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.detail-notes p{margin:0;padding:14px;border: 1px solid var(--c-border);border-radius:12px;background: var(--c-surface-subtle);color: var(--c-text-secondary);font-size:12px;line-height:1.7}.detail-notes strong{color: var(--c-text-strong)}
:global(html.dark .riddle-page){--accent:#a78bfa;--accent-soft:#2e1065}:global(html.dark .workspace-card),:global(html.dark .result-card),:global(html.dark .guide-card){border-color: var(--c-border);background:var(--c-surface);box-shadow:none}:global(html.dark .section-heading h3),:global(html.dark .source-editor header strong),:global(html.dark .result-grid article>header strong),:global(html.dark .scheme-grid strong),:global(html.dark .history-panel header strong),:global(html.dark .history-empty strong),:global(html.dark .detail-notes strong){color:#f1f5f9}:global(html.dark .source-tabs),:global(html.dark .result-grid article),:global(html.dark .scheme-grid article),:global(html.dark .history-panel),:global(html.dark .detail-notes p){border-color: var(--c-border);background:#172033}:global(html.dark .source-tabs button.active),:global(html.dark .history-list button),:global(html.dark .ghost-button),:global(html.dark .example-row button),:global(html.dark .source-editor header),:global(html.dark .source-editor footer){border-color: var(--c-border-strong);background:var(--c-surface-subtle);color:#c4b5fd}:global(html.dark .source-editor){border-color: var(--c-border-strong);background:var(--c-surface-subtle)}:global(html.dark .result-grid article.source){border-color:#8b5cf6;box-shadow:0 0 0 2px #4c1d95}:global(html.dark .result-grid textarea),:global(html.dark .result-grid input){border-color: var(--c-border);background:var(--c-surface-subtle);color: var(--c-text-primary)}:global(html.dark .history-panel){border-left-color: var(--c-border)}@media(max-width:1050px){.source-tabs{grid-template-columns:repeat(3,1fr)}.guide-card{grid-template-columns:1fr}.history-panel{border-top: 1px solid var(--c-border);border-left:0}.detail-notes{grid-template-columns:1fr}}@media(max-width:720px){.riddle-page{gap:12px}.workspace-card,.result-card,.guide-card{border-radius:16px}.workspace-card,.result-card,.guide-main,.history-panel{padding:15px}.section-heading{flex-direction:column}.source-editor header,.source-editor footer{align-items:flex-start;flex-direction:column}.source-editor footer button{width:100%}.result-grid,.scheme-grid{grid-template-columns:1fr}.detail-notes{grid-template-columns:1fr}}@media(max-width:430px){.source-tabs{grid-template-columns:repeat(2,1fr)}.source-tabs span{font-size:11px}}</style>
