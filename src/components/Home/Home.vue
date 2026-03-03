<script setup lang="ts">
import { onMounted, computed, nextTick, ref, onBeforeUnmount } from 'vue';
import { ArrowRight } from '@element-plus/icons-vue'
import { StarRegular } from '@vicons/fa'
import { Icon } from '@vicons/utils'
import ToolIcon from '@/components/Common/ToolIcon.vue'
import BackToTop from '@/components/Common/BackToTop.vue'
import { useToolsStore } from '@/store/modules/tools'
// import { ElMessage } from 'element-plus'
import { useRoute, onBeforeRouteLeave } from "vue-router"
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

// 外部工具跳转确认浮层
const activeConfirmUrl = ref<string | null>(null)
let confirmTimer: ReturnType<typeof setTimeout> | null = null
const CONFIRM_TIMEOUT = 5000

const clearConfirmTimer = () => {
  if (confirmTimer !== null) {
    clearTimeout(confirmTimer)
    confirmTimer = null
  }
}

const showExternalConfirm = (url: string, event: MouseEvent) => {
  event.stopPropagation()
  clearConfirmTimer()
  activeConfirmUrl.value = url
  confirmTimer = setTimeout(() => {
    activeConfirmUrl.value = null
  }, CONFIRM_TIMEOUT)
}

const cancelConfirm = () => {
  clearConfirmTimer()
  activeConfirmUrl.value = null
}

const goExternal = (url: string) => {
  clearConfirmTimer()
  activeConfirmUrl.value = null
  window.open(url, '_blank')
}

const handleOutsideClick = () => {
  if (activeConfirmUrl.value !== null) {
    clearConfirmTimer()
    activeConfirmUrl.value = null
  }
}

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick)
  clearConfirmTimer()
})

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

const SCROLL_KEY = 'home_scroll_y'

onBeforeRouteLeave(() => {
  sessionStorage.setItem(SCROLL_KEY, String(window.scrollY))
})

