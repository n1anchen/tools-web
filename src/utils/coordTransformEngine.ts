import coordtransform from 'coordtransform'

export type CoordSystem = 'wgs84' | 'cgcs2000' | 'gcj02' | 'bd09' | 'mercator'

export interface GeoCoordinate {
  lng: number
  lat: number
}

export interface MercatorCoordinate {
  x: number
  y: number
}

export type AnyCoordinate = GeoCoordinate | MercatorCoordinate

export interface CoordinateSet {
  wgs84: GeoCoordinate
  cgcs2000: GeoCoordinate
  gcj02: GeoCoordinate
  bd09: GeoCoordinate
  mercator: MercatorCoordinate
}

export interface BatchCoordinateRow {
  line: number
  label: string
  primary: number
  secondary: number
}

export interface BatchCoordinateError {
  line: number
  input: string
  message: string
}

export interface BatchCoordinateResult extends BatchCoordinateRow {
  coordinates: CoordinateSet
}

const EARTH_RADIUS = 6378137
const MERCATOR_MAX_LAT = 85.05112878
const MERCATOR_MAX_X = 20037508.34
const MERCATOR_MAX_Y = 20048966.1

export function isMercatorSystem(system: CoordSystem): system is 'mercator' {
  return system === 'mercator'
}

export function formatCoordinateValue(system: CoordSystem, value: number) {
  return isMercatorSystem(system) ? value.toFixed(2) : value.toFixed(6)
}

export function toCoordinatePair(system: CoordSystem, coordinate: AnyCoordinate) {
  if (isMercatorSystem(system)) {
    const mercator = coordinate as MercatorCoordinate
    return {
      primary: mercator.x,
      secondary: mercator.y,
    }
  }

  const geo = coordinate as GeoCoordinate
  return {
    primary: geo.lng,
    secondary: geo.lat,
  }
}

export function fromCoordinatePair(system: CoordSystem, primary: number, secondary: number): AnyCoordinate {
  if (isMercatorSystem(system)) {
    return {
      x: primary,
      y: secondary,
    }
  }

  return {
    lng: primary,
    lat: secondary,
  }
}

export function validateCoordinate(system: CoordSystem, coordinate: AnyCoordinate) {
  if (isMercatorSystem(system)) {
    const mercator = coordinate as MercatorCoordinate
    if (mercator.x < -MERCATOR_MAX_X || mercator.x > MERCATOR_MAX_X || mercator.y < -MERCATOR_MAX_Y || mercator.y > MERCATOR_MAX_Y) {
      return 'Web Mercator 的 X 范围需在 -20037508.34 到 20037508.34 之间，Y 范围需在 -20048966.10 到 20048966.10 之间。'
    }
    return ''
  }

  const geo = coordinate as GeoCoordinate
  if (geo.lng < -180 || geo.lng > 180 || geo.lat < -90 || geo.lat > 90) {
    return '经度范围需在 -180 到 180 之间，纬度范围需在 -90 到 90 之间。'
  }
  return ''
}

export function buildCoordinateSet(source: CoordSystem, coordinate: AnyCoordinate): CoordinateSet {
  let wgs84: GeoCoordinate

  if (source === 'wgs84') {
    wgs84 = { ...(coordinate as GeoCoordinate) }
  } else if (source === 'cgcs2000') {
    wgs84 = { ...(coordinate as GeoCoordinate) }
  } else if (source === 'gcj02') {
    const gcj02 = coordinate as GeoCoordinate
    const [lng, lat] = coordtransform.gcj02towgs84(gcj02.lng, gcj02.lat)
    wgs84 = { lng, lat }
  } else if (source === 'bd09') {
    const bd09 = coordinate as GeoCoordinate
    const [gcjLng, gcjLat] = coordtransform.bd09togcj02(bd09.lng, bd09.lat)
    const [lng, lat] = coordtransform.gcj02towgs84(gcjLng, gcjLat)
    wgs84 = { lng, lat }
  } else {
    const mercator = coordinate as MercatorCoordinate
    const [lng, lat] = mercatorToWgs84(mercator.x, mercator.y)
    wgs84 = { lng, lat }
  }

  const [gcjLng, gcjLat] = coordtransform.wgs84togcj02(wgs84.lng, wgs84.lat)
  const [bdLng, bdLat] = coordtransform.gcj02tobd09(gcjLng, gcjLat)
  const [mercatorX, mercatorY] = wgs84ToMercator(wgs84.lng, wgs84.lat)

  const set: CoordinateSet = {
    wgs84: { ...wgs84 },
    cgcs2000: { ...wgs84 },
    gcj02: { lng: gcjLng, lat: gcjLat },
    bd09: { lng: bdLng, lat: bdLat },
    mercator: { x: mercatorX, y: mercatorY },
  }

  if (source === 'wgs84') set.wgs84 = { ...(coordinate as GeoCoordinate) }
  if (source === 'cgcs2000') set.cgcs2000 = { ...(coordinate as GeoCoordinate) }
  if (source === 'gcj02') set.gcj02 = { ...(coordinate as GeoCoordinate) }
  if (source === 'bd09') set.bd09 = { ...(coordinate as GeoCoordinate) }
  if (source === 'mercator') set.mercator = { ...(coordinate as MercatorCoordinate) }

  return set
}

