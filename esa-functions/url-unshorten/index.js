import {
  MAX_HOPS_LIMIT,
  resolveRedirectChain,
  validatePublicHttpUrl,
} from './core.js'

const ALLOWED_ORIGINS = [
  /^https:\/\/(?:.+\.)?nianchen\.top$/,
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
  /^https:\/\/(?:.+\.)?esa\.console\.aliyun\.com$/,
]

function isOriginAllowed(origin) {
  return ALLOWED_ORIGINS.some((pattern) => pattern.test(origin))
}

export default {
  async fetch(request) {
    return handleRequest(request)
  }
}

export async function handleRequest(request) {
  const origin = request.headers.get('Origin') || ''

  if (request.method === 'OPTIONS') {
    return buildCorsResponse(origin, null, 204)
  }
  if (request.method !== 'GET') {
    return buildCorsResponse(origin, { error: 'Method not allowed' }, 405)
  }

  if (!isOriginAllowed(origin)) {
    return buildCorsResponse(origin, { error: 'Forbidden' }, 403)
  }

  const reqUrl = new URL(request.url)
  const targetUrl = reqUrl.searchParams.get('url')

  if (!targetUrl) {
    return buildCorsResponse(origin, { error: 'Missing required parameter: url' }, 400)
  }

  try {
    validatePublicHttpUrl(targetUrl)
  } catch (error) {
    return buildCorsResponse(origin, { error: error.message || 'Invalid URL' }, 400)
  }

  const follow = reqUrl.searchParams.get('follow') === 'true'
  const maxHopsParam = parseInt(reqUrl.searchParams.get('maxHops') || '5', 10)
  const maxHops = Math.max(1, Math.min(
    Number.isNaN(maxHopsParam) ? 5 : maxHopsParam,
    MAX_HOPS_LIMIT,
  ))

  try {
    const result = await resolveRedirectChain(targetUrl, { follow, maxHops })
    return buildCorsResponse(origin, result, 200)
  } catch (err) {
    return buildCorsResponse(origin, { error: err.message || 'Failed to resolve URL' }, 502)
  }
}

function buildCorsResponse(origin, body, status) {
  const isAllowed = isOriginAllowed(origin)
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': isAllowed ? origin : 'null',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  }
  return new Response(
    body ? JSON.stringify(body) : null,
    { status, headers }
  )
}
