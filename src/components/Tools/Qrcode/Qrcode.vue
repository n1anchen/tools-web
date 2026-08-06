<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Delete, Download, Refresh } from '@element-plus/icons-vue'
import CopyButton from '@/components/Common/CopyButton.vue'
import { ElMessage } from 'element-plus'
import QRCodeVue3 from 'qrcode-vue3'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import { autoDown } from '@/utils/file'
import { buildQrPayload, type QrContentType } from '@/utils/qrTools'

type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H'
type DotStyle = 'square' | 'dots' | 'rounded' | 'classy' | 'classy-rounded' | 'extra-rounded'
type CornerStyle = 'square' | 'dot' | 'extra-rounded'

const contentTypes: Array<{ value: QrContentType; label: string; hint: string }> = [
  { value: 'text', label: '文本', hint: '段落、口令或任意内容' },
  { value: 'url', label: '网址', hint: '网页、文档或活动链接' },
  { value: 'wifi', label: 'Wi-Fi', hint: '扫码连接无线网络' },
  { value: 'email', label: '邮件', hint: '预填收件人和正文' },
  { value: 'phone', label: '电话', hint: '扫码快速拨号' },
]

const form = reactive({
  type: 'text' as QrContentType,
  text: '把复杂的信息，变成一次轻松的扫码。',
  url: 'https://example.com',
  ssid: '',
  password: '',
  encryption: 'WPA' as 'WPA' | 'WEP' | 'nopass',
  hidden: false,
  email: '',
  subject: '',
  body: '',
  phone: '',
})

const design = reactive({
  size: 360,
  margin: 10,
  errorCorrectionLevel: 'Q' as ErrorCorrectionLevel,
  foreground: '#111827',
  background: '#FFFFFF',
  dotStyle: 'rounded' as DotStyle,
  cornerStyle: 'extra-rounded' as CornerStyle,
  logoSize: 0.25,
})

const logoDataUrl = ref('')
const logoName = ref('')
const logoInput = ref<HTMLInputElement | null>(null)
const preview = ref<HTMLElement | null>(null)

const qrValue = computed(() => buildQrPayload(form))
const currentType = computed(() => contentTypes.find(item => item.value === form.type)!)
const renderKey = computed(() => JSON.stringify({ value: qrValue.value, ...design, logo: logoDataUrl.value }))
const payloadLength = computed(() => new TextEncoder().encode(qrValue.value).length)

function handleLogo(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    ElMessage.warning('请选择图片文件')
    input.value = ''
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.warning('Logo 图片不能超过 5MB')
    input.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    logoDataUrl.value = String(reader.result ?? '')
    logoName.value = file.name
  }
  reader.readAsDataURL(file)
}

function removeLogo() {
  logoDataUrl.value = ''
  logoName.value = ''
  if (logoInput.value) logoInput.value.value = ''
}

function resetDesign() {
  Object.assign(design, {
    size: 360,
    margin: 10,
    errorCorrectionLevel: 'Q',
    foreground: '#111827',
    background: '#FFFFFF',
    dotStyle: 'rounded',
    cornerStyle: 'extra-rounded',
    logoSize: 0.25,
  })
  removeLogo()
}

function downloadQrCode() {
  if (!qrValue.value) return
  const image = preview.value?.querySelector('img')
  if (!image?.src) {
    ElMessage.warning('二维码仍在生成，请稍后重试')
    return
  }
  autoDown(image.src, `qrcode-${Date.now()}.png`)
}
</script>

