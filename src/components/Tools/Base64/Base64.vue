<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { CopyDocument, Delete, Download, FolderOpened, Refresh } from '@element-plus/icons-vue'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import MetricsBar from '@/components/Common/MetricsBar.vue'
import { autoDown } from '@/utils/file'
import { copy } from '@/utils/string'
import { buildDocumentFilename, formatDocumentBytes } from '@/utils/documentStudio'
import {
  BASE64_EXTENSION_BY_MIME,
  base64ToBytes,
  bytesToBase64,
  decodeUtf8Base64,
  detectMimeFromBytes,
  encodeUtf8Base64,
  estimateBase64DecodedBytes,
  getMimeForFilename,
  parseBase64Input,
  sanitizeBase64Filename,
} from '@/utils/base64Tools'

type StudioMode = 'text' | 'file-encode' | 'file-decode'
type TextMode = 'encode' | 'decode'

const FILE_MAX_BYTES = 10 * 1024 * 1024
const B64_MAX_CHARS = 14 * 1024 * 1024
const mode = ref<StudioMode>('text')
const textMode = ref<TextMode>('encode')
const textInput = ref('你好，Base64 👋\n支持中文、Emoji 与多行文本。')
const textOutput = ref('')
const urlSafe = ref(false)
const fileInfo = ref<{ name: string; size: number; type: string } | null>(null)
const fileBase64 = ref('')
const fileLoading = ref(false)
const includeHeader = ref(false)
const b64Input = ref('')
const b64BaseName = ref('decoded-file')
const b64Ext = ref('bin')
const decodedBytes = shallowRef<Uint8Array | null>(null)
const detectedMime = ref('')
const declaredMime = ref('')
const decodeError = ref('')
const previewUrl = ref('')

const modes = [
  { value: 'text' as const, label: '文本编解码', note: 'Unicode 文本双向转换', step: '01' },
  { value: 'file-encode' as const, label: '文件转 Base64', note: '读取本地文件并复制', step: '02' },
  { value: 'file-decode' as const, label: 'Base64 还原文件', note: '识别类型、预览和下载', step: '03' },
]
const textSamples = [
  { title: '中文与 Emoji', value: '你好，Base64 👋\n支持中文、Emoji 与多行文本。' },
  { title: 'JSON 配置', value: '{\n  "theme": "dark",\n  "enabled": true,\n  "retries": 3\n}' },
  { title: 'URL 参数', value: 'https://tools.example.com/search?q=Base64 编解码&lang=zh-CN' },
]

const textInputBytes = computed(() => new TextEncoder().encode(textInput.value).byteLength)
const textOutputBytes = computed(() => new TextEncoder().encode(textOutput.value).byteLength)
const textRatio = computed(() => textInputBytes.value ? Math.round((textOutputBytes.value / textInputBytes.value) * 100) : 0)
const fileOutput = computed(() => {
  if (!fileBase64.value || !fileInfo.value) return ''
  return includeHeader.value ? `data:${fileInfo.value.type};base64,${fileBase64.value}` : fileBase64.value
})
const b64Length = computed(() => b64Input.value.length)
const b64TooLong = computed(() => b64Length.value > B64_MAX_CHARS)
const estimatedBytes = computed(() => estimateBase64DecodedBytes(b64Input.value))
const filename = computed(() => {
  const base = sanitizeBase64Filename(b64BaseName.value, 'decoded-file').replace(/\.[^.]+$/, '')
  const extension = b64Ext.value.trim().replace(/^\./, '').replace(/[^a-z\d_-]/gi, '')
  return extension ? `${base}.${extension}` : base
})
const resolvedMime = computed(() => detectedMime.value || declaredMime.value || getMimeForFilename(filename.value))
const canPreview = computed(() => resolvedMime.value.startsWith('image/') && resolvedMime.value !== 'image/svg+xml')
const heroMetrics = computed(() => {
  if (mode.value === 'text') return [
    { value: textInput.value.length, label: '输入字符' },
    { value: textOutput.value ? formatDocumentBytes(textOutputBytes.value) : '—', label: '结果体积' },
    { value: textOutput.value ? `${textRatio.value}%` : '—', label: '体积比例' },
  ]
  if (mode.value === 'file-encode') return [
    { value: fileInfo.value ? formatDocumentBytes(fileInfo.value.size) : '—', label: '原始文件' },
    { value: fileBase64.value ? formatDocumentBytes(fileBase64.value.length) : '—', label: '编码长度' },
    { value: '10 MB', label: '文件上限' },
  ]
  return [
    { value: b64Input.value ? formatDocumentBytes(b64Length.value) : '—', label: '输入长度' },
    { value: estimatedBytes.value ? formatDocumentBytes(estimatedBytes.value) : '—', label: '预计还原' },
    { value: detectedMime.value ? '已识别' : '待检测', label: '文件类型' },
  ]
})

