<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import { copy } from '@/utils/string'
import { removeTrackingParams } from '@/utils/url'

const apiBase = (import.meta.env.VITE_UNSHORTEN_API as string | undefined)?.trim()
const inputUrl = ref('')
const touched = ref(false)
const pastedInvalid = ref(false)
const enableFollow = ref(true)
const maxHops = ref(5)
const cleanupMode = ref<'tracking' | 'none' | 'all'>('tracking')
const loading = ref(false)
const resultVisible = ref(false)
const resultKind = ref<'local' | 'resolved'>('local')
const finalRawUrl = ref('')
const chain = ref<string[]>([])

const knownShorteners = ['t.cn', 'bit.ly', 'dwz.cn', 'suo.im', 'tinyurl.com', 'url.cn', 'b23.tv', 'v.douyin.com', 'goo.gl', 'is.gd', 'reurl.cc']
const examples = [
  { label: '带营销参数', value: 'https://example.com/products?id=42&utm_source=newsletter&fbclid=demo#detail' },
  { label: '短链接示例', value: 'https://t.cn/A6example' },
]

const isConfigured = computed(() => {
  if (!apiBase) return false
  try {
    return ['http:', 'https:'].includes(new URL(apiBase).protocol)
  } catch {
    return false
  }
})

const parsedInput = computed(() => parsePublicUrl(inputUrl.value))
const isValidUrl = computed(() => parsedInput.value !== null)
const showError = computed(() => Boolean(inputUrl.value.trim()) && !isValidUrl.value && (touched.value || pastedInvalid.value))
const urlErrorText = computed(() => explainUrlError(inputUrl.value))
const inputDiagnostics = computed(() => {
  const parsed = parsedInput.value
  if (!parsed) return null
  const keys = [...parsed.searchParams.keys()]
  const clean = removeTrackingParams(parsed.href)
  const cleanKeys = new Set([...new URL(clean).searchParams.keys()].map(key => key.toLowerCase()))
  const trackingKeys = [...new Set(keys.filter(key => !cleanKeys.has(key.toLowerCase())))]
  const host = parsed.hostname.toLowerCase()
  return {
    protocol: parsed.protocol.replace(':', '').toUpperCase(),
    host: parsed.hostname,
    path: `${parsed.pathname}${parsed.hash}`,
    queryCount: keys.length,
    trackingKeys,
    looksShort: knownShorteners.some(domain => host === domain || host.endsWith(`.${domain}`)),
  }
})

const finalUrl = computed(() => cleanUrl(finalRawUrl.value, cleanupMode.value))
const removedParams = computed(() => {
  if (!finalRawUrl.value || cleanupMode.value === 'none') return [] as string[]
  try {
    const before = new URL(finalRawUrl.value)
    const afterKeys = new Set([...new URL(finalUrl.value).searchParams.keys()].map(key => key.toLowerCase()))
    return [...new Set([...before.searchParams.keys()].filter(key => !afterKeys.has(key.toLowerCase())))]
  } catch {
    return [] as string[]
  }
})
const targetHost = computed(() => {
  try { return new URL(finalUrl.value).hostname } catch { return '—' }
})
const hopCount = computed(() => Math.max(0, chain.value.length - 1))

watch(inputUrl, () => {
  pastedInvalid.value = false
  resultVisible.value = false
  finalRawUrl.value = ''
  chain.value = []
})

function parsePublicUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  try {
    const parsed = new URL(trimmed)
    if (!['http:', 'https:'].includes(parsed.protocol)) return null
    if (parsed.username || parsed.password || parsed.port) return null
    const host = parsed.hostname
    if (!host.includes('.') || host.startsWith('[') || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) || /^[0-9a-f:]+$/i.test(host)) return null
    return parsed
  } catch {
    return null
  }
}

function explainUrlError(value: string) {
  if (!value.trim()) return ''
  try {
    const parsed = new URL(value.trim())
    if (!['http:', 'https:'].includes(parsed.protocol)) return '仅支持以 http:// 或 https:// 开头的链接'
    if (parsed.username || parsed.password) return '出于安全考虑，不支持包含账号密码的链接'
    if (parsed.port) return '跳转追踪不支持自定义端口'
    return '请输入公开域名链接，不支持 IP 地址或本地主机名'
  } catch {
    return '链接格式不完整，请保留 http:// 或 https://'
  }
}

