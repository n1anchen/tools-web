<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import { autoDown } from '@/utils/file'
import { adjustContrast, drawToCanvas, getImageData, loadImageFromFile, resizeCover, toGray } from './imageUtils'
import { prismDecode, prismEncode, type DecodeMethod } from './mirage'

const activeMode = ref<'encode' | 'decode'>('encode')

const innerInputRef = ref<HTMLInputElement | null>(null)
const coverInputRef = ref<HTMLInputElement | null>(null)
const decodeInputRef = ref<HTMLInputElement | null>(null)
const encodeCanvasRef = ref<HTMLCanvasElement | null>(null)
const decodeCanvasRef = ref<HTMLCanvasElement | null>(null)

const innerImage = ref<HTMLImageElement | null>(null)
const coverImage = ref<HTMLImageElement | null>(null)
const decodeImage = ref<HTMLImageElement | null>(null)
const encodeResult = ref<ImageData | null>(null)
const decodeSource = ref<ImageData | null>(null)
const decodeResult = ref<ImageData | null>(null)
const innerFile = ref<File | null>(null)
const coverFile = ref<File | null>(null)
const decodeFile = ref<File | null>(null)
const encodeLoading = ref(false)
const decodeLoading = ref(false)
const previewMode = ref<'normal' | 'bright' | 'dark'>('normal')

const encodeConfig = reactive({
  innerThreshold: 24,
  innerContrast: 0,
  coverThreshold: 42,
  coverContrast: 0,
  slope: 1,
  gap: 1,
  isRow: true,
  isReverse: false,
  isCoverGray: false,
  isInnerGray: false,
})

const decodeConfig = reactive({
  lowerThreshold: 0,
  higherThreshold: 24,
  method: 'ltavg' as DecodeMethod,
  contrast: 0,
})

const encodePresets = [
  { name: '均衡', description: '适合大多数图片', values: { innerThreshold: 24, coverThreshold: 42, gap: 1, slope: 1, isRow: true, isReverse: false } },
  { name: '细密', description: '纹理更细，信息更平均', values: { innerThreshold: 30, coverThreshold: 48, gap: 1, slope: 2, isRow: true, isReverse: false } },
  { name: '强对比', description: '突出两张图的明暗差异', values: { innerThreshold: 18, coverThreshold: 64, gap: 2, slope: 1, isRow: false, isReverse: false } },
  { name: '反相', description: '交换明暗表现逻辑', values: { innerThreshold: 24, coverThreshold: 42, gap: 1, slope: 1, isRow: true, isReverse: true } },
]

const canEncode = computed(() => Boolean(innerImage.value && coverImage.value))
const encodeDimensions = computed(() => innerImage.value ? `${innerImage.value.naturalWidth} × ${innerImage.value.naturalHeight}` : '等待图片')
const decodeDimensions = computed(() => decodeSource.value ? `${decodeSource.value.width} × ${decodeSource.value.height}` : '等待图片')
const activeStatus = computed(() => activeMode.value === 'encode'
  ? canEncode.value ? '已生成合成图' : `${Number(Boolean(innerImage.value)) + Number(Boolean(coverImage.value))}/2 张素材`
  : decodeResult.value ? '已显形' : '等待坦克图')

let encodeFrame = 0
let decodeFrame = 0

watch(encodeConfig, scheduleEncode, { deep: true })
watch(decodeConfig, scheduleDecode, { deep: true })
watch(activeMode, async mode => {
  await nextTick()
  if (mode === 'encode' && encodeResult.value && encodeCanvasRef.value) {
    drawToCanvas(encodeCanvasRef.value, encodeResult.value)
  }
  if (mode === 'decode' && decodeResult.value && decodeCanvasRef.value) {
    drawToCanvas(decodeCanvasRef.value, decodeResult.value)
  }
})

async function handleImageInput(event: Event, target: 'inner' | 'cover' | 'decode') {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请选择 PNG、JPG、WebP 等图片文件')
    return
  }
  try {
    const image = await loadImageFromFile(file)
    if (target === 'inner') {
      innerImage.value = image
      innerFile.value = file
      scheduleEncode()
    } else if (target === 'cover') {
      coverImage.value = image
      coverFile.value = file
      scheduleEncode()
    } else {
      decodeImage.value = image
      decodeFile.value = file
      decodeSource.value = getImageData(image)
      await nextTick()
      scheduleDecode()
    }
  } catch {
    ElMessage.error('图片读取失败，请尝试其他文件')
  }
}