watch(textMode, () => { textOutput.value = '' })
watch(b64Input, (value) => {
  decodedBytes.value = null
  detectedMime.value = ''
  decodeError.value = ''
  revokePreview()
  try {
    const parsed = parseBase64Input(value)
    declaredMime.value = parsed.mime
    if (parsed.mime) {
      const extension = BASE64_EXTENSION_BY_MIME[parsed.mime]
      if (extension) b64Ext.value = extension
    }
  } catch {
    declaredMime.value = ''
  }
})

function processText() {
  if (!textInput.value) return ElMessage.warning('请先输入需要处理的内容')
  try {
    if (textMode.value === 'encode') {
      const encoded = encodeUtf8Base64(textInput.value)
      textOutput.value = urlSafe.value ? encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : encoded
    } else textOutput.value = decodeUtf8Base64(textInput.value)
    ElMessage.success(textMode.value === 'encode' ? '文本编码完成' : '文本解码完成')
  } catch (error) {
    textOutput.value = ''
    ElMessage.error(error instanceof Error ? error.message : '处理失败')
  }
}

function applyTextSample(value: string) {
  textMode.value = 'encode'
  textInput.value = value
  textOutput.value = ''
}

function swapTextFlow() {
  if (!textOutput.value) return ElMessage.warning('请先生成结果')
  textInput.value = textOutput.value
  textOutput.value = ''
  textMode.value = textMode.value === 'encode' ? 'decode' : 'encode'
}

function clearText() {
  textInput.value = ''
  textOutput.value = ''
}

function downloadTextResult() {
  if (!textOutput.value) return
  downloadBlob(new Blob([textOutput.value], { type: 'text/plain;charset=utf-8' }), buildDocumentFilename(textMode.value === 'encode' ? 'base64-encoded' : 'base64-decoded', 'txt'))
}

async function handleFileChange(file: { raw?: File }) {
  const raw = file.raw
  if (!raw) return
  if (raw.size > FILE_MAX_BYTES) return ElMessage.error(`文件超过 10 MB 限制（当前 ${formatDocumentBytes(raw.size)}）`)
  fileInfo.value = null
  fileBase64.value = ''
  fileLoading.value = true
  try {
    const bytes = new Uint8Array(await raw.arrayBuffer())
    fileBase64.value = bytesToBase64(bytes)
    fileInfo.value = { name: raw.name, size: raw.size, type: raw.type || 'application/octet-stream' }
    ElMessage.success('文件已在浏览器本地完成编码')
  } catch {
    ElMessage.error('文件读取失败')
  } finally {
    fileLoading.value = false
  }
}

function clearFile() {
  fileInfo.value = null
  fileBase64.value = ''
  includeHeader.value = false
}

function revokePreview() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
}

function restoreFile() {
  decodeError.value = ''
  decodedBytes.value = null
  detectedMime.value = ''
  revokePreview()
  if (!b64Input.value.trim()) return ElMessage.warning('请先输入 Base64 或 Data URL')
  if (b64TooLong.value) return ElMessage.error('内容超过 14 MB 字符限制')
  try {
    const result = base64ToBytes(b64Input.value)
    const detected = detectMimeFromBytes(result.bytes)
    decodedBytes.value = result.bytes
    declaredMime.value = result.mime
    detectedMime.value = detected
    const mime = detected || result.mime || getMimeForFilename(filename.value)
    const extension = BASE64_EXTENSION_BY_MIME[mime]
    if (extension && (!b64Ext.value || b64Ext.value === 'bin')) b64Ext.value = extension
    if (mime.startsWith('image/') && mime !== 'image/svg+xml') {
      const buffer = result.bytes.buffer.slice(result.bytes.byteOffset, result.bytes.byteOffset + result.bytes.byteLength) as ArrayBuffer
      previewUrl.value = URL.createObjectURL(new Blob([buffer], { type: mime }))
    }
    ElMessage.success(detected ? `还原成功，识别为 ${detected}` : '还原成功，可设置扩展名后下载')
  } catch (error) {
    decodeError.value = error instanceof Error ? error.message : 'Base64 解析失败'
  }
}

