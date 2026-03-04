<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { fabric } from 'fabric'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'

const title = '接头霸王'

// ── 角色分组配置，后期新增角色只需在此追加 ──────────────────
// · count  : 图片数量，自动生成 {prefix}_01.png ~ {prefix}_NN.png
// · labels : 可选，仅需为「有备注后缀」的文件写一行：
//            键为零填充序号字符串（如 '02'），值为备注名
//            有备注时实际文件名为 {prefix}_{idx}_{备注}.png，显示备注名
//            无备注时实际文件名为 {prefix}_{idx}.png，        显示序号
interface HeadGroup {
  name: string
  prefix: string
  count: number
  labels?: Record<string, string>
}
const headGroups: HeadGroup[] = [
  { name: '凯露', prefix: 'kyaru', count: 10 },
  { name: '哈基米', prefix: 'hajimi', count: 1, labels: { '01': '耄耋' } },
  { name: '车万', prefix: 'th', count: 1, labels: { '01': 'doremi' } },
]

// 根据 count + labels 生成该分组的完整头像列表
interface HeadItem {
  groupName: string
  src: string
  label: string
}
function buildHeadItems(group: HeadGroup): HeadItem[] {
  return Array.from({ length: group.count }, (_, i) => {
    const idx = String(i + 1).padStart(2, '0')
    const labelText = group.labels?.[idx]
    const filename = labelText
      ? `${group.prefix}_${idx}_${labelText}.png`
      : `${group.prefix}_${idx}.png`
    return {
      groupName: group.name,
      src: `/images/heads/${filename}`,
      label: labelText ?? idx,
    }
  })
}

// 选项卡图标：取序号 01 的 src（已由 buildHeadItems 正确处理备注后缀）
function groupIconSrc(group: HeadGroup): string {
  return buildHeadItems(group)[0]?.src ?? `/images/heads/${group.prefix}_01.png`
}

// ── Canvas 相关 ─────────────────────────────────────────────
const canvasEl = ref<HTMLCanvasElement | null>(null)
let fc: fabric.Canvas | null = null

// 删除图标 (内联 base64，避免外部依赖)
const DELETE_ICON =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZjU1NTUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48bGluZSB4MT0iMTgiIHkxPSI2IiB4Mj0iNiIgeTI9IjE4Ii8+PGxpbmUgeDE9IjYiIHkxPSI2IiB4Mj0iMTgiIHkyPSIxOCIvPjwvc3ZnPg=='

// 翻转图标
const FLIP_ICON =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM0NDk5ZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTcgMWw0IDQtNCA0Ii8+PHBhdGggZD0iTTMgMTFWOWE0IDQgMCAwIDEgNC00aDEwIi8+PHBhdGggZD0iTTcgMjNsLTQtNCA0LTQiLz48cGF0aCBkPSJNMjEgMTN2MmE0IDQgMCAwIDEtNCA0SDciLz48L3N2Zz4='

function renderCtrlIcon(iconSrc: string) {
  const img = new Image()
  img.src = iconSrc
  return function (
    this: fabric.Control,
    ctx: CanvasRenderingContext2D,
    left: number,
    top: number,
    _: unknown,
    fabricObject: fabric.Object
  ) {
    const size = (this as any).cornerSize as number
    ctx.save()
    ctx.translate(left, top)
    ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle ?? 0))
    ctx.drawImage(img, -size / 2, -size / 2, size, size)
    ctx.restore()
  }
}

function setupCustomControls() {
  // 删除控制点（右上角）
  ;(fabric.Object.prototype as any).controls.deleteCtrl = new fabric.Control({
    x: 0.5,
    y: -0.5,
    offsetX: 8,
    offsetY: -8,
    cursorStyle: 'pointer',
    mouseUpHandler: (_: unknown, transform: fabric.Transform) => {
      const obj = transform.target
      obj.canvas?.remove(obj)
      obj.canvas?.requestRenderAll()
      return true
    },
    render: renderCtrlIcon(DELETE_ICON),
    cornerSize: 24,
  })

  // 翻转控制点（左上角）
  ;(fabric.Object.prototype as any).controls.flipCtrl = new fabric.Control({
    x: -0.5,
    y: -0.5,
    offsetX: -8,
    offsetY: -8,
    cursorStyle: 'pointer',
    mouseUpHandler: (_: unknown, transform: fabric.Transform) => {
      const obj = transform.target
      obj.set('flipX', !obj.flipX)
      obj.canvas?.requestRenderAll()
      return true
    },
    render: renderCtrlIcon(FLIP_ICON),
    cornerSize: 24,
  })
}

// ── 底图相关 ─────────────────────────────────────────────────
const hasBackground = ref(false)

function handleFileUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file || !file.type.startsWith('image/')) return
  ;(event.target as HTMLInputElement).value = ''

  const reader = new FileReader()
  reader.onload = () => {
    if (!fc) return
    const img = new Image()
    img.onload = () => {
      const maxW = canvasEl.value?.parentElement?.clientWidth ?? 800
      const scale = img.width > maxW - 40 ? (maxW - 40) / img.width : 1
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      fc!.setWidth(w)
      fc!.setHeight(h)

      const fabImg = new fabric.Image(img, {
        scaleX: scale,
        scaleY: scale,
        selectable: false,
        evented: false,
      })
      fc!.setBackgroundImage(fabImg, fc!.renderAll.bind(fc!))
      hasBackground.value = true
    }
    img.src = reader.result as string
  }
  reader.readAsDataURL(file)
}

// ── 当前选中角色分组 ────────────────────────────────────────
const activeGroup = ref(headGroups[0].prefix)

