<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CopyDocument, DocumentChecked, Key, MagicStick, WarningFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { Md5 } from 'ts-md5'
import CryptoJS from 'crypto-js'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import SectionHeading from '@/components/Common/SectionHeading.vue'
import { copy } from '@/utils/string'

type OutputFormat = 'hex' | 'base64'

const inputText = ref('Hello, tools-web!')
const algorithm = ref('SHA-256')
const hmacKey = ref('')
const hashHex = ref('')
const calculationError = ref('')
const calculating = ref(false)
const outputFormat = ref<OutputFormat>('hex')
const uppercase = ref(false)
let calculationVersion = 0

const algorithmGroups = [
  {
    label: '摘要算法',
    options: [
      { label: 'MD5', value: 'MD5', bits: 128 },
      { label: 'SHA-1', value: 'SHA-1', bits: 160 },
      { label: 'SHA-256', value: 'SHA-256', bits: 256 },
      { label: 'SHA-384', value: 'SHA-384', bits: 384 },
      { label: 'SHA-512', value: 'SHA-512', bits: 512 },
    ],
  },
  {
    label: '带密钥 HMAC',
    options: [
      { label: 'HMAC-MD5', value: 'HMAC-MD5', bits: 128 },
      { label: 'HMAC-SHA1', value: 'HMAC-SHA1', bits: 160 },
      { label: 'HMAC-SHA256', value: 'HMAC-SHA256', bits: 256 },
      { label: 'HMAC-SHA512', value: 'HMAC-SHA512', bits: 512 },
    ],
  },
]

const examples = [
  { label: '英文短句', value: 'Hello, tools-web!' },
  { label: '中文文本', value: '在线工具箱' },
  { label: 'JSON 数据', value: '{"name":"tools-web","version":1}' },
]

const flatAlgorithms = algorithmGroups.flatMap(group => group.options)
const currentAlgorithm = computed(() => flatAlgorithms.find(item => item.value === algorithm.value) ?? flatAlgorithms[0])
const isHmac = computed(() => algorithm.value.startsWith('HMAC-'))
const inputBytes = computed(() => new TextEncoder().encode(inputText.value).length)
const algorithmType = computed(() => isHmac.value ? '消息认证码' : '消息摘要')

function hexFromBuffer(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer)).map(byte => byte.toString(16).padStart(2, '0')).join('')
}

function hexToBase64(hex: string) {
  let binary = ''
  for (let index = 0; index < hex.length; index += 2) {
    binary += String.fromCharCode(Number.parseInt(hex.slice(index, index + 2), 16))
  }
  return btoa(binary)
}

const displayResult = computed(() => {
  if (!hashHex.value) return ''
  if (outputFormat.value === 'base64') return hexToBase64(hashHex.value)
  return uppercase.value ? hashHex.value.toUpperCase() : hashHex.value
})

async function calculateHash() {
  const version = ++calculationVersion
  hashHex.value = ''
  calculationError.value = ''

  if (!inputText.value) return
  if (isHmac.value && !hmacKey.value) return

  calculating.value = true
  try {
    const algo = algorithm.value
    let nextResult = ''
    if (algo === 'MD5') {
      nextResult = Md5.hashStr(inputText.value)
    } else if (algo === 'HMAC-MD5') {
      nextResult = CryptoJS.HmacMD5(inputText.value, hmacKey.value).toString()
    } else if (algo.startsWith('HMAC-')) {
      const shaMap: Record<string, string> = {
        'HMAC-SHA1': 'SHA-1',
        'HMAC-SHA256': 'SHA-256',
        'HMAC-SHA512': 'SHA-512',
      }
      const encoder = new TextEncoder()
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(hmacKey.value),
        { name: 'HMAC', hash: shaMap[algo] },
        false,
        ['sign'],
      )
      nextResult = hexFromBuffer(await crypto.subtle.sign('HMAC', key, encoder.encode(inputText.value)))
    } else {
      nextResult = hexFromBuffer(await crypto.subtle.digest(algo, new TextEncoder().encode(inputText.value)))
    }
    if (version === calculationVersion) hashHex.value = nextResult
  } catch (error) {
    if (version === calculationVersion) {
      calculationError.value = error instanceof Error ? error.message : '计算失败，请检查输入'
    }
  } finally {
    if (version === calculationVersion) calculating.value = false
  }
}

watch([inputText, algorithm, hmacKey], calculateHash, { immediate: true })

function useExample(value: string) {
  inputText.value = value
}

function copyResult() {
  if (!displayResult.value) {
    ElMessage.warning(isHmac.value && !hmacKey.value ? '请先输入 HMAC 密钥' : '没有可复制的结果')
    return
  }
  copy(displayResult.value)
}
</script>

