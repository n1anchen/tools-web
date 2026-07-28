export const MAX_HOPS_LIMIT = 10
export const HOP_TIMEOUT_MS = 5000

const BLOCKED_HOST_SUFFIXES = [
  '.internal',
  '.intranet',
  '.lan',
  '.local',
  '.localhost',
  '.home',
]

function isBlockedIpv4(hostname) {
  const parts = hostname.split('.')
  if (parts.length !== 4 || parts.some(part => !/^\d+$/.test(part))) return false

  const octets = parts.map(Number)
  if (octets.some(part => part < 0 || part > 255)) return true

  const [a, b, c] = octets
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  )
}

function isBlockedIpv6(hostname) {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (!host.includes(':')) return false

  if (
    host === '::' ||
    host === '::1' ||
    host.startsWith('::ffff:') ||
    host.startsWith('fc') ||
    host.startsWith('fd') ||
    /^fe[89ab]/.test(host)
  ) {
    return true
  }

  const mappedIpv4 = host.match(/(?:^|:)ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1]
  return mappedIpv4 ? isBlockedIpv4(mappedIpv4) : false
}

/**
 * Validate and normalize a user-controlled URL before every outbound request.
 * This blocks literal private/special-use addresses and common local hostnames.
 * The deployment platform should additionally deny private network egress to
 * cover DNS rebinding and public hostnames that resolve to private addresses.
 */
export function validatePublicHttpUrl(value) {
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error('Invalid URL')
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only HTTP and HTTPS URLs are allowed')
  }
  if (url.username || url.password) {
    throw new Error('URLs containing credentials are not allowed')
  }
  if (url.port && url.port !== '80' && url.port !== '443') {
    throw new Error('Only ports 80 and 443 are allowed')
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (
    !hostname ||
    hostname === 'localhost' ||
    BLOCKED_HOST_SUFFIXES.some(suffix => hostname.endsWith(suffix)) ||
    isBlockedIpv4(hostname) ||
    isBlockedIpv6(hostname)
  ) {
    throw new Error('Private or local network targets are not allowed')
  }

  return url
}

async function fetchWithoutFollowing(url, fetchImpl) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), HOP_TIMEOUT_MS)

  try {
    let response = await fetchImpl(url, {
      method: 'HEAD',
      redirect: 'manual',
      signal: controller.signal,
    })

    // A few short-link providers reject HEAD. Request only the first byte so a
    // non-redirect response cannot force the edge function to download a body.
    if (response.status === 405 || response.status === 501) {
      response = await fetchImpl(url, {
        method: 'GET',
        redirect: 'manual',
        headers: { Range: 'bytes=0-0' },
        signal: controller.signal,
      })
      response.body?.cancel?.().catch?.(() => {})
    }

    return response
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error('Target request timed out')
    }
    throw new Error(`Target request failed: ${error?.message || 'unknown error'}`)
  } finally {
    clearTimeout(timer)
  }
}

export async function resolveOneHop(value, fetchImpl = fetch) {
  const current = validatePublicHttpUrl(value)
  const response = await fetchWithoutFollowing(current.href, fetchImpl)

  if (response.status < 300 || response.status >= 400) return null

  const location = response.headers.get('Location')
  if (!location) return null

  const next = validatePublicHttpUrl(new URL(location, current).href)
  return next.href === current.href ? null : next.href
}

export async function resolveRedirectChain(
  value,
  { follow = false, maxHops = 5, fetchImpl = fetch } = {},
) {
  const initialUrl = validatePublicHttpUrl(value).href
  const requestedHops = Number.isFinite(Number(maxHops)) ? Math.trunc(Number(maxHops)) : 5
  const safeMaxHops = Math.max(1, Math.min(requestedHops, MAX_HOPS_LIMIT))
  const chain = [initialUrl]
  let currentUrl = initialUrl

  for (let index = 0; index < (follow ? safeMaxHops : 1); index += 1) {
    const next = await resolveOneHop(currentUrl, fetchImpl)
    if (!next || chain.includes(next)) break
    chain.push(next)
    currentUrl = next
  }

  return { chain, finalUrl: currentUrl }
}
