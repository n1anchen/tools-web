<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  ArrowLeftBold,
  ArrowRightBold,
  Delete,
  FullScreen,
  Hide,
  UploadFilled,
  VideoPause,
  VideoPlay,
  View,
} from '@element-plus/icons-vue'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import MetricsBar from '@/components/Common/MetricsBar.vue'
import MidiVisualizer from './MidiVisualizer.vue'
import { MIDI_EXAMPLES, type MidiExample } from '@/data/midiExamples'
import { useMidiPlayer, type MidiLoopMode } from '@/composables/useMidiPlayer'
import { formatBytes } from '@/utils/file'
import { formatMidiTime, midiNoteName, parseMidiBuffer, type MidiProject } from '@/utils/midiProject'

const MAX_FILE_SIZE = 20 * 1024 * 1024
const MAX_PLAYLIST_SIZE = 20
const ACCEPTED_EXTENSIONS = /\.(mid|midi|smf|kar|rmi)$/i

const projects = ref<MidiProject[]>([])
const selectedId = ref<string | null>(null)
const selectedChannel = ref<number | null>(null)
const hiddenChannels = ref<Set<number>>(new Set())
const dragging = ref(false)
const isImporting = ref(false)
const viewMode = ref<'roll' | 'waterfall'>('roll')
const fileInput = ref<HTMLInputElement | null>(null)
const stageEl = ref<HTMLElement | null>(null)

const player = useMidiPlayer(projects, selectedId)
const {
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
} = player

const visibleChannelIds = computed(() => (currentProject.value?.channels || [])
  .filter(channel => !hiddenChannels.value.has(channel.channel))
  .map(channel => channel.channel))
const activeNotes = computed(() => (currentProject.value?.channels || []).reduce((count, channel) => (
  count + channel.notes.filter(note => note.start <= currentTime.value && note.end >= currentTime.value).length
), 0))
const heroMetrics = computed(() => [
  { label: '乐器通道', value: currentProject.value?.channels.length || '—' },
  { label: '音符', value: currentProject.value?.noteCount || '—' },
  { label: '速度', value: currentProject.value ? `${currentProject.value.tempo} BPM` : '—' },
  { label: '时长', value: currentProject.value ? formatMidiTime(currentProject.value.duration) : '—' },
])
const progress = computed({
  get: () => currentTime.value,
  set: value => player.seek(value),
})
const volumePercent = computed({
  get: () => Math.round(masterVolume.value * 100),
  set: value => player.setMasterVolume(value / 100),
})

function addExample(example: MidiExample, notify = true) {
  const fileName = `example-${example.id}.mid`
  const existing = projects.value.find(project => project.fileName === fileName)
  if (existing) {
    player.chooseProject(existing.id)
    if (notify) ElMessage.info('这个示例已经在播放列表中')
    return
  }
  const project = parseMidiBuffer(example.create(), fileName, 'example')
  project.name = example.title
  projects.value.push(project)
  if (!selectedId.value) selectedId.value = project.id
  else player.chooseProject(project.id)
  if (notify) ElMessage.success(`已添加示例「${example.title}」`)
}

