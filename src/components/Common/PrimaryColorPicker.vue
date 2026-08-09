<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { colord } from 'colord'
import { Palette, Rotate } from '@nicons/fa'
import { Icon } from '@vicons/utils'
import { useSettingStore } from '@/store/modules/setting'
import { storeToRefs } from 'pinia'

const settingStore = useSettingStore()
const { primaryColor } = storeToRefs(settingStore)

/** 预设品牌色的 OKLCH 色相（与彩虹色条同参数，动态生成 hex，保证与滑条颜色完全一致） */
const PRESET_HUES = [
  { name: '蓝色', hue: 240 },
  { name: '靛蓝', hue: 265 },
  { name: '紫色', hue: 280 },
  { name: '青色', hue: 190 },
  { name: '绿色', hue: 155 },
  { name: '橙色', hue: 30 },
  { name: '玫红', hue: 350 },
  { name: '粉色', hue: 325 },
]
/** 预设色 = 滑条同一参数 oklch(0.80, 0.10, hue) 计算出的颜色 */
const PRESET_COLORS = PRESET_HUES.map(({ name, hue }) => {
  const [r, g, b] = oklchToRgb(0.80, 0.10, hue)
  return { name, value: rgbToHex(r, g, b) }
})

const popoverVisible = ref(false)

const applyColor = (color: string) => {
  if (!color) return
  settingStore.setPrimaryColor(color)
}
const resetColor = () => {
  settingStore.resetPrimaryColor()
}

/** 自定义 hex 输入框的草稿值（跟随主题色，输入中允许临时编辑） */
const hexDraft = ref(primaryColor.value)
watch(primaryColor, value => { hexDraft.value = value })

/** 规范化 hex：支持 #RRGGBB / RRGGBB / #RGB / RGB，返回小写 #rrggbb；非法返回 null */
function normalizeHex(value: string): string | null {
  const raw = value.trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return '#' + raw.toLowerCase()
  if (/^[0-9a-fA-F]{3}$/.test(raw)) return '#' + raw.split('').map(c => c + c).join('').toLowerCase()
  return null
}

/** 应用自定义 hex（回车 / 失焦触发）；非法时提示并回退显示当前色 */
const applyHex = (value: string) => {
  const normalized = normalizeHex(value)
  if (normalized) {
    applyColor(normalized)
  } else {
    ElMessage.warning('请输入有效的十六进制颜色（如 #3791ef）')
    hexDraft.value = settingStore.primaryColor
  }
}

/** RGB → OKLCH 色相：用于滑条精确定位（colord().hue() 返回 HSL 色相，与 OKLCH 不同） */
function rgbToOklchHue(hex: string): number {
  const { r, g, b } = colord(hex).toRgb()
  const lin = (v: number) => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }
  const lr = lin(r) * 0.9999999999, lg = lin(g) * 0.9999999999, lb = lin(b) * 0.9999999999
  const l_ = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb
  const m_ = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb
  const s_ = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb
  const f = (t: number) => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 4 / 29
  // 仅求色相：不需要 L（亮度），a/b 分量即可计算 hue
  const a = 1.9779984951 * f(l_) - 2.4285922050 * f(m_) + 0.4505937099 * f(s_)
  const bv = 0.0259040371 * f(l_) + 0.7827717662 * f(m_) - 0.8086757660 * f(s_)
  return ((Math.atan2(bv, a) * 180) / Math.PI + 360) % 360
}

/** 当前主题色的 OKLCH 色相（0-360），用于彩虹滑条精确定位 */
const currentHue = computed(() => Math.round(rgbToOklchHue(primaryColor.value)))

/** OKLCH 彩虹渐变：感知均匀的色彩空间，过渡自然柔和（与 Mizuki 主题一致） */
const rainbowGradient = `linear-gradient(to right, ${Array.from(
  { length: 13 },
  (_, i) => `oklch(0.80 0.10 ${i * 30})`,
).join(', ')})`

/** OKLCH → RGB → hex 转换（不依赖 canvas/浏览器 OKLCH 支持） */
function oklchToRgb(L: number, C: number, H: number): [number, number, number] {
  const h = (H * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)
  const f = (t: number) => {
    const t3 = t * t * t
    return t3 > 0.008856 ? t3 : (t - 4 / 29) / 7.787
  }
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const l = f(l_) * 0.9999999999
  const m = f(m_) * 0.9999999999
  const s = f(s_) * 0.9999999999
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)))
  return [
    clamp(+4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ]
}
// 用 function 声明（有提升），确保上方 PRESET_COLORS 动态生成时可用
function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