function downloadDecodedFile() {
  if (!decodedBytes.value) return ElMessage.warning('请先还原 Base64 内容')
  const buffer = decodedBytes.value.buffer.slice(decodedBytes.value.byteOffset, decodedBytes.value.byteOffset + decodedBytes.value.byteLength) as ArrayBuffer
  downloadBlob(new Blob([buffer], { type: resolvedMime.value }), filename.value)
  ElMessage.success('文件已开始下载')
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  autoDown(url, sanitizeBase64Filename(name))
}

function clearDecode() {
  b64Input.value = ''
  b64BaseName.value = 'decoded-file'
  b64Ext.value = 'bin'
  decodedBytes.value = null
  detectedMime.value = ''
  declaredMime.value = ''
  decodeError.value = ''
  revokePreview()
}

onBeforeUnmount(revokePreview)
</script>

<template>
  <div class="base64-page flex flex-col mt-3 flex-1">
    <ToolHero summary="文字与文件，都走清晰的转换流程">
      <template #metrics>
        <MetricsBar :items="heroMetrics" />
      </template>
    </ToolHero>

    <nav class="mode-nav" aria-label="Base64 工作模式"><button v-for="item in modes" :key="item.value" type="button" :class="{ active: mode === item.value }" @click="mode = item.value"><b>{{ item.step }}</b><span><strong>{{ item.label }}</strong><small>{{ item.note }}</small></span></button></nav>

    <template v-if="mode === 'text'">
      <section class="text-toolbar">
        <div><span class="eyebrow">TEXT FLOW</span><h3>文本双向转换</h3></div>
        <el-segmented v-model="textMode" :options="[{ label: '文本 → Base64', value: 'encode' }, { label: 'Base64 → 文本', value: 'decode' }]" />
        <el-checkbox v-if="textMode === 'encode'" v-model="urlSafe">生成 Base64 URL</el-checkbox>
        <div class="toolbar-actions"><button type="button" aria-label="将结果作为下一步输入" :disabled="!textOutput" @click="swapTextFlow"><el-icon><Refresh /></el-icon>反向继续</button><button type="button" aria-label="清空文本编解码内容" @click="clearText"><el-icon><Delete /></el-icon>清空</button></div>
      </section>

      <section class="sample-card"><span>快速示例</span><button v-for="sample in textSamples" :key="sample.title" type="button" @click="applyTextSample(sample.value)"><strong>{{ sample.title }}</strong><small>{{ sample.value.length }} 字符</small></button></section>

      <section class="text-workspace">
        <article class="io-card input"><header><div><span>INPUT</span><h3>{{ textMode === 'encode' ? '原始文本' : 'Base64 内容' }}</h3></div><small>{{ textInput.length }} 字符 · {{ formatDocumentBytes(textInputBytes) }}</small></header><el-input v-model="textInput" type="textarea" :rows="15" resize="vertical" :placeholder="textMode === 'encode' ? '输入 UTF-8 文本…' : '输入 Base64、Base64 URL 或 Data URL…'" aria-label="Base64 文本输入" /></article>
        <div class="flow-action"><button type="button" @click="processText"><span>{{ textMode === 'encode' ? '编码' : '解码' }}</span><b>→</b></button></div>
        <article class="io-card output"><header><div><span>OUTPUT</span><h3>{{ textMode === 'encode' ? 'Base64 结果' : '还原文本' }}</h3></div><small>{{ textOutput.length }} 字符 · {{ formatDocumentBytes(textOutputBytes) }}</small></header><el-input v-model="textOutput" type="textarea" :rows="15" resize="vertical" readonly placeholder="处理结果将在这里显示…" aria-label="Base64 文本结果" /><footer><button type="button" aria-label="复制文本转换结果" :disabled="!textOutput" @click="copy(textOutput)"><el-icon><CopyDocument /></el-icon>复制结果</button><button type="button" aria-label="导出文本转换结果" :disabled="!textOutput" @click="downloadTextResult"><el-icon><Download /></el-icon>导出 TXT</button></footer></article>
      </section>
    </template>

    <template v-else-if="mode === 'file-encode'">
      <section class="file-workspace">
        <article class="upload-card">
          <div><span class="eyebrow">LOCAL FILE INPUT</span><h3>选择需要编码的文件</h3><p>文件只会读取到浏览器内存，不会上传；单文件最大 10 MB。</p></div>
          <el-upload drag action="#" :auto-upload="false" :on-change="handleFileChange" :show-file-list="false"><el-icon class="upload-icon"><FolderOpened /></el-icon><strong>拖放文件到这里，或点击选择</strong><small>支持任意格式 · 最大 10 MB</small></el-upload>
          <div v-if="fileLoading" class="loading-state">正在读取并编码文件…</div>
          <div v-if="fileInfo" class="file-meta"><div><span>文件名</span><strong>{{ fileInfo.name }}</strong></div><div><span>原始大小</span><strong>{{ formatDocumentBytes(fileInfo.size) }}</strong></div><div><span>MIME</span><strong>{{ fileInfo.type }}</strong></div><div><span>编码长度</span><strong>{{ formatDocumentBytes(fileBase64.length) }}</strong></div></div>
        </article>
        <article class="file-result-card"><header><div><span class="eyebrow">BASE64 OUTPUT</span><h3>编码结果</h3></div><el-checkbox v-model="includeHeader" :disabled="!fileBase64">包含 Data URL 头部</el-checkbox></header><el-input :model-value="fileOutput" type="textarea" :rows="17" resize="vertical" readonly placeholder="选择文件后生成 Base64…" aria-label="文件 Base64 结果" /><footer><button type="button" class="primary" aria-label="复制文件 Base64" :disabled="!fileOutput" @click="copy(fileOutput)"><el-icon><CopyDocument /></el-icon>复制 Base64</button><button type="button" aria-label="清空待编码文件" :disabled="!fileInfo" @click="clearFile"><el-icon><Delete /></el-icon>清空文件</button></footer></article>
      </section>
    </template>

    <template v-else>
      <section class="decode-grid">
        <article class="decode-input-card">
          <header><div><span class="eyebrow">BASE64 INPUT</span><h3>粘贴编码内容</h3><p>支持标准 Base64、Base64 URL 和完整 Data URL。</p></div><button type="button" aria-label="清空待还原 Base64" @click="clearDecode"><el-icon><Delete /></el-icon>清空</button></header>
          <div class="textarea-wrap"><el-input v-model="b64Input" type="textarea" :rows="13" resize="vertical" placeholder="粘贴 Base64 字符串或 data:mime;base64,..." aria-label="待还原 Base64 内容" /><span :class="{ danger: b64TooLong }">{{ formatDocumentBytes(b64Length) }} / 14 MB 字符</span></div>
          <div v-if="decodeError" class="error-banner">{{ decodeError }}</div>
          <div class="filename-row"><label><span>文件名</span><el-input v-model="b64BaseName" maxlength="80" /></label><label><span>扩展名</span><el-select v-model="b64Ext" filterable allow-create default-first-option><el-option-group label="图片"><el-option v-for="extension in ['png','jpg','gif','webp','bmp','svg','ico','avif']" :key="extension" :label="extension" :value="extension" /></el-option-group><el-option-group label="文档"><el-option v-for="extension in ['pdf','txt','csv','json','xml','html','css','js','md']" :key="extension" :label="extension" :value="extension" /></el-option-group><el-option-group label="压缩与媒体"><el-option v-for="extension in ['zip','gz','mp3','mp4','wav','webm','avi','bin']" :key="extension" :label="extension" :value="extension" /></el-option-group></el-select></label></div>
          <button type="button" class="restore-button" :disabled="!b64Input.trim() || b64TooLong" @click="restoreFile">解析并还原</button>
        </article>
        <article class="decode-result-card">
          <header><div><span class="eyebrow">RESTORE RESULT</span><h3>文件检查与交付</h3></div><span :class="['status-pill', { ready: decodedBytes }]">{{ decodedBytes ? '已还原' : '等待解析' }}</span></header>
          <div class="restore-summary"><div><span>文件名</span><strong>{{ filename }}</strong></div><div><span>预计大小</span><strong>{{ estimatedBytes ? formatDocumentBytes(estimatedBytes) : '—' }}</strong></div><div><span>声明类型</span><strong>{{ declaredMime || '未提供' }}</strong></div><div><span>检测类型</span><strong>{{ detectedMime || '待检测' }}</strong></div></div>
          <div v-if="previewUrl && canPreview" class="preview-box"><span>图片预览</span><img :src="previewUrl" alt="还原文件预览"></div>
          <div v-else class="file-placeholder"><el-icon><FolderOpened /></el-icon><strong>{{ decodedBytes ? '文件已准备完成' : '解析后将在这里显示结果' }}</strong><span>{{ decodedBytes ? resolvedMime : '图片文件会提供安全预览，其他类型可直接下载' }}</span></div>
          <button type="button" class="download-button" :aria-label="`下载 ${filename}`" :disabled="!decodedBytes" @click="downloadDecodedFile"><el-icon><Download /></el-icon>下载 {{ filename }}</button>
        </article>
      </section>
    </template>

    <ToolGuide title="编码边界与隐私说明"><div class="detail-copy">Base64 是编码而不是加密，任何人都可以还原内容，不适合隐藏密码或敏感信息。文本模式使用严格 UTF-8 编解码；文件模式支持常见魔数识别，未识别文件仍可按指定扩展名下载。所有文本和文件都只在当前浏览器中处理，不会上传到服务器。</div></ToolGuide>
  </div>
