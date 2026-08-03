import assert from 'node:assert/strict'
import test from 'node:test'
import base32 from '../src/components/Tools/RiddleMan/encoders/base32.ts'
import base64 from '../src/components/Tools/RiddleMan/encoders/base64.ts'
import beast from '../src/components/Tools/RiddleMan/encoders/beast.ts'
import foYue from '../src/components/Tools/RiddleMan/encoders/foYue.ts'
import md5 from '../src/components/Tools/RiddleMan/encoders/md5.ts'
import plain from '../src/components/Tools/RiddleMan/encoders/plain.ts'
import ruShiWoWen from '../src/components/Tools/RiddleMan/encoders/ruShiWoWen.ts'

test('谜语人全部可逆方案均能还原中英文原文', async () => {
  const source = '工具 Hello 123'
  for (const encoder of [plain, foYue, ruShiWoWen, beast, base64, base32]) {
    const encoded = await encoder.encode(source)
    assert.equal(await encoder.decode(encoded), source, encoder.label)
  }
})

test('MD5 只生成稳定的 32 位摘要且拒绝反向解码', async () => {
  assert.equal(await md5.encode('hello'), '5d41402abc4b2a76b9719d911017c592')
  await assert.rejects(() => md5.decode('5d41402abc4b2a76b9719d911017c592'), /不可逆/)
})
