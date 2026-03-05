<script setup lang="ts">
import { ref, reactive, computed, onUnmounted, nextTick } from 'vue'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import exifr from 'exifr'
import type { Map as LMap } from 'leaflet'

const title = '图片 EXIF 查看'

// ──────────────────────────────────────────────
// 网络状态
// ──────────────────────────────────────────────
const isOnline = ref(navigator.onLine)
const onlineHandler = () => (isOnline.value = true)
const offlineHandler = () => (isOnline.value = false)
window.addEventListener('online', onlineHandler)
window.addEventListener('offline', offlineHandler)

// ──────────────────────────────────────────────
// 状态
// ──────────────────────────────────────────────
const isDragging = ref(false)
const isLoading = ref(false)
const imageUrl = ref('')
const fileName = ref('')
const fileSize = ref(0)
const imageWidth = ref(0)
const imageHeight = ref(0)

// EXIF 段中记录的像素尺寸（与 Image.naturalWidth 可能不同，优先展示）
const exifDimW = ref<number | null>(null)
const exifDimH = ref<number | null>(null)
// 最终展示的尺寸来源
const dimSource = ref<'exif' | 'file' | 'pending'>('pending')

// 预览区快捷信息面板
interface QuickInfoItem { label: string; value: string; fromFile?: boolean }
const quickInfo = ref<QuickInfoItem[]>([])

interface ExifGroup {
  label: string
  key: string
  data: { label: string; value: string }[]
}

const exifGroups = ref<ExifGroup[]>([])
const gpsInfo = reactive<{
  lat: number | null
  lon: number | null
  latDMS: string
  lonDMS: string
  altitude: string
  gcjLat: number | null
  gcjLon: number | null
}>({ lat: null, lon: null, latDMS: '', lonDMS: '', altitude: '', gcjLat: null, gcjLon: null })

const hasExif = ref(false)
const hasGps = computed(() => gpsInfo.lat !== null && gpsInfo.lon !== null)
const orientation = ref(1) // 规范化后的 EXIF Orientation 值 (1-8)
const noExifMsg = ref('')
const activeCollapse = ref(['basic', 'shoot', 'device', 'gps'])

// 原始文件引用，用于 canvas 下载
const originalFile = ref<File | null>(null)

// ──────────────────────────────────────────────
// 工具：Orientation → CSS rotate
// ──────────────────────────────────────────────

/**
 * exifr 开启 translateValues 后 Orientation 会返回英文字符串，
 * 此函数将数字或英文字符串统一规范化为 1-8 的数字。
 */
function normalizeOrientation(raw: unknown): number {
  if (typeof raw === 'number') return raw
  if (typeof raw === 'string') {
    // exifr translateValues 输出的英文字符串映射
    const strMap: Record<string, number> = {
      'Horizontal (normal)': 1,
      'Mirror horizontal': 2,
      'Rotate 180': 3,
      'Mirror vertical': 4,
      'Mirror horizontal and rotate 270 CW': 5,
      'Rotate 90 CW': 6,
      'Mirror horizontal and rotate 90 CW': 7,
      'Rotate 270 CW': 8,
    }
    return strMap[raw] ?? 1
  }
  return 1
}

const orientationStyle = computed(() => {
  const map: Record<number, string> = {
    1: '',
    2: 'scaleX(-1)',
    3: 'rotate(180deg)',
    4: 'scaleY(-1)',
    5: 'rotate(90deg) scaleX(-1)',
    6: 'rotate(90deg)',
    7: 'rotate(-90deg) scaleX(-1)',
    8: 'rotate(-90deg)',
  }
  return map[orientation.value] || ''
})

const orientationLabel = computed(() => {
  const map: Record<number, string> = {
    1: '正常',
    2: '水平翻转',
    3: '旋转 180°',
    4: '垂直翻转',
    5: '顺时针 90° + 水平翻转',
    6: '顺时针旋转 90°',
    7: '逆时针 90° + 水平翻转',
    8: '逆时针旋转 90°',
  }
  return map[orientation.value] ?? '未知方向'
})

// ──────────────────────────────────────────────
// 坐标系转换：WGS84 → GCJ-02（火星坐标系）
// GPS EXIF 存储 WGS84，高德地图瓦片/API 使用 GCJ-02
// 直接叠加会产生 100-700 m 偏移，此处做标准转换
// ──────────────────────────────────────────────
const _GCJ_A = 6378245.0
const _GCJ_EE = 0.00669342162296594323

function _gcjTransformLat(x: number, y: number): number {
  let r = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
  r += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0
  r += (20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin(y / 3.0 * Math.PI)) * 2.0 / 3.0
  r += (160.0 * Math.sin(y / 12.0 * Math.PI) + 320.0 * Math.sin(y * Math.PI / 30.0)) * 2.0 / 3.0
  return r
}

