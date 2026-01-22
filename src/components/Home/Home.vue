<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterLink } from "vue-router"
import { ArrowRight, Top } from '@element-plus/icons-vue'
import { useToolsStore } from '@/store/modules/tools'
// import { ElMessage } from 'element-plus'
import { useRoute } from "vue-router"
//store
const toolsStore = useToolsStore()
const route = useRoute()
// const getToolsCate = async () => {
//   try {
//     await toolsStore.getToolCate()
//   } catch (error: any) {
//     ElMessage.error(error.message)
//   }
// }


onMounted(() => {
  // getToolsCate()
  if (route.query && route.query.value) {//底部导航跳转过来的则定位到响应位置
      document?.querySelector('#' + `${route.query.value}`)?.scrollIntoView();
  } else {//其他位置跳转过来不需要定位的则定位到顶部
      document?.querySelector('#collect')?.scrollIntoView()
  }
})
</script>

<template>
  <div class="md:mr-6 c-xs:mr-0">
    <!-- list -->
    <div v-for="(cate, index) in toolsStore.cates" :key="index" class="mb-8">
      <!-- cate title -->
      <div class="mt-8 mb-5 flex items-center gap-3" :id="'cate_' + cate.id">
        <div class="w-1.5 h-8 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
        <h2 class="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
          {{ cate.title }}
        </h2>
        <div class="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent ml-4"></div>
      </div>
      <!-- card -->
      <div class="grid gap-5 c-xs:grid-cols-1 c-sm:grid-cols-2 c-md:grid-cols-3 c-lg:grid-cols-4">
          <router-link 
            v-for="(item, index) in cate.list" 
            :key="index" 
            :to="item.url" 
            class="group relative flex flex-col p-5 bg-white rounded-2xl border border-slate-100 
                   shadow-sm hover:shadow-xl hover:shadow-blue-100/50 hover:border-blue-200
                   transition-all duration-300 hover:-translate-y-2 overflow-hidden"
          >
            <!-- 装饰背景 -->
            <div class="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-50 to-blue-50 
                        rounded-full -translate-y-12 translate-x-12 group-hover:scale-150 transition-transform duration-500"></div>
            
            <div class="relative flex items-center border-b border-slate-100 pb-4">
              <div class="relative">
                <el-image 
                  :src="item.logo" 
                  class="w-12 h-12 min-h-[3rem] min-w-[3rem] rounded-xl shadow-sm 
                         group-hover:shadow-md group-hover:scale-110 transition-all duration-300"
                ></el-image>
              </div>
              <div class="flex flex-col ml-4 flex-1">
                <div class="flex items-center gap-2">
                  <h3 class="font-semibold text-lg text-slate-800 group-hover:text-blue-600 
                             transition-colors line-clamp-1">{{ item.title }}</h3>
                </div>
                <div class="flex items-center gap-2 mt-1">
                  <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200">
                    {{ item.cate }}
                  </span>
                </div>
              </div>
            </div>
            
            <div class="flex items-center justify-between mt-4 flex-1">
              <el-text line-clamp="2" class="text-slate-500 text-sm leading-relaxed">{{ item.desc }}</el-text>
            </div>
            
            <!-- 悬停箭头 -->
            <div class="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center
                        opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 
                        transition-all duration-300">
              <ArrowRight class="w-4 h-4 text-blue-500" />
            </div>
          </router-link>
      </div>
    </div>

    <!-- 返回顶部 -->
    <el-backtop :right="20" :bottom="60" class="!bg-gradient-to-br !from-blue-500 !to-blue-600 !shadow-lg !shadow-blue-200">
      <div class="flex items-center justify-center w-full h-full text-white">
        <Top class="w-5 h-5" />
      </div>
    </el-backtop>
  </div>
</template>

<style scoped>
/* 使用 CSS Grid 自动处理间距，无需额外占位元素 */
</style>