<template>
  <div class="qr-page flex flex-col mt-3 flex-1">
    <ToolHero summary="内容、样式与预览，一处完成" />

    <section class="workspace">
      <div class="editor-column">
        <article class="panel content-panel">
          <div class="panel-heading"><div><span>01</span><div><h3>选择内容</h3><p>{{ currentType.hint }}</p></div></div><small>{{ payloadLength }} Bytes</small></div>
          <div class="type-switcher">
            <button v-for="item in contentTypes" :key="item.value" :class="{ active: form.type === item.value }" @click="form.type = item.value">{{ item.label }}</button>
          </div>

          <el-input v-if="form.type === 'text'" v-model="form.text" type="textarea" :rows="5" maxlength="1200" show-word-limit placeholder="输入要编码的文本" />
          <el-input v-else-if="form.type === 'url'" v-model="form.url" size="large" placeholder="https://example.com/page" clearable />
          <div v-else-if="form.type === 'wifi'" class="form-grid">
            <label class="wide"><span>网络名称（SSID）</span><el-input v-model="form.ssid" placeholder="例如 Home-WiFi" clearable /></label>
            <label><span>加密方式</span><el-select v-model="form.encryption"><el-option label="WPA / WPA2" value="WPA" /><el-option label="WEP" value="WEP" /><el-option label="无密码" value="nopass" /></el-select></label>
            <label v-if="form.encryption !== 'nopass'"><span>网络密码</span><el-input v-model="form.password" type="password" show-password placeholder="输入 Wi-Fi 密码" /></label>
            <label class="switch-field"><span>隐藏网络</span><el-switch v-model="form.hidden" /></label>
          </div>
          <div v-else-if="form.type === 'email'" class="form-grid">
            <label><span>收件人</span><el-input v-model="form.email" placeholder="name@example.com" clearable /></label>
            <label><span>主题</span><el-input v-model="form.subject" placeholder="邮件主题（可选）" clearable /></label>
            <label class="wide"><span>正文</span><el-input v-model="form.body" type="textarea" :rows="3" placeholder="邮件正文（可选）" /></label>
          </div>
          <el-input v-else v-model="form.phone" size="large" placeholder="例如 +86 138 0000 0000" clearable />
          <p v-if="!qrValue" class="empty-tip">填写必要内容后，右侧将自动生成二维码。</p>
        </article>

        <article class="panel design-panel">
          <div class="panel-heading"><div><span>02</span><div><h3>调整样式</h3><p>导出尺寸与视觉风格彼此独立</p></div></div><el-button link :icon="Refresh" @click="resetDesign">恢复默认</el-button></div>
          <div class="design-grid">
            <label><span>导出尺寸 <b>{{ design.size }}px</b></span><el-slider v-model="design.size" :min="160" :max="1000" :step="20" /></label>
            <label><span>留白边距 <b>{{ design.margin }}px</b></span><el-slider v-model="design.margin" :min="0" :max="32" /></label>
            <label><span>纠错级别</span><el-select v-model="design.errorCorrectionLevel"><el-option label="L · 约 7%" value="L" /><el-option label="M · 约 15%" value="M" /><el-option label="Q · 约 25%" value="Q" /><el-option label="H · 约 30%" value="H" /></el-select></label>
            <label><span>码点样式</span><el-select v-model="design.dotStyle"><el-option label="圆润" value="rounded" /><el-option label="圆点" value="dots" /><el-option label="方形" value="square" /><el-option label="优雅" value="classy" /><el-option label="优雅圆角" value="classy-rounded" /><el-option label="大圆角" value="extra-rounded" /></el-select></label>
            <label><span>定位角样式</span><el-select v-model="design.cornerStyle"><el-option label="大圆角" value="extra-rounded" /><el-option label="方形" value="square" /><el-option label="圆点" value="dot" /></el-select></label>
            <div class="color-field"><span>颜色</span><div><label><el-color-picker v-model="design.foreground" />前景</label><label><el-color-picker v-model="design.background" />背景</label></div></div>
          </div>
          <div class="logo-row">
            <div><strong>中心 Logo</strong><span>建议使用正方形 PNG / SVG，最大 5MB</span></div>
            <div class="logo-actions">
              <label class="upload-button"><input ref="logoInput" type="file" accept="image/*" @change="handleLogo" />{{ logoName || '选择图片' }}</label>
              <el-button v-if="logoDataUrl" link type="danger" :icon="Delete" @click="removeLogo">移除</el-button>
            </div>
          </div>
          <label v-if="logoDataUrl" class="logo-size"><span>Logo 比例 <b>{{ Math.round(design.logoSize * 100) }}%</b></span><el-slider v-model="design.logoSize" :min="0.12" :max="0.4" :step="0.01" /></label>
        </article>
      </div>

      <aside class="preview-card">
        <div class="preview-heading"><div><span class="eyebrow">LIVE PREVIEW</span><h3>扫码预览</h3></div><span class="status-dot"><i />实时</span></div>
        <div ref="preview" class="qr-stage" :class="{ empty: !qrValue }">
          <QRCodeVue3
            v-if="qrValue"
            :key="renderKey"
            :width="design.size"
            :height="design.size"
            :value="qrValue"
            :image="logoDataUrl"
            :margin="design.margin"
            :qr-options="{ typeNumber: 0, mode: 'Byte', errorCorrectionLevel: design.errorCorrectionLevel }"
            :image-options="{ hideBackgroundDots: true, imageSize: design.logoSize, margin: 3 }"
            :dots-options="{ type: design.dotStyle, color: design.foreground }"
            :background-options="{ color: design.background }"
            :corners-square-options="{ type: design.cornerStyle, color: design.foreground }"
            :corners-dot-options="{ type: 'dot', color: design.foreground }"
            file-ext="png"
            imgclass="qr-output-image"
          />
          <div v-else><b>等待内容</b><span>二维码将在这里出现</span></div>
        </div>
        <div class="payload-preview"><span>编码内容</span><code>{{ qrValue || '尚未填写' }}</code></div>
        <div class="preview-actions"><CopyButton :text="qrValue" :disabled="!qrValue" label="复制内容" /><el-button type="primary" :icon="Download" :disabled="!qrValue" @click="downloadQrCode">下载 PNG</el-button></div>
        <p>含 Logo 时建议使用 Q 或 H 纠错级别，并在实际设备上试扫。</p>
      </aside>
    </section>

    <ToolGuide title="使用建议">
      <el-text>二维码承载内容越短越容易识别。用于印刷时建议导出较大尺寸、保留足够边距，并避免前景色与背景色过于接近；Wi-Fi 密码与邮件内容都只在当前浏览器中编码，不会上传到服务器。</el-text>
    </ToolGuide>
  </div>