function _gcjTransformLon(x: number, y: number): number {
  let r = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
  r += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0
  r += (20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin(x / 3.0 * Math.PI)) * 2.0 / 3.0
  r += (150.0 * Math.sin(x / 12.0 * Math.PI) + 300.0 * Math.sin(x / 30.0 * Math.PI)) * 2.0 / 3.0
  return r
}

/** 是否在中国大陆范围外（范围外坐标无需偏移） */
function _gcjOutOfChina(lat: number, lon: number): boolean {
  return lon < 72.004 || lon > 137.8347 || lat < 0.8293 || lat > 55.8271
}

/** WGS84（GPS 原始）→ GCJ-02（火星坐标，高德地图使用） */
function wgs84ToGcj02(lat: number, lon: number): [number, number] {
  if (_gcjOutOfChina(lat, lon)) return [lat, lon]
  let dLat = _gcjTransformLat(lon - 105.0, lat - 35.0)
  let dLon = _gcjTransformLon(lon - 105.0, lat - 35.0)
  const radLat = lat / 180.0 * Math.PI
  let magic = Math.sin(radLat)
  magic = 1 - _GCJ_EE * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  dLat = (dLat * 180.0) / ((_GCJ_A * (1 - _GCJ_EE)) / (magic * sqrtMagic) * Math.PI)
  dLon = (dLon * 180.0) / (_GCJ_A / sqrtMagic * Math.cos(radLat) * Math.PI)
  return [lat + dLat, lon + dLon]
}

// ──────────────────────────────────────────────
// DMS 格式化
// ──────────────────────────────────────────────
function toDMS(decimal: number, isLat: boolean): string {
  const abs = Math.abs(decimal)
  const deg = Math.floor(abs)
  const minFull = (abs - deg) * 60
  const min = Math.floor(minFull)
  const sec = ((minFull - min) * 60).toFixed(2)
  const dir = isLat ? (decimal >= 0 ? 'N' : 'S') : (decimal >= 0 ? 'E' : 'W')
  return `${deg}° ${min}' ${sec}" ${dir}`
}

// ──────────────────────────────────────────────
// 格式化工具
// ──────────────────────────────────────────────
function formatShutter(val: number | undefined): string {
  if (val == null) return '-'
  if (val >= 1) return `${val}s`
  return `1/${Math.round(1 / val)}s`
}

function formatAperture(val: number | undefined): string {
  if (val == null) return '-'
  return `f/${val.toFixed(1)}`
}

function formatExposureBias(val: number | undefined): string {
  if (val == null) return '-'
  const s = val >= 0 ? `+${val}` : `${val}`
  return `${s} EV`
}

function formatDate(val: Date | string | undefined): string {
  if (!val) return '-'
  if (val instanceof Date) return val.toLocaleString('zh-CN')
  return String(val)
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatMimeType(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'JPEG', 'image/jpg': 'JPEG', 'image/png': 'PNG',
    'image/gif': 'GIF', 'image/webp': 'WebP', 'image/tiff': 'TIFF',
    'image/heic': 'HEIC', 'image/heif': 'HEIF', 'image/bmp': 'BMP',
    'image/avif': 'AVIF', 'image/svg+xml': 'SVG', 'image/x-canon-cr2': 'CR2',
    'image/x-nikon-nef': 'NEF', 'image/x-adobe-dng': 'DNG',
  }
  return map[mime.toLowerCase()] ?? (mime.split('/')[1]?.toUpperCase() || '-')
}

function formatResUnit(unit: number | string | undefined): string {
  if (unit === 2 || unit === 'inches') return ' dpi'
  if (unit === 3 || unit === 'cm') return ' dpcm'
  return ''
}

function formatYCbCr(val: unknown): string {
  if (!val) return ''
  if (Array.isArray(val)) {
    const [h, v] = val as number[]
    if (h === 1 && v === 1) return 'YCbCr 4:4:4'
    if (h === 2 && v === 1) return 'YCbCr 4:2:2'
    if (h === 2 && v === 2) return 'YCbCr 4:2:0'
    if (h === 4 && v === 1) return 'YCbCr 4:1:1'
    return `YCbCr ${h}:${v}`
  }
  return String(val)
}

function formatColorProfile(val: string | undefined): string {
  if (!val) return ''
  // 常见 ICC profile 缩写映射
  const map: Record<string, string> = {
    'sRGB': 'sRGB', 'Display P3': 'Display P3', 'Adobe RGB (1998)': 'Adobe RGB',
    'ProPhoto RGB': 'ProPhoto RGB', 'DCI-P3': 'DCI-P3',
  }
  return map[val] ?? val
}

