<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import type { Map as LMap, Marker as LMarker } from 'leaflet'
import { ElMessage } from 'element-plus'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import { copy } from '@/utils/string'
import {
  buildBatchCoordinateSets,
  buildCoordinateSet,
  coordinateResultsToCsv,
  formatCoordinateValue,
  fromCoordinatePair,
  toCoordinatePair,
  validateCoordinate,
  type AnyCoordinate,
  type BatchCoordinateError,
  type BatchCoordinateResult,
  type CoordSystem,
  type CoordinateSet,
  type GeoCoordinate,
} from '@/utils/coordTransformEngine'

interface CoordinateFormValue {
  primary: string
  secondary: string
}

type CoordinateForms = Record<CoordSystem, CoordinateFormValue>

interface SystemMetaItem {
  key: CoordSystem
  label: string
  desc: string
  tag: string
  primaryLabel: string
  secondaryLabel: string
  primaryPlaceholder: string
  secondaryPlaceholder: string
  helper?: string
}

const workMode = ref<'single' | 'batch'>('single')
const defaultGcj02: GeoCoordinate = {
  lng: 116.397428,
  lat: 39.90923,
}

const systemMeta: SystemMetaItem[] = [
  {
    key: 'wgs84',
    label: 'WGS84',
    desc: 'GPS 原始坐标，适合国际地图与设备定位。',
    tag: 'GPS',
    primaryLabel: '经度',
    secondaryLabel: '纬度',
    primaryPlaceholder: '例如 116.397428',
    secondaryPlaceholder: '例如 39.909230',
  },
  {
    key: 'cgcs2000',
    label: 'CGCS2000',
    desc: '国家大地坐标系（EPSG:4490），适用于互联网地图场景的近似转换。',
    tag: '国标',
    primaryLabel: '经度',
    secondaryLabel: '纬度',
    primaryPlaceholder: '例如 116.397428',
    secondaryPlaceholder: '例如 39.909230',
  },
  {
    key: 'gcj02',
    label: 'GCJ-02',
    desc: '火星坐标系，国内高德/腾讯地图常用。',
    tag: '地图',
    primaryLabel: '经度',
    secondaryLabel: '纬度',
    primaryPlaceholder: '例如 116.403963',
    secondaryPlaceholder: '例如 39.915119',
  },
  {
    key: 'bd09',
    label: 'BD-09',
    desc: '百度地图坐标系，适合百度地图接口。',
    tag: 'Baidu',
    primaryLabel: '经度',
    secondaryLabel: '纬度',
    primaryPlaceholder: '例如 116.410369',
    secondaryPlaceholder: '例如 39.921336',
  },
  {
    key: 'mercator',
    label: 'Web Mercator',
    desc: '网络墨卡托投影（EPSG:3857），常用于瓦片地图与投影坐标。',
    tag: '投影',
    primaryLabel: 'X',
    secondaryLabel: 'Y',
    primaryPlaceholder: '例如 12957254.77',
    secondaryPlaceholder: '例如 4852582.08',
    helper: '单位为米，地图仍以 GCJ-02 结果进行展示。',
  },
]

const state = reactive<{
  forms: CoordinateForms
  current: CoordinateSet | null
  error: string
  lastSource: CoordSystem
  isOnline: boolean
}>({
  forms: {
    wgs84: { primary: '', secondary: '' },
    cgcs2000: { primary: '', secondary: '' },
    gcj02: { primary: '', secondary: '' },
    bd09: { primary: '', secondary: '' },
    mercator: { primary: '', secondary: '' },
  },
  current: null,
  error: '',
  lastSource: 'gcj02',
  isOnline: navigator.onLine,
})

const activeSystem = ref<CoordSystem>('gcj02')
const mapContainerRef = ref<HTMLElement | null>(null)
const batchSource = ref<CoordSystem>('gcj02')
const batchInput = ref('天安门,116.397428,39.909230\n西湖,120.155070,30.274085\n外滩,121.490317,31.241701')
const batchResults = ref<BatchCoordinateResult[]>([])
const batchErrors = ref<BatchCoordinateError[]>([])

const quickLocations = [
  { name: '天安门', system: 'gcj02' as CoordSystem, primary: 116.397428, secondary: 39.90923 },
  { name: '西湖', system: 'gcj02' as CoordSystem, primary: 120.15507, secondary: 30.274085 },
  { name: '外滩', system: 'gcj02' as CoordSystem, primary: 121.490317, secondary: 31.241701 },
]

