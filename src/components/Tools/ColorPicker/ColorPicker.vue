<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { CopyDocument, Refresh } from '@element-plus/icons-vue'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import MetricsBar from '@/components/Common/MetricsBar.vue'
import { copy } from '@/utils/string'
import { contrastRatio, createColorScale, getContrastChecks, pickReadableText } from '@/utils/colorStudio'
import { colord, extend } from 'colord'
import cmykPlugin from 'colord/plugins/cmyk'
import hwbPlugin from 'colord/plugins/hwb'
import namesPlugin from 'colord/plugins/names'
import lchPlugin from 'colord/plugins/lch'
import labPlugin from 'colord/plugins/lab'

extend([cmykPlugin, hwbPlugin, namesPlugin, lchPlugin, labPlugin])

const selectedHex = ref('#409EFF')
const colorInput = ref('#409EFF')
const backgroundHex = ref('#FFFFFF')
const backgroundInput = ref('#FFFFFF')
const presets = ['#2563EB', '#7C3AED', '#DB2777', '#DC2626', '#EA580C', '#D97706', '#16A34A', '#0891B2', '#0F172A', '#F8FAFC']

const colorObject = computed(() => colord(selectedHex.value))
const formats = computed(() => {
  const hsv = colorObject.value.toHsv()
  const lab = colorObject.value.toLab()
  return [
    { label: 'HEX', value: selectedHex.value },
    { label: 'RGB', value: colorObject.value.toRgbString() },
    { label: 'HSL', value: colorObject.value.toHslString() },
    { label: 'HSV', value: `hsv(${Math.round(hsv.h)} ${Math.round(hsv.s)}% ${Math.round(hsv.v)}%)` },
    { label: 'HWB', value: colorObject.value.toHwbString() },
    { label: 'LAB', value: `lab(${lab.l.toFixed(2)} ${lab.a.toFixed(2)} ${lab.b.toFixed(2)})` },
    { label: 'LCH', value: colorObject.value.toLchString() },
    { label: 'CMYK', value: colorObject.value.toCmykString() },
    { label: 'CSS Name', value: colorObject.value.toName({ closest: true }) ?? '无对应名称' },
  ]
})
const ratio = computed(() => contrastRatio(selectedHex.value, backgroundHex.value))
const ratioText = computed(() => ratio.value.toFixed(2))
const checks = computed(() => getContrastChecks(ratio.value))
const bestText = computed(() => pickReadableText(selectedHex.value))
const colorScale = computed(() => createColorScale(selectedHex.value))
const recommendation = computed(() => {
  if (checks.value.normalAAA) return { level: 'AAA', text: '正文与大号文字均达到 AAA，适合高可读性场景。', tone: 'great' }
  if (checks.value.normalAA) return { level: 'AA', text: '正文达到 AA；需要 AAA 时请继续提高明暗差。', tone: 'good' }
  if (checks.value.largeAA) return { level: '大号文字', text: '仅适合大号文字或 UI 图形，不建议用于普通正文。', tone: 'warn' }
  return { level: '未通过', text: '当前明暗差不足，请调深前景或调浅背景。', tone: 'bad' }
})
const heroMetrics = computed(() => [
  { value: `${ratioText.value}:1`, label: '当前对比度' },
  { value: recommendation.value.level, label: 'WCAG 结论' },
  { value: bestText.value === '#FFFFFF' ? '白色' : '深色', label: '推荐文字' },
])

function normalizeColor(value: string, target: 'foreground' | 'background') {
  const parsed = colord(value)
  if (!parsed.isValid()) {
    ElMessage.warning('无法识别这个颜色，请输入 HEX、RGB、HSL 或 CSS 颜色名')
    return
  }
  const normalized = parsed.toHex().toUpperCase()
  if (target === 'foreground') {
    selectedHex.value = normalized
    colorInput.value = normalized
  } else {
    backgroundHex.value = normalized
    backgroundInput.value = normalized
  }
}

function usePreset(value: string) {
  selectedHex.value = value
  colorInput.value = value
}

function swapColors() {
  const foreground = selectedHex.value
  selectedHex.value = backgroundHex.value
  backgroundHex.value = foreground
  colorInput.value = selectedHex.value
  backgroundInput.value = backgroundHex.value
}

watch(selectedHex, value => { if (value) colorInput.value = value.toUpperCase() })
watch(backgroundHex, value => { if (value) backgroundInput.value = value.toUpperCase() })
</script>

