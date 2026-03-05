<script setup lang="ts">
import { Setting, StarFilled } from '@element-plus/icons-vue'
import { Star, StarRegular } from '@vicons/fa'
import { Icon } from '@vicons/utils'
import ToolIcon from '@/components/Common/ToolIcon.vue'
import ToastNotification from '@/components/Common/ToastNotification.vue'
import { onMounted, reactive, computed, ref, nextTick } from 'vue';
import { useRoute } from 'vue-router'
import { useToolsStore } from '@/store/modules/tools'
import {rtrim} from '@/utils/string'
const props = defineProps({
  title: String,
  id: Number
})
const route = useRoute()
//查询参数
const searchParam = reactive({
  cateId: 0,
  title: '',
  route: ''
})
//store
const toolsStore = useToolsStore()

// 获取工具信息
const toolInfo = computed(() => toolsStore.toolInfo)

// 是否已收藏
const favorited = computed(() => toolsStore.isFavorite(toolInfo.value.url))

// 浮窗提示
const toast = ref(false)
const toastType = ref<'add' | 'remove'>('add')
const toastTimer = ref<ReturnType<typeof setTimeout> | null>(null)
// 退出动画时长需与 ToastNotification 的 leave-active transition 一致
const TOAST_LEAVE_DURATION = 350

const showToast = (type: 'add' | 'remove') => {
  if (toastTimer.value) clearTimeout(toastTimer.value)

  const doShow = () => {
    toastType.value = type
    toast.value = true
    toastTimer.value = setTimeout(() => {
      toast.value = false
    }, 3000)
  }

  if (toast.value) {
    // 已在显示：先触发退出动画，动画结束后再显示新内容
    toast.value = false
    setTimeout(() => nextTick(doShow), TOAST_LEAVE_DURATION)
  } else {
    doShow()
  }
}

// 切换收藏
const toggleFavorite = () => {
  if (toolInfo.value.url) {
    const wasFavorited = toolsStore.isFavorite(toolInfo.value.url)
    toolsStore.toggleFavorite(toolInfo.value)
    showToast(wasFavorited ? 'remove' : 'add')
  }
}

//根据路由查询tool id
const getToolInfo = async () => {
  let routeStr = route.path
  searchParam.route = rtrim(routeStr, '/')
  await toolsStore.getToolInfo(searchParam)
}
//收藏
// const collect = () => {
//   ElMessageBox({
//     title: '提示',
//     message: '请使用快捷键`Ctrl+D`进行收藏'
//   })
// }

onMounted(() => {
  getToolInfo()
})

</script>

<template>
  <div class="relative overflow-hidden rounded-xl bg-white dark:bg-slate-800 
              border border-slate-100 dark:border-slate-700 shadow-sm p-4 mb-4">
    <!-- 装饰背景 -->
    <div class="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100/50 to-blue-100/50 
                dark:from-blue-900/50 dark:to-blue-900/50
                rounded-full -translate-y-16 translate-x-16 blur-2xl"></div>
    
    <div class="relative flex items-center gap-3">
      <!-- 工具图标 -->
      <div class="w-10 h-10 rounded-lg overflow-hidden shadow-md shadow-blue-200/50 dark:shadow-blue-900/50 
                  flex items-center justify-center bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600">
        <ToolIcon v-if="toolInfo.logo" :logo="toolInfo.logo" :size="32" rounded="rounded" />
        <div v-else class="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 
                          flex items-center justify-center">
          <Setting class="w-4 h-4 text-white" />
        </div>
      </div>
      
      <div class="flex flex-col flex-1">
        <h1 class="text-lg font-semibold text-slate-800 dark:text-slate-200">
          {{ props.title }}
        </h1>
        <p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-1">
          {{ toolInfo.desc || '在线工具 · 简单高效' }}
        </p>
      </div>
      
      <!-- 分类标签 -->
      <div v-if="toolInfo.cate" class="hidden c-sm:flex items-center">
        <span class="px-2.5 py-0.5 rounded-full text-xs font-medium 
                     bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
          {{ toolInfo.cate }}
        </span>
      </div>

      <!-- 收藏按钮 -->
      <button
        v-if="toolInfo.url"
        @click="toggleFavorite"
        :title="favorited ? '取消收藏' : '收藏此工具'"
        :class="[
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-all duration-200 select-none',
          favorited
            ? 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
        ]"
      >
        <Icon size="14">
          <Star v-if="favorited" class="text-yellow-400" />
          <StarRegular v-else />
        </Icon>
        <span class="inline c-xs:hidden">{{ favorited ? '已收藏' : '收藏' }}</span>
      </button>
    </div>
  </div>

  <!-- 收藏/取消收藏浮窗提示 -->
  <div class="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center">
    <ToastNotification v-model="toast" :icon-class="toastType === 'add' ? 'text-yellow-500' : 'text-slate-400'">
      <template #icon><el-icon class="text-base"><StarFilled /></el-icon></template>
      <template #title>{{ toastType === 'add' ? '收藏成功' : '已取消收藏' }}</template>
      <template #desc>{{ toastType === 'add' ? '可在首页的「收藏」分类中找到该工具' : '该工具已从收藏列表中移除' }}</template>
    </ToastNotification>
  </div>
</template>

<style scoped>
</style>
