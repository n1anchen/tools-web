<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { buildSpriteRects, getSpriteRemainder } from '@/utils/animationStudio'
import type { SpriteDialogValue } from './types'

const props = defineProps<{
  modelValue: boolean
  value: SpriteDialogValue | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [value: SpriteDialogValue]
}>()

const state = reactive({
  x: 0,
  y: 0,
  width: 1,
  height: 1,
  cellWidth: 1,
  cellHeight: 1,
})
const svgRef = ref<SVGSVGElement | null>(null)
const pointer = reactive({ mode: '' as '' | 'move' | 'resize', startX: 0, startY: 0, x: 0, y: 0, width: 1, height: 1 })

watch(
  () => [props.modelValue, props.value] as const,
  () => {
    if (!props.modelValue || !props.value) return
    Object.assign(state, {
      x: props.value.cropRect.x,
      y: props.value.cropRect.y,
      width: props.value.cropRect.width,
      height: props.value.cropRect.height,
      cellWidth: props.value.cellWidth,
      cellHeight: props.value.cellHeight,
    })
  },
  { immediate: true },
)

const imageWidth = computed(() => props.value?.imageWidth ?? 1)
const imageHeight = computed(() => props.value?.imageHeight ?? 1)
const cropRect = computed(() => ({ x: state.x, y: state.y, width: state.width, height: state.height }))
const rects = computed(() => buildSpriteRects(imageWidth.value, imageHeight.value, cropRect.value, state.cellWidth, state.cellHeight))
const remainder = computed(() => getSpriteRemainder(cropRect.value, state.cellWidth, state.cellHeight))
const columns = computed(() => rects.value.length ? Math.floor(state.width / state.cellWidth) : 0)
const rows = computed(() => rects.value.length ? Math.floor(state.height / state.cellHeight) : 0)
const verticalLines = computed(() => Array.from({ length: Math.max(0, columns.value - 1) }, (_, index) => state.x + (index + 1) * state.cellWidth))
const horizontalLines = computed(() => Array.from({ length: Math.max(0, rows.value - 1) }, (_, index) => state.y + (index + 1) * state.cellHeight))
const handleRadius = computed(() => Math.max(5, Math.min(imageWidth.value, imageHeight.value) / 80))
const tooManyFrames = computed(() => rects.value.length > 300)

function clampState() {
  state.x = Math.min(imageWidth.value - 1, Math.max(0, Math.round(state.x)))
  state.y = Math.min(imageHeight.value - 1, Math.max(0, Math.round(state.y)))
  state.width = Math.min(imageWidth.value - state.x, Math.max(1, Math.round(state.width)))
  state.height = Math.min(imageHeight.value - state.y, Math.max(1, Math.round(state.height)))
  state.cellWidth = Math.min(state.width, Math.max(1, Math.round(state.cellWidth)))
  state.cellHeight = Math.min(state.height, Math.max(1, Math.round(state.cellHeight)))
}

function resetRange() {
  state.x = 0
  state.y = 0
  state.width = imageWidth.value
  state.height = imageHeight.value
  clampState()
}

function pointFromEvent(event: PointerEvent) {
  const svg = svgRef.value
  if (!svg) return { x: 0, y: 0 }
  const box = svg.getBoundingClientRect()
  return {
    x: (event.clientX - box.left) / box.width * imageWidth.value,
    y: (event.clientY - box.top) / box.height * imageHeight.value,
  }
}

function startPointer(event: PointerEvent, mode: 'move' | 'resize') {
  event.preventDefault()
  const point = pointFromEvent(event)
  pointer.mode = mode
  pointer.startX = point.x
  pointer.startY = point.y
  pointer.x = state.x
  pointer.y = state.y
  pointer.width = state.width
  pointer.height = state.height
  svgRef.value?.setPointerCapture(event.pointerId)
}