</template>

<style scoped>
.qr-page {
  --blue: #2563eb;
  gap: 16px;
}
.panel, .preview-card {
  border: 1px solid var(--c-border);
  border-radius: var(--radius-card);
  background: var(--c-surface);
  box-shadow: var(--shadow-card);
}
.eyebrow {
  color: var(--blue);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .15em;
}
.workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(300px, .75fr);
  align-items: start;
  gap: 16px;
}
.editor-column {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 16px;
}
.panel {
  padding: 22px;
}
.panel-heading, .panel-heading > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 11px;
}
.panel-heading > div > span {
  display: grid;
  width: 33px;
  height: 33px;
  place-items: center;
  border-radius: var(--radius-sm);
  color: var(--c-on-accent);
  background: var(--blue);
  font: 800 11px ui-monospace, monospace;
}
.panel-heading h3, .preview-heading h3 {
  margin: 0;
  color: var(--c-text-primary);
  font-size: 16px;
}
.panel-heading p {
  margin: 2px 0 0;
  color: var(--c-text-muted);
  font-size: 10px;
}
.panel-heading small {
  color: var(--c-text-muted);
  font: 10px ui-monospace, monospace;
}
.type-switcher {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
  margin: 18px 0 15px;
  padding: 5px;
  border-radius: var(--radius-md);
  background: #f1f5f9;
}
.type-switcher button {
  padding: 8px 5px;
  border: 0;
  border-radius: var(--radius-sm);
  color: var(--c-text-secondary);
  background: transparent;
  font-size: 11px;
  cursor: pointer;
}
.type-switcher button.active {
  color: #1d4ed8;
  background: var(--c-surface);
  box-shadow: 0 3px 10px rgb(15 23 42 / 9%);
}
.content-panel :deep(.el-textarea__inner), .content-panel :deep(.el-input__wrapper), .design-panel :deep(.el-select__wrapper) {
  border-radius: var(--radius-sm);
  box-shadow: 0 0 0 1px #e2e8f0 inset;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.form-grid label {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 6px;
}
.form-grid label > span, .design-grid label > span, .color-field > span, .logo-size > span {
  color: var(--c-text-secondary);
  font-size: 10px;
}
.form-grid .wide {
  grid-column: 1 / -1;
}
.form-grid .switch-field {
  justify-content: flex-end;
  flex-direction: row;
  align-items: center;
}
.empty-tip {
  margin: 10px 0 0;
  color: #f59e0b;
  font-size: 10px;
}
.design-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 17px 24px;
  margin-top: 20px;
}
.design-grid > label {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
}
.design-grid b, .logo-size b {
  float: right;
  color: var(--c-text-strong);
  font-family: ui-monospace, monospace;
}
.color-field > div {
  display: flex;
  gap: 16px;
  margin-top: 7px;
}
.color-field label {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--c-text-body);
  font-size: 10px;
}
.logo-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  margin-top: 20px;
  padding: 13px;
  border-radius: var(--radius-md);
  background: var(--c-surface-subtle);
}
.logo-row > div:first-child {
  display: flex;
  flex-direction: column;
}
.logo-row strong {
  color: var(--c-text-strong);
  font-size: 11px;
}
.logo-row span {
  color: var(--c-text-muted);
  font-size: 9px;
}
.logo-actions {
  display: flex;
  align-items: center;
  gap: 5px;
}
.upload-button {
  max-width: 160px;
  padding: 7px 11px;
  overflow: hidden;
  border: 1px solid #bfdbfe;
  border-radius: var(--radius-sm);
  color: #1d4ed8;
  background: #eff6ff;
  text-overflow: ellipsis;
  font-size: 10px;
  white-space: nowrap;
  cursor: pointer;
}
.upload-button input {
  display: none;
}
.logo-size {
  display: block;
  margin-top: 12px;
}
.preview-card {
  position: sticky;
  top: 14px;
  padding: 21px;
}
.preview-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.preview-heading h3 {
  margin-top: 3px;
}
.status-dot {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #16a34a;
  font-size: 9px;
}
.status-dot i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 0 4px #dcfce7;
}
.qr-stage {
  display: grid;
  min-height: 270px;
  margin: 17px 0 13px;
  padding: 16px;
  overflow: hidden;
  place-items: center;
  border: 1px solid var(--c-border);
  border-radius: 17px;
  background-color: var(--c-surface);
  background-image: linear-gradient(45deg, #f8fafc 25%, transparent 25%), linear-gradient(-45deg, #f8fafc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f8fafc 75%), linear-gradient(-45deg, transparent 75%, #f8fafc 75%);
  background-position: 0 0, 0 8px, 8px -8px, -8px 0;
  background-size: 16px 16px;
}
.qr-stage :deep(.qr-output-image) {
  display: block;
  max-width: 100%;
  height: auto;
}
.qr-stage.empty > div {
  display: flex;
  flex-direction: column;
  color: var(--c-text-muted);
  text-align: center;
}
.qr-stage.empty b {
  color: var(--c-text-secondary);
}
.qr-stage.empty span {
  margin-top: 4px;
  font-size: 10px;
}
.payload-preview {
  padding: 11px;
  border-radius: var(--radius-sm);
  background: var(--c-surface-subtle);
}
.payload-preview span {
  display: block;
  margin-bottom: 4px;
  color: var(--c-text-muted);
  font-size: 9px;
}
.payload-preview code {
  display: block;
  max-height: 52px;
  overflow: hidden;
  color: var(--c-text-body);
  font-size: 9px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.preview-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 12px;
}
.preview-card > p {
  margin: 10px 0 0;
  color: var(--c-text-muted);
  font-size: 9px;
  line-height: 1.5;
  text-align: center;
}
:global(html.dark .qr-page .panel), :global(html.dark .qr-page .preview-card) {
  border-color: var(--c-border);
  background: var(--c-surface);
  box-shadow: none;
}
:global(html.dark .qr-page h3), :global(html.dark .qr-page .design-grid b), :global(html.dark .qr-page .logo-size b), :global(html.dark .qr-page .logo-row strong) {
  color: #f8fafc;
}
:global(html.dark .qr-page .type-switcher), :global(html.dark .qr-page .logo-row), :global(html.dark .qr-page .payload-preview) {
  background: var(--c-surface-subtle);
}
:global(html.dark .qr-page .type-switcher button.active) {
  color: #93c5fd;
  background: #334155;
}
:global(html.dark .qr-page .color-field label), :global(html.dark .qr-page .payload-preview code) {
  color: var(--c-text-secondary);
}
@media (max-width: 930px) {
  .workspace {
    grid-template-columns: 1fr;
  }
  .preview-card {
    position: static;
  }
  .qr-stage {
    min-height: 320px;
  }
}
@media (max-width: 640px) {
  .panel, .preview-card {
    padding: 17px;
    border-radius: 19px;
  }
  .type-switcher {
    grid-template-columns: repeat(3, 1fr);
  }
  .form-grid, .design-grid {
    grid-template-columns: 1fr;
  }
  .form-grid .wide {
    grid-column: auto;
  }
  .logo-row {
    align-items: flex-start;
    flex-direction: column;
  }
  .logo-actions {
    width: 100%;
  }
  .upload-button {
    flex: 1;
    max-width: none;
  }
  .qr-stage {
    min-height: 280px;
  }
  .preview-actions {
    grid-template-columns: 1fr;
  }
}
</style>
