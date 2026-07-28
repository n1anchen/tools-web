/**
 * 本地调试用 mock 服务，模拟 ESA 边缘函数行为
 * 启动: node esa-functions/url-unshorten/mock-server.mjs
 * 默认监听: http://localhost:3100
 *
 * 在 .env.development.local 中设置:
 *   VITE_UNSHORTEN_API=http://localhost:3100
 */

import http from 'node:http'
import { resolveRedirectChain, validatePublicHttpUrl } from './core.js'

const PORT = 3100

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
  if (req.method !== 'GET') {
    res.writeHead(405)
    res.end(JSON.stringify({ error: 'Method not allowed' }))
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
    validatePublicHttpUrl(targetUrl)
  } catch (error) {
    res.writeHead(400)
    res.end(JSON.stringify({ error: error.message || 'Invalid URL' }))
    return
  }

  const follow = reqUrl.searchParams.get('follow') === 'true'
  const maxHopsParam = parseInt(reqUrl.searchParams.get('maxHops') || '5', 10)
  const maxHops = Number.isNaN(maxHopsParam) ? 5 : maxHopsParam

  try {
    const result = await resolveRedirectChain(targetUrl, { follow, maxHops })
    res.writeHead(200)
    res.end(JSON.stringify(result))
  } catch (err) {
    res.writeHead(502)
    res.end(JSON.stringify({ error: err.message || 'Failed to resolve URL' }))
  }
})

server.listen(PORT, () => {
  console.log(`[mock] ESA 边缘函数 mock 服务已启动: http://localhost:${PORT}`)
  console.log(`[mock] 在 .env.development.local 中配置:`)
  console.log(`[mock]   VITE_UNSHORTEN_API=http://localhost:${PORT}`)
  console.log(`[mock] 按 Ctrl+C 停止`)
})
