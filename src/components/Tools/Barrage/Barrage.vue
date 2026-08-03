<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { FullScreen, VideoPause } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { estimateBarrageDuration, getContrastSummary, normalizeBarrageMessages } from '@/utils/displayStudio'

type Orientation = 'landscape' | 'portrait'
type DisplayMode = 'scroll' | 'static' | 'pulse'
type Direction = 'left' | 'right'

const presets = [
  { label: '现场应援', note: '高能红金', content: '你是最棒的！\n全场为你欢呼', textColor: '#FFE066', bgColor: '#B91C1C', mode: 'scroll' as DisplayMode },
  { label: '接机欢迎', note: '清爽蓝白', content: '欢迎回来！\n一路辛苦啦', textColor: '#FFFFFF', bgColor: '#1D4ED8', mode: 'scroll' as DisplayMode },
  { label: '安静求助', note: '醒目黄黑', content: '请帮我拍张照，谢谢！', textColor: '#111827', bgColor: '#FACC15', mode: 'static' as DisplayMode },
  { label: '生日祝福', note: '闪动粉紫', content: '生日快乐！🎂\n天天开心 ✨', textColor: '#FFFFFF', bgColor: '#7E22CE', mode: 'pulse' as DisplayMode },
]
const colorPresets = [
  { label: '黑白', text: '#FFFFFF', background: '#000000' },
  { label: '红金', text: '#FFE066', background: '#B91C1C' },
  { label: '蓝白', text: '#FFFFFF', background: '#1D4ED8' },
  { label: '黄黑', text: '#111827', background: '#FACC15' },
]
const modeOptions = [
  { label: '滚动', value: 'scroll' },
  { label: '常亮', value: 'static' },
  { label: '呼吸', value: 'pulse' },
]
const directionOptions = [
  { label: '向左', value: 'left' },
  { label: '向右', value: 'right' },
]

const state = reactive({
  content: '在线工具箱\n欢迎使用手持弹幕',
  speed: 120,
  textSize: 128,
  textColor: '#FFFFFF',
  bgColor: '#000000',
  mode: 'scroll' as DisplayMode,
  direction: 'left' as Direction,
  orientationLock: 'auto' as 'auto' | Orientation,
  separator: ' ✦ ',
})
const isPlaying = ref(false)
const overlayRef = ref<HTMLElement | null>(null)
const animationKey = ref(0)
const screenOrientation = ref<Orientation>(window.innerWidth >= window.innerHeight ? 'landscape' : 'portrait')
const viewport = reactive({ width: window.innerWidth, height: window.innerHeight })
let nativeFullscreen = false

const messages = computed(() => normalizeBarrageMessages(state.content))
const displayText = computed(() => messages.value.join(state.separator))
const activeOrientation = computed<Orientation>(() => state.orientationLock === 'auto' ? screenOrientation.value : state.orientationLock)
const contrast = computed(() => getContrastSummary(state.textColor, state.bgColor))
const displayLength = computed(() => Math.max(1, Array.from(displayText.value).length))
const activeDisplayWidth = computed(() => activeOrientation.value === 'landscape' ? viewport.width : viewport.height)
const preferredPreviewSize = computed(() => Math.max(22, Math.min(64, state.textSize * 0.34)))
const fittedPreviewSize = computed(() => state.mode === 'scroll'
  ? preferredPreviewSize.value
  : Math.max(20, Math.min(preferredPreviewSize.value, (Math.min(720, viewport.width - 40) * 0.82) / displayLength.value)))
const fittedFullscreenSize = computed(() => state.mode === 'scroll'
  ? state.textSize
  : Math.max(32, Math.min(state.textSize, (activeDisplayWidth.value * 0.82) / displayLength.value)))
const fullDuration = computed(() => estimateBarrageDuration(messages.value, state.textSize, state.speed, activeDisplayWidth.value))
const previewDuration = computed(() => estimateBarrageDuration(messages.value, preferredPreviewSize.value, state.speed, 720))
const previewTrackStyle = computed(() => ({
  color: state.textColor,
  fontSize: `${fittedPreviewSize.value}px`,
  '--duration': `${previewDuration.value}s`,
}))
const fullscreenTrackStyle = computed(() => ({
  color: state.textColor,
  fontSize: `${fittedFullscreenSize.value}px`,
  '--duration': `${fullDuration.value}s`,
}))
const modeLabel = computed(() => ({ scroll: '连续滚动', static: '居中常亮', pulse: '呼吸闪动' })[state.mode])

function restartAnimation() {
  animationKey.value += 1
}

