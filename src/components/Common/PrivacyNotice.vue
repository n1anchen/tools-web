<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Icon } from '@vicons/utils'
import { Lock, ExclamationTriangle, Archive, CodeBranch } from '@vicons/fa'

const STORAGE_KEY = 'privacy_notice'

const visible = ref(false)

onMounted(() => {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) {
    visible.value = true
    return
  }
  try {
    const parsed = JSON.parse(stored)
    if (parsed === 'never') return
    const today = new Date().toDateString()
    if (parsed !== today) {
      visible.value = true
    }
  } catch {
    visible.value = true
  }
})

const handleConfirm = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(new Date().toDateString()))
  visible.value = false
}

const handleNeverShow = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify('never'))
  visible.value = false
}
</script>

<template>
  <el-dialog
    v-model="visible"
    width="500px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
    align-center
    class="privacy-notice-dialog"
  >
    <!-- 自定义标题 -->
    <template #header>
      <div class="flex items-center gap-2.5 px-1">
        <span class="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex-shrink-0">
          <Icon size="15"><Lock /></Icon>
        </span>
        <div>
          <p class="text-base font-semibold text-slate-800 dark:text-slate-100 leading-tight">使用须知 &amp; 隐私说明</p>
          <p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">初次访问请阅读以下说明</p>
        </div>
      </div>
    </template>

    <div class="space-y-2.5 text-sm leading-relaxed">

      <!-- 数据安全 -->
      <div class="flex gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40">
        <span class="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500 text-white flex-shrink-0 mt-0.5 shadow-sm">
          <Icon size="14"><Lock /></Icon>
        </span>
        <div class="min-w-0">
          <p class="font-semibold text-blue-700 dark:text-blue-300 mb-0.5">数据完全本地处理</p>
          <p class="text-slate-600 dark:text-slate-400">本项目为<strong class="text-slate-700 dark:text-slate-300">纯前端应用</strong>，所有操作均在浏览器本地完成，数据不会上传至任何服务器。工具中所提及的"上传"，实际含义是将文件<strong class="text-slate-700 dark:text-slate-300">加载到浏览器内存</strong>处理，不涉及任何网络传输。</p>
        </div>
      </div>

      <!-- 独立工具免责 -->
      <div class="flex gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40">
        <span class="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500 text-white flex-shrink-0 mt-0.5 shadow-sm">
          <Icon size="14"><ExclamationTriangle /></Icon>
        </span>
        <div class="min-w-0">
          <p class="font-semibold text-amber-700 dark:text-amber-300 mb-0.5">独立工具免责声明</p>
          <p class="text-slate-600 dark:text-slate-400">"独立工具"分类中收录的外部工具为第三方站点，本项目仅提供链接导航，<strong class="text-slate-700 dark:text-slate-300">不对其内容、安全性或隐私政策负责</strong>。访问外部工具时请自行注意鉴别，谨慎输入敏感信息。</p>
        </div>
      </div>

      <!-- PWA 离线缓存 -->
      <div class="flex gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/40">
        <span class="flex items-center justify-center w-8 h-8 rounded-lg bg-green-500 text-white flex-shrink-0 mt-0.5 shadow-sm">
          <Icon size="14"><Archive /></Icon>
        </span>
        <div class="min-w-0">
          <p class="font-semibold text-green-700 dark:text-green-300 mb-0.5">离线缓存说明</p>
          <p class="text-slate-600 dark:text-slate-400">本站使用 <strong class="text-slate-700 dark:text-slate-300">Service Worker</strong> 对资源进行本地缓存，首次加载后大部分功能可<strong class="text-slate-700 dark:text-slate-300">离线使用</strong>。部分依赖在线资源的功能（如远程图片/字体/在线地图）在离线状态下将不可用。</p>
        </div>
      </div>

      <!-- 开源免费 -->
      <div class="flex gap-3 p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/40">
        <span class="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-500 text-white flex-shrink-0 mt-0.5 shadow-sm">
          <Icon size="14"><CodeBranch /></Icon>
        </span>
        <div class="min-w-0">
          <p class="font-semibold text-purple-700 dark:text-purple-300 mb-0.5">完全开源免费</p>
          <p class="text-slate-600 dark:text-slate-400">本项目<strong class="text-slate-700 dark:text-slate-300">完全开源且免费</strong>，如您对数据安全存有顾虑，欢迎自行拉取源代码进行本地或私有化部署。</p>
        </div>
      </div>

      <!-- 同意提示 -->
      <p class="text-xs text-center text-slate-400 dark:text-slate-500 pt-1">
        点击「我知道了」或继续使用本站，即表示您已阅读并理解上述说明。
      </p>

    </div>

    <template #footer>
      <div class="flex items-center justify-between pt-1">
        <el-button text @click="handleNeverShow" class="!text-slate-400 dark:!text-slate-500 !text-xs">
          不再提醒
        </el-button>
        <el-button type="primary" @click="handleConfirm" class="!px-6">
          我知道了
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style>
.privacy-notice-dialog .el-dialog {
  border-radius: 1rem;
  overflow: hidden;
}
</style>