let mapInstance: LMap | null = null
let markerInstance: LMarker | null = null
let leafletModule: typeof import('leaflet') | null = null

const activeMeta = computed(() => systemMeta.find(item => item.key === activeSystem.value) ?? systemMeta[2])
const lastSourceMeta = computed(() => systemMeta.find(item => item.key === state.lastSource) ?? systemMeta[2])
const currentGcjPoint = computed(() => state.current?.gcj02 ?? null)
const summaryText = computed(() => {
  if (!state.current) return '点击地图或编辑右侧任意坐标，系统会自动完成五种坐标系换算。'
  const current = state.current[state.lastSource]
  const pair = getFormattedPair(state.lastSource, current)
  return `最近以 ${lastSourceMeta.value.label} 为基准完成同步，当前 ${lastSourceMeta.value.primaryLabel} ${pair.primary}，${lastSourceMeta.value.secondaryLabel} ${pair.secondary}。`
})
const sourcePairText = computed(() => {
  if (!state.current) return '等待坐标'
  const pair = getFormattedPair(state.lastSource, state.current[state.lastSource])
  return `${pair.primary}, ${pair.secondary}`
})
const offsetDistance = computed(() => {
  if (!state.current) return 0
  return haversineDistance(state.current.wgs84, state.current.gcj02)
})
const batchSourceMeta = computed(() => systemMeta.find(item => item.key === batchSource.value) ?? systemMeta[2])

function parseCoordinate(raw: string) {
  const normalized = raw.trim()
  if (!normalized) return null
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}

function getFormattedPair(system: CoordSystem, coordinate: AnyCoordinate) {
  const pair = toCoordinatePair(system, coordinate)
  return {
    primary: formatCoordinateValue(system, pair.primary),
    secondary: formatCoordinateValue(system, pair.secondary),
  }
}

function syncForms() {
  if (!state.current) return
  systemMeta.forEach((system) => {
    if (system.key === state.lastSource) return
    const pair = getFormattedPair(system.key, state.current![system.key])
    state.forms[system.key].primary = pair.primary
    state.forms[system.key].secondary = pair.secondary
  })
}

async function applyCoordinate(source: CoordSystem, coordinate: AnyCoordinate, shouldCenterMap = true) {
  const validationMessage = validateCoordinate(source, coordinate)
  if (validationMessage) {
    state.error = validationMessage
    return
  }

  state.error = ''
  state.lastSource = source
  state.current = buildCoordinateSet(source, coordinate)
  const sourcePair = getFormattedPair(source, coordinate)
  state.forms[source].primary = sourcePair.primary
  state.forms[source].secondary = sourcePair.secondary
  syncForms()
  await updateMap(shouldCenterMap)
}

function updateFromInputs(system: CoordSystem) {
  activeSystem.value = system
  const primary = parseCoordinate(state.forms[system].primary)
  const secondary = parseCoordinate(state.forms[system].secondary)

  if (primary === null || secondary === null) {
    state.error = state.forms[system].primary.trim() || state.forms[system].secondary.trim()
      ? '请输入有效的数字坐标。'
      : ''
    return
  }

  void applyCoordinate(system, fromCoordinatePair(system, primary, secondary))
}

function clearCoordinates() {
  systemMeta.forEach((system) => {
    state.forms[system.key].primary = ''
    state.forms[system.key].secondary = ''
  })
  state.current = null
  state.error = ''

  if (markerInstance) {
    markerInstance.remove()
    markerInstance = null
  }

  if (mapInstance) {
    mapInstance.setView([defaultGcj02.lat, defaultGcj02.lng], 11)
  }
}

function copyPair(system: CoordSystem) {
  if (!state.current) return
  copy(`${state.forms[system].primary}, ${state.forms[system].secondary}`)
}

function copyAllCoordinates() {
  if (!state.current) return
  copy(systemMeta.map(system => {
    const pair = getFormattedPair(system.key, state.current![system.key])
    return `${system.label}\t${pair.primary}\t${pair.secondary}`
  }).join('\n'))
  ElMessage.success('五种坐标已复制')
}

