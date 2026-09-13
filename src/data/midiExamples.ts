import { MIDIBuilder, MIDIMessageTypes } from 'spessasynth_core'

export interface MidiExample {
  id: string
  title: string
  description: string
  mood: string
  create: () => ArrayBuffer
}

const PPQ = 480

function addNote(builder: MIDIBuilder, track: number, channel: number, start: number, length: number, pitch: number, velocity = 92) {
  builder.noteOn(start, track, channel, pitch, velocity)
  builder.noteOff(start + length, track, channel, pitch)
}

function addChord(builder: MIDIBuilder, track: number, channel: number, start: number, length: number, pitches: number[], velocity = 76) {
  pitches.forEach(pitch => addNote(builder, track, channel, start, length, pitch, velocity))
}

function addDrumBar(builder: MIDIBuilder, track: number, start: number, lively = false) {
  for (let beat = 0; beat < 4; beat += 1) {
    addNote(builder, track, 9, start + beat * PPQ, 55, beat === 0 || beat === 2 ? 36 : 38, 94)
    addNote(builder, track, 9, start + beat * PPQ, 45, 42, 66)
    if (lively) addNote(builder, track, 9, start + beat * PPQ + PPQ / 2, 40, 42, 54)
  }
}

function buildMorningChords() {
  const builder = new MIDIBuilder({ timeDivision: PPQ, initialTempo: 96, format: 1, name: 'Morning Chords' })
  builder.addEvent(0, 0, MIDIMessageTypes.timeSignature, [4, 2, 24, 8])
  builder.addTrack('Piano Melody')
  builder.addTrack('Warm Strings')
  builder.addTrack('Acoustic Bass')
  builder.addTrack('Light Drums')
  builder.programChange(0, 1, 0, 0)
  builder.programChange(0, 2, 1, 48)
  builder.programChange(0, 3, 2, 32)

  const chords = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]]
  const melody = [72, 76, 79, 76, 69, 72, 76, 72, 65, 69, 72, 69, 67, 71, 74, 79]
  for (let bar = 0; bar < 8; bar += 1) {
    const start = bar * PPQ * 4
    const chord = chords[bar % chords.length]
    addChord(builder, 1, 0, start, PPQ * 3.75, chord, 68)
    addChord(builder, 2, 1, start, PPQ * 3.75, chord.map(note => note + 12), 44)
    addNote(builder, 3, 2, start, PPQ * 1.8, chord[0] - 24, 72)
    addNote(builder, 3, 2, start + PPQ * 2, PPQ * 1.8, chord[2] - 24, 68)
    for (let step = 0; step < 2; step += 1) {
      const index = (bar * 2 + step) % melody.length
      addNote(builder, 1, 0, start + step * PPQ * 2, PPQ * 1.55, melody[index], 92)
    }
    addDrumBar(builder, 4, start)
  }
  return builder.writeMIDI()
}

function buildPixelParade() {
  const builder = new MIDIBuilder({ timeDivision: PPQ, initialTempo: 132, format: 1, name: 'Pixel Parade' })
  builder.addEvent(0, 0, MIDIMessageTypes.timeSignature, [4, 2, 24, 8])
  builder.addTrack('Square Lead')
  builder.addTrack('Synth Bass')
  builder.addTrack('Drum Machine')
  builder.programChange(0, 1, 0, 80)
  builder.programChange(0, 2, 1, 38)

  const pattern = [72, 72, 79, 76, 74, 74, 81, 79, 72, 76, 79, 84, 83, 79, 76, 74]
  const roots = [48, 45, 53, 55]
  for (let bar = 0; bar < 8; bar += 1) {
    const start = bar * PPQ * 4
    for (let step = 0; step < 8; step += 1) {
      addNote(builder, 1, 0, start + step * PPQ / 2, PPQ * 0.37, pattern[(bar * 2 + step) % pattern.length], step % 2 ? 80 : 104)
      addNote(builder, 2, 1, start + step * PPQ / 2, PPQ * 0.42, roots[bar % roots.length], 78)
    }
    addDrumBar(builder, 3, start, true)
  }
  return builder.writeMIDI()
}

function buildNightWaltz() {
  const builder = new MIDIBuilder({ timeDivision: PPQ, initialTempo: 108, format: 1, name: 'Night Waltz' })
  builder.addEvent(0, 0, MIDIMessageTypes.timeSignature, [3, 2, 24, 8])
  builder.addTrack('Moonlight Piano')
  builder.addTrack('Cello')
  builder.addTrack('String Pad')
  builder.programChange(0, 1, 0, 0)
  builder.programChange(0, 2, 1, 42)
  builder.programChange(0, 3, 2, 49)

  const chords = [[57, 60, 64], [55, 59, 62], [53, 57, 60], [52, 56, 59]]
  const melody = [69, 72, 76, 74, 71, 67, 69, 72, 77, 76, 72, 68]
  for (let bar = 0; bar < 8; bar += 1) {
    const start = bar * PPQ * 3
    const chord = chords[bar % chords.length]
    addNote(builder, 1, 0, start, PPQ * 0.85, chord[0] - 12, 74)
    addChord(builder, 1, 0, start + PPQ, PPQ * 0.72, chord, 62)
    addChord(builder, 1, 0, start + PPQ * 2, PPQ * 0.72, chord, 58)
    addNote(builder, 2, 1, start, PPQ * 2.75, chord[0] - 24, 67)
    addChord(builder, 3, 2, start, PPQ * 2.8, chord.map(note => note + 12), 42)
    addNote(builder, 1, 0, start + PPQ / 2, PPQ * 1.7, melody[bar % melody.length], 88)
  }
  return builder.writeMIDI()
}

export const MIDI_EXAMPLES: MidiExample[] = [
  { id: 'morning-chords', title: '晨光和弦', description: '钢琴、弦乐、贝斯与轻鼓的四通道编排', mood: '舒展 · 96 BPM', create: buildMorningChords },
  { id: 'pixel-parade', title: '像素巡游', description: '方波主音、合成贝斯与鼓组的复古律动', mood: '明快 · 132 BPM', create: buildPixelParade },
  { id: 'night-waltz', title: '夜色圆舞曲', description: '适合观察三拍子与分层伴奏的简短片段', mood: '3/4 拍 · 108 BPM', create: buildNightWaltz },
]