export function parseCoordinateRows(input: string, system: CoordSystem, limit = 500) {
  const rows: BatchCoordinateRow[] = []
  const errors: BatchCoordinateError[] = []

  input.split(/\r?\n/).forEach((rawLine, index) => {
    const line = index + 1
    const normalized = rawLine.trim()
    if (!normalized || normalized.startsWith('#')) return

    const columns = normalized.includes('\t') || /[,，;；]/.test(normalized)
      ? normalized.split(/[\t,，;；]+/).map(value => value.trim()).filter(Boolean)
      : normalized.split(/\s+/).filter(Boolean)

    const looksLikeHeader = columns.some(column => /^(name|label|名称|地点|lng|lon|longitude|经度|lat|latitude|纬度|x|y)$/i.test(column))
      && columns.filter(column => Number.isFinite(Number(column))).length < 2
    if (looksLikeHeader) return

    if (columns.length < 2) {
      errors.push({ line, input: rawLine, message: '每行至少需要两个坐标值。' })
      return
    }

    const primary = Number(columns[columns.length - 2])
    const secondary = Number(columns[columns.length - 1])
    if (!Number.isFinite(primary) || !Number.isFinite(secondary)) {
      errors.push({ line, input: rawLine, message: '末尾两列必须是有效数字。' })
      return
    }

    const coordinate = fromCoordinatePair(system, primary, secondary)
    const validationMessage = validateCoordinate(system, coordinate)
    if (validationMessage) {
      errors.push({ line, input: rawLine, message: validationMessage })
      return
    }

    if (rows.length >= limit) {
      errors.push({ line, input: rawLine, message: `单次最多转换 ${limit} 个坐标点。` })
      return
    }

    rows.push({
      line,
      label: columns.slice(0, -2).join(' ') || `点 ${rows.length + 1}`,
      primary,
      secondary,
    })
  })

  return { rows, errors }
}

export function buildBatchCoordinateSets(input: string, system: CoordSystem, limit = 500) {
  const parsed = parseCoordinateRows(input, system, limit)
  return {
    ...parsed,
    results: parsed.rows.map<BatchCoordinateResult>(row => ({
      ...row,
      coordinates: buildCoordinateSet(system, fromCoordinatePair(system, row.primary, row.secondary)),
    })),
  }
}

export function coordinateResultsToCsv(results: BatchCoordinateResult[]) {
  const escapeCell = (value: string | number) => {
    const text = String(value)
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  const header = [
    '名称',
    'WGS84 经度', 'WGS84 纬度',
    'CGCS2000 经度', 'CGCS2000 纬度',
    'GCJ-02 经度', 'GCJ-02 纬度',
    'BD-09 经度', 'BD-09 纬度',
    'Web Mercator X', 'Web Mercator Y',
  ]
  const rows = results.map(result => [
    result.label,
    formatCoordinateValue('wgs84', result.coordinates.wgs84.lng),
    formatCoordinateValue('wgs84', result.coordinates.wgs84.lat),
    formatCoordinateValue('cgcs2000', result.coordinates.cgcs2000.lng),
    formatCoordinateValue('cgcs2000', result.coordinates.cgcs2000.lat),
    formatCoordinateValue('gcj02', result.coordinates.gcj02.lng),
    formatCoordinateValue('gcj02', result.coordinates.gcj02.lat),
    formatCoordinateValue('bd09', result.coordinates.bd09.lng),
    formatCoordinateValue('bd09', result.coordinates.bd09.lat),
    formatCoordinateValue('mercator', result.coordinates.mercator.x),
    formatCoordinateValue('mercator', result.coordinates.mercator.y),
  ])
  return [header, ...rows].map(row => row.map(escapeCell).join(',')).join('\n')
}

function wgs84ToMercator(lng: number, lat: number): [number, number] {
  const safeLat = Math.max(Math.min(lat, MERCATOR_MAX_LAT), -MERCATOR_MAX_LAT)
  const x = EARTH_RADIUS * lng * Math.PI / 180
  const y = EARTH_RADIUS * Math.log(Math.tan(Math.PI / 4 + safeLat * Math.PI / 360))
  return [x, y]
}

function mercatorToWgs84(x: number, y: number): [number, number] {
  const lng = x / EARTH_RADIUS * 180 / Math.PI
  const lat = (2 * Math.atan(Math.exp(y / EARTH_RADIUS)) - Math.PI / 2) * 180 / Math.PI
  return [lng, lat]
}
