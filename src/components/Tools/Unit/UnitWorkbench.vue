<script lang="ts">
interface HistoryItem {
  id: number
  categoryId: UnitCategoryId
  value: string
  from: string
  to: string
  result: string
}

// 单位换算 8 个分类页面共享同一份「最近保存」，跨路由切换不丢失
const sharedHistory = ref<HistoryItem[]>([])
let sharedHistoryId = 0
</script>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { CopyDocument, Delete, RefreshRight, Search, Star, Switch as SwitchIcon, TrendCharts } from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import MetricsBar from '@/components/Common/MetricsBar.vue'
import { copy } from '@/utils/string'
import {
  UNIT_CATEGORIES,
  UNIT_CATEGORY_PATHS,
  convertAllUnits,
  convertUnitValue,
  formatUnitValue,
  getBaseValue,
  getUnitCategory,
  isBelowAbsoluteZero,
  type UnitCategoryId,
  type UnitDefinition,
} from '@/utils/unitConverter'

const props = defineProps<{ categoryId: UnitCategoryId }>()

const route = useRoute()
const router = useRouter()
const activeId = computed<UnitCategoryId>(() => props.categoryId)
const initialCategory = getUnitCategory(props.categoryId)

// 分类由路由路径决定；query 仅承载“最近保存”恢复的具体换算数据
const queryFrom = typeof route.query.from === 'string' ? route.query.from : ''
const queryTo = typeof route.query.to === 'string' ? route.query.to : ''
const queryValue = typeof route.query.value === 'string' ? route.query.value : ''

const inputValue = ref(queryValue || '1')
const fromUnit = ref(initialCategory.units.some(unit => unit.key === queryFrom) ? queryFrom : initialCategory.defaults[0])
const toUnit = ref(initialCategory.units.some(unit => unit.key === queryTo) ? queryTo : initialCategory.defaults[1])
const precision = ref(10)
const resultSearch = ref('')
const history = computed(() => sharedHistory.value)

const categoryVisuals: Record<UnitCategoryId, { symbol: string; accent: string }> = {
  length: { symbol: '↔', accent: 'blue' },
  area: { symbol: '□', accent: 'cyan' },
  mass: { symbol: '⚖', accent: 'amber' },
  time: { symbol: '◷', accent: 'violet' },
  temperature: { symbol: '℃', accent: 'rose' },
  pressure: { symbol: '◉', accent: 'sky' },
  energy: { symbol: '⚡', accent: 'orange' },
  power: { symbol: 'W', accent: 'emerald' },
}

const activeCategory = computed(() => getUnitCategory(activeId.value))
const parsedValue = computed(() => Number(inputValue.value))
const hasValidInput = computed(() => inputValue.value.trim() !== '' && Number.isFinite(parsedValue.value))
const sourceDefinition = computed(() => activeCategory.value.units.find(unit => unit.key === fromUnit.value))
const targetDefinition = computed(() => activeCategory.value.units.find(unit => unit.key === toUnit.value))
const numericResult = computed(() => hasValidInput.value
  ? convertUnitValue(activeId.value, parsedValue.value, fromUnit.value, toUnit.value)
  : Number.NaN)
const formattedResult = computed(() => formatUnitValue(numericResult.value, precision.value))
const baseValue = computed(() => hasValidInput.value ? getBaseValue(activeId.value, parsedValue.value, fromUnit.value) : Number.NaN)
const belowAbsoluteZero = computed(() => hasValidInput.value && isBelowAbsoluteZero(activeId.value, parsedValue.value, fromUnit.value))
const allResults = computed(() => hasValidInput.value
  ? convertAllUnits(activeId.value, parsedValue.value, fromUnit.value)
  : [])

const resultGroups = computed(() => {
  const query = resultSearch.value.trim().toLocaleLowerCase()
  const groups = new Map<string, Array<UnitDefinition & { value: number }>>()
  allResults.value.forEach(item => {
    if (query && !`${item.name} ${item.symbol} ${item.system}`.toLocaleLowerCase().includes(query)) return
    const items = groups.get(item.system) ?? []
    items.push(item)
    groups.set(item.system, items)
  })
  return Array.from(groups, ([name, items]) => ({ name, items }))
})

const baseSummary = computed(() => hasValidInput.value
  ? `${formatUnitValue(baseValue.value, precision.value)} ${activeCategory.value.baseSymbol}`
  : '—')