<template>
  <div class="color-page flex flex-col mt-3 flex-1" :style="{ '--selected': selectedHex }">
    <ToolHero summary="选颜色，也检查它是否真的好读">
      <template #metrics>
        <MetricsBar :items="heroMetrics" />
      </template>
    </ToolHero>

    <section class="picker-card">
      <div><span class="eyebrow">COLOR INPUT</span><h3>输入与快速色板</h3><p>支持 HEX、RGB、HSL 和 CSS 颜色名，所有格式会同步换算。</p></div>
      <div class="picker-inputs">
        <label><span>主颜色 / 前景</span><div><el-color-picker v-model="selectedHex" size="large" aria-label="选择主颜色" /><el-input v-model="colorInput" size="large" aria-label="输入主颜色" @keyup.enter="normalizeColor(colorInput, 'foreground')"><template #append><el-button @click="normalizeColor(colorInput, 'foreground')">应用</el-button></template></el-input></div></label>
        <button type="button" class="swap-button" aria-label="交换前景与背景颜色" @click="swapColors"><el-icon><Refresh /></el-icon>交换</button>
        <label><span>对比背景</span><div><el-color-picker v-model="backgroundHex" size="large" aria-label="选择对比背景" /><el-input v-model="backgroundInput" size="large" aria-label="输入对比背景" @keyup.enter="normalizeColor(backgroundInput, 'background')"><template #append><el-button @click="normalizeColor(backgroundInput, 'background')">应用</el-button></template></el-input></div></label>
      </div>
      <div class="preset-list"><span>常用色</span><button v-for="preset in presets" :key="preset" type="button" :aria-label="`使用颜色 ${preset}`" :class="{ active: selectedHex === preset }" :style="{ background: preset }" @click="usePreset(preset)"></button></div>
    </section>

    <section class="workspace-grid">
      <article class="format-card">
        <header><div><span class="eyebrow">COLOR FORMATS</span><h3>颜色格式转换</h3></div><span>{{ formats.length }} 种格式</span></header>
        <div class="format-grid"><button v-for="item in formats" :key="item.label" type="button" :aria-label="`复制 ${item.label} 颜色`" @click="copy(item.value)"><span>{{ item.label }}</span><code>{{ item.value }}</code><el-icon><CopyDocument /></el-icon></button></div>
      </article>

      <article class="contrast-card">
        <header><div><span class="eyebrow">WCAG CONTRAST</span><h3>可访问性检查</h3></div><span :class="['result-pill', recommendation.tone]">{{ recommendation.level }}</span></header>
        <div class="preview-box" :style="{ color: selectedHex, background: backgroundHex }"><span>实时排版预览</span><strong>让每一种颜色都清晰可读</strong><p>普通正文 16px · 示例数字 0123456789</p><button type="button" :style="{ color: bestText, background: selectedHex }">按钮示例</button></div>
        <div class="ratio-row"><div><span>对比度</span><strong>{{ ratioText }}<small>:1</small></strong></div><p>{{ recommendation.text }}</p></div>
        <div class="check-grid">
          <div :class="{ pass: checks.normalAA }"><b>{{ checks.normalAA ? '通过' : '未通过' }}</b><span>普通文字 AA</span><small>至少 4.5:1</small></div>
          <div :class="{ pass: checks.largeAA }"><b>{{ checks.largeAA ? '通过' : '未通过' }}</b><span>大号文字 AA</span><small>至少 3:1</small></div>
          <div :class="{ pass: checks.normalAAA }"><b>{{ checks.normalAAA ? '通过' : '未通过' }}</b><span>普通文字 AAA</span><small>至少 7:1</small></div>
          <div :class="{ pass: checks.uiAA }"><b>{{ checks.uiAA ? '通过' : '未通过' }}</b><span>UI 图形 AA</span><small>至少 3:1</small></div>
        </div>
      </article>
    </section>

    <section class="scale-card">
      <header><div><span class="eyebrow">COLOR SCALE</span><h3>50–900 色阶</h3><p>从当前主颜色生成浅色背景、交互态和深色文字候选。</p></div><button type="button" aria-label="复制主颜色" @click="copy(selectedHex)"><el-icon><CopyDocument /></el-icon>复制主色</button></header>
      <div class="scale-list"><button v-for="item in colorScale" :key="item.label" type="button" :style="{ color: pickReadableText(item.color), background: item.color }" :aria-label="`复制 ${item.label} 色阶 ${item.color}`" @click="copy(item.color)"><span>{{ item.label }}</span><strong>{{ item.color }}</strong></button></div>
    </section>

    <ToolGuide title="颜色格式与对比度说明"><div class="detail-copy">HEX、RGB 与 HSL 常用于网页界面；LAB 与 LCH 更接近人眼感知，CMYK 主要面向印刷。WCAG 对比度按相对亮度计算：普通正文 AA 至少 4.5:1，大号文字和关键 UI 图形至少 3:1，普通正文 AAA 至少 7:1。颜色通过计算不等于所有场景都安全，还应避免仅用颜色表达状态。</div></ToolGuide>
  </div>
