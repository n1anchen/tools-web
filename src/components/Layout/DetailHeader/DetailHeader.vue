<script setup lang="ts">
// import { Star } from '@element-plus/icons-vue'
import { Setting } from '@element-plus/icons-vue'
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
  <div class="relative overflow-hidden rounded-xl bg-gradient-to-r from-white via-white to-blue-50/50 
              border border-slate-100 shadow-sm p-4 mb-4">
    <!-- 装饰背景 -->
    <div class="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100/50 to-blue-100/50 
                rounded-full -translate-y-16 translate-x-16 blur-2xl"></div>
    
    <div class="relative flex items-center gap-3">
      <!-- 工具图标 -->
      <div class="w-10 h-10 rounded-lg overflow-hidden shadow-md shadow-blue-200/50 
                  flex items-center justify-center bg-white border border-slate-100">
        <el-image 
          v-if="toolInfo.logo" 
          :src="toolInfo.logo" 
          class="w-8 h-8 object-cover rounded"
          fit="cover"
        >
          <template #error>
            <div class="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 
                        flex items-center justify-center">
              <Setting class="w-4 h-4 text-white" />
            </div>
          </template>
        </el-image>
        <div v-else class="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 
                          flex items-center justify-center">
          <Setting class="w-4 h-4 text-white" />
        </div>
      </div>
      
      <div class="flex flex-col flex-1">
        <h1 class="text-lg font-semibold text-slate-800">
          {{ props.title }}
        </h1>
        <p class="text-xs text-slate-400 mt-0.5 line-clamp-1">
          {{ toolInfo.desc || '在线工具 · 简单高效' }}
        </p>
      </div>
      
      <!-- 分类标签 -->
      <div v-if="toolInfo.cate" class="hidden c-sm:flex items-center">
        <span class="px-2.5 py-0.5 rounded-full text-xs font-medium 
                     bg-blue-50 text-blue-600 border border-blue-100">
          {{ toolInfo.cate }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>