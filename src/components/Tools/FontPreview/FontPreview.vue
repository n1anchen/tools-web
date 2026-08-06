<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { CopyDocument, FolderOpened, Monitor, Refresh, Upload } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import MetricsBar from '@/components/Common/MetricsBar.vue'
import { analyzeFontSample, buildFontCss, quoteFontFamily } from '@/utils/fontPreview'

interface LocalFontEntry {
  family: string
  fullName: string
  postscriptName: string
  style: string
}

interface FontOption {
  id: string
  label: string
  family: string
  source: '内置字体' | '本机字体' | '上传字体'
}

const builtinFonts: FontOption[] = [
  { id: 'system-sans', label: '系统无衬线', family: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', source: '内置字体' },
  { id: 'cn-sans', label: '中文黑体', family: '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif', source: '内置字体' },
  { id: 'editorial-serif', label: '编辑衬线', family: 'Georgia, "Times New Roman", "Noto Serif SC", serif', source: '内置字体' },
  { id: 'code-mono', label: '代码等宽', family: '"SFMono-Regular", Consolas, "Liberation Mono", monospace', source: '内置字体' },
]
const samplePresets = [
  { label: '中英混排', note: '句子与数字', text: '字里行间，自有风景。\nThe quick brown fox jumps over the lazy dog.\n0123456789' },
  { label: '中文正文', note: '阅读节奏', text: '山川异域，风月同天。真正耐看的字体，不只塑造单个字形，也照顾字与字之间的呼吸。' },
  { label: '品牌短句', note: '标题表现', text: 'MAKE IDEAS\nVISIBLE\n让灵感被看见' },
  { label: '数字界面', note: '数据对比', text: '¥ 12,580.00\n2026 / 08 / 03\nAa 0123456789 %' },
]
const viewOptions = [
  { label: '标本', value: 'specimen' },
  { label: '字号瀑布', value: 'waterfall' },
]
const styleOptions = [
  { label: '常规', value: 'normal' },
  { label: '斜体', value: 'italic' },
]
const waterfallSizes = [64, 48, 36, 28, 22, 16]
const defaultText = samplePresets[0].text

const previewText = ref(defaultText)
const selectedFontId = ref('system-sans')
const localFonts = ref<LocalFontEntry[]>([])
const customFontName = ref('')
const customFontUrl = ref('')
const searchQuery = ref('')
const showAllFonts = ref(false)
const isLocalFontSupported = ref(false)
const loadingFonts = ref(false)
let customFontFace: FontFace | null = null

const settings = reactive({
  fontSize: 44,
  fontWeight: 500,
  fontStyle: 'normal' as 'normal' | 'italic',
  fontColor: '#172033',
  backgroundColor: '#F8FAFC',
  lineHeight: 1.45,
  letterSpacing: 0,
  viewMode: 'specimen' as 'specimen' | 'waterfall',
})

const fontFamilies = computed(() => {
  const seen = new Set<string>()
  return localFonts.value.filter((font) => {
    if (seen.has(font.family)) return false
    seen.add(font.family)
    return true
  })
})

const fontOptions = computed<FontOption[]>(() => {
  const options = [...builtinFonts]
  if (customFontName.value) {
    options.push({ id: 'custom-upload', label: customFontName.value, family: quoteFontFamily(customFontName.value), source: '上传字体' })
  }
  fontFamilies.value.forEach((font) => {
    options.push({ id: `local:${font.family}`, label: font.family, family: `${quoteFontFamily(font.family)}, sans-serif`, source: '本机字体' })
  })
  return options
})

const selectedFont = computed(() => fontOptions.value.find((font) => font.id === selectedFontId.value) || builtinFonts[0])
const previewFontFamily = computed(() => selectedFont.value.family)
const metrics = computed(() => analyzeFontSample(previewText.value))
const firstPreviewLine = computed(() => previewText.value.split(/\r?\n/).find(Boolean) || '请输入预览文本')
const filteredLocalFonts = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return fontFamilies.value
  return fontFamilies.value.filter((font) => `${font.family} ${font.fullName}`.toLowerCase().includes(query))
})
const cssSnippet = computed(() => buildFontCss({
  family: previewFontFamily.value,
  size: settings.fontSize,
  weight: settings.fontWeight,
  style: settings.fontStyle,
  lineHeight: settings.lineHeight,
  letterSpacing: settings.letterSpacing,
  color: settings.fontColor,
}))
const previewStyles = computed(() => ({
  fontFamily: previewFontFamily.value,
  fontSize: `${settings.fontSize}px`,
  fontWeight: settings.fontWeight,
  fontStyle: settings.fontStyle,
  color: settings.fontColor,
  backgroundColor: settings.backgroundColor,
  lineHeight: settings.lineHeight,
  letterSpacing: `${settings.letterSpacing}px`,
}))