<template>
  <div class="hash-page flex flex-col mt-3 flex-1">
    <ToolHero />

    <section class="workspace-card">
      <div class="workspace-grid">
        <div class="input-column">
          <SectionHeading :icon="MagicStick" title="输入与算法" description="内容变化后自动重新计算，无需手动提交" tone="violet" />

          <label class="field-block">
            <span>待计算文本</span>
            <el-input v-model="inputText" type="textarea" :rows="8" resize="none" placeholder="输入任意文本" />
            <small>{{ inputText.length }} 字符 · {{ inputBytes }} Bytes（UTF-8）</small>
          </label>

          <div class="example-row">
            <span>快速填充</span>
            <button v-for="item in examples" :key="item.label" type="button" @click="useExample(item.value)">
              {{ item.label }}
            </button>
          </div>
        </div>

        <aside class="settings-panel">
          <div class="settings-title">
            <el-icon><Key /></el-icon>
            <strong>计算设置</strong>
          </div>

          <label class="field-block compact">
            <span>Hash 算法</span>
            <el-select v-model="algorithm" size="large">
              <el-option-group v-for="group in algorithmGroups" :key="group.label" :label="group.label">
                <el-option v-for="item in group.options" :key="item.value" :label="item.label" :value="item.value" />
              </el-option-group>
            </el-select>
          </label>

          <label v-if="isHmac" class="field-block compact hmac-field">
            <span>HMAC 密钥</span>
            <el-input v-model="hmacKey" type="password" show-password size="large" placeholder="输入签名密钥" />
            <small>密钥仅在当前浏览器内存中参与计算</small>
          </label>

          <label class="field-block compact">
            <span>输出格式</span>
            <el-radio-group v-model="outputFormat">
              <el-radio-button value="hex">Hex</el-radio-button>
              <el-radio-button value="base64">Base64</el-radio-button>
            </el-radio-group>
          </label>

          <el-checkbox v-if="outputFormat === 'hex'" v-model="uppercase">使用大写字母 A–F</el-checkbox>

          <div class="algorithm-facts">
            <div><span>类型</span><strong>{{ algorithmType }}</strong></div>
            <div><span>摘要长度</span><strong>{{ currentAlgorithm.bits }} bit</strong></div>
          </div>
        </aside>
      </div>
    </section>

    <section class="result-card">
      <div class="result-header">
        <SectionHeading :icon="DocumentChecked" :title="(algorithm) + ' 结果'" :description="outputFormat === 'hex' ? '十六进制摘要' : 'Base64 摘要'" tone="green" />
        <el-button type="primary" :icon="CopyDocument" :disabled="!displayResult" @click="copyResult">复制结果</el-button>
      </div>

      <div v-if="displayResult" class="hash-output">{{ displayResult }}</div>
      <div v-else class="result-empty" :class="{ error: calculationError }">
        <el-icon v-if="calculationError"><WarningFilled /></el-icon>
        <el-icon v-else><Key /></el-icon>
        <span v-if="calculating">正在计算…</span>
        <span v-else-if="calculationError">{{ calculationError }}</span>
        <span v-else-if="isHmac && !hmacKey">输入 HMAC 密钥后生成结果</span>
        <span v-else>输入文本后生成结果</span>
      </div>

      <div class="security-note" :class="{ warning: algorithm === 'MD5' || algorithm === 'SHA-1' }">
        <el-icon><WarningFilled /></el-icon>
        <span v-if="algorithm === 'MD5' || algorithm === 'SHA-1'">
          {{ algorithm }} 已不适合密码存储、证书签名等安全用途，仅建议用于兼容校验。
        </span>
        <span v-else>Hash 不是加密，结果不可逆；密码存储应使用专门的慢哈希算法与随机盐。</span>
      </div>
    </section>

    <ToolGuide title="使用说明">
      <div class="detail-grid">
        <div>
          <h4>普通 Hash</h4>
          <p>适合做内容指纹、完整性校验与数据比对。相同输入和算法始终得到相同摘要。</p>
        </div>
        <div>
          <h4>HMAC</h4>
          <p>在摘要中加入共享密钥，可用于 API 请求签名和消息真实性校验，密钥双方需妥善保管。</p>
        </div>
        <div>
          <h4>本地处理</h4>
          <p>文本和密钥都只在浏览器中计算，不会发送到服务器；关闭或刷新页面后不会保留。</p>
        </div>
      </div>
    </ToolGuide>
  </div>
</template>

<style scoped>
.hash-page {
  gap: 18px;
}

.workspace-card {padding: 24px;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.05);}

.workspace-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(280px, 0.75fr);
  gap: 22px;
}

.settings-title, .result-header, .example-row, .security-note {display: flex;
  align-items: center;}



.field-block {
  display: block;
  margin-top: 20px;
}

.field-block > span,
.field-block > small {
  display: block;
}

.field-block > span {
  margin-bottom: 8px;
  color: #334155;
  font-size: 13px;
  font-weight: 650;
}