</template>

<style scoped>
.base64-page{--violet:#7c3aed;gap:18px}.mode-nav, .text-toolbar, .io-card, .upload-card, .file-result-card, .decode-input-card, .decode-result-card {border:1px solid #e2e8f0;border-radius:22px;background:#fff;box-shadow:0 14px 38px rgba(15,23,42,.06)}.eyebrow{display:block;margin-bottom:7px;color:#c4b5fd;font-size:12px;font-weight:900;letter-spacing:.16em}.mode-nav{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;padding:10px}.mode-nav button{display:flex;align-items:center;gap:12px;padding:13px;border:1px solid transparent;border-radius:14px;background:transparent;color:#64748b;text-align:left;cursor:pointer}.mode-nav button>b{display:grid;width:38px;height:38px;place-items:center;border-radius:11px;background:#f1f5f9;color:#64748b;font:800 13px ui-monospace,monospace}.mode-nav span,.mode-nav strong,.mode-nav small{display:block}.mode-nav strong{color:#334155;font-size:15px}.mode-nav small{margin-top:2px;color:#94a3b8;font-size:12px}.mode-nav button.active{border-color:#c4b5fd;background:#f5f3ff;color:#6d28d9}.mode-nav button.active>b{color:#fff;background:var(--violet)}.mode-nav button.active strong{color:#5b21b6}.text-toolbar{display:grid;grid-template-columns:auto minmax(270px,1fr) auto auto;align-items:center;gap:18px;padding:17px 20px}.text-toolbar .eyebrow{margin-bottom:3px;color:var(--violet)}.text-toolbar h3,.io-card h3,.upload-card h3,.file-result-card h3,.decode-grid h3{margin:0;color:#0f172a;font-size:19px}.toolbar-actions{display:flex;gap:8px}.toolbar-actions button,.io-card footer button,.file-result-card footer button,.decode-input-card header button{display:inline-flex;align-items:center;justify-content:center;gap:5px;min-height:36px;padding:0 11px;border:1px solid #dbe3ef;border-radius:9px;background:#fff;color:#475569;font-size:13px;font-weight:750;cursor:pointer}.toolbar-actions button:disabled,.io-card footer button:disabled,.file-result-card footer button:disabled{opacity:.45;cursor:not-allowed}.sample-card{display:flex;align-items:center;gap:8px;padding:12px 15px;overflow-x:auto}.sample-card>span{flex:none;color:#64748b;font-size:13px}.sample-card button{flex:none;padding:9px 13px;border:1px solid #dbe3ef;border-radius:10px;background:#f8fafc;color:#334155;text-align:left;cursor:pointer}.sample-card strong,.sample-card small{display:block}.sample-card strong{font-size:14px}.sample-card small{margin-top:2px;color:#94a3b8;font-size:12px}.text-workspace{display:grid;grid-template-columns:minmax(0,1fr) 70px minmax(0,1fr);align-items:stretch}.io-card{min-width:0;padding:20px}.io-card header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:13px}.io-card header span{color:#64748b;font-size:12px;font-weight:900;letter-spacing:.14em}.io-card header small{color:#94a3b8;font-size:12px}.io-card :deep(.el-textarea__inner),.file-result-card :deep(.el-textarea__inner),.decode-input-card :deep(.el-textarea__inner){min-height:330px!important;padding:14px;border-radius:13px;font:14px/1.7 ui-monospace,SFMono-Regular,Consolas,monospace}.io-card footer,.file-result-card footer{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}.flow-action{display:grid;place-items:center}.flow-action button{display:grid;width:54px;height:54px;place-items:center;border:0;border-radius:50%;color:#fff;background:linear-gradient(135deg,#7c3aed,#2563eb);box-shadow:0 12px 25px rgba(124,58,237,.28);cursor:pointer}.flow-action span{font-size:12px;font-weight:800}.flow-action b{line-height:.7}.file-workspace,.decode-grid{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:18px}.upload-card,.file-result-card,.decode-input-card,.decode-result-card{padding:22px}.upload-card p,.decode-input-card header p{margin:5px 0 0;color:#64748b;font-size:13px;line-height:1.6}.upload-card .eyebrow,.file-result-card .eyebrow,.decode-grid .eyebrow{color:var(--violet)}.upload-card :deep(.el-upload){display:block;margin-top:18px}.upload-card :deep(.el-upload-dragger){display:flex;min-height:230px;align-items:center;justify-content:center;flex-direction:column;border-radius:16px}.upload-icon{color:var(--violet);font-size:34px}.upload-card :deep(.el-upload-dragger strong){margin-top:10px;color:#334155;font-size:15px}.upload-card :deep(.el-upload-dragger small){margin-top:5px;color:#94a3b8;font-size:12px}.loading-state{margin-top:14px;padding:12px;border-radius:11px;color:#6d28d9;background:#f5f3ff;text-align:center}.file-meta,.restore-summary{display:grid;grid-template-columns:1fr 1fr;margin-top:16px;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden}.file-meta>div,.restore-summary>div{min-width:0;padding:12px;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0}.file-meta>div:nth-child(2n),.restore-summary>div:nth-child(2n){border-right:0}.file-meta>div:nth-last-child(-n+2),.restore-summary>div:nth-last-child(-n+2){border-bottom:0}.file-meta span,.file-meta strong,.restore-summary span,.restore-summary strong{display:block}.file-meta span,.restore-summary span{color:#94a3b8;font-size:12px}.file-meta strong,.restore-summary strong{margin-top:3px;overflow:hidden;color:#334155;font-size:13px;text-overflow:ellipsis;white-space:nowrap}.file-result-card>header,.decode-input-card>header,.decode-result-card>header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:15px}.file-result-card footer button.primary{border-color:var(--violet);background:var(--violet);color:#fff}.textarea-wrap{position:relative}.textarea-wrap>span{position:absolute;right:12px;bottom:10px;padding:3px 7px;border-radius:7px;background:rgba(255,255,255,.88);color:#94a3b8;font-size:12px}.textarea-wrap>span.danger{color:#dc2626}.error-banner{margin-top:10px;padding:10px 12px;border-radius:10px;color:#b91c1c;background:#fef2f2;font-size:13px}.filename-row{display:grid;grid-template-columns:1fr 150px;gap:10px;margin-top:14px}.filename-row label>span{display:block;margin-bottom:6px;color:#64748b;font-size:12px}.restore-button,.download-button{display:flex;width:100%;min-height:43px;align-items:center;justify-content:center;gap:7px;margin-top:15px;border:0;border-radius:11px;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;font-size:14px;font-weight:800;cursor:pointer}.restore-button:disabled,.download-button:disabled{cursor:not-allowed;filter:grayscale(1);opacity:.5}.status-pill{padding:5px 9px;border-radius:999px;color:#64748b;background:#f1f5f9;font-size:12px;font-weight:800}.status-pill.ready{color:#047857;background:#d1fae5}.file-placeholder{display:flex;min-height:265px;align-items:center;justify-content:center;flex-direction:column;margin-top:15px;border:1px dashed #cbd5e1;border-radius:15px;color:#94a3b8;text-align:center}.file-placeholder>.el-icon{font-size:36px}.file-placeholder strong{margin-top:10px;color:#475569;font-size:15px}.file-placeholder span{max-width:320px;margin-top:5px;font-size:12px}.preview-box{display:grid;min-height:265px;margin-top:15px;padding:14px;place-items:center;border-radius:15px;background:#f8fafc}.preview-box span{justify-self:start;color:#64748b;font-size:12px}.preview-box img{max-width:100%;max-height:280px;border-radius:10px}:global(html.dark .base64-page .mode-nav),:global(html.dark .base64-page .text-toolbar),:global(html.dark .base64-page .sample-card),:global(html.dark .base64-page .io-card),:global(html.dark .base64-page .upload-card),:global(html.dark .base64-page .file-result-card),:global(html.dark .base64-page .decode-input-card),:global(html.dark .base64-page .decode-result-card){border-color:#334155;background:#1e293b;box-shadow:none}:global(html.dark .base64-page h3),:global(html.dark .base64-page .mode-nav strong),:global(html.dark .base64-page .file-meta strong),:global(html.dark .base64-page .restore-summary strong),:global(html.dark .base64-page .file-placeholder strong){color:#f8fafc}:global(html.dark .base64-page .mode-nav button>b),:global(html.dark .base64-page .sample-card button),:global(html.dark .base64-page .toolbar-actions button),:global(html.dark .base64-page .io-card footer button),:global(html.dark .base64-page .file-result-card footer button),:global(html.dark .base64-page .decode-input-card header button){border-color:#475569;background:#0f172a;color:#e2e8f0}:global(html.dark .base64-page .mode-nav button.active){border-color:#7c3aed;background:#2e1065}:global(html.dark .base64-page .mode-nav button.active strong){color:#ddd6fe}:global(html.dark .base64-page .file-meta),:global(html.dark .base64-page .restore-summary){border-color:#334155}:global(html.dark .base64-page .file-meta>div),:global(html.dark .base64-page .restore-summary>div){border-color:#334155}:global(html.dark .base64-page .textarea-wrap>span){background:rgba(15,23,42,.9)}:global(html.dark .base64-page .preview-box){background:#0f172a}:global(html.dark .base64-page .file-placeholder){border-color:#475569}
@media(max-width:1050px){.text-toolbar{grid-template-columns:1fr 1fr}.text-workspace{grid-template-columns:1fr}.flow-action{padding:8px}.flow-action button{width:100%;height:42px;border-radius:11px}.flow-action b{display:none}.file-workspace,.decode-grid{grid-template-columns:1fr}}@media(max-width:680px){.base64-page{gap:14px}.mode-nav{grid-template-columns:1fr}.text-toolbar{grid-template-columns:1fr;padding:15px}.toolbar-actions{display:grid;grid-template-columns:1fr 1fr}.sample-card{padding:11px}.io-card,.upload-card,.file-result-card,.decode-input-card,.decode-result-card{padding:15px}.io-card header{align-items:flex-start;flex-direction:column}.io-card :deep(.el-textarea__inner),.file-result-card :deep(.el-textarea__inner),.decode-input-card :deep(.el-textarea__inner){min-height:260px!important}.filename-row{grid-template-columns:1fr}.file-meta,.restore-summary{grid-template-columns:1fr}.file-meta>div,.restore-summary>div{border-right:0}.file-meta>div:nth-last-child(2),.restore-summary>div:nth-last-child(2){border-bottom:1px solid #e2e8f0}}
</style>
