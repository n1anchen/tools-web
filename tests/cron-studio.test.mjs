import test from 'node:test'
import assert from 'node:assert/strict'
import { buildCronExpression, inspectCronFields } from '../src/utils/cronStudio.ts'

test('CRON 生成器覆盖常用周期并约束越界输入', () => {
  assert.equal(buildCronExpression({ cycle: 'everyDay', hour: 9, minute: 30 }), '30 9 * * *')
  assert.equal(buildCronExpression({ cycle: 'weekdays', hour: 18, minute: 5 }), '5 18 * * 1-5')
  assert.equal(buildCronExpression({ cycle: 'everyNSeconds', interval: 0 }), '*/1 * * * * *')
  assert.equal(buildCronExpression({ cycle: 'everyMonth', dayOfMonth: 40 }), '0 9 31 * *')
})

test('CRON 字段检查能区分标准五位与含秒六位表达式', () => {
  assert.equal(inspectCronFields('*/5 * * * *').dialect, '5 位 · 标准')
  assert.deepEqual(inspectCronFields('0 */10 * * * *').fields.map(field => field.label), ['秒', '分钟', '小时', '日期', '月份', '星期'])
  assert.equal(inspectCronFields('* * *').fields.length, 0)
})
