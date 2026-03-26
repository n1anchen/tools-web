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