import test from 'node:test'
import assert from 'node:assert/strict'
import {
  analyzeText,
  analyzeWordFrequency,
  decodeHtmlEntities,
  decodeUnicode,
  dedupeLines,
  encodeHtmlEntities,
  encodeUnicode,
  replaceText,
} from '../src/utils/textTools.ts'

test('字数统计按 Unicode 字符计数并覆盖中英文、数字、标点和符号', () => {
  const stats = analyzeText('你好 A1，😀\n第二段')
  assert.equal(stats.characters, 11)
  assert.equal(stats.chineseCharacters, 5)
  assert.equal(stats.latinLetters, 1)
  assert.equal(stats.numbers, 1)
  assert.equal(stats.punctuation, 1)
  assert.equal(stats.symbols, 1)
  assert.equal(stats.lines, 2)
})

test('文本去重支持忽略空白、大小写与空行', () => {
  const result = dedupeLines(' Apple \napple\n\nBanana\n banana ', {
    trimLines: true,
    ignoreEmpty: true,
    caseSensitive: false,
    mode: 'global',
    sort: false,
  })
  assert.equal(result.text, 'Apple\nBanana')
  assert.equal(result.removedLines, 3)
})

test('仅连续去重不会删除非相邻的重复行', () => {
  const result = dedupeLines('A\nA\nB\nA', {
    trimLines: false,
    ignoreEmpty: false,
    caseSensitive: true,
    mode: 'adjacent',
    sort: false,
  })
  assert.equal(result.text, 'A\nB\nA')
})

test('Unicode 编解码支持增补平面字符的两种格式', () => {
  assert.equal(
    encodeUnicode('中😀', { format: 'javascript', escapeAll: false, uppercase: false }),
    '\\u4e2d\\ud83d\\ude00',
  )
  assert.equal(
    encodeUnicode('中😀', { format: 'codePoint', escapeAll: false, uppercase: true }),
    '\\u{4E2D}\\u{1F600}',
  )
  assert.equal(decodeUnicode('\\u4e2d\\ud83d\\ude00'), '中😀')
  assert.equal(decodeUnicode('\\u{4E2D}\\u{1F600}'), '中😀')
})

test('HTML 实体转换支持基本实体、数字实体和非 ASCII 字符', () => {
  const encoded = encodeHtmlEntities('<p title="杭州">A&B</p>', true)
  assert.equal(encoded, '&lt;p title=&quot;&#x676D;&#x5DDE;&quot;&gt;A&amp;B&lt;/p&gt;')
  assert.equal(decodeHtmlEntities(encoded), '<p title="杭州">A&B</p>')
  assert.equal(decodeHtmlEntities('&#20013; &#x1F600; &nbsp;'), '中 😀 \u00a0')
})

test('文本替换区分普通文本与正则替换语义', () => {
  const literal = replaceText('A A', 'A', '$&', {
    useRegex: false,
    caseSensitive: true,
    scope: 'all',
  })
  assert.equal(literal.text, '$& $&')
  assert.equal(literal.replacementCount, 2)

  const regex = replaceText('2025-08 2026-09', '(\\d{4})-(\\d{2})', '$2/$1', {
    useRegex: true,
    caseSensitive: true,
    scope: 'first',
  })
  assert.equal(regex.text, '08/2025 2026-09')
  assert.equal(regex.matchCount, 2)
  assert.equal(regex.replacementCount, 1)
})

test('无效正则会返回错误而不会抛出异常', () => {
  const result = replaceText('abc', '[', '', {
    useRegex: true,
    caseSensitive: true,
    scope: 'all',
  })
  assert.ok(result.error)
})

test('词频分析支持中英文、大小写归一和停用词过滤', () => {
  const result = analyzeWordFrequency('Tools tools and 数据 数据 的', {
    minLength: 1,
    caseSensitive: false,
    excludeStopWords: true,
  })
  assert.deepEqual(new Map(result.items.map(item => [item.word, item.count])), new Map([
    ['tools', 2],
    ['数据', 2],
  ]))
  assert.equal(result.totalWords, 4)
  assert.equal(result.uniqueWords, 2)
})
