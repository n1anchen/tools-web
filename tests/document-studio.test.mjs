import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'

const source = fs.readFileSync(new URL('../src/utils/documentStudio.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source
  .replace("import { decodeHtmlEntities } from '@/utils/textTools'", `const decodeHtmlEntities = (text) => text.replace(/&(#x[0-9a-f]+|#\\d+|amp|lt|gt|quot|apos|nbsp);/gi, (match, entity) => {
    const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\\u00a0' }
    if (entity[0] === '#') {
      const isHex = entity[1].toLowerCase() === 'x'
      const value = Number.parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10)
      return Number.isFinite(value) && value <= 0x10ffff ? String.fromCodePoint(value) : match
    }
    return named[entity.toLowerCase()] ?? match
  })`), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
})
const module = { exports: {} }
new Function('module', 'exports', outputText)(module, module.exports)
const {
  buildDocumentFilename,
  buildStandaloneHtml,
  countMarkdownHeadings,
  formatDocumentBytes,
  htmlToPlainText,
  plainTextToHtml,
} = module.exports

test('文档文件名会清理非法字符并保留目标扩展名', () => {
  assert.equal(buildDocumentFilename(' 周报: 8/3.md ', 'md'), '周报- 8-3.md')
  assert.equal(buildDocumentFilename('?.html', 'html'), 'untitled.html')
})

test('Markdown 标题统计会忽略代码围栏中的井号', () => {
  const markdown = '# 一级\n## 二级\n```md\n# 示例\n```\n正文'
  assert.equal(countMarkdownHeadings(markdown), 2)
})

test('富文本与纯文本转换保留段落并转义危险标记', () => {
  assert.equal(htmlToPlainText('<h1>标题</h1><p>A &amp; B<br>第二行</p>'), '标题\n\nA & B\n第二行')
  assert.equal(plainTextToHtml('<script>\n第二行'), '<p>&lt;script&gt;<br>第二行</p>')
})

test('独立 HTML 导出转义标题并保留正文', () => {
  const output = buildStandaloneHtml('<周报>', '<h1>正文</h1>')
  assert.match(output, /<title>&lt;周报&gt;<\/title>/)
  assert.match(output, /<h1>正文<\/h1>/)
  assert.match(output, /<meta name="viewport"/)
})

test('文档体积使用易读单位', () => {
  assert.equal(formatDocumentBytes(0), '0 B')
  assert.equal(formatDocumentBytes(1536), '1.5 KB')
  assert.equal(formatDocumentBytes(2 * 1024 * 1024), '2.00 MB')
})
