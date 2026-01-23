<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { More, Expand, Fold, HomeFilled, InfoFilled } from '@element-plus/icons-vue';
import { useToolsStore } from '@/store/modules/tools'
import { useComponentStore } from '@/store/modules/component'
import 'element-plus/theme-chalk/display.css'
import { ToolsInfo } from '@/components/Tools/tools.type.ts';

import router from '@/router';
// const isNavDrawer = ref(false)
const loading = ref(false)
const options = ref<ToolsInfo[]>([])
const searchValue = ref<string | number>('') // 用于 el-select 的 v-model
//store
const toolsStore = useToolsStore()
const componentStore = useComponentStore()
//查询参数
const searchParam = reactive({
  cateId: 0,
  title: '',
  route: '',
})

//search
// const search = async () => {
//   try {
//     await toolsStore.getTools(searchParam)
//     //关闭抽屉
//     isNavDrawer.value = false
//   } catch (error) {
//     console.log(error)
//   }
// }

//选择分类
// const chooseCate = (cateId: number) => {
//   searchParam.cateId = cateId
//   search()
// }

//搜索工具
const searchTools = async (query: string) => {
  loading.value = true
  options.value = []
  if (query) {
    searchParam.title = query
    options.value = await toolsStore.getTools(searchParam)
  }
  loading.value = false
}

//保存到桌面
// const createUrlShortcut = async () => {
//   try {
//     const blob = new Blob(
//       [`[InternetShortcut]\nURL=${encodeURI(window.location.href)}`],
//       { type: 'text/plain' }
//     );
//     const a = document.createElement('a');
//     a.href = URL.createObjectURL(blob);
//     a.download = 'Tools-Web.url';
//     a.click();
//   } catch (error) {
//     console.error('创建URL快捷方式失败:', error);
//   }
// }

const optionClick = (url: string) => {
  router.push(url)
  // 跳转后清空选中值，以便下次可以继续搜索
  searchValue.value = ''
  options.value = []
}

onMounted(() => {
})
</script>

<template>
  <header class="h-20 w-full flex justify-between items-center px-2 py-3 
                 bg-white/80 backdrop-blur-md border-b border-slate-100 
                 c-xs:h-16 sticky top-0 z-50">
    <div class="flex items-center w-full gap-3">
      <!-- 移动端菜单按钮 -->
      <button 
        @click="componentStore.setleftComDrawerStatus(!componentStore.leftComDrawer)" 
        class="p-2 rounded-xl hover:bg-slate-100 transition-colors duration-200 hidden c-sm:block c-md:hidden c-xs:block"
      >
        <More class="w-6 h-6 text-slate-600" />
      </button>

      <!-- 桌面端菜单按钮 -->
      <Transition name="fold" class="hidden c-md:block">
        <button 
          v-if="!componentStore.leftCom" 
          @click="componentStore.setLeftComStatus(true)" 
          class="p-2 rounded-xl hover:bg-slate-100 transition-colors duration-200"
        >
          <Fold class="w-6 h-6 text-slate-600" />
        </button>
        <button 
          v-else 
          @click="componentStore.setLeftComStatus(false)" 
          class="p-2 rounded-xl hover:bg-slate-100 transition-colors duration-200"
        >
          <Expand class="w-6 h-6 text-slate-600" />
        </button>
      </Transition>

      <!-- 首页图标 -->
      <router-link 
        to="/" 
        class="p-2 rounded-xl hover:bg-blue-50 transition-all duration-200 group"
      >
        <HomeFilled class="w-5 h-5 text-slate-600 group-hover:scale-110 transition-transform" />
      </router-link>
      
      <!-- 搜索框 -->
      <div class="c-xs:flex-1 flex-1 max-w-2xl search-container">
        <el-select
          v-model="searchValue"
          filterable
          remote
          reserve-keyword
          remote-show-suffix
          clearable
          :suffix-transition="false"
          placeholder="搜索工具，如文本、json、图片..."
          :remote-method="searchTools"
          :loading="loading"
          class="w-full search-input"
          size="large"
          popper-class="search-dropdown"
          @clear="options = []"
        >
          <el-option
            v-for="item in options"
            :key="item.id"
            :label="item.title"
            :value="item.id"
            @click="optionClick(item.url)"
            class="search-option"
          >
            <div class="search-option-content">
              <div class="search-option-icon">
                <img v-if="item.logo" :src="item.logo" :alt="item.title" />
                <span v-else>{{ item.title.charAt(0) }}</span>
              </div>
              <div class="search-option-text">
                <span class="search-option-title">{{ item.title }}</span>
                <span class="search-option-desc">{{ item.desc }}</span>
              </div>
            </div>
          </el-option>
        </el-select>
      </div>
    </div>

    <!-- 右侧操作区 -->
    <div class="flex items-center gap-2">
      <!-- GitHub -->
      <a 
        href="https://github.com/n1anchen/tools-web" 
        target="_blank"
        class="flex items-center gap-2 px-3 py-2 rounded-xl 
               hover:bg-slate-100 text-slate-600 hover:text-slate-900 
               transition-all duration-200"
      >
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd"></path>
        </svg>
      </a>

      <!-- 关于 -->
      <router-link 
        to="/about" 
        class="hidden c-sm:flex items-center gap-2 px-3 py-2 rounded-xl 
               hover:bg-blue-50 text-slate-600 hover:text-blue-600 
               transition-all duration-200"
      >
        <InfoFilled class="w-5 h-5" />
      </router-link>
    </div>
  </header>