function applySample(preset: typeof samplePresets[number]) {
  previewText.value = preset.text
}

function selectLocalFont(family: string) {
  selectedFontId.value = `local:${family}`
  showAllFonts.value = false
}

async function readLocalFonts() {
  if (!isLocalFontSupported.value) {
    ElMessage.warning('当前浏览器不支持读取本机字体，请使用最新版 Chrome 或 Edge')
    return
  }
  loadingFonts.value = true
  try {
    // @ts-ignore Local Font Access API is only available in Chromium-based browsers.
    const fonts = await window.queryLocalFonts()
    localFonts.value = fonts.map((font: LocalFontEntry) => ({
      family: font.family,
      fullName: font.fullName,
      postscriptName: font.postscriptName,
      style: font.style,
    }))
    if (fontFamilies.value.length > 0) selectedFontId.value = `local:${fontFamilies.value[0].family}`
    ElMessage.success(`已读取 ${fontFamilies.value.length} 个字体家族`)
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误'
    if (error instanceof DOMException && error.name === 'NotAllowedError') ElMessage.warning('未获得本机字体访问权限')
    else ElMessage.error(`读取本机字体失败：${message}`)
  } finally {
    loadingFonts.value = false
  }
}

function openFontFile() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.ttf,.otf,.woff,.woff2'
  input.onchange = async (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return
    if (file.size > 20 * 1024 * 1024) {
      ElMessage.error('字体文件不能超过 20 MB')
      return
    }

    if (customFontFace) document.fonts.delete(customFontFace)
    if (customFontUrl.value) URL.revokeObjectURL(customFontUrl.value)
    const url = URL.createObjectURL(file)
    const fontName = file.name.replace(/\.(ttf|otf|woff2?|woff)$/i, '')
    try {
      const font = new FontFace(fontName, `url(${url})`)
      await font.load()
      document.fonts.add(font)
      customFontFace = font
      customFontName.value = fontName
      customFontUrl.value = url
      selectedFontId.value = 'custom-upload'
      ElMessage.success(`字体“${fontName}”已在本地载入`)
    } catch (error) {
      URL.revokeObjectURL(url)
      ElMessage.error(`字体文件加载失败：${error instanceof Error ? error.message : '格式不受支持'}`)
    }
  }
  input.click()
}

function toggleFontBrowser() {
  if (!fontFamilies.value.length) {
    ElMessage.warning('请先读取本机字体')
    return
  }
  showAllFonts.value = !showAllFonts.value
}

async function copyCss() {
  if (!navigator.clipboard?.writeText) {
    ElMessage.warning('当前浏览器不支持复制，请手动选择 CSS')
    return
  }
  try {
    await navigator.clipboard.writeText(cssSnippet.value)
    ElMessage.success('排版 CSS 已复制')
  } catch {
    ElMessage.error('复制失败，请手动选择 CSS')
  }
}

function resetWorkbench() {
  previewText.value = defaultText
  selectedFontId.value = 'system-sans'
  Object.assign(settings, {
    fontSize: 44, fontWeight: 500, fontStyle: 'normal', fontColor: '#172033',
    backgroundColor: '#F8FAFC', lineHeight: 1.45, letterSpacing: 0, viewMode: 'specimen',
  })
  showAllFonts.value = false
  searchQuery.value = ''
}

onMounted(() => {
  isLocalFontSupported.value = 'queryLocalFonts' in window
})

onBeforeUnmount(() => {
  if (customFontFace) document.fonts.delete(customFontFace)
  if (customFontUrl.value) URL.revokeObjectURL(customFontUrl.value)
})
</script>

