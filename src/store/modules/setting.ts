import { defineStore } from 'pinia'

const loadDarkMode = () => {
  try {
    return localStorage.getItem('isDark') === 'true'
  } catch {
    return false
  }
}

export const useSettingStore = defineStore('setting', {
  state: () => ({
    isDark: loadDarkMode(),
  }),
  actions: {
    setDark(value: boolean) {
      this.isDark = value
      try {
        localStorage.setItem('isDark', String(value))
      } catch {
        // Storage can be unavailable in private/restricted browser contexts.
      }
    },
  },
})
