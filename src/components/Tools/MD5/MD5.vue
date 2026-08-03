<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, CopyDocument, Delete, Document, UploadFilled, Warning } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { Md5 } from 'ts-md5'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { copy } from '@/utils/string'
import { buildMd5Variants, formatFileSize } from '@/utils/workbenchTools'

type InputMode = 'text' | 'file'

const mode = ref<InputMode>('text')
const text = ref('Hello, tools-web!')
const expectedHash = ref('')
const fileHash = ref('')
const fileName = ref('')
const fileSize = ref(0)
const fileProgress = ref(0)
const hashingFile = ref(false)
const dragging = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const textHash = computed(() => String(Md5.hashStr(text.value)))
const activeHash = computed(() => mode.value === 'text' ? textHash.value : fileHash.value)
const variants = computed(() => buildMd5Variants(activeHash.value))
const byteLength = computed(() => new TextEncoder().encode(text.value).length)
const comparison = computed(() => {
  const expected = expectedHash.value.trim().toLowerCase()
  if (!expected) return { state: 'idle', label: '粘贴摘要即可比对' }
  if (!activeHash.value) return { state: 'idle', label: '等待摘要计算完成' }
  if (/^[a-f0-9]{32}$/.test(expected)) return expected === variants.value.lower32 ? { state: 'match', label: '32 位摘要一致' } : { state: 'mismatch', label: '32 位摘要不一致' }
  if (/^[a-f0-9]{16}$/.test(expected)) return expected === variants.value.lower16 ? { state: 'match', label: '16 位摘要一致' } : { state: 'mismatch', label: '16 位摘要不一致' }
  return { state: 'invalid', label: '请输入 16 或 32 位十六进制摘要' }
})

const resultItems = computed(() => [
  { label: '32 位 · 小写', value: variants.value.lower32, primary: true },
  { label: '32 位 · 大写', value: variants.value.upper32, primary: false },
  { label: '16 位 · 小写', value: variants.value.lower16, primary: false },
  { label: '16 位 · 大写', value: variants.value.upper16, primary: false },
])

function chooseExample(value: string) {
  mode.value = 'text'
  text.value = value
}

async function hashFile(file?: File) {
  if (!file) return
  mode.value = 'file'
  fileName.value = file.name
  fileSize.value = file.size
  fileProgress.value = 0
  fileHash.value = ''
  hashingFile.value = true
  const hasher = new Md5()
  const chunkSize = 2 * 1024 * 1024
  try {
    if (file.size === 0) {
      fileHash.value = String(hasher.end())
      fileProgress.value = 100
      return
    }
    for (let offset = 0; offset < file.size; offset += chunkSize) {
      const buffer = await file.slice(offset, Math.min(file.size, offset + chunkSize)).arrayBuffer()
      hasher.appendByteArray(new Uint8Array(buffer))
      fileProgress.value = Math.round(Math.min(file.size, offset + chunkSize) / file.size * 100)
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    }
    fileHash.value = String(hasher.end())
  } catch {
    fileHash.value = ''
    ElMessage.error('文件读取失败，请重新选择')
  } finally {
    hashingFile.value = false
  }
}

function handleFileInput(event: Event) {
  hashFile((event.target as HTMLInputElement).files?.[0])
}

function handleDrop(event: DragEvent) {
  dragging.value = false
  hashFile(event.dataTransfer?.files?.[0])
}

function clearFile() {
  fileHash.value = ''
  fileName.value = ''
  fileSize.value = 0
  fileProgress.value = 0
  if (fileInput.value) fileInput.value.value = ''
}

function copyAll() {
  copy(resultItems.value.map(item => `${item.label}: ${item.value}`).join('\n'))
}
</script>

