<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { ElMessage } from 'element-plus'
import { copy } from '@/utils/string'

const title = 'Base64 加解密'
const activeTab = ref('text')

// ── 限制常量 ──────────────────────────────────────────────────
const FILE_MAX_BYTES = 10 * 1024 * 1024   // 文件上传：10 MB
const B64_MAX_CHARS  = 14 * 1024 * 1024   // Base64 输入：~14 MB 字符 ≈ 10 MB 原始数据

const fmtSize = (n: number) => {
  if (n < 1024) return n + ' B'
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB'
  return (n / 1024 / 1024).toFixed(2) + ' MB'
}

// ── 文本编解码 ────────────────────────────────────────────────
const textMode = ref<'encode' | 'decode'>('encode')
const textInput = ref('')
const textOutput = ref('')

const switchTextMode = () => { textOutput.value = '' }

const processText = () => {
  if (!textInput.value.trim()) { ElMessage.warning('请输入内容'); return }
  try {
    if (textMode.value === 'encode') {
      textOutput.value = btoa(unescape(encodeURIComponent(textInput.value)))
    } else {
      textOutput.value = decodeURIComponent(escape(atob(textInput.value.trim())))
    }
  } catch {
    ElMessage.error(textMode.value === 'encode' ? '编码失败' : '解码失败：请输入有效的 Base64 字符串')
  }
}

const clearText = () => { textInput.value = ''; textOutput.value = '' }

// ── 文件 → Base64 ─────────────────────────────────────────────
const fileInfo = ref<{ name: string; size: number; type: string } | null>(null)
const fileBase64 = ref('')
const fileLoading = ref(false)
const includeHeader = ref(false)
const fileOutput = computed(() =>
  fileBase64.value && fileInfo.value && includeHeader.value
    ? `data:${fileInfo.value.type};base64,${fileBase64.value}`
    : fileBase64.value
)

const handleFileChange = (file: any) => {
  const raw: File = file.raw
  if (raw.size > FILE_MAX_BYTES) {
    ElMessage.error(`文件过大（${fmtSize(raw.size)}），超过 10 MB 限制，请压缩后重试`)
    return
  }
  fileInfo.value = null
  fileBase64.value = ''
  fileLoading.value = true
  const reader = new FileReader()
  reader.onload = (e) => {
    const dataUrl = e.target?.result as string
    fileBase64.value = dataUrl.split(',')[1] || ''
    fileInfo.value = { name: raw.name, size: raw.size, type: raw.type || 'application/octet-stream' }
    fileLoading.value = false
    ElMessage.success('转换完成')
  }
  reader.onerror = () => { ElMessage.error('文件读取失败'); fileLoading.value = false }
  reader.readAsDataURL(raw)
}

const clearFile = () => { fileInfo.value = null; fileBase64.value = '' }

// ── Base64 → 文件 ─────────────────────────────────────────────
const EXT_MIME: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
  webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp', ico: 'image/x-icon',
  avif: 'image/avif', tiff: 'image/tiff', tif: 'image/tiff',
  pdf: 'application/pdf', txt: 'text/plain', csv: 'text/csv',
  json: 'application/json', xml: 'text/xml', html: 'text/html', css: 'text/css',
  js: 'text/javascript', zip: 'application/zip', gz: 'application/gzip',
  mp3: 'audio/mpeg', mp4: 'video/mp4', wav: 'audio/wav', webm: 'video/webm',
}

const getMime = (filename: string) =>
  EXT_MIME[filename.split('.').pop()?.toLowerCase() ?? ''] ?? 'application/octet-stream'

// MIME → 扩展名反查（取首个匹配）
const MIME_EXT: Record<string, string> = {}
for (const [ext, mime] of Object.entries(EXT_MIME)) {
  if (!MIME_EXT[mime]) MIME_EXT[mime] = ext
}

const b64Input = ref('')
const b64BaseName = ref('')
const b64Ext = ref('')
const b64Filename = computed(() => {
  const base = b64BaseName.value.trim()
  const ext = b64Ext.value.trim()
  if (!base && !ext) return ''
  return ext ? `${base || 'file'}.${ext}` : base
})
const b64PreviewUrl = ref('')
const b64DecodeError = ref('')