async function importFiles(files: File[]) {
  dragging.value = false
  if (!files.length) return
  isImporting.value = true
  let added = 0
  try {
    for (const file of files) {
      if (projects.value.length >= MAX_PLAYLIST_SIZE) {
        ElMessage.warning(`播放列表最多保留 ${MAX_PLAYLIST_SIZE} 首`)
        break
      }
      if (!ACCEPTED_EXTENSIONS.test(file.name)) {
        ElMessage.warning(`已跳过 ${file.name}：不是受支持的 MIDI 文件`)
        continue
      }
      if (file.size > MAX_FILE_SIZE) {
        ElMessage.warning(`已跳过 ${file.name}：文件超过 20 MB`)
        continue
      }
      try {
        const project = parseMidiBuffer(await file.arrayBuffer(), file.name, 'upload', file.size)
        if (!project.noteCount) {
          ElMessage.warning(`${file.name} 没有可显示的音符事件`)
        }
        projects.value.push(project)
        selectedId.value = project.id
        added += 1
      } catch {
        ElMessage.error(`${file.name} 无法解析，请确认文件没有损坏`)
      }
    }
    if (added) ElMessage.success(`已导入 ${added} 个 MIDI 文件，数据仅在本地处理`)
  } finally {
    isImporting.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

function handleFileInput(event: Event) {
  const input = event.target as HTMLInputElement
  void importFiles(Array.from(input.files || []))
}

function handleDrop(event: DragEvent) {
  void importFiles(Array.from(event.dataTransfer?.files || []))
}

function selectProject(project: MidiProject) {
  player.chooseProject(project.id)
}

function removeProject(project: MidiProject) {
  const index = projects.value.findIndex(item => item.id === project.id)
  if (index < 0) return
  if (project.id === selectedId.value) {
    player.pause()
    projects.value.splice(index, 1)
    const replacement = projects.value[Math.min(index, projects.value.length - 1)]
    selectedId.value = replacement?.id || null
  } else {
    projects.value.splice(index, 1)
  }
}

function toggleChannelVisibility(channel: number) {
  const next = new Set(hiddenChannels.value)
  if (next.has(channel)) next.delete(channel)
  else next.add(channel)
  hiddenChannels.value = next
  if (next.has(channel) && selectedChannel.value === channel) selectedChannel.value = null
}

function showAllChannels() {
  hiddenChannels.value = new Set()
  selectedChannel.value = null
}

function setChannelGain(channel: number, value: number) {
  player.setChannelGain(channel, value / 100)
}

function setRate(value: number) {
  player.setPlaybackRate(value)
}

function cycleLoop() {
  const modes: MidiLoopMode[] = ['off', 'all', 'one']
  player.setLoopMode(modes[(modes.indexOf(loopMode.value) + 1) % modes.length])
}

function loopLabel() {
  return loopMode.value === 'one' ? '单曲循环' : loopMode.value === 'all' ? '列表循环' : '循环关闭'
}

async function enterFullscreen() {
  try {
    await stageEl.value?.requestFullscreen()
  } catch {
    ElMessage.warning('当前环境无法进入全屏模式')
  }
}

function handleKeyboard(event: KeyboardEvent) {
  const target = event.target as HTMLElement
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
  if (event.code === 'Space') {
    event.preventDefault()
    void player.togglePlayback()
  } else if (event.code === 'ArrowLeft') {
    event.preventDefault()
    player.seek(currentTime.value - 5)
  } else if (event.code === 'ArrowRight') {
    event.preventDefault()
    player.seek(currentTime.value + 5)
  }
}

watch(currentProject, () => {
  selectedChannel.value = null
  hiddenChannels.value = new Set()
})

onMounted(() => {
  addExample(MIDI_EXAMPLES[0], false)
  window.addEventListener('keydown', handleKeyboard)
})
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeyboard))
</script>

