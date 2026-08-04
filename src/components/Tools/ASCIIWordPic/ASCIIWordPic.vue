<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Download, MagicStick, Refresh, VideoPlay } from '@element-plus/icons-vue'
import figlet, { type FontName } from 'figlet'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import { getAsciiMetrics } from '@/utils/displayStudio'
import { secureRandomInt } from '@/utils/random'
import { copy } from '@/utils/string'

type LayoutMode = 'default' | 'fitted' | 'full' | 'universal smushing'

const fonts = [
  'Alpha', 'Avatar', 'Banner', 'Banner3-D', 'Basic', 'Bear', 'Big-Money-ne', 'Big', 'Block', 'Epic', 'Ghost',
  'Knob', 'Linux', 'Mini', 'Mirror', 'Peaks', 'Slant', 'Small', 'Stellar', 'Thin', 'Wow',
]
const samples = [
  { label: 'TOOLS', value: 'TOOLS' },
  { label: 'HELLO', value: 'HELLO' },
  { label: '404', value: '404' },
  { label: 'SHIP IT', value: 'SHIP IT' },
]
const layoutOptions = [
  { label: '智能', value: 'default' },
  { label: '紧凑', value: 'fitted' },
  { label: '展开', value: 'full' },
]

figlet.defaults({ fontPath: '/fonts/' })

const content = ref('Tools-Web')
const output = ref('')
const font = ref<FontName>('Big')
const outputWidth = ref(120)
const previewFontSize = ref(11)
const horizontalLayout = ref<LayoutMode>('default')
const autoGenerate = ref(true)
const busy = ref(false)
const errorMessage = ref('')
const recentFonts = ref<string[]>(readRecentFonts())
let generationId = 0
let debounceTimer: ReturnType<typeof setTimeout> | undefined

const metrics = computed(() => getAsciiMetrics(output.value))
const inputLength = computed(() => Array.from(content.value).length)
const unsupportedCount = computed(() => Array.from(content.value).filter(character => {
  const point = character.codePointAt(0) ?? 0
  return point > 126 && character !== '\n'
}).length)
const statusLabel = computed(() => {
  if (busy.value) return '正在生成字形…'
  if (errorMessage.value) return '生成失败'
  if (!output.value) return '等待输入'
  return `${font.value} 字体已就绪`
})

function readRecentFonts() {
  try {
    const value = JSON.parse(localStorage.getItem('asciiWordPicRecentFonts') || '[]')
    return Array.isArray(value) ? value.filter(item => typeof item === 'string').slice(0, 4) : []
  } catch {
    return []
  }
}

function rememberFont(value: string) {
  recentFonts.value = [value, ...recentFonts.value.filter(item => item !== value)].slice(0, 4)
  localStorage.setItem('asciiWordPicRecentFonts', JSON.stringify(recentFonts.value))
}

function generate() {
  const value = content.value.trim()
  if (!value) {
    output.value = ''
    errorMessage.value = ''
    return
  }

  const currentId = ++generationId
  busy.value = true
  errorMessage.value = ''
  figlet(value, {
    font: font.value,
    width: outputWidth.value,
    horizontalLayout: horizontalLayout.value,
    verticalLayout: 'default',
    whitespaceBreak: true,
  }, (error, result) => {
    if (currentId !== generationId) return
    busy.value = false
    if (error) {
      output.value = ''
      errorMessage.value = '字体资源加载失败，请切换字体后重试'
      return
    }
    output.value = result || ''
    rememberFont(font.value)
  })
}

function scheduleGenerate() {
  if (!autoGenerate.value) return
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(generate, 180)
}

function loadSample(value: string) {
  content.value = value
  generate()
}

function surpriseMe() {
  const nextFonts = fonts.filter(item => item !== font.value)
  font.value = nextFonts[secureRandomInt(0, nextFonts.length - 1)]
  generate()
}

function clear() {
  generationId += 1
  content.value = ''
  output.value = ''
  errorMessage.value = ''
  busy.value = false
}