<template>
  <div class="font-preview-page flex flex-col mt-3 flex-1">
    <ToolHero summary="不只看一个字，而是检查整套阅读气质">
      <template #metrics>
        <MetricsBar :items="[{ label: '当前来源', value: selectedFont.source }, { label: '标本字号', value: (settings.fontSize) + ' px' }, { label: '文本行数', value: metrics.lines }]" />
      </template>
    </ToolHero>

    <section class="preview-card">
      <header class="preview-heading">
        <div><span class="eyebrow">LIVE TYPE SPECIMEN</span><h3>{{ selectedFont.label }}</h3><p>{{ previewFontFamily }}</p></div>
        <div class="preview-actions">
          <el-segmented v-model="settings.viewMode" :options="viewOptions" aria-label="字体预览模式" />
          <button type="button" aria-label="复制当前排版 CSS" @click="copyCss"><el-icon><CopyDocument /></el-icon>复制 CSS</button>
        </div>
      </header>

      <div v-if="settings.viewMode === 'specimen'" class="specimen-stage" :style="previewStyles">
        {{ previewText || '请输入预览文本' }}
      </div>
      <div v-else class="waterfall-stage" :style="{ backgroundColor: settings.backgroundColor, color: settings.fontColor }">
        <div v-for="size in waterfallSizes" :key="size">
          <span>{{ size }}</span>
          <p :style="{ fontFamily: previewFontFamily, fontSize: `${size}px`, fontWeight: settings.fontWeight, fontStyle: settings.fontStyle, lineHeight: settings.lineHeight, letterSpacing: `${settings.letterSpacing}px` }">{{ firstPreviewLine }}</p>
        </div>
      </div>
      <div class="preview-meta"><span>{{ settings.fontWeight }} 字重</span><span>{{ settings.lineHeight.toFixed(2) }} 行高</span><span>{{ settings.letterSpacing.toFixed(1) }} px 字距</span><span>字体文件仅在本地载入</span></div>
    </section>

    <div class="workspace-grid">
      <section class="control-card">
        <header class="card-heading">
          <div><span class="eyebrow">SPECIMEN SETTINGS</span><h3>样文与排版</h3></div>
          <button type="button" aria-label="恢复字体标本默认设置" @click="resetWorkbench"><el-icon><Refresh /></el-icon>重置</button>
        </header>

        <label class="textarea-field"><span>预览文本</span><el-input v-model="previewText" type="textarea" :rows="4" maxlength="500" show-word-limit resize="vertical" aria-label="字体预览文本" /></label>
        <div class="sample-presets"><span>样文预设</span><div><button v-for="preset in samplePresets" :key="preset.label" type="button" @click="applySample(preset)"><strong>{{ preset.label }}</strong><small>{{ preset.note }}</small></button></div></div>

        <div class="font-source-field">
          <label><span>字体来源</span><el-select v-model="selectedFontId" filterable aria-label="选择预览字体"><el-option-group label="随时可用"><el-option v-for="font in builtinFonts" :key="font.id" :label="font.label" :value="font.id" /></el-option-group><el-option-group v-if="customFontName" label="上传字体"><el-option :label="customFontName" value="custom-upload" /></el-option-group><el-option-group v-if="fontFamilies.length" label="本机字体"><el-option v-for="font in fontFamilies" :key="font.family" :label="font.family" :value="`local:${font.family}`" /></el-option-group></el-select></label>
          <div class="source-actions">
            <button type="button" aria-label="打开本地字体文件" @click="openFontFile"><el-icon><Upload /></el-icon>打开字体文件</button>
            <button type="button" aria-label="读取浏览器可访问的本机字体" :disabled="!isLocalFontSupported || loadingFonts" @click="readLocalFonts"><el-icon><Monitor /></el-icon>{{ loadingFonts ? '正在读取…' : '读取本机字体' }}</button>
          </div>
          <p v-if="!isLocalFontSupported" class="support-note">当前浏览器不能枚举本机字体，但内置字体栈和字体文件上传仍可正常使用。</p>
        </div>

        <div class="slider-grid">
          <div class="slider-setting"><label><span>字体大小</span><strong>{{ settings.fontSize }} px</strong></label><el-slider v-model="settings.fontSize" :min="12" :max="120" /></div>
          <div class="slider-setting"><label><span>字体字重</span><strong>{{ settings.fontWeight }}</strong></label><el-slider v-model="settings.fontWeight" :min="100" :max="900" :step="100" /></div>
          <div class="slider-setting"><label><span>文本行高</span><strong>{{ settings.lineHeight.toFixed(2) }}</strong></label><el-slider v-model="settings.lineHeight" :min="1" :max="2.2" :step="0.05" /></div>
          <div class="slider-setting"><label><span>字符间距</span><strong>{{ settings.letterSpacing.toFixed(1) }} px</strong></label><el-slider v-model="settings.letterSpacing" :min="-2" :max="12" :step="0.5" /></div>
        </div>

        <div class="appearance-row">
          <label><span>字体样式</span><el-segmented v-model="settings.fontStyle" :options="styleOptions" /></label>
          <label><span>文字颜色</span><div><el-color-picker v-model="settings.fontColor" /><code>{{ settings.fontColor.toUpperCase() }}</code></div></label>
          <label><span>纸张颜色</span><div><el-color-picker v-model="settings.backgroundColor" /><code>{{ settings.backgroundColor.toUpperCase() }}</code></div></label>
        </div>
      </section>

      <aside class="insight-card">
        <header class="card-heading"><div><span class="eyebrow">TYPE INSPECTOR</span><h3>样文检查</h3></div></header>
        <div class="metric-grid">
          <div><strong>{{ metrics.characters }}</strong><span>字符</span></div><div><strong>{{ metrics.hanCharacters }}</strong><span>汉字</span></div>
          <div><strong>{{ metrics.latinLetters }}</strong><span>拉丁字母</span></div><div><strong>{{ metrics.digits }}</strong><span>数字</span></div>
        </div>
        <div class="css-card"><div><span>可复用 CSS</span><button type="button" aria-label="复制字体 CSS 代码" @click="copyCss"><el-icon><CopyDocument /></el-icon></button></div><pre>{{ cssSnippet }}</pre></div>
        <button type="button" class="browse-action" aria-label="打开或收起本机字体浏览器" :disabled="!fontFamilies.length" @click="toggleFontBrowser"><el-icon><FolderOpened /></el-icon>{{ showAllFonts ? '收起字体浏览器' : `浏览本机字体${fontFamilies.length ? ` · ${fontFamilies.length}` : ''}` }}</button>
        <div class="privacy-note"><strong>隐私说明</strong><span>字体文件与本机字体信息只保留在当前浏览器页面，不会上传。</span></div>
      </aside>
    </div>

    <section v-if="showAllFonts" class="font-browser-card">
      <header class="preview-heading"><div><span class="eyebrow">LOCAL FONT BROWSER</span><h3>本机字体对比</h3><p>{{ filteredLocalFonts.length }} / {{ fontFamilies.length }} 个字体家族</p></div><el-input v-model="searchQuery" clearable placeholder="搜索字体名称" aria-label="搜索本机字体" /></header>
      <div class="font-list"><button v-for="font in filteredLocalFonts" :key="font.family" type="button" :class="{ active: selectedFontId === `local:${font.family}` }" @click="selectLocalFont(font.family)"><span>{{ font.family }}</span><strong :style="{ fontFamily: `${quoteFontFamily(font.family)}, sans-serif`, fontWeight: settings.fontWeight, fontStyle: settings.fontStyle }">{{ firstPreviewLine }}</strong></button></div>
      <div v-if="!filteredLocalFonts.length" class="empty-state">没有匹配的本机字体</div>
    </section>

    <ToolGuide title="使用与兼容性说明">
      <div class="detail-copy">内置字体栈无需任何权限即可预览；打开 TTF、OTF、WOFF 或 WOFF2 文件后，字体只会加载到当前页面内存。读取本机字体使用浏览器 Local Font Access API，目前主要由新版 Chrome 与 Edge 支持，并会先请求用户授权。字号瀑布适合检查不同显示尺寸下的辨识度，标本模式则适合观察真实段落中的字距与行高。</div>
    </ToolGuide>
  </div>
