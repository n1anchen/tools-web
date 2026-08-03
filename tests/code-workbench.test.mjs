import test from 'node:test'
import assert from 'node:assert/strict'
import {
  analyzeCss,
  analyzeJavaScript,
  analyzeJson,
  analyzeMarkup,
  escapeJsonString,
  formatMarkup,
  formatJsonDocument,
  getCodeMetrics,
  getCompressionReport,
  minifyJsonDocument,
  minifyMarkup,
  unescapeJsonString,
} from '../src/utils/codeWorkbench.ts'

test('JSON 格式化、压缩和字符串转义不会破坏数据', () => {
  const source = '{"message":"hello  world","nested":{"z":1,"a":2},"path":"C:\\\\temp"}'
  const formatted = formatJsonDocument(source, 2, true)
  assert.ok(formatted.indexOf('"a"') < formatted.indexOf('"z"'))
  assert.deepEqual(JSON.parse(minifyJsonDocument(formatted)), JSON.parse(source))

  const text = '第一行\n"quoted" \\ path 😀'
  assert.equal(unescapeJsonString(escapeJsonString(text)), text)
})

test('JSON 诊断返回结构信息与错误位置', () => {
  const valid = analyzeJson('{"items":[{"id":1}],"ok":true}')
  assert.equal(valid.valid, true)
  assert.equal(valid.rootType, 'Object')
  assert.equal(valid.entries, 2)
  assert.equal(valid.depth, 3)

  const invalid = analyzeJson('{\n  "ok": true,\n  "items": [1,]\n}')
  assert.equal(invalid.valid, false)
  assert.ok(invalid.line >= 1)
  assert.ok(invalid.column >= 1)
})

test('HTML 保守压缩会保护引号、预格式文本、脚本和条件注释', () => {
  const source = `<div class="card  featured">\n  Hello   <span>world</span>\n</div>\n<pre>line  one\n  line two</pre>\n<script>const message = "a   b";\nconsole.log(message);</script>\n<!-- remove me --><!--[if IE]>keep<![endif]-->`
  const result = minifyMarkup(source, false)
  assert.match(result, /class="card  featured"/)
  assert.match(result, /Hello <span>world<\/span>/)
  assert.match(result, /<pre>line  one\n  line two<\/pre>/)
  assert.match(result, /const message = "a   b";\nconsole\.log/)
  assert.doesNotMatch(result, /remove me/)
  assert.match(result, /\[if IE\]/)

  const formatted = formatMarkup('<main><section><h1>Title</h1><img src="a.png"></section></main>', 2)
  assert.equal(formatted, '<main>\n  <section>\n    <h1>\n      Title\n    </h1>\n    <img src="a.png">\n  </section>\n</main>')
})

test('代码指标和语言统计提供工作台摘要', () => {
  const metrics = getCodeMetrics('a\n\n中')
  assert.deepEqual(metrics, { characters: 4, bytes: 6, lines: 3, nonEmptyLines: 2 })

  const markup = analyzeMarkup('<main><h1>Title</h1><!-- note --><style>.a{color:red}</style></main>')
  assert.equal(markup.headings, 1)
  assert.equal(markup.comments, 1)
  assert.equal(markup.styles, 1)

  const css = analyzeCss(':root{--brand:#2563eb}.card{color:var(--brand)}@media(min-width:40rem){.card{display:grid}}')
  assert.equal(css.variables, 1)
  assert.equal(css.mediaQueries, 1)
  assert.equal(css.colors, 1)

  const js = analyzeJavaScript('import x from "x";\nexport function run(){ console.log(x) }')
  assert.equal(js.imports, 1)
  assert.equal(js.exports, 1)
  assert.equal(js.functions, 1)
  assert.equal(js.consoleCalls, 1)

  assert.deepEqual(getCompressionReport('1234567890', '12345'), { saved: 5, percent: 50 })
})