// 当前选项卡下的头像列表
const activeHeadItems = computed(() => {
  const group = headGroups.find((g) => g.prefix === activeGroup.value)
  return group ? buildHeadItems(group) : []
})

// ── 拖拽 / 点击添加贴纸 ──────────────────────────────────────
let draggingHeadSrc: string | null = null

function onHeadDragStart(e: DragEvent, src: string) {
  draggingHeadSrc = src
  e.dataTransfer?.setData('text/plain', src)
}

function onHeadDragEnd() {
  draggingHeadSrc = null
}

function bindCanvasDrop() {
  if (!fc) return
  const upper = fc.upperCanvasEl as HTMLCanvasElement
  upper.addEventListener('dragover', (e) => e.preventDefault())
  upper.addEventListener('drop', (e: DragEvent) => {
    e.preventDefault()
    if (!draggingHeadSrc) return
    const rect = upper.getBoundingClientRect()
    const offsetX = e.clientX - rect.left
    const offsetY = e.clientY - rect.top
    addStickerAt(draggingHeadSrc, offsetX, offsetY)
    draggingHeadSrc = null
  })
}

function onHeadClick(src: string) {
  if (!fc) return
  // 居中添加
  addStickerAt(src, (fc.getWidth() ?? 200) / 2, (fc.getHeight() ?? 200) / 2)
}

function addStickerAt(src: string, x: number, y: number) {
  fabric.Image.fromURL(
    src,
    (img) => {
      img.set({
        left: x - (img.width ?? 60) / 2,
        top: y - (img.height ?? 60) / 2,
      })
      fc!.add(img)
      fc!.setActiveObject(img)
      fc!.requestRenderAll()
    },
    { crossOrigin: 'anonymous' }
  )
}

// ── 下载 ─────────────────────────────────────────────────────
function download() {
  if (!fc) return
  const url = fc.toDataURL({ format: 'png', multiplier: 1 })
  const a = document.createElement('a')
  a.href = url
  a.download = '接头霸王.png'
  a.click()
}

// ── 清空贴纸（保留底图）──────────────────────────────────────
function clearStickers() {
  if (!fc) return
  fc.getObjects().forEach((obj) => fc!.remove(obj))
  fc.requestRenderAll()
}

// ── 生命周期 ─────────────────────────────────────────────────
onMounted(() => {
  setupCustomControls()
  fc = new fabric.Canvas(canvasEl.value!, {
    selection: false,
    width: 600,
    height: 400,
  })
  bindCanvasDrop()
})

onBeforeUnmount(() => {
  fc?.dispose()
})
</script>

<template>
  <div class="flex flex-col mt-3 flex-1">
    <DetailHeader :title="title" />

    <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-300 space-y-4">

      <!-- 操作栏 -->
      <div class="flex flex-wrap gap-2 items-center">
        <label
          class="cursor-pointer inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          选择受害者图片
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="hidden" @change="handleFileUpload" />
        </label>

        <button
          v-if="hasBackground"
          @click="download"
          class="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          迫害完成，下载！
        </button>

        <button
          v-if="hasBackground"
          @click="clearStickers"
          class="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium transition-colors"
        >
          清空贴纸
        </button>
      </div>

      <!-- 贴纸选择区（选项卡） -->
      <div class="rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
        <!-- 选项卡头部 -->
        <div class="flex border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <button
            v-for="group in headGroups"
            :key="group.prefix"
            class="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px"
            :class="activeGroup === group.prefix
              ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'"
            @click="activeGroup = group.prefix"
          >
            <img
              :src="groupIconSrc(group)"
              class="w-6 h-6 rounded object-contain"
              :alt="group.name"
            />
            {{ group.name }}
          </button>
        </div>
        <!-- 选项卡内容 -->
        <div class="p-3 flex flex-wrap gap-2">
          <div
            v-for="item in activeHeadItems"
            :key="item.src"
            class="flex flex-col items-center gap-1 cursor-pointer group"
            draggable
            @dragstart="onHeadDragStart($event, item.src)"
            @dragend="onHeadDragEnd"
            @click="onHeadClick(item.src)"
          >
            <img
              :src="item.src"
              class="w-14 h-14 rounded-lg object-contain border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 group-hover:scale-110 group-hover:border-blue-400 transition-transform duration-150 select-none"
            />
            <span class="text-xs text-slate-500 dark:text-slate-400 select-none leading-none">
              {{ item.label }}
            </span>
          </div>
        </div>
      </div>

      <!-- 画布区域 -->
      <div
        class="rounded-xl overflow-auto border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 p-2 flex justify-center"
        :class="{ 'min-h-[200px] flex items-center justify-center': !hasBackground }"
      >
        <div v-if="!hasBackground" class="text-slate-400 dark:text-slate-500 text-sm text-center pointer-events-none select-none">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 mx-auto mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          请先上传受害者图片
        </div>
        <canvas ref="canvasEl" />
      </div>

    </div>

    <ToolDetail title="使用说明">
      <el-text>
        1. 点击「选择受害者图片」上传一张底图（支持 PNG / JPG / WebP）<br />
        2. 在贴纸面板中 <b>拖拽</b>（桌面端）或 <b>点击</b>（移动端）头像添加到画布<br />
        3. 点选画布上的贴纸可进行：拖动移位、角点缩放/旋转；左上角蓝色图标可水平翻转，右上角红色图标可删除<br />
        4. 迫害完成后点击「下载」保存合成图片
      </el-text>
    </ToolDetail>
  </div>
</template>