</template>

<style scoped>
.fold-enter-active {
  transition: all 0.3s ease-out;
}

.fold-enter-from,
.fold-leave-to {
  transform: translateX(10px);
  opacity: 0;
}

/* 搜索框样式美化 */
.search-input :deep(.el-select__wrapper) {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  transition: all 0.3s ease;
  padding: 4px 12px;
}

.search-input :deep(.el-select__wrapper:hover) {
  border-color: #93c5fd;
  box-shadow: 0 4px 6px -1px rgb(59 130 246 / 0.1);
}

.search-input :deep(.el-select__wrapper.is-focused) {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-input :deep(.el-select__placeholder) {
  color: #94a3b8;
}

</style>

<style>
/* 搜索下拉框全局样式 - 必须非 scoped 因为下拉框通过 teleport 渲染到 body */
.search-dropdown.el-select__popper {
  border-radius: 12px !important;
  border: 1px solid #e2e8f0 !important;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.12) !important;
  padding: 6px !important;
  background: #fff !important;
  /* 强制限制最大宽度为搜索框容器宽度 */
  max-width: min(672px, calc(100vw - 180px)) !important;
}

.search-dropdown .el-scrollbar {
  max-width: 100% !important;
}

.search-dropdown .el-scrollbar__view {
  max-width: 100% !important;
}

/* 限制下拉框内容区域宽度 */
.search-dropdown .el-select-dropdown__wrap {
  max-height: 320px;
}

.search-dropdown .el-select-dropdown__list {
  padding: 0 !important;
}

.search-dropdown .el-select-dropdown__item {
  padding: 8px 10px !important;
  border-radius: 8px !important;
  margin: 3px 0 !important;
  height: auto !important;
  line-height: normal !important;
  transition: all 0.15s ease !important;
}

.search-dropdown .el-select-dropdown__item:hover {
  background: #f1f5f9 !important;
}

.search-dropdown .el-select-dropdown__item.is-selected {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
}

.search-dropdown .el-select-dropdown__item.is-selected .search-option-title,
.search-dropdown .el-select-dropdown__item.is-selected .search-option-desc,
.search-dropdown .el-select-dropdown__item.is-selected .search-option-icon span {
  color: white !important;
}

.search-dropdown .el-select-dropdown__item.is-selected .search-option-icon {
  background: rgba(255, 255, 255, 0.25) !important;
}

/* 选项内容样式 - 关键：限制宽度 */
.search-dropdown .search-option-content {
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 100%;
  box-sizing: border-box;
}

.search-dropdown .search-option-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.search-dropdown .search-option-icon img {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.search-dropdown .search-option-icon span {
  color: #3b82f6;
  font-weight: 600;
  font-size: 13px;
}

.search-dropdown .search-option-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.search-dropdown .search-option-title {
  font-weight: 600;
  font-size: 13px;
  color: #334155;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.4;
}

.search-dropdown .search-option-desc {
  font-size: 11px;
  color: #94a3b8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
}

/* 空状态 */
.search-dropdown .el-select-dropdown__empty {
  padding: 20px 16px;
  color: #94a3b8;
  font-size: 13px;
}

/* 滚动条美化 */
.search-dropdown .el-select-dropdown__wrap::-webkit-scrollbar {
  width: 5px;
}

.search-dropdown .el-select-dropdown__wrap::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.search-dropdown .el-select-dropdown__wrap::-webkit-scrollbar-track {
  background: transparent;
}
</style>