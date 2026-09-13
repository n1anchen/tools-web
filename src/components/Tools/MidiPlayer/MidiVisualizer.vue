<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { MidiChannel, MidiProject } from '@/utils/midiProject'
import { formatMidiTime, midiNoteName } from '@/utils/midiProject'

const props = defineProps<{
  project: MidiProject | null
  currentTime: number
  visibleChannels: number[]
  selectedChannel: number | null
  mode: 'roll' | 'waterfall'
}>()

const emit = defineEmits<{ seek: [seconds: number] }>()
const wrapEl = ref<HTMLDivElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
let resizeObserver: ResizeObserver | null = null
let drawFrame = 0
let drawPending = false

const channels = computed(() => {
  const visible = new Set(props.visibleChannels)
  return (props.project?.channels || []).filter(channel => visible.has(channel.channel))
})

function css(variable: string, fallback: string) {
  const element = wrapEl.value
  if (!element) return fallback
  return getComputedStyle(element).getPropertyValue(variable).trim() || fallback
}

function alpha(color: string, opacity: number) {
  const hex = color.replace('#', '')
  const value = Number.parseInt(hex.length === 3 ? hex.split('').map(char => char + char).join('') : hex, 16)
  return `rgba(${value >> 16}, ${(value >> 8) & 255}, ${value & 255}, ${opacity})`
}

function pitchRange(list: MidiChannel[]) {
  const notes = list.flatMap(channel => channel.notes)
  if (!notes.length) return { min: 48, max: 84 }
  const min = Math.max(0, Math.min(...notes.map(note => note.pitch)) - 2)
  const max = Math.min(127, Math.max(...notes.map(note => note.pitch)) + 2)
  return { min, max: Math.max(min + 12, max) }
}

function prepareCanvas() {
  const canvas = canvasEl.value
  const wrap = wrapEl.value
  if (!canvas || !wrap) return null
  const width = Math.max(320, wrap.clientWidth)
  const height = Math.max(300, wrap.clientHeight)
  const ratio = Math.min(window.devicePixelRatio || 1, 2)
  if (canvas.width !== Math.floor(width * ratio) || canvas.height !== Math.floor(height * ratio)) {
    canvas.width = Math.floor(width * ratio)
    canvas.height = Math.floor(height * ratio)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
  }
  const context = canvas.getContext('2d')
  if (!context) return null
  context.setTransform(ratio, 0, 0, ratio, 0, 0)
  context.clearRect(0, 0, width, height)
  return { context, width, height }
}

function drawEmpty(context: CanvasRenderingContext2D, width: number, height: number) {
  context.fillStyle = css('--c-surface-subtle', '#f8fafc')
  context.fillRect(0, 0, width, height)
  context.textAlign = 'center'
  context.fillStyle = css('--c-text-secondary', '#64748b')
  context.font = '600 15px system-ui, sans-serif'
  context.fillText('选择示例或导入 MIDI，音符会显示在这里', width / 2, height / 2 - 4)
  context.fillStyle = css('--c-text-muted', '#94a3b8')
  context.font = '12px system-ui, sans-serif'
  context.fillText('每种颜色代表一个乐器通道', width / 2, height / 2 + 20)
}