<template>
  <div class="midi-page flex flex-1 flex-col mt-3">
    <ToolHero summary="听见整首曲子，也看清每一种乐器">
      <template #metrics><MetricsBar :items="heroMetrics" /></template>
      <template #actions>
        <span class="engine-pill" :class="engineState">
          <i />
          <span>{{ engineLabel }}</span>
          <span v-if="engineState === 'ready'" class="output-meter" :class="{ live: outputLevel > .012 }" aria-hidden="true"><b /><b /><b /><b /></span>
        </span>
      </template>
    </ToolHero>

    <section
      class="source-card"
      :class="{ dragging }"
      @dragenter.prevent="dragging = true"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="handleDrop"
    >
      <div class="upload-copy">
        <span class="upload-icon"><el-icon><UploadFilled /></el-icon></span>
        <div><strong>导入本地 MIDI</strong><p>可多选或拖入 .mid / .midi / .smf / .kar / .rmi，单个不超过 20 MB</p></div>
        <el-button type="primary" :loading="isImporting" @click="fileInput?.click()">选择文件</el-button>
        <input ref="fileInput" type="file" hidden multiple accept=".mid,.midi,.smf,.kar,.rmi,audio/midi,audio/x-midi" @change="handleFileInput">
      </div>
      <div class="example-list">
        <span class="example-label">内置示例</span>
        <button v-for="example in MIDI_EXAMPLES" :key="example.id" type="button" @click="addExample(example)">
          <span><strong>{{ example.title }}</strong><small>{{ example.description }}</small></span>
          <em>{{ example.mood }}</em>
        </button>
      </div>
    </section>

    <section class="playlist-card">
      <header class="compact-heading">
        <div><span class="eyebrow">PLAYLIST</span><strong>本次播放列表</strong></div>
        <span>{{ projects.length }} / {{ MAX_PLAYLIST_SIZE }} 首</span>
      </header>
      <div class="playlist-strip">
        <button
          v-for="project in projects"
          :key="project.id"
          type="button"
          class="playlist-item"
          :class="{ active: project.id === selectedId }"
          @click="selectProject(project)"
        >
          <span class="track-index">{{ String(projects.indexOf(project) + 1).padStart(2, '0') }}</span>
          <span class="track-copy"><strong>{{ project.name }}</strong><small>{{ project.channels.length }} 通道 · {{ formatMidiTime(project.duration) }} · {{ project.source === 'example' ? '示例' : formatBytes(project.size) }}</small></span>
          <span class="remove-track" role="button" tabindex="0" aria-label="从列表移除" @click.stop="removeProject(project)" @keydown.enter.stop="removeProject(project)"><el-icon><Delete /></el-icon></span>
        </button>
      </div>
    </section>

    <section class="workspace">
      <aside class="channel-panel">
        <header class="compact-heading">
          <div><span class="eyebrow">INSTRUMENTS</span><strong>乐器与通道</strong></div>
          <button type="button" @click="showAllChannels">显示全部</button>
        </header>
        <div v-if="currentProject" class="channel-list">
          <article
            v-for="channel in currentProject.channels"
            :key="channel.channel"
            class="channel-item"
            :class="{ selected: selectedChannel === channel.channel, hidden: hiddenChannels.has(channel.channel), active: channel.notes.some(note => note.start <= currentTime && note.end >= currentTime) }"
          >
            <button class="channel-main" type="button" @click="selectedChannel = selectedChannel === channel.channel ? null : channel.channel">
              <i :style="{ background: channel.color }" />
              <span class="channel-number">{{ channel.displayChannel }}</span>
              <span class="channel-copy"><strong>{{ channel.name }}</strong><small>{{ channel.instrument }} · {{ channel.noteCount }} 个音符</small></span>
            </button>
            <div class="channel-actions">
              <button type="button" :class="{ active: !hiddenChannels.has(channel.channel) }" :title="hiddenChannels.has(channel.channel) ? '在画面中显示' : '在画面中隐藏'" @click="toggleChannelVisibility(channel.channel)"><el-icon><Hide v-if="hiddenChannels.has(channel.channel)" /><View v-else /></el-icon></button>
              <button type="button" :class="{ active: mutedChannels.has(channel.channel) }" :aria-pressed="mutedChannels.has(channel.channel)" title="静音" @click="player.toggleChannelMute(channel.channel)">M</button>
              <button type="button" :class="{ active: soloChannels.has(channel.channel) }" :aria-pressed="soloChannels.has(channel.channel)" title="独奏" @click="player.toggleChannelSolo(channel.channel)">S</button>
            </div>
            <div class="channel-volume"><span>音量</span><el-slider :model-value="Math.round((channelGains[channel.channel] ?? 1) * 100)" :min="0" :max="120" :show-tooltip="false" @update:model-value="value => setChannelGain(channel.channel, Number(value))" /><b>{{ Math.round((channelGains[channel.channel] ?? 1) * 100) }}%</b></div>
          </article>
        </div>
        <div v-else class="channel-empty">导入 MIDI 后显示乐器通道</div>
      </aside>

      <article ref="stageEl" class="stage-card">
        <header class="stage-heading">
          <div class="now-playing">
            <span :class="['playing-dot', { active: isPlaying }]" />
            <div><strong>{{ currentProject?.name || '等待 MIDI' }}</strong><small v-if="currentProject">格式 {{ currentProject.format }} · {{ currentProject.timeSignature }} 拍 · 音域 {{ midiNoteName(currentProject.minPitch) }}—{{ midiNoteName(currentProject.maxPitch) }}</small><small v-else>选择内置示例或导入本地文件</small></div>
          </div>
          <div class="stage-actions">
            <div class="view-tabs" aria-label="可视化模式">
              <button type="button" :class="{ active: viewMode === 'roll' }" @click="viewMode = 'roll'">钢琴卷帘</button>
              <button type="button" :class="{ active: viewMode === 'waterfall' }" @click="viewMode = 'waterfall'">音符瀑布</button>
            </div>
            <button class="icon-button" type="button" title="全屏" @click="enterFullscreen"><el-icon><FullScreen /></el-icon></button>
          </div>
        </header>
        <div class="canvas-wrap">
          <MidiVisualizer :project="currentProject" :current-time="currentTime" :visible-channels="visibleChannelIds" :selected-channel="selectedChannel" :mode="viewMode" @seek="player.seek" />
          <div v-if="engineState === 'loading'" class="engine-loading">
            <span class="loader" />
            <strong>{{ engineMessage }}</strong>
            <div><i :style="{ width: `${soundfontProgress}%` }" /></div>
            <small>{{ soundfontProgress }}% · 首次约需下载 8 MB</small>
          </div>
          <div v-else-if="engineState === 'error'" class="engine-error"><strong>音频暂时无法启动</strong><span>{{ engineMessage }}</span></div>
        </div>

        <div class="transport">
          <div class="timeline-row">
            <span>{{ formatMidiTime(currentTime) }}</span>
            <el-slider v-model="progress" :min="0" :max="currentProject?.duration || 1" :step="0.01" :show-tooltip="false" :disabled="!currentProject" />
            <span>{{ formatMidiTime(currentProject?.duration || 0) }}</span>
          </div>
          <div class="transport-row">
            <div class="transport-secondary">
              <button type="button" :class="{ active: shuffle }" title="随机播放" @click="shuffle = !shuffle">随机</button>
              <button type="button" :class="{ active: loopMode !== 'off' }" :title="loopLabel()" @click="cycleLoop">{{ loopMode === 'one' ? '循环 1' : '循环' }}</button>
            </div>
            <div class="transport-main">
              <button type="button" title="上一首" :disabled="!projects.length" @click="player.previous()"><el-icon><ArrowLeftBold /></el-icon></button>
              <button class="play-button" type="button" :aria-label="isPlaying ? '暂停' : '播放'" :disabled="!currentProject" @click="player.togglePlayback"><el-icon><VideoPause v-if="isPlaying" /><VideoPlay v-else /></el-icon></button>
              <button type="button" title="下一首" :disabled="!projects.length" @click="player.next()"><el-icon><ArrowRightBold /></el-icon></button>
            </div>
            <div class="transport-settings">
              <button type="button" :class="{ active: masterMuted }" @click="player.toggleMasterMute">{{ masterMuted ? '静音' : '音量' }}</button>
              <el-slider v-model="volumePercent" :min="0" :max="100" :show-tooltip="false" />
              <el-select :model-value="playbackRate" size="small" aria-label="播放速度" @change="value => setRate(Number(value))">
                <el-option v-for="rate in [0.5, 0.75, 1, 1.25, 1.5, 2]" :key="rate" :label="`${rate}×`" :value="rate" />
              </el-select>
            </div>
          </div>
          <div class="transport-status"><span>{{ engineMessage }}<b v-if="isPlaying"> · {{ outputLevel > .012 ? '音频输出正常' : '等待下一个音符' }}</b></span><span v-if="currentProject">{{ isPlaying ? (activeNotes ? `当前 ${activeNotes} 个音符发声` : '当前为空拍') : (currentTime > 0 ? '播放已暂停' : '等待播放') }} · 空格播放/暂停 · ← → 快退快进 5 秒</span></div>
        </div>
      </article>
    </section>

    <section class="insight-grid">
      <article><span>01</span><div><strong>按颜色读懂编排</strong><p>每种颜色对应一个 MIDI 通道。点击左侧乐器可聚焦，眼睛按钮只控制画面，M / S 分别控制静音与独奏。</p></div></article>
      <article><span>02</span><div><strong>两种非专业视图</strong><p>钢琴卷帘适合看完整结构并点击跳转；音符瀑布从上往下落，更直观地展示接下来会响起什么。</p></div></article>
      <article><span>03</span><div><strong>文件不离开浏览器</strong><p>MIDI 在本机解析和播放。播放器只加载本站自托管的通用音色库，不会上传你的乐曲文件。</p></div></article>
    </section>

    <ToolGuide title="关于 MIDI 播放" description="MIDI 保存的是音符与演奏指令，不是录音；不同音色库播放时会有细微差异。">
      <div class="guide-copy">
        <p>点击播放时浏览器会首次加载约 8 MB 的 GeneralUser GS 音色库，PWA 会将它缓存以便之后离线使用。支持标准 MIDI、RMID 与常见卡拉 OK MIDI；遇到多端口或自定义音色文件时，通道名称和实际听感可能与原制作软件不同。</p>
        <p>本工具面向普通听众，因此用颜色、乐器名、卷帘和瀑布来呈现音乐结构，不展示五线谱，也不涉及 MIDI 2.0 硬件通信。</p>
      </div>
    </ToolGuide>
  </div>