// ──────────────────────────────────────────────
// 解析 EXIF
// ──────────────────────────────────────────────
async function parseExif(file: File) {
  isLoading.value = true
  hasExif.value = false
  noExifMsg.value = ''
  exifGroups.value = []
  gpsInfo.lat = null
  gpsInfo.lon = null
  gpsInfo.latDMS = ''
  gpsInfo.lonDMS = ''
  gpsInfo.altitude = ''
  gpsInfo.gcjLat = null
  gpsInfo.gcjLon = null
  exifDimW.value = null
  exifDimH.value = null
  dimSource.value = 'pending'
  quickInfo.value = []

  try {
    // 读取全部 IFD 段
    const data = await exifr.parse(file, {
      tiff: true,
      exif: true,
      gps: true,
      iptc: true,
      jfif: true,
      xmp: true,
      translateValues: true,
      translateKeys: true,
      reviveValues: true,
      sanitize: true,
      mergeOutput: false,
    } as Parameters<typeof exifr.parse>[1])

    if (!data) {
      noExifMsg.value = '该图片不包含 EXIF 信息（常见于截图、网络图片等）'
      isLoading.value = false
      return
    }

    hasExif.value = true

    // 处理方向
    const ifd0 = data.ifd0 || {}
    const exifData = data.exif || {}
    const gpsData = data.gps || {}

    orientation.value = normalizeOrientation(ifd0.Orientation)

    // ── 提取 EXIF 像素尺寸（优先于 Image 元素的渲染尺寸）
    const exifW = exifData.PixelXDimension ?? exifData.ExifImageWidth ?? ifd0.ImageWidth ?? null
    const exifH = exifData.PixelYDimension ?? exifData.ExifImageHeight ?? ifd0.ImageLength ?? ifd0.ImageHeight ?? null
    if (exifW != null && exifH != null && exifW > 0 && exifH > 0) {
      exifDimW.value = Number(exifW)
      exifDimH.value = Number(exifH)
      dimSource.value = 'exif'
    } else {
      // handleFile 已在调用 parseExif 前 await 了图片加载，此时 imageWidth/imageHeight 必然有值
      dimSource.value = imageWidth.value > 0 ? 'file' : 'pending'
    }
    const dispW = exifDimW.value ?? imageWidth.value
    const dispH = exifDimH.value ?? imageHeight.value

    // ── 构建预览区快捷信息面板 ──
    const qi: QuickInfoItem[] = []
    // 格式（来自文件 MIME，fromFile=true 表示非 EXIF 来源，用不同样式区分）
    if (originalFile.value) qi.push({ label: '格式', value: formatMimeType(originalFile.value.type), fromFile: true })
    // 尺寸
    if (dispW > 0 && dispH > 0) qi.push({ label: '尺寸', value: `${dispW} × ${dispH}`, fromFile: dimSource.value === 'file' })
    // DPI / 分辨率
    const xRes = ifd0.XResolution ?? data.jfif?.Xdensity
    const yRes = ifd0.YResolution ?? data.jfif?.Ydensity
    const resUnit = ifd0.ResolutionUnit ?? (data.jfif?.densityUnits === 1 ? 2 : undefined)
    if (xRes != null && yRes != null && Number(xRes) > 1) {
      const unitStr = formatResUnit(resUnit)
      qi.push({ label: '分辨率', value: `${Math.round(Number(xRes))} × ${Math.round(Number(yRes))}${unitStr}` })
    }
    // 色彩空间（EXIF ColorSpace：1=sRGB，65535=未标记）
    const cs = exifData.ColorSpace
    if (cs != null) {
      qi.push({ label: '色彩空间', value: cs === 1 ? 'sRGB' : cs === 65535 ? '未标记' : String(cs) })
    }
    // ICC 颜色配置文件（XMP / IPTC）
    const profile = (data.xmp as any)?.['photoshop:ICCProfile'] ?? (data.xmp as any)?.ICCProfile
    if (profile) qi.push({ label: '颜色配置', value: formatColorProfile(String(profile)) })
    // YCbCr 色度二次采样
    const ycbcr = ifd0.YCbCrSubSampling ?? (data.jfif as any)?.YCbCrSubSampling
    const ycbcrStr = formatYCbCr(ycbcr)
    if (ycbcrStr) qi.push({ label: '色彩编码', value: ycbcrStr })
    // 位深度
    const bps = ifd0.BitsPerSample
    if (bps != null) {
      const bitsStr = Array.isArray(bps) ? `${(bps as number[]).reduce((a: number, b: number) => a + b, 0)} bit` : `${bps} bit`
      qi.push({ label: '位深度', value: bitsStr })
    }
    // 压缩方式
    if (ifd0.Compression) qi.push({ label: '压缩', value: String(ifd0.Compression) })
    // JFIF 版本
    if (data.jfif?.version) {
      const v = data.jfif.version
      qi.push({ label: 'JFIF', value: Array.isArray(v) ? `v${v[0]}.${String(v[1]).padStart(2, '0')}` : String(v) })
    }
    // 像素宽高比
    const par = exifData.PixelAspectRatio
    if (par != null && par !== 1) qi.push({ label: '像素宽高比', value: String(par) })
    // 颜色分量
    const spp = ifd0.SamplesPerPixel
    if (spp != null) qi.push({ label: '颜色分量', value: `${spp} 通道` })
    quickInfo.value = qi

    // ── 基本信息组 ──
    const basicRows: { label: string; value: string }[] = [
      { label: '文件名', value: fileName.value },
      { label: '文件大小', value: formatFileSize(fileSize.value) },
      { label: dimSource.value === 'file' ? '图片尺寸（文件）' : '图片尺寸', value: dispW > 0 && dispH > 0 ? `${dispW} × ${dispH} px` : '-' },
      { label: '色彩空间', value: exifData.ColorSpace != null ? (exifData.ColorSpace === 1 ? 'sRGB' : exifData.ColorSpace === 65535 ? '未标记(非sRGB)' : String(exifData.ColorSpace)) : (ifd0.ColorSpace ?? '-') },
      { label: '图片方向', value: orientationLabel.value },
      { label: '拍摄时间', value: formatDate(exifData.DateTimeOriginal ?? ifd0.DateTime) },
      { label: '修改时间', value: formatDate(ifd0.DateTime) },
    ]

    // ── 拍摄参数组 ──
    const shootRows: { label: string; value: string }[] = [
      { label: '快门速度', value: formatShutter(exifData.ExposureTime) },
      { label: '光圈', value: formatAperture(exifData.FNumber) },
      { label: 'ISO', value: exifData.ISO != null ? String(exifData.ISO) : '-' },
      { label: '焦距', value: exifData.FocalLength != null ? `${exifData.FocalLength} mm` : '-' },
      { label: '等效焦距(35mm)', value: exifData.FocalLengthIn35mmFormat != null ? `${exifData.FocalLengthIn35mmFormat} mm` : '-' },
      { label: '曝光补偿', value: formatExposureBias(exifData.ExposureBiasValue) },
      { label: '曝光模式', value: exifData.ExposureMode ?? '-' },
      { label: '曝光程序', value: exifData.ExposureProgram ?? '-' },
      { label: '测光模式', value: exifData.MeteringMode ?? '-' },
      { label: '白平衡', value: exifData.WhiteBalance ?? '-' },
      { label: '闪光灯', value: exifData.Flash ?? '-' },
      { label: '场景类型', value: exifData.SceneCaptureType ?? '-' },
      { label: '数字变焦', value: exifData.DigitalZoomRatio != null ? `×${exifData.DigitalZoomRatio}` : '-' },
      { label: '亮度值', value: exifData.BrightnessValue != null ? exifData.BrightnessValue.toFixed(2) : '-' },
      { label: '最大光圈', value: exifData.MaxApertureValue != null ? `f/${Math.pow(Math.SQRT2, exifData.MaxApertureValue).toFixed(1)}` : '-' },
      { label: '对焦距离', value: exifData.SubjectDistance != null ? `${exifData.SubjectDistance} m` : '-' },
    ]

    // ── 设备信息组 ──
    const deviceRows: { label: string; value: string }[] = [
      { label: '相机厂商', value: ifd0.Make ?? '-' },
      { label: '相机型号', value: ifd0.Model ?? '-' },
      { label: '镜头厂商', value: exifData.LensMake ?? '-' },
      { label: '镜头型号', value: exifData.LensModel ?? exifData.LensInfo ?? '-' },
      { label: '软件', value: ifd0.Software ?? '-' },
      { label: '版权', value: ifd0.Copyright ?? '-' },
      { label: '作者', value: ifd0.Artist ?? data.iptc?.By_line ?? '-' },
      { label: 'EXIF 版本', value: exifData.ExifVersion ?? '-' },
    ]

    // ── GPS 组 ──
    if (gpsData.latitude != null && gpsData.longitude != null) {
      gpsInfo.lat = gpsData.latitude
      gpsInfo.lon = gpsData.longitude
      gpsInfo.latDMS = toDMS(gpsData.latitude, true)
      gpsInfo.lonDMS = toDMS(gpsData.longitude, false)
      gpsInfo.altitude = gpsData.Altitude != null ? `${gpsData.Altitude.toFixed(1)} m` : '-'
      // 转换为 GCJ-02 供地图及高德外链使用
      const [gcjLat, gcjLon] = wgs84ToGcj02(gpsData.latitude, gpsData.longitude)
      gpsInfo.gcjLat = gcjLat
      gpsInfo.gcjLon = gcjLon
    }

    exifGroups.value = [
      { label: '基本信息', key: 'basic', data: basicRows.filter(r => r.value !== '-') },
      { label: '拍摄参数', key: 'shoot', data: shootRows.filter(r => r.value !== '-') },
      { label: '设备信息', key: 'device', data: deviceRows.filter(r => r.value !== '-') },
    ]
  } catch (e) {
    noExifMsg.value = 'EXIF 解析失败，该格式可能不受支持'
    console.error(e)
  }

  isLoading.value = false

  if (hasGps.value) {
    await nextTick()
    initMap()
  }
}

