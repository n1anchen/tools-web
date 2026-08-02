import test from 'node:test'
import assert from 'node:assert/strict'
import {
  analyzeRegex,
  buildHighlightSegments,
  filterHttpStatuses,
  replaceRegex,
} from '../src/utils/developerTools.ts'
import {
  extractDominantColors,
  recommendedTextColor,
  rgbToCmyk,
  rgbToHex,
  rgbToHsl,
  rgbToHsv,
} from '../src/utils/colorTools.ts'
import { buildQrPayload } from '../src/utils/qrTools.ts'

test('正则分析返回位置、捕获组、行列与覆盖率', () => {
  const result = analyzeRegex('id=12\nid=345', 'id=(\\d+)', 'g')
  assert.equal(result.error, '')
  assert.equal(result.matches.length, 2)
  assert.deepEqual(result.matches.map(match => match.groups[0]), ['12', '345'])
  assert.deepEqual([result.matches[1].line, result.matches[1].column], [2, 1])
  assert.ok(result.coverage > 60)
})

test('无效正则与零长度全局匹配不会导致死循环', () => {
  assert.match(analyzeRegex('abc', '[', 'g').error, /regular expression|正则/i)
  assert.equal(analyzeRegex('ab', '(?=.)', 'g').matches.length, 2)
})

test('高亮片段和替换预览保持原始文本顺序', () => {
  const analysis = analyzeRegex('foo bar foo', 'foo', 'g')
  const segments = buildHighlightSegments('foo bar foo', analysis.matches)
  assert.equal(segments.map(segment => segment.value).join(''), 'foo bar foo')
  assert.equal(segments.filter(segment => segment.matched).length, 2)
  assert.equal(replaceRegex('foo bar foo', 'foo', 'x', 'g').value, 'x bar x')
})

test('HTTP 状态码搜索支持分类、常用和中文标签', () => {
  const statuses = [
    { code: 200, name: 'OK', description: '成功', common: true, tags: ['缓存'] },
    { code: 404, name: 'Not Found', description: '资源不存在', common: true },
    { code: 451, name: 'Unavailable', description: '法律原因' },
  ]
  assert.deepEqual(filterHttpStatuses(statuses, '', '4', false).map(item => item.code), [404, 451])
  assert.deepEqual(filterHttpStatuses(statuses, '缓存', 'all', false).map(item => item.code), [200])
  assert.deepEqual(filterHttpStatuses(statuses, '', 'all', true).map(item => item.code), [200, 404])
})

test('颜色格式转换与文字对比色结果正确', () => {
  assert.equal(rgbToHex(255, 107, 53), '#FF6B35')
  assert.equal(rgbToHsl(255, 0, 0), 'hsl(0, 100%, 50%)')
  assert.equal(rgbToHsv(255, 0, 0), 'hsv(0, 100%, 100%)')
  assert.equal(rgbToCmyk(0, 0, 0), 'cmyk(0%, 0%, 0%, 100%)')
  assert.equal(recommendedTextColor(255, 255, 255), '#111827')
  assert.equal(recommendedTextColor(0, 0, 0), '#FFFFFF')
})

test('主色提取忽略透明像素并合并相近色桶', () => {
  const pixels = new Uint8ClampedArray([
    255, 0, 0, 255,
    250, 5, 5, 255,
    0, 0, 255, 255,
    0, 255, 0, 0,
  ])
  const colors = extractDominantColors(pixels, 3, 1)
  assert.equal(colors.length, 2)
  assert.equal(colors[0].hex, '#FD0303')
})

test('二维码负载支持 Wi-Fi 转义与邮件参数', () => {
  assert.equal(
    buildQrPayload({ type: 'wifi', ssid: 'Office;5G', password: 'a:b', encryption: 'WPA', hidden: true }),
    'WIFI:T:WPA;S:Office\\;5G;P:a\\:b;H:true;;',
  )
  assert.equal(
    buildQrPayload({ type: 'email', email: 'hello@example.com', subject: '你好', body: '正文' }),
    'mailto:hello@example.com?subject=%E4%BD%A0%E5%A5%BD&body=%E6%AD%A3%E6%96%87',
  )
})