function downloadText(content: string, filename: string, type: string) {
  const anchor = document.createElement('a')
  anchor.download = filename
  anchor.href = URL.createObjectURL(new Blob([content], { type }))
  anchor.click()
  URL.revokeObjectURL(anchor.href)
}

function downloadCurrentJson() {
  if (!state.current) return
  downloadText(JSON.stringify(state.current, null, 2), 'coordinate-conversion.json', 'application/json;charset=utf-8')
}

function useQuickLocation(location: typeof quickLocations[number]) {
  activeSystem.value = location.system
  state.forms[location.system].primary = String(location.primary)
  state.forms[location.system].secondary = String(location.secondary)
  void applyCoordinate(location.system, fromCoordinatePair(location.system, location.primary, location.secondary))
}

function runBatchConversion() {
  const converted = buildBatchCoordinateSets(batchInput.value, batchSource.value)
  batchResults.value = converted.results
  batchErrors.value = converted.errors
  if (converted.results.length) ElMessage.success(`已转换 ${converted.results.length} 个坐标点`)
}

function clearBatch() {
  batchInput.value = ''
  batchResults.value = []
  batchErrors.value = []
}

function downloadBatchCsv() {
  if (!batchResults.value.length) return
  const csv = `\ufeff${coordinateResultsToCsv(batchResults.value)}`
  downloadText(csv, 'coordinate-conversion.csv', 'text/csv;charset=utf-8')
}

function locateBatchResult(result: BatchCoordinateResult) {
  workMode.value = 'single'
  activeSystem.value = 'wgs84'
  const coordinate = result.coordinates.wgs84
  state.forms.wgs84.primary = formatCoordinateValue('wgs84', coordinate.lng)
  state.forms.wgs84.secondary = formatCoordinateValue('wgs84', coordinate.lat)
  void applyCoordinate('wgs84', coordinate)
}