function applyPreset(preset: typeof presets[number]) {
  state.content = preset.content
  state.textColor = preset.textColor
  state.bgColor = preset.bgColor
  state.mode = preset.mode
  restartAnimation()
}

function applyColors(preset: typeof colorPresets[number]) {
  state.textColor = preset.text
  state.bgColor = preset.background
}

async function startDisplay() {
  if (!messages.value.length) {
    ElMessage.warning('请先输入至少一条展示内容')
    return
  }
  isPlaying.value = true
  restartAnimation()
  await nextTick()
  try {
    if (overlayRef.value?.requestFullscreen) {
      await overlayRef.value.requestFullscreen()
      nativeFullscreen = true
    }
  } catch {
    nativeFullscreen = false
  }
}

async function stopDisplay() {
  isPlaying.value = false
  nativeFullscreen = false
  if (document.fullscreenElement) {
    try {
      await document.exitFullscreen()
    } catch {
      // Fixed-position overlay has already been closed.
    }
  }
}

function updateOrientation() {
  viewport.width = window.innerWidth
  viewport.height = window.innerHeight
  screenOrientation.value = window.innerWidth >= window.innerHeight ? 'landscape' : 'portrait'
  restartAnimation()
}

function handleFullscreenChange() {
  if (!document.fullscreenElement && nativeFullscreen) {
    nativeFullscreen = false
    isPlaying.value = false
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isPlaying.value) stopDisplay()
}

watch(() => [state.content, state.speed, state.textSize, state.mode, state.direction, state.separator], restartAnimation)
onMounted(() => {
  window.addEventListener('resize', updateOrientation)
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  window.addEventListener('keydown', handleKeydown)
})
onUnmounted(() => {
  window.removeEventListener('resize', updateOrientation)
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  window.removeEventListener('keydown', handleKeydown)
  if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined)
})
</script>

