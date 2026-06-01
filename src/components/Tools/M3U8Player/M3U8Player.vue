<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import Hls from 'hls.js'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { ElMessage } from 'element-plus'

const title = 'M3U8 播放器'
const m3u8Url = ref('')
const videoEl = ref<HTMLVideoElement | null>(null)
let hls: Hls | null = null

const samples = [
  { label: '测试流 (Big Buck Bunny)', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
]

const loadStream = (url?: string) => {
  const target = url || m3u8Url.value.trim()
  if (!target) { ElMessage.warning('请输入 M3U8 地址'); return }
  if (!videoEl.value) return
  if (hls) { hls.destroy(); hls = null }
  videoEl.value.src = ''

  if (Hls.isSupported()) {
    hls = new Hls({ enableWorker: false })
    hls.loadSource(target)
    hls.attachMedia(videoEl.value)
    hls.on(Hls.Events.MANIFEST_PARSED, () => videoEl.value?.play().catch(() => {}))
    hls.on(Hls.Events.ERROR, (_e, data) => {
      if (data.fatal) ElMessage.error('播放失败：' + (data.details || '未知错误'))
    })
  } else if (videoEl.value.canPlayType('application/vnd.apple.mpegurl')) {
    videoEl.value.src = target
    videoEl.value.play().catch(() => {})
  } else {
    ElMessage.error('当前浏览器不支持 HLS 播放')
  }
  if (url) m3u8Url.value = url
}

const stop = () => {
  if (hls) { hls.destroy(); hls = null }
  if (videoEl.value) { videoEl.value.src = ''; videoEl.value.load() }
}

onBeforeUnmount(() => { if (hls) hls.destroy() })
</script>

<template>
  <div class="flex flex-col mt-3 flex-1">
    <DetailHeader :title="title" />
    <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-300 space-y-3">
      <div class="flex gap-2">
        <el-input v-model="m3u8Url" placeholder="请输入 M3U8 流地址，例如 https://xxx.m3u8" clearable @keyup.enter="loadStream()" />
        <el-button type="primary" @click="loadStream()">播放</el-button>
        <el-button @click="stop">停止</el-button>
      </div>

      <div class="text-sm text-slate-500 dark:text-slate-400">
        示例：
        <el-button
          v-for="s in samples" :key="s.url"
          link type="primary" size="small"
          @click="loadStream(s.url)"
        >{{ s.label }}</el-button>
      </div>

      <div class="w-full rounded-lg overflow-hidden bg-black" style="aspect-ratio:16/9">
        <video
          ref="videoEl"
          class="w-full h-full"
          controls
          playsinline
        />
      </div>
    </div>
    <ToolDetail title="使用说明">
      <p>在线播放 M3U8 格式的 HLS 直播流或点播视频。</p>
      <ul class="list-disc list-inside mt-1 space-y-1">
        <li>基于 hls.js 实现，兼容主流现代浏览器（Safari 使用原生 HLS 支持）</li>
        <li>粘贴 M3U8 地址后点击播放即可，支持快捷键 Enter</li>
        <li>适合调试直播流地址，不保证所有流地址均可播放</li>
        <li>注意：部分流地址可能因跨域（CORS）限制无法播放</li>
      </ul>
    </ToolDetail>
  </div>
</template>
