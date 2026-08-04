<script setup lang="ts">
import { computed, ref } from 'vue'
import CodeWorkbench from '@/components/Tools/CodeWorkbench/CodeWorkbench.vue'
import { analyzeMarkup, formatMarkup, getCompressionReport, minifyMarkup } from '@/utils/codeWorkbench'

type MarkupMode = 'html' | 'xml'

const samples = [
  { label: '语义页面', note: 'HTML5', value: '<!doctype html>\n<html lang="zh-CN">\n<head><meta charset="UTF-8"><title>工具箱</title></head>\n<body><main><h1>欢迎使用</h1><p>在浏览器中安全处理代码。</p></main></body>\n</html>', format: 'html' as MarkupMode },
  { label: '登录表单', note: 'Form', value: '<section class="login"><h2>登录</h2><form><label>邮箱<input type="email" required></label><button type="submit">继续</button></form></section>', format: 'html' as MarkupMode },
  { label: 'RSS Feed', note: 'XML', value: '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>更新日志</title><item><title>版本 2.0</title><link>https://example.com/v2</link></item></channel></rss>', format: 'xml' as MarkupMode },
]

const code = ref(samples[0].value)
const documentMode = ref<MarkupMode>('html')
const tabSize = ref(2)
const preserveComments = ref(true)
const previousCode = ref('')
const actionMessage = ref('示例已载入，可检查结构或保守压缩')
const statusTone = ref<'idle' | 'success' | 'error' | 'working'>('success')
const errorDetail = ref('')
const compression = ref({ saved: 0, percent: 0 })
const analysis = computed(() => analyzeMarkup(code.value))
const metrics = computed(() => [
  { label: '标签', value: analysis.value.tags },
  { label: '注释', value: analysis.value.comments },
  { label: '脚本 / 样式', value: `${analysis.value.scripts} / ${analysis.value.styles}` },
  { label: '压缩节省', value: compression.value.saved ? `${compression.value.saved} B · ${compression.value.percent}%` : '—' },
])
const tips = [
  { title: '保守处理文本空白', description: '压缩会把普通文本中的连续空白折叠为一个空格，不会粗暴移除所有标签间隔。' },
  { title: '保护敏感内容块', description: 'pre、textarea、script 和 style 内部内容按原样保留，避免代码或预格式文本被改写。' },
  { title: 'XML 使用严格校验', description: '切换到 XML 后会在处理前检查闭合、嵌套与根节点，错误会直接显示在设置区。' },
]

function checkpoint() {
  if (previousCode.value !== code.value) previousCode.value = code.value
}

function validateDocument() {
  errorDetail.value = ''
  if (!code.value.trim()) {
    statusTone.value = 'idle'
    actionMessage.value = '等待标记内容'
    return false
  }
  if (documentMode.value === 'xml') {
    const parsed = new DOMParser().parseFromString(code.value, 'application/xml')
    const error = parsed.querySelector('parsererror')?.textContent?.replace(/\s+/g, ' ').trim()
    if (error) {
      statusTone.value = 'error'
      actionMessage.value = 'XML 结构错误'
      errorDetail.value = error
      return false
    }
  }
  statusTone.value = 'success'
  actionMessage.value = documentMode.value === 'xml' ? 'XML 结构校验通过' : 'HTML 已由浏览器容错解析'
  return true
}

function formatCode() {
  if (!validateDocument()) return
  checkpoint()
  code.value = formatMarkup(code.value, tabSize.value)
  actionMessage.value = `${documentMode.value.toUpperCase()} 格式化完成`
  compression.value = { saved: 0, percent: 0 }
}

function minifyCode() {
  if (!validateDocument()) return
  checkpoint()
  const before = code.value
  code.value = minifyMarkup(code.value, preserveComments.value)
  compression.value = getCompressionReport(before, code.value)
  actionMessage.value = `保守压缩完成，节省 ${compression.value.saved} Bytes`
}

function restore() {
  if (!previousCode.value) return
  const current = code.value
  code.value = previousCode.value
  previousCode.value = current
  compression.value = { saved: 0, percent: 0 }
  statusTone.value = 'success'
  actionMessage.value = '已恢复上一步内容'
}

function clear() {
  checkpoint()
  code.value = ''
  compression.value = { saved: 0, percent: 0 }
  statusTone.value = 'idle'
  actionMessage.value = '等待标记内容'
  errorDetail.value = ''
}

function loadSample(sample: { label: string; note: string; value: string }) {
  const selected = samples.find(item => item.label === sample.label)
  checkpoint()
  code.value = sample.value
  documentMode.value = selected?.format ?? 'html'
  compression.value = { saved: 0, percent: 0 }
  statusTone.value = 'success'
  actionMessage.value = `${sample.note} 示例已载入`
  errorDetail.value = ''
}
</script>

<template>
  <CodeWorkbench
    v-model="code"
    eyebrow="MARKUP STRUCTURE LAB"
    headline="整理标记，也保护页面语义"
    :language="documentMode === 'html' ? 'HTML5' : 'XML 1.0'"
    :mode="documentMode"
    accent="orange"
    :status="actionMessage"
    :status-tone="statusTone"
    :status-detail="errorDetail ? '请查看右侧诊断' : ''"
    :samples="samples"
    :metrics="metrics"
    :tips="tips"
    :tab-size="tabSize"
    primary-label="格式化标记"
    secondary-label="保守压缩"
    :can-restore="Boolean(previousCode)"
    :filename="documentMode === 'html' ? 'document.html' : 'document.xml'"
    @primary="formatCode"
    @secondary="minifyCode"
    @restore="restore"
    @clear="clear"
    @sample="loadSample"
  >
    <template #options>
      <label class="option-field"><span>文档类型</span><el-radio-group v-model="documentMode"><el-radio-button value="html">HTML</el-radio-button><el-radio-button value="xml">XML</el-radio-button></el-radio-group></label>
      <label class="option-field"><span>缩进宽度</span><el-input-number v-model="tabSize" :min="2" :max="8" /></label>
      <label class="switch-field"><span>压缩时保留注释</span><el-switch v-model="preserveComments" /></label>
      <div :class="['notice-card', { error: errorDetail }]">{{ errorDetail || (documentMode === 'html' ? 'HTML 解析采用浏览器容错规则；若需要严格的闭合与嵌套校验，请切换到 XML。' : 'XML 模式会严格检查根节点、标签闭合和嵌套关系。') }}</div>
    </template>
    <template #usage><el-text>格式化会先分词识别标签、文本和受保护内容块，再按层级与所选宽度缩进。保守压缩只折叠可安全处理的连续空白，可选择移除普通注释；pre、textarea、script、style 以及条件注释会保持原样。XML 模式会在转换前执行严格结构校验。</el-text></template>
  </CodeWorkbench>
</template>