.field-block > small {
  margin-top: 7px;
  color: #94a3b8;
  font-size: 11px;
}

.field-block :deep(.el-textarea__inner) {
  min-height: 205px !important;
  border-radius: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  line-height: 1.65;
}

.example-row {
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 13px;
}

.example-row > span {
  color: #64748b;
  font-size: 12px;
}

.example-row button {
  padding: 6px 10px;
  border: 1px solid #e9d5ff;
  border-radius: 999px;
  color: #7c3aed;
  background: #faf5ff;
  font-size: 12px;
  cursor: pointer;
}

.example-row button:hover {
  border-color: #c084fc;
  background: #f3e8ff;
}

.settings-panel {
  padding: 18px;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #f8fafc;
}

.settings-title {
  gap: 8px;
  color: #1e293b;
}

.settings-title .el-icon {
  color: #7c3aed;
  font-size: 18px;
}

.field-block.compact {
  margin-top: 18px;
}

.field-block.compact :deep(.el-select),
.field-block.compact :deep(.el-input),
.field-block.compact :deep(.el-radio-group) {
  width: 100%;
}

.field-block.compact :deep(.el-radio-button) {
  flex: 1;
}

.field-block.compact :deep(.el-radio-button__inner) {
  width: 100%;
}

.hmac-field {
  padding: 14px;
  border: 1px solid #ddd6fe;
  border-radius: 12px;
  background: #f5f3ff;
}

.algorithm-facts {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-top: 18px;
}

.algorithm-facts div {
  padding: 10px;
  border-radius: 10px;
  background: #fff;
}

.algorithm-facts span,
.algorithm-facts strong {
  display: block;
}

.algorithm-facts span {
  color: #94a3b8;
  font-size: 11px;
}

.algorithm-facts strong {
  margin-top: 3px;
  color: #334155;
  font-size: 13px;
}

.result-header {
  justify-content: space-between;
  gap: 16px;
}

.hash-output {
  margin-top: 20px;
  padding: 24px;
  border: 1px solid #bbf7d0;
  border-radius: 16px;
  color: #065f46;
  background: linear-gradient(135deg, #f0fdf4, #ecfdf5);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: clamp(15px, 2vw, 20px);
  font-weight: 650;
  letter-spacing: 0.04em;
  line-height: 1.8;
  overflow-wrap: anywhere;
}

.result-empty {
  display: flex;
  min-height: 110px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 20px;
  border: 1px dashed #cbd5e1;
  border-radius: 16px;
  color: #94a3b8;
  background: #f8fafc;
}

.result-empty.error {
  border-color: #fecaca;
  color: #dc2626;
  background: #fff7f7;
}

.security-note {
  gap: 8px;
  margin-top: 14px;
  padding: 10px 13px;
  border-radius: 11px;
  color: #475569;
  background: #f1f5f9;
  font-size: 12px;
  line-height: 1.55;
}

.security-note.warning {
  color: #9a3412;
  background: #fff7ed;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 22px;
}

.detail-grid h4 {
  margin: 0 0 6px;
  color: #1e293b;
}

.detail-grid p {
  margin: 0;
  color: #64748b;
  line-height: 1.7;
}

:global(html.dark .hash-page .workspace-card),
:global(html.dark .hash-page .result-card) {
  border-color: #334155;
  background: #0f172a;
  box-shadow: none;
}

:global(html.dark .hash-page .section-heading h2),
:global(html.dark .hash-page .settings-title),
:global(html.dark .hash-page .field-block > span),
:global(html.dark .hash-page .detail-grid h4) {
  color: #f1f5f9;
}

:global(html.dark .hash-page .settings-panel) {
  border-color: #334155;
  background: #111c2f;
}

:global(html.dark .hash-page .hmac-field) {
  border-color: #4c1d95;
  background: #22143d;
}

:global(html.dark .hash-page .algorithm-facts div) {
  background: #0b1324;
}

:global(html.dark .hash-page .algorithm-facts strong) {
  color: #e2e8f0;
}

:global(html.dark .hash-page .hash-output) {
  border-color: #14532d;
  color: #6ee7b7;
  background: linear-gradient(135deg, #082f2a, #052e24);
}

:global(html.dark .hash-page .result-empty),
:global(html.dark .hash-page .security-note) {
  border-color: #334155;
  color: #94a3b8;
  background: #111c2f;
}

:global(html.dark .hash-page .security-note.warning) {
  color: #fdba74;
  background: #3b1f0d;
}@media (max-width: 900px) {
  .workspace-grid {
    grid-template-columns: 1fr;
  }}@media (max-width: 640px) {
  .workspace-card,
  .result-card {
    padding: 18px;
    border-radius: 16px;
  }

  .result-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .result-header :deep(.el-button) {
    width: 100%;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }}</style>
