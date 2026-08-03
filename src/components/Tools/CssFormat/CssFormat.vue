<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import CodeWorkbench from '@/components/Tools/CodeWorkbench/CodeWorkbench.vue'
import { analyzeCss, getCompressionReport } from '@/utils/codeWorkbench'

const samples = [
  { label: '组件卡片', note: 'Grid · Hover', value: ':root {\n  --brand: #2563eb;\n  --surface: #ffffff;\n}\n\n.card-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));\n  gap: 1rem;\n}\n\n.card {\n  padding: 1.25rem;\n  border: 1px solid color-mix(in srgb, var(--brand) 20%, transparent);\n  border-radius: 1rem;\n  background: var(--surface);\n  transition: transform 180ms ease;\n}\n\n.card:hover { transform: translateY(-2px); }' },
  { label: '响应式导航', note: '@media', value: '.nav { display: flex; align-items: center; gap: 16px; }\n.nav__toggle { display: none; }\n@media (max-width: 720px) {\n  .nav { align-items: stretch; flex-direction: column; }\n  .nav__toggle { display: inline-flex; }\n}' },
  { label: '加载动画', note: '@keyframes', value: '.spinner { width: 32px; height: 32px; border: 3px solid #dbeafe; border-top-color: #2563eb; border-radius: 50%; animation: spin .8s linear infinite; }\n@keyframes spin { to { transform: rotate(360deg); } }' },
]

const workbenchRef = ref<InstanceType<typeof CodeWorkbench>>()
const code = ref(samples[0].value)
const tabSize = ref(2)
const restructure = ref(true)
const commentPolicy = ref<'exclamation' | false>('exclamation')
const previousCode = ref('')
const busy = ref(false)
const actionMessage = ref('示例已载入，可格式化或优化压缩')
const statusTone = ref<'idle' | 'success' | 'error' | 'working'>('success')
const errorDetail = ref('')
const compression = ref({ saved: 0, percent: 0 })
const analysis = computed(() => analyzeCss(code.value))
const metrics = computed(() => [
  { label: '规则', value: analysis.value.rules },
  { label: '声明', value: analysis.value.declarations },
  { label: 'CSS 变量', value: analysis.value.variables },
  { label: '颜色', value: analysis.value.colors },
  { label: '压缩节省', value: compression.value.saved ? `${compression.value.saved} B · ${compression.value.percent}%` : '—' },
])
const tips = [
  { title: '结构重组会合并规则', description: '开启后 CSSO 可能合并选择器或声明以获得更小体积；发布前建议配合页面回归。' },
  { title: '许可证注释可保留', description: '“保留 /*! */”适合版权与许可证信息，普通开发注释会在压缩时移除。' },
  { title: '格式化不等于补前缀', description: '本工具不会自动添加浏览器前缀；生产项目仍应使用 Autoprefixer 等构建工具。' },
]

function checkpoint() {
  if (previousCode.value !== code.value) previousCode.value = code.value
}

async function formatCode() {
  if (!code.value.trim()) return
  checkpoint()
  errorDetail.value = ''
  statusTone.value = 'working'
  actionMessage.value = '正在整理 CSS 排版…'
  workbenchRef.value?.formatEditor()
  await nextTick()
  compression.value = { saved: 0, percent: 0 }
  statusTone.value = 'success'
  actionMessage.value = 'CSS 格式化完成'
}

async function minifyCode() {
  if (!code.value.trim()) return
  busy.value = true
  statusTone.value = 'working'
  actionMessage.value = '正在解析并优化 CSS…'
  errorDetail.value = ''
  try {
    const { minify } = await import('csso')
    const before = code.value
    const result = minify(code.value, { restructure: restructure.value, comments: commentPolicy.value }).css
    checkpoint()
    code.value = result
    compression.value = getCompressionReport(before, code.value)
    statusTone.value = 'success'
    actionMessage.value = `优化压缩完成，体积减少 ${compression.value.percent}%`
  } catch (error) {
    statusTone.value = 'error'
    actionMessage.value = 'CSS 解析失败'
    errorDetail.value = error instanceof Error ? error.message : '请检查 CSS 语法'
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
  actionMessage.value = '等待 CSS 内容'
  errorDetail.value = ''
}

function loadSample(sample: { value: string; note: string }) {
  checkpoint()
  code.value = sample.value
  compression.value = { saved: 0, percent: 0 }
  statusTone.value = 'success'
  actionMessage.value = `${sample.note} 示例已载入`
  errorDetail.value = ''
}
</script>

<template>
  <CodeWorkbench
    ref="workbenchRef"
    v-model="code"
    page-title="CSS 格式化与优化"
    eyebrow="CSS OPTIMIZATION LAB"
    headline="从可读样式，到可发布体积"
    description="格式化负责审阅，CSSO 负责语法解析和优化压缩；结果、体积收益与错误诊断都清晰可见。"
    language="CSS"
    mode="css"
    accent="cyan"
    :status="actionMessage"
    :status-tone="statusTone"
    :status-detail="errorDetail ? '请查看右侧诊断' : `${analysis.mediaQueries} 个媒体查询`"
    :samples="samples"
    :metrics="metrics"
    :tips="tips"
    :tab-size="tabSize"
    :busy="busy"
    primary-label="格式化 CSS"
    secondary-label="优化并压缩"
    :can-restore="Boolean(previousCode)"
    filename="styles.css"
    @primary="formatCode"
    @secondary="minifyCode"
    @restore="restore"
    @clear="clear"
    @sample="loadSample"
  >
    <template #options>
      <label class="option-field"><span>缩进宽度</span><el-input-number v-model="tabSize" :min="2" :max="8" /></label>
      <label class="switch-field"><span>允许结构重组</span><el-switch v-model="restructure" /></label>
      <label class="option-field"><span>注释策略</span><el-select v-model="commentPolicy"><el-option label="保留 /*! 许可证注释 */" value="exclamation" /><el-option label="移除所有注释" :value="false" /></el-select></label>
      <div :class="['notice-card', { error: errorDetail }]">{{ errorDetail || (restructure ? '结构重组已开启：可能合并等价规则与声明，以获得更小体积。' : '保守优化：保持原有规则结构，仅进行值和语法层面的压缩。') }}</div>
    </template>
    <template #usage><el-text>“格式化 CSS”只调整排版；“优化并压缩”使用 CSSO 完整解析样式表，可选择是否进行结构重组以及保留许可证注释。语法错误会显示在设置区，转换前的内容可通过“撤回”恢复。</el-text></template>
  </CodeWorkbench>
</template>
