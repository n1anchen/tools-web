<template>
  <button @click="toggleTheme" class="theme-toggle-button">
    <transition name="fade" mode="out-in">
      <Icon v-if="!isDark" size="20" class="theme-icon">
        <SunIcon />
      </Icon>
      <Icon v-else size="18" class="theme-icon">
        <MoonIcon />
      </Icon>
    </transition>
  </button>
</template>

<script setup lang="ts">
import { useSettingStore } from '@/store/modules/setting'
import { storeToRefs } from 'pinia'
import { inject } from 'vue'
import { Sun as SunIcon, Moon as MoonIcon } from '@vicons/fa'
import { Icon } from '@vicons/utils'

const settingStore = useSettingStore()
const { isDark } = storeToRefs(settingStore)

const toggleTheme = inject('toggleTheme') as (event: MouseEvent) => void
</script>

<style scoped>
.theme-toggle-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem; /* 40px */
  height: 2.5rem; /* 40px */
  border-radius: 50%;
  background-color: transparent;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.theme-toggle-button:hover {
  background-color: rgba(128, 128, 128, 0.1);
}

.theme-icon {
  color: #334155;
}

.dark .theme-icon {
  color: #cbd5e1;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>