</template>

<style scoped>
.font-preview-page {
  --accent: #6366f1;
  gap:18px
}
.preview-card,.control-card,.insight-card,.font-browser-card {
  border: 1px solid var(--c-border);
  border-radius: var(--radius-card);
  background: var(--c-surface);
  box-shadow: var(--shadow-card)
}
.eyebrow {
  display: block;
  margin-bottom: 8px;
  color: #a5b4fc;
  font-size: 11px;
  font-weight: 900;
  letter-spacing:.17em
}
.preview-card,.control-card,.insight-card,.font-browser-card {
  padding:22px
}
.preview-heading,.card-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap:18px
}
.preview-heading h3,.card-heading h3 {
  margin: 0;
  color: var(--c-text-primary);
  font-size:20px
}
.preview-heading p {
  max-width: 620px;
  margin: 5px 0 0;
  overflow: hidden;
  color: var(--c-text-secondary);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space:nowrap
}
.preview-actions {
  display: flex;
  align-items: center;
  gap:9px
}
.preview-actions>button,.card-heading>button,.source-actions button,.browse-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 38px;
  padding: 0 13px;
  border: 1px solid #dbe3ef;
  border-radius: var(--radius-sm);
  background: var(--c-surface);
  color: var(--c-text-body);
  font-weight: 750;
  cursor:pointer
}
.specimen-stage {
  min-height: 240px;
  margin-top: 18px;
  padding: 28px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  overflow: auto;
  white-space: pre-wrap;
  word-break:break-word
}
.waterfall-stage {
  margin-top: 18px;
  padding: 18px 24px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  overflow:hidden
}
.waterfall-stage>div {
  display: grid;
  grid-template-columns: 42px minmax(0,1fr);
  align-items: baseline;
  border-bottom:1px solid rgba(148,163,184,.24)
}
.waterfall-stage>div:last-child {
  border-bottom:0
}
.waterfall-stage span {
  color: var(--c-text-muted);
  font:700 11px/1 ui-monospace,monospace
}
.waterfall-stage p {
  margin: 8px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space:nowrap
}
.preview-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top:12px
}
.preview-meta span {
  padding: 5px 9px;
  border-radius: var(--radius-full);
  background: #eef2ff;
  color: #4f46e5;
  font-size: 11px;
  font-weight:750
}
.workspace-grid {
  display: grid;
  grid-template-columns: minmax(0,1.55fr) minmax(300px,.65fr);
  gap:18px
}
.card-heading {
  margin-bottom:20px
}
.card-heading>button {
  min-height: 34px;
  padding:0 10px
}
.textarea-field,.font-source-field label {
  display: flex;
  flex-direction: column;
  gap:8px
}
.textarea-field>span,.font-source-field label>span,.sample-presets>span,.appearance-row label>span {
  color: var(--c-text-secondary);
  font-size: 12px;
  font-weight:800
}
.sample-presets {
  margin-top:18px
}
.sample-presets>div {
  display: grid;
  grid-template-columns: repeat(4,1fr);
  gap: 8px;
  margin-top:9px
}
.sample-presets button {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: var(--c-surface-subtle);
  color: var(--c-text-strong);
  text-align: left;
  cursor:pointer
}
.sample-presets button:hover {
  border-color: #818cf8;
  background:#eef2ff
}
.sample-presets small {
  color: var(--c-text-muted)
}
.font-source-field {
  margin-top: 19px;
  padding-top: 18px;
  border-top: 1px solid var(--c-border)
}
.source-actions {
  display: flex;
  gap: 9px;
  margin-top:10px
}
.source-actions button:disabled,.browse-action:disabled {
  cursor: not-allowed;
  opacity:.5
}
.support-note {
  margin: 9px 0 0;
  color: #b45309;
  font-size: 12px;
  line-height:1.6
}
.slider-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 22px;
  margin-top:20px
}
.slider-setting label {
  display: flex;
  justify-content: space-between;
  color: var(--c-text-secondary);
  font-size: 12px;
  font-weight:800
}
.slider-setting strong {
  color:#4f46e5
}
.slider-setting :deep(.el-slider) {
  padding:0 5px
}
.appearance-row {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr;
  gap: 13px;
  margin-top:15px
}
.appearance-row label {
  display: flex;
  flex-direction: column;
  gap:8px
}
.appearance-row label>div {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height:32px
}
.appearance-row code {
  color: var(--c-text-secondary);
  font-size:11px
}
.appearance-row :deep(.el-segmented) {
  width:100%
}
.metric-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap:8px
}
.metric-grid div {
  display: flex;
  flex-direction: column;
  padding: 14px;
  border-radius: var(--radius-md);
  background: var(--c-surface-subtle)
}
.metric-grid strong {
  color: #312e81;
  font-size:22px
}
.metric-grid span {
  margin-top: 3px;
  color: var(--c-text-secondary);
  font-size:11px
}
.css-card {
  margin-top: 14px;
  overflow: hidden;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background:#0f172a
}
.css-card>div {
  display: flex;
  justify-content: space-between;
  padding: 9px 12px;
  border-bottom: 1px solid #334155;
  color: var(--c-text-muted);
  font-size: 11px;
  font-weight:800
}
.css-card button {
  border: 0;
  background: transparent;
  color: #c7d2fe;
  cursor:pointer
}
.css-card pre {
  margin: 0;
  padding: 14px;
  overflow: auto;
  color: #c7d2fe;
  font: 11px/1.75 ui-monospace,SFMono-Regular,monospace;
  white-space:pre-wrap
}
.browse-action {
  width: 100%;
  margin-top: 14px;
  border-color: #c7d2fe;
  background: #eef2ff;
  color:#4338ca
}
.privacy-note {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 14px;
  padding: 13px;
  border-radius: var(--radius-md);
  background: var(--c-surface-subtle);
  color: var(--c-text-secondary);
  font-size:12px
}
.privacy-note strong {
  color: var(--c-text-strong)
}
.font-browser-card .preview-heading :deep(.el-input) {
  width:280px
}
.font-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  max-height: 620px;
  margin-top: 18px;
  padding-right: 4px;
  overflow:auto
}
.font-list button {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  padding: 15px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface-subtle);
  color: var(--c-text-body);
  text-align: left;
  cursor:pointer
}
.font-list button.active {
  border-color: #6366f1;
  background: #eef2ff;
  box-shadow:0 0 0 2px rgba(99,102,241,.12)
}
.font-list span {
  font:700 11px/1.2 ui-monospace,monospace
}
.font-list strong {
  overflow: hidden;
  color: var(--c-text-primary);
  font-size: 24px;
  text-overflow: ellipsis;
  white-space:nowrap
}
.empty-state {
  padding: 50px;
  text-align: center;
  color: var(--c-text-muted)
}
.dark .control-card, .dark .font-browser-card {
  border-color: #334155;
  background:#1e293b
}
.dark .preview-heading h3,.dark .card-heading h3 {
  color:#f8fafc
}
.dark .preview-heading p,.dark .textarea-field>span,.dark .font-source-field label>span,.dark .sample-presets>span,.dark .appearance-row label>span {
  color: var(--c-text-muted)
}
.dark .preview-actions>button,.dark .card-heading>button,.dark .source-actions button {
  border-color: #475569;
  background: #0f172a;
  color:#cbd5e1
}
.dark .specimen-stage,.dark .waterfall-stage {
  border-color:#475569
}
.dark .preview-meta span {
  background: #312e81;
  color:#c7d2fe
}
.dark .sample-presets button,.dark .metric-grid div,.dark .privacy-note,.dark .font-list button {
  border-color: #334155;
  background:#0f172a
}
.dark .sample-presets button:hover,.dark .font-list button.active {
  border-color: #818cf8;
  background:#22224e
}
.dark .font-source-field {
  border-color:#334155
}
.dark .metric-grid strong {
  color:#a5b4fc
}
.dark .privacy-note strong,.dark .font-list strong {
  color:#e2e8f0
}
.dark .browse-action {
  border-color: #4338ca;
  background: #312e81;
  color:#e0e7ff
}
@media(max-width:980px) {
  .workspace-grid {
    grid-template-columns:1fr
  }
  .sample-presets {
    grid-template-columns:repeat(4,1fr)
  }
}
@media(max-width:680px) {
  .font-preview-page {
    gap:14px
  }
  .preview-card,.control-card,.insight-card,.font-browser-card {
    border-radius:var(--radius-lg)
  }
  .preview-card,.control-card,.insight-card,.font-browser-card {
    padding:15px
  }
  .preview-heading {
    flex-direction:column
  }
  .preview-actions {
    width: 100%;
    flex-wrap:wrap
  }
  .preview-actions :deep(.el-segmented) {
    flex:1
  }
  .preview-actions>button {
    flex:1
  }
  .specimen-stage {
    min-height: 210px;
    padding:20px
  }
  .sample-presets>div,.slider-grid,.appearance-row,.font-list {
    grid-template-columns:1fr
  }
  .source-actions {
    flex-direction:column
  }
  .source-actions button {
    width:100%
  }
  .font-browser-card .preview-heading :deep(.el-input) {
    width:100%
  }
  .waterfall-stage {
    padding:14px
  }
  .waterfall-stage>div {
    grid-template-columns:34px minmax(0,1fr)
  }
}
</style>
