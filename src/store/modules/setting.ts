import { defineStore } from 'pinia'

export const useSettingStore = defineStore('setting', {
  state: () => ({
    isDark: JSON.parse(localStorage.getItem('isDark') as string) || false,
  }),
})
