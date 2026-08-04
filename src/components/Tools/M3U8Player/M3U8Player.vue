<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { CopyDocument, FullScreen, Refresh, VideoPlay } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import Hls from 'hls.js'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import { copy } from '@/utils/string'
import { formatMediaTime, validateHlsUrl } from '@/utils/workbenchTools'

type PlayerStatus = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'buffering' | 'error' | 'stopped'

interface QualityLevel {
  index: number
  label: string
  bitrate: number
  width: number
  height: number
}

interface ErrorEntry {
  time: string
  type: string
  details: string
  fatal: boolean
}

const streamUrl = ref('')
const videoEl = ref<HTMLVideoElement | null>(null)
const status = ref<PlayerStatus>('idle')
const statusMessage = ref('输入地址后开始检测与播放')
const engine = ref('等待检测')
const qualities = ref<QualityLevel[]>([])
const selectedLevel = ref(-1)
const currentLevel = ref(-1)
const isLive = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const buffered = ref(0)
const resolution = ref('—')
const bitrate = ref(0)
const errorEntries = ref<ErrorEntry[]>([])
const recentStreams = ref<string[]>([])
const lastErrorType = ref('')
const activeUrl = ref('')
let hls: Hls | null = null

const samples = [
  { label: 'Big Buck Bunny', note: 'VOD · 自适应码率', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
  { label: 'Sintel Trailer', note: 'VOD · 多清晰度', url: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8' },
]

const validation = computed(() => validateHlsUrl(streamUrl.value))
const statusLabel = computed(() => ({
  idle: '等待地址', loading: '正在载入', ready: '可以播放', playing: '正在播放', paused: '已暂停', buffering: '缓冲中', error: '播放失败', stopped: '已停止',
})[status.value])
const durationLabel = computed(() => isLive.value ? 'LIVE' : formatMediaTime(duration.value))
const currentLabel = computed(() => formatMediaTime(currentTime.value))
const bitrateLabel = computed(() => bitrate.value ? `${(bitrate.value / 1_000_000).toFixed(2)} Mbps` : '自动')
const addressCheck = computed(() => {
  if (!streamUrl.value.trim()) return { state: 'waiting', label: '等待' }
  if (!validation.value.valid) return { state: 'failed', label: '无效' }
  return { state: activeUrl.value ? 'done' : 'waiting', label: activeUrl.value ? '通过' : '待检测' }
})
const qualityLabel = computed(() => {
  if (currentLevel.value < 0) return '自动'
  return qualities.value.find(item => item.index === currentLevel.value)?.label ?? `Level ${currentLevel.value}`
})
const errorAdvice = computed(() => {
  const latest = errorEntries.value[0]
  if (!latest) return '载入流后，这里会显示协议、清晰度、缓冲与错误诊断。'
  if (latest.type === '地址校验') return '请使用完整的 HTTP(S) M3U8 地址；本地文件、相对路径和其他协议不会交给播放器。'
  const detail = latest.details.toLowerCase()
  if (detail.includes('manifest') || detail.includes('level')) return '检查地址是否返回有效的 M3U8 清单，并确认服务器允许跨域访问（CORS）。'
  if (detail.includes('frag') || detail.includes('network')) return '清单已识别，但分片请求失败。检查分片地址、令牌有效期和网络连通性。'
  if (latest.type.toLowerCase().includes('media')) return '媒体解码或缓冲异常，可尝试“恢复播放”，或检查流中的视频与音频编码。'
  return '可复制地址在新标签页检查响应，并确认协议、Content-Type、CORS 与编码支持情况。'
})

function resetStats() {
  qualities.value = []
  selectedLevel.value = -1
  currentLevel.value = -1
  isLive.value = false
  currentTime.value = 0
  duration.value = 0
  buffered.value = 0
  resolution.value = '—'
  bitrate.value = 0
  lastErrorType.value = ''
}

function destroyHls() {
  if (hls) hls.destroy()
  hls = null
}

function resetVideo() {
  const video = videoEl.value
  if (!video) return
  video.pause()
  video.removeAttribute('src')
  video.load()
}

function addRecent(url: string) {
  recentStreams.value = [url, ...recentStreams.value.filter(item => item !== url)].slice(0, 5)
}

function addError(type: string, details: string, fatal = false) {
  errorEntries.value.unshift({ time: new Date().toLocaleTimeString('zh-CN', { hour12: false }), type, details, fatal })
  errorEntries.value = errorEntries.value.slice(0, 8)
  lastErrorType.value = type
}

function loadStream(source?: string) {
  if (source) streamUrl.value = source
  const result = validateHlsUrl(streamUrl.value)
  if (!result.valid) {
    status.value = 'error'
    statusMessage.value = result.error
    addError('地址校验', result.error, true)
    return
  }
  const video = videoEl.value
  if (!video) return
  destroyHls()
  resetVideo()
  resetStats()
  errorEntries.value = []
  activeUrl.value = result.url
  addRecent(result.url)
  status.value = 'loading'
  statusMessage.value = '正在请求播放清单…'

  if (Hls.isSupported()) {
    engine.value = `hls.js ${Hls.version}`
    hls = new Hls({ enableWorker: true })
    hls.on(Hls.Events.MEDIA_ATTACHED, () => hls?.loadSource(result.url))
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      if (!hls) return
      qualities.value = hls.levels.map((level, index) => ({
        index,
        width: level.width || 0,
        height: level.height || 0,
        bitrate: level.bitrate || 0,
        label: level.height ? `${level.height}p${level.bitrate ? ` · ${(level.bitrate / 1_000_000).toFixed(1)}M` : ''}` : level.name || `Level ${index + 1}`,
      }))
      status.value = 'ready'
      statusMessage.value = `清单解析完成，发现 ${qualities.value.length || 1} 个清晰度`
      video.play().catch(() => {})
    })
    hls.on(Hls.Events.LEVEL_LOADED, (_event, data) => {
      isLive.value = Boolean(data.details.live)
      if (!isLive.value && data.details.totalduration) duration.value = data.details.totalduration
    })
    hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
      currentLevel.value = data.level
      const level = qualities.value.find(item => item.index === data.level)
      if (level) {
        resolution.value = level.width && level.height ? `${level.width} × ${level.height}` : `${level.height || '—'}p`
        bitrate.value = level.bitrate
      }
    })
    hls.on(Hls.Events.ERROR, (_event, data) => {
      addError(data.type, data.details || 'unknown', data.fatal)
      if (data.fatal) {
        status.value = 'error'
        statusMessage.value = `致命错误：${data.details || data.type}`
      }
    })
    hls.attachMedia(video)
    return
  }

  if (video.canPlayType('application/vnd.apple.mpegurl')) {
    engine.value = '浏览器原生 HLS'
    video.src = result.url
    video.load()
    video.play().catch(() => {})
    return
  }

  engine.value = '不支持 HLS'
  status.value = 'error'
  statusMessage.value = '当前浏览器缺少 HLS 或 Media Source 支持'
  addError('兼容性', statusMessage.value, true)
}