function downloadText() {
  if (!output.value) return
  const url = URL.createObjectURL(new Blob([output.value], { type: 'text/plain;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `ascii-${String(font.value).toLowerCase().replace(/\s+/g, '-')}.txt`
  anchor.click()
  URL.revokeObjectURL(url)
}

watch([content, font, outputWidth, horizontalLayout], scheduleGenerate)
watch(autoGenerate, value => {
  if (value) generate()
})
onMounted(generate)
onUnmounted(() => {
  generationId += 1
  if (debounceTimer) clearTimeout(debounceTimer)
})
</script>

<template>
  <div class="ascii-page flex flex-col mt-3 flex-1">
    <ToolHero summary="把普通文字，变成终端里的标题">
      <template #metrics>
        <div class="hero-metrics">
          <div><span>本地字体</span><strong>21</strong></div>
          <div><span>输出行数</span><strong>{{ metrics.rows || '—' }}</strong></div>
          <div><span>最大列宽</span><strong>{{ metrics.columns || '—' }}</strong></div>
        </div>
      </template>
    </ToolHero>

    <div class="studio-grid">
      <section class="control-card">
        <header class="card-heading">
          <div><span class="eyebrow">TYPE & SETTINGS</span><h3>文字与版式</h3></div>
          <span :class="['live-status', { busy, error: errorMessage }]">{{ statusLabel }}</span>
        </header>

        <label class="field-label"><span>标题内容</span><b>{{ inputLength }}/32</b></label>
        <el-input v-model="content" type="textarea" :rows="3" maxlength="32" resize="none" placeholder="输入英文、数字或常用符号" aria-label="ASCII 标题内容" />
        <p v-if="unsupportedCount" class="input-warning">检测到 {{ unsupportedCount }} 个非 ASCII 字符，部分字体可能无法显示。</p>

        <div class="sample-row">
          <span>快速示例</span>
          <button v-for="sample in samples" :key="sample.label" type="button" @click="loadSample(sample.value)">{{ sample.label }}</button>
        </div>

        <div class="setting-grid">
          <label><span>字体风格</span><el-select v-model="font" filterable aria-label="字体风格"><el-option v-for="item in fonts" :key="item" :label="item" :value="item" /></el-select></label>
          <label><span>字符间距</span><el-segmented v-model="horizontalLayout" :options="layoutOptions" /></label>
        </div>

        <div class="slider-setting">
          <label><span>输出宽度</span><strong>{{ outputWidth }} 列</strong></label>
          <el-slider v-model="outputWidth" :min="40" :max="200" :step="10" />
        </div>
        <div class="slider-setting">
          <label><span>预览字号</span><strong>{{ previewFontSize }} px</strong></label>
          <el-slider v-model="previewFontSize" :min="8" :max="18" />
        </div>

        <div class="auto-row"><div><strong>实时生成</strong><span>输入与设置变化后自动刷新预览</span></div><el-switch v-model="autoGenerate" /></div>

        <div class="primary-actions">
          <el-button type="primary" aria-label="生成 ASCII 字形" :loading="busy" :disabled="!content.trim()" @click="generate"><el-icon><VideoPlay /></el-icon>生成字形</el-button>
          <el-button aria-label="随机选择字体" @click="surpriseMe"><el-icon><MagicStick /></el-icon>随机字体</el-button>
          <el-button text @click="clear">清空</el-button>
        </div>

        <div v-if="recentFonts.length" class="recent-row"><span>最近使用</span><button v-for="item in recentFonts" :key="item" type="button" @click="font = item">{{ item }}</button></div>
      </section>

      <section class="preview-card">
        <header class="preview-heading">
          <div><span class="window-dots"><i></i><i></i><i></i></span><strong>ascii-preview.txt</strong></div>
          <div>
            <button type="button" aria-label="复制 ASCII 字形" :disabled="!output" @click="copy(output)">复制</button>
            <button type="button" aria-label="下载 ASCII 文本" :disabled="!output" @click="downloadText"><el-icon><Download /></el-icon>TXT</button>
          </div>
        </header>
        <div class="terminal" :class="{ empty: !output }">
          <div v-if="busy" class="preview-state"><el-icon class="is-loading"><Refresh /></el-icon><span>正在载入 {{ font }} 字体</span></div>
          <div v-else-if="errorMessage" class="preview-state error">{{ errorMessage }}</div>
          <pre v-else-if="output" :style="{ fontSize: `${previewFontSize}px` }"><code>{{ output }}</code></pre>
          <div v-else class="preview-state">输入标题后，这里会显示等宽字符预览</div>
        </div>
        <div class="metric-strip">
          <div><span>行数</span><strong>{{ metrics.rows }}</strong></div>
          <div><span>最大列宽</span><strong>{{ metrics.columns }}</strong></div>
          <div><span>可见字符</span><strong>{{ metrics.characters }}</strong></div>
          <div><span>文件大小</span><strong>{{ metrics.bytes }} B</strong></div>
        </div>
      </section>
    </div>

    <ToolGuide title="使用与兼容说明">
      <el-text>FIGlet 字体主要面向英文字母、数字和常用 ASCII 符号；中文等扩展字符取决于具体字体，建议先查看预览。输出宽度决定自动换行位置，“紧凑”和“展开”会改变字符间距。所有字体均从本站本地资源加载，生成过程不上传文本。</el-text>
    </ToolGuide>
  </div>
</template>

<style scoped>
.ascii-page{--accent:#8b5cf6;--accent-deep:#6d28d9;--soft:#f5f3ff;gap:16px}.control-card,.preview-card{border:1px solid #e2e8f0;border-radius:22px;background:#fff;box-shadow:0 16px 40px rgba(15,23,42,.055)}.eyebrow{display:block;margin-bottom:6px;color:var(--accent);font-size:10px;font-weight:900;letter-spacing:.16em}.hero-metrics{display:grid;grid-template-columns:repeat(3,minmax(96px,1fr));min-width:320px;overflow:hidden;border:1px solid #e0e9f4;border-radius:18px;background:rgba(255,255,255,.78)}.hero-metrics div{padding:12px 14px;text-align:center;border-left:1px solid #e5edf6}.hero-metrics div:first-child{border-left:0}.hero-metrics span,.hero-metrics strong{display:block}.hero-metrics span{margin-top:4px;color:#7a899c;font-size:12px}.hero-metrics strong{overflow:hidden;color:#334155;font-size:18px;text-overflow:ellipsis;white-space:nowrap}.studio-grid{display:grid;grid-template-columns:minmax(330px,.72fr) minmax(0,1.28fr);gap:16px;align-items:stretch}.control-card,.preview-card{padding:21px}.card-heading,.preview-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}.card-heading{margin-bottom:18px}.card-heading h3{margin:0;color:#0f172a;font-size:19px}.live-status{padding:5px 8px;border-radius:999px;color:#047857;background:#d1fae5;font-size:9px;font-weight:800}.live-status.busy{color:#92400e;background:#fef3c7}.live-status.error{color:#be123c;background:#ffe4e6}.field-label,.slider-setting label{display:flex;align-items:center;justify-content:space-between;margin-bottom:7px;color:#64748b;font-size:11px}.field-label b,.slider-setting strong{color:var(--accent-deep)}.input-warning{margin:7px 0 0;color:#b45309;font-size:10px}.sample-row,.recent-row{display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin-top:12px}.sample-row>span,.recent-row>span{margin-right:4px;color:#94a3b8;font-size:10px}.sample-row button,.recent-row button{padding:5px 8px;border:1px solid #e2e8f0;border-radius:999px;color:#64748b;background:#f8fafc;cursor:pointer;font-size:9px}.setting-grid{display:grid;grid-template-columns:1fr 1.2fr;gap:12px;margin-top:18px}.setting-grid label>span{display:block;margin-bottom:7px;color:#64748b;font-size:10px}.setting-grid :deep(.el-segmented){width:100%}.slider-setting{margin-top:14px}.slider-setting :deep(.el-slider){padding:0 8px}.auto-row{display:flex;align-items:center;justify-content:space-between;margin-top:10px;padding:11px 12px;border-radius:12px;background:#f8fafc}.auto-row strong,.auto-row span{display:block}.auto-row strong{color:#334155;font-size:11px}.auto-row span{margin-top:2px;color:#94a3b8;font-size:9px}.primary-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:16px}.primary-actions :deep(.el-button){margin-left:0}.preview-card{min-width:0;padding:0;overflow:hidden;background:#0b1020}.preview-heading{padding:12px 15px;border-bottom:1px solid #252d41;color:#94a3b8;background:#111827}.preview-heading>div{display:flex;align-items:center;gap:8px}.preview-heading strong{font:10px ui-monospace,SFMono-Regular,monospace}.preview-heading button{display:flex;align-items:center;gap:4px;padding:5px 7px;border:1px solid #334155;border-radius:7px;color:#cbd5e1;background:#1e293b;cursor:pointer;font-size:9px}.preview-heading button:disabled{opacity:.35;cursor:not-allowed}.window-dots{display:flex;gap:4px}.window-dots i{width:7px;height:7px;border-radius:50%;background:#fb7185}.window-dots i:nth-child(2){background:#fbbf24}.window-dots i:nth-child(3){background:#34d399}.terminal{min-height:360px;max-height:520px;padding:24px;overflow:auto;color:#d8b4fe;background:radial-gradient(circle at 100% 0,rgba(139,92,246,.16),transparent 32%),#070b16}.terminal pre{min-width:max-content;margin:0;font-family:"SFMono-Regular",Consolas,"Liberation Mono",monospace;line-height:1.16;text-shadow:0 0 18px rgba(192,132,252,.28)}.terminal.empty{display:grid;place-items:center}.preview-state{display:flex;align-items:center;gap:8px;color:#64748b;font-size:11px}.preview-state.error{color:#fda4af}.metric-strip{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid #252d41;background:#111827}.metric-strip div{padding:12px;border-right:1px solid #252d41}.metric-strip div:last-child{border-right:0}.metric-strip span,.metric-strip strong{display:block}.metric-strip span{color:#64748b;font-size:8px}.metric-strip strong{margin-top:3px;color:#e2e8f0;font-size:11px}
:global(html.dark .ascii-page .hero-metrics){border-color:#40516a;background:rgba(15,23,42,.5)}:global(html.dark .ascii-page .hero-metrics div){border-color:#40516a}:global(html.dark .ascii-page .hero-metrics strong){color:#e7edf6}:global(html.dark .ascii-page .hero-metrics span){color:#a8b4c5}:global(html.dark .ascii-page .control-card){border-color:#334155;background:#1e293b;box-shadow:none}:global(html.dark .ascii-page .card-heading h3),:global(html.dark .ascii-page .auto-row strong){color:#f8fafc}:global(html.dark .ascii-page .auto-row),:global(html.dark .ascii-page .sample-row button),:global(html.dark .ascii-page .recent-row button){border-color:#334155;color:#cbd5e1;background:#0f172a}
@media(max-width:1000px){.studio-grid{grid-template-columns:1fr}.terminal{min-height:330px}}@media(max-width:650px){.ascii-page{gap:12px}.hero-metrics{grid-template-columns:1fr}.hero-metrics div{border-left:0;border-bottom:1px solid #e5edf6}.hero-metrics div:last-child{border-bottom:0}.control-card{padding:16px}.setting-grid{grid-template-columns:1fr}.preview-heading{align-items:flex-start}.terminal{min-height:280px;padding:16px}.metric-strip{grid-template-columns:1fr 1fr}.metric-strip div:nth-child(2){border-right:0}.metric-strip div:nth-child(-n+2){border-bottom:1px solid #252d41}.primary-actions :deep(.el-button:first-child){flex:1}}
</style>