function drawRoll(context: CanvasRenderingContext2D, width: number, height: number, project: MidiProject) {
  const gutter = 50
  const timeline = 28
  const contentWidth = width - gutter
  const contentHeight = height - timeline
  const range = pitchRange(channels.value)
  const rows = range.max - range.min + 1
  const rowHeight = contentHeight / rows
  const background = css('--c-surface-subtle', '#f8fafc')
  const line = css('--c-border', '#e2e8f0')
  const mutedText = css('--c-text-muted', '#94a3b8')
  const duration = Math.max(project.duration, 0.1)

  context.fillStyle = background
  context.fillRect(0, 0, width, height)
  for (let pitch = range.min; pitch <= range.max; pitch += 1) {
    const y = (range.max - pitch) * rowHeight
    const isBlack = [1, 3, 6, 8, 10].includes(pitch % 12)
    context.fillStyle = isBlack ? 'rgba(100,116,139,.08)' : 'rgba(255,255,255,.24)'
    context.fillRect(gutter, y, contentWidth, rowHeight)
    if (pitch % 12 === 0) {
      context.fillStyle = mutedText
      context.font = '10px ui-monospace, monospace'
      context.textAlign = 'right'
      context.fillText(midiNoteName(pitch), gutter - 8, y + Math.max(10, rowHeight * .75))
      context.strokeStyle = line
      context.beginPath()
      context.moveTo(gutter, Math.round(y) + .5)
      context.lineTo(width, Math.round(y) + .5)
      context.stroke()
    }
  }

  const targetLines = Math.max(4, Math.floor(contentWidth / 110))
  const roughStep = duration / targetLines
  const stepOptions = [1, 2, 5, 10, 15, 30, 60, 120, 300]
  const step = stepOptions.find(value => value >= roughStep) || 600
  context.strokeStyle = line
  context.fillStyle = mutedText
  context.font = '10px ui-monospace, monospace'
  context.textAlign = 'left'
  for (let time = 0; time <= duration; time += step) {
    const x = gutter + time / duration * contentWidth
    context.beginPath()
    context.moveTo(Math.round(x) + .5, 0)
    context.lineTo(Math.round(x) + .5, contentHeight)
    context.stroke()
    context.fillText(formatMidiTime(time), Math.min(width - 30, x + 4), height - 9)
  }

  const selected = props.selectedChannel
  for (const channel of channels.value) {
    const isSelected = selected === null || selected === channel.channel
    for (const note of channel.notes) {
      const x = gutter + note.start / duration * contentWidth
      const noteWidth = Math.max(2, note.duration / duration * contentWidth)
      const y = (range.max - note.pitch) * rowHeight + 1
      const noteHeight = Math.max(2, rowHeight - 2)
      const active = note.start <= props.currentTime && note.end >= props.currentTime
      context.fillStyle = alpha(channel.color, isSelected ? .86 : .26)
      if (active) {
        context.shadowColor = channel.color
        context.shadowBlur = 9
        context.fillStyle = channel.color
      }
      context.fillRect(x, y, noteWidth, noteHeight)
      context.shadowBlur = 0
    }
  }

  const playheadX = gutter + Math.min(1, props.currentTime / duration) * contentWidth
  context.strokeStyle = css('--c-primary', '#3b82f6')
  context.lineWidth = 2
  context.beginPath()
  context.moveTo(playheadX, 0)
  context.lineTo(playheadX, contentHeight)
  context.stroke()
  context.fillStyle = css('--c-primary', '#3b82f6')
  context.beginPath()
  context.moveTo(playheadX - 5, 0)
  context.lineTo(playheadX + 5, 0)
  context.lineTo(playheadX, 7)
  context.closePath()
  context.fill()
}