// 粘贴 Data URL 时自动填充文件名
watch(b64Input, (val) => {
  const m = val.trim().match(/^data:([^;]+);base64,/)
  if (m && !b64BaseName.value.trim() && !b64Ext.value.trim()) {
    const mime = m[1]
    const ext = MIME_EXT[mime] ?? mime.split('/').pop() ?? 'bin'
    b64BaseName.value = 'file'
    b64Ext.value = ext
  }
})

const b64Len = computed(() => b64Input.value.length)
const b64TooLong = computed(() => b64Len.value > B64_MAX_CHARS)
const b64LenWarn = computed(() => {
  if (b64TooLong.value)
    return { type: 'error' as const, msg: `内容过长（${fmtSize(b64Len.value)}字符），超出 14 MB 限制，无法处理` }
  if (b64Len.value > B64_MAX_CHARS * 0.8)
    return { type: 'warning' as const, msg: `内容较长（${fmtSize(b64Len.value)}字符），转换时可能需要短暂等待` }
  return null
})

const currentMime = computed(() => b64Filename.value.trim() ? getMime(b64Filename.value.trim()) : '')
const isImageMime = computed(() => currentMime.value.startsWith('image/'))

const decodedRaw = ref('')
const detectedMime = ref('')

// 通过二进制魔数检测文件类型
const detectMimeFromBytes = (b: Uint8Array): string | null => {
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return 'image/png'
  if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'image/jpeg'
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'image/gif'
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'application/pdf'
  if (b[0] === 0x50 && b[1] === 0x4B && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07)) return 'application/zip'
  if (b[0] === 0x42 && b[1] === 0x4D) return 'image/bmp'
  if (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) return 'audio/mpeg'
  if (b[0] === 0xFF && (b[1] & 0xE0) === 0xE0) return 'audio/mpeg'
  if (b[0] === 0x1F && b[1] === 0x8B) return 'application/gzip'
  if (b.length > 11 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46) {
    if (b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp'
    if (b[8] === 0x57 && b[9] === 0x41 && b[10] === 0x56 && b[11] === 0x45) return 'audio/wav'
    if (b[8] === 0x41 && b[9] === 0x56 && b[10] === 0x49 && b[11] === 0x20) return 'video/avi'
  }
  if (b.length > 7 && b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) return 'video/mp4'
  return null
}

const restoreB64 = () => {
  b64DecodeError.value = ''
  b64PreviewUrl.value = ''
  decodedRaw.value = ''
  detectedMime.value = ''
  const raw = b64Input.value.trim().replace(/^data:[^;]+;base64,/, '').replace(/\s/g, '')
  if (!raw) { ElMessage.warning('请输入 Base64 内容'); return }
  if (b64TooLong.value) { ElMessage.error('内容超出 14 MB 限制，无法处理'); return }
  let bytes: Uint8Array
  try {
    const bstr = atob(raw)
    bytes = new Uint8Array(bstr.length)
    for (let i = 0; i < bstr.length; i++) bytes[i] = bstr.charCodeAt(i)
  } catch {
    b64DecodeError.value = '无效的 Base64 字符串，请检查是否含有非法字符或格式错误'
    return
  }
  decodedRaw.value = raw
  const detected = detectMimeFromBytes(bytes)
  if (detected) {
    detectedMime.value = detected
    const ext = MIME_EXT[detected] ?? detected.split('/').pop() ?? 'bin'
    if (!b64Ext.value.trim()) b64Ext.value = ext
    if (!b64BaseName.value.trim()) b64BaseName.value = 'file'
  }
  const previewMime = detected ?? (b64Filename.value.trim() ? getMime(b64Filename.value.trim()) : '')
  if (previewMime?.startsWith('image/')) b64PreviewUrl.value = `data:${previewMime};base64,${raw}`
  ElMessage.success(detected ? `还原成功，检测到文件类型：${detected}` : '还原成功（未能自动识别文件类型）')
}

