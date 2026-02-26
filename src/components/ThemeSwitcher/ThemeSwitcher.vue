<template>
  <button @click="toggleTheme" class="theme-toggle-button">
    <transition name="fade" mode="out-in">
      <SunIcon v-if="!isDark" class="theme-icon" />
      <MoonIcon v-else class="theme-icon" />
    </transition>
  </button>
</template>

<script setup lang="ts">
import { useSettingStore } from '@/store/modules/setting'
import { storeToRefs } from 'pinia'
import { inject } from 'vue'
import { Sunny as SunIcon, Moon as MoonIcon } from '@element-plus/icons-vue'

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
  width: 1.25rem; /* 20px */
  height: 1.25rem; /* 20px */
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