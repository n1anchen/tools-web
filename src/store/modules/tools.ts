//创建tools相关的小工具
import { defineStore } from 'pinia'
import { getTools, getToolsCate } from '@/components/Tools/tools.ts'
import type { ToolsReqData, ToolsInfo } from '@/components/Tools/tools.type.ts'

export const useToolsStore = defineStore('tools', {
  //用来存放变量
  state: () => ({
    list: [] as ToolsInfo[],
    toolInfo: {} as ToolsInfo,
    cates: [] as any[],
    recommends: [] as ToolsInfo[],
    collect: [] as ToolsInfo[],
    collectIds: [] as number[],
  }),
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
  }
})