import { BasicMIDI, MIDIMessageTypes } from 'spessasynth_core'

export type MidiSource = 'example' | 'upload'

export interface MidiNote {
  channel: number
  pitch: number
  start: number
  duration: number
  end: number
  velocity: number
}

export interface MidiChannel {
  channel: number
  displayChannel: number
  name: string
  instrument: string
  program: number
  isDrum: boolean
  color: string
  notes: MidiNote[]
  noteCount: number
  minPitch: number
  maxPitch: number
  trackNames: string[]
}

export interface MidiProject {
  id: string
  name: string
  fileName: string
  source: MidiSource
  size: number
  buffer: ArrayBuffer
  duration: number
  format: 0 | 1 | 2
  tempo: number
  timeSignature: string
  channels: MidiChannel[]
  noteCount: number
  minPitch: number
  maxPitch: number
  isKaraoke: boolean
  isMultiPort: boolean
}

export const MIDI_CHANNEL_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4',
  '#6366f1', '#d946ef', '#f43f5e', '#84cc16',
  '#10b981', '#0ea5e9', '#a855f7', '#f59e0b',
]

const GM_INSTRUMENTS = [
  '大钢琴', '明亮钢琴', '电钢琴', '酒吧钢琴', '电钢琴 1', '电钢琴 2', '拨弦古钢琴', '击弦古钢琴',
  '钢片琴', '钟琴', '八音盒', '颤音琴', '马林巴', '木琴', '管钟', '扬琴',
  '拉杆风琴', '打击风琴', '摇滚风琴', '教堂风琴', '簧风琴', '手风琴', '口琴', '探戈手风琴',
  '尼龙弦吉他', '钢弦吉他', '爵士电吉他', '清音电吉他', '闷音电吉他', '过载吉他', '失真吉他', '吉他泛音',
  '原声贝斯', '指弹电贝斯', '拨片电贝斯', '无品贝斯', '拍弦贝斯 1', '拍弦贝斯 2', '合成贝斯 1', '合成贝斯 2',
  '小提琴', '中提琴', '大提琴', '低音提琴', '颤音弦乐', '拨奏弦乐', '竖琴', '定音鼓',
  '弦乐合奏 1', '弦乐合奏 2', '合成弦乐 1', '合成弦乐 2', '人声“啊”', '人声“嘟”', '合成人声', '乐队重击',
  '小号', '长号', '大号', '弱音小号', '法国号', '铜管组', '合成铜管 1', '合成铜管 2',
  '高音萨克斯', '中音萨克斯', '次中音萨克斯', '上低音萨克斯', '双簧管', '英国管', '巴松管', '单簧管',
  '短笛', '长笛', '竖笛', '排箫', '吹瓶声', '尺八', '哨声', '陶笛',
  '方波主音', '锯齿波主音', '汽笛主音', '沙哑主音', '吉他主音', '人声主音', '五度主音', '贝斯主音',
  '新世纪音色', '温暖音色', '复音合成音色', '合唱音色', '弓弦音色', '金属音色', '光环音色', '扫弦音色',
  '雨声效果', '音轨效果', '水晶效果', '气氛效果', '明亮效果', '精灵效果', '回声效果', '科幻效果',
  '西塔琴', '班卓琴', '三味线', '十三弦筝', '卡林巴', '风笛', '古提琴', '唢呐',
  '叮当铃', '阿哥哥鼓', '钢鼓', '木鱼', '太鼓', '旋律鼓', '合成鼓', '反向钹',
  '吉他品噪', '呼吸声', '海浪声', '鸟鸣', '电话铃', '直升机', '掌声', '枪声',
] as const

