import test from 'node:test'
import assert from 'node:assert/strict'
import { MIDI_EXAMPLES } from '../src/data/midiExamples.ts'
import { formatMidiTime, midiNoteName, parseMidiBuffer } from '../src/utils/midiProject.ts'

test('内置 MIDI 示例都可以解析，并包含多个乐器通道', () => {
  assert.equal(MIDI_EXAMPLES.length, 3)
  for (const example of MIDI_EXAMPLES) {
    const buffer = example.create()
    const project = parseMidiBuffer(buffer, `${example.id}.mid`, 'example')
    assert.ok(buffer.byteLength > 100)
    assert.ok(project.duration > 5)
    assert.ok(project.noteCount > 20)
    assert.ok(project.channels.length >= 3)
    assert.ok(project.channels.every(channel => channel.notes.every(note => note.end >= note.start)))
  }
})

test('示例保留速度、拍号、鼓组和 GM 乐器信息', () => {
  const morning = parseMidiBuffer(MIDI_EXAMPLES[0].create(), 'morning.mid', 'example')
  const pixel = parseMidiBuffer(MIDI_EXAMPLES[1].create(), 'pixel.mid', 'example')
  const waltz = parseMidiBuffer(MIDI_EXAMPLES[2].create(), 'waltz.mid', 'example')

  assert.equal(morning.tempo, 96)
  assert.equal(pixel.tempo, 132)
  assert.equal(waltz.timeSignature, '3/4')
  assert.equal(morning.channels.find(channel => channel.displayChannel === 10)?.isDrum, true)
  assert.equal(pixel.channels.find(channel => channel.channel === 0)?.instrument, '方波主音')
})

test('MIDI 显示辅助格式保持稳定', () => {
  assert.equal(formatMidiTime(0), '0:00')
  assert.equal(formatMidiTime(65.8), '1:05')
  assert.equal(formatMidiTime(3661), '1:01:01')
  assert.equal(midiNoteName(60), 'C4')
  assert.equal(midiNoteName(73), 'C♯5')
})
