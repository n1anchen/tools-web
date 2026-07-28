import test from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveRedirectChain,
  validatePublicHttpUrl,
} from '../esa-functions/url-unshorten/core.js'
import { handleRequest } from '../esa-functions/url-unshorten/index.js'

test('rejects local, private, special-use, credentialed, and custom-port URLs', () => {
  const blocked = [
    'http://localhost/path',
    'http://127.0.0.1/',
    'http://0x7f000001/',
    'http://10.0.0.1/',
    'http://169.254.169.254/latest/meta-data',
    'http://[::1]/',
    'http://[fd00::1]/',
    'http://[::ffff:127.0.0.1]/',
    'https://user:pass@example.com/',
    'https://example.com:8443/',
  ]

  for (const value of blocked) {
    assert.throws(() => validatePublicHttpUrl(value))
  }
})

test('normalizes public HTTP URLs', () => {
  assert.equal(
    validatePublicHttpUrl('HTTPS://Example.COM/a').href,
    'https://example.com/a',
  )
})

test('validates every redirect hop and blocks redirects to private networks', async () => {
  const fetchImpl = async () => new Response(null, {
    status: 302,
    headers: { Location: 'http://169.254.169.254/latest/meta-data' },
  })

  await assert.rejects(
    resolveRedirectChain('https://example.com/short', { fetchImpl }),
    /Private or local network/,
  )
})

test('stops redirect cycles and clamps maxHops to at least one', async () => {
  const redirects = new Map([
    ['https://example.com/a', 'https://example.com/b'],
    ['https://example.com/b', 'https://example.com/a'],
  ])
  const fetchImpl = async url => new Response(null, {
    status: 302,
    headers: { Location: redirects.get(url) },
  })

  const result = await resolveRedirectChain('https://example.com/a', {
    follow: true,
    maxHops: -5,
    fetchImpl,
  })
  assert.deepEqual(result.chain, [
    'https://example.com/a',
    'https://example.com/b',
  ])
})

test('edge handler allows the production origin and rejects unknown origins', async () => {
  const allowed = await handleRequest(new Request(
    'https://edge.example/?url=http://127.0.0.1',
    { headers: { Origin: 'https://tools.nianchen.top' } },
  ))
  assert.equal(allowed.status, 400)

  const denied = await handleRequest(new Request(
    'https://edge.example/?url=https://example.com',
    { headers: { Origin: 'https://evil.example' } },
  ))
  assert.equal(denied.status, 403)
  assert.equal(denied.headers.get('Access-Control-Allow-Origin'), 'null')
})
