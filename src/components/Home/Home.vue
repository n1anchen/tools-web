<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { RouterLink } from "vue-router"
import { ArrowRight, Top } from '@element-plus/icons-vue'
import ToolIcon from '@/components/Common/ToolIcon.vue'
import { useToolsStore } from '@/store/modules/tools'
// import { ElMessage } from 'element-plus'
import { useRoute } from "vue-router"
//store
const toolsStore = useToolsStore()
const route = useRoute()

// 计算所有工具的总数
const totalToolsCount = computed(() => {
  return toolsStore.cates.reduce((sum, cate) => sum + (cate.list?.length || 0), 0)
})

const isExternal = (path: string) => {
  return /^(http|https):\/\//.test(path)
}

// const getToolsCate = async () => {
//   try {
//     await toolsStore.getToolCate()
//   } catch (error: any) {
//     ElMessage.error(error.message)
//   }
// }


const HEADER_HEIGHT = 80
const scrollToAnchor = (id: string, offset = HEADER_HEIGHT) => {
  const el = document.getElementById(id)
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - offset
  window.scrollTo({ top, behavior: 'smooth' })
}

onMounted(() => {
  // getToolsCate()
  if (route.query && route.query.value) {//底部导航跳转过来的则定位到响应位置
      scrollToAnchor(`${route.query.value}`)
  } else {//其他位置跳转过来不需要定位的则定位到顶部
      window.scrollTo({ top: 0, behavior: 'auto' })
  }
})
</script>

<template>
  <div class="md:mr-6 c-xs:mr-0">
    <!-- 工具总数统计 -->
    <div class="mt-6 mb-2 flex items-center gap-2">
      <span class="text-sm text-slate-500 dark:text-slate-400">本站目前共有</span>
      <span class="px-2 py-0.5 rounded-full text-sm font-semibold bg-blue-50 text-blue-600 border border-blue-200
                   dark:bg-blue-900/50 dark:text-blue-400 dark:border-blue-800">{{ totalToolsCount }}</span>
      <span class="text-sm text-slate-500 dark:text-slate-400">个工具</span>
    </div>
    <!-- list -->
    <div v-for="(cate, index) in toolsStore.cates" :key="index" class="mb-8">
      <!-- cate title -->
      <div class="mt-8 mb-5 flex items-center gap-3" :id="'cate_' + cate.id">
        <div class="w-1.5 h-8 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
        <h2 class="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
          {{ cate.title }}
        </h2>
        <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200
                     dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600">{{ cate.list?.length || 0 }}</span>
        <div class="flex-1 h-px bg-gradient-to-r from-slate-200 dark:from-slate-700 to-transparent ml-4"></div>
      </div>
      <!-- card -->
      <div class="grid gap-3 c-xs:grid-cols-2 c-sm:grid-cols-3 c-md:grid-cols-4 c-lg:grid-cols-5">
          <component 
            :is="isExternal(item.url) ? 'a' : 'router-link'" 
            v-for="(item, index) in cate.list" 
            :key="index" 
            :to="!isExternal(item.url) ? item.url : undefined" 
            :href="isExternal(item.url) ? item.url : undefined"
            :target="isExternal(item.url) ? '_blank' : undefined"
            class="group relative flex flex-col p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 
                   shadow-sm hover:shadow-lg hover:shadow-blue-100/50 dark:hover:shadow-blue-900/50 hover:border-blue-200 dark:hover:border-blue-700
                   transition-[transform,box-shadow,border-color] duration-300 translate-y-0 hover:-translate-y-1 overflow-hidden cursor-pointer"
          >
            <!-- 装饰背景 -->
            <div class="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-50 
                        dark:from-slate-700 dark:to-slate-800
                        rounded-full -translate-y-8 translate-x-8 group-hover:scale-150 transition-transform duration-500"></div>
            
            <div class="relative flex items-center border-b border-slate-100 dark:border-slate-700 pb-2.5">
              <div :class="['relative rounded-lg scale-100 will-change-transform group-hover:scale-110 transition-[transform,box-shadow] duration-300',
                            !item.logo.startsWith('/') && !item.logo.startsWith('http') ? 'group-hover:shadow-md' : '']">
                <ToolIcon :logo="item.logo" :size="36" />
              </div>
              <div class="flex flex-col ml-2.5 flex-1 min-w-0">
                <div class="flex items-center gap-1.5">
                  <h3 class="font-semibold text-sm text-slate-800 dark:text-slate-200 group-hover:text-blue-600 
                             transition-colors line-clamp-1">{{ item.title }}</h3>
                </div>
                <div class="flex items-center gap-1.5 mt-0.5">
                  <span class="px-1.5 py-0 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200
                               dark:bg-blue-900/50 dark:text-blue-400 dark:border-blue-800 truncate max-w-full">
                    {{ item.cate }}
                  </span>
                </div>
              </div>
            </div>
            
            <div class="flex items-center justify-between mt-2 flex-1">
              <el-text line-clamp="2" class="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">{{ item.desc }}</el-text>
            </div>
            
            <!-- 悬停箭头 -->
            <div class="absolute bottom-2.5 right-2.5 w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-900/50 flex items-center justify-center
                        opacity-0 group-hover:opacity-100 transform translate-x-1 group-hover:translate-x-0 
                        transition-all duration-300">
              <ArrowRight class="w-3 h-3 text-blue-500 dark:text-blue-400" />
            </div>
          </component>
      </div>
    </div>

    <!-- 返回顶部 -->
    <el-backtop :right="20" :bottom="60" class="!bg-gradient-to-br !from-blue-500 !to-blue-600 !shadow-lg !shadow-blue-200 dark:!shadow-blue-800/50">
      <div class="flex items-center justify-center w-full h-full text-white">
        <Top class="w-5 h-5" />
      </div>
    </el-backtop>
  </div>
</template>

<style scoped>
/* 使用 CSS Grid 自动处理间距，无需额外占位元素 */
</style>
