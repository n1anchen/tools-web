import { defineStore } from 'pinia'

export const useComponentStore = defineStore('component', {
  //用来存放变量
  state: () => ({
    leftCom: false,
    leftComDrawer: false,
  }),
  //方法
  actions: {
    //设置左侧组件状态
    setLeftComStatus(status: boolean) {
      this.leftCom = status
    },
    //设置左侧组件状态(小屏)
    setleftComDrawerStatus(status: boolean) {
      this.leftComDrawer = status
    }
  }
})