const oneUnitRatio = computed(() => {
  if (!sourceDefinition.value || !targetDefinition.value) return '—'
  const result = convertUnitValue(activeId.value, 1, fromUnit.value, toUnit.value)
  return `1 ${sourceDefinition.value.symbol} = ${formatUnitValue(result, precision.value)} ${targetDefinition.value.symbol}`
})
const visibleResultCount = computed(() => resultGroups.value.reduce((sum, group) => sum + group.items.length, 0))
const categoryPath = (id: UnitCategoryId) => `/${UNIT_CATEGORY_PATHS[id]}`

function selectCategory(id: UnitCategoryId) {
  if (id === activeId.value) return
  router.push(categoryPath(id))
}

function usePreset(preset: typeof activeCategory.value.presets[number]) {
  inputValue.value = String(preset.value)
  fromUnit.value = preset.from
  toUnit.value = preset.to
}

function swapUnits() {
  const result = numericResult.value
  const previousFrom = fromUnit.value
  fromUnit.value = toUnit.value
  toUnit.value = previousFrom
  if (Number.isFinite(result)) inputValue.value = String(result)
}

function useResultAsSource(item: UnitDefinition & { value: number }) {
  const previousFrom = fromUnit.value
  inputValue.value = String(item.value)
  fromUnit.value = item.key
  if (toUnit.value === item.key) toUnit.value = previousFrom
}

function copyPrimary() {
  if (!hasValidInput.value || !targetDefinition.value) return
  copy(`${formattedResult.value} ${targetDefinition.value.symbol}`)
}

function copyAllResults() {
  if (!allResults.value.length) return
  copy(allResults.value.map(item => `${formatUnitValue(item.value, precision.value)} ${item.symbol}（${item.name}）`).join('\n'))
}

function saveHistory() {
  if (!hasValidInput.value || !sourceDefinition.value || !targetDefinition.value) return
  const item: HistoryItem = {
    id: ++sharedHistoryId,
    categoryId: activeId.value,
    value: inputValue.value,
    from: fromUnit.value,
    to: toUnit.value,
    result: formattedResult.value,
  }
  sharedHistory.value = [item, ...sharedHistory.value.filter(existing => !(
    existing.categoryId === item.categoryId && existing.value === item.value && existing.from === item.from && existing.to === item.to
  ))].slice(0, 6)
}

function clearHistory() {
  sharedHistory.value = []
}

function restoreHistory(item: HistoryItem) {
  if (item.categoryId === activeId.value) {
    inputValue.value = item.value
    fromUnit.value = item.from
    toUnit.value = item.to
    return
  }
  router.push({
    path: categoryPath(item.categoryId),
    query: { value: item.value, from: item.from, to: item.to },
  })
}

function clearInput() {
  inputValue.value = ''
}
</script>

