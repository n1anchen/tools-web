<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import { copy } from '@/utils/string'
import {
  calculateCidr,
  isValidIpv4,
  maskNumberToHex,
  maskToPrefix,
  numberToIp,
  prefixToMaskNumber,
  splitSubnet,
  toBinaryIpv4,
  toHexIpv4,
  type CidrResult,
} from '@/utils/ipCalc'

const activeTab = ref<'network' | 'split' | 'convert' | 'mask'>('network')
const cidrInput = ref('192.168.1.34/24')
const result = ref<CidrResult | null>(null)
const cidrError = ref('')
const splitPrefix = ref(26)

const prefixPresets = [8, 16, 20, 24, 27, 30, 31, 32]
const tabs = [
  { id: 'network' as const, label: '网络概览', hint: 'CIDR 与地址范围' },
  { id: 'split' as const, label: '子网拆分', hint: '规划更小网段' },
  { id: 'convert' as const, label: '进制转换', hint: '十进制 / 二进制 / 十六进制' },
  { id: 'mask' as const, label: '掩码换算', hint: '前缀与掩码互转' },
]

function calculateNetwork() {
  cidrError.value = ''
  try {
    const match = cidrInput.value.trim().match(/^([^/]+?)(?:\/(\d{1,2}))?$/)
    if (!match) throw new Error('请输入 IP/CIDR，例如 192.168.1.34/24')
    const prefix = match[2] === undefined ? 24 : Number(match[2])
    result.value = calculateCidr(match[1].trim(), prefix)
    cidrInput.value = `${result.value.inputIp}/${prefix}`
    if (splitPrefix.value < prefix) splitPrefix.value = Math.min(32, prefix + 2)
  } catch (error) {
    result.value = null
    cidrError.value = error instanceof Error ? error.message : '计算失败'
  }
}

function applyPrefix(prefix: number) {
  const ip = cidrInput.value.split('/')[0].trim() || '192.168.1.1'
  cidrInput.value = `${ip}/${prefix}`
  calculateNetwork()
}

function useExample(value: string) {
  cidrInput.value = value
  calculateNetwork()
}

const splitPlan = computed(() => {
  if (!result.value) return null
  try {
    return splitSubnet(result.value, splitPrefix.value)
  } catch {
    return null
  }
})

function adjustSplitPrefix(delta: number) {
  if (!result.value) return
  splitPrefix.value = Math.min(32, result.value.prefix + delta)
}

function copySubnetPlan() {
  if (!splitPlan.value) return
  const rows = [
    ['序号', 'CIDR', '网络地址', '首个可用', '最后可用', '广播地址', '可用主机数'],
    ...splitPlan.value.subnets.map(item => [
      item.index,
      item.cidr,
      item.network,
      item.firstHost,
      item.lastHost,
      item.broadcast,
      item.usableHosts,
    ]),
  ]
  copy(rows.map(row => row.join('\t')).join('\n'))
}

const conv = reactive({
  decimal: '192.168.1.1',
  binary: '',
  hex: '',
  integer: '',
  error: '',
})

function convertFromDecimal() {
  conv.error = ''
  if (!isValidIpv4(conv.decimal)) {
    conv.error = '十进制 IP 格式不正确'
    return
  }
  conv.binary = toBinaryIpv4(conv.decimal)
  conv.hex = toHexIpv4(conv.decimal)
  conv.integer = calculateCidr(conv.decimal, 32).integer.toString()
}

function convertFromBinary() {
  conv.error = ''
  const parts = conv.binary.trim().split('.')
  if (parts.length !== 4 || !parts.every(part => /^[01]{8}$/.test(part))) {
    conv.error = '二进制格式应包含 4 组 8 位数字'
    return
  }
  conv.decimal = parts.map(part => Number.parseInt(part, 2)).join('.')
  convertFromDecimal()
}

