/**
 * 本地调试用 mock 服务，模拟 ESA 边缘函数行为
 * 启动: node esa-functions/url-unshorten/mock-server.mjs
 * 默认监听: http://localhost:3100
 *
 * 在 .env.development.local 中设置:
 *   VITE_UNSHORTEN_API=http://localhost:3100
 */

import http from 'node:http'

const PORT = 3100
const MAX_HOPS_LIMIT = 10
const HOP_TIMEOUT_MS = 5000

const server = http.createServer(async (req, res) => {
  const origin = req.headers['origin'] || ''

  // CORS 响应头（本地 mock 全放通）
  res.setHeader('Access-Control-Allow-Origin', origin || '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const reqUrl = new URL(req.url, `http://localhost:${PORT}`)
  const targetUrl = reqUrl.searchParams.get('url')

  if (!targetUrl) {
    res.writeHead(400)
    res.end(JSON.stringify({ error: 'Missing required parameter: url' }))
    return
  }

  try {
    new URL(targetUrl)
  } catch {
    res.writeHead(400)
    res.end(JSON.stringify({ error: 'Invalid URL' }))
    return
  }

  const follow = reqUrl.searchParams.get('follow') === 'true'
  const maxHopsParam = parseInt(reqUrl.searchParams.get('maxHops') || '5', 10)
  const maxHops = Math.min(isNaN(maxHopsParam) ? 5 : maxHopsParam, MAX_HOPS_LIMIT)

  try {
    const chain = []
    let currentUrl = targetUrl

    if (follow) {
      for (let i = 0; i < maxHops; i++) {
        const next = await resolveOneHop(currentUrl)
        chain.push(currentUrl)
        if (!next || next === currentUrl) break
        currentUrl = next
      }
      if (!chain.includes(currentUrl)) chain.push(currentUrl)
    } else {
      chain.push(currentUrl)
      const next = await resolveOneHop(currentUrl)
      if (next && next !== currentUrl) {
        currentUrl = next
        chain.push(currentUrl)
      }
    }

    res.writeHead(200)
    res.end(JSON.stringify({ chain, finalUrl: currentUrl }))
  } catch (err) {
    res.writeHead(502)
    res.end(JSON.stringify({ error: err.message || 'Failed to resolve URL' }))
  }
})

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

    if (resp.status >= 300 && resp.status < 400) {
      const location = resp.headers.get('location')
      if (!location) return null
      try {
        return new URL(location, url).href
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

server.listen(PORT, () => {
  console.log(`[mock] ESA 边缘函数 mock 服务已启动: http://localhost:${PORT}`)
  console.log(`[mock] 在 .env.development.local 中配置:`)
  console.log(`[mock]   VITE_UNSHORTEN_API=http://localhost:${PORT}`)
  console.log(`[mock] 按 Ctrl+C 停止`)
})