// ──────────────────────────────────────────────
// Leaflet 地图
// ──────────────────────────────────────────────
let mapInstance: LMap | null = null
const mapContainerRef = ref<HTMLElement | null>(null)

async function initMap() {
  if (!hasGps.value || !isOnline.value) return
  if (!mapContainerRef.value) return

  // 延迟导入 leaflet，避免 SSR 问题
  const L = (await import('leaflet')).default
  await import('leaflet/dist/leaflet.css')

  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }

  // 地图使用 GCJ-02（火星坐标）定位，与高德瓦片坐标系一致
  const lat = gpsInfo.gcjLat ?? gpsInfo.lat!
  const lon = gpsInfo.gcjLon ?? gpsInfo.lon!

  mapInstance = L.map(mapContainerRef.value, { zoomControl: true }).setView([lat, lon], 15)

  L.tileLayer(
    'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
    {
      subdomains: ['1', '2', '3', '4'],
      maxZoom: 18,
      attribution: '© 高德地图',
    }
  ).addTo(mapInstance)

  // 自定义标记图标（避免默认图标路径问题）
  const icon = L.divIcon({
    className: '',
    html: `<div style="
      width:28px;height:36px;
      background:linear-gradient(180deg,#3b82f6 60%,transparent 100%);
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:2px solid #1d4ed8;
      box-shadow:0 2px 8px rgba(59,130,246,0.5);
    "></div>`,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
  })

  L.marker([lat, lon], { icon })
    .addTo(mapInstance)
    .bindPopup(`<b>拍摄位置</b><br><span style="font-size:11px;color:#888">WGS84</span> ${gpsInfo.latDMS}<br><span style="font-size:11px;color:#888">WGS84</span> ${gpsInfo.lonDMS}`)
    .openPopup()
}