<template>
  <div class="unit-page flex flex-col mt-3 flex-1" :data-accent="categoryVisuals[activeId].accent">
    <ToolHero summary="一次输入，读懂整组单位关系">
      <template #metrics>
        <MetricsBar :items="[{ label: '换算分类', value: '8' }, { label: '单位定义', value: '100+' }, { label: '网络请求', value: '0' }]" />
      </template>
    </ToolHero>

    <nav class="category-nav" aria-label="单位分类">
      <button
        v-for="category in UNIT_CATEGORIES"
        :key="category.id"
        type="button"
        :class="{ active: activeId === category.id }"
        @click="selectCategory(category.id)"
      >
        <b>{{ categoryVisuals[category.id].symbol }}</b>
        <span><strong>{{ category.shortTitle }}</strong><small>{{ category.units.length }} 个单位</small></span>
      </button>
    </nav>

    <section class="workspace-grid">
      <article class="converter-card">
        <header class="card-heading">
          <div><span class="eyebrow">{{ activeCategory.id.toUpperCase() }} CONVERTER</span><h3>{{ activeCategory.title }}</h3><p>{{ activeCategory.description }}</p></div>
          <span class="live-badge">LIVE</span>
        </header>

        <div class="conversion-board">
          <div class="unit-panel source-panel">
            <label for="unit-source-value">原始数值</label>
            <el-input id="unit-source-value" v-model="inputValue" size="large" inputmode="decimal" placeholder="输入数值" @keydown.enter="saveHistory">
              <template #suffix><button v-if="inputValue" class="inline-clear" type="button" @click="clearInput">清除</button></template>
            </el-input>
            <el-select v-model="fromUnit" size="large" filterable aria-label="原始单位">
              <el-option v-for="unit in activeCategory.units" :key="unit.key" :value="unit.key" :label="`${unit.name} · ${unit.symbol}`"><span>{{ unit.name }}</span><small>{{ unit.symbol }} · {{ unit.system }}</small></el-option>
            </el-select>
          </div>

          <button type="button" class="swap-button" title="交换单位并保留当前换算值" @click="swapUnits"><el-icon><SwitchIcon /></el-icon></button>

          <div class="unit-panel target-panel">
            <label>换算结果</label>
            <div class="primary-result" :class="{ invalid: !hasValidInput }"><strong>{{ formattedResult }}</strong><span>{{ targetDefinition?.symbol }}</span></div>
            <el-select v-model="toUnit" size="large" filterable aria-label="目标单位">
              <el-option v-for="unit in activeCategory.units" :key="unit.key" :value="unit.key" :label="`${unit.name} · ${unit.symbol}`"><span>{{ unit.name }}</span><small>{{ unit.symbol }} · {{ unit.system }}</small></el-option>
            </el-select>
          </div>
        </div>

        <div v-if="belowAbsoluteZero" class="warning-banner">当前温度低于绝对零度（−273.15°C），数学换算仍显示，但物理上无效。</div>
        <div v-else-if="!hasValidInput" class="warning-banner neutral">请输入有效数字，支持负数、小数和科学计数法。</div>

        <div class="equation-bar"><span>{{ oneUnitRatio }}</span><div><button type="button" aria-label="复制换算结果" @click="copyPrimary"><el-icon><CopyDocument /></el-icon>复制结果</button><button type="button" aria-label="保存本次换算" @click="saveHistory"><el-icon><Star /></el-icon>保存记录</button></div></div>

        <div class="preset-section"><span>常用场景</span><div><button v-for="preset in activeCategory.presets" :key="preset.label" type="button" @click="usePreset(preset)">{{ preset.label }}</button></div></div>
      </article>

      <aside class="insight-card">
        <header class="card-heading"><div><span class="eyebrow">CONVERSION INSIGHT</span><h3>换算摘要</h3></div><el-icon><TrendCharts /></el-icon></header>
        <div class="summary-result"><span>{{ inputValue || '—' }} {{ sourceDefinition?.symbol }}</span><b>=</b><strong>{{ formattedResult }} <small>{{ targetDefinition?.symbol }}</small></strong></div>
        <div class="summary-grid"><div><span>基准单位</span><strong>{{ activeCategory.baseName }}</strong></div><div><span>换算后基准值</span><strong>{{ baseSummary }}</strong></div><div><span>源单位体系</span><strong>{{ sourceDefinition?.system || '—' }}</strong></div><div><span>目标单位体系</span><strong>{{ targetDefinition?.system || '—' }}</strong></div></div>
        <div class="precision-setting"><label>显示精度 <strong>{{ precision }} 位有效数字</strong></label><el-segmented v-model="precision" :options="[{ label: '4 位', value: 4 }, { label: '10 位', value: 10 }, { label: '14 位', value: 14 }]" /></div>
        <div class="definition-notes"><article v-for="(note, index) in activeCategory.notes" :key="note"><b>0{{ index + 1 }}</b><p>{{ note }}</p></article></div>
      </aside>
    </section>

    <section class="all-results-card">
      <header class="results-heading">
        <div><span class="eyebrow">ALL UNIT RESULTS</span><h3>全部换算结果</h3><p>{{ hasValidInput ? `共 ${visibleResultCount} 个结果，点击任意卡片可设为新的原始单位` : '输入数值后显示全部单位' }}</p></div>
        <div class="result-tools"><el-input v-model="resultSearch" :prefix-icon="Search" clearable placeholder="搜索单位或体系" /><el-button :icon="CopyDocument" :disabled="!allResults.length" @click="copyAllResults">复制全部</el-button></div>
      </header>

      <div v-if="resultGroups.length" class="result-groups">
        <section v-for="group in resultGroups" :key="group.name" class="result-group"><h4>{{ group.name }} <span>{{ group.items.length }}</span></h4><div class="result-grid"><button v-for="item in group.items" :key="item.key" type="button" :class="{ selected: item.key === toUnit }" @click="useResultAsSource(item)"><span class="unit-symbol">{{ item.symbol }}</span><div><strong>{{ formatUnitValue(item.value, precision) }}</strong><small>{{ item.name }}</small></div><el-icon><RefreshRight /></el-icon></button></div></section>
      </div>
      <div v-else class="empty-results">{{ hasValidInput ? '没有匹配的单位' : '等待输入换算数值' }}</div>
    </section>

    <section v-if="history.length" class="history-card">
      <header><div><span class="eyebrow">RECENT CONVERSIONS</span><h3>最近保存</h3></div><button type="button" @click="clearHistory"><el-icon><Delete /></el-icon>清空</button></header>
      <div><button v-for="item in history" :key="item.id" type="button" @click="restoreHistory(item)"><span>{{ getUnitCategory(item.categoryId).shortTitle }}</span><strong>{{ item.value }} {{ getUnitCategory(item.categoryId).units.find(unit => unit.key === item.from)?.symbol }} → {{ item.result }} {{ getUnitCategory(item.categoryId).units.find(unit => unit.key === item.to)?.symbol }}</strong></button></div>
    </section>

    <ToolGuide title="换算说明">
      <p>比例单位先统一换算为该分类的基准单位，再换算为目标单位；温度等带零点偏移的单位使用独立公式。时间中的“月”和“年”为平均公历时长，不代表任意两个具体日期之间的日历差。结果显示精度只影响展示，不改变内部计算。</p>
    </ToolGuide>
  </div>
