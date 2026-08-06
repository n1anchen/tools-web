<script setup lang="ts">
import { computed, ref } from 'vue'
import { CircleCheckFilled, Delete, WarningFilled } from '@element-plus/icons-vue'
import CopyButton from '@/components/Common/CopyButton.vue'
import { jwtDecode } from 'jwt-decode'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import { analyzeJwtClaims, formatUnixClaim } from '@/utils/converters'

const sampleToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ0b29scy5yYW5ibG9ncy5jb20iLCJzdWIiOiJhcnlhIiwiYXVkIjoidGFvcmFuIiwiaWF0IjoxNzE3MDM2MzMzLCJleHAiOjE3MTcwMzY5MzN9.9v_eDdsPnvcY7qZatNnKvN9VEf7t7o72OgwhLS6gy6w'
const token = ref(sampleToken)

type JsonRecord = Record<string, unknown>

const decoded = computed(() => {
  const value = token.value.trim()
  if (!value) return { header: null as JsonRecord | null, payload: null as JsonRecord | null, segments: [] as string[], error: '' }
  try {
    const segments = value.split('.')
    if (segments.length !== 3 || segments.some(segment => !segment)) throw new Error('标准 JWT 应包含由两个句点分隔的三段内容')
    return {
      header: jwtDecode<JsonRecord>(value, { header: true }),
      payload: jwtDecode<JsonRecord>(value),
      segments,
      error: '',
    }
  } catch (error) {
    return {
      header: null,
      payload: null,
      segments: [],
      error: error instanceof Error ? error.message : 'Token 格式无效',
    }
  }
})

const headerJson = computed(() => decoded.value.header ? JSON.stringify(decoded.value.header, null, 2) : '')
const payloadJson = computed(() => decoded.value.payload ? JSON.stringify(decoded.value.payload, null, 2) : '')
const temporalStatus = computed(() => decoded.value.payload ? analyzeJwtClaims(decoded.value.payload) : null)
const statusTone = computed(() => {
  if (!temporalStatus.value) return 'neutral'
  return {
    valid: 'success',
    expired: 'danger',
    'not-yet-valid': 'warning',
    'no-expiry': 'neutral',
  }[temporalStatus.value.state]
})

const segmentInfo = computed(() => {
  const [header = '', payload = '', signature = ''] = decoded.value.segments
  return [
    { key: 'header', label: 'Header', description: '算法与类型', value: header, color: 'rose' },
    { key: 'payload', label: 'Payload', description: '声明与业务数据', value: payload, color: 'violet' },
    { key: 'signature', label: 'Signature', description: '签名数据', value: signature, color: 'cyan' },
  ]
})

const standardClaims = computed(() => {
  const payload = decoded.value.payload
  if (!payload) return []
  const definitions = [
    { key: 'iss', name: '签发者', description: 'Issuer' },
    { key: 'sub', name: '主题', description: 'Subject' },
    { key: 'aud', name: '接收方', description: 'Audience' },
    { key: 'iat', name: '签发时间', description: 'Issued At' },
    { key: 'nbf', name: '生效时间', description: 'Not Before' },
    { key: 'exp', name: '过期时间', description: 'Expiration Time' },
    { key: 'jti', name: 'Token 编号', description: 'JWT ID' },
  ]
  return definitions
    .filter(definition => payload[definition.key] !== undefined)
    .map(definition => {
      const value = payload[definition.key]
      const temporal = ['iat', 'nbf', 'exp'].includes(definition.key)
      return {
        ...definition,
        value: typeof value === 'string' ? value : JSON.stringify(value),
        interpreted: temporal ? formatUnixClaim(value) : '',
      }
    })
})

const customClaimCount = computed(() => {
  if (!decoded.value.payload) return 0
  const standard = new Set(['iss', 'sub', 'aud', 'iat', 'nbf', 'exp', 'jti'])
  return Object.keys(decoded.value.payload).filter(key => !standard.has(key)).length
})

function loadSample() {
  token.value = sampleToken
}
</script>