function cleanUrl(value: string, mode: typeof cleanupMode.value) {
  if (!value) return ''
  if (mode === 'none') return value
  if (mode === 'tracking') return removeTrackingParams(value)
  try {
    const parsed = new URL(value)
    parsed.search = ''
    return parsed.href
  } catch {
    return value
  }
}

function runLocalAnalysis() {
  const parsed = parsedInput.value
  if (!parsed) {
    touched.value = true
    return
  }
  finalRawUrl.value = parsed.href
  chain.value = [parsed.href]
  resultKind.value = 'local'
  resultVisible.value = true
}

async function resolveRedirect() {
  if (!isValidUrl.value || !isConfigured.value || loading.value) return
  loading.value = true
  resultVisible.value = false
  try {
    const params = new URLSearchParams({
      url: parsedInput.value!.href,
      follow: String(enableFollow.value),
      maxHops: String(maxHops.value),
    })
    const endpoint = new URL(apiBase!)
    params.forEach((value, key) => endpoint.searchParams.set(key, value))
    const response = await fetch(endpoint)
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || `请求失败 (${response.status})`)

    const normalizedFinal = normalizeResultUrl(data.finalUrl)
    const normalizedChain = Array.isArray(data.chain) ? data.chain.map(normalizeResultUrl) : []
    if (!normalizedChain.length) normalizedChain.push(parsedInput.value!.href)
    if (normalizedChain.at(-1) !== normalizedFinal) normalizedChain.push(normalizedFinal)
    finalRawUrl.value = normalizedFinal
    chain.value = normalizedChain
    resultKind.value = 'resolved'
    resultVisible.value = true
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '解析失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

function normalizeResultUrl(value: unknown) {
  if (typeof value !== 'string') throw new Error('接口返回了无效链接')
  const parsed = new URL(value)
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('接口返回了不安全的链接')
  return parsed.href
}

async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText()
    const match = text.match(/https?:\/\/[^\s"'<>\]\[）（]+/)
    inputUrl.value = match?.[0] || text.trim()
    pastedInvalid.value = !parsePublicUrl(inputUrl.value)
  } catch {
    ElMessage.error('无法读取剪贴板，请检查浏览器权限')
  }
}

function clearAll() {
  inputUrl.value = ''
  touched.value = false
  pastedInvalid.value = false
  resultVisible.value = false
}

function copyChain() {
  copy(chain.value.map((url, index) => `${index}. ${url}`).join('\n'))
}

function loadExample(value: string) {
  inputUrl.value = value
}
</script>

<template>
  <div class="url-tool flex flex-col mt-3 flex-1">
    <ToolHero summary="先看清链接，再决定要不要打开">
      <template #actions>
        <span class="hero-service-state" :class="{ online: isConfigured }"><i class="state-dot"></i><strong>{{ isConfigured ? '跳转追踪已就绪' : '本地分析可用' }}</strong><small>{{ isConfigured ? '可解析服务端重定向' : '当前未配置云端解析服务' }}</small></span>
      </template>
    </ToolHero>

    <section class="input-card">
      <div class="input-heading">
        <div><span>STEP 1</span><h3>粘贴需要检查的链接</h3></div>
        <button v-if="inputUrl" class="text-button" @click="clearAll">清空</button>
      </div>
      <div class="url-input-shell" :class="{ invalid: showError }">
        <span class="lock-mark">↗</span>
        <input
          v-model="inputUrl"
          type="url"
          spellcheck="false"
          placeholder="https://t.cn/xxxxxx 或带跟踪参数的完整链接"
          @blur="touched = true"
          @keyup.enter="isConfigured ? resolveRedirect() : runLocalAnalysis()"
        />
        <button class="paste-button" @click="pasteFromClipboard">粘贴</button>
      </div>
      <div v-if="showError" class="field-error">{{ urlErrorText }}</div>

      <div v-if="inputDiagnostics" class="diagnostics-row">
        <div><span>协议</span><strong>{{ inputDiagnostics.protocol }}</strong></div>
        <div><span>域名</span><strong>{{ inputDiagnostics.host }}</strong></div>
        <div><span>查询参数</span><strong>{{ inputDiagnostics.queryCount }}</strong></div>
        <div><span>链接判断</span><strong>{{ inputDiagnostics.looksShort ? '疑似短链接' : '普通链接' }}</strong></div>
      </div>
    </section>

    <section class="settings-card">
      <div class="settings-main">
        <div class="setting-heading"><span>STEP 2</span><h3>选择处理方式</h3></div>
        <div class="cleanup-options">
          <button :class="{ active: cleanupMode === 'tracking' }" @click="cleanupMode = 'tracking'">
            <strong>移除营销参数</strong><span>推荐 · 保留业务查询参数</span>
          </button>
          <button :class="{ active: cleanupMode === 'none' }" @click="cleanupMode = 'none'">
            <strong>保留原始链接</strong><span>不对目标地址做清理</span>
          </button>
          <button :class="{ active: cleanupMode === 'all' }" @click="cleanupMode = 'all'">
            <strong>移除全部参数</strong><span>可能影响登录、分享或资源定位</span>
          </button>
        </div>
      </div>

      <div class="tracking-settings" :class="{ disabled: !isConfigured }">
        <div class="tracking-title">
          <div><strong>服务端跳转追踪</strong><span>{{ isConfigured ? '逐跳验证公开 HTTP(S) 地址' : '需要配置 VITE_UNSHORTEN_API' }}</span></div>
          <el-switch v-model="enableFollow" :disabled="!isConfigured" />
        </div>
        <label v-if="enableFollow"><span>最大跳数</span><strong>{{ maxHops }}</strong><input v-model.number="maxHops" type="range" min="2" max="10" :disabled="!isConfigured" /></label>
      </div>

      <div class="action-row">
        <button class="secondary-button" :disabled="!isValidUrl" @click="runLocalAnalysis">仅本地检查与清理</button>
        <button class="primary-button" :disabled="!isConfigured || !isValidUrl || loading" @click="resolveRedirect">
          <span v-if="loading" class="spinner"></span>{{ loading ? '正在追踪跳转' : '追踪并解析最终链接' }}
        </button>
      </div>
      <p v-if="!isConfigured" class="service-note">即使未配置解析服务，你仍可使用本地链接诊断与参数清理；只有 HTTP 重定向追踪暂不可用。</p>
    </section>

    <section v-if="resultVisible" class="result-card">
      <div class="result-heading">
        <div><span>RESULT</span><h3>{{ resultKind === 'resolved' ? '最终目标链接' : '本地清理结果' }}</h3></div>
        <span class="result-badge">{{ resultKind === 'resolved' ? `已追踪 ${hopCount} 跳` : '未发起网络请求' }}</span>
      </div>

      <div class="result-summary">
        <div><span>目标域名</span><strong>{{ targetHost }}</strong></div>
        <div><span>跳转次数</span><strong>{{ resultKind === 'resolved' ? hopCount : '—' }}</strong></div>
        <div><span>已移除参数</span><strong>{{ removedParams.length }}</strong></div>
        <div><span>清理策略</span><strong>{{ cleanupMode === 'tracking' ? '营销参数' : cleanupMode === 'all' ? '全部参数' : '不清理' }}</strong></div>
      </div>

      <div class="final-url-box">
        <div class="url-status-icon">✓</div>
        <div><span>可复制或在新标签页打开</span><a :href="finalUrl" target="_blank" rel="noopener noreferrer">{{ finalUrl }}</a></div>
        <div class="url-actions"><button @click="copy(finalUrl)">复制</button><a :href="finalUrl" target="_blank" rel="noopener noreferrer">访问</a></div>
      </div>

      <div v-if="removedParams.length" class="removed-list">
        <span>已移除</span><code v-for="key in removedParams" :key="key">{{ key }}</code>
      </div>

      <div v-if="resultKind === 'resolved' && chain.length" class="chain-section">
        <div class="chain-heading"><strong>跳转链路</strong><button @click="copyChain">复制链路</button></div>
        <ol>
          <li v-for="(hop, index) in chain" :key="`${hop}-${index}`">
            <span>{{ index }}</span>
            <div><strong>{{ index === 0 ? '起始链接' : index === chain.length - 1 ? '最终目标' : `第 ${index} 跳` }}</strong><code>{{ hop }}</code></div>
          </li>
        </ol>
      </div>
    </section>

    <section class="safety-card">
      <div><span>盾</span><p><strong>解析服务的安全边界</strong>仅允许公开 HTTP(S) 域名，拒绝私网、环回、特殊 IP、账号密码和自定义端口；每一跳都会重新校验。</p></div>
      <div class="example-buttons"><button v-for="example in examples" :key="example.label" @click="loadExample(example.value)">{{ example.label }}</button></div>
    </section>

    <ToolGuide title="使用说明">
      <el-text>
        本地分析不会发起网络请求，可直接检查 URL 结构并移除常见 UTM、广告点击等营销参数。短链接的真实目标只能通过服务端请求 HTTP 重定向后确认；配置 VITE_UNSHORTEN_API 后可开启完整跳转链追踪。访问陌生目标前仍建议确认域名与页面内容。
      </el-text>
    </ToolGuide>
  </div>
</template>

<style scoped>
.url-tool { --accent:#0f766e; --ink:#1f2937; --muted:#667085; }
.hero-service-state { display:inline-flex; align-items:center; gap:7px; padding:7px 11px; border:1px solid #e0d8c7; border-radius:10px; background:rgba(255,252,245,.8); font-size:12px; }.hero-service-state .state-dot { width:8px; height:8px; flex:none; border-radius:50%; background:#d99b35; }.hero-service-state.online { border-color:#bee2d5; background:rgba(242,252,248,.8); }.hero-service-state.online .state-dot { background:#19a36f; }.hero-service-state strong { color: var(--c-text-strong); font-size:12px; }.hero-service-state small { color: var(--c-text-muted); font-size:11px; }
.input-heading span,.setting-heading span,.result-heading span { color:#4c837e; font-size:13px; font-weight:800; letter-spacing:.12em; }
.input-card,.settings-card,.result-card,.safety-card { margin-top:14px; padding:21px; border:1px solid #dfe7e9; border-radius:19px; background:#fff; box-shadow:0 10px 26px rgba(31,57,61,.045); }.input-heading,.result-heading,.chain-heading { display:flex; align-items:center; justify-content:space-between; gap:12px; }.input-heading h3,.setting-heading h3,.result-heading h3 { margin:4px 0 0; color:var(--ink); font-size:18px; font-weight:800; }.text-button,.chain-heading button { border:0; background:transparent; color:#197a70; font-size:13px; font-weight:700; cursor:pointer; }.url-input-shell { display:flex; align-items:center; gap:8px; margin-top:15px; padding:6px; border:1px solid #cfdcdf; border-radius:14px; background:#fafcfc; }.url-input-shell:focus-within { border-color:#69afa8; box-shadow:0 0 0 3px rgba(15,118,110,.08); }.url-input-shell.invalid { border-color:#e1797e; }.lock-mark { display:grid; place-items:center; width:40px; height:40px; border-radius:10px; background:#e8f5f2; color:#197a70; font-size:18px; }.url-input-shell input { flex:1; min-width:0; border:0; outline:0; background:transparent; color:#293543; font:500 14px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace; }.paste-button { border:0; border-radius:9px; padding:10px 13px; background:#edf3f3; color:#4e6d6a; font-size:13px; font-weight:700; cursor:pointer; }.field-error { margin-top:8px; color:#bd3d46; font-size:13px; font-weight:650; }.diagnostics-row,.result-summary { display:grid; grid-template-columns:repeat(4,1fr); gap:0; margin-top:14px; overflow:hidden; border:1px solid #e2e9eb; border-radius:13px; }.diagnostics-row div,.result-summary div { min-width:0; padding:11px 14px; border-right:1px solid #e2e9eb; }.diagnostics-row div:last-child,.result-summary div:last-child { border-right:0; }.diagnostics-row span,.result-summary span { display:block; color:#7c8996; font-size:13px; }.diagnostics-row strong,.result-summary strong { display:block; margin-top:4px; overflow:hidden; color:#415162; font-size:14px; white-space:nowrap; text-overflow:ellipsis; }
.settings-card { display:grid; grid-template-columns:minmax(0,1.4fr) minmax(280px,.6fr); gap:20px; }.cleanup-options { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-top:15px; }.cleanup-options button { padding:13px; border:1px solid #dfe6e8; border-radius:13px; background:#fafcfc; text-align:left; cursor:pointer; }.cleanup-options button.active { border-color:#5da49c; background:#f0faf7; box-shadow:0 0 0 2px rgba(15,118,110,.07); }.cleanup-options strong,.cleanup-options span { display:block; }.cleanup-options strong { color:#3f4e5d; font-size:14px; }.cleanup-options span { margin-top:4px; color:#81909d; font-size:13px; line-height:1.45; }.cleanup-options button.active strong { color:#126f67; }.tracking-settings { padding:15px; border:1px solid #dfe7e9; border-radius:14px; background:#f8fbfb; }.tracking-settings.disabled { opacity:.68; }.tracking-title { display:flex; align-items:center; justify-content:space-between; gap:10px; }.tracking-title strong,.tracking-title span { display:block; }.tracking-title strong { color:#42515e; font-size:14px; }.tracking-title span { margin-top:3px; color:#82909c; font-size:13px; line-height:1.4; }.tracking-settings label { display:grid; grid-template-columns:auto auto; gap:7px 10px; margin-top:17px; color:#687683; font-size:13px; }.tracking-settings label strong { color:#226f69; }.tracking-settings input { grid-column:1/-1; width:100%; accent-color:#0f766e; }.action-row { grid-column:1/-1; display:flex; justify-content:flex-end; gap:9px; padding-top:16px; border-top:1px solid #e8edef; }.primary-button,.secondary-button { display:inline-flex; align-items:center; justify-content:center; gap:8px; min-height:42px; border-radius:11px; padding:10px 16px; font-size:14px; font-weight:750; cursor:pointer; }.primary-button { border:0; background:var(--accent); color:white; }.secondary-button { border:1px solid #cddcde; background:white; color:#356c68; }.primary-button:disabled,.secondary-button:disabled { opacity:.42; cursor:not-allowed; }.spinner { width:13px; height:13px; border:2px solid rgba(255,255,255,.4); border-top-color:#fff; border-radius:50%; animation:spin .8s linear infinite; }@keyframes spin{to{transform:rotate(360deg)}}.service-note { grid-column:1/-1; margin:-8px 0 0; color:#8a7752; font-size:13px; text-align:right; }
.result-badge { padding:7px 10px; border-radius:9px; background:#eaf6f3; color:#18756d!important; font-size:13px!important; letter-spacing:0!important; }.final-url-box { display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:12px; margin-top:14px; padding:15px; border:1px solid #cfe3de; border-radius:14px; background:#f5fbf9; }.url-status-icon { display:grid; place-items:center; width:38px; height:38px; border-radius:50%; background:#dff4ed; color:#168365; font-weight:900; }.final-url-box>div:nth-child(2) { min-width:0; }.final-url-box span,.final-url-box a { display:block; }.final-url-box span { color:#7c8a95; font-size:13px; }.final-url-box a { margin-top:5px; overflow-wrap:anywhere; color:#176f8a; font:650 14px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace; }.url-actions { display:flex; gap:6px; }.url-actions button,.url-actions>a { margin:0; border:1px solid #bdd8d3; border-radius:8px; padding:7px 10px; background:#fff; color:#176f68; font:700 13px/1.2 sans-serif; text-decoration:none; cursor:pointer; }.removed-list { display:flex; align-items:center; flex-wrap:wrap; gap:7px; margin-top:12px; }.removed-list>span { color:#778590; font-size:13px; font-weight:700; }.removed-list code { padding:5px 8px; border-radius:7px; background:#fff1e8; color:#ad5c2f; font-size:13px; }.chain-section { margin-top:19px; padding-top:18px; border-top:1px solid #e5ebec; }.chain-heading strong { color:#384957; font-size:15px; }.chain-section ol { margin:14px 0 0; padding:0; list-style:none; }.chain-section li { position:relative; display:grid; grid-template-columns:auto 1fr; gap:12px; padding-bottom:16px; }.chain-section li:not(:last-child)::after { content:""; position:absolute; left:15px; top:31px; bottom:2px; width:1px; background:#cadbd8; }.chain-section li>span { display:grid; place-items:center; align-self:start; width:31px; height:31px; border-radius:50%; background:#e7f4f1; color:#197a70; font-size:13px; font-weight:800; }.chain-section li strong,.chain-section li code { display:block; }.chain-section li strong { color:#566674; font-size:13px; }.chain-section li code { margin-top:4px; overflow-wrap:anywhere; color:#6f7d89; font-size:13px; line-height:1.5; }
.safety-card { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:15px 18px; }.safety-card>div:first-child { display:flex; align-items:center; gap:11px; }.safety-card>div:first-child>span { display:grid; place-items:center; width:38px; height:38px; flex:none; border-radius:11px; background:#eef5ff; color:#4b73a4; font-size:13px; font-weight:800; }.safety-card p { margin:0; color:#73808d; font-size:13px; line-height:1.55; }.safety-card p strong { display:block; color:#455462; font-size:14px; }.example-buttons { display:flex; gap:7px; flex:none; }.example-buttons button { border:1px solid #dbe4e6; border-radius:9px; padding:8px 10px; background:#fff; color:#52706e; font-size:13px; cursor:pointer; }
:global(.dark) .url-tool { --ink:#eef5f4; --muted:#a1b0b4; }:global(.dark) .input-card,:global(.dark) .settings-card,:global(.dark) .result-card,:global(.dark) .safety-card { border-color:#344850; background:#17242f; }:global(.dark) .tracking-settings,:global(.dark) .url-input-shell,:global(.dark) .cleanup-options button { border-color:#3c5057; background:#1c2b36; }:global(.dark) .url-input-shell input,:global(.dark) .cleanup-options strong,:global(.dark) .tracking-title strong,:global(.dark) .diagnostics-row strong,:global(.dark) .result-summary strong,:global(.dark) .chain-heading strong,:global(.dark) .safety-card p strong { color:#dce7e8; }:global(.dark) .cleanup-options button.active { border-color:#4e958d; background:#183632; }:global(.dark) .diagnostics-row,:global(.dark) .result-summary,:global(.dark) .diagnostics-row div,:global(.dark) .result-summary div,:global(.dark) .action-row,:global(.dark) .chain-section { border-color:#354950; }:global(.dark) .secondary-button,:global(.dark) .url-actions button,:global(.dark) .url-actions>a,:global(.dark) .example-buttons button { border-color:#3c5358; background:#1b2b36; color:#8dc4bd; }:global(.dark) .final-url-box { border-color:#315951; background:#17332f; }:global(.dark) .final-url-box a { color:#74c0d2; }:global(.dark) .hero-service-state { border-color:#3c5057; background:#1c2b36; }:global(.dark) .hero-service-state strong { color:#dce7e8; }
@media (max-width:900px) { .settings-card { grid-template-columns:1fr; }.cleanup-options { grid-template-columns:1fr; }.action-row,.service-note { grid-column:1; }.safety-card { align-items:flex-start; flex-direction:column; }.example-buttons { flex-wrap:wrap; } }
@media (max-width:640px) { .input-card,.settings-card,.result-card { padding:18px 15px; }.url-input-shell { flex-wrap:wrap; }.url-input-shell input { min-width:calc(100% - 56px); }.paste-button { width:100%; }.diagnostics-row,.result-summary { grid-template-columns:repeat(2,1fr); }.diagnostics-row div:nth-child(2),.result-summary div:nth-child(2) { border-right:0; }.diagnostics-row div:nth-child(-n+2),.result-summary div:nth-child(-n+2) { border-bottom:1px solid #e2e9eb; }.action-row { flex-direction:column; }.service-note { text-align:left; }.final-url-box { grid-template-columns:auto 1fr; }.url-actions { grid-column:1/-1; }.url-actions button,.url-actions>a { flex:1; text-align:center; }.safety-card>div:first-child { align-items:flex-start; } }
</style>
