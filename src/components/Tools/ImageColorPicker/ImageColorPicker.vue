<script setup lang="ts">
import { computed, ref } from 'vue'
import { CopyDocument, Delete, Picture, UploadFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import MetricsBar from '@/components/Common/MetricsBar.vue'
import { copy } from '@/utils/string'
import { formatBytes } from '@/utils/file'
import {
  extractDominantColors,
  recommendedTextColor,
  relativeLuminance,
  rgbToCmyk,
  rgbToHex,
  rgbToHsl,
  rgbToHsv,
  type RgbColor,
} from '@/utils/colorTools'

interface ColorDetail extends RgbColor {
  hex: string
  rgb: string
  hsl: string
  hsv: string
  cmyk: string
  luminance: string
  textColor: string
  x?: number
  y?: number
}

interface HoverColor extends ColorDetail {
  displayX: number
  displayY: number
}

const imageUrl = ref('')
const imgEl = ref<HTMLImageElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const selected = ref<ColorDetail | null>(null)
const hoverColor = ref<HoverColor | null>(null)
const history = ref<ColorDetail[]>([])
const palette = ref<Array<RgbColor & { hex: string; count: number }>>([])
const dragging = ref(false)
const fileMeta = ref({ name: '', size: 0, type: '' })

const formats = computed(() => selected.value ? [
  { label: 'HEX', value: selected.value.hex },
  { label: 'RGB', value: selected.value.rgb },
  { label: 'HSL', value: selected.value.hsl },
  { label: 'HSV', value: selected.value.hsv },
  { label: 'CMYK', value: selected.value.cmyk },
] : [])

const formattedFileSize = computed(() => formatBytes(fileMeta.value.size))

function makeColor(r: number, g: number, b: number, x?: number, y?: number): ColorDetail {
  return {
    r, g, b, x, y,
    hex: rgbToHex(r, g, b),
    rgb: `rgb(${r}, ${g}, ${b})`,
    hsl: rgbToHsl(r, g, b),
    hsv: rgbToHsv(r, g, b),
    cmyk: rgbToCmyk(r, g, b),
    luminance: relativeLuminance(r, g, b).toFixed(3),
    textColor: recommendedTextColor(r, g, b),
  }
}

function remember(color: ColorDetail) {
  history.value = [color, ...history.value.filter(item => item.hex !== color.hex)].slice(0, 20)
}

function useColor(color: RgbColor) {
  const detail = makeColor(color.r, color.g, color.b)
  selected.value = detail
  remember(detail)
}

function loadFile(file?: File) {
  if (!file) return
  if (!file.type.startsWith('image/')) {
    ElMessage.warning('请选择 JPG、PNG、GIF 或 WEBP 图片')
    return
  }
  if (file.size > 20 * 1024 * 1024) {
    ElMessage.warning('图片不能超过 20MB')
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    imageUrl.value = String(reader.result ?? '')
    fileMeta.value = { name: file.name, size: file.size, type: file.type }
    selected.value = null
    hoverColor.value = null
    palette.value = []
  }
  reader.readAsDataURL(file)
}

function handleInput(event: Event) {
  const input = event.target as HTMLInputElement
  loadFile(input.files?.[0])
}

function handleDrop(event: DragEvent) {
  dragging.value = false
  loadFile(event.dataTransfer?.files?.[0])
}

function loadDemo() {
  const canvas = document.createElement('canvas')
  canvas.width = 1120
  canvas.height = 640
  const context = canvas.getContext('2d')!
  const backdrop = context.createLinearGradient(0, 0, 1120, 640)
  backdrop.addColorStop(0, '#172554')
  backdrop.addColorStop(.45, '#7C3AED')
  backdrop.addColorStop(1, '#F97316')
  context.fillStyle = backdrop
  context.fillRect(0, 0, 1120, 640)
  const glow = context.createRadialGradient(830, 145, 10, 830, 145, 270)
  glow.addColorStop(0, '#FDE68A')
  glow.addColorStop(1, 'rgba(253, 230, 138, 0)')
  context.fillStyle = glow
  context.fillRect(520, 0, 600, 500)
  context.fillStyle = '#0EA5E9'
  context.beginPath()
  context.arc(230, 455, 145, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = '#10B981'
  context.fillRect(465, 365, 235, 165)
  context.fillStyle = '#F43F5E'
  context.beginPath()
  context.moveTo(860, 320)
  context.lineTo(1030, 530)
  context.lineTo(720, 530)
  context.closePath()
  context.fill()
  context.fillStyle = '#FFFFFF'
  context.font = '700 56px system-ui, sans-serif'
  context.fillText('COLOR LAB', 68, 104)
  context.font = '24px system-ui, sans-serif'
  context.fillText('移动光标探索颜色，点击即可取样', 72, 148)
  imageUrl.value = canvas.toDataURL('image/png')
  fileMeta.value = { name: '色彩实验室示例.png', size: Math.round(imageUrl.value.length * .75), type: 'image/png' }
  selected.value = null
  hoverColor.value = null
  palette.value = []
}

function analyzeImage() {
  const image = imgEl.value
  const canvas = canvasEl.value
  if (!image || !canvas) return
  const maxSide = 2000
  const ratio = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight))
  canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio))
  const context = canvas.getContext('2d', { willReadFrequently: true })!
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
  const sampleEvery = Math.max(1, Math.round((canvas.width * canvas.height) / 220_000))
  palette.value = extractDominantColors(pixels, 8, sampleEvery)
  if (palette.value[0]) selected.value = makeColor(palette.value[0].r, palette.value[0].g, palette.value[0].b)
}

