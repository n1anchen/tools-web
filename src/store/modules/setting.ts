import { defineStore } from 'pinia'

/** 默认品牌主色（OKLCH L=0.80 C=0.10 Hue=265°，与色条/预设色同色彩空间） */
export const DEFAULT_PRIMARY_COLOR = '#5882ff'

const loadDarkMode = () => {
  try {
    return localStorage.getItem('isDark') === 'true'
  } catch {
    return false
  }
}

const loadPrimaryColor = () => {
  try {
    return localStorage.getItem('primaryColor') || DEFAULT_PRIMARY_COLOR
  } catch {
    return DEFAULT_PRIMARY_COLOR
  }
}

/** 应用主色到根元素（inline style 覆盖 :root 默认值，color-mix 色阶与 EP 挂钩自动跟随） */
const applyPrimaryColor = (color: string) => {
  document.documentElement.style.setProperty('--c-primary', color)
}

export const useSettingStore = defineStore('setting', {
  state: () => ({
    isDark: loadDarkMode(),
    primaryColor: loadPrimaryColor(),
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
    setPrimaryColor(value: string) {
      this.primaryColor = value
      try {
        localStorage.setItem('primaryColor', value)
      } catch {
        // Storage can be unavailable in private/restricted browser contexts.
      }
      applyPrimaryColor(value)
    },
    resetPrimaryColor() {
      this.primaryColor = DEFAULT_PRIMARY_COLOR
      try {
        localStorage.setItem('primaryColor', DEFAULT_PRIMARY_COLOR)
      } catch {
        // Storage can be unavailable in private/restricted browser contexts.
      }
      // 移除 inline style，回退到 tailwind.css 的 :root 默认值
      document.documentElement.style.removeProperty('--c-primary')
    },
  },
})
