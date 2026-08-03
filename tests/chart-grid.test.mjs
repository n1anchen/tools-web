import test from 'node:test'
import assert from 'node:assert/strict'
import { gridColumnLabel, mergeGridPaste, parseChartGrid, parseSpreadsheetClipboard, serializeChartGrid } from '../src/utils/chartGrid.ts'

test('图表表格可在 CSV 和二维单元格间无损往返', () => {
  const csv = '名称,数值,备注\n"华东,直营",120,"含""重点""客户"\n华南,98,'
  const grid = parseChartGrid(csv)
  assert.deepEqual(grid[1], ['华东,直营', '120', '含"重点"客户'])
  assert.deepEqual(parseChartGrid(serializeChartGrid(grid)), grid)
})

test('Excel 制表符区域可从任意单元格开始粘贴并自动扩展', () => {
  const pasted = parseSpreadsheetClipboard('周一\t120\t80\n周二\t132\t96\n')
  const result = mergeGridPaste([['分类', '自然流量']], pasted, 1, 0)
  assert.deepEqual(result, [['分类', '自然流量', ''], ['周一', '120', '80'], ['周二', '132', '96']])
})

test('表格序列化会移除尾部空白区但保留中间空单元格', () => {
  const result = serializeChartGrid([['分类', '系列 A', '系列 B'], ['周一', '12', ''], ['', '', ''], ['', '', '']])
  assert.equal(result, '分类,系列 A,系列 B\n周一,12,')
  assert.equal(gridColumnLabel(0), 'A')
  assert.equal(gridColumnLabel(27), 'AB')
})