function sampleImage(event: MouseEvent, commit = false) {
  const image = imgEl.value
  const canvas = canvasEl.value
  if (!image || !canvas) return
  const rect = image.getBoundingClientRect()
  const displayX = Math.max(0, Math.min(rect.width - 1, event.clientX - rect.left))
  const displayY = Math.max(0, Math.min(rect.height - 1, event.clientY - rect.top))
  const canvasX = Math.max(0, Math.min(canvas.width - 1, Math.floor(displayX / rect.width * canvas.width)))
  const canvasY = Math.max(0, Math.min(canvas.height - 1, Math.floor(displayY / rect.height * canvas.height)))
  const [r, g, b] = canvas.getContext('2d', { willReadFrequently: true })!.getImageData(canvasX, canvasY, 1, 1).data
  const x = Math.min(image.naturalWidth - 1, Math.floor(displayX / rect.width * image.naturalWidth))
  const y = Math.min(image.naturalHeight - 1, Math.floor(displayY / rect.height * image.naturalHeight))
  const color = makeColor(r, g, b, x, y)
  hoverColor.value = { ...color, displayX, displayY }
  if (commit) {
    selected.value = color
    remember(color)
  }
}

function clearImage() {
  imageUrl.value = ''
  selected.value = null
  hoverColor.value = null
  palette.value = []
  history.value = []
  fileMeta.value = { name: '', size: 0, type: '' }
  if (fileInput.value) fileInput.value.value = ''
}

function copyPaletteVariables() {
  copy(palette.value.map((color, index) => `--color-${index + 1}: ${color.hex};`).join('\n'))
}
</script>