<template>
  <div class="jwt-page flex flex-col mt-3 flex-1">
    <ToolHero />

    <section class="security-banner">
      <el-icon><WarningFilled /></el-icon>
      <div><strong>此工具只解码，不验证签名</strong><span>解码成功不代表 Token 可信或可用于鉴权；服务端仍必须使用正确密钥和算法验证。</span></div>
    </section>

    <section class="decoder-card">
      <div class="card-heading">
        <div><span class="eyebrow">TOKEN INPUT</span><h2>粘贴 JSON Web Token</h2></div>
        <div>
          <el-button text @click="loadSample">载入示例</el-button>
          <el-button text :icon="Delete" @click="token = ''">清空</el-button>
        </div>
      </div>
      <el-input v-model="token" type="textarea" :rows="6" resize="none" placeholder="eyJhbGciOi..." />
      <div v-if="decoded.error" class="error-box">{{ decoded.error }}</div>
      <div v-else-if="decoded.payload" class="input-meta">
        <span><el-icon><CircleCheckFilled /></el-icon>格式可解析</span>
        <span>{{ token.length }} 字符</span>
        <span>{{ customClaimCount }} 个自定义声明</span>
      </div>
    </section>

    <template v-if="decoded.header && decoded.payload">
      <section class="overview-grid">
        <div class="status-card" :class="statusTone">
          <span class="eyebrow">TIME STATUS</span>
          <strong>{{ temporalStatus?.title }}</strong>
          <p>{{ temporalStatus?.detail }}</p>
        </div>
        <div class="algorithm-card">
          <div><span>签名算法</span><strong>{{ decoded.header.alg || '未声明' }}</strong></div>
          <div><span>Token 类型</span><strong>{{ decoded.header.typ || '未声明' }}</strong></div>
        </div>
      </section>

      <section class="segments-card">
        <div class="section-heading"><div><span class="eyebrow">ANATOMY</span><h3>Token 三段结构</h3></div><span>Base64URL 编码，以句点分隔</span></div>
        <div class="segments-grid">
          <article v-for="segment in segmentInfo" :key="segment.key" :class="segment.color">
            <div><strong>{{ segment.label }}</strong><span>{{ segment.description }}</span></div>
            <code>{{ segment.value.slice(0, 38) }}{{ segment.value.length > 38 ? '…' : '' }}</code>
            <small>{{ segment.value.length }} 字符</small>
          </article>
        </div>
      </section>

      <div class="json-grid">
        <section class="json-card header-json">
          <div class="section-heading">
            <div><span class="eyebrow">HEADER</span><h3>头部</h3></div>
            <CopyButton link type="primary" :text="headerJson" label="复制 JSON" />
          </div>
          <pre>{{ headerJson }}</pre>
        </section>
        <section class="json-card payload-json">
          <div class="section-heading">
            <div><span class="eyebrow">PAYLOAD</span><h3>载荷</h3></div>
            <CopyButton link type="primary" :text="payloadJson" label="复制 JSON" />
          </div>
          <pre>{{ payloadJson }}</pre>
        </section>
      </div>

      <section class="claims-card">
        <div class="section-heading"><div><span class="eyebrow">REGISTERED CLAIMS</span><h3>标准声明解读</h3></div><span>{{ standardClaims.length }} 项</span></div>
        <div v-if="standardClaims.length" class="claims-list">
          <div v-for="claim in standardClaims" :key="claim.key">
            <code>{{ claim.key }}</code>
            <div><strong>{{ claim.name }}</strong><small>{{ claim.description }}</small></div>
            <div class="claim-value"><strong>{{ claim.value }}</strong><small v-if="claim.interpreted">{{ claim.interpreted }}</small></div>
          </div>
        </div>
        <div v-else class="empty-claims">Payload 中没有常见的标准声明。</div>
      </section>
    </template>

    <ToolGuide title="JWT 安全说明">
      <el-text>
        JWT 由 Header、Payload、Signature 三部分组成。前两部分只是 Base64URL 编码，并未加密，任何人都可以读取，切勿在其中放入密码等敏感信息。浏览器端无法在不知道密钥的情况下证明签名有效；生产鉴权应在可信服务端校验签名、算法、签发方、接收方及有效期。
      </el-text>
    </ToolGuide>
  </div>