function stopPlayback() {
  destroyHls()
  resetVideo()
  resetStats()
  status.value = 'stopped'
  statusMessage.value = '已停止并释放流资源'
  engine.value = '等待检测'
}

function recoverPlayback() {
  if (!hls) {
    loadStream(activeUrl.value || streamUrl.value)
    return
  }
  if (lastErrorType.value === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad()
  else if (lastErrorType.value === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError()
  else loadStream(activeUrl.value || streamUrl.value)
  status.value = 'loading'
  statusMessage.value = '正在尝试恢复播放…'
}

function changeQuality() {
  if (hls) hls.currentLevel = selectedLevel.value
}

function syncVideoStats() {
  const video = videoEl.value
  if (!video) return
  currentTime.value = video.currentTime || 0
  if (Number.isFinite(video.duration)) duration.value = video.duration
  if (video.videoWidth && video.videoHeight && currentLevel.value < 0) resolution.value = `${video.videoWidth} × ${video.videoHeight}`
  if (video.buffered.length) buffered.value = Math.max(0, video.buffered.end(video.buffered.length - 1) - video.currentTime)
}

function handleMediaError() {
  const code = videoEl.value?.error?.code
  if (!code) return
  const details = `HTMLMediaElement error code ${code}`
  addError('mediaError', details, true)
  status.value = 'error'
  statusMessage.value = details
}

async function enterPictureInPicture() {
  try {
    if (videoEl.value && document.pictureInPictureEnabled) await videoEl.value.requestPictureInPicture()
    else ElMessage.warning('当前浏览器不支持画中画')
  } catch {
    ElMessage.warning('视频尚未就绪，无法进入画中画')
  }
}

async function enterFullscreen() {
  try {
    await videoEl.value?.requestFullscreen()
  } catch {
    ElMessage.warning('无法进入全屏模式')
  }
}

onBeforeUnmount(() => destroyHls())
</script>

<template>
  <div class="hls-page flex flex-col mt-3 flex-1">
    <ToolHero summary="播放之外，也看得懂流状态">
      <template #actions>
        <span class="hero-capability"><span>当前环境</span><strong>{{ Hls.isSupported() ? 'Media Source 可用' : '检测原生 HLS' }}</strong><small>{{ engine }}</small></span>
      </template>
    </ToolHero>

    <section class="source-card">
      <div class="url-row"><div class="url-input"><el-input v-model="streamUrl" size="large" placeholder="https://cdn.example.com/live/master.m3u8" clearable @keyup.enter="loadStream()" /><span v-if="streamUrl && !validation.valid">{{ validation.error }}</span></div><el-button type="primary" size="large" :icon="VideoPlay" @click="loadStream()">检测并播放</el-button><el-button size="large" @click="stopPlayback">停止</el-button></div>
      <div class="sample-row"><span>公开测试流</span><button v-for="sample in samples" :key="sample.url" @click="loadStream(sample.url)"><strong>{{ sample.label }}</strong><small>{{ sample.note }}</small></button></div>
    </section>

    <section class="workspace">
      <article class="player-card">
        <div class="player-heading"><div><span :class="['status-indicator', status]"><i />{{ statusLabel }}</span><strong>{{ statusMessage }}</strong></div><div><span>{{ currentLabel }} / {{ durationLabel }}</span><el-button link :icon="CopyDocument" :disabled="!activeUrl" @click="copy(activeUrl)">复制地址</el-button></div></div>
        <div class="video-stage">
          <video ref="videoEl" controls playsinline @loadedmetadata="syncVideoStats" @durationchange="syncVideoStats" @timeupdate="syncVideoStats" @playing="status = 'playing'; statusMessage = '媒体正在播放'" @pause="status === 'playing' && (status = 'paused')" @waiting="status = 'buffering'; statusMessage = '正在等待更多媒体数据'" @error="handleMediaError" />
          <div v-if="['idle', 'stopped'].includes(status)" class="video-placeholder"><el-icon><VideoPlay /></el-icon><strong>{{ status === 'stopped' ? '播放已停止' : '等待 HLS 地址' }}</strong><span>支持 Master Playlist 与 Media Playlist</span></div>
          <div v-else-if="status === 'loading'" class="loading-overlay"><i /><strong>正在解析播放清单</strong><span>{{ activeUrl }}</span></div>
          <div v-else-if="status === 'error'" class="error-overlay"><strong>无法播放此流</strong><span>{{ statusMessage }}</span><el-button type="primary" :icon="Refresh" @click="recoverPlayback">尝试恢复</el-button></div>
        </div>
        <div class="stream-stats"><div><span>类型</span><strong>{{ isLive ? '直播 LIVE' : duration ? '点播 VOD' : '待识别' }}</strong></div><div><span>当前清晰度</span><strong>{{ qualityLabel }}</strong></div><div><span>画面尺寸</span><strong>{{ resolution }}</strong></div><div><span>视频码率</span><strong>{{ bitrateLabel }}</strong></div><div><span>前向缓冲</span><strong>{{ buffered.toFixed(1) }} s</strong></div></div>
        <div class="player-actions"><label><span>清晰度</span><el-select v-model="selectedLevel" :disabled="!qualities.length" @change="changeQuality"><el-option label="自动（ABR）" :value="-1" /><el-option v-for="quality in qualities" :key="quality.index" :label="quality.label" :value="quality.index" /></el-select></label><div><el-button @click="enterPictureInPicture">画中画</el-button><el-button :icon="FullScreen" @click="enterFullscreen">全屏</el-button></div></div>
      </article>

      <aside class="diagnostics-card">
        <div class="section-heading"><div><span class="eyebrow">DIAGNOSTICS</span><h3>播放诊断</h3></div><span>{{ engine }}</span></div>
        <div class="advice-card"><span>建议</span><p>{{ errorAdvice }}</p><el-button v-if="status === 'error'" link type="primary" :icon="Refresh" @click="recoverPlayback">恢复播放</el-button></div>
        <div class="check-list"><div :class="addressCheck.state"><i />地址格式<span>{{ addressCheck.label }}</span></div><div :class="{ done: status !== 'idle' && status !== 'loading' && status !== 'error', failed: status === 'error' && validation.valid }"><i />清单解析<span>{{ status === 'error' && validation.valid ? '失败' : qualities.length || status === 'ready' || status === 'playing' ? '通过' : status === 'error' ? '未检测' : '等待' }}</span></div><div :class="{ done: ['playing', 'paused', 'buffering'].includes(status) }"><i />媒体解码<span>{{ ['playing', 'paused', 'buffering'].includes(status) ? '通过' : '等待' }}</span></div></div>
        <div class="error-log"><div class="subheading"><strong>事件记录</strong><button v-if="errorEntries.length" @click="errorEntries = []">清空</button></div><div v-if="errorEntries.length" class="log-list"><article v-for="(entry, index) in errorEntries" :key="`${entry.time}-${index}`" :class="{ fatal: entry.fatal }"><span>{{ entry.time }}</span><strong>{{ entry.type }}</strong><code>{{ entry.details }}</code></article></div><div v-else class="log-empty">暂无错误事件</div></div>
      </aside>
    </section>

    <section v-if="recentStreams.length" class="recent-card"><div class="section-heading"><div><span class="eyebrow">RECENT STREAMS</span><h3>本次会话记录</h3></div><button @click="recentStreams = []">清空</button></div><div class="recent-list"><button v-for="url in recentStreams" :key="url" @click="loadStream(url)"><span>{{ url }}</span><small>重新播放</small></button></div></section>

    <section class="tips-grid"><article><strong>CORS</strong><p>清单与媒体分片都需要允许当前站点跨域读取；能在新标签页打开不代表播放器一定可访问。</p></article><article><strong>HTTPS</strong><p>HTTPS 页面通常无法加载 HTTP 流。生产环境应让页面、清单和分片都使用 HTTPS。</p></article><article><strong>编码</strong><p>浏览器支持的编码取决于系统与设备；常见 H.264/AAC 流通常拥有更广泛的兼容性。</p></article></section>

    <ToolGuide title="使用说明"><el-text>输入完整的 HTTP(S) M3U8 地址后点击“检测并播放”。支持 Media Source 的浏览器使用 hls.js，Safari 等环境会尝试原生 HLS。出现错误时，诊断区会区分清单、分片、网络和媒体问题；URL 可能包含临时令牌，请谨慎复制或分享。</el-text></ToolGuide>
  </div>
</template>

<style scoped>
.hls-page { --blue: #2563eb; gap: 16px; }.source-card, .player-card, .diagnostics-card, .recent-card, .tips-grid article { border: 1px solid #e2e8f0; border-radius: 22px; background: #fff; box-shadow: 0 12px 35px rgb(15 23 42 / 6%); }.eyebrow { color: var(--blue); font-size:12px; font-weight: 800; letter-spacing: .15em; }.hero-capability { display:inline-flex; align-items:center; gap:7px; padding:7px 11px; border:1px solid #bfdbfe; border-radius:10px; background:rgba(239,246,255,.8); font-size:12px; color:#3b82f6; }.hero-capability strong { color:#1d4ed8; font-weight:700; }.hero-capability small { color:#94a3b8; font-size:11px; }
.source-card { padding: 15px; }.url-row { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: start; gap: 8px; }.url-input { min-width: 0; }.url-input :deep(.el-input__wrapper) { border-radius: 11px; }.url-input > span { display: block; margin: 4px 4px 0; color: #dc2626; font-size:12px; }.sample-row { display: flex; align-items: center; gap: 7px; margin-top: 11px; overflow-x: auto; }.sample-row > span { flex: none; color: #94a3b8; font-size:12px; }.sample-row button { display: flex; align-items: flex-start; flex-direction: column; flex: none; padding: 6px 9px; border: 1px solid #e2e8f0; border-radius: 9px; color: #475569; background: #f8fafc; cursor: pointer; }.sample-row strong { font-size:12px; }.sample-row small { color: #94a3b8; font-size:12px; }
.workspace { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(285px, .55fr); align-items: start; gap: 16px; }.player-card { min-width: 0; overflow: hidden; }.player-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 15px; }.player-heading > div { display: flex; align-items: center; gap: 8px; min-width: 0; }.player-heading > div:last-child { flex: none; }.player-heading strong { color: #475569; overflow: hidden; text-overflow: ellipsis; font-size:12px; white-space: nowrap; }.player-heading > div:last-child > span { color: #94a3b8; font: 12px ui-monospace, monospace; }.status-indicator { display: flex; align-items: center; gap: 5px; flex: none; color: #64748b; font-size:12px; }.status-indicator i { width: 6px; height: 6px; border-radius: 50%; background: #94a3b8; }.status-indicator.loading i, .status-indicator.buffering i { background: #f59e0b; animation: blink 1s ease infinite; }.status-indicator.ready i, .status-indicator.playing i { background: #22c55e; box-shadow: 0 0 0 4px #dcfce7; }.status-indicator.error i { background: #ef4444; box-shadow: 0 0 0 4px #fee2e2; }.video-stage { position: relative; overflow: hidden; aspect-ratio: 16 / 9; color: #fff; background: #030712; }.video-stage video { display: block; width: 100%; height: 100%; object-fit: contain; }.video-placeholder, .loading-overlay, .error-overlay { position: absolute; display: flex; inset: 0; align-items: center; justify-content: center; flex-direction: column; padding: 25px; background: radial-gradient(circle at center, #172554, #030712 68%); text-align: center; }.video-placeholder > .el-icon { color: #60a5fa; font-size: 48px; }.video-placeholder strong, .loading-overlay strong, .error-overlay strong { margin-top: 10px; font-size: 15px; }.video-placeholder span, .loading-overlay span, .error-overlay span { max-width: 80%; margin-top: 4px; overflow: hidden; color: #94a3b8; text-overflow: ellipsis; font-size:12px; white-space: nowrap; }.loading-overlay i { width: 34px; height: 34px; border: 3px solid #334155; border-top-color: #60a5fa; border-radius: 50%; animation: spin .8s linear infinite; }.error-overlay { background: radial-gradient(circle at center, #450a0a, #030712 70%); }.error-overlay span { margin-bottom: 14px; color: #fca5a5; }.stream-stats { display: grid; grid-template-columns: repeat(5, 1fr); padding: 10px; }.stream-stats div { display: flex; align-items: center; flex-direction: column; padding: 7px; border-right: 1px solid #e2e8f0; }.stream-stats div:last-child { border: 0; }.stream-stats span { color: #94a3b8; font-size:12px; }.stream-stats strong { margin-top: 2px; color: #334155; font-size:12px; }.player-actions { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; padding: 11px 15px 15px; border-top: 1px solid #e2e8f0; }.player-actions label { display: flex; flex-direction: column; gap: 4px; }.player-actions label > span { color: #94a3b8; font-size:12px; }.player-actions :deep(.el-select) { width: 190px; }
.diagnostics-card { position: sticky; top: 14px; padding: 19px; }.section-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }.section-heading h3 { margin: 3px 0 0; color: #0f172a; font-size: 16px; }.section-heading > span, .section-heading > button { border: 0; color: #94a3b8; background: transparent; font-size:12px; }.advice-card { margin-top: 15px; padding: 12px; border-radius: 13px; background: #eff6ff; }.advice-card > span { color: #2563eb; font-size:12px; font-weight: 800; }.advice-card p { margin: 5px 0; color: #475569; font-size:12px; line-height: 1.55; }.check-list { display: flex; flex-direction: column; gap: 8px; margin: 15px 0; }.check-list > div { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 8px; color: #64748b; font-size:12px; }.check-list i { width: 8px; height: 8px; border: 2px solid #cbd5e1; border-radius: 50%; }.check-list .done i { border-color: #22c55e; background: #22c55e; box-shadow: 0 0 0 3px #dcfce7; }.check-list .failed i { border-color: #ef4444; background: #ef4444; box-shadow: 0 0 0 3px #fee2e2; }.check-list span { color: #94a3b8; font-size:12px; }.check-list .done span { color: #16a34a; }.check-list .failed span { color: #dc2626; }.subheading { display: flex; align-items: center; justify-content: space-between; }.subheading strong { color: #334155; font-size:12px; }.subheading button { border: 0; color: #94a3b8; background: transparent; font-size:12px; cursor: pointer; }.log-list { display: flex; max-height: 240px; flex-direction: column; gap: 6px; margin-top: 8px; overflow-y: auto; }.log-list article { display: grid; grid-template-columns: auto 1fr; gap: 3px 6px; padding: 8px; border-left: 3px solid #f59e0b; border-radius: 8px; background: #fffbeb; }.log-list article.fatal { border-color: #ef4444; background: #fef2f2; }.log-list span { color: #94a3b8; font: 12px ui-monospace, monospace; }.log-list strong { color: #92400e; font-size:12px; }.log-list code { grid-column: 1 / -1; color: #78350f; font-size:12px; overflow-wrap: anywhere; }.log-empty { display: grid; min-height: 80px; margin-top: 8px; place-items: center; border-radius: 10px; color: #94a3b8; background: #f8fafc; font-size:12px; }
.recent-card { padding: 19px; }.recent-list { display: flex; gap: 7px; margin-top: 13px; overflow-x: auto; }.recent-list button { display: flex; width: 260px; align-items: center; justify-content: space-between; gap: 10px; flex: none; padding: 9px; border: 1px solid #e2e8f0; border-radius: 10px; color: #475569; background: #f8fafc; cursor: pointer; }.recent-list span { overflow: hidden; text-overflow: ellipsis; font: 12px ui-monospace, monospace; white-space: nowrap; }.recent-list small { flex: none; color: #2563eb; font-size:12px; }.tips-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; }.tips-grid article { padding: 14px; border-radius: 15px; }.tips-grid strong { color: #2563eb; font-size:12px; }.tips-grid p { margin: 4px 0 0; color: #64748b; font-size:12px; line-height: 1.55; }
:global(html.dark .hls-page .source-card), :global(html.dark .hls-page .player-card), :global(html.dark .hls-page .diagnostics-card), :global(html.dark .hls-page .recent-card), :global(html.dark .hls-page .tips-grid article) { border-color: #334155; background: #1e293b; box-shadow: none; }:global(html.dark .hls-page h3), :global(html.dark .hls-page .stream-stats strong), :global(html.dark .hls-page .subheading strong), :global(html.dark .hls-page .tips-grid strong) { color: #f8fafc; }:global(html.dark .hls-page .advice-card) { border-color: #1d4ed8; background: #172554; }:global(html.dark .hls-page .advice-card p) { color: #bfdbfe; }:global(html.dark .hls-page .sample-row button), :global(html.dark .hls-page .recent-list button), :global(html.dark .hls-page .log-empty) { border-color: #334155; color: #cbd5e1; background: #0f172a; }:global(html.dark .hls-page .stream-stats div), :global(html.dark .hls-page .player-actions) { border-color: #334155; }:global(html.dark .hls-page .log-list article) { background: #422006; }:global(html.dark .hls-page .log-list article.fatal) { background: #450a0a; }:global(html.dark .hls-page .log-list code) { color: #fed7aa; }:global(html.dark .hls-page .hero-capability) { border-color:#1d4ed8; background:rgba(23,37,84,.6); }:global(html.dark .hls-page .hero-capability strong) { color:#bfdbfe; }:global(html.dark .hls-page .hero-capability small) { color:#94a3b8; }
@keyframes spin { to { transform: rotate(360deg); } } @keyframes blink { 50% { opacity: .3; } }
@media (max-width: 930px) { .workspace { grid-template-columns: 1fr; }.diagnostics-card { position: static; } }
@media (max-width: 640px) { .url-row { grid-template-columns: 1fr 1fr; }.url-input { grid-column: 1 / -1; }.source-card, .diagnostics-card, .recent-card { border-radius: 19px; }.player-heading, .player-actions { align-items: flex-start; flex-direction: column; }.player-heading > div:last-child, .player-actions > div, .player-actions label, .player-actions :deep(.el-select) { width: 100%; }.player-actions > div { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }.player-actions .el-button { margin: 0; }.stream-stats { grid-template-columns: repeat(2, 1fr); }.stream-stats div { border-bottom: 1px solid #e2e8f0; }.stream-stats div:last-child { grid-column: 1 / -1; }.tips-grid { grid-template-columns: 1fr; } }
</style>
