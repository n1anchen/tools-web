//创建tools相关的小工具
import { defineStore } from 'pinia'
import { getTools, getToolsCate, toolsList } from '@/components/Tools/tools.ts'
import type { ToolsReqData, ToolsInfo } from '@/components/Tools/tools.type.ts'

const FAVORITES_KEY = 'tools_favorites'

// getToolCate 记忆化：多个组件（Left×2、Home）挂载时并发调用也只会加载一次
let catesPromise: Promise<unknown> | null = null

const loadFavorites = (): ToolsInfo[] => {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    const favoriteUrls = new Set(
      parsed
        .map(item => typeof item === 'string' ? item : item?.url)
        .filter((url): url is string => typeof url === 'string'),
    )
    return toolsList().filter(tool => favoriteUrls.has(tool.url))
  } catch {
    return []
  }
}

const persistFavorites = (favorites: ToolsInfo[]) => {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites.map(tool => tool.url)))
    return true
  } catch {
    return false
  }
}

export const useToolsStore = defineStore('tools', {
  //用来存放变量
  state: () => ({
    cates: [] as any[],
    collect: loadFavorites() as ToolsInfo[],
  }),
  //getter
  getters: {
    isFavorite: (state) => (url: string): boolean => {
      return state.collect.some((t) => t.url === url)
    },
  },
  //方法
  actions: {
    //获取tools
    async getTools(data: ToolsReqData) {
      //发送请求
      const result: any = await getTools(data)
      return result
    },
    //获取tools cate（记忆化，幂等：重复调用不会重复加载）
    getToolCate() {
      catesPromise ??= Promise.resolve(getToolsCate()).then((result) => {
        this.cates = result
        return result
      })
      return catesPromise
    },
    //切换收藏状态
    toggleFavorite(tool: ToolsInfo) {
      const idx = this.collect.findIndex((t) => t.url === tool.url)
      if (idx === -1) {
        this.collect.push(tool)
      } else {
        this.collect.splice(idx, 1)
      }
      if (!persistFavorites(this.collect)) {
        if (idx === -1) {
          this.collect.pop()
        } else {
          this.collect.splice(idx, 0, tool)
        }
        return false
      }
      return true
    },
  }
})
