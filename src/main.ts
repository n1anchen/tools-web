import { createApp } from 'vue'
import App from './App.vue'
import ElementPlus from 'element-plus';
//@ts-ignore忽略当前文件ts类型的检测否则有红色提示(打包会失败)
//入口文件main.ts全局安装element-plus,element-plus默认支持语言英语设置为中文
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
//router
import router from './router'
//styles
import './styles/tailwind.css'
//element-plus css
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
//element-plus 设计语言统一覆盖（切换器胶囊圆角 + 主色挂钩 --c-primary），须置于 element-plus 样式之后
import './styles/element-plus.css'
//pinia
import pinia from './store'
const app = createApp(App)
//安装仓库
app.use(pinia)
app.use(router)
app.use(ElementPlus, {
  locale: zhCn
})
app.mount('#app')
