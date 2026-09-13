import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import { Sequencer, WorkletSynthesizer } from 'spessasynth_lib'
import type { MidiProject } from '@/utils/midiProject'

type EngineState = 'idle' | 'loading' | 'ready' | 'error'
export type MidiLoopMode = 'off' | 'one' | 'all'

const WORKLET_URL = '/worklets/spessasynth_processor.min.js'
const SOUNDFONT_URL = '/midi/soundfonts/GeneralUserGS.sf3'

async function fetchArrayBufferWithProgress(url: string, onProgress: (progress: number) => void) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`音色库请求失败（HTTP ${response.status}）`)
  const total = Number(response.headers.get('content-length')) || 0
  if (!response.body || !total) {
    const result = await response.arrayBuffer()
    onProgress(100)
    return result
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let received = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    received += value.byteLength
    onProgress(Math.min(99, Math.round(received / total * 100)))
  }
  const merged = new Uint8Array(received)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }
  onProgress(100)
  return merged.buffer
}

export function useMidiPlayer(projects: Ref<MidiProject[]>, selectedId: Ref<string | null>) {
  const engineState = ref<EngineState>('idle')
  const engineMessage = ref('点击播放后加载通用音色库')
  const soundfontProgress = ref(0)
  const currentTime = ref(0)
  const isPlaying = ref(false)
  const playbackRate = ref(1)
  const loopMode = ref<MidiLoopMode>('off')
  const shuffle = ref(false)
  const masterVolume = ref(0.82)
  const masterMuted = ref(false)
  const outputLevel = ref(0)
  const mutedChannels = ref<Set<number>>(new Set())
  const soloChannels = ref<Set<number>>(new Set())
  const channelGains = ref<Record<number, number>>({})

  let context: AudioContext | null = null
  let synthesizer: WorkletSynthesizer | null = null
  let sequencer: Sequencer | null = null
  let masterGainNode: GainNode | null = null
  let analyserNode: AnalyserNode | null = null
  let analyserData: Uint8Array<ArrayBuffer> | null = null
  let initializing: Promise<void> | null = null
  let loadedProjectId: string | null = null
  let pendingAutoplay = false
  let frameId = 0

  const currentProject = computed(() => projects.value.find(project => project.id === selectedId.value) || null)
  const engineLabel = computed(() => {
    if (engineState.value === 'ready') return 'SpessaSynth · General MIDI'
    if (engineState.value === 'loading') return `音色载入 ${soundfontProgress.value}%`
    if (engineState.value === 'error') return '音频引擎不可用'
    return '按需启动音频引擎'
  })

  function applyMasterVolume() {
    const gain = masterMuted.value ? 0 : masterVolume.value
    if (masterGainNode && context) masterGainNode.gain.setTargetAtTime(gain, context.currentTime, 0.01)
    else synthesizer?.setSystemParameter('gain', gain)
  }

  function applyChannelMix() {
    if (!synthesizer) return
    const hasSolo = soloChannels.value.size > 0
    for (let channel = 0; channel < 16; channel += 1) {
      const muted = mutedChannels.value.has(channel) || (hasSolo && !soloChannels.value.has(channel))
      synthesizer.midiChannels[channel]?.setSystemParameter('isMuted', muted)
      synthesizer.midiChannels[channel]?.setSystemParameter('gain', channelGains.value[channel] ?? 1)
    }
  }

  function attachSequencerEvents(instance: Sequencer) {
    instance.eventHandler.addEvent('songChange', 'tools-midi-song-change', () => {
      currentTime.value = 0
      instance.playbackRate = playbackRate.value
      instance.loopCount = loopMode.value === 'one' ? -1 : 0
      applyMasterVolume()
      applyChannelMix()
      engineMessage.value = '音频引擎已就绪'
      if (pendingAutoplay) {
        pendingAutoplay = false
        instance.play()
        isPlaying.value = true
      }
    })
    instance.eventHandler.addEvent('songEnded', 'tools-midi-song-ended', () => {
      isPlaying.value = false
      if (loopMode.value === 'all' && projects.value.length > 1) {
        void next(true)
      } else {
        currentTime.value = currentProject.value?.duration || 0
      }
    })
    instance.eventHandler.addEvent('timeChange', 'tools-midi-time-change', time => {
      currentTime.value = Math.max(0, time)
    })
    instance.eventHandler.addEvent('midiError', 'tools-midi-error', error => {
      engineState.value = 'error'
      engineMessage.value = error.message || '无法播放这个 MIDI 文件'
      isPlaying.value = false
    })
  }

  function getOrCreateAudioContext() {
    if (context && context.state !== 'closed') return context
    if (!window.AudioContext || !('audioWorklet' in AudioContext.prototype)) {
      throw new Error('当前浏览器不支持 AudioWorklet，请升级浏览器后重试')
    }
    const createdContext = new AudioContext()
    context = createdContext
    createdContext.addEventListener('statechange', () => {
      if (createdContext.state === 'suspended' && engineState.value === 'ready') {
        if (isPlaying.value) sequencer?.pause()
        isPlaying.value = false
        engineMessage.value = '浏览器已暂停音频，点击播放即可恢复'
      }
    })
    return context
  }

  async function ensureEngine() {
    if (engineState.value === 'ready' && context && synthesizer && sequencer) return
    if (initializing) return initializing

    initializing = (async () => {
      try {
        const audioContext = getOrCreateAudioContext()
        engineState.value = 'loading'
        engineMessage.value = '正在准备音频处理器…'
        soundfontProgress.value = 0
        await audioContext.audioWorklet.addModule(WORKLET_URL)
        synthesizer = new WorkletSynthesizer(audioContext, { eventsEnabled: true })
        masterGainNode = audioContext.createGain()
        analyserNode = audioContext.createAnalyser()
        analyserNode.fftSize = 256
        analyserNode.smoothingTimeConstant = 0.72
        analyserData = new Uint8Array(analyserNode.frequencyBinCount)
        synthesizer.connect(masterGainNode)
        masterGainNode.connect(analyserNode)
        analyserNode.connect(audioContext.destination)
        engineMessage.value = '正在加载 GeneralUser GS 音色库…'
        const soundfont = await fetchArrayBufferWithProgress(SOUNDFONT_URL, value => { soundfontProgress.value = value })
        await synthesizer.soundBankManager.addSoundBank(soundfont, 'general-user-gs')
        await synthesizer.isReady
        synthesizer.setLogLevel(false, false, false)
        sequencer = new Sequencer(synthesizer, { skipToFirstNoteOn: false, initialPlaybackRate: playbackRate.value })
        attachSequencerEvents(sequencer)
        applyMasterVolume()
        engineState.value = 'ready'
        engineMessage.value = '音频引擎已就绪'
      } catch (error) {
        engineState.value = 'error'
        engineMessage.value = error instanceof Error ? error.message : '音频引擎初始化失败'
        synthesizer?.destroy()
        synthesizer = null
        sequencer = null
        masterGainNode?.disconnect()
        analyserNode?.disconnect()
        masterGainNode = null
        analyserNode = null
        analyserData = null
        if (context) await context.close().catch(() => {})
        context = null
        throw error
      } finally {
        initializing = null
      }
    })()
    return initializing
  }

  function loadCurrent(autoplay: boolean) {
    const project = currentProject.value
    if (!project || !sequencer) return
    sequencer.pause()
    isPlaying.value = false
    currentTime.value = 0
    pendingAutoplay = autoplay
    loadedProjectId = project.id
    sequencer.loadNewSongList([{ binary: project.buffer.slice(0), fileName: project.fileName }])
  }

  async function play() {
    if (!currentProject.value) return
    try {
      // resume() 必须在点击事件的同步调用链里触发；等音色下载完再调用会丢失 Safari 等浏览器的用户激活权限。
      const audioContext = getOrCreateAudioContext()
      const earlyResume = audioContext.resume().catch(() => {})
      await ensureEngine()
      await earlyResume
      if (audioContext.state !== 'running') {
        engineMessage.value = '浏览器拦截了音频，请再点击一次播放'
        isPlaying.value = false
        return
      }
      if (!sequencer) return
      if (loadedProjectId !== currentProject.value.id) {
        loadCurrent(true)
        return
      }
      if (sequencer.isFinished || currentTime.value >= (currentProject.value.duration - 0.03)) {
        sequencer.currentTime = 0
        currentTime.value = 0
      }
      sequencer.play()
      isPlaying.value = true
    } catch {
      isPlaying.value = false
    }
  }

  function pause() {
    pendingAutoplay = false
    sequencer?.pause()
    isPlaying.value = false
  }

  async function togglePlayback() {
    if (isPlaying.value) pause()
    else await play()
  }

  function seek(value: number) {
    const duration = currentProject.value?.duration || 0
    const target = Math.min(duration, Math.max(0, value))
    currentTime.value = target
    if (sequencer && loadedProjectId === currentProject.value?.id) sequencer.currentTime = target
  }

  function chooseProject(id: string, autoplay = isPlaying.value) {
    if (id === selectedId.value) return
    pendingAutoplay = autoplay
    selectedId.value = id
    mutedChannels.value = new Set()
    soloChannels.value = new Set()
    channelGains.value = {}
    if (sequencer) loadCurrent(autoplay)
  }

  async function previous(autoplay = isPlaying.value) {
    if (!projects.value.length) return
    const index = Math.max(0, projects.value.findIndex(project => project.id === selectedId.value))
    const target = (index - 1 + projects.value.length) % projects.value.length
    chooseProject(projects.value[target].id, autoplay)
  }

  async function next(autoplay = isPlaying.value) {
    if (!projects.value.length) return
    const index = Math.max(0, projects.value.findIndex(project => project.id === selectedId.value))
    let target = (index + 1) % projects.value.length
    if (shuffle.value && projects.value.length > 1) {
      do target = Math.floor(Math.random() * projects.value.length)
      while (target === index)
    }
    chooseProject(projects.value[target].id, autoplay)
  }

  function setPlaybackRate(value: number) {
    playbackRate.value = value
    if (sequencer) sequencer.playbackRate = value
  }

  function setLoopMode(value: MidiLoopMode) {
    loopMode.value = value
    if (sequencer) sequencer.loopCount = value === 'one' ? -1 : 0
  }

  function setMasterVolume(value: number) {
    masterVolume.value = value
    applyMasterVolume()
  }

  function toggleMasterMute() {
    masterMuted.value = !masterMuted.value
    applyMasterVolume()
  }

  function toggleChannelMute(channel: number) {
    const nextSet = new Set(mutedChannels.value)
    if (nextSet.has(channel)) nextSet.delete(channel)
    else nextSet.add(channel)
    mutedChannels.value = nextSet
    applyChannelMix()
  }

  function toggleChannelSolo(channel: number) {
    const nextSet = new Set(soloChannels.value)
    if (nextSet.has(channel)) nextSet.delete(channel)
    else nextSet.add(channel)
    soloChannels.value = nextSet
    applyChannelMix()
  }

  function setChannelGain(channel: number, value: number) {
    channelGains.value = { ...channelGains.value, [channel]: value }
    applyChannelMix()
  }

  function tick() {
    if (sequencer && loadedProjectId === currentProject.value?.id && isPlaying.value) {
      const smoothTime = sequencer.currentHighResolutionTime
      const nextTime = Number.isFinite(smoothTime) ? smoothTime : sequencer.currentTime
      currentTime.value = Math.max(0, Math.min(currentProject.value.duration, nextTime))
    }
    if (analyserNode && analyserData && isPlaying.value) {
      analyserNode.getByteTimeDomainData(analyserData)
      let peak = 0
      for (const sample of analyserData) peak = Math.max(peak, Math.abs(sample - 128) / 128)
      outputLevel.value = Math.min(1, peak * 2.4)
    } else {
      outputLevel.value *= 0.82
    }
    frameId = requestAnimationFrame(tick)
  }

  watch(masterVolume, applyMasterVolume)
  onMounted(() => { frameId = requestAnimationFrame(tick) })
  onBeforeUnmount(() => {
    cancelAnimationFrame(frameId)
    pendingAutoplay = false
    sequencer?.pause()
    synthesizer?.destroy()
    masterGainNode?.disconnect()
    analyserNode?.disconnect()
    if (context) void context.close()
    sequencer = null
    synthesizer = null
    context = null
    masterGainNode = null
    analyserNode = null
    analyserData = null
  })

  return {
    currentProject,
    currentTime,
    isPlaying,
    playbackRate,
    loopMode,
    shuffle,
    masterVolume,
    masterMuted,
    outputLevel,
    mutedChannels,
    soloChannels,
    channelGains,
    engineState,
    engineMessage,
    engineLabel,
    soundfontProgress,
    chooseProject,
    togglePlayback,
    play,
    pause,
    seek,
    previous,
    next,
    setPlaybackRate,
    setLoopMode,
    setMasterVolume,
    toggleMasterMute,
    toggleChannelMute,
    toggleChannelSolo,
    setChannelGain,
  }
}
