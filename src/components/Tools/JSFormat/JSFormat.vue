<script setup lang="ts">
import { computed, ref } from 'vue'
import CodeWorkbench from '@/components/Tools/CodeWorkbench/CodeWorkbench.vue'
import { analyzeJavaScript, getCompressionReport } from '@/utils/codeWorkbench'

interface TerserError extends Error {
  line?: number
  col?: number
}

const samples = [
  { label: '数据聚合', note: 'ES2020', value: 'const orders = [{ total: 128, status: "paid" }, { total: 76, status: "pending" }, { total: 215, status: "paid" }];\n\nfunction summarize(items) {\n  return items.filter(({ status }) => status === "paid").reduce((sum, { total }) => sum + total, 0);\n}\n\nconsole.log(`Revenue: ${summarize(orders)}`);' },
  { label: '异步请求', note: 'Async / Await', value: 'async function loadProfile(userId) {\n  const response = await fetch(`/api/users/${userId}`);\n  if (!response.ok) throw new Error(`HTTP ${response.status}`);\n  return response.json();\n}\n\nloadProfile(42).then(profile => console.log(profile));' },
  { label: 'ES Module', note: 'Import / Export', value: 'import { format } from "./date.js";\n\nexport function createGreeting(name, now = new Date()) {\n  const safeName = name?.trim() || "Guest";\n  return `Hello ${safeName}, today is ${format(now)}`;\n}' },
]

const code = ref(samples[0].value)
const tabSize = ref(2)
const ecma = ref<2015 | 2018 | 2020>(2020)
const compressEnabled = ref(true)
const mangle = ref(true)
const dropConsole = ref(false)
const moduleMode = ref(false)
const preserveLicense = ref(true)
const previousCode = ref('')
const busy = ref(false)
const actionMessage = ref('示例已载入，可格式化或生成发布版本')
const statusTone = ref<'idle' | 'success' | 'error' | 'working'>('success')
const errorDetail = ref('')
const compression = ref({ saved: 0, percent: 0 })
const analysis = computed(() => analyzeJavaScript(code.value))
const metrics = computed(() => [
  { label: '函数', value: analysis.value.functions },
  { label: '导入 / 导出', value: `${analysis.value.imports} / ${analysis.value.exports}` },
  { label: 'Console 调用', value: analysis.value.consoleCalls },
  { label: '注释', value: analysis.value.comments },
  { label: '体积减少', value: compression.value.saved ? `${compression.value.saved} B · ${compression.value.percent}%` : '—' },
])
const tips = [
  { title: '变量改名不是加密', description: 'Mangle 只缩短局部标识符，不能保护密钥、业务规则或其他敏感代码。' },
  { title: '删除 Console 需谨慎', description: '开启后包括 console.error 在内的调用都可能被移除，不适合依赖日志副作用的代码。' },
  { title: '模块模式影响解析', description: '含 import / export 或顶层 await 的代码应开启 ES Module，普通脚本保持关闭。' },
]

function checkpoint() {
  if (previousCode.value !== code.value) previousCode.value = code.value
}

function setTerserError(error: unknown) {
  const terserError = error as TerserError
  const location = terserError.line ? `第 ${terserError.line} 行${typeof terserError.col === 'number' ? ` · 第 ${terserError.col + 1} 列` : ''}` : ''
  statusTone.value = 'error'
  actionMessage.value = 'JavaScript 语法或选项错误'
  errorDetail.value = `${terserError.message || '处理失败'}${location ? `（${location}）` : ''}`
}

async function formatCode() {
  if (!code.value.trim()) return
  busy.value = true
  statusTone.value = 'working'
  actionMessage.value = '正在解析并格式化 JavaScript…'
  errorDetail.value = ''
  try {
    const { minify } = await import('terser')
    const result = await minify(code.value, {
      ecma: ecma.value,
      module: moduleMode.value,
      compress: false,
      mangle: false,
      format: { beautify: true, indent_level: tabSize.value, comments: 'all' },
    })
    if (result.code == null) throw new Error('格式化器没有返回代码')
    checkpoint()
    code.value = result.code
    compression.value = { saved: 0, percent: 0 }
    statusTone.value = 'success'
    actionMessage.value = '语法校验与格式化完成'
  } catch (error) {
    setTerserError(error)
  } finally {
    busy.value = false
  }
}

