<script setup lang="ts">
import Header from '@/components/Layout/Header/Header.vue'
import Left from '@/components/Layout/Left/Left.vue'
import Floor from '@/components/Layout/Floor/Floor.vue'
// import Right from '@/components/Layout/Right/Right.vue'
import { useComponentStore } from '@/store/modules/component'

//store
const componentStore = useComponentStore()

</script>

<template>
  <el-container class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
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