const downloadFile = () => {
  if (!decodedRaw.value) { ElMessage.warning('请先点击「还原」'); return }
  const base = b64BaseName.value.trim() || `file-${Date.now()}`
  const ext = b64Ext.value.trim()
  const filename = ext ? `${base}.${ext}` : base
  const mime = getMime(filename)
  const a = document.createElement('a')
  a.href = `data:${mime};base64,${decodedRaw.value}`
  a.download = filename
  a.click()
  ElMessage.success('文件已开始下载')
}

const clearB64 = () => {
  b64Input.value = ''
  b64BaseName.value = ''
  b64Ext.value = ''
  b64PreviewUrl.value = ''
  b64DecodeError.value = ''
  decodedRaw.value = ''
  detectedMime.value = ''
}
</script>

<template>
  <div class="flex flex-col mt-3 flex-1">
    <DetailHeader :title="title" />
    <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-300">
      <el-tabs v-model="activeTab">

        <!-- ══ 文本编解码 ══ -->
        <el-tab-pane label="文本编解码" name="text">
          <div class="space-y-3 pt-2">
            <el-radio-group v-model="textMode" @change="switchTextMode">
              <el-radio-button value="encode">编码（文本 → Base64）</el-radio-button>
              <el-radio-button value="decode">解码（Base64 → 文本）</el-radio-button>
            </el-radio-group>
            <el-input
              v-model="textInput"
              type="textarea"
              :rows="6"
              :placeholder="textMode === 'encode' ? '请输入要编码的文本（支持中文 / Unicode）' : '请输入要解码的 Base64 字符串'"
            />
            <div class="flex gap-2">
              <el-button type="primary" @click="processText">
                {{ textMode === 'encode' ? '编码' : '解码' }}
              </el-button>
              <el-button @click="clearText">清空</el-button>
              <el-button v-if="textOutput" @click="copy(textOutput)">复制结果</el-button>
            </div>
            <div v-if="textOutput">
              <el-input v-model="textOutput" type="textarea" :rows="6" readonly />
            </div>
          </div>
        </el-tab-pane>

        <!-- ══ 文件 → Base64 ══ -->
        <el-tab-pane label="文件 → Base64" name="fileEncode">
          <div class="space-y-4 pt-2">
            <el-upload action="#" :auto-upload="false" :on-change="handleFileChange" :show-file-list="false">
              <el-button type="primary">点击选择文件</el-button>
              <template #tip>
                <div class="text-xs text-slate-400 mt-1">支持任意格式，单文件最大 <b>10 MB</b></div>
              </template>
            </el-upload>

            <div v-if="fileLoading" class="text-center py-6 text-slate-500 dark:text-slate-400 text-sm">
              ⏳ 正在转换，请稍候...
            </div>

            <template v-if="fileInfo && !fileLoading">
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 rounded-lg bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 p-3 text-sm">
                <div>
                  <div class="text-xs text-slate-400 mb-0.5">文件名</div>
                  <div class="font-medium text-slate-800 dark:text-slate-100 break-all">{{ fileInfo.name }}</div>
                </div>
                <div>
                  <div class="text-xs text-slate-400 mb-0.5">原始大小</div>
                  <div class="font-medium text-slate-800 dark:text-slate-100">{{ fmtSize(fileInfo.size) }}</div>
                </div>
                <div>
                  <div class="text-xs text-slate-400 mb-0.5">MIME 类型</div>
                  <div class="font-medium text-slate-800 dark:text-slate-100 break-all">{{ fileInfo.type }}</div>
                </div>
                <div>
                  <div class="text-xs text-slate-400 mb-0.5">Base64 长度</div>
                  <div class="font-medium text-slate-800 dark:text-slate-100">{{ fmtSize(fileBase64.length) }} 字符</div>
                </div>
              </div>
              <div class="flex flex-wrap items-center gap-3">
                <el-button type="primary" @click="copy(fileOutput)">复制 Base64</el-button>
                <el-button @click="clearFile">清空</el-button>
                <el-checkbox v-model="includeHeader">包含 Data URL 头部</el-checkbox>
              </div>
              <el-input v-model="fileOutput" type="textarea" :rows="8" readonly />
            </template>
          </div>
        </el-tab-pane>

        <!-- ══ Base64 → 文件 ══ -->
        <el-tab-pane label="Base64 → 文件" name="fileDecode">
          <div class="space-y-3 pt-2">
            <div class="relative">
              <el-input
                v-model="b64Input"
                type="textarea"
                :rows="8"
                placeholder="粘贴 Base64 字符串或完整 Data URL（data:mime;base64,...）"
              />
              <span
                class="absolute bottom-2 right-3 text-xs pointer-events-none select-none"
                :class="b64TooLong ? 'text-red-400' : 'text-slate-400'"
              >
                {{ fmtSize(b64Len) }} 字符
              </span>
            </div>

            <el-alert v-if="b64LenWarn"
              :type="b64LenWarn.type" :title="b64LenWarn.msg"
              show-icon :closable="false"
            />
            <el-alert v-if="b64DecodeError"
              type="error" :title="b64DecodeError"
              show-icon :closable="false"
            />

            <div class="flex flex-wrap gap-2 items-center">
              <el-input v-model="b64BaseName" placeholder="文件名" clearable style="width:180px">
                <template #prepend>文件名</template>
              </el-input>
              <span class="text-slate-400 select-none">.</span>
              <el-select
                v-model="b64Ext"
                filterable
                allow-create
                default-first-option
                clearable
                placeholder="扩展名"
                style="width:120px"
              >
                <el-option-group label="图片">
                  <el-option v-for="e in ['png','jpg','gif','webp','bmp','svg','ico','avif']" :key="e" :label="e" :value="e" />
                </el-option-group>
                <el-option-group label="文档">
                  <el-option v-for="e in ['pdf','txt','csv','json','xml','html','css','js','md']" :key="e" :label="e" :value="e" />
                </el-option-group>
                <el-option-group label="压缩 / 音视频">
                  <el-option v-for="e in ['zip','gz','mp3','mp4','wav','webm','avi']" :key="e" :label="e" :value="e" />
                </el-option-group>
                <el-option label="bin" value="bin" />
              </el-select>
              <span v-if="b64Filename" class="text-sm text-slate-500 dark:text-slate-400 shrink-0">→ {{ b64Filename }}</span>
              <el-button
                type="primary"
                :disabled="!b64Input.trim() || b64TooLong"
                @click="restoreB64"
              >
                还原
              </el-button>
              <el-button
                type="success"
                :disabled="!decodedRaw"
                @click="downloadFile"
              >
                下载文件
              </el-button>
              <el-button @click="clearB64">清空</el-button>
            </div>

            <div v-if="detectedMime" class="text-xs text-slate-400 dark:text-slate-500">
              检测到文件类型：<span class="text-blue-500 font-medium">{{ detectedMime }}</span>
              <span v-if="detectedMime.startsWith('image/')" class="text-green-500 ml-2">· 已在下方显示预览</span>
            </div>
            <div v-else-if="currentMime && !decodedRaw" class="text-xs text-slate-400 dark:text-slate-500">
              将识别为：<span class="text-blue-500 font-medium">{{ currentMime }}</span>
              <span v-if="isImageMime" class="text-green-500 ml-2">· 还原后将在下方显示预览</span>
            </div>

            <div v-if="b64PreviewUrl" class="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/60 p-3">
              <p class="text-xs text-slate-500 dark:text-slate-400 mb-2">图片预览</p>
              <img
                :src="b64PreviewUrl"
                class="max-w-full max-h-80 mx-auto block rounded-lg shadow"
                alt="图片预览"
              />
            </div>
          </div>
        </el-tab-pane>

      </el-tabs>
    </div>

    <ToolDetail title="使用说明">
      <p>Base64 是一种将二进制数据编码为可打印 ASCII 字符的方式，常用于网络传输和数据嵌入。</p>
      <ul class="list-disc list-inside mt-1 space-y-1">
        <li><b>文本编解码</b>：文本与 Base64 字符串互转，支持中文及 Unicode</li>
        <li><b>文件 → Base64</b>：上传任意格式文件获取 Base64 字符串；单文件最大 <b>10 MB</b></li>
        <li><b>Base64 → 文件</b>：粘贴 Base64 后填写文件名（含扩展名）即可还原下载；图片类型支持在页面预览；最大 <b>14 MB</b></li>
        <li>所有操作均在本地浏览器完成，文件不会上传至任何服务器</li>
      </ul>
    </ToolDetail>
  </div>
</template>
