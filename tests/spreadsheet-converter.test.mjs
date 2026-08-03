import assert from 'node:assert/strict'
import test from 'node:test'
import {
  analyzeSheet,
  detectDelimiter,
  makeUniqueSheetName,
  parseDelimited,
  parseJsonSheets,
  rowsToJson,
  serializeDelimited,
  sheetsToJson,
} from '../src/utils/spreadsheetConverter.ts'

test('CSV 支持引号、逗号、换行和尾部空格无损往返', () => {
  const csv = 'name,note,value\r\nAlice,"hello, world",12\r\nBob,"line 1\nline 2"," 08 "'
  const rows = parseDelimited(csv)
  assert.deepEqual(rows[2], ['Bob', 'line 1\nline 2', ' 08 '])
  assert.deepEqual(parseDelimited(serializeDelimited(rows)), rows)
})

test('自动识别 TSV、分号和管道分隔数据', () => {
  assert.equal(detectDelimiter('a\tb\n1\t2'), '\t')
  assert.equal(detectDelimiter('a;b\n1;2'), ';')
  assert.equal(detectDelimiter('a|b\n1|2'), '|')
})

test('JSON 对象数组、多工作表对象和 JSON Lines 可转换为表格', () => {
  const sheets = parseJsonSheets('{"users":[{"id":1,"name":"张三"}],"orders":[["id","amount"],["A1",20]]}')
  assert.equal(sheets.length, 2)
  assert.deepEqual(sheets[0].rows, [['id', 'name'], ['1', '张三']])
  assert.deepEqual(sheets[1].rows, [['id', 'amount'], ['A1', '20']])
  assert.deepEqual(parseJsonSheets('{"id":1}\n{"id":2}')[0].rows, [['id'], ['1'], ['2']])
})

test('粘贴 CSV 可转成表格并继续互转为 JSON', () => {
  const csv = '名称,数量,启用\n苹果,12,true\n香蕉,8,false'
  const gridRows = parseDelimited(csv)
  const json = JSON.stringify(rowsToJson(gridRows))
  assert.deepEqual(parseJsonSheets(json)[0].rows, gridRows)
})

test('表头去重、类型推断和多工作表 JSON 输出保持稳定', () => {
  const rows = [['code', 'code', 'enabled'], ['001', '12', 'TRUE'], ['', '', 'FALSE']]
  assert.deepEqual(rowsToJson(rows), [
    { code: '001', code_2: 12, enabled: true },
    { code: null, code_2: null, enabled: false },
  ])
  assert.deepEqual(sheetsToJson([{ name: 'Sheet A', rows }], { allSheets: true }), {
    'Sheet A': [
      { code: '001', code_2: 12, enabled: true },
      { code: null, code_2: null, enabled: false },
    ],
  })
})

test('工作表分析和重名处理提供编辑提示', () => {
  const analysis = analyzeSheet([['name', 'name', 'score'], ['A', '', '10'], ['B', 'ok', '20']])
  assert.equal(analysis.rows, 2)
  assert.equal(analysis.columns, 3)
  assert.deepEqual(analysis.duplicateHeaders, ['name'])
  assert.equal(analysis.numericColumns, 1)
  assert.equal(makeUniqueSheetName(['Sheet1', 'Sheet1 2'], 'Sheet1'), 'Sheet1 3')
})
