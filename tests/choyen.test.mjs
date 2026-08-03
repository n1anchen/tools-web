import test from 'node:test'
import assert from 'node:assert/strict'
import { buildChoyenFilename, calculateChoyenOutputBounds } from '../src/components/Tools/Choyen5000/choyen.ts'

test('金属标题导出范围覆盖上下两排文字并保留安全留白', () => {
  assert.deepEqual(calculateChoyenOutputBounds(70, 480, 250, 520), { width: 794, height: 290 })
  assert.deepEqual(calculateChoyenOutputBounds(40, 80, 60, 100, 240), { width: 320, height: 240 })
})

test('金属标题文件名会移除非法字符并提供空文本回退', () => {
  assert.equal(buildChoyenFilename('马上/下班', '我想要!'), '马上-下班-我想要!-5000-style.png')
  assert.equal(buildChoyenFilename('', ''), 'impact-title-5000-style.png')
})
