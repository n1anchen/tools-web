<script setup lang="ts">
// import { Tools } from '@element-plus/icons-vue'
import { Management, InfoFilled } from '@element-plus/icons-vue'
import { onMounted, ref, reactive } from 'vue';
import { useToolsStore } from '@/store/modules/tools'
import { useRouter, useRoute } from "vue-router"
const router = useRouter()
const route = useRoute()

const appName = ref(import.meta.env.VITE_APP_TITLE || '在线工具箱')
const appNet = ref(import.meta.env.VITE_APP_DESC || '')
//菜单选中
const defaultActive = ref('')
//默认展开的菜单
const defaultOpeneds = ['cate']
//store
const toolsStore = useToolsStore()
//获取分类
const getToolCates = async () => {
  try {
    await toolsStore.getToolCate()
  } catch (error) {
    console.log(error)
  }
}

const handleOpen = () => {

}

const handleClose = () => {
  
}

//跳转锚点
const query = reactive({ value: '' })
const gotoAnchor = (anchor: string) => {
  console.log(route.path)
  if (route.path === '/') {
    document?.getElementById(anchor)?.scrollIntoView({
      behavior: "smooth", //smooth:平滑，auto：直接定位
      block: "start",
      inline: "start",
    });
  } else {
    query.value = anchor
    router.push({
      path: '/',
      query: query
    })
  }
}
const gotoAbout = () => {
  router.push('about')
}

onMounted(async () => {
  await getToolCates()
  
})
</script>

<template>
  <!--  -->
    <el-scrollbar class="h-full bg-white dark:bg-slate-900">
      <!-- logo -->
      <div class="flex justify-center pt-6 pb-4">
        <router-link class="flex flex-row items-center group" to="/">
          <img 
            class="h-14 w-14 rounded-2xl shadow-lg shadow-blue-200/50 dark:shadow-blue-800/50
                   group-hover:shadow-xl group-hover:shadow-blue-300/50 dark:group-hover:shadow-blue-700/50
                   transition-all duration-300 group-hover:scale-105" 
            src="@/assets/logo.jpg" 
            :alt="appNet"
          >
          <div class="flex flex-col ml-4">
            <div class="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 
                        dark:from-blue-500 dark:to-blue-600
                        bg-clip-text text-transparent">{{ appName }}</div>
            <div class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{{ appNet }}</div>
          </div>
        </router-link>
      </div>
      
      <!-- 分割线 -->
      <div class="mx-6 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent mb-4"></div>
      
      <!-- menu -->
      <div class="px-4">
        <el-menu
          class="sidebar-menu"
          :default-active="defaultActive"
          :default-openeds="defaultOpeneds"
          background-color="transparent"
          @open="handleOpen"
          @close="handleClose"
        >
          <el-sub-menu index="cate">
            <template #title>
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 
                            flex items-center justify-center shadow-sm">
                  <Management class="w-4 h-4 text-white" />
                </div>
                <span class="font-semibold text-slate-700 dark:text-slate-200">工具分类</span>
              </div>
            </template>
            <el-menu-item-group>
                <el-menu-item
                  @click="gotoAnchor('cate_' + item.id)"
                  :index="item.id.toString()"
                  v-for="(item,index) in toolsStore.cates" 
                  :key="index"
                  class="menu-item-custom"
                >
                  <span class="flex items-center gap-2">
                    <span class="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                    {{ item.title }}
                  </span>
              </el-menu-item>
            </el-menu-item-group>
          </el-sub-menu>
          
          <el-menu-item index="about" @click="gotoAbout" class="menu-item-custom mt-2">
            <template #title>
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 
                            flex items-center justify-center shadow-sm">
                  <InfoFilled class="w-4 h-4 text-white" />
                </div>
                <span class="font-semibold text-slate-700 dark:text-slate-200">关于本站</span>
              </div>
            </template>
          </el-menu-item>
        </el-menu>
      </div>
      
      <!-- 底部装饰背景 -->
      <div class="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-blue-50/50 to-transparent dark:from-blue-900/20 pointer-events-none"></div>
    </el-scrollbar>
  <!-- </div> -->
</template>

<style scoped>
/* 侧边栏菜单样式 */
.sidebar-menu {
  border: none !important;
  padding: 0 !important;
}

.sidebar-menu :deep(.el-sub-menu__title) {
  padding: 12px 16px !important;
  border-radius: 12px;
  margin-bottom: 4px;
  transition: all 0.3s ease;
}

.sidebar-menu :deep(.el-sub-menu__title:hover) {
  background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
}

.sidebar-menu :deep(.el-sub-menu.is-opened > .el-sub-menu__title) {
  background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
}

.sidebar-menu :deep(.el-menu-item-group__title) {
  display: none;
}

.menu-item-custom {
  padding: 10px 16px !important;
  margin: 4px 0 !important;
  border-radius: 10px !important;
  height: auto !important;
  line-height: 1.5 !important;
  transition: all 0.3s ease !important;
  color: #64748b !important;
}

.menu-item-custom:hover {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%) !important;
  color: #6366f1 !important;
  transform: translateX(4px);
}

.menu-item-custom.is-active {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
  color: white !important;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.menu-item-custom.is-active span .w-1\.5 {
  background-color: white !important;
}

/* 子菜单项间距 */
.sidebar-menu :deep(.el-menu-item-group ul) {
  padding-left: 20px;
}

/* Dark Mode Styles */
.dark .sidebar-menu :deep(.el-sub-menu__title:hover),
.dark .sidebar-menu :deep(.el-sub-menu.is-opened > .el-sub-menu__title) {
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
}

.dark .menu-item-custom {
  color: #94a3b8 !important;
}

.dark .menu-item-custom:hover {
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%) !important;
  color: #a5b4fc !important;
}

.dark .menu-item-custom.is-active {
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.4) !important;
}
</style>