function convertFromHex() {
  conv.error = ''
  const normalized = conv.hex.trim().replace(/^0x/i, '')
  const parts = normalized.includes('.')
    ? normalized.split('.')
    : normalized.match(/.{1,2}/g) || []
  if (parts.length !== 4 || !parts.every(part => /^[0-9a-f]{2}$/i.test(part))) {
    conv.error = '十六进制格式示例：C0.A8.01.01 或 C0A80101'
    return
  }
  conv.decimal = parts.map(part => Number.parseInt(part, 16)).join('.')
  convertFromDecimal()
}

function convertFromInteger() {
  conv.error = ''
  const value = Number(conv.integer)
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
    conv.error = '整数范围应为 0 到 4294967295'
    return
  }
  conv.decimal = numberToIp(value)
  convertFromDecimal()
}

const maskCalc = reactive({
  prefix: 24,
  decimal: '255.255.255.0',
  wildcard: '0.0.0.255',
  hex: '0xFFFFFF00',
  binary: '',
  error: '',
})

function maskFromPrefix() {
  maskCalc.error = ''
  try {
    const maskNumber = prefixToMaskNumber(maskCalc.prefix)
    maskCalc.decimal = numberToIp(maskNumber)
    maskCalc.wildcard = numberToIp(0xffffffff - maskNumber)
    maskCalc.hex = maskNumberToHex(maskNumber)
    maskCalc.binary = toBinaryIpv4(maskCalc.decimal)
  } catch (error) {
    maskCalc.error = error instanceof Error ? error.message : '换算失败'
  }
}

function prefixFromMask() {
  maskCalc.error = ''
  try {
    maskCalc.prefix = maskToPrefix(maskCalc.decimal)
    maskFromPrefix()
  } catch (error) {
    maskCalc.error = error instanceof Error ? error.message : '换算失败'
  }
}

function formatCount(value: number) {
  return value.toLocaleString('zh-CN')
}

function copyValue(value: string | number) {
  copy(String(value))
}

calculateNetwork()
convertFromDecimal()
maskFromPrefix()
</script>