// ──────────────────────────────────────────────
// 文件处理
// ──────────────────────────────────────────────
function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.[0]) handleFile(input.files[0])
  input.value = ''
}

async function handleFile(file: File) {
  if (!file.type.startsWith('image/')) return
  originalFile.value = file
  fileName.value = file.name
  fileSize.value = file.size

  // 先释放旧 URL
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
  const url = URL.createObjectURL(file)
  imageUrl.value = url
  imageWidth.value = 0
  imageHeight.value = 0

  // ⚠ 等待图片加载完成后再调用 parseExif
  // 否则 parseExif 读取 imageWidth/imageHeight 时仍为 0（竞态条件）
  await new Promise<void>(resolve => {
    const img = new Image()
    img.onload = () => {
      imageWidth.value = img.naturalWidth
      imageHeight.value = img.naturalHeight
      resolve()
    }
    img.onerror = () => resolve() // 加载失败也不阻塞
    img.src = url
  })

  parseExif(file)
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
  isDragging.value = true
}
function onDragLeave() {
  isDragging.value = false
}
function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  const file = e.dataTransfer?.files[0]
  if (file) handleFile(file)
}

// ──────────────────────────────────────────────
// 下载去除 EXIF 的原图（Canvas 重绘）
// ──────────────────────────────────────────────
const isDownloading = ref(false)