</template>

<style scoped>
.unit-page{--accent:#2563eb;--accent-soft:#eff6ff;--accent-deep:#1d4ed8;gap:16px}.unit-page[data-accent="cyan"]{--accent:#0891b2;--accent-soft:#ecfeff;--accent-deep:#0e7490}.unit-page[data-accent="amber"]{--accent:#d97706;--accent-soft:#fffbeb;--accent-deep:#b45309}.unit-page[data-accent="violet"]{--accent:#7c3aed;--accent-soft:#f5f3ff;--accent-deep:#6d28d9}.unit-page[data-accent="rose"]{--accent:#e11d48;--accent-soft:#fff1f2;--accent-deep:#be123c}.unit-page[data-accent="sky"]{--accent:#0284c7;--accent-soft:#f0f9ff;--accent-deep:#0369a1}.unit-page[data-accent="orange"]{--accent:#ea580c;--accent-soft:#fff7ed;--accent-deep:#c2410c}.unit-page[data-accent="emerald"]{--accent:#059669;--accent-soft:#ecfdf5;--accent-deep:#047857}.category-nav,.converter-card,.insight-card,.all-results-card,.history-card{border:1px solid #e2e8f0;background:#fff;box-shadow:0 16px 40px rgba(15,23,42,.055)}.eyebrow{display:block;margin-bottom:6px;color:var(--accent);font-size:10px;font-weight:900;letter-spacing:.16em}.category-nav{display:grid;grid-template-columns:repeat(8,1fr);gap:6px;padding:9px;border-radius:19px;overflow:auto}.category-nav button{display:flex;align-items:center;justify-content:center;gap:7px;min-width:95px;padding:10px 6px;border:1px solid transparent;border-radius:12px;color:#64748b;background:transparent;cursor:pointer;transition:.18s}.category-nav button>b{display:grid;place-items:center;width:29px;height:29px;border-radius:9px;color:#64748b;background:#f1f5f9;font-size:14px}.category-nav span,.category-nav strong,.category-nav small{display:block;text-align:left}.category-nav strong{font-size:12px}.category-nav small{margin-top:1px;color:#94a3b8;font-size:8px}.category-nav button.active{border-color:color-mix(in srgb,var(--accent) 28%,white);color:var(--accent-deep);background:var(--accent-soft)}.category-nav button.active>b{color:#fff;background:var(--accent)}.workspace-grid{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(330px,.75fr);gap:16px;align-items:start}.converter-card,.insight-card,.all-results-card,.history-card{padding:22px;border-radius:22px}.insight-card{position:sticky;top:82px}.card-heading,.results-heading,.history-card>header{display:flex;align-items:center;justify-content:space-between;gap:12px}.card-heading{margin-bottom:19px}.card-heading h3,.results-heading h3,.history-card h3{margin:0;color:#0f172a;font-size:19px}.card-heading p,.results-heading p{margin:4px 0 0;color:#94a3b8;font-size:11px}.live-badge{padding:5px 9px;border-radius:999px;color:#047857;background:#d1fae5;font-size:9px;font-weight:900;letter-spacing:.12em}.conversion-board{display:grid;grid-template-columns:minmax(0,1fr) 48px minmax(0,1fr);align-items:center;gap:10px}.unit-panel{min-width:0;padding:16px;border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc}.unit-panel>label{display:block;margin-bottom:8px;color:#64748b;font-size:11px;font-weight:700}.unit-panel :deep(.el-input){margin-bottom:9px}.source-panel :deep(.el-input__inner){font-size:20px;font-weight:800}.primary-result{display:flex;align-items:baseline;gap:7px;min-height:40px;margin-bottom:9px;padding:5px 3px;color:var(--accent-deep);overflow:hidden}.primary-result strong{overflow:hidden;font-size:clamp(22px,3vw,31px);line-height:1.15;text-overflow:ellipsis}.primary-result span{color:var(--accent);font-size:14px;font-weight:800}.primary-result.invalid{color:#94a3b8}.inline-clear{border:0;color:#94a3b8;background:none;cursor:pointer;font-size:10px}.swap-button{display:grid;place-items:center;width:42px;height:42px;border:0;border-radius:50%;color:#fff;background:var(--accent);box-shadow:0 8px 18px color-mix(in srgb,var(--accent) 28%,transparent);cursor:pointer;font-size:18px}.warning-banner{margin-top:12px;padding:10px 12px;border-radius:11px;color:#be123c;background:#fff1f2;font-size:11px}.warning-banner.neutral{color:#64748b;background:#f1f5f9}.equation-bar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:14px;padding:11px 13px;border-radius:13px;background:var(--accent-soft)}.equation-bar>span{color:var(--accent-deep);font-family:ui-monospace,SFMono-Regular,monospace;font-size:11px;font-weight:800}.equation-bar>div{display:flex;gap:5px}.equation-bar button,.history-card header button{display:flex;align-items:center;gap:4px;padding:5px 7px;border:0;color:#64748b;background:transparent;cursor:pointer;font-size:10px}.preset-section{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:12px;margin-top:17px}.preset-section>span{color:#64748b;font-size:11px;font-weight:700}.preset-section>div{display:flex;flex-wrap:wrap;gap:6px}.preset-section button{padding:6px 9px;border:1px solid #e2e8f0;border-radius:999px;color:#64748b;background:#fff;cursor:pointer;font-size:10px}.preset-section button:hover{border-color:var(--accent);color:var(--accent)}.insight-card>.card-heading>.el-icon{color:var(--accent);font-size:25px}.summary-result{display:grid;gap:5px;padding:17px;border-radius:16px;color:#fff;background:linear-gradient(135deg,var(--accent-deep),var(--accent))}.summary-result span{color:rgba(255,255,255,.76);font-size:11px}.summary-result b{opacity:.5;font-size:12px}.summary-result strong{overflow:hidden;font-size:24px;text-overflow:ellipsis}.summary-result small{font-size:12px}.summary-grid{display:grid;grid-template-columns:1fr 1fr;margin:14px 0;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden}.summary-grid div{min-width:0;padding:10px;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0}.summary-grid div:nth-child(2n){border-right:0}.summary-grid div:nth-last-child(-n+2){border-bottom:0}.summary-grid span,.summary-grid strong{display:block}.summary-grid span{color:#94a3b8;font-size:9px}.summary-grid strong{margin-top:4px;overflow:hidden;color:#334155;font-size:11px;text-overflow:ellipsis;white-space:nowrap}.precision-setting label{display:flex;justify-content:space-between;margin-bottom:8px;color:#64748b;font-size:10px}.precision-setting label strong{color:var(--accent)}.precision-setting :deep(.el-segmented){width:100%}.definition-notes{display:grid;gap:8px;margin-top:14px}.definition-notes article{display:flex;gap:9px;padding:9px;border-left:2px solid var(--accent);background:#f8fafc}.definition-notes b{color:var(--accent);font-size:9px}.definition-notes p{margin:0;color:#64748b;font-size:10px;line-height:1.5}.results-heading{margin-bottom:18px}.result-tools{display:flex;gap:8px}.result-tools :deep(.el-input){width:220px}.result-groups{display:grid;gap:19px}.result-group h4{display:flex;align-items:center;gap:7px;margin:0 0 8px;color:#475569;font-size:12px}.result-group h4 span{padding:2px 6px;border-radius:999px;color:var(--accent);background:var(--accent-soft);font-size:8px}.result-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.result-grid button{display:grid;grid-template-columns:40px minmax(0,1fr) auto;align-items:center;gap:9px;min-width:0;padding:10px;border:1px solid #e2e8f0;border-radius:12px;color:#64748b;background:#f8fafc;text-align:left;cursor:pointer;transition:.16s}.result-grid button:hover,.result-grid button.selected{border-color:color-mix(in srgb,var(--accent) 55%,white);background:var(--accent-soft);transform:translateY(-1px)}.unit-symbol{display:grid;place-items:center;width:40px;height:34px;border-radius:9px;color:var(--accent-deep);background:#fff;font-size:11px;font-weight:900}.result-grid button>div{min-width:0}.result-grid strong,.result-grid small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.result-grid strong{color:#334155;font-size:12px}.result-grid small{margin-top:3px;color:#94a3b8;font-size:9px}.result-grid .el-icon{color:#cbd5e1}.empty-results{padding:46px;color:#94a3b8;text-align:center}.history-card>header{margin-bottom:12px}.history-card>div{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.history-card>div>button{display:flex;align-items:center;gap:9px;min-width:0;padding:10px;border:1px solid #e2e8f0;border-radius:11px;color:#64748b;background:#f8fafc;text-align:left;cursor:pointer}.history-card>div span{padding:3px 6px;border-radius:6px;color:var(--accent);background:var(--accent-soft);font-size:9px}.history-card>div strong{overflow:hidden;color:#334155;font-size:10px;text-overflow:ellipsis;white-space:nowrap}:global(html.dark .unit-page .category-nav),:global(html.dark .unit-page .converter-card),:global(html.dark .unit-page .insight-card),:global(html.dark .unit-page .all-results-card),:global(html.dark .unit-page .history-card){border-color:#334155;background-color:#1e293b;box-shadow:none}:global(html.dark .unit-page .category-nav button){color:#94a3b8}:global(html.dark .unit-page .category-nav button>b),:global(html.dark .unit-page .unit-panel),:global(html.dark .unit-page .definition-notes article),:global(html.dark .unit-page .result-grid button),:global(html.dark .unit-page .history-card>div>button){background:#0f172a}:global(html.dark .unit-page .category-nav button.active),:global(html.dark .unit-page .equation-bar),:global(html.dark .unit-page .result-grid button.selected){background:color-mix(in srgb,var(--accent) 18%,#0f172a)}:global(html.dark .unit-page .card-heading h3),:global(html.dark .unit-page .results-heading h3),:global(html.dark .unit-page .history-card h3),:global(html.dark .unit-page .summary-grid strong),:global(html.dark .unit-page .result-grid strong),:global(html.dark .unit-page .history-card>div strong){color:#f8fafc}:global(html.dark .unit-page .unit-panel),:global(html.dark .unit-page .summary-grid),:global(html.dark .unit-page .summary-grid div),:global(html.dark .unit-page .preset-section button),:global(html.dark .unit-page .result-grid button),:global(html.dark .unit-page .history-card>div>button){border-color:#334155}:global(html.dark .unit-page .preset-section button),:global(html.dark .unit-page .unit-symbol){color:#cbd5e1;background:#0f172a}:global(html.dark .unit-page .warning-banner.neutral){background:#0f172a}@media(max-width:1120px){.workspace-grid{grid-template-columns:1fr}.insight-card{position:static}.result-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.category-nav{justify-content:start;grid-template-columns:repeat(8,minmax(100px,1fr))}}@media(max-width:720px){.unit-page{gap:12px}.category-nav{display:flex;padding:7px}.category-nav button{flex:0 0 98px}.converter-card,.insight-card,.all-results-card,.history-card{padding:15px;border-radius:19px}.conversion-board{grid-template-columns:1fr}.swap-button{margin:-2px auto;transform:rotate(90deg)}.equation-bar{align-items:flex-start;flex-direction:column}.equation-bar>div{width:100%;justify-content:flex-end}.preset-section{grid-template-columns:1fr}.results-heading{align-items:flex-start;flex-direction:column}.result-tools{width:100%}.result-tools :deep(.el-input){width:100%}.result-grid{grid-template-columns:1fr 1fr}.history-card>div{grid-template-columns:1fr}.card-heading{align-items:flex-start}.summary-result strong{font-size:21px}}@media(max-width:430px){.result-grid{grid-template-columns:1fr}.result-tools{flex-direction:column}.result-tools :deep(.el-button){width:100%;margin-left:0}}</style>