<template>
  <div class="ip-tool flex flex-col mt-3 flex-1">
    <ToolHero legacy>

    <section class="hero-card">
      <div>
        <div class="eyebrow">NETWORK WORKBENCH</div>
        <h2>从一个 IP，看清整个网络边界</h2>
        <p>输入 IP/CIDR，即时计算网段、主机范围与地址属性，也可继续拆分子网。</p>
      </div>
      <div class="hero-metrics" v-if="result">
        <div><span>当前网络</span><strong>{{ result.cidr }}</strong></div>
        <div><span>可用主机</span><strong>{{ formatCount(result.usableHosts) }}</strong></div>
        <div><span>地址属性</span><strong>{{ result.classification.label }}</strong></div>
      </div>
    </section>
    </ToolHero>

    <section class="workbench-card">
      <div class="cidr-input-row">
        <div class="input-block">
          <label for="cidr-input">IP 地址 / CIDR</label>
          <div class="input-shell" :class="{ invalid: cidrError }">
            <span class="input-icon">IP</span>
            <input
              id="cidr-input"
              v-model="cidrInput"
              type="text"
              spellcheck="false"
              placeholder="192.168.1.34/24"
              @keyup.enter="calculateNetwork"
            />
            <button class="primary-button" type="button" @click="calculateNetwork">开始计算</button>
          </div>
          <div v-if="cidrError" class="field-error">{{ cidrError }}</div>
        </div>
        <div class="preset-block">
          <span>常用前缀</span>
          <div class="preset-list">
            <button v-for="prefix in prefixPresets" :key="prefix" type="button" @click="applyPrefix(prefix)">/{{ prefix }}</button>
          </div>
        </div>
      </div>

      <nav class="tool-tabs" aria-label="IP 计算器功能">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <strong>{{ tab.label }}</strong>
          <span>{{ tab.hint }}</span>
        </button>
      </nav>

      <div v-if="activeTab === 'network' && result" class="panel-content">
        <div class="section-heading">
          <div><span>NETWORK SUMMARY</span><h3>网络概览</h3></div>
          <div class="classification" :class="result.classification.scope">
            <strong>{{ result.classification.label }}</strong>
            <span>{{ result.classification.legacyClass }}</span>
          </div>
        </div>

        <div class="address-range">
          <div class="range-node network"><span>网络地址</span><strong>{{ result.network }}</strong></div>
          <div class="range-line"><span>{{ formatCount(result.usableHosts) }} 个可用地址</span></div>
          <div class="range-node broadcast"><span>广播地址</span><strong>{{ result.broadcast }}</strong></div>
        </div>

        <div class="result-grid">
          <article><span>标准 CIDR</span><strong>{{ result.cidr }}</strong><button @click="copyValue(result.cidr)">复制</button></article>
          <article><span>子网掩码</span><strong>{{ result.mask }}</strong><button @click="copyValue(result.mask)">复制</button></article>
          <article><span>反掩码 / Wildcard</span><strong>{{ result.wildcardMask }}</strong><button @click="copyValue(result.wildcardMask)">复制</button></article>
          <article><span>首个可用 IP</span><strong>{{ result.firstHost }}</strong><button @click="copyValue(result.firstHost)">复制</button></article>
          <article><span>最后可用 IP</span><strong>{{ result.lastHost }}</strong><button @click="copyValue(result.lastHost)">复制</button></article>
          <article><span>地址总数</span><strong>{{ formatCount(result.totalHosts) }}</strong></article>
          <article><span>十六进制掩码</span><strong>{{ result.maskHex }}</strong><button @click="copyValue(result.maskHex)">复制</button></article>
          <article><span>IP 整数值</span><strong>{{ formatCount(result.integer) }}</strong><button @click="copyValue(result.integer)">复制</button></article>
        </div>

        <div class="scope-note">
          <div class="scope-dot" :class="result.classification.scope"></div>
          <div><strong>{{ result.classification.label }}</strong><p>{{ result.classification.description }}</p></div>
        </div>
        <div class="binary-strip"><span>32 位二进制</span><code>{{ result.binary }}</code><button @click="copyValue(result.binary)">复制</button></div>
      </div>

      <div v-else-if="activeTab === 'split' && result" class="panel-content">
        <div class="section-heading split-heading">
          <div><span>SUBNET PLANNER</span><h3>将 {{ result.cidr }} 拆分成更小网段</h3></div>
          <button class="secondary-button" type="button" @click="copySubnetPlan">复制当前表格</button>
        </div>

        <div class="split-controls">
          <div class="prefix-control">
            <label>新网络前缀 <strong>/{{ splitPrefix }}</strong></label>
            <input v-model.number="splitPrefix" type="range" :min="result.prefix" max="32" />
            <div class="split-shortcuts">
              <button v-for="delta in [1, 2, 4, 8]" :key="delta" :disabled="result.prefix + delta > 32" @click="adjustSplitPrefix(delta)">多 {{ delta }} 位</button>
            </div>
          </div>
          <div v-if="splitPlan" class="split-stats">
            <div><span>子网数量</span><strong>{{ formatCount(splitPlan.subnetCount) }}</strong></div>
            <div><span>每网段地址</span><strong>{{ formatCount(splitPlan.subnetSize) }}</strong></div>
            <div><span>每网段可用</span><strong>{{ formatCount(splitPlan.usablePerSubnet) }}</strong></div>
          </div>
        </div>

        <div v-if="splitPlan" class="subnet-table-wrap">
          <table class="subnet-table">
            <thead><tr><th>#</th><th>CIDR</th><th>可用范围</th><th>广播地址</th><th>可用数</th></tr></thead>
            <tbody>
              <tr v-for="subnet in splitPlan.subnets" :key="subnet.index">
                <td>{{ subnet.index }}</td>
                <td><button class="copy-link" @click="copyValue(subnet.cidr)">{{ subnet.cidr }}</button></td>
                <td><code>{{ subnet.firstHost }} — {{ subnet.lastHost }}</code></td>
                <td><code>{{ subnet.broadcast }}</code></td>
                <td>{{ formatCount(subnet.usableHosts) }}</td>
              </tr>
            </tbody>
          </table>
          <p v-if="splitPlan.truncated" class="table-note">子网较多，当前预览前 {{ splitPlan.subnets.length }} 个；复制表格同样包含当前预览。</p>
        </div>
      </div>

      <div v-else-if="activeTab === 'convert'" class="panel-content">
        <div class="section-heading"><div><span>FORMAT CONVERTER</span><h3>IPv4 多格式互转</h3></div></div>
        <p class="section-intro">编辑任意一行并点击该行转换，其余格式会同步更新。</p>
        <div class="converter-list">
          <label><span>十进制点分</span><div><input v-model="conv.decimal" @keyup.enter="convertFromDecimal" /><button @click="convertFromDecimal">转换</button></div></label>
          <label><span>二进制</span><div><input v-model="conv.binary" class="mono" @keyup.enter="convertFromBinary" /><button @click="convertFromBinary">转换</button></div></label>
          <label><span>十六进制</span><div><input v-model="conv.hex" class="mono" @keyup.enter="convertFromHex" /><button @click="convertFromHex">转换</button></div></label>
          <label><span>32 位整数</span><div><input v-model="conv.integer" class="mono" @keyup.enter="convertFromInteger" /><button @click="convertFromInteger">转换</button></div></label>
        </div>
        <div v-if="conv.error" class="inline-error">{{ conv.error }}</div>
        <div class="converter-tip">十六进制同时支持 <code>C0.A8.01.01</code> 与 <code>C0A80101</code> 两种写法。</div>
      </div>

      <div v-else-if="activeTab === 'mask'" class="panel-content">
        <div class="section-heading"><div><span>MASK CONVERTER</span><h3>前缀长度与子网掩码互转</h3></div></div>
        <div class="mask-editor">
          <div class="mask-source">
            <label>前缀长度</label>
            <div class="prefix-number"><span>/</span><input v-model.number="maskCalc.prefix" type="number" min="0" max="32" /><button @click="maskFromPrefix">转为掩码</button></div>
          </div>
          <div class="swap-mark">⇄</div>
          <div class="mask-source">
            <label>十进制掩码</label>
            <div class="prefix-number"><input v-model="maskCalc.decimal" @keyup.enter="prefixFromMask" /><button @click="prefixFromMask">转为前缀</button></div>
          </div>
        </div>
        <div v-if="maskCalc.error" class="inline-error">{{ maskCalc.error }}</div>
        <div class="mask-results">
          <article><span>前缀</span><strong>/{{ maskCalc.prefix }}</strong></article>
          <article><span>十进制掩码</span><strong>{{ maskCalc.decimal }}</strong><button @click="copyValue(maskCalc.decimal)">复制</button></article>
          <article><span>反掩码</span><strong>{{ maskCalc.wildcard }}</strong><button @click="copyValue(maskCalc.wildcard)">复制</button></article>
          <article><span>十六进制</span><strong>{{ maskCalc.hex }}</strong><button @click="copyValue(maskCalc.hex)">复制</button></article>
        </div>
        <div class="binary-strip"><span>二进制掩码</span><code>{{ maskCalc.binary }}</code><button @click="copyValue(maskCalc.binary)">复制</button></div>
      </div>
    </section>

    <section class="example-row">
      <span>快速示例</span>
      <button @click="useExample('10.24.8.16/20')">企业内网 /20</button>
      <button @click="useExample('172.16.0.10/30')">点对点 /30</button>
      <button @click="useExample('203.0.113.8/29')">小型公网 /29</button>
    </section>

    <ToolGuide title="使用说明">
      <el-text>
        「网络概览」用于确认 CIDR 边界、地址范围和 IP 属性；「子网拆分」可按新前缀预览更小网段；「进制转换」支持十进制、二进制、十六进制和 32 位整数互转；「掩码换算」支持前缀与连续子网掩码双向换算。/31 按点对点网络计为 2 个可用地址，/32 按单主机路由计为 1 个地址。
      </el-text>
    </ToolGuide>
  </div>