async function downloadClean() {
  if (!originalFile.value) return
  isDownloading.value = true
  try {
    const imgEl = document.createElement('img')
    const blobUrl = URL.createObjectURL(originalFile.value)
    await new Promise<void>(resolve => {
      imgEl.onload = () => resolve()
      imgEl.src = blobUrl
    })

    const ori = orientation.value
    const sw = imgEl.naturalWidth
    const sh = imgEl.naturalHeight

    // 旋转是否交换宽高
    const swap = ori >= 5 && ori <= 8
    const canvasW = swap ? sh : sw
    const canvasH = swap ? sw : sh

    const canvas = document.createElement('canvas')
    canvas.width = canvasW
    canvas.height = canvasH
    const ctx = canvas.getContext('2d')!

    ctx.save()
    // 根据 Orientation 进行旋转变换，使导出图片方向正确
    const transforms: Record<number, () => void> = {
      1: () => {},
      2: () => { ctx.translate(sw, 0); ctx.scale(-1, 1) },
      3: () => { ctx.translate(sw, sh); ctx.rotate(Math.PI) },
      4: () => { ctx.translate(0, sh); ctx.scale(1, -1) },
      5: () => { ctx.rotate(0.5 * Math.PI); ctx.scale(1, -1) },
      6: () => { ctx.translate(sh, 0); ctx.rotate(0.5 * Math.PI) },
      7: () => { ctx.translate(sh, sw); ctx.rotate(0.5 * Math.PI); ctx.scale(1, -1) },
      8: () => { ctx.translate(0, sw); ctx.rotate(-0.5 * Math.PI) },
    }
    transforms[ori]?.()
    ctx.drawImage(imgEl, 0, 0)
    ctx.restore()

    URL.revokeObjectURL(blobUrl)

    const mimeType = originalFile.value.type === 'image/png' ? 'image/png' : 'image/jpeg'
    const quality = 0.95
    canvas.toBlob(blob => {
      if (!blob) return
      const a = document.createElement('a')
      const ext = mimeType === 'image/png' ? '.png' : '.jpg'
      a.download = fileName.value.replace(/\.[^.]+$/, '') + '_no_exif' + ext
      a.href = URL.createObjectURL(blob)
      a.click()
      URL.revokeObjectURL(a.href)
      isDownloading.value = false
    }, mimeType, quality)
  } catch (e) {
    console.error(e)
    isDownloading.value = false
  }
}

// ──────────────────────────────────────────────
// 打开高德地图
// ──────────────────────────────────────────────
function openInAmap() {
  if (!hasGps.value) return
  // 高德地图外链使用 GCJ-02 坐标
  const lat = gpsInfo.gcjLat ?? gpsInfo.lat!
  const lon = gpsInfo.gcjLon ?? gpsInfo.lon!
  const url = `https://uri.amap.com/marker?position=${lon},${lat}&name=拍摄位置&coordinate=gaode`
  window.open(url, '_blank')
}

// ──────────────────────────────────────────────
// 清理
// ──────────────────────────────────────────────
onUnmounted(() => {
  window.removeEventListener('online', onlineHandler)
  window.removeEventListener('offline', offlineHandler)
  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
})
</script>

