<script setup lang="ts">
import Header from '@/components/Layout/Header/Header.vue'
import Left from '@/components/Layout/Left/Left.vue'
import Floor from '@/components/Layout/Floor/Floor.vue'
// import Right from '@/components/Layout/Right/Right.vue'
import { useComponentStore } from '@/store/modules/component'
import { useSettingStore } from '@/store/modules/setting'
import { provide, onMounted } from 'vue'
import { storeToRefs } from 'pinia'

// Pinia Stores
const componentStore = useComponentStore()
const settingStore = useSettingStore()
const { isDark } = storeToRefs(settingStore)

// Theme toggle function with ripple animation
const toggleTheme = (event: MouseEvent) => {
  const isDarkNow = settingStore.isDark

  // Fallback for browsers that don't support View Transitions
  if (!document.startViewTransition) {
    settingStore.isDark = !isDarkNow
    document.documentElement.classList.toggle('dark', !isDarkNow)
    localStorage.setItem('isDark', JSON.stringify(!isDarkNow))
    return
  }

  const x = event.clientX
  const y = event.clientY
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  )

  // 打上方向标记，CSS 通过此 class 区分 z-index，避免伪元素选择器语法问题
  const directionClass = isDarkNow ? 'theme-to-light' : 'theme-to-dark'
  document.documentElement.classList.add(directionClass)

  // 禁用页面所有 CSS transition，避免主题切换时大量元素同时触发过渡动画
  // 导致 View Transition 截图阶段需要光栅化大量动画中间态，造成卡顿
  document.documentElement.classList.add('theme-switching')

  const transition = document.startViewTransition(() => {
    settingStore.isDark = !isDarkNow
    document.documentElement.classList.toggle('dark', !isDarkNow)
    localStorage.setItem('isDark', JSON.stringify(!isDarkNow))
  })

  transition.ready.then(() => {
    // 两个方向统一：新画面从点击位置扩散覆盖旧画面
    // 亮→暗：暗色新画面扩散；暗→亮：亮色新画面扩散
    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${endRadius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration: 450,
        easing: 'ease-out',
        pseudoElement: '::view-transition-new(root)',
      },
    )
  })

  // 动画结束后清除方向标记和禁用 transition 的 class
  transition.finished.then(() => {
    document.documentElement.classList.remove(directionClass)
    document.documentElement.classList.remove('theme-switching')
  })
}

// Provide the function to child components
provide('toggleTheme', toggleTheme)

// Set initial theme on component mount
onMounted(() => {
  if (settingStore.isDark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
})
</script>

<template>
  <el-container class="min-h-screen bg-slate-50 dark:bg-slate-900">
    <!-- left -->
    <el-aside 
      class="fixed top-0 left-0 h-full z-20 c-md:block c-sm:hidden c-xs:hidden
             border-r border-slate-100 shadow-xl shadow-slate-200/50" 
      width="260px" 
      v-show="!componentStore.leftCom"
    >
      <Left></Left>
    </el-aside>
    <el-drawer 
      show-close
      size="260px" 
      :with-header="false" 
      v-model="componentStore.leftComDrawer" 
      direction="ltr"
      class="!shadow-2xl"
    >
      <Left></Left>
    </el-drawer>

    <!-- right -->
    <el-container :class="!componentStore.leftCom ? 'c-md:ml-[260px]' : ''" class="transition-all duration-300">
      <el-header class="!p-0 !h-auto sticky top-0 z-30">
        <Header/>
      </el-header>
      <el-main class="!p-3 md:!p-4 !pt-2">
        <router-view v-slot="{ Component, route }">
          <transition name="page" mode="out-in">
            <component :is="Component" :key="route.path"></component>
          </transition>
        </router-view>
      </el-main>
      <el-footer class="md:mb-4 mt-6 c-xs:mb-12 !h-auto">
        <Floor />
      </el-footer>
    </el-container>

  </el-container>
</template>

<style scoped>
/* 页面过渡动画 */
.page-enter-from {
  opacity: 0;
  transform: translateY(20px);
}
.page-enter-to {
  opacity: 1;
  transform: translateY(0);
}
.page-leave-from {
  opacity: 1;
  transform: translateY(0);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
.page-enter-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.page-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 抽屉样式 */
:deep(.el-drawer) {
  border-radius: 0 20px 20px 0;
}

:deep(.el-drawer__body) {
  padding: 0;
}
</style>

<!-- view-transition 样式必须为全局（非 scoped），否则 scoped hash 会导致伪元素选择器失效 -->
<style>
/* 禁用默认的 view-transition 淡入淡出，全部由 JS 动画控制 */
::view-transition-old(root),
::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
  will-change: clip-path;
}

/* 两个方向均让新画面在上方扩散覆盖旧画面 */
.theme-to-dark::view-transition-new(root),
.theme-to-light::view-transition-new(root) {
  z-index: 9999;
}
.theme-to-dark::view-transition-old(root),
.theme-to-light::view-transition-old(root) {
  z-index: 1;
}

/* 主题切换期间禁用页面所有 CSS transition/animation，
   防止大量元素（如首页 ~100 张卡片的 transition-all）在截图阶段
   同时触发重绘，造成 View Transition 卡顿 */
.theme-switching *,
.theme-switching *::before,
.theme-switching *::after {
  transition: none !important;
  animation: none !important;
}
</style>
