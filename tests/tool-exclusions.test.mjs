import test from 'node:test'
import assert from 'node:assert/strict'
import {
  filterToolCategories,
  filterToolRoutes,
  getToolIdentifiers,
  isToolExcluded,
  parseExcludedTools,
} from '../src/utils/toolExclusions.ts'

test('排除工具配置支持路径 slug、空白和中文逗号', () => {
  const excluded = parseExcludedTools(' MD5, emoji，m3u8player\n/hashcalculator/ ')

  assert.equal(isToolExcluded('/md5/', excluded), true)
  assert.equal(isToolExcluded('/HASHCALCULATOR?source=test', excluded), true)
  assert.equal(isToolExcluded('/uuid/', excluded), false)
})

test('外部工具可以通过域名第一段排除', () => {
  assert.deepEqual(getToolIdentifiers('https://it-tools.nianchen.top/'), [
    'https://it-tools.nianchen.top',
    'it-tools.nianchen.top',
    'it-tools',
  ])

  assert.equal(
    isToolExcluded('https://it-tools.nianchen.top', parseExcludedTools('it-tools')),
    true,
  )
})

test('分类过滤会移除空分类，路由过滤保留基础路由', () => {
  const excluded = parseExcludedTools('md5,emoji')
  const categories = filterToolCategories([
    { title: '开发', list: [{ url: '/md5/' }, { url: '/uuid/' }] },
    { title: '其他', list: [{ url: '/emoji/' }] },
  ], excluded)
  const routes = filterToolRoutes([
    { path: '/' },
    { path: '/md5' },
    { path: '/uuid' },
    { path: '/404' },
    { path: '/:pathMatch(.*)*' },
  ], excluded)

  assert.deepEqual(categories, [
    { title: '开发', list: [{ url: '/uuid/' }] },
  ])
  assert.deepEqual(routes.map(route => route.path), ['/', '/uuid', '/404', '/:pathMatch(.*)*'])
})