<template>
  <div class="flex flex-col mt-3 flex-1">
    <DetailHeader :title="title" />

    <!-- 主内容 -->
    <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-300">

      <!-- 上传区 -->
      <div
        class="relative flex flex-col items-center justify-center w-full h-36 rounded-xl border-2 border-dashed cursor-pointer transition-all select-none mb-4"
        :class="isDragging
          ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
          : 'border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700/50'"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
        @click="($refs.fileInput as HTMLInputElement).click()"
      >
        <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFileChange" />
        <div class="flex flex-col items-center gap-1 pointer-events-none">
          <svg class="w-10 h-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <span class="text-sm font-medium text-blue-500 dark:text-blue-400">点击或拖拽图片到此处</span>
          <span class="text-xs text-slate-400 dark:text-slate-500">支持 JPEG、HEIC、PNG、TIFF、WEBP 等格式</span>
        </div>
      </div>

      <!-- 加载态 -->
      <div v-if="isLoading" class="flex items-center justify-center py-12 gap-3 text-blue-500">
        <svg class="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        <span class="text-sm">正在解析 EXIF 信息...</span>
      </div>

      <!-- 无 EXIF 提示 -->
      <div v-else-if="imageUrl && !hasExif && !isLoading"
        class="flex flex-col items-center gap-2 py-8 text-slate-400 dark:text-slate-500">
        <svg class="w-12 h-12 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        </svg>
        <p class="text-sm font-medium">{{ noExifMsg }}</p>
        <!-- 仍然显示图片预览 -->
        <img :src="imageUrl" class="mt-3 max-h-48 rounded-lg shadow" style="max-width:100%" />
      </div>

      <!-- EXIF 内容 -->
      <div v-else-if="hasExif && !isLoading" class="flex flex-col gap-4">

        <!-- 图片预览 + 操作栏 -->
        <div class="flex flex-col sm:flex-row items-start gap-4">
          <!-- 预览图 -->
          <div class="relative flex-shrink-0 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-center"
            style="width:160px;height:160px">
            <img :src="imageUrl"
              class="max-w-full max-h-full object-contain"
              :style="orientationStyle ? { transform: orientationStyle } : {}" />
            <!-- 旋转角标 -->
            <span v-if="orientation !== 1"
              class="absolute bottom-1 right-1 bg-blue-500/80 text-white text-[10px] px-1.5 py-0.5 rounded-full leading-tight">
              {{ orientationLabel }}
            </span>
          </div>

          <!-- 操作区 -->
          <div class="flex flex-col gap-2 justify-start pt-1 flex-1 min-w-0">
            <p class="text-sm font-semibold text-slate-700 dark:text-slate-200 break-all leading-snug">{{ fileName }}</p>

            <!-- 快捷信息 chips -->
            <div class="flex flex-wrap gap-1.5 mt-0.5">
              <span
                v-for="item in quickInfo" :key="item.label"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border"
                :class="item.fromFile
                  ? 'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-700'
                  : 'bg-slate-50 dark:bg-slate-700/60 border-slate-200 dark:border-slate-600'"
              >
                <span class="text-slate-400 dark:text-slate-500">{{ item.label }}</span>
                <span
                  class="font-medium"
                  :class="item.fromFile
                    ? 'text-sky-600 dark:text-sky-400'
                    : 'text-slate-700 dark:text-slate-200'"
                >{{ item.value }}</span>
                <!-- 来自文件角标，仅尺寸字段在非 EXIF 来源时显示 -->
                <span
                  v-if="item.fromFile && item.label === '尺寸'"
                  class="ml-0.5 text-[9px] text-sky-400 dark:text-sky-500 italic leading-none"
                  title="此尺寸来自图片文件本身，非 EXIF 记录"
                >文件</span>
              </span>
            </div>

            <div class="flex flex-wrap gap-2 mt-1.5">
              <el-button type="primary" size="small" :loading="isDownloading" @click="downloadClean">
                <svg class="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 12v8m0 0l-3-3m3 3l3-3M12 4v4"/>
                </svg>
                下载去除 EXIF 的原图
              </el-button>
              <el-button v-if="hasGps" size="small" @click="openInAmap">
                <svg class="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                在高德地图中打开
              </el-button>
            </div>
          </div>
        </div>

        <!-- EXIF 分组 -->
        <el-collapse v-model="activeCollapse" class="exif-collapse">
          <el-collapse-item v-for="group in exifGroups" :key="group.key" :name="group.key">
            <template #title>
              <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{ group.label }}</span>
              <span class="ml-2 text-xs text-slate-400 dark:text-slate-500">{{ group.data.length }} 项</span>
            </template>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 py-1">
              <div v-for="row in group.data" :key="row.label"
                class="flex items-start justify-between py-1.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
                <span class="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap mr-2 pt-px">{{ row.label }}</span>
                <span class="text-xs text-slate-700 dark:text-slate-300 text-right break-all">{{ row.value }}</span>
              </div>
            </div>
          </el-collapse-item>

          <!-- GPS 分组 -->
          <el-collapse-item v-if="hasGps" name="gps">
            <template #title>
              <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">GPS 位置</span>
            </template>
            <div class="flex flex-col gap-3">
              <!-- 坐标信息 -->
              <div class="flex flex-col gap-0">
                <!-- WGS84 标头 -->
                <div class="flex items-center gap-1.5 mb-1">
                  <span class="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">WGS84</span>
                  <span class="text-[10px] text-slate-300 dark:text-slate-600">GPS 原始坐标</span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0">
                  <div class="flex items-start justify-between py-1.5 border-b border-slate-100 dark:border-slate-700">
                    <span class="text-xs text-slate-400 dark:text-slate-500 mr-2 pt-px">纬度</span>
                    <span class="text-xs text-slate-700 dark:text-slate-300 text-right font-mono">{{ gpsInfo.latDMS }}</span>
                  </div>
                  <div class="flex items-start justify-between py-1.5 border-b border-slate-100 dark:border-slate-700">
                    <span class="text-xs text-slate-400 dark:text-slate-500 mr-2 pt-px">经度</span>
                    <span class="text-xs text-slate-700 dark:text-slate-300 text-right font-mono">{{ gpsInfo.lonDMS }}</span>
                  </div>
                  <div class="flex items-start justify-between py-1.5 border-b border-slate-100 dark:border-slate-700">
                    <span class="text-xs text-slate-400 dark:text-slate-500 mr-2 pt-px">十进制</span>
                    <span class="text-xs text-slate-700 dark:text-slate-300 text-right font-mono">{{ gpsInfo.lat?.toFixed(6) }}, {{ gpsInfo.lon?.toFixed(6) }}</span>
                  </div>
                  <div v-if="gpsInfo.altitude !== '-'" class="flex items-start justify-between py-1.5 border-b border-slate-100 dark:border-slate-700">
                    <span class="text-xs text-slate-400 dark:text-slate-500 mr-2 pt-px">海拔</span>
                    <span class="text-xs text-slate-700 dark:text-slate-300 text-right">{{ gpsInfo.altitude }}</span>
                  </div>
                </div>

                <!-- GCJ-02 标头 -->
                <div class="flex items-center gap-1.5 mt-3 mb-1">
                  <span class="text-[11px] font-semibold text-orange-400 dark:text-orange-400 uppercase tracking-wide">GCJ-02</span>
                  <span class="text-[10px] text-slate-300 dark:text-slate-600">火星坐标（地图显示用）</span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0">
                  <div class="flex items-start justify-between py-1.5 border-b border-slate-100 dark:border-slate-700">
                    <span class="text-xs text-slate-400 dark:text-slate-500 mr-2 pt-px">纬度</span>
                    <span class="text-xs text-orange-600 dark:text-orange-400 text-right font-mono">{{ gpsInfo.gcjLat?.toFixed(6) }}</span>
                  </div>
                  <div class="flex items-start justify-between py-1.5 border-b border-slate-100 dark:border-slate-700">
                    <span class="text-xs text-slate-400 dark:text-slate-500 mr-2 pt-px">经度</span>
                    <span class="text-xs text-orange-600 dark:text-orange-400 text-right font-mono">{{ gpsInfo.gcjLon?.toFixed(6) }}</span>
                  </div>
                </div>
              </div>

              <!-- 地图区域 -->
              <div class="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700" style="height:280px">
                <!-- 在线：Leaflet 地图 -->
                <div v-if="isOnline" ref="mapContainerRef" class="w-full h-full" />

                <!-- 离线占位 -->
                <div v-else
                  class="w-full h-full flex flex-col items-center justify-center gap-3
                         bg-slate-100 dark:bg-slate-900 relative overflow-hidden">
                  <!-- 网格纹理 SVG -->
                  <svg class="absolute inset-0 w-full h-full opacity-10 dark:opacity-5" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
                        <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" stroke-width="0.8"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                  </svg>
                  <!-- 定位图标 -->
                  <div class="relative z-10 w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shadow-inner">
                    <svg class="w-8 h-8 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                  </div>
                  <!-- 坐标文本 -->
                  <div class="relative z-10 text-center">
                    <p class="text-xs font-mono text-slate-500 dark:text-slate-400">{{ gpsInfo.latDMS }}</p>
                    <p class="text-xs font-mono text-slate-500 dark:text-slate-400">{{ gpsInfo.lonDMS }}</p>
                  </div>
                  <!-- 离线 badge -->
                  <div class="relative z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700">
                    <svg class="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M4.929 4.929a9 9 0 000 14.142M8.464 8.464a5 5 0 000 7.072M12 12h.01"/>
                    </svg>
                    <span class="text-xs text-amber-600 dark:text-amber-400 font-medium">当前离线 · 无法加载地图</span>
                  </div>
                </div>
              </div>
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>

      <!-- 空状态 -->
      <div v-else-if="!imageUrl && !isLoading"
        class="flex flex-col items-center justify-center py-8 text-slate-300 dark:text-slate-600 gap-2">
        <svg class="w-14 h-14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1"
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
        <p class="text-sm">上传图片即可查看 EXIF 信息</p>
      </div>
    </div>

    <ToolDetail title="使用说明">
      <el-text>
        上传 JPEG / HEIC / TIFF 等格式的图片，自动解析拍摄参数（光圈、快门、ISO、焦距等）、设备信息（相机型号、镜头）、GPS 地理位置，并在地图上标注拍摄地点。<br />
        支持一键下载"去除 EXIF 的原图"——通过 Canvas 重绘导出，天然不携带任何元数据，适合上传前保护隐私。<br />
        如图片包含旋转信息（Orientation），预览和下载图片均会自动纠正方向。<br />
        地图使用高德瓦片，国内网络可正常访问；离线时会显示坐标占位界面。
      </el-text>
    </ToolDetail>
  </div>
</template>

<style scoped>
.exif-collapse :deep(.el-collapse-item__header) {
  @apply bg-transparent border-b border-slate-100 dark:border-slate-700 px-0 py-2;
}
.exif-collapse :deep(.el-collapse-item__content) {
  @apply pb-0;
}
.exif-collapse :deep(.el-collapse-item__wrap) {
  @apply border-0 bg-transparent;
}
.exif-collapse :deep(.el-collapse) {
  @apply border-0;
}
</style>