/** OKLCH 选色：亮度 0.80 / 色度 0.10（柔和品牌色） */
const applyHue = (value: string) => {
  const h = Number(value)
  if (Number.isNaN(h)) return
  const [r, g, b] = oklchToRgb(0.80, 0.10, h)
  applyColor(rgbToHex(r, g, b))
}
</script>

<template>
  <el-popover
    v-model:visible="popoverVisible"
    placement="bottom-end"
    :width="264"
    trigger="click"
    popper-class="primary-color-popover"
  >
    <template #reference>
      <button
        type="button"
        class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full
               text-slate-600 transition-colors duration-200 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
        aria-label="切换主题色"
        :title="`主题色：${primaryColor}`"
      >
        <Icon size="20"><Palette /></Icon>
      </button>
    </template>

    <div class="flex flex-col gap-3 py-1">
      <div class="flex items-center justify-between">
        <span class="text-sm font-semibold text-slate-800 dark:text-slate-100">主题色</span>
        <button
          type="button"
          class="flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
          @click="resetColor"
        >
          <Icon size="12"><Rotate /></Icon>
          恢复默认
        </button>
      </div>

      <!-- 预设色板 -->
      <div class="grid grid-cols-4 gap-2.5">
        <button
          v-for="c in PRESET_COLORS"
          :key="c.value"
          type="button"
          class="h-8 w-8 cursor-pointer rounded-full border border-black/10 transition-transform duration-150 hover:scale-110 dark:border-white/20"
          :class="{ 'ring-2 ring-offset-2 ring-slate-400 dark:ring-slate-300 dark:ring-offset-slate-800': primaryColor === c.value }"
          :style="{ backgroundColor: c.value }"
          :title="c.name"
          :aria-label="`主题色：${c.name}`"
          @click="applyColor(c.value)"
        />
      </div>

      <!-- 色相滑条：OKLCH 彩虹渐变，拖动实时切换主题色（色相选择器） -->
      <div class="border-t border-slate-100 pt-3 dark:border-slate-700">
        <div class="mb-1.5 flex items-center justify-between">
          <span class="text-xs text-slate-500 dark:text-slate-400">色相</span>
          <span class="font-mono text-xs text-slate-400 dark:text-slate-500">{{ currentHue }}°</span>
        </div>
        <input
          type="range"
          min="0"
          max="360"
          step="1"
          :value="currentHue"
          class="hue-slider"
          :style="{ background: rainbowGradient }"
          aria-label="选择主题色色相"
          @input="applyHue(($event.target as HTMLInputElement).value)"
        />
      </div>

      <!-- 自定义取色：可直接输入 hex（回车/失焦应用），或用原生 color input 取色
           （与项目 Chart 工作台等一致；不用 el-color-picker，其 popper 面板嵌套在 el-popover 内无法正常弹出） -->
      <div class="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-700">
        <span class="text-xs text-slate-500 dark:text-slate-400">自定义</span>
        <div class="flex items-center gap-2">
          <input
            v-model="hexDraft"
            class="h-7 w-[78px] rounded-md border border-slate-200 bg-white px-1.5 text-center font-mono text-xs text-slate-600 outline-none transition-colors
                   focus:border-primary-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:focus:border-primary-500"
            spellcheck="false"
            autocomplete="off"
            aria-label="输入自定义颜色 HEX 值"
            @change="applyHex(hexDraft)"
            @keyup.enter="applyHex(hexDraft)"
          />
          <label
            class="relative inline-block h-7 w-9 cursor-pointer overflow-hidden rounded-md border border-black/10 shadow-sm dark:border-white/20"
            :style="{ backgroundColor: primaryColor }"
            :title="`选择自定义颜色（当前 ${primaryColor}）`"
          >
            <input
              type="color"
              class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              :value="primaryColor"
              @input="applyColor(($event.target as HTMLInputElement).value)"
            />
          </label>
        </div>
      </div>
    </div>
  </el-popover>
</template>

<style scoped>
/* 彩虹色相滑条：渐变背景由 rainbowGradient 内联注入
   （13 个 OKLCH 色相端点，每 30°，L=0.80 / C=0.10 感知均匀柔和）；
   thumb 白色圆点（圆形与整体设计语言一致）便于在彩虹上定位 */
.hue-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 20px;
  margin: 0;
  border-radius: var(--radius-full);
  outline: none;
  cursor: pointer;
}
.hue-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.2), 0 2px 6px rgba(15, 23, 42, 0.25);
  cursor: grab;
}
.hue-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.2), 0 2px 6px rgba(15, 23, 42, 0.25);
  cursor: grab;
}
.hue-slider:active::-webkit-slider-thumb,
.hue-slider:active::-moz-range-thumb {
  cursor: grabbing;
}
</style>