</template>

<style scoped>
.jwt-page { --rose: #e11d48; --violet: #7c3aed; --cyan: #0891b2; gap: 16px; }
.security-banner, .decoder-card, .segments-card, .json-card, .claims-card, .status-card, .algorithm-card { border: 1px solid var(--c-border); border-radius: 21px; background: #fff; box-shadow: 0 12px 35px rgb(15 23 42 / 6%); }
.security-banner { display: flex; align-items: center; gap: 12px; padding: 15px 18px; border-color: #fde68a; color: #92400e; background: #fffbeb; }
.security-banner > .el-icon { flex: none; font-size: 22px; }
.security-banner div { display: flex; flex-direction: column; }
.security-banner span { margin-top: 2px; font-size: 12px; line-height: 1.5; }
.decoder-card, .segments-card, .json-card, .claims-card { padding: 23px; }
.card-heading, .section-heading, .input-meta { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.eyebrow { color: var(--violet); font-size: 10px; font-weight: 800; letter-spacing: .15em; }
.card-heading h2, .section-heading h3 { margin: 5px 0 0; color: var(--c-text-primary); }
.card-heading h2 { font-size: 20px; }
.section-heading h3 { font-size: 18px; }
.decoder-card :deep(.el-textarea__inner) { margin-top: 17px; padding: 16px; border: 1px solid var(--c-border); border-radius: 15px; box-shadow: none; color: var(--c-text-strong); background: var(--c-surface-subtle); font: 13px/1.7 ui-monospace, SFMono-Regular, Menlo, monospace; }
.input-meta { justify-content: flex-start; flex-wrap: wrap; margin-top: 11px; color: var(--c-text-secondary); font-size: 11px; }
.input-meta span { display: flex; align-items: center; gap: 4px; }
.input-meta span:first-child { color: #15803d; }
.error-box { margin-top: 12px; padding: 12px 14px; border: 1px solid #fecaca; border-radius: 13px; color: #b91c1c; background: #fef2f2; font-size: 13px; }
.overview-grid { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(280px, .8fr); gap: 16px; }
.status-card, .algorithm-card { min-width: 0; padding: 21px; }
.status-card { position: relative; overflow: hidden; border-left: 5px solid #64748b; }
.status-card::after { position: absolute; width: 90px; height: 90px; right: -30px; top: -35px; border-radius: 50%; background: #f1f5f9; content: ''; }
.status-card.success { border-left-color: #16a34a; }
.status-card.success::after { background: #dcfce7; }
.status-card.danger { border-left-color: #dc2626; }
.status-card.danger::after { background: #fee2e2; }
.status-card.warning { border-left-color: #d97706; }
.status-card.warning::after { background: #fef3c7; }
.status-card > strong { display: block; margin-top: 7px; color: var(--c-text-primary); font-size: 21px; }
.status-card p { margin: 3px 0 0; color: var(--c-text-secondary); font-size: 12px; }
.algorithm-card { display: grid; grid-template-columns: repeat(2, 1fr); align-items: center; gap: 10px; }
.algorithm-card > div { display: flex; flex-direction: column; padding: 11px; border-radius: 13px; background: var(--c-surface-subtle); }
.algorithm-card span { color: var(--c-text-muted); font-size: 10px; }
.algorithm-card strong { margin-top: 4px; color: var(--c-text-strong); font: 700 15px ui-monospace, monospace; }
.section-heading > span { color: var(--c-text-muted); font-size: 11px; }
.segments-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 17px; }
.segments-grid article { min-width: 0; padding: 14px; border: 1px solid var(--c-border); border-top-width: 4px; border-radius: 14px; background: var(--c-surface-subtle); }
.segments-grid article.rose { border-top-color: var(--rose); }
.segments-grid article.violet { border-top-color: var(--violet); }
.segments-grid article.cyan { border-top-color: var(--cyan); }
.segments-grid article > div { display: flex; flex-direction: column; }
.segments-grid strong { color: var(--c-text-strong); }
.segments-grid span, .segments-grid small { color: var(--c-text-muted); font-size: 10px; }
.segments-grid code { display: block; margin: 11px 0; color: var(--c-text-body); overflow: hidden; font: 11px ui-monospace, monospace; white-space: nowrap; }
.json-grid { display: grid; grid-template-columns: minmax(0, .72fr) minmax(0, 1.28fr); gap: 16px; }
.header-json { border-top: 4px solid var(--rose); }
.payload-json { border-top: 4px solid var(--violet); }
.json-card pre { min-height: 185px; max-height: 360px; margin: 17px 0 0; padding: 16px; border-radius: 15px; color: var(--c-text-strong); overflow: auto; background: var(--c-surface-subtle); font: 12px/1.65 ui-monospace, SFMono-Regular, Menlo, monospace; }
.claims-list { display: grid; gap: 8px; margin-top: 17px; }
.claims-list > div { display: grid; grid-template-columns: 52px 140px minmax(0, 1fr); align-items: center; gap: 12px; padding: 11px 13px; border: 1px solid var(--c-border); border-radius: 13px; background: var(--c-surface-subtle); }
.claims-list code { color: #7c3aed; font-weight: 800; }
.claims-list > div > div { display: flex; min-width: 0; flex-direction: column; }
.claims-list strong { color: var(--c-text-strong); overflow-wrap: anywhere; font-size: 12px; }
.claims-list small { color: var(--c-text-muted); font-size: 10px; }
.claim-value { text-align: right; }
.empty-claims { margin-top: 17px; padding: 20px; border-radius: 14px; color: var(--c-text-muted); background: var(--c-surface-subtle); text-align: center; }

:global(html.dark .jwt-page .security-banner), :global(html.dark .jwt-page .decoder-card), :global(html.dark .jwt-page .segments-card), :global(html.dark .jwt-page .json-card), :global(html.dark .jwt-page .claims-card), :global(html.dark .jwt-page .status-card), :global(html.dark .jwt-page .algorithm-card) { border-color: var(--c-border); color: var(--c-text-primary); background: var(--c-surface); box-shadow: none; }
:global(html.dark .jwt-page .security-banner) { border-color: #78350f; color: #fde68a; background: #422006; }
:global(html.dark .jwt-page h2), :global(html.dark .jwt-page h3), :global(html.dark .jwt-page .status-card > strong), :global(html.dark .jwt-page .segments-grid strong), :global(html.dark .jwt-page .claims-list strong) { color: #f8fafc; }
:global(html.dark .jwt-page .decoder-card .el-textarea__inner), :global(html.dark .jwt-page .algorithm-card > div), :global(html.dark .jwt-page .segments-grid article), :global(html.dark .jwt-page .json-card pre), :global(html.dark .jwt-page .claims-list > div), :global(html.dark .jwt-page .empty-claims) { border-color: var(--c-border); color: var(--c-text-secondary); background: var(--c-surface-subtle); }
:global(html.dark .jwt-page .error-box) { border-color: #7f1d1d; color: #fca5a5; background: #450a0a; }
:global(html.dark .jwt-page .status-card::after) { opacity: .15; }
:global(html.dark .jwt-page .status-card.success) { border-left-color: #22c55e; }
:global(html.dark .jwt-page .status-card.danger) { border-left-color: #ef4444; }
:global(html.dark .jwt-page .status-card.warning) { border-left-color: #f59e0b; }
:global(html.dark .jwt-page .algorithm-card strong) { color: var(--c-text-primary); }
:global(html.dark .jwt-page .segments-grid code), :global(html.dark .jwt-page .segments-grid span), :global(html.dark .jwt-page .segments-grid small) { color: var(--c-text-muted); }

@media (max-width: 800px) {
  .overview-grid, .json-grid { grid-template-columns: 1fr; }
  .segments-grid { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .decoder-card, .segments-card, .json-card, .claims-card { padding: 18px; border-radius: 19px; }
  .card-heading { align-items: flex-start; flex-direction: column; }
  .overview-grid { grid-template-columns: 1fr; }
  .algorithm-card { min-width: 0; }
  .claims-list > div { grid-template-columns: 45px minmax(0, 1fr); }
  .claim-value { grid-column: 1 / -1; text-align: left; }
}
</style>