<template>
  <div class="md5-page flex flex-col mt-3 flex-1">
    <DetailHeader title="MD5 摘要计算" />

    <section class="hero-card">
      <div><span class="eyebrow">MD5 DIGEST LAB</span><h2>计算摘要，不再误叫“加密”</h2><p>支持文本与大文件分块计算、16/32 位格式转换和校验值比对，全程在本地完成。</p></div>
      <div class="security-note"><el-icon><Warning /></el-icon><span><b>兼容用途</b>MD5 不适合密码存储或安全签名</span></div>
    </section>

    <section class="mode-tabs"><button :class="{ active: mode === 'text' }" @click="mode = 'text'"><span>01</span><div><strong>文本摘要</strong><small>输入即计算 · UTF-8</small></div></button><button :class="{ active: mode === 'file' }" @click="mode = 'file'"><span>02</span><div><strong>文件校验</strong><small>分块读取 · 不上传</small></div></button></section>

    <section class="workspace">
      <div class="input-column">
        <article v-if="mode === 'text'" class="panel input-panel">
          <div class="panel-heading"><div><span class="eyebrow">SOURCE TEXT</span><h3>待计算文本</h3></div><div class="input-stats"><span>{{ text.length }} 字符</span><span>{{ byteLength }} Bytes</span></div></div>
          <el-input v-model="text" type="textarea" :rows="9" resize="vertical" placeholder="输入任意文本，摘要会实时更新" />
          <div class="example-row"><span>快速示例</span><button @click="chooseExample('Hello, tools-web!')">英文短句</button><button @click="chooseExample('你好，世界！')">中文文本</button><button @click="chooseExample('{\n  &quot;id&quot;: 2026,\n  &quot;ready&quot;: true\n}')">JSON</button><button @click="text = ''">空字符串</button></div>
        </article>

        <article v-else class="panel file-panel">
          <div class="panel-heading"><div><span class="eyebrow">LOCAL FILE</span><h3>文件摘要</h3></div><span class="privacy-badge">浏览器本地读取</span></div>
          <div v-if="!fileName" class="drop-zone" :class="{ dragging }" @dragenter.prevent="dragging = true" @dragover.prevent="dragging = true" @dragleave.prevent="dragging = false" @drop.prevent="handleDrop">
            <el-icon><UploadFilled /></el-icon><strong>拖入文件开始计算</strong><span>无大小格式限制，按 2MB 分块读取</span><label><input ref="fileInput" type="file" @change="handleFileInput" />选择文件</label>
          </div>
          <div v-else class="file-progress-card">
            <div class="file-main"><div class="file-icon"><el-icon><Document /></el-icon></div><div><strong>{{ fileName }}</strong><span>{{ formatFileSize(fileSize) }} · {{ hashingFile ? '正在计算' : '计算完成' }}</span></div><el-button link type="danger" :icon="Delete" @click="clearFile">移除</el-button></div>
            <el-progress :percentage="fileProgress" :status="fileHash ? 'success' : undefined" />
            <label class="replace-file"><input ref="fileInput" type="file" @change="handleFileInput" />重新选择文件</label>
          </div>
        </article>

        <article class="panel compare-panel">
          <div class="panel-heading"><div><span class="eyebrow">VERIFY</span><h3>摘要比对</h3></div><span :class="['compare-status', comparison.state]"><el-icon v-if="comparison.state === 'match'"><Check /></el-icon>{{ comparison.label }}</span></div>
          <el-input v-model="expectedHash" size="large" placeholder="粘贴 16 或 32 位 MD5 摘要" clearable :disabled="!activeHash" />
          <p>适合比对下载文件校验值或旧系统中的兼容摘要；字母大小写不影响结果。</p>
        </article>
      </div>

      <aside class="panel result-panel">
        <div class="panel-heading"><div><span class="eyebrow">DIGEST OUTPUT</span><h3>计算结果</h3></div><el-button link type="primary" :icon="CopyDocument" :disabled="!activeHash" @click="copyAll">复制全部</el-button></div>
        <div v-if="activeHash" class="digest-visual"><span>MD5 · 128 BIT</span><code>{{ variants.lower32 }}</code><div><i v-for="index in 16" :key="index" :style="{ opacity: .25 + Number.parseInt(variants.lower32[index - 1], 16) / 22 }" /></div></div>
        <div v-if="activeHash" class="result-list"><button v-for="item in resultItems" :key="item.label" :class="{ primary: item.primary }" @click="copy(item.value)"><span>{{ item.label }}</span><code>{{ item.value }}</code><el-icon><CopyDocument /></el-icon></button></div>
        <div v-else class="result-empty">选择文件并等待计算完成后显示摘要</div>
        <div class="result-meta"><div><span>算法</span><strong>MD5</strong></div><div><span>输出长度</span><strong>128 bit</strong></div><div><span>输入模式</span><strong>{{ mode === 'text' ? 'UTF-8 文本' : '二进制文件' }}</strong></div></div>
      </aside>
    </section>

    <section class="knowledge-card"><div><span class="eyebrow">KNOW THE LIMIT</span><h3>摘要不是加密，也不能解密</h3></div><div class="knowledge-grid"><article><strong>适合</strong><p>文件完整性校验、缓存键、旧系统兼容、非安全场景的快速指纹。</p></article><article><strong>不适合</strong><p>密码存储、数字签名、防篡改认证或任何需要抗碰撞能力的安全用途。</p></article><article><strong>更安全的选择</strong><p>文件校验优先选择 SHA-256；密码应使用专门的慢哈希与随机盐。</p></article></div></section>

    <ToolDetail title="使用说明"><el-text>文本模式使用 UTF-8 编码实时计算；文件模式按固定分块读取，因此不会一次性把大文件全部载入内存。16 位 MD5 是标准 32 位摘要的中间 16 个字符，仅用于兼容，并不是另一种算法。</el-text></ToolDetail>
  </div>