</template>

<style scoped>
.midi-page { --midi-blue: var(--c-primary); gap: 15px; }
.source-card,.playlist-card,.channel-panel,.stage-card,.insight-grid article { border: 1px solid var(--c-border); border-radius: var(--radius-card); background: var(--c-surface); box-shadow: var(--shadow-card); }
.engine-pill { display: inline-flex; align-items: center; gap: 7px; padding: 7px 11px; border: 1px solid var(--c-primary-200); border-radius: 999px; background: rgba(255,255,255,.66); color: var(--c-text-secondary); font-size: 12px; white-space: nowrap; }
.engine-pill i,.playing-dot { width: 7px; height: 7px; border-radius: 50%; background: #94a3b8; }
.engine-pill.ready i,.playing-dot.active { background: #22c55e; box-shadow: 0 0 0 5px rgba(34,197,94,.12); }
.engine-pill.loading i { background: #f59e0b; animation: pulse 1s infinite; }.engine-pill.error i { background: #ef4444; }
.output-meter { display:flex;align-items:flex-end;gap:2px;height:12px;margin-left:2px; }.output-meter b { width:2px;border-radius:2px;background:#cbd5e1;transition:.12s; }.output-meter b:nth-child(1){height:4px}.output-meter b:nth-child(2){height:7px}.output-meter b:nth-child(3){height:10px}.output-meter b:nth-child(4){height:6px}.output-meter.live b { background:#22c55e;animation:meter .55s ease-in-out infinite alternate; }.output-meter.live b:nth-child(2){animation-delay:.12s}.output-meter.live b:nth-child(3){animation-delay:.24s}.output-meter.live b:nth-child(4){animation-delay:.34s}
.source-card { padding: 15px; transition: border-color .2s,background .2s; }.source-card.dragging { border-color: var(--midi-blue); background: var(--c-primary-50); }
.upload-copy { display: grid; grid-template-columns: auto minmax(0,1fr) auto; align-items: center; gap: 12px; }
.upload-icon { display:grid;place-items:center;width:42px;height:42px;border-radius:13px;background:var(--c-primary-50);color:var(--midi-blue);font-size:20px; }
.upload-copy strong { display:block;color:var(--c-text-heading);font-size:14px; }.upload-copy p { margin:3px 0 0;color:var(--c-text-muted);font-size:12px; }
.example-list { display:grid;grid-template-columns:auto repeat(3,minmax(0,1fr));gap:8px;align-items:stretch;margin-top:13px;padding-top:13px;border-top:1px solid var(--c-border); }
.example-label { align-self:center;color:var(--c-text-muted);font-size:12px;white-space:nowrap; }
.example-list button { display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0;padding:9px 10px;border:1px solid var(--c-border);border-radius:11px;background:var(--c-surface-subtle);text-align:left;cursor:pointer;transition:.18s; }
.example-list button:hover { transform:translateY(-1px);border-color:var(--c-primary-300); }.example-list button span { min-width:0; }.example-list strong,.example-list small { display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }.example-list strong { color:var(--c-text-heading);font-size:12px; }.example-list small { margin-top:2px;color:var(--c-text-muted);font-size:10px; }.example-list em { flex:none;color:var(--midi-blue);font-size:10px;font-style:normal;font-weight:700; }
.playlist-card { overflow:hidden; }.compact-heading { display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-bottom:1px solid var(--c-border); }.compact-heading>div { display:flex;align-items:center;gap:9px; }.eyebrow { color:var(--midi-blue);font-size:10px;font-weight:800;letter-spacing:.13em; }.compact-heading strong { color:var(--c-text-heading);font-size:13px; }.compact-heading>span,.compact-heading>button { color:var(--c-text-muted);font-size:11px; }.compact-heading>button { border:0;background:none;cursor:pointer; }.compact-heading>button:hover { color:var(--midi-blue); }
.playlist-strip { display:flex;gap:8px;padding:10px;overflow-x:auto; }.playlist-item { display:flex;align-items:center;gap:9px;min-width:218px;max-width:285px;padding:9px;border:1px solid var(--c-border);border-radius:12px;background:var(--c-surface-subtle);text-align:left;cursor:pointer; }.playlist-item.active { border-color:var(--c-primary-300);background:var(--c-primary-50);box-shadow:inset 0 0 0 1px var(--c-primary-100); }.track-index { display:grid;place-items:center;flex:none;width:29px;height:29px;border-radius:9px;background:var(--c-surface);color:var(--c-text-muted);font:700 10px ui-monospace,monospace; }.playlist-item.active .track-index { background:var(--midi-blue);color:white; }.track-copy { min-width:0;flex:1; }.track-copy strong,.track-copy small { display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }.track-copy strong { color:var(--c-text-heading);font-size:12px; }.track-copy small { margin-top:2px;color:var(--c-text-muted);font-size:10px; }.remove-track { display:grid;place-items:center;flex:none;width:25px;height:25px;border-radius:7px;color:var(--c-text-muted); }.remove-track:hover { background:#fee2e2;color:#dc2626; }
.workspace { display:grid;grid-template-columns:minmax(260px,.34fr) minmax(0,1fr);align-items:start;gap:15px; }.channel-panel,.stage-card { min-width:0;overflow:hidden; }.channel-list { max-height:670px;padding:9px;overflow:auto; }.channel-item { position:relative;margin-bottom:7px;padding:8px;border:1px solid var(--c-border);border-radius:12px;background:var(--c-surface-subtle);transition:.16s; }.channel-item:last-child { margin-bottom:0; }.channel-item.selected { border-color:var(--c-primary-300);background:var(--c-primary-50); }.channel-item.hidden { opacity:.55; }.channel-item.active::after { position:absolute;top:9px;right:9px;width:6px;height:6px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 4px rgba(34,197,94,.12);content:''; }
.channel-main { display:grid;grid-template-columns:5px 27px minmax(0,1fr);align-items:center;gap:7px;width:100%;padding:0;border:0;background:none;text-align:left;cursor:pointer; }.channel-main>i { width:5px;height:31px;border-radius:5px; }.channel-number { color:var(--c-text-muted);font:700 11px ui-monospace,monospace; }.channel-copy { min-width:0; }.channel-copy strong,.channel-copy small { display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }.channel-copy strong { color:var(--c-text-heading);font-size:12px; }.channel-copy small { margin-top:2px;color:var(--c-text-muted);font-size:10px; }
.channel-actions { display:flex;gap:4px;margin:7px 0 0 39px; }.channel-actions button,.icon-button,.transport-secondary button,.transport-settings>button { height:25px;padding:0 8px;border:1px solid var(--c-border);border-radius:7px;background:var(--c-surface);color:var(--c-text-muted);font-size:10px;font-weight:800;cursor:pointer; }.channel-actions button:first-child { padding:0 6px; }.channel-actions button.active,.transport-secondary button.active,.transport-settings>button.active { border-color:var(--c-primary-300);background:var(--c-primary-50);color:var(--midi-blue); }
.channel-volume { display:grid;grid-template-columns:31px minmax(0,1fr) 34px;align-items:center;gap:6px;margin:1px 0 -5px 39px;color:var(--c-text-muted);font-size:9px; }.channel-volume b { text-align:right;font-weight:600; }.channel-volume :deep(.el-slider__runway) { height:3px; }.channel-volume :deep(.el-slider__button) { width:10px;height:10px; }.channel-empty { padding:70px 18px;text-align:center;color:var(--c-text-muted);font-size:12px; }
.stage-heading { display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 14px;border-bottom:1px solid var(--c-border); }.now-playing { display:flex;align-items:center;gap:10px;min-width:0; }.playing-dot { flex:none; }.now-playing>div { min-width:0; }.now-playing strong,.now-playing small { display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }.now-playing strong { color:var(--c-text-heading);font-size:13px; }.now-playing small { margin-top:2px;color:var(--c-text-muted);font-size:10px; }.stage-actions { display:flex;align-items:center;gap:7px; }.view-tabs { display:flex;padding:3px;border-radius:9px;background:var(--c-surface-subtle); }.view-tabs button { padding:5px 9px;border:0;border-radius:7px;background:transparent;color:var(--c-text-muted);font-size:10px;cursor:pointer; }.view-tabs button.active { background:var(--c-surface);color:var(--midi-blue);font-weight:700;box-shadow:0 1px 4px rgba(15,23,42,.08); }.icon-button { display:grid;place-items:center;width:29px;padding:0; }
.canvas-wrap { position:relative; }.engine-loading,.engine-error { position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:9px;background:rgba(248,250,252,.9);backdrop-filter:blur(5px);color:var(--c-text-heading); }.engine-loading strong,.engine-error strong { font-size:14px; }.engine-loading>div { width:min(280px,64%);height:5px;overflow:hidden;border-radius:9px;background:#dbe5f1; }.engine-loading>div i { display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--midi-blue),#8b5cf6);transition:width .2s; }.engine-loading small,.engine-error span { max-width:75%;color:var(--c-text-muted);font-size:11px;text-align:center; }.loader { width:25px;height:25px;border:3px solid var(--c-primary-100);border-top-color:var(--midi-blue);border-radius:50%;animation:spin .8s linear infinite; }.engine-error { background:rgba(254,242,242,.94); }.engine-error strong { color:#b91c1c; }
.transport { padding:9px 14px 10px;border-top:1px solid var(--c-border); }.timeline-row { display:grid;grid-template-columns:37px minmax(0,1fr) 37px;align-items:center;gap:10px;color:var(--c-text-muted);font:10px ui-monospace,monospace; }.timeline-row span:last-child { text-align:right; }.timeline-row :deep(.el-slider__runway) { height:4px; }.timeline-row :deep(.el-slider__button) { width:12px;height:12px; }
.transport-row { display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px; }.transport-secondary,.transport-main,.transport-settings { display:flex;align-items:center;gap:6px; }.transport-main button { display:grid;place-items:center;width:33px;height:33px;border:0;border-radius:50%;background:var(--c-surface-subtle);color:var(--c-text-secondary);cursor:pointer; }.transport-main .play-button { width:44px;height:44px;background:var(--midi-blue);color:white;font-size:21px;box-shadow:0 7px 18px rgba(55,145,239,.25); }.transport-main button:disabled { opacity:.45;cursor:not-allowed; }.transport-settings { justify-content:flex-end; }.transport-settings :deep(.el-slider) { width:72px; }.transport-settings :deep(.el-slider__button) { width:10px;height:10px; }.transport-settings :deep(.el-select) { width:72px; }.transport-status { display:flex;justify-content:space-between;gap:12px;margin-top:5px;color:var(--c-text-muted);font-size:9px; }.transport-status b { color:#16a34a;font-weight:700; }
.insight-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:12px; }.insight-grid article { display:flex;gap:12px;padding:16px; }.insight-grid article>span { color:var(--c-primary-300);font:800 23px ui-monospace,monospace; }.insight-grid strong { color:var(--c-text-heading);font-size:13px; }.insight-grid p,.guide-copy p { margin:5px 0 0;color:var(--c-text-secondary);font-size:12px;line-height:1.7; }.guide-copy { display:grid;grid-template-columns:1fr 1fr;gap:22px; }.guide-copy p { margin:0; }
@keyframes spin { to { transform:rotate(360deg); } } @keyframes pulse { 50% { opacity:.35; } } @keyframes meter { to { transform:scaleY(.45); } }
@media (max-width: 980px) { .workspace { grid-template-columns:1fr; }.channel-list { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));max-height:none;gap:7px; }.channel-item { margin:0; }.example-list { grid-template-columns:auto repeat(2,minmax(0,1fr)); }.example-list button:last-child { grid-column:2/4; }.transport-status span:last-child { display:none; } }
@media (max-width: 700px) { .source-card { padding:12px; }.upload-copy { grid-template-columns:auto minmax(0,1fr); }.upload-copy .el-button { grid-column:1/3;width:100%; }.example-list { grid-template-columns:1fr; }.example-label { margin-bottom:1px; }.example-list button:last-child { grid-column:auto; }.channel-list { grid-template-columns:1fr; }.stage-heading { align-items:flex-start;flex-direction:column; }.stage-actions { width:100%;justify-content:space-between; }.transport-row { grid-template-columns:1fr; }.transport-main { grid-row:1;justify-content:center; }.transport-secondary,.transport-settings { justify-content:center; }.transport-status { justify-content:center;text-align:center; }.insight-grid,.guide-copy { grid-template-columns:1fr; }.playlist-item { min-width:205px; } }
@media (prefers-reduced-motion: reduce) { .engine-pill.loading i,.loader,.output-meter.live b { animation:none; }.example-list button:hover { transform:none; } }
</style>