onMounted(() => {
  document.addEventListener('click', handleOutsideClick)
  // getToolsCate()
  if (route.query && route.query.value) {
    // 底部导航跳转过来的则定位到响应位置
    sessionStorage.removeItem(SCROLL_KEY)
    scrollToAnchor(`${route.query.value}`)
  } else {
    const savedY = sessionStorage.getItem(SCROLL_KEY)
    if (savedY !== null) {
      // 恢复上次离开首页时的滚动位置
      sessionStorage.removeItem(SCROLL_KEY)
      nextTick(() => {
        window.scrollTo({ top: Number(savedY), behavior: 'instant' })
      })
    } else {
      // 其他情况回到顶部
      window.scrollTo({ top: 0, behavior: 'auto' })
    }
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
    <!-- 收藏工具分组 -->
    <div class="mb-8" id="cate_favorites">
      <div class="mt-8 mb-5 flex items-center gap-3">
        <div class="w-1.5 h-8 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
        <h2 class="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
          收藏工具
        </h2>
        <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200
                     dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600">{{ toolsStore.collect.length }}</span>
        <div class="flex-1 h-px bg-gradient-to-r from-slate-200 dark:from-slate-700 to-transparent ml-4"></div>
      </div>

      <!-- 空状态提示 -->
      <div v-if="toolsStore.collect.length === 0"
           class="group flex flex-col items-center justify-center gap-2.5 py-6 px-6 rounded-xl
                  border border-dashed border-slate-300 dark:border-slate-500
                  bg-slate-100 dark:bg-slate-800 text-center animate-fade-in
                  cursor-default
                  transition-[transform,box-shadow,border-color,background-color] duration-300
                  hover:-translate-y-1 hover:shadow-md hover:shadow-blue-100/60 dark:hover:shadow-blue-900/40
                  hover:border-blue-300 dark:hover:border-blue-500
                  hover:bg-white dark:hover:bg-slate-700/80">
        <div class="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center
                    transition-[transform,background-color] duration-300 group-hover:scale-110
                    group-hover:bg-blue-100 dark:group-hover:bg-blue-900/60">
          <Icon size="18">
            <StarRegular class="text-slate-400 dark:text-slate-500 transition-colors duration-300 group-hover:text-blue-400 dark:group-hover:text-blue-400" />
          </Icon>
        </div>
        <div>
          <p class="text-sm font-medium text-slate-600 dark:text-slate-300">还没有收藏的工具</p>
          <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">
            进入任意工具页（除独立工具外），点击右上角的
            <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600
                         bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs align-middle mx-0.5">
              ☆ 收藏
            </span>
            按钮即可添加，收藏后会显示在这里
          </p>
        </div>
      </div>

      <!-- 收藏列表 -->
      <div v-else class="grid gap-3 grid-cols-1 c-2xs:grid-cols-2 c-sm:grid-cols-3 c-md:grid-cols-4 c-lg:grid-cols-5">
        <component
          :is="isExternal(item.url) ? 'div' : 'router-link'"
          v-for="(item, index) in toolsStore.collect"
          :key="index"
          :to="!isExternal(item.url) ? item.url : undefined"
          @click="isExternal(item.url) ? showExternalConfirm(item.url, $event) : undefined"
          class="group relative flex flex-col p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700
                 shadow-sm hover:shadow-lg hover:shadow-blue-100/50 dark:hover:shadow-blue-900/50 hover:border-blue-200 dark:hover:border-blue-700
                 transition-[transform,box-shadow,border-color] duration-300 translate-y-0 hover:-translate-y-1 overflow-hidden cursor-pointer"
        >
          <div class="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-50
                      dark:from-slate-700 dark:to-slate-800
                      rounded-full -translate-y-8 translate-x-8 group-hover:scale-150 transition-transform duration-500"></div>

          <div class="relative flex items-center border-b border-slate-100 dark:border-slate-700 pb-2.5">
            <div :class="['relative rounded-lg scale-100 will-change-transform group-hover:scale-110 transition-[transform,box-shadow] duration-300',
                          !item.logo.startsWith('/') && !item.logo.startsWith('http') ? 'group-hover:shadow-md' : '']">
              <ToolIcon :logo="item.logo" :size="36" />
            </div>
            <div class="flex flex-col ml-2.5 flex-1 min-w-0">
              <h3 class="font-semibold text-sm text-slate-800 dark:text-slate-200 group-hover:text-blue-600
                         transition-colors line-clamp-1">{{ item.title }}</h3>
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

          <div class="absolute bottom-2.5 right-2.5 w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-900/50 flex items-center justify-center
                      opacity-0 group-hover:opacity-100 transform translate-x-1 group-hover:translate-x-0
                      transition-all duration-300">
            <ArrowRight class="w-3 h-3 text-blue-500 dark:text-blue-400" />
          </div>

          <!-- 外部工具跳转确认浮层 -->
          <Transition name="confirm-fade">
            <div v-if="isExternal(item.url) && activeConfirmUrl === item.url"
                 class="absolute inset-0 rounded-xl bg-white/96 dark:bg-slate-800/96 backdrop-blur-sm
                        flex flex-col items-center justify-center gap-2.5 p-3 z-10"
                 @click.stop>
              <div class="text-center px-1">
                <p class="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">该工具为独立工具</p>
                <p class="text-xs text-blue-500 break-all leading-relaxed line-clamp-2">{{ item.url }}</p>
                <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">要离开本站吗？</p>
              </div>
              <div class="flex items-center gap-2">
                <button @click.stop="cancelConfirm"
                        class="px-3 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-600
                               bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                  取消
                </button>
                <button @click.stop="goExternal(item.url)"
                        class="px-3 py-1 text-xs rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors">
                  跳转
                </button>
              </div>
            </div>
          </Transition>
        </component>
      </div>
    </div>

    <!-- 常规分类列表 -->
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
      <div class="grid gap-3 grid-cols-1 c-2xs:grid-cols-2 c-sm:grid-cols-3 c-md:grid-cols-4 c-lg:grid-cols-5">
          <component 
            :is="isExternal(item.url) ? 'div' : 'router-link'" 
            v-for="(item, index) in cate.list" 
            :key="index" 
            :to="!isExternal(item.url) ? item.url : undefined"
            @click="isExternal(item.url) ? showExternalConfirm(item.url, $event) : undefined"
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

            <!-- 外部工具跳转确认浮层 -->
            <Transition name="confirm-fade">
              <div v-if="isExternal(item.url) && activeConfirmUrl === item.url"
                   class="absolute inset-0 rounded-xl bg-white/96 dark:bg-slate-800/96 backdrop-blur-sm
                          flex flex-col items-center justify-center gap-2.5 p-3 z-10"
                   @click.stop>
                <div class="text-center px-1">
                  <p class="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">该工具为独立工具</p>
                  <p class="text-xs text-blue-500 break-all leading-relaxed line-clamp-2">{{ item.url }}</p>
                  <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">要离开本站吗？</p>
                </div>
                <div class="flex items-center gap-2">
                  <button @click.stop="cancelConfirm"
                          class="px-3 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-600
                                 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                    取消
                  </button>
                  <button @click.stop="goExternal(item.url)"
                          class="px-3 py-1 text-xs rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors">
                    跳转
                  </button>
                </div>
              </div>
            </Transition>
          </component>
      </div>
    </div>

    <!-- 返回顶部 -->
    <BackToTop :right="20" :bottom="60" />
  </div>
</template>

<style scoped>
/* 使用 CSS Grid 自动处理间距，无需额外占位元素 */

/* 外部工具确认浮层过渡动画 */
.confirm-fade-enter-active,
.confirm-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.confirm-fade-enter-from,
.confirm-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
