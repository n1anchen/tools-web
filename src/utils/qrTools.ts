export type QrContentType = 'text' | 'url' | 'wifi' | 'email' | 'phone'

function escapeWifiValue(value: string) {
  return value.replace(/([\\;,:"])/g, '\\$1')
}

export interface QrPayloadInput {
  type: QrContentType
  text?: string
  url?: string
  ssid?: string
  password?: string
  encryption?: 'WPA' | 'WEP' | 'nopass'
  hidden?: boolean
  email?: string
  subject?: string
  body?: string
  phone?: string
}

export function buildQrPayload(input: QrPayloadInput) {
  if (input.type === 'url') return input.url?.trim() ?? ''
  if (input.type === 'phone') return input.phone?.trim() ? `tel:${input.phone.trim()}` : ''
  if (input.type === 'email') {
    const address = input.email?.trim() ?? ''
    if (!address) return ''
    const params = new URLSearchParams()
    if (input.subject) params.set('subject', input.subject)
    if (input.body) params.set('body', input.body)
    const query = params.toString()
    return `mailto:${address}${query ? `?${query}` : ''}`
  }
  if (input.type === 'wifi') {
    const ssid = input.ssid?.trim() ?? ''
    if (!ssid) return ''
    const encryption = input.encryption ?? 'WPA'
    return `WIFI:T:${encryption};S:${escapeWifiValue(ssid)};P:${escapeWifiValue(input.password ?? '')};H:${input.hidden ? 'true' : 'false'};;`
  }
  return input.text ?? ''
}
