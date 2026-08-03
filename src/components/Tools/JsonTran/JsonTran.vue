<script setup lang="ts">
import { computed, ref } from 'vue'
import CodeWorkbench from '@/components/Tools/CodeWorkbench/CodeWorkbench.vue'
import { analyzeJson, escapeJsonString, formatJsonDocument, getCodeMetrics, minifyJsonDocument, unescapeJsonString } from '@/utils/codeWorkbench'

type OperationMode = 'document' | 'string'

const samples = [
  { label: 'API 响应', note: '嵌套对象', value: '{"ok":true,"data":{"users":[{"id":1,"name":"Ada"},{"id":2,"name":"Lin"}]},"meta":{"page":1,"total":2}}' },
  { label: '配置文件', note: '数组与布尔值', value: '{"theme":"dark","features":["search","export"],"limits":{"retries":3,"cache":false}}' },
  { label: 'Unicode', note: '中文与 Emoji', value: '{"message":"你好，JSON 👋","path":"C:\\\\Users\\\\demo","enabled":true}' },
]

const code = ref(samples[0].value)
const operationMode = ref<OperationMode>('document')
const indent = ref<2 | 4 | 'tab'>(2)
const sortKeys = ref(false)
const previousCode = ref('')
const actionMessage = ref('示例已载入，可直接格式化或压缩')
const analysis = computed(() => analyzeJson(code.value))
const baseMetrics = computed(() => getCodeMetrics(code.value))
const escapeCount = computed(() => (code.value.match(/\\(?:["\\/bfnrt]|u[\da-f]{4})/gi) ?? []).length)
const status = computed(() => {
  if (operationMode.value === 'string') return actionMessage.value || '字符串转义模式'
  if (!code.value.trim()) return '等待 JSON 内容'
  return analysis.value.valid ? actionMessage.value || 'JSON 语法有效' : 'JSON 语法错误'
})
const statusTone = computed(() => operationMode.value === 'string' ? 'idle' : !code.value.trim() ? 'idle' : analysis.value.valid ? 'success' : 'error')
const statusDetail = computed(() => operationMode.value === 'document' && !analysis.value.valid && analysis.value.line ? `第 ${analysis.value.line} 行 · 第 ${analysis.value.column} 列` : operationMode.value === 'string' ? `${escapeCount.value} 个转义序列` : '')
const metrics = computed(() => operationMode.value === 'document' ? [
  { label: '根类型', value: analysis.value.rootType },
  { label: '顶层成员', value: analysis.value.valid ? analysis.value.entries : '—' },
  { label: '嵌套深度', value: analysis.value.valid ? analysis.value.depth : '—' },
  { label: '语法状态', value: analysis.value.valid ? '有效' : '待修正' },
] : [
  { label: '字符', value: baseMetrics.value.characters },
  { label: '字节', value: baseMetrics.value.bytes },
  { label: '转义序列', value: escapeCount.value },
  { label: '处理模式', value: 'JSON String' },
])

const tips = [
  { title: '先解析再压缩', description: '压缩通过 JSON.parse 与 JSON.stringify 完成，不会删除字符串内部的换行或制表符。' },
  { title: '转义不是格式化', description: '字符串模式用于日志、代码字面量或接口参数；它不会把普通文本变成 JSON 对象。' },
  { title: '排序会改变顺序', description: '递归排序键便于比较配置文件，但可能改变依赖原始键顺序的展示结果。' },
]

function checkpoint() {
  if (previousCode.value !== code.value) previousCode.value = code.value
}

function runPrimary() {
  if (!code.value && operationMode.value === 'document') return
  try {
    if (operationMode.value === 'document') {
      const result = formatJsonDocument(code.value, indent.value === 'tab' ? '\t' : indent.value, sortKeys.value)
      checkpoint()
      code.value = result
      actionMessage.value = sortKeys.value ? '格式化完成，键名已递归排序' : '格式化与语法校验完成'
    } else {
      const result = escapeJsonString(code.value)
      checkpoint()
      code.value = result
      actionMessage.value = '字符串已按 JSON 规则转义'
    }
  } catch (error) {
    actionMessage.value = error instanceof Error ? error.message : '处理失败'
  }
}

function runSecondary() {
  if (!code.value) return
  try {
    if (operationMode.value === 'document') {
      const result = minifyJsonDocument(code.value)
      checkpoint()
      code.value = result
      actionMessage.value = '安全压缩完成，字符串内容保持不变'
    } else {
      const result = unescapeJsonString(code.value)
      checkpoint()
      code.value = result
      actionMessage.value = 'JSON 字符串转义已解码'
    }
  } catch (error) {
    actionMessage.value = error instanceof Error ? error.message : '处理失败'
  }
}

function restore() {
  if (!previousCode.value) return
  const current = code.value
  code.value = previousCode.value
  previousCode.value = current
  actionMessage.value = '已恢复上一步内容'
}

function clear() {
  checkpoint()
  code.value = ''
  actionMessage.value = ''
}

function loadSample(sample: { value: string }) {
  checkpoint()
  operationMode.value = 'document'
  code.value = sample.value
  actionMessage.value = '示例已载入'
}
</script>

<template>
  <CodeWorkbench
    v-model="code"
    page-title="JSON 工作台"
    eyebrow="JSON DOCUMENT LAB"
    headline="看清结构，也看得见错误位置"
    description="安全格式化、压缩、递归排序和字符串转义分开处理，避免一个按钮悄悄破坏数据。"
    language="JSON"
    mode="json"
    accent="orange"
    :status="status"
    :status-tone="statusTone"
    :status-detail="statusDetail"
    :samples="samples"
    :metrics="metrics"
    :tips="tips"
    :primary-label="operationMode === 'document' ? '格式化 JSON' : '转义字符串'"
    :secondary-label="operationMode === 'document' ? '安全压缩' : '解码字符串'"
    :can-restore="Boolean(previousCode)"
    :tab-size="indent === 'tab' ? 2 : indent"
    filename="document.json"
    @primary="runPrimary"
    @secondary="runSecondary"
    @restore="restore"
    @clear="clear"
    @sample="loadSample"
  >
    <template #options>
      <label class="option-field"><span>处理模式</span><el-radio-group v-model="operationMode"><el-radio-button value="document">JSON 文档</el-radio-button><el-radio-button value="string">字符串转义</el-radio-button></el-radio-group></label>
      <template v-if="operationMode === 'document'">
        <label class="option-field"><span>缩进方式</span><el-select v-model="indent"><el-option label="2 个空格" :value="2" /><el-option label="4 个空格" :value="4" /><el-option label="Tab" value="tab" /></el-select></label>
        <label class="switch-field"><span>递归按键名排序</span><el-switch v-model="sortKeys" /></label>
      </template>
      <div v-if="operationMode === 'document' && !analysis.valid && code.trim()" class="notice-card error"><strong>定位建议</strong><br>{{ analysis.error }}</div>
      <div v-else class="notice-card">{{ operationMode === 'document' ? '所有解析与转换都在当前浏览器中完成；格式化前会先验证完整 JSON。' : '输入普通文本可生成 JSON 安全转义；输入合法的转义内容可恢复原始字符串。' }}</div>
    </template>
    <template #usage><el-text>JSON 文档模式会先完整解析输入，再执行格式化、压缩或键名排序，因此字符串中的空格、换行和反斜杠不会被误删。字符串转义模式处理的是 JSON 字符串内容，不包含首尾双引号；每次转换前都会保留一份可撤回快照。</el-text></template>
  </CodeWorkbench>
</template>