<template>
  <div class="color-page flex flex-col mt-3 flex-1">
    <ToolHero summary="从一张图片，读懂整套色彩">
      <template #metrics>
        <MetricsBar :items="[{ label: '色彩格式', value: '5' }, { label: '智能主色', value: '8' }, { label: '历史记录', value: '20' }]" />
      </template>
    </ToolHero>

    <section
      v-if="!imageUrl"
      class="upload-card"
      :class="{ dragging }"
      @dragenter.prevent="dragging = true"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="handleDrop"
    >
      <div class="upload-icon"><el-icon><UploadFilled /></el-icon></div>
      <h3>拖入图片，开始探索颜色</h3>
      <p>支持 JPG、PNG、GIF、WEBP 等图片，单张最大 20MB</p>
      <div class="upload-actions"><label><input ref="fileInput" type="file" accept="image/*" @change="handleInput" />选择图片</label><el-button :icon="Picture" @click="loadDemo">使用示例</el-button></div>
      <span>图片仅由浏览器读取，不会离开你的设备</span>
    </section>

    <template v-else>
      <section class="file-bar">
        <div class="file-info"><div class="file-icon"><el-icon><Picture /></el-icon></div><div><strong>{{ fileMeta.name }}</strong><span>{{ imgEl?.naturalWidth || 0 }} × {{ imgEl?.naturalHeight || 0 }} px · {{ formattedFileSize }}</span></div></div>
        <div class="file-actions"><label><input ref="fileInput" type="file" accept="image/*" @change="handleInput" />更换图片</label><el-button link type="danger" :icon="Delete" @click="clearImage">移除</el-button></div>
      </section>

      <section class="workspace">
        <article class="image-panel">
          <div class="section-heading"><div><span class="eyebrow">PIXEL SAMPLER</span><h3>移动预览，点击取色</h3></div><span>原图坐标实时映射</span></div>
          <div class="image-scroll">
            <div class="image-frame" @mouseleave="hoverColor = null">
              <img ref="imgEl" :src="imageUrl" alt="待取色图片" @load="analyzeImage" @mousemove="sampleImage($event)" @click="sampleImage($event, true)" />
              <div v-if="hoverColor" class="color-cursor" :style="{ left: `${hoverColor.displayX}px`, top: `${hoverColor.displayY}px`, background: hoverColor.hex, color: hoverColor.textColor }"><span>{{ hoverColor.hex }}</span></div>
            </div>
          </div>
          <canvas ref="canvasEl" class="analysis-canvas" />
          <div class="image-hint"><span><i />移动查看实时颜色</span><span><i />点击锁定并加入历史</span></div>
        </article>

        <aside class="inspector-panel">
          <div class="section-heading"><div><span class="eyebrow">COLOR INSPECTOR</span><h3>颜色详情</h3></div><span v-if="selected?.x !== undefined">X {{ selected.x }} · Y {{ selected.y }}</span></div>
          <div v-if="selected" class="selected-color" :style="{ background: selected.hex, color: selected.textColor }"><span>当前颜色</span><strong>{{ selected.hex }}</strong><small>建议文字 {{ selected.textColor }}</small></div>
          <div v-if="selected" class="format-list">
            <button v-for="item in formats" :key="item.label" @click="copy(item.value)"><span>{{ item.label }}</span><code>{{ item.value }}</code><el-icon><CopyDocument /></el-icon></button>
          </div>
          <div v-if="selected" class="color-meta"><div><span>相对亮度</span><strong>{{ selected.luminance }}</strong></div><div><span>RGB 通道</span><strong>{{ selected.r }} · {{ selected.g }} · {{ selected.b }}</strong></div></div>
          <div v-else class="inspector-empty">点击图片任意位置查看颜色详情</div>
        </aside>
      </section>

      <section class="palette-card">
        <div class="section-heading"><div><span class="eyebrow">DOMINANT PALETTE</span><h3>图片主色</h3></div><el-button link type="primary" :icon="CopyDocument" :disabled="!palette.length" @click="copyPaletteVariables">复制 CSS 变量</el-button></div>
        <div class="palette-grid">
          <button v-for="(color, index) in palette" :key="color.hex" :style="{ background: color.hex, color: recommendedTextColor(color.r, color.g, color.b) }" @click="useColor(color)"><span>0{{ index + 1 }}</span><strong>{{ color.hex }}</strong></button>
        </div>
      </section>

      <section v-if="history.length" class="history-card">
        <div class="section-heading"><div><span class="eyebrow">RECENT PICKS</span><h3>取色历史</h3></div><button @click="history = []">清空记录</button></div>
        <div class="history-list"><button v-for="color in history" :key="color.hex" @click="selected = color"><i :style="{ background: color.hex }" /><span>{{ color.hex }}</span><small v-if="color.x !== undefined">{{ color.x }}, {{ color.y }}</small></button></div>
      </section>
    </template>

    <ToolGuide title="使用说明">
      <el-text>上传图片后移动鼠标可实时预览像素颜色，点击后锁定该颜色并记录原图坐标。主色板通过本地像素采样生成，可一键复制为 CSS 变量；对于超大图片，工具会生成最长边不超过 2000px 的分析画布，以兼顾响应速度和取样稳定性。</el-text>
    </ToolGuide>
  </div>
</template>