<template>
  <div class="barrage-page flex flex-col mt-3 flex-1">
    <DetailHeader title="手持弹幕工作台" />

    <section class="barrage-hero">
      <div>
        <span class="eyebrow">HANDHELD DISPLAY STUDIO</span>
        <h2>先在页面里看清，再举起你的大屏</h2>
        <p>支持多条内容、滚动/常亮/呼吸模式、方向与对比度检查；全屏失败时也会自动使用沉浸式覆盖层。</p>
      </div>
      <button type="button" :disabled="!messages.length" @click="startDisplay"><el-icon><FullScreen /></el-icon><span><strong>进入全屏展示</strong><small>ESC 或按钮退出</small></span></button>
    </section>

    <section class="preview-card">
      <header class="preview-heading">
        <div><span class="eyebrow">LIVE STAGE PREVIEW</span><h3>实时舞台预览</h3></div>
        <div class="preview-meta"><span>{{ modeLabel }}</span><span>{{ activeOrientation === 'landscape' ? '横屏' : '竖屏' }}</span><span>{{ state.mode === 'scroll' ? `约 ${previewDuration}s / 圈` : '持续展示' }}</span></div>
      </header>
      <div class="preview-stage" :style="{ backgroundColor: state.bgColor }">
        <div v-if="displayText" :key="`preview-${animationKey}`" :class="['display-track', state.mode, state.direction]" :style="previewTrackStyle">{{ displayText }}</div>
        <div v-else class="empty-stage">输入内容后即可预览</div>
        <div class="safe-area"><span>安全显示区</span></div>
      </div>
    </section>

    <div class="workspace-grid">
      <section class="control-card">
        <header class="card-heading"><div><span class="eyebrow">CONTENT & MOTION</span><h3>内容与运动</h3></div><span class="message-count">{{ messages.length }} / 12 条</span></header>
        <label class="field-label"><span>每行一条展示内容</span><b>单条最多 80 字</b></label>
        <el-input v-model="state.content" type="textarea" :rows="5" resize="none" maxlength="960" placeholder="输入展示内容，换行可添加多条" aria-label="弹幕展示内容" />

        <div class="preset-section"><span>场景预设</span><div><button v-for="preset in presets" :key="preset.label" type="button" @click="applyPreset(preset)"><strong>{{ preset.label }}</strong><small>{{ preset.note }}</small></button></div></div>

        <div class="mode-grid">
          <label><span>展示模式</span><el-segmented v-model="state.mode" :options="modeOptions" /></label>
          <label><span>滚动方向</span><el-segmented v-model="state.direction" :options="directionOptions" :disabled="state.mode !== 'scroll'" /></label>
        </div>

        <div class="slider-setting" :class="{ disabled: state.mode !== 'scroll' }"><label><span>滚动速度</span><strong>{{ state.speed }} px/s</strong></label><el-slider v-model="state.speed" :min="40" :max="260" :step="10" :disabled="state.mode !== 'scroll'" /></div>
        <div class="slider-setting"><label><span>全屏字号</span><strong>{{ state.textSize }} px</strong></label><el-slider v-model="state.textSize" :min="36" :max="320" :step="4" /></div>
      </section>

      <aside class="appearance-card">
        <header class="card-heading"><div><span class="eyebrow">VISIBILITY CHECK</span><h3>外观与可读性</h3></div><span :class="['contrast-badge', contrast.level]">{{ contrast.ratio }} : 1</span></header>

        <div class="color-fields">
          <label><span>文字颜色</span><div><el-color-picker v-model="state.textColor" /><code>{{ state.textColor }}</code></div></label>
          <label><span>背景颜色</span><div><el-color-picker v-model="state.bgColor" /><code>{{ state.bgColor }}</code></div></label>
        </div>
        <div class="color-presets"><button v-for="preset in colorPresets" :key="preset.label" type="button" :aria-label="`使用${preset.label}配色`" @click="applyColors(preset)"><i :style="{ background: `linear-gradient(135deg, ${preset.background} 50%, ${preset.text} 50%)` }"></i><span>{{ preset.label }}</span></button></div>

        <div :class="['contrast-card', contrast.level]"><strong>{{ contrast.label }}</strong><p>远距离展示建议保持至少 4.5:1；达到 7:1 时，在复杂环境中通常更稳妥。</p></div>

        <label class="option-field"><span>屏幕方向</span><el-radio-group v-model="state.orientationLock"><el-radio-button value="auto">自动</el-radio-button><el-radio-button value="landscape">横屏</el-radio-button><el-radio-button value="portrait">竖屏</el-radio-button></el-radio-group></label>
        <label class="option-field"><span>消息分隔符</span><el-input v-model="state.separator" maxlength="8" aria-label="消息分隔符" /></label>

        <div class="summary-grid">
          <div><span>有效消息</span><strong>{{ messages.length }} 条</strong></div>
          <div><span>全屏单圈</span><strong>{{ state.mode === 'scroll' ? `${fullDuration}s` : '—' }}</strong></div>
          <div><span>当前方向</span><strong>{{ activeOrientation === 'landscape' ? '横屏展示' : '竖屏展示' }}</strong></div>
          <div><span>处理方式</span><strong>浏览器本地</strong></div>
        </div>
      </aside>
    </div>

    <ToolDetail title="展示建议">
      <el-text>输入内容按行组成消息序列，空行会自动忽略，最多展示 12 条且每条最多 80 字。滚动时长会根据内容长度、字号、速度和屏幕宽度估算；现场使用前建议调高屏幕亮度、关闭自动锁屏，并优先选择对比度 4.5:1 以上的配色。全屏状态可按 ESC 或点击右上角按钮退出。</el-text>
    </ToolDetail>

    <div v-if="isPlaying" ref="overlayRef" class="fullscreen-overlay" :style="{ backgroundColor: state.bgColor }" @dblclick="stopDisplay">
      <div :class="['fullscreen-canvas', activeOrientation]">
        <button type="button" class="exit-button" aria-label="退出全屏展示" @click.stop="stopDisplay"><el-icon><VideoPause /></el-icon>退出展示</button>
        <div :key="`fullscreen-${animationKey}`" :class="['display-track', 'fullscreen-track', state.mode, state.direction]" :style="fullscreenTrackStyle">{{ displayText }}</div>
        <div class="exit-hint">双击画面或按 ESC 退出</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.barrage-page{--accent:#f43f5e;--accent-deep:#e11d48;--soft:#fff1f2;gap:16px}.barrage-hero,.preview-card,.control-card,.appearance-card{border:1px solid #e2e8f0;border-radius:22px;background:#fff;box-shadow:0 16px 40px rgba(15,23,42,.055)}.barrage-hero{display:flex;align-items:center;justify-content:space-between;gap:28px;padding:27px 30px;border:0;color:#fff;background:radial-gradient(circle at 80% 0,rgba(251,191,36,.28),transparent 27%),linear-gradient(135deg,#111827,#be123c 58%,#f97316)}.eyebrow{display:block;margin-bottom:6px;color:var(--accent);font-size:10px;font-weight:900;letter-spacing:.16em}.barrage-hero .eyebrow{color:#fde68a}.barrage-hero h2{margin:0;font-size:clamp(24px,3vw,36px);font-weight:850;letter-spacing:-.03em}.barrage-hero p{max-width:720px;margin:9px 0 0;color:#ffe4e6;line-height:1.65}.barrage-hero>button{display:flex;align-items:center;gap:10px;min-width:176px;padding:13px 15px;border:1px solid rgba(255,255,255,.28);border-radius:14px;color:#be123c;background:#fff;cursor:pointer;box-shadow:0 10px 25px rgba(15,23,42,.16)}.barrage-hero>button:disabled{opacity:.5;cursor:not-allowed}.barrage-hero>button>.el-icon{font-size:22px}.barrage-hero>button span,.barrage-hero>button strong,.barrage-hero>button small{display:block;text-align:left}.barrage-hero>button strong{font-size:12px}.barrage-hero>button small{margin-top:2px;color:#94a3b8;font-size:9px}.preview-card{padding:21px}.preview-heading,.card-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}.preview-heading{margin-bottom:13px}.preview-heading h3,.card-heading h3{margin:0;color:#0f172a;font-size:19px}.preview-meta{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:5px}.preview-meta span,.message-count{padding:5px 8px;border-radius:999px;color:#64748b;background:#f1f5f9;font-size:9px}.preview-stage{position:relative;display:flex;align-items:center;height:230px;border-radius:17px;overflow:hidden;isolation:isolate}.preview-stage::after,.fullscreen-canvas::after{position:absolute;inset:0;z-index:-1;background:repeating-linear-gradient(0deg,rgba(255,255,255,.025) 0 1px,transparent 1px 4px);content:"";pointer-events:none}.safe-area{position:absolute;inset:16px;border:1px dashed rgba(255,255,255,.2);border-radius:10px;pointer-events:none}.safe-area span{position:absolute;right:7px;bottom:5px;color:rgba(255,255,255,.36);font-size:8px}.display-track{position:relative;z-index:1;width:max-content;max-width:none;font-weight:900;line-height:1;letter-spacing:.04em;white-space:nowrap;text-shadow:0 .04em .16em rgba(0,0,0,.28);will-change:transform}.display-track.scroll{animation:ticker var(--duration) linear infinite}.display-track.scroll.right{animation-direction:reverse}.display-track.static,.display-track.pulse{width:100%;padding:0 6%;text-align:center;white-space:normal}.display-track.pulse{animation:pulse-display 1.25s ease-in-out infinite}.empty-stage{width:100%;color:rgba(255,255,255,.55);text-align:center}.workspace-grid{display:grid;grid-template-columns:minmax(0,1.12fr) minmax(330px,.78fr);gap:16px;align-items:start}.control-card,.appearance-card{padding:21px}.card-heading{margin-bottom:18px}.field-label,.slider-setting label{display:flex;align-items:center;justify-content:space-between;margin-bottom:7px;color:#64748b;font-size:11px}.field-label b,.slider-setting strong{color:var(--accent-deep)}.preset-section{margin-top:15px}.preset-section>span{display:block;margin-bottom:7px;color:#64748b;font-size:10px}.preset-section>div{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.preset-section button{padding:9px;border:1px solid #e2e8f0;border-radius:11px;color:#64748b;background:#f8fafc;text-align:left;cursor:pointer}.preset-section button strong,.preset-section button small{display:block}.preset-section button strong{color:#334155;font-size:10px}.preset-section button small{margin-top:3px;color:#94a3b8;font-size:8px}.mode-grid{display:grid;grid-template-columns:1.2fr 1fr;gap:12px;margin-top:17px}.mode-grid label>span{display:block;margin-bottom:7px;color:#64748b;font-size:10px}.mode-grid :deep(.el-segmented){width:100%}.slider-setting{margin-top:14px}.slider-setting.disabled{opacity:.45}.slider-setting :deep(.el-slider){padding:0 8px}.contrast-badge{padding:5px 8px;border-radius:999px;font-size:9px;font-weight:900}.contrast-badge.excellent,.contrast-badge.good{color:#047857;background:#d1fae5}.contrast-badge.low{color:#be123c;background:#ffe4e6}.color-fields{display:grid;grid-template-columns:1fr 1fr;gap:9px}.color-fields label{padding:10px;border:1px solid #e2e8f0;border-radius:12px}.color-fields label>span{display:block;margin-bottom:7px;color:#94a3b8;font-size:9px}.color-fields label>div{display:flex;align-items:center;gap:8px}.color-fields code{color:#475569;font-size:10px}.color-presets{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:9px}.color-presets button{display:flex;align-items:center;gap:5px;padding:6px;border:1px solid #e2e8f0;border-radius:9px;color:#64748b;background:#fff;cursor:pointer;font-size:8px}.color-presets i{width:17px;height:17px;border:1px solid #cbd5e1;border-radius:50%}.contrast-card{margin-top:12px;padding:11px 12px;border-left:3px solid #10b981;border-radius:10px;background:#ecfdf5}.contrast-card.low{border-color:#f43f5e;background:#fff1f2}.contrast-card strong{color:#047857;font-size:11px}.contrast-card.low strong{color:#be123c}.contrast-card p{margin:3px 0 0;color:#64748b;font-size:9px;line-height:1.5}.option-field{display:grid;grid-template-columns:86px 1fr;align-items:center;gap:8px;margin-top:13px}.option-field>span{color:#64748b;font-size:10px}.option-field :deep(.el-radio-group),.option-field :deep(.el-input){width:100%}.summary-grid{display:grid;grid-template-columns:1fr 1fr;margin-top:14px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden}.summary-grid div{padding:10px;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0}.summary-grid div:nth-child(2n){border-right:0}.summary-grid div:nth-last-child(-n+2){border-bottom:0}.summary-grid span,.summary-grid strong{display:block}.summary-grid span{color:#94a3b8;font-size:8px}.summary-grid strong{margin-top:3px;color:#334155;font-size:10px}.fullscreen-overlay{position:fixed;inset:0;z-index:99999;overflow:hidden}.fullscreen-canvas{position:absolute;top:0;left:0;display:flex;align-items:center;width:100vw;height:100vh;overflow:hidden}.fullscreen-canvas.portrait{width:100vh;height:100vw;transform:rotate(90deg) translateY(-100%);transform-origin:top left}.fullscreen-track{font-weight:950}.exit-button{position:absolute;top:18px;right:18px;z-index:5;display:flex;align-items:center;gap:5px;padding:9px 12px;border:1px solid rgba(255,255,255,.28);border-radius:999px;color:#fff;background:rgba(15,23,42,.58);cursor:pointer;backdrop-filter:blur(8px)}.exit-hint{position:absolute;right:20px;bottom:17px;color:rgba(255,255,255,.35);font-size:10px}@keyframes ticker{from{transform:translateX(100vw)}to{transform:translateX(-100%)}}@keyframes pulse-display{0%,100%{opacity:.72;transform:scale(.96)}50%{opacity:1;transform:scale(1.04)}}
:global(html.dark .barrage-page .preview-card),:global(html.dark .barrage-page .control-card),:global(html.dark .barrage-page .appearance-card){border-color:#334155;background:#1e293b;box-shadow:none}:global(html.dark .barrage-page .preview-heading h3),:global(html.dark .barrage-page .card-heading h3),:global(html.dark .barrage-page .preset-section button strong),:global(html.dark .barrage-page .summary-grid strong){color:#f8fafc}:global(html.dark .barrage-page .preview-meta span),:global(html.dark .barrage-page .message-count),:global(html.dark .barrage-page .preset-section button),:global(html.dark .barrage-page .color-presets button){border-color:#334155;color:#cbd5e1;background:#0f172a}:global(html.dark .barrage-page .color-fields label),:global(html.dark .barrage-page .summary-grid),:global(html.dark .barrage-page .summary-grid div){border-color:#334155}:global(html.dark .barrage-page .color-fields code){color:#cbd5e1}:global(html.dark .barrage-page .contrast-card){background:#064e3b}:global(html.dark .barrage-page .contrast-card.low){background:#4c0519}:global(html.dark .barrage-page .contrast-card p){color:#cbd5e1}
@media(max-width:1000px){.workspace-grid{grid-template-columns:1fr}.preview-stage{height:210px}}@media(max-width:700px){.barrage-page{gap:12px}.barrage-hero{align-items:flex-start;flex-direction:column;padding:22px 20px}.barrage-hero>button{width:100%;justify-content:center}.preview-card,.control-card,.appearance-card{padding:15px}.preview-heading{align-items:flex-start;flex-direction:column}.preview-meta{justify-content:flex-start}.preview-stage{height:180px}.preset-section>div{grid-template-columns:1fr 1fr}.mode-grid,.color-fields{grid-template-columns:1fr}.color-presets{grid-template-columns:1fr 1fr}.option-field{grid-template-columns:1fr}.card-heading{align-items:flex-start}}
</style>