function scheduleEncode() {
  cancelAnimationFrame(encodeFrame)
  encodeFrame = requestAnimationFrame(runEncode)
}

function runEncode() {
  if (!innerImage.value || !coverImage.value) {
    encodeResult.value = null
    return
  }
  encodeLoading.value = true
  try {
    let innerData = getImageData(innerImage.value)
    let coverData = getImageData(coverImage.value)
    if (encodeConfig.isInnerGray) innerData = toGray(innerData)
    if (encodeConfig.isCoverGray) coverData = toGray(coverData)
    if (encodeConfig.innerContrast) innerData = adjustContrast(encodeConfig.innerContrast, innerData)
    if (encodeConfig.coverContrast) coverData = adjustContrast(encodeConfig.coverContrast, coverData)
    coverData = resizeCover(coverData, innerData.width, innerData.height)
    encodeResult.value = prismEncode(
      innerData,
      coverData,
      encodeConfig.innerThreshold,
      encodeConfig.coverThreshold,
      encodeConfig.slope,
      encodeConfig.gap,
      encodeConfig.isRow,
      encodeConfig.isReverse,
    )
    if (encodeCanvasRef.value) drawToCanvas(encodeCanvasRef.value, encodeResult.value)
  } finally {
    encodeLoading.value = false
  }
}

function scheduleDecode() {
  cancelAnimationFrame(decodeFrame)
  decodeFrame = requestAnimationFrame(runDecode)
}

function runDecode() {
  if (!decodeSource.value) {
    decodeResult.value = null
    return
  }
  decodeLoading.value = true
  try {
    let result = prismDecode(
      decodeSource.value,
      decodeConfig.lowerThreshold,
      decodeConfig.higherThreshold,
      decodeConfig.method,
    )
    if (decodeConfig.contrast) result = adjustContrast(decodeConfig.contrast, result)
    decodeResult.value = result
    if (decodeCanvasRef.value) drawToCanvas(decodeCanvasRef.value, result)
  } finally {
    decodeLoading.value = false
  }
}

function applyEncodePreset(preset: typeof encodePresets[number]) {
  Object.assign(encodeConfig, preset.values)
}

function resetEncodeConfig() {
  Object.assign(encodeConfig, {
    innerThreshold: 24,
    innerContrast: 0,
    coverThreshold: 42,
    coverContrast: 0,
    slope: 1,
    gap: 1,
    isRow: true,
    isReverse: false,
    isCoverGray: false,
    isInnerGray: false,
  })
}

function autoTuneDecode() {
  if (!decodeSource.value) return
  const luminance: number[] = []
  const data = decodeSource.value.data
  const step = Math.max(4, Math.floor(data.length / 16000 / 4) * 4)
  for (let index = 0; index < data.length; index += step) {
    luminance.push(data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114)
  }
  luminance.sort((a, b) => a - b)
  const percentile = (ratio: number) => Math.round(luminance[Math.min(luminance.length - 1, Math.floor(luminance.length * ratio))] || 0)
  decodeConfig.lowerThreshold = percentile(0.01)
  decodeConfig.higherThreshold = Math.max(decodeConfig.lowerThreshold + 8, percentile(0.14))
  decodeConfig.contrast = 20
}

function swapImages() {
  const image = innerImage.value
  const file = innerFile.value
  innerImage.value = coverImage.value
  innerFile.value = coverFile.value
  coverImage.value = image
  coverFile.value = file
  scheduleEncode()
}

function clearEncode() {
  innerImage.value = null
  coverImage.value = null
  innerFile.value = null
  coverFile.value = null
  encodeResult.value = null
}

function clearDecode() {
  decodeImage.value = null
  decodeFile.value = null
  decodeSource.value = null
  decodeResult.value = null
}

