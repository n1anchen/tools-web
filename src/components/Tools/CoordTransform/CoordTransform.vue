<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue'
import type { Map as LMap, Marker as LMarker } from 'leaflet'
import { CopyDocument, RefreshRight } from '@element-plus/icons-vue'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { copy } from '@/utils/string'
import {
  buildCoordinateSet,
  formatCoordinateValue,
  fromCoordinatePair,
  isMercatorSystem,
  toCoordinatePair,
  validateCoordinate,
  type AnyCoordinate,
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

const title = '地图坐标系互转'
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

let mapInstance: LMap | null = null
let markerInstance: LMarker | null = null
let leafletModule: (typeof import('leaflet'))['default'] | null = null

const activeMeta = computed(() => systemMeta.find(item => item.key === activeSystem.value) ?? systemMeta[2])
const lastSourceMeta = computed(() => systemMeta.find(item => item.key === state.lastSource) ?? systemMeta[2])
const currentGcjPoint = computed(() => state.current?.gcj02 ?? null)
const summaryText = computed(() => {
  if (!state.current) return '点击地图或编辑右侧任意坐标，系统会自动完成五种坐标系换算。'
  const current = state.current[state.lastSource]
  const pair = getFormattedPair(state.lastSource, current)
  return `最近以 ${lastSourceMeta.value.label} 为基准完成同步，当前 ${lastSourceMeta.value.primaryLabel} ${pair.primary}，${lastSourceMeta.value.secondaryLabel} ${pair.secondary}。`
})

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
    leafletModule = (await import('leaflet')).default
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
  <div class="flex flex-col mt-3 flex-1">
    <DetailHeader :title="title" />

    <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div class="flex flex-col gap-4 lg:flex-row">
        <div class="w-full lg:w-[56%]">
          <div class="flex items-center justify-between gap-3 mb-3">
            <div>
              <h3 class="text-base font-semibold text-slate-800 dark:text-slate-100">地图选点</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">地图使用高德瓦片，点击地图或拖拽标记即可更新右侧坐标。</p>
            </div>
            <el-tag type="info" effect="plain">地图显示采用 GCJ-02</el-tag>
          </div>

          <div v-if="state.isOnline" class="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60">
            <div ref="mapContainerRef" class="h-[320px] w-full sm:h-[380px] lg:h-[460px]"></div>
          </div>

          <div
            v-else
            class="flex h-[320px] sm:h-[380px] lg:h-[460px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center dark:border-slate-600 dark:bg-slate-900/50"
          >
            <p class="text-base font-medium text-slate-700 dark:text-slate-200">当前网络不可用</p>
            <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">恢复网络后会自动加载地图。你仍然可以先在右侧输入坐标完成转换。</p>
          </div>
        </div>

        <div class="w-full lg:w-[44%]">
          <div class="mb-4 rounded-2xl border border-blue-100 bg-blue-50/80 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p class="text-sm font-semibold text-blue-700 dark:text-blue-300">当前同步状态</p>
                <p class="mt-1 text-xs leading-6 text-slate-600 dark:text-slate-300">{{ summaryText }}</p>
              </div>
              <div class="flex gap-2">
                <el-button :icon="RefreshRight" @click="clearCoordinates">清空</el-button>
              </div>
            </div>
          </div>

          <div class="space-y-3">
            <div
              v-for="item in systemMeta"
              :key="item.key"
              class="rounded-2xl border p-4 transition-colors"
              :class="activeSystem === item.key
                ? 'border-blue-300 bg-blue-50/70 dark:border-blue-700 dark:bg-blue-950/20'
                : 'border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/40'"
            >
              <div class="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div class="flex items-center gap-2">
                    <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100">{{ item.label }}</h3>
                    <el-tag size="small" effect="plain">{{ item.tag }}</el-tag>
                  </div>
                  <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ item.desc }}</p>
                  <p v-if="item.helper" class="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{{ item.helper }}</p>
                </div>
                <el-button :icon="CopyDocument" circle @click="copyPair(item.key)" />
              </div>

              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label class="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{{ item.primaryLabel }}</label>
                  <el-input
                    v-model="state.forms[item.key].primary"
                    :placeholder="item.primaryPlaceholder"
                    @focus="activeSystem = item.key"
                    @input="updateFromInputs(item.key)"
                  />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{{ item.secondaryLabel }}</label>
                  <el-input
                    v-model="state.forms[item.key].secondary"
                    :placeholder="item.secondaryPlaceholder"
                    @focus="activeSystem = item.key"
                    @input="updateFromInputs(item.key)"
                  />
                </div>
              </div>
            </div>
          </div>

          <el-alert
            v-if="state.error"
            class="mt-4"
            type="warning"
            :closable="false"
            show-icon
            :title="state.error"
          />

          <div class="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/40">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">当前基准坐标系</p>
                <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ activeMeta.label }}：{{ activeMeta.desc }}</p>
              </div>
              <el-tag type="success" effect="plain">自动联动</el-tag>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ToolDetail title="使用说明">
      <div class="space-y-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
        <p>支持 WGS84、CGCS2000、GCJ-02、BD-09、Web Mercator 五种常见坐标系互转。你可以直接编辑任意一组坐标，其余四组会自动同步。</p>
        <p>地图区域使用 GCJ-02 显示，点击地图或拖拽标记后会立即回填全部坐标。</p>
        <p>Web Mercator 使用 X、Y 投影坐标，单位为米。</p>
        <p><b>CGCS2000 在本工具中按互联网地图场景进行近似处理，不作为测绘级严谨转换结果。</b></p>
        <p>复制按钮会将对应坐标系的经纬度/XY 以逗号分隔的形式复制到剪贴板，方便粘贴到其他工具或接口中使用。</p>
      </div>
    </ToolDetail>
  </div>
</template>