function makeId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `midi-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function cleanTitle(value: string | undefined, fallback: string) {
  const normalized = value?.replace(/[\u0000-\u001f]+/g, ' ').trim()
  return normalized || fallback.replace(/\.(mid|midi|smf|kar|rmi)$/i, '') || '未命名 MIDI'
}

function inferChannelName(trackNames: string[], instrument: string, displayChannel: number) {
  const usefulName = trackNames.find(name => name && !/^(track|midi|untitled|conductor)[ _-]*\d*$/i.test(name))
  if (usefulName) return usefulName
  return displayChannel === 10 ? '鼓组' : instrument
}

export function parseMidiBuffer(
  input: ArrayBuffer,
  fileName: string,
  source: MidiSource = 'upload',
  size = input.byteLength,
): MidiProject {
  const buffer = input.slice(0)
  const midi = BasicMIDI.fromArrayBuffer(buffer.slice(0), fileName)
  const noteTimes = midi.getNoteTimes(0.08)
  const programs = new Array<number>(16).fill(0)
  const trackNames = Array.from({ length: 16 }, () => new Set<string>())
  let timeSignature = '4/4'
  let earliestSignatureTick = Number.POSITIVE_INFINITY

  for (const track of midi.tracks) {
    const name = track.name?.trim()
    for (const channel of track.channels) {
      if (channel >= 0 && channel < 16 && name) trackNames[channel].add(name)
    }
    for (const event of track.events) {
      const family = event.statusByte & 0xf0
      const channel = event.statusByte & 0x0f
      if (family === MIDIMessageTypes.programChange && event.data.length && channel < 16) {
        programs[channel] = event.data[0] ?? 0
      }
      if (event.statusByte === MIDIMessageTypes.timeSignature && event.ticks < earliestSignatureTick && event.data.length >= 2) {
        timeSignature = `${event.data[0]}/${2 ** event.data[1]}`
        earliestSignatureTick = event.ticks
      }
    }
  }

  const channels: MidiChannel[] = []
  for (let channel = 0; channel < 16; channel += 1) {
    const notes = (noteTimes[channel] || []).map(note => ({
      channel,
      pitch: note.midiNote,
      start: note.start,
      duration: note.length,
      end: note.start + note.length,
      velocity: note.velocity,
    }))
    if (!notes.length && !trackNames[channel].size) continue

    const program = programs[channel]
    const isDrum = channel === 9
    const instrument = isDrum ? '标准鼓组' : (GM_INSTRUMENTS[program] || `GM 音色 ${program + 1}`)
    const names = [...trackNames[channel]]
    const pitches = notes.map(note => note.pitch)
    channels.push({
      channel,
      displayChannel: channel + 1,
      name: inferChannelName(names, instrument, channel + 1),
      instrument,
      program,
      isDrum,
      color: MIDI_CHANNEL_COLORS[channel],
      notes,
      noteCount: notes.length,
      minPitch: pitches.length ? Math.min(...pitches) : 0,
      maxPitch: pitches.length ? Math.max(...pitches) : 127,
      trackNames: names,
    })
  }

  const allNotes = channels.flatMap(channel => channel.notes)
  const tempo = [...midi.tempoChanges].sort((a, b) => a.ticks - b.ticks)[0]?.tempo || 120
  return {
    id: makeId(),
    name: cleanTitle(midi.getName(), fileName),
    fileName,
    source,
    size,
    buffer,
    duration: Math.max(0, midi.duration),
    format: midi.format,
    tempo: Math.round(tempo * 10) / 10,
    timeSignature,
    channels,
    noteCount: allNotes.length,
    minPitch: allNotes.length ? Math.min(...allNotes.map(note => note.pitch)) : 0,
    maxPitch: allNotes.length ? Math.max(...allNotes.map(note => note.pitch)) : 127,
    isKaraoke: midi.isKaraokeFile,
    isMultiPort: midi.isMultiPort,
  }
}

export function formatMidiTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const whole = Math.floor(seconds)
  const hours = Math.floor(whole / 3600)
  const minutes = Math.floor((whole % 3600) / 60)
  const secs = whole % 60
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${minutes}:${String(secs).padStart(2, '0')}`
}

export function midiNoteName(pitch: number) {
  const names = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']
  return `${names[((pitch % 12) + 12) % 12]}${Math.floor(pitch / 12) - 1}`
}