</template>

<style scoped>
.color-page {
  --violet: #7c3aed;
  gap:18px
}
.picker-card, .format-card, .scale-card {
  border: 1px solid var(--c-border);
  border-radius: var(--radius-card);
  background: var(--c-surface);
  box-shadow: var(--shadow-card)
}
.eyebrow {
  display: block;
  margin-bottom: 6px;
  color: #c4b5fd;
  font-size: 12px;
  font-weight: 900;
  letter-spacing:.16em
}
.picker-card {
  display: grid;
  grid-template-columns: minmax(220px,.6fr) minmax(520px,1.4fr);
  gap: 22px;
  padding:21px 22px
}
.picker-card .eyebrow,.format-card .eyebrow,.contrast-card .eyebrow,.scale-card .eyebrow {
  color:var(--violet)
}
.picker-card h3,.format-card h3,.contrast-card h3,.scale-card h3 {
  margin: 0;
  color: var(--c-text-primary);
  font-size:19px
}
.picker-card p,.scale-card header p {
  margin: 4px 0 0;
  color: var(--c-text-secondary);
  font-size: 13px;
  line-height:1.55
}
.picker-inputs {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: end;
  gap:11px
}
.picker-inputs label>span {
  display: block;
  margin-bottom: 7px;
  color: var(--c-text-secondary);
  font-size: 13px;
  font-weight:750
}
.picker-inputs label>div {
  display: grid;
  grid-template-columns: auto 1fr;
  gap:8px
}
.swap-button {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 11px;
  border: 1px solid #dbe3ef;
  border-radius: var(--radius-sm);
  background: var(--c-surface-subtle);
  color: var(--c-text-body);
  font-size: 12px;
  font-weight: 800;
  cursor:pointer
}
.preset-list {
  grid-column: 1/-1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap:7px
}
.preset-list>span {
  margin-right: 3px;
  color: var(--c-text-secondary);
  font-size:12px
}
.preset-list button {
  width: 28px;
  height: 28px;
  border: 3px solid #fff;
  border-radius: var(--radius-sm);
  outline: 1px solid #dbe3ef;
  cursor:pointer
}
.preset-list button.active {
  outline:3px solid #8b5cf6
}
.workspace-grid {
  display: grid;
  grid-template-columns: minmax(0,.9fr) minmax(0,1.1fr);
  gap:18px
}
.format-card,.contrast-card,.scale-card {
  padding:22px
}
.format-card>header,.contrast-card>header,.scale-card>header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap:12px
}
.format-card header>span {
  color: var(--c-text-secondary);
  font-size:12px
}
.format-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 9px;
  margin-top:17px
}
.format-grid button {
  display: grid;
  min-width: 0;
  grid-template-columns: 74px 1fr auto;
  align-items: center;
  gap: 9px;
  padding: 12px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface-subtle);
  color: var(--c-text-secondary);
  text-align: left;
  cursor:pointer
}
.format-grid button:hover {
  border-color: #a78bfa;
  background:#f5f3ff
}
.format-grid span {
  font-size: 12px;
  font-weight:800
}
.format-grid code {
  min-width: 0;
  color: var(--c-text-primary);
  font: 700 13px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace;
  overflow-wrap:anywhere
}
.result-pill {
  padding: 5px 9px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight:850
}
.result-pill.great,.result-pill.good {
  color: #047857;
  background:#d1fae5
}
.result-pill.warn {
  color: #b45309;
  background:#fef3c7
}
.result-pill.bad {
  color: #b91c1c;
  background:#fee2e2
}
.preview-box {
  min-height: 170px;
  margin-top: 17px;
  padding: 22px;
  border: 1px solid var(--c-border);
  border-radius:var(--radius-md)
}
.preview-box>span {
  display: block;
  font-size: 12px;
  font-weight: 750;
  opacity:.75
}
.preview-box>strong {
  display: block;
  margin-top: 18px;
  font-size: 25px;
  line-height:1.3
}
.preview-box>p {
  margin: 8px 0 17px;
  font-size:14px
}
.preview-box>button {
  padding: 9px 14px;
  border: 0;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight:800
}
.ratio-row {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 17px;
  margin-top: 14px;
  padding: 13px;
  border-radius: var(--radius-md);
  background: var(--c-surface-subtle)
}
.ratio-row span,.ratio-row strong {
  display:block
}
.ratio-row span {
  color: var(--c-text-secondary);
  font-size:12px
}
.ratio-row strong {
  color: var(--c-text-primary);
  font-size:25px
}
.ratio-row strong small {
  font-size:13px
}
.ratio-row p {
  margin: 0;
  color: var(--c-text-secondary);
  font-size: 13px;
  line-height:1.55
}
.check-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top:12px
}
.check-grid>div {
  padding: 11px;
  border-radius: var(--radius-sm);
  color: #b91c1c;
  background:#fef2f2
}
.check-grid>div.pass {
  color: #047857;
  background:#ecfdf5
}
.check-grid b,.check-grid span,.check-grid small {
  display:block
}
.check-grid b {
  font-size:12px
}
.check-grid span {
  margin-top: 3px;
  color: var(--c-text-strong);
  font-size: 13px;
  font-weight:750
}
.check-grid small {
  margin-top: 2px;
  color: var(--c-text-secondary);
  font-size:12px
}
.scale-card>header button {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  gap: 5px;
  padding: 0 11px;
  border: 1px solid #dbe3ef;
  border-radius: var(--radius-sm);
  background: var(--c-surface);
  color: var(--c-text-body);
  font-size: 13px;
  font-weight: 800;
  cursor:pointer
}
.scale-list {
  display: grid;
  grid-template-columns: repeat(10,1fr);
  margin-top: 17px;
  border-radius: var(--radius-md);
  overflow:hidden
}
.scale-list button {
  display: flex;
  min-height: 92px;
  justify-content: space-between;
  flex-direction: column;
  padding: 11px;
  border: 0;
  text-align: left;
  cursor:pointer
}
.scale-list span {
  font-size: 12px;
  font-weight:800
}
.scale-list strong {
  font:700 11px ui-monospace,monospace
}
:global(html.dark .color-page .picker-card),:global(html.dark .color-page .format-card),:global(html.dark .color-page .contrast-card),:global(html.dark .color-page .scale-card) {
  border-color: var(--c-border);
  background: var(--c-surface);
  box-shadow:none
}
:global(html.dark .color-page h3),:global(html.dark .color-page .format-grid code),:global(html.dark .color-page .ratio-row strong),:global(html.dark .color-page .check-grid span) {
  color:#f8fafc
}
:global(html.dark .color-page .swap-button),:global(html.dark .color-page .format-grid button),:global(html.dark .color-page .ratio-row),:global(html.dark .color-page .scale-card>header button) {
  border-color: var(--c-border-strong);
  background: var(--c-surface-subtle);
  color: var(--c-text-primary)
}
:global(html.dark .color-page .format-grid button:hover) {
  border-color: #8b5cf6;
  background:#2e1065
}
:global(html.dark .color-page .preview-box) {
  border-color: var(--c-border-strong)
}
:global(html.dark .color-page .check-grid>div) {
  color: #fecdd3;
  background:#3f1d2e
}
:global(html.dark .color-page .check-grid>div.pass) {
  color: #a7f3d0;
  background:#12372a
}
@media(max-width:1100px) {
  .picker-card {
    grid-template-columns:1fr
  }
  .workspace-grid {
    grid-template-columns:1fr
  }
  .scale-list {
    grid-template-columns:repeat(5,1fr)
  }
}
@media(max-width:680px) {
  .color-page {
    gap:14px
  }
  .picker-card,.format-card,.contrast-card,.scale-card {
    padding:15px
  }
  .picker-inputs {
    grid-template-columns:1fr
  }
  .swap-button {
    width:100%
  }
  .preset-list {
    justify-content: flex-start;
    overflow-x:auto
  }
  .format-grid {
    grid-template-columns:1fr
  }
  .format-grid button {
    grid-template-columns:68px 1fr auto
  }
  .ratio-row {
    grid-template-columns:1fr
  }
  .check-grid {
    grid-template-columns:1fr
  }
  .scale-list {
    grid-template-columns:repeat(2,1fr)
  }
  .scale-list button {
    min-height:78px
  }
  .scale-card>header {
    flex-direction:column
  }
}
</style>
