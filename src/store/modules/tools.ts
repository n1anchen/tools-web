//创建tools相关的小工具
import { defineStore } from 'pinia'
import { getTools, getToolsCate } from '@/components/Tools/tools.ts'
import type { ToolsReqData, ToolsInfo } from '@/components/Tools/tools.type.ts'

const FAVORITES_KEY = 'tools_favorites'

const loadFavorites = (): ToolsInfo[] => {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export const useToolsStore = defineStore('tools', {
  //用来存放变量
  state: () => ({
    list: [] as ToolsInfo[],
    toolInfo: {} as ToolsInfo,
    cates: [] as any[],
    recommends: [] as ToolsInfo[],
    collect: loadFavorites() as ToolsInfo[],
    collectIds: [] as number[],
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
      this.list = result
      return result
    },
    //获取tool info
    async getToolInfo(data: ToolsReqData) {
      //发送请求
      const result: any = await getTools(data)
      this.toolInfo = result
      return result
    },
    //获取tools cate
    async getToolCate() {
      //发送请求
      this.cates = await getToolsCate()
    },
    //切换收藏状态
    toggleFavorite(tool: ToolsInfo) {
      const idx = this.collect.findIndex((t) => t.url === tool.url)
      if (idx === -1) {
        this.collect.push(tool)
      } else {
        this.collect.splice(idx, 1)
      }
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(this.collect))
    },
  }
})