function downloadCanvas(canvas: HTMLCanvasElement | null, suffix: string, sourceFile?: File | null) {
  if (!canvas) return
  const base = (sourceFile?.name || 'mirage').replace(/\.[^.]+$/, '').replace(/[\\\/:*?"<>|]/g, '_')
  autoDown(canvas.toDataURL('image/png'), `${base}_${suffix}.png`)
}

function formatFileSize(file: File | null) {
  if (!file) return ''
  return file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(0)} KB` : `${(file.size / 1024 / 1024).toFixed(1)} MB`
}

onBeforeUnmount(() => {
  cancelAnimationFrame(encodeFrame)
  cancelAnimationFrame(decodeFrame)
})
</script>

<template>
  <div class="mirage-tool flex flex-col mt-3 flex-1">
    <ToolHero summary="制作与显形，在同一个工作台完成">
      <template #metrics>
        <div class="hero-metrics">
          <div><span>当前模式</span><strong>{{ activeMode === 'encode' ? '制作坦克图' : '显形解码' }}</strong></div>
          <div><span>处理状态</span><strong>{{ activeStatus }}</strong></div>
          <div><span>输出尺寸</span><strong>{{ activeMode === 'encode' ? encodeDimensions : decodeDimensions }}</strong></div>
        </div>
      </template>
    </ToolHero>

    <nav class="mode-tabs" aria-label="光棱坦克功能">
      <button :class="{ active: activeMode === 'encode' }" @click="activeMode = 'encode'">
        <span>合</span><div><strong>制作坦克图</strong><small>上传隐藏图和表面图进行混合</small></div>
      </button>
      <button :class="{ active: activeMode === 'decode' }" @click="activeMode = 'decode'">
        <span>显</span><div><strong>显形 / 解码</strong><small>调整阈值恢复隐藏内容</small></div>
      </button>
    </nav>

    <section v-if="activeMode === 'encode'" class="workbench-card">
      <div class="step-heading"><div><span>STEP 1</span><h3>准备两张素材图</h3></div><div class="step-actions"><button :disabled="!canEncode" @click="swapImages">交换两张图</button><button v-if="innerImage || coverImage" @click="clearEncode">清空素材</button></div></div>
      <div class="source-grid">
        <article class="source-card">
          <div class="source-title"><span class="source-number inner">1</span><div><strong>隐藏图</strong><small>作为合成图的暗部信息</small></div></div>
          <button class="image-slot" :class="{ filled: innerImage }" @click="innerInputRef?.click()">
            <img v-if="innerImage" :src="innerImage.src" alt="隐藏图预览" />
            <span v-else><b>＋</b><strong>上传隐藏图</strong><small>点击选择图片</small></span>
          </button>
          <div v-if="innerImage" class="file-info"><span>{{ innerFile?.name }}</span><strong>{{ innerImage.naturalWidth }} × {{ innerImage.naturalHeight }} · {{ formatFileSize(innerFile) }}</strong></div>
          <div class="source-controls">
            <label><span>色阶端点</span><strong>{{ encodeConfig.innerThreshold }}</strong><input v-model.number="encodeConfig.innerThreshold" type="range" min="0" max="255" /></label>
            <label><span>对比度</span><strong>{{ encodeConfig.innerContrast }}</strong><input v-model.number="encodeConfig.innerContrast" type="range" min="-255" max="255" step="5" /></label>
            <label class="switch-row"><span>转换为灰度</span><el-switch v-model="encodeConfig.isInnerGray" /></label>
          </div>
          <input ref="innerInputRef" type="file" accept="image/*" hidden @change="handleImageInput($event, 'inner')" />
        </article>

        <article class="source-card">
          <div class="source-title"><span class="source-number cover">2</span><div><strong>表面图</strong><small>自动居中裁切到隐藏图尺寸</small></div></div>
          <button class="image-slot" :class="{ filled: coverImage }" @click="coverInputRef?.click()">
            <img v-if="coverImage" :src="coverImage.src" alt="表面图预览" />
            <span v-else><b>＋</b><strong>上传表面图</strong><small>点击选择图片</small></span>
          </button>
          <div v-if="coverImage" class="file-info"><span>{{ coverFile?.name }}</span><strong>{{ coverImage.naturalWidth }} × {{ coverImage.naturalHeight }} · {{ formatFileSize(coverFile) }}</strong></div>
          <div class="source-controls">
            <label><span>色阶端点</span><strong>{{ encodeConfig.coverThreshold }}</strong><input v-model.number="encodeConfig.coverThreshold" type="range" min="0" max="255" /></label>
            <label><span>对比度</span><strong>{{ encodeConfig.coverContrast }}</strong><input v-model.number="encodeConfig.coverContrast" type="range" min="-255" max="255" step="5" /></label>
            <label class="switch-row"><span>转换为灰度</span><el-switch v-model="encodeConfig.isCoverGray" /></label>
          </div>
          <input ref="coverInputRef" type="file" accept="image/*" hidden @change="handleImageInput($event, 'cover')" />
        </article>
      </div>

      <div class="mix-section">
        <div class="step-heading"><div><span>STEP 2</span><h3>选择混合纹理</h3></div><button class="reset-button" @click="resetEncodeConfig">恢复默认</button></div>
        <div class="preset-grid">
          <button v-for="preset in encodePresets" :key="preset.name" @click="applyEncodePreset(preset)"><strong>{{ preset.name }}</strong><span>{{ preset.description }}</span></button>
        </div>
        <div class="mix-controls">
          <label><span>交错间隔</span><strong>{{ encodeConfig.gap }}</strong><input v-model.number="encodeConfig.gap" type="range" min="1" max="8" /></label>
          <label><span>交错斜率</span><strong>{{ encodeConfig.slope }}</strong><input v-model.number="encodeConfig.slope" type="range" min="0" max="4" step="0.5" /></label>
          <label class="switch-card"><div><strong>按行交错</strong><span>关闭后按列交错</span></div><el-switch v-model="encodeConfig.isRow" /></label>
          <label class="switch-card"><div><strong>反向映射</strong><span>交换亮暗缩放方向</span></div><el-switch v-model="encodeConfig.isReverse" /></label>
        </div>
      </div>

      <div class="output-section">
        <div class="step-heading"><div><span>STEP 3</span><h3>预览与导出</h3></div><div class="preview-tabs"><button :class="{ active: previewMode === 'normal' }" @click="previewMode = 'normal'">原始</button><button :class="{ active: previewMode === 'bright' }" @click="previewMode = 'bright'">提亮观察</button><button :class="{ active: previewMode === 'dark' }" @click="previewMode = 'dark'">压暗观察</button></div></div>
        <div class="output-stage" :class="previewMode">
          <canvas v-show="encodeResult" ref="encodeCanvasRef" />
          <div v-if="!encodeResult" class="empty-output"><span>合</span><strong>上传两张图片后自动生成</strong><p>输出尺寸以隐藏图为准，表面图会居中裁切。</p></div>
          <div v-if="encodeLoading" class="processing">正在重新混合…</div>
        </div>
        <div class="output-footer"><div><span>PNG 无损输出</span><strong>{{ encodeDimensions }}</strong></div><button :disabled="!encodeResult" @click="downloadCanvas(encodeCanvasRef, 'mirage_tank', innerFile)">下载合成图</button></div>
      </div>
    </section>

    <section v-else class="workbench-card decode-workbench">
      <div class="step-heading"><div><span>STEP 1</span><h3>上传需要显形的坦克图</h3></div><button v-if="decodeImage" class="reset-button" @click="clearDecode">清空图片</button></div>
      <div class="decode-grid">
        <article class="decode-source">
          <button class="decode-upload" :class="{ filled: decodeImage }" @click="decodeInputRef?.click()">
            <img v-if="decodeImage" :src="decodeImage.src" alt="待显形图片" />
            <span v-else><b>显</b><strong>选择一张坦克图</strong><small>PNG 原图效果最佳</small></span>
          </button>
          <div v-if="decodeFile" class="file-info"><span>{{ decodeFile.name }}</span><strong>{{ decodeDimensions }} · {{ formatFileSize(decodeFile) }}</strong></div>
          <input ref="decodeInputRef" type="file" accept="image/*" hidden @change="handleImageInput($event, 'decode')" />
        </article>

        <article class="decode-settings">
          <div class="settings-title"><div><span>STEP 2</span><h3>调整显形参数</h3></div><button :disabled="!decodeSource" @click="autoTuneDecode">自动估算</button></div>
          <label><span>亮部阈值下限</span><strong>{{ decodeConfig.lowerThreshold }}</strong><input v-model.number="decodeConfig.lowerThreshold" type="range" min="0" max="255" /></label>
          <label><span>亮部阈值上限</span><strong>{{ decodeConfig.higherThreshold }}</strong><input v-model.number="decodeConfig.higherThreshold" type="range" min="0" max="255" /></label>
          <label><span>结果对比度</span><strong>{{ decodeConfig.contrast }}</strong><input v-model.number="decodeConfig.contrast" type="range" min="-255" max="255" step="5" /></label>
          <div class="method-select"><span>阈值外像素处理</span><div><button v-for="item in [{id:'ltavg',label:'周边平均'},{id:'black',label:'填黑'},{id:'white',label:'填白'},{id:'transparent',label:'透明'}]" :key="item.id" :class="{ active: decodeConfig.method === item.id }" @click="decodeConfig.method = item.id as DecodeMethod">{{ item.label }}</button></div></div>
          <p v-if="decodeConfig.higherThreshold <= decodeConfig.lowerThreshold" class="inline-warning">上限需要大于下限，当前结果会显示为空。</p>
        </article>
      </div>

      <div class="decode-result-section">
        <div class="step-heading"><div><span>STEP 3</span><h3>显形结果</h3></div><span class="privacy-badge">全程本地处理</span></div>
        <div class="decode-result-stage">
          <canvas v-show="decodeResult" ref="decodeCanvasRef" />
          <div v-if="!decodeResult" class="empty-output"><span>像</span><strong>结果会显示在这里</strong><p>上传图片后可实时调整阈值与对比度。</p></div>
          <div v-if="decodeLoading" class="processing">正在显形…</div>
        </div>
        <div class="output-footer"><div><span>当前结果</span><strong>{{ decodeDimensions }}</strong></div><button :disabled="!decodeResult" @click="downloadCanvas(decodeCanvasRef, 'decoded', decodeFile)">下载显形图</button></div>
      </div>
    </section>

    <section class="principle-card">
      <span>原</span><div><strong>工作原理</strong><p>合成模式按亮度端点与交错纹理混合两张图片；显形模式筛选指定亮度范围，并用周边平均、黑白或透明方式处理其余像素。算法全部在浏览器本地运行。</p></div>
    </section>

    <ToolGuide title="使用说明">
      <el-text>
        制作模式中，隐藏图决定最终输出尺寸，表面图会以 cover 方式居中裁切；可先使用预设，再微调色阶、对比度、交错间隔和方向。显形模式适合分析同类亮度隐写图片，“自动估算”会根据亮度分布给出起点，但不同图片仍可能需要手动调整。本工具参考 TankFactory/Mirage_Decode 的处理思路，并非所有幻影坦克或透明度隐写格式的通用解码器。
      </el-text>
    </ToolGuide>
  </div>
</template>

<style scoped>
.mirage-tool { --accent:#2d6eb5; --ink:#262d38; --muted:#707b89; }.step-heading>div>span,.settings-title>div>span { color:#557b9f; font-size:13px; font-weight:800; letter-spacing:.12em; }.hero-metrics{display:grid;grid-template-columns:repeat(3,minmax(96px,1fr));min-width:320px;overflow:hidden;border:1px solid #e0e9f4;border-radius:18px;background:rgba(255,255,255,.78)}.hero-metrics div{padding:12px 14px;text-align:center;border-left:1px solid #e5edf6}.hero-metrics div:first-child{border-left:0}.hero-metrics span,.hero-metrics strong{display:block}.hero-metrics span{margin-top:4px;color:#7a899c;font-size:12px}.hero-metrics strong{overflow:hidden;color:#334155;font-size:18px;text-overflow:ellipsis;white-space:nowrap}
.mode-tabs { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; margin-top:14px; }.mode-tabs button { display:flex; align-items:center; gap:12px; padding:14px; border:1px solid #dfe4ea; border-radius:15px; background:#fff; text-align:left; cursor:pointer; }.mode-tabs button>span { display:grid; place-items:center; width:41px; height:41px; border-radius:11px; background:#edf3f8; color:#507ba1; font-size:16px; font-weight:800; }.mode-tabs strong,.mode-tabs small { display:block; }.mode-tabs strong { color:#3a4653; font-size:14px; }.mode-tabs small { margin-top:3px; color:#87909a; font-size:13px; }.mode-tabs button.active { border-color:#77a4cd; background:#f8fbff; box-shadow:0 0 0 3px rgba(45,110,181,.07); }.mode-tabs button.active>span { background:#e5f0fb; color:#2467a7; }
.workbench-card { margin-top:14px; padding:21px; border:1px solid #dfe4ea; border-radius:20px; background:#fff; box-shadow:0 11px 28px rgba(40,54,69,.045); }.step-heading,.settings-title { display:flex; align-items:center; justify-content:space-between; gap:12px; }.step-heading h3,.settings-title h3 { margin:4px 0 0; color:var(--ink); font-size:18px; font-weight:800; }.step-actions { display:flex; gap:6px; }.step-actions button,.reset-button,.settings-title button { border:1px solid #d7dfe7; border-radius:8px; padding:7px 10px; background:#fff; color:#52708c; font-size:13px; font-weight:700; cursor:pointer; }.step-actions button:disabled,.settings-title button:disabled { opacity:.4; cursor:not-allowed; }.source-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; margin-top:15px; }.source-card { min-width:0; padding:15px; border:1px solid #e1e5e9; border-radius:15px; background:#fbfcfd; }.source-title { display:flex; align-items:center; gap:10px; }.source-number { display:grid; place-items:center; width:34px; height:34px; border-radius:10px; background:#e6f2fd; color:#276caa; font-weight:800; }.source-number.cover { background:#f1eafa; color:#7652a7; }.source-title strong,.source-title small { display:block; }.source-title strong { color:#404b57; font-size:14px; }.source-title small { margin-top:2px; color:#87919b; font-size:13px; }.image-slot,.decode-upload { display:grid; place-items:center; width:100%; min-height:210px; margin-top:13px; overflow:hidden; border:1px dashed #c8d2db; border-radius:13px; background:#fff; cursor:pointer; }.image-slot img,.decode-upload img { display:block; width:100%; height:210px; object-fit:contain; }.image-slot>span,.decode-upload>span { display:grid; place-items:center; color:#7d8995; }.image-slot b,.decode-upload b { display:grid; place-items:center; width:40px; height:40px; margin-bottom:9px; border-radius:11px; background:#edf3f8; color:#4d789f; font-size:20px; }.image-slot strong,.image-slot small,.decode-upload strong,.decode-upload small { display:block; }.image-slot strong,.decode-upload strong { color:#56636f; font-size:14px; }.image-slot small,.decode-upload small { margin-top:4px; color:#929ba4; font-size:13px; }.image-slot.filled,.decode-upload.filled { border-style:solid; }.file-info { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:8px; }.file-info span { min-width:0; overflow:hidden; color:#5e6874; font-size:13px; white-space:nowrap; text-overflow:ellipsis; }.file-info strong { flex:none; color:#8a949e; font-size:13px; }.source-controls { display:grid; gap:10px; margin-top:14px; padding-top:13px; border-top:1px solid #e5e8ec; }.source-controls label:not(.switch-row),.mix-controls>label:not(.switch-card),.decode-settings>label { display:grid; grid-template-columns:1fr auto; gap:6px 10px; }.source-controls label>span,.mix-controls label>span,.decode-settings label>span { color:#65717d; font-size:13px; font-weight:650; }.source-controls label>strong,.mix-controls label>strong,.decode-settings label>strong { color:#2c6aa3; font-size:13px; }.source-controls input,.mix-controls input,.decode-settings input { grid-column:1/-1; width:100%; accent-color:#2d6eb5; }.switch-row { display:flex; align-items:center; justify-content:space-between; }.switch-row>span { font-size:13px; }
.mix-section,.output-section,.decode-result-section { margin-top:20px; padding-top:19px; border-top:1px solid #e5e8ec; }.preset-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-top:14px; }.preset-grid button { padding:11px 12px; border:1px solid #dde3e8; border-radius:11px; background:#fafcfd; text-align:left; cursor:pointer; }.preset-grid button:hover { border-color:#8eb1d1; background:#f5faff; }.preset-grid strong,.preset-grid span { display:block; }.preset-grid strong { color:#47535f; font-size:14px; }.preset-grid span { margin-top:3px; color:#89939d; font-size:13px; line-height:1.4; }.mix-controls { display:grid; grid-template-columns:repeat(4,1fr); gap:9px; margin-top:11px; }.mix-controls>label { padding:12px; border:1px solid #e0e5e9; border-radius:11px; }.switch-card { display:flex; align-items:center; justify-content:space-between; gap:10px; }.switch-card strong,.switch-card span { display:block; }.switch-card strong { color:#56626e; font-size:13px; }.switch-card span { margin-top:3px; color:#9099a2; font-size:13px!important; font-weight:400!important; }.preview-tabs { display:flex; gap:4px; padding:4px; border-radius:9px; background:#f0f3f6; }.preview-tabs button { border:0; border-radius:7px; padding:6px 9px; background:transparent; color:#747f89; font-size:13px; cursor:pointer; }.preview-tabs button.active { background:#fff; color:#2c6ba5; box-shadow:0 2px 7px rgba(46,67,85,.08); }.output-stage,.decode-result-stage { position:relative; display:flex; align-items:center; justify-content:center; min-height:400px; max-height:650px; margin-top:13px; overflow:auto; border:1px solid #dfe4e8; border-radius:14px; background-color:#eef1f4; background-image:linear-gradient(45deg,#dfe3e8 25%,transparent 25%),linear-gradient(-45deg,#dfe3e8 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#dfe3e8 75%),linear-gradient(-45deg,transparent 75%,#dfe3e8 75%); background-size:24px 24px; background-position:0 0,0 12px,12px -12px,-12px 0; }.output-stage canvas,.decode-result-stage canvas { display:block; max-width:100%; max-height:620px; object-fit:contain; transition:filter .2s; }.output-stage.bright canvas { filter:brightness(1.65) contrast(1.1); }.output-stage.dark canvas { filter:brightness(.55) contrast(1.2); }.empty-output { display:grid; place-items:center; text-align:center; }.empty-output>span { display:grid; place-items:center; width:50px; height:50px; margin-bottom:11px; border-radius:14px; background:rgba(255,255,255,.82); color:#5f83a3; font-size:18px; font-weight:800; }.empty-output strong { color:#5f6974; font-size:14px; }.empty-output p { margin:5px 0 0; color:#87919a; font-size:13px; }.processing { position:absolute; right:12px; bottom:12px; padding:7px 10px; border-radius:8px; background:rgba(32,47,63,.78); color:#fff; font-size:13px; }.output-footer { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:11px; }.output-footer span,.output-footer strong { display:block; }.output-footer span { color:#89939d; font-size:13px; }.output-footer strong { margin-top:2px; color:#4c5966; font-size:13px; }.output-footer button { border:0; border-radius:9px; padding:10px 14px; background:var(--accent); color:#fff; font-size:14px; font-weight:750; cursor:pointer; }.output-footer button:disabled { opacity:.4; cursor:not-allowed; }
.decode-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(320px,.75fr); gap:13px; margin-top:15px; }.decode-source,.decode-settings { min-width:0; padding:15px; border:1px solid #e1e5e9; border-radius:14px; background:#fbfcfd; }.decode-upload { min-height:330px; margin-top:0; }.decode-upload img { height:330px; }.decode-settings { display:grid; align-content:start; gap:15px; }.settings-title { margin-bottom:2px; }.method-select>span { display:block; margin-bottom:7px; color:#65717d; font-size:13px; font-weight:650; }.method-select>div { display:grid; grid-template-columns:repeat(2,1fr); gap:6px; }.method-select button { border:1px solid #dce2e7; border-radius:8px; padding:8px; background:#fff; color:#64717d; font-size:13px; cursor:pointer; }.method-select button.active { border-color:#77a5cf; background:#edf6ff; color:#286aa7; }.inline-warning { margin:0; padding:9px 10px; border-radius:9px; background:#fff3df; color:#96631d; font-size:13px; }.privacy-badge { padding:7px 9px; border-radius:8px; background:#e9f7f1; color:#31775b; font-size:13px; font-weight:700; }
.principle-card { display:flex; align-items:flex-start; gap:11px; margin-top:13px; padding:15px 17px; border:1px solid #dfe4e9; border-radius:15px; background:#fff; }.principle-card>span { display:grid; place-items:center; width:38px; height:38px; flex:none; border-radius:11px; background:#edf3f8; color:#53799c; font-size:13px; font-weight:800; }.principle-card strong { color:#4b5763; font-size:14px; }.principle-card p { margin:3px 0 0; color:#7f8993; font-size:13px; line-height:1.6; }
:global(.dark) .mirage-tool { --ink:#eff4f8; --muted:#a2afb9; }:global(.dark) .hero-metrics { border-color:#40516a; background:rgba(15,23,42,.5); }:global(.dark) .hero-metrics div { border-color:#40516a; }:global(.dark) .hero-metrics strong { color:#e7edf6; }:global(.dark) .hero-metrics span { color:#a8b4c5; }:global(.dark) .mode-tabs button,:global(.dark) .workbench-card,:global(.dark) .principle-card { border-color:#3b4b58; background:#172430; }:global(.dark) .mix-section,:global(.dark) .output-section,:global(.dark) .decode-result-section,:global(.dark) .source-controls { border-color:#3c4c59; }:global(.dark) .mode-tabs strong,:global(.dark) .source-title strong,:global(.dark) .file-info span,:global(.dark) .preset-grid strong,:global(.dark) .switch-card strong,:global(.dark) .output-footer strong,:global(.dark) .empty-output strong,:global(.dark) .principle-card strong { color:#e7edf2; }:global(.dark) .mode-tabs button.active,:global(.dark) .source-card,:global(.dark) .decode-source,:global(.dark) .decode-settings,:global(.dark) .preset-grid button,:global(.dark) .mix-controls>label { border-color:#40515f; background:#1d2b37; }:global(.dark) .image-slot,:global(.dark) .decode-upload,:global(.dark) .method-select button,:global(.dark) .step-actions button,:global(.dark) .reset-button,:global(.dark) .settings-title button { border-color:#465662; background:#172430; color:#bbc7cf; }:global(.dark) .method-select button.active { border-color:#5e91bb; background:#20394d; color:#8dc0ec; }:global(.dark) .output-stage,:global(.dark) .decode-result-stage { border-color:#40515e; background-color:#1d2630; background-image:linear-gradient(45deg,#28333e 25%,transparent 25%),linear-gradient(-45deg,#28333e 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#28333e 75%),linear-gradient(-45deg,transparent 75%,#28333e 75%); }:global(.dark) .preview-tabs { background:#202d38; }:global(.dark) .preview-tabs button.active { background:#2a3945; color:#8dc2eb; }
@media (max-width:960px) { .mix-controls { grid-template-columns:repeat(2,1fr); }.decode-grid { grid-template-columns:1fr; } }
@media (max-width:720px) { .source-grid { grid-template-columns:1fr; }.preset-grid { grid-template-columns:repeat(2,1fr); }.output-stage,.decode-result-stage { min-height:320px; }.step-heading { align-items:flex-start; flex-direction:column; }.step-actions { width:100%; }.step-actions button { flex:1; }.preview-tabs { width:100%; box-sizing:border-box; }.preview-tabs button { flex:1; } }
@media (max-width:640px) { .workbench-card { padding:18px 15px; }.hero-metrics { grid-template-columns:1fr; }.hero-metrics div { border-left:0; border-bottom:1px solid #e5edf6; }.hero-metrics div:last-child { border-bottom:0; }.mode-tabs { grid-template-columns:1fr; }.mix-controls,.preset-grid { grid-template-columns:1fr; }.file-info { align-items:flex-start; flex-direction:column; }.decode-upload,.decode-upload img { min-height:260px; height:260px; }.output-footer { align-items:stretch; flex-direction:column; }.output-footer button { width:100%; } }
</style>
