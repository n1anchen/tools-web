const TRACKING_PARAMS = new Set([
  'dclid',
  'fbclid',
  'gbraid',
  'gclid',
  'igshid',
  'mc_cid',
  'mc_eid',
  'mkt_tok',
  'msclkid',
  'oly_anon_id',
  'oly_enc_id',
  'spm',
  'vero_conv',
  'vero_id',
  'wbraid',
  '_hsenc',
  '_hsmi',
])

/**
 * 移除常见营销跟踪参数，保留业务参数和 hash，避免把带签名或资源 ID
 * 的目标链接清洗成不可用地址。
 */
export function removeTrackingParams(url: string): string {
  try {
    const parsed = new URL(url)
    for (const key of [...parsed.searchParams.keys()]) {
      if (key.toLowerCase().startsWith('utm_') || TRACKING_PARAMS.has(key.toLowerCase())) {
        parsed.searchParams.delete(key)
      }
    }
    return parsed.href
  } catch {
    return url
  }
}