function movePointer(event: PointerEvent) {
  if (!pointer.mode) return
  const point = pointFromEvent(event)
  const dx = point.x - pointer.startX
  const dy = point.y - pointer.startY
  if (pointer.mode === 'move') {
    state.x = Math.min(imageWidth.value - pointer.width, Math.max(0, Math.round(pointer.x + dx)))
    state.y = Math.min(imageHeight.value - pointer.height, Math.max(0, Math.round(pointer.y + dy)))
  } else {
    state.width = Math.min(imageWidth.value - state.x, Math.max(1, Math.round(pointer.width + dx)))
    state.height = Math.min(imageHeight.value - state.y, Math.max(1, Math.round(pointer.height + dy)))
  }
  clampState()
}

function endPointer() {
  pointer.mode = ''
}

function confirm() {
  if (!props.value || !rects.value.length) return
  if (tooManyFrames.value) {
    ElMessage.warning('单张精灵图最多生成 300 帧')
    return
  }
  emit('confirm', {
    ...props.value,
    cropRect: { ...cropRect.value },
    cellWidth: state.cellWidth,
    cellHeight: state.cellHeight,
  })
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    width="min(980px, 94vw)"
    class="sprite-dialog"
    title="精灵图切片"
    destroy-on-close
    append-to-body
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="value" class="sprite-layout">
      <section class="sprite-preview">
        <header><div><strong>{{ value.name }}</strong><span>{{ imageWidth }} × {{ imageHeight }} px</span></div><small>拖动画布范围，右下角圆点可调整大小</small></header>
        <div class="sheet-stage">
          <svg
            ref="svgRef"
            :viewBox="`0 0 ${imageWidth} ${imageHeight}`"
            role="img"
            aria-label="精灵图切片范围和分割线预览"
            @pointermove="movePointer"
            @pointerup="endPointer"
            @pointercancel="endPointer"
          >
            <image :href="value.imageUrl" x="0" y="0" :width="imageWidth" :height="imageHeight" preserveAspectRatio="none" />
            <path :d="`M0 0H${imageWidth}V${imageHeight}H0Z M${state.x} ${state.y}V${state.y + state.height}H${state.x + state.width}V${state.y}Z`" fill="rgba(15,23,42,.62)" fill-rule="evenodd" />
            <rect
              class="crop-hit"
              :x="state.x"
              :y="state.y"
              :width="state.width"
              :height="state.height"
              fill="transparent"
              stroke="#38bdf8"
              :stroke-width="Math.max(1, handleRadius / 3)"
              @pointerdown="startPointer($event, 'move')"
            />
            <g class="grid-lines">
              <line v-for="x in verticalLines" :key="`x-${x}`" :x1="x" :x2="x" :y1="state.y" :y2="state.y + rows * state.cellHeight" />
              <line v-for="y in horizontalLines" :key="`y-${y}`" :x1="state.x" :x2="state.x + columns * state.cellWidth" :y1="y" :y2="y" />
            </g>
            <rect v-if="remainder.right" class="remainder" :x="state.x + columns * state.cellWidth" :y="state.y" :width="remainder.right" :height="state.height" />
            <rect v-if="remainder.bottom" class="remainder" :x="state.x" :y="state.y + rows * state.cellHeight" :width="state.width" :height="remainder.bottom" />
            <circle
              class="resize-handle"
              :cx="state.x + state.width"
              :cy="state.y + state.height"
              :r="handleRadius"
              @pointerdown="startPointer($event, 'resize')"
            />
          </svg>
        </div>
        <p v-if="remainder.right || remainder.bottom" class="remainder-note">橙色区域不足一个完整帧，确认后不会导入。</p>
      </section>

      <aside class="sprite-settings">
        <div class="setting-heading"><span>CANVAS RANGE</span><strong>画布范围</strong><el-button text type="primary" @click="resetRange">使用完整图片</el-button></div>
        <div class="number-grid">
          <label><span>X</span><el-input-number v-model="state.x" :min="0" :max="Math.max(0, imageWidth - 1)" controls-position="right" @change="clampState" /></label>
          <label><span>Y</span><el-input-number v-model="state.y" :min="0" :max="Math.max(0, imageHeight - 1)" controls-position="right" @change="clampState" /></label>
          <label><span>范围宽度</span><el-input-number v-model="state.width" :min="1" :max="imageWidth - state.x" controls-position="right" @change="clampState" /></label>
          <label><span>范围高度</span><el-input-number v-model="state.height" :min="1" :max="imageHeight - state.y" controls-position="right" @change="clampState" /></label>
        </div>
        <div class="setting-heading compact"><span>FRAME SIZE</span><strong>单帧尺寸</strong></div>
        <div class="number-grid">
          <label><span>单帧宽度</span><el-input-number v-model="state.cellWidth" :min="1" :max="state.width" controls-position="right" @change="clampState" /></label>
          <label><span>单帧高度</span><el-input-number v-model="state.cellHeight" :min="1" :max="state.height" controls-position="right" @change="clampState" /></label>
        </div>
        <div class="slice-summary" :class="{ danger: tooManyFrames }">
          <div><span>列数</span><strong>{{ columns }}</strong></div>
          <div><span>行数</span><strong>{{ rows }}</strong></div>
          <div><span>生成帧</span><strong>{{ rects.length }}</strong></div>
        </div>
        <p class="order-note">按照从左到右、从上到下的顺序生成素材帧。单张精灵图最多生成 300 帧。</p>
      </aside>
    </div>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :disabled="!rects.length || tooManyFrames" @click="confirm">确认并生成 {{ rects.length }} 帧</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.sprite-layout{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(280px,.75fr);gap:18px}.sprite-preview,.sprite-settings{min-width:0}.sprite-preview header{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:10px}.sprite-preview header div{display:grid;gap:3px}.sprite-preview header span,.sprite-preview header small,.order-note,.remainder-note{color:var(--c-text-secondary);font-size:12px}.sheet-stage{display:grid;place-items:center;min-height:380px;max-height:62vh;overflow:auto;border:1px solid var(--c-border);border-radius:16px;background-color:#e5e7eb;background-image:linear-gradient(45deg,#cbd5e1 25%,transparent 25%),linear-gradient(-45deg,#cbd5e1 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#cbd5e1 75%),linear-gradient(-45deg,transparent 75%,#cbd5e1 75%);background-size:20px 20px;background-position:0 0,0 10px,10px -10px,-10px 0}.sheet-stage svg{display:block;max-width:100%;max-height:58vh;touch-action:none;user-select:none}.crop-hit{cursor:move;vector-effect:non-scaling-stroke}.grid-lines{pointer-events:none;stroke:#38bdf8;stroke-width:1.5;vector-effect:non-scaling-stroke;filter:drop-shadow(0 0 1px rgba(0,0,0,.8))}.remainder{pointer-events:none;fill:rgba(249,115,22,.5)}.resize-handle{cursor:nwse-resize;fill:#fff;stroke:#0284c7;stroke-width:2;vector-effect:non-scaling-stroke}.remainder-note{margin:8px 0 0;color:#c2410c}.sprite-settings{padding:16px;border:1px solid var(--c-border);border-radius:16px;background:var(--c-surface-muted)}.setting-heading{display:grid;grid-template-columns:1fr auto;align-items:center;margin-bottom:12px}.setting-heading span{grid-column:1/-1;color:var(--c-primary);font-size:10px;font-weight:900;letter-spacing:.14em}.setting-heading strong{font-size:16px}.setting-heading.compact{display:block;margin-top:22px}.number-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.number-grid label{display:grid;gap:6px;color:var(--c-text-secondary);font-size:12px}.number-grid :deep(.el-input-number){width:100%}.slice-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:20px}.slice-summary div{display:grid;gap:3px;padding:10px;border:1px solid var(--c-border);border-radius:12px;background:var(--c-surface);text-align:center}.slice-summary span{color:var(--c-text-secondary);font-size:11px}.slice-summary strong{font-size:17px}.slice-summary.danger strong{color:#dc2626}.order-note{margin:12px 0 0;line-height:1.6}@media(max-width:760px){.sprite-layout{grid-template-columns:1fr}.sheet-stage{min-height:260px}.number-grid{grid-template-columns:1fr 1fr}}
</style>
