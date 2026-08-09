<template>
  <button
    type="button"
    class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-none bg-transparent transition-colors duration-200 hover:bg-[rgba(128,128,128,0.1)]"
    :aria-label="isDark ? '切换到亮色主题' : '切换到暗色主题'"
    @click="toggleTheme"
  >
    <transition name="fade" mode="out-in">
      <Icon v-if="!isDark" size="20" class="text-[#334155] dark:text-[#cbd5e1]">
        <SunIcon />
      </Icon>
      <Icon v-else size="18" class="text-[#334155] dark:text-[#cbd5e1]">
        <MoonIcon />
      </Icon>
    </transition>
  </button>
</template>

<script setup lang="ts">
import { useSettingStore } from '@/store/modules/setting'
import { storeToRefs } from 'pinia'
import { inject } from 'vue'
import { Sun as SunIcon, Moon as MoonIcon } from '@nicons/fa'
import { Icon } from '@vicons/utils'

const settingStore = useSettingStore()
const { isDark } = storeToRefs(settingStore)

const toggleTheme = inject('toggleTheme') as (event: MouseEvent) => void
</script>

<style scoped>
/* Vue Transition 钩子类（fade 动画） */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
