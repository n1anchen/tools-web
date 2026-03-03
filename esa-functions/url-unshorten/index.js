/**
 * 阿里云 ESA 边缘函数 - 短链接解析代理
 *
 * 请求格式:
 *   GET /?url=<short_url>[&follow=true][&maxHops=5]
 *
 * 响应格式:
 *   { "chain": ["url1", "url2", ...], "finalUrl": "url_last" }
 *
 * 部署说明:
 *   1. 在 ESA 控制台创建边缘函数并绑定路由
 *   2. 将 ALLOWED_ORIGINS 替换为你的实际域名
 */

// ===== 配置 =====

/**
 * 允许调用的前端域名白名单，支持正则
 * /^https:\/\/(.+\.)?your-domain\.com$/ 匹配主域名及其所有子域名
 */
const ALLOWED_ORIGINS = [
  /^https:\/\/(.+\.)?your-domain\.com$/,  // your-domain.com 及所有子域名
  /^http:\/\/localhost:\d+$/,              // 本地开发任意端口
  /^https:\/\/(.+\.)?esa\.console\.aliyun\.com$/
]

/** 检查 origin 是否在白名单中 */
function isOriginAllowed(origin) {
  return ALLOWED_ORIGINS.some((pattern) => pattern.test(origin))
}

/** 单次请求允许的最大跳数上限（服务端硬限制，不受前端参数影响） */
const MAX_HOPS_LIMIT = 10

/** 每跳请求超时（毫秒） */
const HOP_TIMEOUT_MS = 5000

// ===== 主逻辑 =====

export default {
  async fetch(request) {
    return handleRequest(request)
  }
}

async function handleRequest(request) {
  const origin = request.headers.get('Origin') || ''

  // OPTIONS 预检请求
  if (request.method === 'OPTIONS') {
    return buildCorsResponse(origin, null, 204)
  }

  // Origin 白名单校验
  if (!isOriginAllowed(origin)) {
    return buildCorsResponse(origin, { error: 'Forbidden' }, 403)
  }

  const reqUrl = new URL(request.url)
  const targetUrl = reqUrl.searchParams.get('url')

  if (!targetUrl) {
    return buildCorsResponse(origin, { error: 'Missing required parameter: url' }, 400)
  }

  // 校验目标 URL 格式
  let parsedTarget
  try {
    parsedTarget = new URL(targetUrl)
    if (!['http:', 'https:'].includes(parsedTarget.protocol)) {
      throw new Error('Invalid protocol')
    }
  } catch {
    return buildCorsResponse(origin, { error: 'Invalid URL' }, 400)
  }

  // 是否追踪多跳，默认 false
  const follow = reqUrl.searchParams.get('follow') === 'true'

  // 用户请求的最大跳数，不超过服务端上限
  const maxHopsParam = parseInt(reqUrl.searchParams.get('maxHops') || '5', 10)
  const maxHops = Math.min(
    isNaN(maxHopsParam) ? 5 : maxHopsParam,
    MAX_HOPS_LIMIT
  )

  try {
    const chain = []
    let currentUrl = targetUrl

    if (follow) {
      // 多跳追踪模式
      for (let i = 0; i < maxHops; i++) {
        const next = await resolveOneHop(currentUrl)
        if (!chain.includes(currentUrl)) {
          chain.push(currentUrl)
        }
        // 无下一跳，或下一跳已在链路中（循环重定向），终止
        if (!next || chain.includes(next)) break
        currentUrl = next
      }
      // 确保最终 URL 也在链路中
      if (!chain.includes(currentUrl)) {
        chain.push(currentUrl)
      }
    } else {
      // 单跳模式：只取第一跳的 Location
      chain.push(currentUrl)
      const next = await resolveOneHop(currentUrl)
      if (next) {
        currentUrl = next
        // 避免与起始 URL 重复
        if (!chain.includes(currentUrl)) {
          chain.push(currentUrl)
        }
      }
    }

    return buildCorsResponse(origin, {
      chain,
      finalUrl: currentUrl,
    }, 200)
  } catch (err) {
    return buildCorsResponse(origin, { error: err.message || 'Failed to resolve URL' }, 502)
  }
}

/**
 * 发出一次 HEAD 请求，返回 Location 响应头的值（即下一跳 URL）
 * 若无重定向则返回 null
 */
async function resolveOneHop(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), HOP_TIMEOUT_MS)

  try {
    const resp = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual',
      signal: controller.signal,
    })
    clearTimeout(timer)

    // 3xx 重定向
    if (resp.status >= 300 && resp.status < 400) {
      const location = resp.headers.get('Location')
      if (!location) return null
      // Location 可能是相对路径，需要补全为绝对 URL
      try {
        const next = new URL(location, url).href
        // 规范化后再比较，避免仅大小写或末尾斜杠差异导致的误判
        const normalizedCurrent = new URL(url).href
        if (next === normalizedCurrent) return null
        return next
      } catch {
        return null
      }
    }
    return null
  } catch {
    clearTimeout(timer)
    return null
  }
}

/**
 * 统一构造带 CORS 响应头的 Response
 */
function buildCorsResponse(origin, body, status) {
  const isAllowed = isOriginAllowed(origin)
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': isAllowed ? origin : 'null',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  }
  return new Response(
    body ? JSON.stringify(body) : null,
    { status, headers }
  )
}