</template>

<style scoped>
.ip-tool { --accent: #2563eb; --ink: #172033; --muted: #667085; }
.hero-card { display:flex; align-items:flex-end; justify-content:space-between; gap:24px; padding:26px; border:1px solid #dbe5f2; border-radius:24px; background:linear-gradient(135deg,#f7fbff 0%,#eef5ff 58%,#f6f3ff 100%); box-shadow:0 14px 34px rgba(52,72,110,.08); }
.eyebrow,.section-heading span { color:#5375a7; font-size:13px; font-weight:800; letter-spacing:.12em; }
.hero-card h2 { margin:6px 0 8px; color:var(--ink); font-size:25px; line-height:1.3; font-weight:800; }
.hero-card p,.section-intro { margin:0; color:var(--muted); font-size:14px; line-height:1.7; }
.hero-metrics { display:grid; grid-template-columns:repeat(3,minmax(110px,1fr)); min-width:430px; padding:14px 0; border:1px solid rgba(139,160,194,.3); border-radius:18px; background:rgba(255,255,255,.72); backdrop-filter:blur(10px); }
.hero-metrics div { padding:0 18px; border-right:1px solid #dce5f1; }
.hero-metrics div:last-child { border-right:0; }
.hero-metrics span,.result-grid span,.split-stats span,.mask-results span { display:block; color:#7b879c; font-size:13px; font-weight:600; }
.hero-metrics strong { display:block; margin-top:5px; color:#27364d; font:700 15px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace; }
.workbench-card { margin-top:16px; overflow:hidden; border:1px solid #dfe6ef; border-radius:22px; background:#fff; box-shadow:0 12px 30px rgba(31,42,68,.06); }
.cidr-input-row { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:22px; align-items:end; padding:22px; }
.input-block label,.preset-block>span,.prefix-control label,.mask-source label { display:block; margin-bottom:8px; color:#43516a; font-size:14px; font-weight:700; }
.input-shell { display:flex; align-items:center; gap:8px; padding:6px; border:1px solid #cbd6e5; border-radius:14px; background:#f9fbfd; transition:.2s; }
.input-shell:focus-within { border-color:#7aa6ee; box-shadow:0 0 0 3px rgba(37,99,235,.09); }
.input-shell.invalid { border-color:#f08a91; }
.input-icon { display:grid; place-items:center; width:38px; height:38px; border-radius:10px; color:#335f9c; background:#eaf2ff; font-size:13px; font-weight:800; }
.input-shell input,.converter-list input,.prefix-number input { min-width:0; flex:1; border:0; outline:0; background:transparent; color:#202b3d; font-size:15px; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; }
.primary-button,.secondary-button { border:0; border-radius:10px; padding:11px 17px; background:var(--accent); color:#fff; font-size:14px; font-weight:700; cursor:pointer; }
.secondary-button { border:1px solid #ccd8e8; background:#fff; color:#3d5c87; }
.field-error,.inline-error { margin-top:8px; color:#c23c4a; font-size:13px; font-weight:600; }
.preset-list { display:flex; flex-wrap:wrap; gap:6px; max-width:330px; }
.preset-list button,.split-shortcuts button,.example-row button { border:1px solid #d8e1ed; border-radius:9px; padding:7px 10px; background:#fff; color:#52627b; font-size:13px; font-weight:650; cursor:pointer; }
.preset-list button:hover,.split-shortcuts button:hover,.example-row button:hover { border-color:#8db1ea; color:#245fb9; background:#f3f7ff; }
.tool-tabs { display:grid; grid-template-columns:repeat(4,1fr); gap:0; padding:0 22px; border-top:1px solid #e5ebf2; border-bottom:1px solid #e5ebf2; background:#f8fafc; }
.tool-tabs button { position:relative; display:flex; flex-direction:column; align-items:flex-start; gap:3px; padding:15px 14px; border:0; background:transparent; cursor:pointer; }
.tool-tabs button::after { content:""; position:absolute; left:14px; right:14px; bottom:-1px; height:3px; border-radius:3px 3px 0 0; background:transparent; }
.tool-tabs button.active::after { background:var(--accent); }
.tool-tabs strong { color:#344158; font-size:14px; }
.tool-tabs span { color:#8a96a8; font-size:13px; }
.tool-tabs button.active strong { color:#1f5fbf; }
.panel-content { padding:24px 22px 26px; }
.section-heading { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:18px; }
.section-heading h3 { margin:4px 0 0; color:var(--ink); font-size:20px; font-weight:800; }
.classification { display:flex; align-items:center; gap:8px; padding:9px 12px; border-radius:12px; background:#f2f6fb; color:#52627a; }
.classification strong { font-size:14px; }.classification span { font-size:13px; letter-spacing:0; }.classification.private { background:#eaf8f1; color:#16734b; }.classification.public { background:#eaf2ff; color:#245eaa; }.classification.special { background:#fff4df; color:#996312; }
.address-range { display:grid; grid-template-columns:auto minmax(120px,1fr) auto; align-items:center; margin-bottom:18px; padding:16px; border-radius:16px; background:#f5f8fc; }
.range-node { padding:11px 13px; border:1px solid #d5e1ef; border-radius:12px; background:#fff; }.range-node span { display:block; color:#7b8798; font-size:13px; }.range-node strong { display:block; margin-top:4px; color:#29374d; font:700 14px ui-monospace,SFMono-Regular,Menlo,monospace; }
.range-line { position:relative; height:2px; margin:0 14px; background:linear-gradient(90deg,#8bb5ef,#8ed2bd); }.range-line::before,.range-line::after { content:""; position:absolute; top:-4px; width:10px; height:10px; border-radius:50%; background:#5d92da; }.range-line::before{left:0}.range-line::after{right:0;background:#56ad91}.range-line span { position:absolute; left:50%; bottom:8px; transform:translateX(-50%); color:#607088; font-size:13px; white-space:nowrap; }
.result-grid,.mask-results { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; }
.result-grid article,.mask-results article { position:relative; min-height:84px; padding:14px; border:1px solid #e0e7f0; border-radius:14px; background:#fff; }.result-grid strong,.mask-results strong { display:block; margin-top:8px; overflow-wrap:anywhere; color:#27354a; font:700 14px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace; }.result-grid article button,.mask-results article button { position:absolute; top:10px; right:10px; border:0; background:transparent; color:#3571c7; font-size:13px; cursor:pointer; }
.scope-note { display:flex; gap:11px; align-items:flex-start; margin-top:14px; padding:13px 15px; border-radius:13px; background:#f7f9fc; }.scope-dot { width:9px; height:9px; margin-top:5px; border-radius:50%; background:#d38b27; }.scope-dot.private{background:#22a06b}.scope-dot.public{background:#3578d3}.scope-note strong { color:#344258; font-size:14px; }.scope-note p { margin:3px 0 0; color:#68758a; font-size:13px; line-height:1.55; }
.binary-strip { display:flex; align-items:center; gap:14px; margin-top:12px; padding:13px 15px; overflow:hidden; border:1px solid #e0e7ef; border-radius:13px; }.binary-strip span { flex:none; color:#778398; font-size:13px; font-weight:700; }.binary-strip code { flex:1; min-width:0; overflow-wrap:anywhere; color:#27364d; font-size:13px; }.binary-strip button { border:0; background:transparent; color:#3571c7; font-size:13px; cursor:pointer; }
.split-controls { display:grid; grid-template-columns:minmax(250px,1fr) minmax(360px,1fr); gap:18px; margin-bottom:18px; }.prefix-control { padding:16px; border:1px solid #e0e7ef; border-radius:15px; }.prefix-control label strong { color:#245fb8; font-size:18px; }.prefix-control input { width:100%; accent-color:#2563eb; }.split-shortcuts { display:flex; gap:7px; margin-top:8px; }.split-shortcuts button:disabled { opacity:.4; cursor:not-allowed; }.split-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }.split-stats div { padding:15px; border-radius:14px; background:#f4f7fb; }.split-stats strong { display:block; margin-top:6px; color:#26364d; font-size:18px; }
.subnet-table-wrap { overflow-x:auto; border:1px solid #e0e7ef; border-radius:15px; }.subnet-table { width:100%; border-collapse:collapse; min-width:760px; }.subnet-table th,.subnet-table td { padding:12px 14px; border-bottom:1px solid #e8edf3; text-align:left; color:#526077; font-size:13px; }.subnet-table th { background:#f6f8fb; color:#637087; font-weight:750; }.subnet-table tr:last-child td { border-bottom:0; }.subnet-table code { color:#344158; font-size:13px; }.copy-link { border:0; padding:0; background:transparent; color:#2768c3; font:700 13px ui-monospace,SFMono-Regular,Menlo,monospace; cursor:pointer; }.table-note { margin:0; padding:11px 14px; border-top:1px solid #e8edf3; color:#7a8798; font-size:13px; }
.converter-list { display:grid; gap:12px; margin-top:18px; }.converter-list label>span { display:block; margin-bottom:6px; color:#59677c; font-size:13px; font-weight:700; }.converter-list label>div,.prefix-number { display:flex; min-height:44px; border:1px solid #d8e1ed; border-radius:12px; overflow:hidden; }.converter-list input,.prefix-number input { padding:0 13px; }.converter-list button,.prefix-number button { flex:none; min-width:76px; border:0; border-left:1px solid #d8e1ed; background:#f4f7fb; color:#3566a6; font-size:13px; font-weight:700; cursor:pointer; }.mono { font-family:ui-monospace,SFMono-Regular,Menlo,monospace!important; }.converter-tip { margin-top:14px; padding:12px 14px; border-radius:12px; background:#f5f8fc; color:#65738a; font-size:13px; }.converter-tip code { color:#2d5d9f; }
.mask-editor { display:grid; grid-template-columns:1fr auto 1fr; align-items:end; gap:16px; }.swap-mark { padding-bottom:11px; color:#7b91af; font-size:22px; }.prefix-number>span { display:grid; place-items:center; width:38px; color:#66809f; background:#f4f7fb; font-weight:800; }.mask-results { margin-top:18px; }
.example-row { display:flex; align-items:center; flex-wrap:wrap; gap:8px; margin-top:12px; padding:12px 14px; border:1px solid #e0e7ef; border-radius:15px; background:#fff; }.example-row>span { margin-right:4px; color:#68758a; font-size:13px; font-weight:700; }
:global(.dark) .ip-tool { --ink:#eef4ff; --muted:#9faec2; }
:global(.dark) .hero-card { border-color:#334155; background:linear-gradient(135deg,#162238,#18283f 55%,#242039); }
:global(.dark) .hero-metrics,:global(.dark) .workbench-card,:global(.dark) .example-row { border-color:#34445a; background:#172235; }
:global(.dark) .hero-metrics div,:global(.dark) .tool-tabs { border-color:#34445a; }
:global(.dark) .hero-metrics strong,:global(.dark) .input-shell input,:global(.dark) .converter-list input,:global(.dark) .prefix-number input,:global(.dark) .section-heading h3,:global(.dark) .result-grid strong,:global(.dark) .mask-results strong,:global(.dark) .range-node strong,:global(.dark) .scope-note strong { color:#e7eef9; }
:global(.dark) .workbench-card { background:#111b2b; }
:global(.dark) .input-shell,:global(.dark) .tool-tabs,:global(.dark) .address-range,:global(.dark) .scope-note,:global(.dark) .converter-tip { border-color:#35445a; background:#182538; }
:global(.dark) .preset-list button,:global(.dark) .split-shortcuts button,:global(.dark) .example-row button,:global(.dark) .secondary-button,:global(.dark) .range-node,:global(.dark) .result-grid article,:global(.dark) .mask-results article { border-color:#35445a; background:#172438; color:#bac7d8; }
:global(.dark) .tool-tabs strong { color:#c4cedd; }:global(.dark) .tool-tabs button.active strong { color:#7cb0ff; }:global(.dark) .tool-tabs span,:global(.dark) .result-grid span,:global(.dark) .split-stats span,:global(.dark) .mask-results span { color:#8e9db2; }
:global(.dark) .classification { background:#253246; }:global(.dark) .split-stats div { background:#182538; }
:global(.dark) .subnet-table-wrap,:global(.dark) .prefix-control,:global(.dark) .binary-strip,:global(.dark) .converter-list label>div,:global(.dark) .prefix-number { border-color:#35445a; }
:global(.dark) .subnet-table th { background:#19263a;color:#aab7c9 }:global(.dark) .subnet-table td,:global(.dark) .subnet-table th,:global(.dark) .table-note { border-color:#314057;color:#aebacd }:global(.dark) .subnet-table code { color:#cdd7e5 }
:global(.dark) .converter-list button,:global(.dark) .prefix-number button,:global(.dark) .prefix-number>span { border-color:#35445a;background:#1d2b3f }:global(.dark) .section-intro,:global(.dark) .hero-card p { color:#a2afc1; }
@media (max-width:900px) { .hero-card { align-items:stretch; flex-direction:column; }.hero-metrics { min-width:0; }.cidr-input-row { grid-template-columns:1fr; }.preset-list { max-width:none; }.result-grid,.mask-results { grid-template-columns:repeat(2,1fr); }.split-controls { grid-template-columns:1fr; } }
@media (max-width:640px) { .hero-card,.panel-content,.cidr-input-row { padding:18px 15px; }.hero-card h2 { font-size:21px; }.hero-metrics { grid-template-columns:1fr; padding:0; }.hero-metrics div { padding:11px 14px; border-right:0; border-bottom:1px solid #dce5f1; }.hero-metrics div:last-child { border-bottom:0; }.input-shell { flex-wrap:wrap; }.input-shell input { min-width:calc(100% - 54px); }.primary-button { width:100%; }.tool-tabs { grid-template-columns:repeat(2,1fr); padding:0 8px; }.tool-tabs button { padding:13px 10px; }.address-range { grid-template-columns:1fr; gap:12px; }.range-line { width:2px; height:34px; margin:auto; background:linear-gradient(#8bb5ef,#8ed2bd); }.range-line span { left:10px; bottom:8px; transform:none; }.range-line::before{top:0;left:-4px}.range-line::after{top:auto;bottom:0;right:auto;left:-4px}.result-grid,.mask-results { grid-template-columns:1fr; }.split-heading,.section-heading { align-items:flex-start; flex-direction:column; }.split-stats { grid-template-columns:1fr; }.mask-editor { grid-template-columns:1fr; }.swap-mark { padding:0; transform:rotate(90deg); text-align:center; }.binary-strip { align-items:flex-start; flex-wrap:wrap; }.binary-strip code { flex-basis:100%; }.example-row { align-items:stretch; flex-direction:column; }.example-row button { text-align:left; } }
</style>
