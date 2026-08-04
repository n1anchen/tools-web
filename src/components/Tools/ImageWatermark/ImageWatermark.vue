<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { Delete, Download, Picture, Refresh, UploadFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import { autoDown } from '@/utils/file'
import {
  getRotatedBounds,
  getWatermarkPlacements,
  type WatermarkPosition,
} from '@/utils/imageStudio'

const MAX_IMAGE_BYTES = 30 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

const fileInput = ref<HTMLInputElement | null>(null)
const imageElement = ref<HTMLImageElement | null>(null)
const canvasElement = ref<HTMLCanvasElement | null>(null)
const imageUrl = ref('')
const objectUrl = ref('')
const dragging = ref(false)
const rendering = ref(false)
const fileMeta = reactive({ name: '', size: 0, type: '', width: 0, height: 0 })

const state = reactive({
  text: '© 2026 在线工具箱',
  fontSize: 42,
  fontWeight: '700',
  fontFamily: 'system-ui, sans-serif',
  color: '#ffffff',
  opacity: .58,
  position: 'bottomRight' as WatermarkPosition,
  rotate: -18,
  padding: 32,
  tileGap: 96,
  outline: true,
  shadow: true,
  format: 'png' as 'png' | 'jpeg' | 'webp',
  quality: .92,
})

const positions: Array<{ label: string; value: WatermarkPosition; icon: string }> = [
  { label: '左上', value: 'topLeft', icon: '↖' },
  { label: '右上', value: 'topRight', icon: '↗' },
  { label: '居中', value: 'center', icon: '◎' },
  { label: '左下', value: 'bottomLeft', icon: '↙' },
  { label: '右下', value: 'bottomRight', icon: '↘' },
  { label: '平铺', value: 'tile', icon: '▦' },
]

const formattedFileSize = computed(() => {
  if (!fileMeta.size) return '—'
  return fileMeta.size >= 1024 * 1024
    ? `${(fileMeta.size / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(fileMeta.size / 1024))} KB`
})

const outputLabel = computed(() => state.format === 'jpeg' ? 'JPG' : state.format.toUpperCase())
const watermarkCount = ref(0)

function releaseObjectUrl() {
  if (objectUrl.value) URL.revokeObjectURL(objectUrl.value)
  objectUrl.value = ''
}

function loadSource(source: string, meta: { name: string; size: number; type: string }, revoke = false) {
  releaseObjectUrl()
  if (revoke) objectUrl.value = source
  imageUrl.value = source
  Object.assign(fileMeta, { ...meta, width: 0, height: 0 })
}

function loadFile(file?: File) {
  if (!file) return
  if (!ALLOWED_TYPES.has(file.type)) {
    ElMessage.warning('请选择 PNG、JPEG 或 WebP 图片')
    return
  }
  if (file.size > MAX_IMAGE_BYTES) {
    ElMessage.warning('图片不能超过 30 MB')
    return
  }
  loadSource(URL.createObjectURL(file), { name: file.name, size: file.size, type: file.type }, true)
}

function handleInput(event: Event) {
  loadFile((event.target as HTMLInputElement).files?.[0])
}

function handleDrop(event: DragEvent) {
  dragging.value = false
  loadFile(event.dataTransfer?.files?.[0])
}

function loadDemo() {
  const canvas = document.createElement('canvas')
  canvas.width = 1440
  canvas.height = 900
  const context = canvas.getContext('2d')!
  const gradient = context.createLinearGradient(0, 0, 1440, 900)
  gradient.addColorStop(0, '#0f172a')
  gradient.addColorStop(.48, '#1d4ed8')
  gradient.addColorStop(1, '#f97316')
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = 'rgba(255,255,255,.12)'
  context.beginPath()
  context.arc(1110, 180, 260, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = '#ffffff'
  context.font = '800 96px system-ui, sans-serif'
  context.fillText('LOCAL', 96, 180)
  context.fillText('IMAGE LAB', 96, 286)
  context.font = '32px system-ui, sans-serif'
  context.fillStyle = 'rgba(255,255,255,.8)'
  context.fillText('用示例图片试试水印位置、描边与平铺效果', 104, 356)
  for (let index = 0; index < 5; index += 1) {
    context.fillStyle = `hsla(${205 + index * 23}, 90%, 70%, .68)`
    context.fillRect(110 + index * 230, 520 - index * 45, 170, 220 + index * 45)
  }
  const source = canvas.toDataURL('image/png')
  loadSource(source, { name: '水印工作室示例.png', size: Math.round(source.length * .75), type: 'image/png' })
}

function drawWatermark() {
  const image = imageElement.value
  const canvas = canvasElement.value
  if (!image || !canvas || !image.naturalWidth) return
  rendering.value = true
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const context = canvas.getContext('2d')!
  context.clearRect(0, 0, canvas.width, canvas.height)
  if (state.format === 'jpeg') {
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
  }
  context.drawImage(image, 0, 0)

  const lines = state.text.split('\n').map(line => line.trim()).filter(Boolean)
  if (!lines.length) {
    watermarkCount.value = 0
    rendering.value = false
    return
  }
  const lineHeight = state.fontSize * 1.22
  context.font = `${state.fontWeight} ${state.fontSize}px ${state.fontFamily}`
  const textWidth = Math.max(...lines.map(line => context.measureText(line).width))
  const textHeight = lineHeight * lines.length
  const rotated = getRotatedBounds(textWidth, textHeight, state.rotate)
  const points = getWatermarkPlacements(
    canvas.width,
    canvas.height,
    rotated.width,
    rotated.height,
    state.position,
    state.padding,
    state.tileGap,
  )
  watermarkCount.value = points.length

  points.forEach(point => {
    context.save()
    context.translate(point.x, point.y)
    context.rotate(state.rotate * Math.PI / 180)
    context.globalAlpha = state.opacity
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillStyle = state.color
    if (state.shadow) {
      context.shadowColor = 'rgba(0, 0, 0, .55)'
      context.shadowBlur = Math.max(2, state.fontSize * .16)
      context.shadowOffsetY = Math.max(1, state.fontSize * .08)
    }
    lines.forEach((line, index) => {
      const y = (index - (lines.length - 1) / 2) * lineHeight
      if (state.outline) {
        context.lineWidth = Math.max(1.5, state.fontSize * .06)
        context.strokeStyle = state.color.toLowerCase() === '#ffffff' ? 'rgba(15,23,42,.85)' : 'rgba(255,255,255,.8)'
        context.strokeText(line, 0, y)
      }
      context.fillText(line, 0, y)
    })
    context.restore()
  })
  rendering.value = false
}

function handleImageReady() {
  const image = imageElement.value
  if (!image) return
  fileMeta.width = image.naturalWidth
  fileMeta.height = image.naturalHeight
  drawWatermark()
}

function resetSettings() {
  Object.assign(state, {
    text: '© 2026 在线工具箱', fontSize: 42, fontWeight: '700', fontFamily: 'system-ui, sans-serif',
    color: '#ffffff', opacity: .58, position: 'bottomRight', rotate: -18, padding: 32,
    tileGap: 96, outline: true, shadow: true, format: 'png', quality: .92,
  })
}

function clearImage() {
  releaseObjectUrl()
  imageUrl.value = ''
  Object.assign(fileMeta, { name: '', size: 0, type: '', width: 0, height: 0 })
  watermarkCount.value = 0
  if (fileInput.value) fileInput.value.value = ''
}

function downloadImage() {
  const canvas = canvasElement.value
  if (!canvas || !imageUrl.value) return
  const mime = `image/${state.format}`
  const extension = state.format === 'jpeg' ? 'jpg' : state.format
  canvas.toBlob(blob => {
    if (!blob) {
      ElMessage.error('图片导出失败，请尝试其他格式')
      return
    }
    const baseName = fileMeta.name.replace(/\.[^.]+$/, '') || 'watermarked'
    autoDown(URL.createObjectURL(blob), `${baseName}-watermarked.${extension}`)
    ElMessage.success(`已导出 ${outputLabel.value} 图片`)
  }, mime, state.quality)
}

watch(state, () => nextTick(drawWatermark), { deep: true })
onBeforeUnmount(releaseObjectUrl)
</script>

<template>
  <div class="watermark-page flex flex-col mt-3 flex-1">
    <ToolHero summary="边调参数，边看最终成片">
      <template #metrics>
        <div class="hero-metrics">
          <div><span>定位模式</span><strong>6</strong></div>
          <div><span>导出格式</span><strong>3</strong></div>
          <div><span>图片上传</span><strong>0</strong></div>
        </div>
      </template>
    </ToolHero>

    <input ref="fileInput" class="sr-only" type="file" accept="image/png,image/jpeg,image/webp" @change="handleInput">

    <section
      v-if="!imageUrl"
      class="upload-card"
      :class="{ dragging }"
      @dragenter.prevent="dragging = true"
      @dragover.prevent
      @dragleave.prevent="dragging = false"
      @drop.prevent="handleDrop"
    >
      <div class="upload-icon"><el-icon><UploadFilled /></el-icon></div>
      <span class="eyebrow">START WITH AN IMAGE</span>
      <h3>拖入图片，开始设计水印</h3>
      <p>支持 PNG、JPEG、WebP，单张不超过 30 MB；图片只会读取到当前浏览器。</p>
      <div class="upload-actions">
        <el-button type="primary" size="large" :icon="Picture" @click="fileInput?.click()">选择图片</el-button>
        <el-button size="large" @click="loadDemo">载入示例</el-button>
      </div>
    </section>

    <section v-else class="studio-grid">
      <article class="preview-card">
        <header class="card-heading">
          <div><span class="eyebrow">LIVE CANVAS</span><h3>实时预览</h3></div>
          <div class="header-actions">
            <el-button :icon="Refresh" @click="fileInput?.click()">换图</el-button>
            <el-button :icon="Delete" plain type="danger" @click="clearImage">移除</el-button>
          </div>
        </header>
        <div class="canvas-stage">
          <canvas ref="canvasElement" aria-label="水印效果预览" />
          <div v-if="rendering" class="rendering-badge">正在更新预览…</div>
        </div>
        <div class="image-meta">
          <div><span>源文件</span><strong>{{ fileMeta.name }}</strong></div>
          <div><span>原始尺寸</span><strong>{{ fileMeta.width }} × {{ fileMeta.height }}</strong></div>
          <div><span>文件大小</span><strong>{{ formattedFileSize }}</strong></div>
          <div><span>水印数量</span><strong>{{ watermarkCount }}</strong></div>
        </div>
        <img ref="imageElement" :src="imageUrl" class="source-image" alt="待添加水印的原图" @load="handleImageReady">
      </article>

      <aside class="settings-card">
        <header class="card-heading">
          <div><span class="eyebrow">WATERMARK SETTINGS</span><h3>水印设置</h3></div>
          <button class="text-button" type="button" @click="resetSettings">恢复默认</button>
        </header>

        <div class="field-group">
          <label for="watermark-text">水印文字 <small>支持换行</small></label>
          <el-input id="watermark-text" v-model="state.text" type="textarea" :rows="2" maxlength="80" show-word-limit />
        </div>

        <div class="two-columns">
          <div class="field-group"><label>字号</label><el-input-number v-model="state.fontSize" :min="12" :max="240" /></div>
          <div class="field-group"><label>字重</label><el-select v-model="state.fontWeight"><el-option label="常规" value="400" /><el-option label="中等" value="600" /><el-option label="粗体" value="700" /><el-option label="特粗" value="800" /></el-select></div>
          <div class="field-group"><label>颜色</label><div class="color-row"><el-color-picker v-model="state.color" /><code>{{ state.color }}</code></div></div>
          <div class="field-group"><label>字体</label><el-select v-model="state.fontFamily"><el-option label="系统无衬线" value="system-ui, sans-serif" /><el-option label="衬线体" value="Georgia, serif" /><el-option label="等宽体" value="ui-monospace, monospace" /></el-select></div>
        </div>

        <div class="slider-field"><label><span>透明度</span><strong>{{ Math.round(state.opacity * 100) }}%</strong></label><el-slider v-model="state.opacity" :min=".05" :max="1" :step=".05" /></div>
        <div class="slider-field"><label><span>旋转角度</span><strong>{{ state.rotate }}°</strong></label><el-slider v-model="state.rotate" :min="-90" :max="90" /></div>

        <div class="field-group">
          <label>水印位置</label>
          <div class="position-grid">
            <button v-for="item in positions" :key="item.value" type="button" :class="{ active: state.position === item.value }" @click="state.position = item.value">
              <span>{{ item.icon }}</span>{{ item.label }}
            </button>
          </div>
        </div>

        <div v-if="state.position === 'tile'" class="slider-field"><label><span>平铺间距</span><strong>{{ state.tileGap }}px</strong></label><el-slider v-model="state.tileGap" :min="24" :max="240" /></div>
        <div v-else class="slider-field"><label><span>边缘留白</span><strong>{{ state.padding }}px</strong></label><el-slider v-model="state.padding" :min="0" :max="160" /></div>

        <div class="toggle-row">
          <label><span>文字描边<small>复杂背景更清晰</small></span><el-switch v-model="state.outline" /></label>
          <label><span>投射阴影<small>增强层次感</small></span><el-switch v-model="state.shadow" /></label>
        </div>

        <div class="export-box">
          <div class="field-group"><label>导出格式</label><el-radio-group v-model="state.format"><el-radio-button value="png">PNG</el-radio-button><el-radio-button value="jpeg">JPG</el-radio-button><el-radio-button value="webp">WebP</el-radio-button></el-radio-group></div>
          <div v-if="state.format !== 'png'" class="slider-field"><label><span>导出质量</span><strong>{{ Math.round(state.quality * 100) }}%</strong></label><el-slider v-model="state.quality" :min=".4" :max="1" :step=".02" /></div>
          <el-button class="download-button" type="primary" size="large" :icon="Download" @click="downloadImage">下载 {{ outputLabel }}</el-button>
        </div>
      </aside>
    </section>

    <section class="feature-strip">
      <article><b>01</b><div><strong>旋转边界感知</strong><p>角落定位按旋转后的文字外框计算，减少水印越界裁切。</p></div></article>
      <article><b>02</b><div><strong>所见即所得</strong><p>设置变化会立即重绘原尺寸画布，导出内容与预览一致。</p></div></article>
      <article><b>03</b><div><strong>本地隐私</strong><p>读取、绘制和导出均在浏览器完成，不上传图片内容。</p></div></article>
    </section>

    <ToolGuide title="使用说明">
      <p>上传图片或载入示例后，可调整文字、字体、颜色、旋转、描边、阴影和定位。平铺模式会自动根据文字旋转后的尺寸分布水印；JPG/WebP 可进一步设置导出质量。透明 PNG 导出为 JPG 时会自动使用白色背景。</p>
    </ToolGuide>
  </div>
</template>

<style scoped>
.watermark-page { --studio-accent: #2563eb; --studio-warm: #f97316; gap: 16px; }
.upload-card, .preview-card, .settings-card, .feature-strip article { border: 1px solid #e2e8f0; background: #fff; box-shadow: 0 16px 40px rgba(15, 23, 42, .06); }
.eyebrow { display: block; margin-bottom: 7px; color: #60a5fa; font-size: 11px; font-weight: 900; letter-spacing: .16em; }
.hero-metrics { display: grid; grid-template-columns: repeat(3, minmax(96px, 1fr)); min-width: 320px; overflow: hidden; border: 1px solid #e0e9f4; border-radius: 18px; background: rgba(255,255,255,.78); }
.hero-metrics div { padding: 12px 14px; text-align: center; border-left: 1px solid #e5edf6; }
.hero-metrics div:first-child { border-left: 0; }
.hero-metrics span, .hero-metrics strong { display: block; }
.hero-metrics span { margin-top: 4px; color: #7a899c; font-size: 12px; }
.hero-metrics strong { overflow: hidden; color: #334155; font-size: 18px; text-overflow: ellipsis; white-space: nowrap; }
.upload-card { min-height: 430px; padding: 58px 24px; border-radius: 24px; text-align: center; display: grid; place-items: center; align-content: center; transition: .2s ease; }
.upload-card.dragging { border-color: var(--studio-accent); background: #eff6ff; transform: translateY(-2px); }
.upload-icon { display: grid; place-items: center; width: 72px; height: 72px; margin-bottom: 18px; border-radius: 22px; color: #fff; font-size: 34px; background: linear-gradient(145deg, #2563eb, #0d9488); box-shadow: 0 14px 28px rgba(37,99,235,.25); }
.upload-card h3, .card-heading h3 { margin: 0; color: #0f172a; }.upload-card h3 { font-size: 24px; }.upload-card p { max-width: 560px; margin: 10px auto 22px; color: #64748b; line-height: 1.7; }.upload-actions { display: flex; gap: 10px; }
.studio-grid { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(330px, .8fr); gap: 16px; align-items: start; }
.preview-card, .settings-card { border-radius: 24px; padding: 20px; }.settings-card { position: sticky; top: 82px; }
.card-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }.card-heading .eyebrow { margin-bottom: 3px; }.header-actions { display: flex; gap: 8px; }.text-button { border: 0; background: none; color: #64748b; cursor: pointer; font-size: 12px; }
.canvas-stage { position: relative; min-height: 420px; display: grid; place-items: center; padding: 18px; overflow: auto; border-radius: 18px; background-color: #e2e8f0; background-image: linear-gradient(45deg,#cbd5e1 25%,transparent 25%),linear-gradient(-45deg,#cbd5e1 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#cbd5e1 75%),linear-gradient(-45deg,transparent 75%,#cbd5e1 75%); background-size: 24px 24px; background-position: 0 0,0 12px,12px -12px,-12px 0; }
.canvas-stage canvas { display: block; max-width: 100%; max-height: 68vh; object-fit: contain; box-shadow: 0 22px 44px rgba(15,23,42,.22); }.rendering-badge { position: absolute; right: 12px; bottom: 12px; padding: 6px 10px; border-radius: 999px; color: #fff; background: rgba(15,23,42,.75); font-size: 11px; }
.source-image { display: none; }.image-meta { display: grid; grid-template-columns: 1.5fr repeat(3, 1fr); margin-top: 14px; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; }.image-meta div { min-width: 0; padding: 11px 13px; border-right: 1px solid #e2e8f0; }.image-meta div:last-child { border: 0; }.image-meta span, .image-meta strong { display: block; }.image-meta span { color: #94a3b8; font-size: 10px; }.image-meta strong { margin-top: 3px; overflow: hidden; color: #334155; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.field-group { margin-bottom: 15px; }.field-group > label, .slider-field > label { display: flex; justify-content: space-between; margin-bottom: 7px; color: #475569; font-size: 12px; font-weight: 700; }.field-group label small, .toggle-row small { color: #94a3b8; font-weight: 400; }.two-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 0 10px; }.two-columns :deep(.el-input-number), .two-columns :deep(.el-select) { width: 100%; }.color-row { display: flex; align-items: center; gap: 10px; height: 32px; }.color-row code { color: #64748b; font-size: 12px; }.slider-field { margin-bottom: 12px; }.slider-field label strong { color: var(--studio-accent); }
.position-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; }.position-grid button { display: flex; align-items: center; justify-content: center; gap: 5px; padding: 8px 5px; border: 1px solid #e2e8f0; border-radius: 9px; color: #64748b; background: #f8fafc; cursor: pointer; }.position-grid button.active { border-color: #60a5fa; color: #1d4ed8; background: #eff6ff; box-shadow: inset 0 0 0 1px #93c5fd; }
.toggle-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 14px 0; }.toggle-row label { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 12px; color: #334155; font-size: 12px; }.toggle-row span, .toggle-row small { display: block; }
.export-box { margin-top: 16px; padding: 14px; border-radius: 16px; background: #f8fafc; }.download-button { width: 100%; }
.feature-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }.feature-strip article { display: flex; gap: 12px; padding: 17px; border-radius: 18px; }.feature-strip b { display: grid; place-items: center; flex: 0 0 34px; height: 34px; border-radius: 10px; color: #ea580c; background: #fff7ed; font-size: 11px; }.feature-strip strong { color: #1e293b; font-size: 13px; }.feature-strip p { margin: 4px 0 0; color: #64748b; font-size: 11px; line-height: 1.55; }
:global(html.dark .watermark-page .hero-metrics) { border-color: #40516a; background: rgba(15,23,42,.5); }:global(html.dark .watermark-page .hero-metrics div) { border-color: #40516a; }:global(html.dark .watermark-page .hero-metrics strong) { color: #e7edf6; }:global(html.dark .watermark-page .hero-metrics span) { color: #a8b4c5; }
:global(html.dark .watermark-page .upload-card), :global(html.dark .watermark-page .preview-card), :global(html.dark .watermark-page .settings-card), :global(html.dark .watermark-page .feature-strip article) { border-color: #334155; background-color: #1e293b; box-shadow: none; }
:global(html.dark .watermark-page .upload-card.dragging), :global(html.dark .watermark-page .export-box) { background: #0f172a; }:global(html.dark .watermark-page .upload-card h3), :global(html.dark .watermark-page .card-heading h3), :global(html.dark .watermark-page .feature-strip strong) { color: #f8fafc; }:global(html.dark .watermark-page .upload-card p), :global(html.dark .watermark-page .feature-strip p), :global(html.dark .watermark-page .field-group > label), :global(html.dark .watermark-page .slider-field > label) { color: #94a3b8; }
:global(html.dark .watermark-page .canvas-stage) { background-color: #0f172a; background-image: linear-gradient(45deg,#1e293b 25%,transparent 25%),linear-gradient(-45deg,#1e293b 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#1e293b 75%),linear-gradient(-45deg,transparent 75%,#1e293b 75%); }:global(html.dark .watermark-page .image-meta), :global(html.dark .watermark-page .image-meta div), :global(html.dark .watermark-page .position-grid button), :global(html.dark .watermark-page .toggle-row label) { border-color: #334155; }:global(html.dark .watermark-page .image-meta strong), :global(html.dark .watermark-page .toggle-row label) { color: #e2e8f0; }:global(html.dark .watermark-page .position-grid button) { color: #94a3b8; background: #0f172a; }:global(html.dark .watermark-page .position-grid button.active) { color: #93c5fd; background: #172554; }:global(html.dark .watermark-page .feature-strip b) { background: #431407; }
@media (max-width: 1080px) { .studio-grid { grid-template-columns: 1fr; }.settings-card { position: static; }.canvas-stage { min-height: 360px; } }
@media (max-width: 720px) { .watermark-page { gap: 12px; }.hero-metrics { grid-template-columns: 1fr; }.hero-metrics div { border-left: 0; border-bottom: 1px solid #e5edf6; }.hero-metrics div:last-child { border-bottom: 0; }.upload-card { min-height: 360px; padding: 36px 18px; }.preview-card, .settings-card { padding: 15px; border-radius: 20px; }.card-heading { align-items: flex-start; }.header-actions { flex-wrap: wrap; justify-content: flex-end; }.canvas-stage { min-height: 280px; padding: 10px; }.image-meta { grid-template-columns: 1fr 1fr; }.image-meta div:nth-child(2) { border-right: 0; }.image-meta div:nth-child(-n+2) { border-bottom: 1px solid #e2e8f0; }.feature-strip { grid-template-columns: 1fr; }.two-columns, .toggle-row { grid-template-columns: 1fr; }.upload-actions { flex-direction: column; width: 100%; }.upload-actions :deep(.el-button) { width: 100%; margin-left: 0; } }
</style>