function haversineDistance(first: GeoCoordinate, second: GeoCoordinate) {
  const radius = 6371000
  const toRadians = (value: number) => value * Math.PI / 180
  const deltaLat = toRadians(second.lat - first.lat)
  const deltaLng = toRadians(second.lng - first.lng)
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(toRadians(first.lat)) * Math.cos(toRadians(second.lat)) * Math.sin(deltaLng / 2) ** 2
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function handleOnline() {
  state.isOnline = true
  void updateMap(false)
}

function handleOffline() {
  state.isOnline = false
}

function buildPopupHtml() {
  if (!state.current) return '<b>地图坐标</b>'

  const popupLines = systemMeta.map((system) => {
    const pair = getFormattedPair(system.key, state.current![system.key])
    return `<div style="font-size:12px;line-height:1.6"><span style="color:#64748b">${system.label}</span> ${pair.primary}, ${pair.secondary}</div>`
  })

  return [
    '<div style="min-width:240px">',
    '<div style="font-weight:600;margin-bottom:6px">当前坐标</div>',
    ...popupLines,
    '</div>',
  ].join('')
}

async function ensureMap() {
  if (!state.isOnline || !mapContainerRef.value) return

  if (!leafletModule) {
    leafletModule = await import('leaflet')
    await import('leaflet/dist/leaflet.css')
  }

  const L = leafletModule
  if (!L) return

  if (mapInstance) return

  mapInstance = L.map(mapContainerRef.value, { zoomControl: true }).setView([defaultGcj02.lat, defaultGcj02.lng], 11)

  L.tileLayer(
    'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
    {
      subdomains: ['1', '2', '3', '4'],
      maxZoom: 18,
      attribution: '© 高德地图',
    }
  ).addTo(mapInstance)

  mapInstance.on('click', (event) => {
    void applyCoordinate('gcj02', { lng: event.latlng.lng, lat: event.latlng.lat })
  })
}

async function updateMap(shouldCenterMap = true) {
  if (!state.isOnline) return

  await nextTick()
  await ensureMap()

  if (!mapInstance || !leafletModule || !currentGcjPoint.value) return

  const L = leafletModule
  const point = currentGcjPoint.value

  if (!markerInstance) {
    const icon = L.divIcon({
      className: '',
      html: `<div style="width:30px;height:30px;border-radius:9999px;background:radial-gradient(circle at 35% 35%,#93c5fd 0,#3b82f6 55%,#1d4ed8 100%);border:3px solid rgba(255,255,255,0.95);box-shadow:0 10px 20px rgba(37,99,235,0.28)"></div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    })

    markerInstance = L.marker([point.lat, point.lng], { draggable: true, icon }).addTo(mapInstance)
    markerInstance.on('dragend', () => {
      if (!markerInstance) return
      const latLng = markerInstance.getLatLng()
      void applyCoordinate('gcj02', { lng: latLng.lng, lat: latLng.lat }, false)
    })
  } else {
    markerInstance.setLatLng([point.lat, point.lng])
  }

  markerInstance.bindPopup(buildPopupHtml())

  if (shouldCenterMap) {
    mapInstance.setView([point.lat, point.lng], Math.max(mapInstance.getZoom(), 15))
  }
}

onMounted(() => {
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  void applyCoordinate('gcj02', defaultGcj02, false)
})

watch(workMode, async mode => {
  if (mode !== 'single') return
  await nextTick()
  mapInstance?.invalidateSize()
})

onUnmounted(() => {
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)

  if (markerInstance) {
    markerInstance.remove()
    markerInstance = null
  }

  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }
})
</script>

<template>
  <div class="coord-tool flex flex-col mt-3 flex-1">
    <ToolHero summary="单点定位与批量互转，一个入口完成" description="在五种常用坐标系之间同步换算；单点模式可以地图选点，批量模式适合表格数据和接口清单。">
      <template #metrics>
        <div class="hero-metrics">
          <div><span>支持坐标系</span><strong>5 种</strong></div>
          <div><span>当前基准</span><strong>{{ workMode === 'single' ? lastSourceMeta.label : batchSourceMeta.label }}</strong></div>
          <div><span>处理状态</span><strong>{{ workMode === 'single' ? sourcePairText : `${batchResults.length} 个结果` }}</strong></div>
        </div>
      </template>
    </ToolHero>

    <nav class="mode-tabs" aria-label="坐标转换模式">
      <button :class="{ active: workMode === 'single' }" @click="workMode = 'single'">
        <span class="tab-icon">点</span><span><strong>单点转换</strong><small>输入、地图选点与拖拽定位</small></span>
      </button>
      <button :class="{ active: workMode === 'batch' }" @click="workMode = 'batch'">
        <span class="tab-icon">批</span><span><strong>批量转换</strong><small>粘贴多行坐标并导出 CSV</small></span>
      </button>
    </nav>

    <section v-show="workMode === 'single'" class="single-workspace">
      <div class="status-strip">
        <div>
          <span class="status-dot"></span>
          <div><strong>五种结果自动联动</strong><p>{{ summaryText }}</p></div>
        </div>
        <div class="status-actions">
          <button @click="copyAllCoordinates">复制全部</button>
          <button @click="downloadCurrentJson">导出 JSON</button>
          <button class="muted" @click="clearCoordinates">清空</button>
        </div>
      </div>

      <div class="single-layout">
        <article class="map-card">
          <header class="section-header">
            <div><span>MAP PICKER</span><h3>地图选点</h3><p>点击地图或拖拽标记，右侧五组坐标会立即更新。</p></div>
            <span class="system-badge">GCJ-02 地图</span>
          </header>
          <div class="quick-locations">
            <span>快速定位</span>
            <button v-for="location in quickLocations" :key="location.name" @click="useQuickLocation(location)">{{ location.name }}</button>
          </div>
          <div v-if="state.isOnline" class="map-stage"><div ref="mapContainerRef" class="map-container"></div></div>
          <div v-else class="map-offline">
            <span>离</span><strong>当前网络不可用</strong><p>坐标换算仍可使用，恢复网络后地图会自动加载。</p>
          </div>
          <footer class="map-footer">
            <div><span>WGS84 → GCJ-02 偏移参考</span><strong>{{ offsetDistance.toFixed(1) }} m</strong></div>
            <p>偏移量会随地理位置变化，仅用于理解坐标系差异。</p>
          </footer>
        </article>

        <article class="converter-card">
          <header class="section-header">
            <div><span>LIVE CONVERTER</span><h3>坐标结果</h3><p>编辑任意一组，其他坐标系自动同步。</p></div>
          </header>
          <div class="system-list">
            <section v-for="item in systemMeta" :key="item.key" class="system-card" :class="{ active: activeSystem === item.key }">
              <div class="system-heading">
                <button class="system-name" @click="activeSystem = item.key"><span>{{ item.tag }}</span><div><strong>{{ item.label }}</strong><small>{{ item.desc }}</small></div></button>
                <button class="copy-button" :disabled="!state.current" @click="copyPair(item.key)">复制</button>
              </div>
              <div class="coordinate-fields">
                <label><span>{{ item.primaryLabel }}</span><el-input v-model="state.forms[item.key].primary" :placeholder="item.primaryPlaceholder" @focus="activeSystem = item.key" @input="updateFromInputs(item.key)" /></label>
                <label><span>{{ item.secondaryLabel }}</span><el-input v-model="state.forms[item.key].secondary" :placeholder="item.secondaryPlaceholder" @focus="activeSystem = item.key" @input="updateFromInputs(item.key)" /></label>
              </div>
              <p v-if="item.helper" class="helper-text">{{ item.helper }}</p>
            </section>
          </div>
          <div v-if="state.error" class="error-card">{{ state.error }}</div>
          <div class="source-note"><span>当前编辑</span><strong>{{ activeMeta.label }}</strong><p>{{ activeMeta.desc }}</p></div>
        </article>
      </div>
    </section>

    <section v-show="workMode === 'batch'" class="batch-workspace">
      <div class="batch-layout">
        <article class="batch-input-card">
          <header class="section-header">
            <div><span>BATCH INPUT</span><h3>粘贴坐标清单</h3><p>支持逗号、制表符或空格；可在坐标前添加地点名称。</p></div>
          </header>
          <label class="select-label"><span>输入坐标系</span>
            <el-select v-model="batchSource" class="w-full">
              <el-option v-for="item in systemMeta" :key="item.key" :label="`${item.label} · ${item.primaryLabel}/${item.secondaryLabel}`" :value="item.key" />
            </el-select>
          </label>
          <label class="batch-editor"><span>每行一个坐标</span><el-input v-model="batchInput" type="textarea" :rows="12" resize="vertical" placeholder="名称,经度,纬度&#10;天安门,116.397428,39.909230" /></label>
          <div class="format-hint"><strong>可直接粘贴 Excel / WPS</strong><p>表头会自动忽略，以 # 开头的行视为注释，单次最多处理 500 个坐标点。</p></div>
          <div class="batch-actions"><button class="primary" :disabled="!batchInput.trim()" @click="runBatchConversion">开始批量转换</button><button @click="clearBatch">清空</button></div>
        </article>

        <article class="batch-result-card">
          <header class="section-header result-header">
            <div><span>CONVERSION RESULT</span><h3>转换结果</h3><p>{{ batchResults.length ? `已生成 ${batchResults.length} 个坐标点的五系对照` : '转换后可查看结果并导出完整 CSV。' }}</p></div>
            <button class="export-button" :disabled="!batchResults.length" @click="downloadBatchCsv">导出 CSV</button>
          </header>
          <div v-if="batchErrors.length" class="batch-errors"><strong>{{ batchErrors.length }} 行未转换</strong><p v-for="error in batchErrors.slice(0, 4)" :key="error.line">第 {{ error.line }} 行：{{ error.message }}</p><small v-if="batchErrors.length > 4">另有 {{ batchErrors.length - 4 }} 条错误，可修改后重新转换。</small></div>
          <div v-if="batchResults.length" class="result-table-wrap">
            <table class="result-table">
              <thead><tr><th>名称</th><th>WGS84</th><th>GCJ-02</th><th>BD-09</th><th>Web Mercator</th><th></th></tr></thead>
              <tbody>
                <tr v-for="result in batchResults" :key="`${result.line}-${result.label}`">
                  <td><strong>{{ result.label }}</strong><span>第 {{ result.line }} 行</span></td>
                  <td>{{ formatCoordinateValue('wgs84', result.coordinates.wgs84.lng) }}<br>{{ formatCoordinateValue('wgs84', result.coordinates.wgs84.lat) }}</td>
                  <td>{{ formatCoordinateValue('gcj02', result.coordinates.gcj02.lng) }}<br>{{ formatCoordinateValue('gcj02', result.coordinates.gcj02.lat) }}</td>
                  <td>{{ formatCoordinateValue('bd09', result.coordinates.bd09.lng) }}<br>{{ formatCoordinateValue('bd09', result.coordinates.bd09.lat) }}</td>
                  <td>{{ formatCoordinateValue('mercator', result.coordinates.mercator.x) }}<br>{{ formatCoordinateValue('mercator', result.coordinates.mercator.y) }}</td>
                  <td><button @click="locateBatchResult(result)">在地图查看</button></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="result-empty"><span>批</span><strong>等待坐标清单</strong><p>左侧示例可以直接转换，也可以粘贴自己的数据。</p></div>
        </article>
      </div>
    </section>

    <div class="precision-note"><span>准</span><div><strong>坐标精度说明</strong><p>WGS84、GCJ-02、BD-09 和 Web Mercator 适合常见互联网地图场景；CGCS2000 在本工具中按 WGS84 近似处理，不作为测绘级成果。</p></div></div>

    <ToolGuide title="使用说明">
      <div class="detail-copy">
        <p>单点模式支持编辑任意坐标系、地图点击和标记拖拽；“复制全部”会生成便于粘贴到表格的制表符文本。</p>
        <p>批量模式支持“名称 + 两列坐标”，也接受只有两列坐标的内容；转换结果包含全部五种坐标系并可导出 UTF-8 CSV。</p>
        <p>Web Mercator 使用 X、Y 投影坐标，单位为米。地图瓦片使用 GCJ-02，因此单点地图始终以 GCJ-02 结果定位。</p>
      </div>
    </ToolGuide>
  </div>
</template>

<style scoped>
.coord-tool{--blue:#3478f6;--ink:#263247;--muted:#64748b}.single-workspace,.batch-workspace,.precision-note{border:1px solid #dce6f2;background:#fff;border-radius:24px;box-shadow:0 12px 32px rgba(51,65,85,.06)}.section-header span{font-size:12px;font-weight:800;letter-spacing:.14em;color:#5277a6}.section-header p{margin:0;font-size:14px;line-height:1.7;color:var(--muted)}.hero-metrics{display:grid;grid-template-columns:repeat(3,minmax(96px,1fr));min-width:320px;overflow:hidden;border:1px solid #e0e9f4;border-radius:18px;background:rgba(255,255,255,.78)}.hero-metrics div{padding:12px 14px;text-align:center;border-left:1px solid #e5edf6}.hero-metrics div:first-child{border-left:0}.hero-metrics span,.hero-metrics strong{display:block}.hero-metrics span{margin-top:4px;color:#7a899c;font-size:12px}.hero-metrics strong{overflow:hidden;color:#334155;font-size:18px;text-overflow:ellipsis;white-space:nowrap}.map-footer span,.source-note span{display:block;font-size:12px;color:#7b8ba1}.mode-tabs{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:14px 0}.mode-tabs button{display:flex;align-items:center;gap:12px;padding:14px 18px;text-align:left;border:1px solid #dbe5ef;border-radius:17px;background:#fff;color:var(--ink);transition:.2s}.mode-tabs button.active{border-color:#7eb0fb;background:#f2f8ff;box-shadow:0 0 0 3px rgba(52,120,246,.08)}.tab-icon{display:grid;place-items:center;width:38px;height:38px;border-radius:12px;background:#edf3fa;color:#3971b7;font-weight:800}.mode-tabs strong,.mode-tabs small{display:block}.mode-tabs strong{font-size:15px}.mode-tabs small{margin-top:3px;font-size:12px;color:#7a899d}.single-workspace,.batch-workspace{padding:18px}.status-strip{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:14px 16px;border:1px solid #d9e9ff;border-radius:16px;background:#f4f9ff}.status-strip>div:first-child{display:flex;align-items:flex-start;gap:10px}.status-dot{width:9px;height:9px;margin-top:6px;border-radius:50%;background:#35b87f;box-shadow:0 0 0 5px rgba(53,184,127,.12)}.status-strip strong{font-size:14px;color:var(--ink)}.status-strip p{margin:3px 0 0;font-size:13px;color:var(--muted)}.status-actions,.batch-actions{display:flex;gap:8px;flex-wrap:wrap}.status-actions button,.batch-actions button,.export-button{padding:9px 13px;border:1px solid #cfdbe8;border-radius:10px;background:#fff;font-size:13px;color:#42516a}.status-actions button:hover,.batch-actions button:hover{border-color:#78a9f4}.status-actions .muted{color:#8794a7}.single-layout,.batch-layout{display:grid;grid-template-columns:minmax(0,1.12fr) minmax(420px,.88fr);gap:16px;margin-top:16px}.map-card,.converter-card,.batch-input-card,.batch-result-card{min-width:0;border:1px solid #e0e8f1;border-radius:20px;background:#fbfdff;padding:18px}.section-header{display:flex;justify-content:space-between;gap:14px}.section-header h3{margin:4px 0;font-size:19px;color:var(--ink)}.system-badge{align-self:flex-start;padding:7px 10px;border-radius:999px;background:#ebf4ff!important;color:#3972b7!important;letter-spacing:0!important}.quick-locations{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:16px 0 10px}.quick-locations span{font-size:13px;color:#718096}.quick-locations button{padding:6px 11px;border:1px solid #d8e2ed;border-radius:999px;background:white;font-size:13px;color:#536176}.map-stage{overflow:hidden;border:1px solid #dbe4ee;border-radius:17px;background:#edf2f7}.map-container,.map-offline{height:560px}.map-offline{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;border:1px dashed #cbd7e5;border-radius:17px;background:#f3f6fa}.map-offline>span,.result-empty>span{display:grid;place-items:center;width:52px;height:52px;border-radius:16px;background:#e8eff7;color:#607b9c;font-weight:800}.map-offline strong,.result-empty strong{margin-top:12px;font-size:16px;color:var(--ink)}.map-offline p,.result-empty p{font-size:13px;color:var(--muted)}.map-footer{display:flex;justify-content:space-between;gap:14px;margin-top:12px;padding:13px;border-radius:14px;background:#f0f6fc}.map-footer strong{font-size:16px;color:#2f6fba}.map-footer p{margin:0;max-width:55%;font-size:12px;line-height:1.6;color:#718096}.system-list{display:grid;gap:10px;margin-top:15px}.system-card{padding:13px;border:1px solid #dfe7f0;border-radius:15px;background:#fff;transition:.2s}.system-card.active{border-color:#80aff7;background:#f6faff;box-shadow:0 0 0 3px rgba(52,120,246,.06)}.system-heading{display:flex;justify-content:space-between;gap:10px}.system-name{display:flex;align-items:flex-start;gap:9px;min-width:0;text-align:left}.system-name>span{padding:5px 7px;border-radius:8px;background:#edf3fa;font-size:11px;color:#55708e}.system-name strong,.system-name small{display:block}.system-name strong{font-size:14px;color:var(--ink)}.system-name small{overflow:hidden;margin-top:2px;max-width:280px;font-size:12px;color:#7b899d;text-overflow:ellipsis;white-space:nowrap}.copy-button{padding:5px 9px;border:0;border-radius:8px;background:#edf4ff;font-size:12px;color:#3c72b5}.coordinate-fields{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:10px}.coordinate-fields label>span,.select-label>span,.batch-editor>span{display:block;margin-bottom:5px;font-size:12px;font-weight:600;color:#6c7b8f}.helper-text{margin:7px 0 0;font-size:12px;color:#8a97a8}.error-card,.batch-errors{margin-top:12px;padding:12px;border:1px solid #fed7aa;border-radius:13px;background:#fff7ed;font-size:13px;color:#9a5b18}.source-note{margin-top:12px;padding:13px;border-radius:14px;background:#eef5fc}.source-note strong{display:block;margin-top:2px;font-size:14px;color:var(--ink)}.source-note p{margin:3px 0 0;font-size:12px;color:var(--muted)}.batch-workspace{min-height:590px}.batch-layout{grid-template-columns:minmax(340px,.7fr) minmax(0,1.3fr);margin-top:0}.select-label,.batch-editor{display:block;margin-top:16px}.format-hint{margin:12px 0;padding:13px;border:1px solid #dbe8f7;border-radius:13px;background:#f1f7fd}.format-hint strong{font-size:13px;color:#3e5d7e}.format-hint p{margin:4px 0 0;font-size:12px;line-height:1.6;color:#6c7d91}.batch-actions .primary,.export-button{border-color:#3478f6;background:#3478f6;color:#fff}.batch-actions button{padding:10px 15px}.result-header{align-items:center}.export-button:disabled,.batch-actions button:disabled{opacity:.45;cursor:not-allowed}.batch-errors strong{display:block}.batch-errors p{margin:4px 0}.batch-errors small{font-size:12px}.result-table-wrap{overflow:auto;max-height:540px;margin-top:14px;border:1px solid #e1e8f0;border-radius:14px}.result-table{width:100%;min-width:820px;border-collapse:collapse;font-size:12px}.result-table th{position:sticky;top:0;z-index:1;padding:11px;background:#edf4fb;color:#63748a;text-align:left}.result-table td{padding:11px;border-top:1px solid #e8edf3;color:#425168;line-height:1.7;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.result-table td:first-child{font-family:inherit}.result-table td strong,.result-table td span{display:block}.result-table td span{font-size:11px;color:#8b98a9}.result-table td button{padding:6px 9px;border:1px solid #bdd3f1;border-radius:8px;background:#f2f7fd;color:#376da9;white-space:nowrap}.result-empty{display:flex;min-height:410px;flex-direction:column;align-items:center;justify-content:center;text-align:center}.precision-note{display:flex;align-items:flex-start;gap:12px;margin-top:14px;padding:16px 18px}.precision-note>span{display:grid;place-items:center;flex:0 0 38px;height:38px;border-radius:11px;background:#fff1d9;color:#b56a11;font-weight:800}.precision-note strong{font-size:14px;color:var(--ink)}.precision-note p{margin:4px 0 0;font-size:13px;line-height:1.7;color:var(--muted)}.detail-copy{font-size:14px;line-height:1.9;color:#64748b}.detail-copy p{margin:0 0 8px}.dark .single-workspace,.dark .batch-workspace,.dark .precision-note{border-color:#334155;background:#172033}.dark .hero-metrics strong,.dark .section-header h3,.dark .status-strip strong,.dark .system-name strong,.dark .source-note strong,.dark .map-offline strong,.dark .result-empty strong,.dark .precision-note strong{color:#e7edf6}.dark .section-header p,.dark .status-strip p{color:#a7b4c6}.dark .hero-metrics{border-color:#40506a;background:rgba(15,23,42,.5)}.dark .hero-metrics div{border-color:#40506a}.dark .hero-metrics span{color:#a8b4c5}.dark .mode-tabs button,.dark .status-actions button,.dark .quick-locations button{border-color:#38475c;background:#172033;color:#d4deeb}.dark .mode-tabs button.active{border-color:#467fc7;background:#172c44}.dark .single-workspace .status-strip{border-color:#294e71;background:#152c42}.dark .map-card,.dark .converter-card,.dark .batch-input-card,.dark .batch-result-card{border-color:#334155;background:#111b2c}.dark .map-stage,.dark .system-card,.dark .result-table-wrap{border-color:#334155;background:#172033}.dark .system-card.active{border-color:#467fc7;background:#172a41}.dark .source-note,.dark .map-footer,.dark .format-hint{background:#172a3d}.dark .system-name>span{background:#26364b}.dark .result-table th{background:#213047;color:#a9b6c7}.dark .result-table td{border-color:#2c3b50;color:#c4cfdd}.dark .result-table td button{border-color:#3b608b;background:#1a304a;color:#9fc7f4}.dark .map-offline,.dark .result-empty{border-color:#3a495e;background:#111a2a}.dark .precision-note>span{background:#3b2d19}.dark .detail-copy{color:#aab7c8}@media(max-width:1100px){.single-layout,.batch-layout{grid-template-columns:1fr}.map-container,.map-offline{height:430px}}@media(max-width:640px){.hero-metrics{grid-template-columns:1fr}.hero-metrics div{border-left:0;border-bottom:1px solid #e5edf6}.hero-metrics div:last-child{border-bottom:0}.mode-tabs{grid-template-columns:1fr}.single-workspace,.batch-workspace{padding:12px}.status-strip,.map-footer{align-items:flex-start;flex-direction:column}.status-actions{width:100%}.status-actions button{flex:1}.map-card,.converter-card,.batch-input-card,.batch-result-card{padding:14px}.coordinate-fields{grid-template-columns:1fr}.map-container,.map-offline{height:330px}.system-name small{max-width:190px}.map-footer p{max-width:none}.result-header{align-items:flex-start;flex-direction:column}.export-button{width:100%}.precision-note{border-radius:18px}}
.system-name>span,.result-table td span{font-size:12px}
</style>