async function minifyCode() {
  if (!code.value.trim()) return
  busy.value = true
  statusTone.value = 'working'
  actionMessage.value = '正在生成压缩版本…'
  errorDetail.value = ''
  try {
    const { minify } = await import('terser')
    const before = code.value
    const result = await minify(code.value, {
      ecma: ecma.value,
      module: moduleMode.value,
      compress: compressEnabled.value ? { drop_console: dropConsole.value, passes: 2 } : false,
      mangle: mangle.value ? { toplevel: moduleMode.value } : false,
      format: { comments: preserveLicense.value ? /^!/ : false },
    })
    if (result.code == null) throw new Error('压缩器没有返回代码')
    checkpoint()
    code.value = result.code
    compression.value = getCompressionReport(before, code.value)
    statusTone.value = 'success'
    actionMessage.value = `发布版本已生成，体积减少 ${compression.value.percent}%`
  } catch (error) {
    setTerserError(error)
  } finally {
    busy.value = false
  }
}

function restore() {
  if (!previousCode.value) return
  const current = code.value
  code.value = previousCode.value
  previousCode.value = current
  compression.value = { saved: 0, percent: 0 }
  statusTone.value = 'success'
  actionMessage.value = '已恢复上一步内容'
  errorDetail.value = ''
}

function clear() {
  checkpoint()
  code.value = ''
  compression.value = { saved: 0, percent: 0 }
  statusTone.value = 'idle'
  actionMessage.value = '等待 JavaScript 内容'
  errorDetail.value = ''
}

function loadSample(sample: { value: string; label: string }) {
  checkpoint()
  code.value = sample.value
  moduleMode.value = sample.label === 'ES Module'
  compression.value = { saved: 0, percent: 0 }
  statusTone.value = 'success'
  actionMessage.value = `${sample.label} 示例已载入`
  errorDetail.value = ''
}
</script>

<template>
  <CodeWorkbench
    v-model="code"
    page-title="JavaScript 格式化与压缩"
    eyebrow="JAVASCRIPT BUILD LAB"
    headline="先验证代码，再决定压缩强度"
    description="格式化和发布压缩都由 Terser 解析，目标语法、模块模式、变量改名和 Console 策略由你明确控制。"
    language="JavaScript"
    mode="javascript"
    accent="violet"
    :status="actionMessage"
    :status-tone="statusTone"
    :status-detail="errorDetail ? '请查看右侧诊断' : `ECMAScript ${ecma}`"
    :samples="samples"
    :metrics="metrics"
    :tips="tips"
    :tab-size="tabSize"
    :busy="busy"
    primary-label="校验并格式化"
    secondary-label="生成压缩版本"
    :can-restore="Boolean(previousCode)"
    filename="script.js"
    @primary="formatCode"
    @secondary="minifyCode"
    @restore="restore"
    @clear="clear"
    @sample="loadSample"
  >
    <template #options>
      <label class="option-field"><span>目标语法</span><el-select v-model="ecma"><el-option label="ES2015" :value="2015" /><el-option label="ES2018" :value="2018" /><el-option label="ES2020" :value="2020" /></el-select></label>
      <label class="option-field"><span>格式化缩进</span><el-input-number v-model="tabSize" :min="2" :max="8" /></label>
      <label class="switch-field"><span>ES Module 模式</span><el-switch v-model="moduleMode" /></label>
      <label class="switch-field"><span>启用压缩优化</span><el-switch v-model="compressEnabled" /></label>
      <label class="switch-field"><span>缩短变量名（Mangle）</span><el-switch v-model="mangle" /></label>
      <label class="switch-field"><span>移除 Console 调用</span><el-switch v-model="dropConsole" :disabled="!compressEnabled" /></label>
      <label class="switch-field"><span>保留 /*! 许可证注释 */</span><el-switch v-model="preserveLicense" /></label>
      <div :class="['notice-card', { error: errorDetail }]">{{ errorDetail || (mangle ? '变量改名已开启。导出的代码更小，但堆栈和调试可读性会下降。' : '变量名保持不变，适合需要可读堆栈或对外暴露函数名的场景。') }}</div>
    </template>
    <template #usage><el-text>格式化与压缩均使用 Terser 完整解析 JavaScript，因此语法错误会附带行列位置。压缩优化、变量改名、Console 移除和模块模式相互独立；“变量改名”不是加密，也不能保护前端代码中的敏感信息。每次转换前都会保存可撤回快照。</el-text></template>
  </CodeWorkbench>
</template>