<style scoped>
.color-page { --blue: #2563eb; gap: 16px; }.upload-card, .file-bar, .image-panel, .inspector-panel, .palette-card, .history-card { border: 1px solid var(--c-border); border-radius: var(--radius-card); background: var(--c-surface); box-shadow: var(--shadow-card); }.eyebrow { color: var(--blue); font-size:12px; font-weight: 800; letter-spacing: .15em; }
.upload-card { display: flex; min-height: 390px; align-items: center; justify-content: center; flex-direction: column; padding: 40px; border-style: dashed; text-align: center; transition: .18s ease; }.upload-card.dragging { border-color: #60a5fa; background: #eff6ff; transform: scale(.995); }.upload-icon { display: grid; width: 72px; height: 72px; place-items: center; border-radius: var(--radius-card); color: #2563eb; background: #dbeafe; font-size: 32px; }.upload-card h3 { margin: 18px 0 5px; color: var(--c-text-primary); font-size: 19px; }.upload-card p { margin: 0; color: var(--c-text-secondary); font-size: 12px; }.upload-actions { display: flex; gap: 9px; margin: 21px 0 14px; }.upload-actions label, .file-actions label { padding: 8px 15px; border-radius: var(--radius-sm); color: var(--c-on-accent); background: #2563eb; font-size: 12px; cursor: pointer; }.upload-actions input, .file-actions input { display: none; }.upload-card > span { color: var(--c-text-muted); font-size:12px; }
.file-bar { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 13px 17px; }.file-info, .file-actions { display: flex; align-items: center; gap: 10px; min-width: 0; }.file-icon { display: grid; width: 38px; height: 38px; flex: none; place-items: center; border-radius: var(--radius-sm); color: #2563eb; background: #dbeafe; }.file-info > div:last-child { display: flex; min-width: 0; flex-direction: column; }.file-info strong { color: var(--c-text-strong); overflow: hidden; text-overflow: ellipsis; font-size:12px; white-space: nowrap; }.file-info span { color: var(--c-text-muted); font-size:12px; }.file-actions label { padding: 6px 11px; font-size:12px; }
.workspace { display: grid; grid-template-columns: minmax(0, 1.65fr) minmax(275px, .65fr); align-items: start; gap: 16px; }.image-panel, .inspector-panel, .palette-card, .history-card { padding: 21px; }.section-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }.section-heading h3 { margin: 3px 0 0; color: var(--c-text-primary); font-size: 16px; }.section-heading > span { color: var(--c-text-muted); font-size:12px; }.image-scroll { display: flex; max-height: 610px; align-items: center; justify-content: center; margin-top: 16px; overflow: auto; border-radius: var(--radius-lg); background-color: var(--c-surface-subtle); background-image: linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%); background-position: 0 0, 0 9px, 9px -9px, -9px 0; background-size: 18px 18px; }.image-frame { position: relative; display: inline-block; max-width: 100%; line-height: 0; }.image-frame img { display: block; max-width: 100%; max-height: 580px; cursor: crosshair; object-fit: contain; }.color-cursor { position: absolute; display: grid; width: 62px; height: 62px; z-index: 2; place-items: center; border: 4px solid #fff; border-radius: 50%; box-shadow: 0 4px 17px rgb(15 23 42 / 35%); pointer-events: none; transform: translate(14px, -76px); }.color-cursor::after { position: absolute; right: 50%; bottom: -10px; width: 1px; height: 12px; background: var(--c-surface); content: ''; }.color-cursor span { padding: 3px 5px; border-radius: 5px; background: rgb(15 23 42 / 50%); color: var(--c-on-accent); font: 12px ui-monospace, monospace; line-height: 1; }.analysis-canvas { display: none; }.image-hint { display: flex; justify-content: center; gap: 20px; margin-top: 12px; color: var(--c-text-muted); font-size:12px; }.image-hint span { display: flex; align-items: center; gap: 5px; }.image-hint i { width: 6px; height: 6px; border-radius: 50%; background: #60a5fa; }.image-hint span:last-child i { background: #a78bfa; }
.inspector-panel { position: sticky; top: 14px; }.selected-color { display: flex; height: 150px; justify-content: flex-end; flex-direction: column; margin: 17px 0 12px; padding: 17px; border-radius: var(--radius-lg); box-shadow: inset 0 0 0 1px rgb(255 255 255 / 22%); }.selected-color span, .selected-color small { font-size:12px; opacity: .8; }.selected-color strong { font: 800 25px ui-monospace, monospace; }.format-list { display: flex; flex-direction: column; gap: 6px; }.format-list button { display: grid; grid-template-columns: 38px minmax(0, 1fr) auto; align-items: center; gap: 7px; padding: 9px; border: 1px solid var(--c-border); border-radius: var(--radius-sm); color: var(--c-text-secondary); background: var(--c-surface-subtle); text-align: left; cursor: pointer; }.format-list button:hover { border-color: #93c5fd; background: #eff6ff; }.format-list span { color: var(--c-text-muted); font-size:12px; font-weight: 800; }.format-list code { overflow: hidden; color: var(--c-text-strong); text-overflow: ellipsis; font-size:12px; white-space: nowrap; }.color-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; margin-top: 10px; }.color-meta div { display: flex; flex-direction: column; padding: 9px; border-radius: var(--radius-sm); background: #f1f5f9; }.color-meta span { color: var(--c-text-muted); font-size:12px; }.color-meta strong { color: var(--c-text-body); font: 12px ui-monospace, monospace; }.inspector-empty { display: grid; min-height: 330px; place-items: center; color: var(--c-text-muted); font-size:12px; text-align: center; }
.palette-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 8px; margin-top: 16px; }.palette-grid button { display: flex; height: 95px; justify-content: space-between; flex-direction: column; padding: 10px; border: 0; border-radius: var(--radius-md); text-align: left; cursor: pointer; transition: .18s ease; }.palette-grid button:hover { transform: translateY(-3px); box-shadow: 0 8px 17px rgb(15 23 42 / 18%); }.palette-grid span { font-size:12px; opacity: .7; }.palette-grid strong { font: 800 12px ui-monospace, monospace; }.history-card .section-heading > button { border: 0; color: var(--c-text-muted); background: transparent; font-size:12px; cursor: pointer; }.history-list { display: flex; gap: 7px; margin-top: 14px; overflow-x: auto; padding-bottom: 4px; }.history-list button { display: grid; grid-template-columns: auto auto; align-items: center; gap: 3px 7px; flex: none; padding: 7px 10px; border: 1px solid var(--c-border); border-radius: var(--radius-sm); color: var(--c-text-body); background: var(--c-surface-subtle); cursor: pointer; }.history-list i { grid-row: 1 / 3; width: 25px; height: 25px; border-radius: var(--radius-xs); box-shadow: inset 0 0 0 1px rgb(15 23 42 / 10%); }.history-list span { font: 12px ui-monospace, monospace; }.history-list small { color: var(--c-text-muted); font-size:12px; }:global(html.dark .color-page .upload-card), :global(html.dark .color-page .file-bar), :global(html.dark .color-page .image-panel), :global(html.dark .color-page .inspector-panel), :global(html.dark .color-page .palette-card), :global(html.dark .color-page .history-card) { border-color: var(--c-border); background: var(--c-surface); box-shadow: none; }:global(html.dark .color-page h2), :global(html.dark .color-page h3), :global(html.dark .color-page .file-info strong) { color: #f8fafc; }:global(html.dark .color-page .format-list button), :global(html.dark .color-page .color-meta div), :global(html.dark .color-page .history-list button) { border-color: var(--c-border); color: var(--c-text-secondary); background: var(--c-surface-subtle); }:global(html.dark .color-page .format-list code), :global(html.dark .color-page .color-meta strong) { color: var(--c-text-secondary); }@media (max-width: 930px) { .workspace { grid-template-columns: 1fr; }.inspector-panel { position: static; }.palette-grid { grid-template-columns: repeat(4, 1fr); }}@media (max-width: 640px) {.upload-card { min-height: 340px; padding: 25px; }.upload-actions { align-items: stretch; flex-direction: column; }.file-bar { align-items: flex-start; flex-direction: column; }.file-info { width: 100%; }.file-actions { width: 100%; }.file-actions label { flex: 1; text-align: center; }.image-panel, .inspector-panel, .palette-card, .history-card { padding: 17px; border-radius: 19px; }.image-hint { align-items: center; flex-direction: column; gap: 5px; }.palette-grid { grid-template-columns: repeat(2, 1fr); }.palette-grid button { height: 83px; }.color-cursor { width: 52px; height: 52px; transform: translate(10px, -63px); }}</style>