</template>

<style scoped>
.md5-page { --blue: #2563eb; gap: 16px; }.hero-card, .panel, .knowledge-card { border: 1px solid #e2e8f0; border-radius: 22px; background: #fff; box-shadow: 0 12px 35px rgb(15 23 42 / 6%); }.hero-card { display: flex; align-items: center; justify-content: space-between; gap: 22px; padding: 25px 28px; background: radial-gradient(circle at 88% 10%, #dbeafe, transparent 28%), #fff; }.eyebrow { color: var(--blue); font-size:12px; font-weight: 800; letter-spacing: .15em; }.hero-card h2 { margin: 6px 0 4px; color: #0f172a; font-size: clamp(21px, 3vw, 28px); }.hero-card p { margin: 0; color: #64748b; font-size: 13px; }.security-note { display: flex; align-items: center; gap: 10px; flex: none; max-width: 230px; padding: 11px 13px; border: 1px solid #fed7aa; border-radius: 14px; color: #c2410c; background: #fff7ed; }.security-note > .el-icon { font-size: 20px; }.security-note span { display: flex; flex-direction: column; font-size:12px; }.security-note b { font-size:12px; }
.mode-tabs { display: grid; grid-template-columns: repeat(2, 1fr); gap: 9px; }.mode-tabs button { display: flex; align-items: center; gap: 11px; padding: 13px 16px; border: 1px solid #e2e8f0; border-radius: 16px; color: #64748b; background: #fff; text-align: left; cursor: pointer; transition: .18s ease; }.mode-tabs button:hover, .mode-tabs button.active { border-color: #93c5fd; background: #eff6ff; transform: translateY(-2px); }.mode-tabs button > span { display: grid; width: 34px; height: 34px; flex: none; place-items: center; border-radius: 10px; color: #fff; background: #94a3b8; font: 800 12px ui-monospace, monospace; }.mode-tabs button.active > span { background: var(--blue); }.mode-tabs div { display: flex; flex-direction: column; }.mode-tabs strong { color: #334155; font-size: 12px; }.mode-tabs small { color: #94a3b8; font-size:12px; }
.workspace { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(330px, .8fr); align-items: start; gap: 16px; }.input-column { display: flex; min-width: 0; flex-direction: column; gap: 16px; }.panel { padding: 21px; }.panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 15px; }.panel-heading h3 { margin: 3px 0 0; color: #0f172a; font-size: 16px; }.input-stats { display: flex; gap: 6px; }.input-stats span, .privacy-badge { padding: 4px 7px; border-radius: 99px; color: #64748b; background: #f1f5f9; font-size:12px; }.input-panel :deep(.el-textarea__inner), .compare-panel :deep(.el-input__wrapper) { border-radius: 13px; box-shadow: 0 0 0 1px #e2e8f0 inset; font-family: ui-monospace, monospace; }.example-row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 11px; }.example-row > span { color: #94a3b8; font-size:12px; }.example-row button { padding: 4px 8px; border: 0; border-radius: 99px; color: #475569; background: #f1f5f9; font-size:12px; cursor: pointer; }.drop-zone { display: flex; min-height: 250px; align-items: center; justify-content: center; flex-direction: column; border: 1px dashed #bfdbfe; border-radius: 16px; background: #f8fafc; transition: .18s ease; }.drop-zone.dragging { border-color: #2563eb; background: #eff6ff; }.drop-zone > .el-icon { color: #3b82f6; font-size: 36px; }.drop-zone strong { margin-top: 10px; color: #334155; }.drop-zone span { margin: 3px 0 15px; color: #94a3b8; font-size:12px; }.drop-zone label, .replace-file { padding: 7px 13px; border-radius: 9px; color: #fff; background: #2563eb; font-size:12px; cursor: pointer; }.drop-zone input, .replace-file input { display: none; }.file-progress-card { padding: 17px; border-radius: 16px; background: #f8fafc; }.file-main { display: flex; align-items: center; gap: 11px; margin-bottom: 17px; }.file-icon { display: grid; width: 43px; height: 43px; flex: none; place-items: center; border-radius: 12px; color: #2563eb; background: #dbeafe; }.file-main > div:nth-child(2) { display: flex; min-width: 0; flex: 1; flex-direction: column; }.file-main strong { color: #334155; overflow: hidden; text-overflow: ellipsis; font-size:12px; white-space: nowrap; }.file-main span { color: #94a3b8; font-size:12px; }.replace-file { display: block; width: fit-content; margin-top: 14px; }.compare-status { color: #94a3b8; font-size:12px; }.compare-status.match { display: flex; align-items: center; gap: 4px; color: #16a34a; }.compare-status.mismatch, .compare-status.invalid { color: #dc2626; }.compare-panel > p { margin: 9px 0 0; color: #94a3b8; font-size:12px; }
.result-panel { position: sticky; top: 14px; }.digest-visual { padding: 15px; border-radius: 15px; color: #dbeafe; background: linear-gradient(145deg, #172554, #1e3a8a); }.digest-visual > span { font-size:12px; letter-spacing: .15em; }.digest-visual code { display: block; margin: 8px 0 13px; overflow-wrap: anywhere; color: #fff; font-size: 13px; }.digest-visual > div { display: grid; grid-template-columns: repeat(16, 1fr); gap: 3px; }.digest-visual i { height: 21px; border-radius: 3px; background: #60a5fa; }.result-list { display: flex; flex-direction: column; gap: 7px; margin-top: 12px; }.result-list button { display: grid; grid-template-columns: 84px minmax(0, 1fr) auto; align-items: center; gap: 8px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 11px; color: #64748b; background: #f8fafc; text-align: left; cursor: pointer; }.result-list button.primary { border-color: #bfdbfe; background: #eff6ff; }.result-list span { font-size:12px; }.result-list code { overflow: hidden; color: #334155; text-overflow: ellipsis; font-size:12px; white-space: nowrap; }.result-empty { display: grid; min-height: 250px; place-items: center; color: #94a3b8; font-size:12px; }.result-meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 13px; }.result-meta div { display: flex; flex-direction: column; padding: 8px; border-radius: 9px; background: #f1f5f9; }.result-meta span { color: #94a3b8; font-size:12px; }.result-meta strong { color: #475569; font-size:12px; }
.knowledge-card { padding: 21px; }.knowledge-card h3 { margin: 3px 0 0; color: #0f172a; font-size: 17px; }.knowledge-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; margin-top: 15px; }.knowledge-grid article { padding: 13px; border-radius: 13px; background: #f8fafc; }.knowledge-grid strong { color: #334155; font-size:12px; }.knowledge-grid p { margin: 5px 0 0; color: #64748b; font-size:12px; line-height: 1.65; }
:global(html.dark .md5-page .hero-card), :global(html.dark .md5-page .panel), :global(html.dark .md5-page .knowledge-card), :global(html.dark .md5-page .mode-tabs button) { border-color: #334155; background: #1e293b; box-shadow: none; }:global(html.dark .md5-page .hero-card) { background: radial-gradient(circle at 88% 10%, #1e3a8a, transparent 28%), #1e293b; }:global(html.dark .md5-page h2), :global(html.dark .md5-page h3), :global(html.dark .md5-page .mode-tabs strong), :global(html.dark .md5-page .file-main strong), :global(html.dark .md5-page .drop-zone strong), :global(html.dark .md5-page .result-list code), :global(html.dark .md5-page .knowledge-grid strong) { color: #f8fafc; }:global(html.dark .md5-page .mode-tabs button.active), :global(html.dark .md5-page .result-list button.primary) { border-color: #1d4ed8; background: #172554; }:global(html.dark .md5-page .drop-zone), :global(html.dark .md5-page .file-progress-card), :global(html.dark .md5-page .result-list button), :global(html.dark .md5-page .result-meta div), :global(html.dark .md5-page .knowledge-grid article) { border-color: #334155; color: #cbd5e1; background: #0f172a; }:global(html.dark .md5-page .security-note) { border-color: #9a3412; color: #fdba74; background: #431407; }
@media (max-width: 920px) { .workspace { grid-template-columns: 1fr; }.result-panel { position: static; } }
@media (max-width: 640px) { .hero-card { align-items: flex-start; flex-direction: column; padding: 21px; }.security-note { max-width: none; }.mode-tabs { grid-template-columns: 1fr; }.panel, .knowledge-card { padding: 17px; border-radius: 19px; }.result-list button { grid-template-columns: 78px minmax(0, 1fr) auto; }.knowledge-grid { grid-template-columns: 1fr; }.result-meta { grid-template-columns: 1fr 1fr; } }
</style>