function drawWaterfall(context: CanvasRenderingContext2D, width: number, height: number, project: MidiProject) {
  const keyboardHeight = 66
  const gutter = 42
  const contentWidth = width - gutter
  const contentHeight = height - keyboardHeight
  const horizon = Math.min(12, Math.max(5, project.duration / 3))
  const range = pitchRange(channels.value)
  const keys = range.max - range.min + 1
  const keyWidth = contentWidth / keys
  const line = css('--c-border', '#e2e8f0')
  const text = css('--c-text-muted', '#94a3b8')

  const gradient = context.createLinearGradient(0, 0, 0, contentHeight)
  gradient.addColorStop(0, css('--c-surface-subtle', '#f8fafc'))
  gradient.addColorStop(1, alpha(css('--c-primary', '#3b82f6'), .08))
  context.fillStyle = gradient
  context.fillRect(0, 0, width, contentHeight)

  context.font = '10px ui-monospace, monospace'
  context.fillStyle = text
  context.textAlign = 'right'
  for (let second = 0; second <= horizon; second += 2) {
    const y = contentHeight - second / horizon * contentHeight
    context.strokeStyle = line
    context.beginPath()
    context.moveTo(gutter, Math.round(y) + .5)
    context.lineTo(width, Math.round(y) + .5)
    context.stroke()
    context.fillText(`+${second}s`, gutter - 6, Math.max(10, y - 4))
  }

  for (const channel of channels.value) {
    const isSelected = props.selectedChannel === null || props.selectedChannel === channel.channel
    for (const note of channel.notes) {
      if (note.end < props.currentTime - .15 || note.start > props.currentTime + horizon) continue
      const x = gutter + (note.pitch - range.min) * keyWidth + 1
      const yBottom = contentHeight - (note.start - props.currentTime) / horizon * contentHeight
      const noteHeight = Math.max(4, note.duration / horizon * contentHeight)
      const y = yBottom - noteHeight
      const active = note.start <= props.currentTime && note.end >= props.currentTime
      context.fillStyle = alpha(channel.color, isSelected ? .88 : .25)
      if (active) {
        context.shadowColor = channel.color
        context.shadowBlur = 12
        context.fillStyle = channel.color
      }
      context.fillRect(x, y, Math.max(2, keyWidth - 2), noteHeight)
      context.shadowBlur = 0
    }
  }

  context.fillStyle = css('--c-surface', '#fff')
  context.fillRect(0, contentHeight, width, keyboardHeight)
  context.strokeStyle = line
  context.beginPath()
  context.moveTo(0, contentHeight + .5)
  context.lineTo(width, contentHeight + .5)
  context.stroke()
  for (let pitch = range.min; pitch <= range.max; pitch += 1) {
    const x = gutter + (pitch - range.min) * keyWidth
    const black = [1, 3, 6, 8, 10].includes(pitch % 12)
    const activeChannel = channels.value.find(channel => channel.notes.some(note => note.pitch === pitch && note.start <= props.currentTime && note.end >= props.currentTime))
    context.fillStyle = activeChannel ? alpha(activeChannel.color, .88) : black ? '#273449' : css('--c-surface', '#ffffff')
    context.fillRect(x + .5, contentHeight + 1, Math.max(1, keyWidth - 1), black ? keyboardHeight * .62 : keyboardHeight - 1)
    if (pitch % 12 === 0 && keyWidth > 8) {
      context.fillStyle = black ? '#fff' : text
      context.font = '9px ui-monospace, monospace'
      context.textAlign = 'center'
      context.fillText(midiNoteName(pitch), x + keyWidth / 2, height - 7)
    }
  }
}

function draw() {
  // 播放时间自身每帧都会变化。这里只合并重复请求，不能取消已排队的帧，
  // 否则父组件的时间更新会让 Canvas 绘制持续“饿死”，直到暂停才刷新。
  if (drawPending) return
  drawPending = true
  drawFrame = requestAnimationFrame(() => {
    drawPending = false
    const prepared = prepareCanvas()
    if (!prepared) return
    const { context, width, height } = prepared
    if (!props.project || !channels.value.length) drawEmpty(context, width, height)
    else if (props.mode === 'roll') drawRoll(context, width, height, props.project)
    else drawWaterfall(context, width, height, props.project)
  })
}

function handleClick(event: MouseEvent) {
  if (props.mode !== 'roll' || !props.project || !canvasEl.value) return
  const rect = canvasEl.value.getBoundingClientRect()
  const gutter = 50
  const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left - gutter) / Math.max(1, rect.width - gutter)))
  emit('seek', props.project.duration * ratio)
}

watch(() => [props.project, props.currentTime, props.visibleChannels, props.selectedChannel, props.mode], draw, { deep: true })
onMounted(async () => {
  await nextTick()
  resizeObserver = new ResizeObserver(draw)
  if (wrapEl.value) resizeObserver.observe(wrapEl.value)
  draw()
})
onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  cancelAnimationFrame(drawFrame)
  drawPending = false
})
</script>

<template>
  <div ref="wrapEl" class="visualizer" :class="mode">
    <canvas ref="canvasEl" role="img" :aria-label="project ? `${project.name} 的${mode === 'roll' ? '钢琴卷帘' : '音符瀑布'}视图` : 'MIDI 可视化区域'" @click="handleClick" />
    <span class="sr-only">当前播放到 {{ formatMidiTime(currentTime) }}</span>
  </div>
</template>

<style scoped>
.visualizer {
  position: relative;
  width: 100%;
  height: clamp(330px, 46vw, 530px);
  min-height: 300px;
  overflow: hidden;
  background: var(--c-surface-subtle);
}
.visualizer canvas { display: block; width: 100%; height: 100%; }
.visualizer.roll canvas { cursor: crosshair; }
@media (max-width: 700px) {
  .visualizer { height: 360px; }
}
</style>
