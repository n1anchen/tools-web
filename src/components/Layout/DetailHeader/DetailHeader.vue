<script setup lang="ts">
// import { Star } from '@element-plus/icons-vue'
import { Setting } from '@element-plus/icons-vue'
import ToolIcon from '@/components/Common/ToolIcon.vue'
import { onMounted, reactive, computed } from 'vue';
import { useRoute } from 'vue-router'
import { useToolsStore } from '@/store/modules/tools'
// import { ElMessageBox } from 'element-plus'
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
    </div>
  </div>
</template>

<style scoped>

</style>
