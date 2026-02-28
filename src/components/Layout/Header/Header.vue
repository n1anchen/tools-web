<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Bars, AngleRight, AngleLeft, Home, InfoCircle, Github } from '@vicons/fa';
import { Icon } from '@vicons/utils'
import ThemeSwitcher from '@/components/ThemeSwitcher/ThemeSwitcher.vue';
import ToolIcon from '@/components/Common/ToolIcon.vue';
import { useToolsStore } from '@/store/modules/tools'
import { useComponentStore } from '@/store/modules/component'
import 'element-plus/theme-chalk/display.css'
import { ToolsInfo } from '@/components/Tools/tools.type.ts';

import router from '@/router';
// const isNavDrawer = ref(false)
const loading = ref(false)
const options = ref<ToolsInfo[]>([])
const searchValue = ref<string | number>('') // 用于 el-select 的 v-model
const selectRef = ref()
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

// 解决/处理移动端输入法/兼容性问题导致无法搜索
const handleMobileInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  // 如果是 compositionend 事件，或者 input 事件且不是正在组合输入
  if (target && (e.type === 'compositionend' || (e.type === 'input' && !(e as any).isComposing))) {
     // 这里加一个小延时，确保 value 已经是最新的，并且避免和 el-select 内部的逻辑冲突（虽然 internal logic 可能没触发）
     setTimeout(() => {
        searchTools(target.value)
     }, 0)
  }
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
  if (/^(http|https):\/\//.test(url)) {
    window.open(url, '_blank')
  } else {
    router.push(url)
  }
  // 跳转后清空选中值，以便下次可以继续搜索
  searchValue.value = ''
  options.value = []
}

onMounted(() => {
  // 针对移动端输入法的兼容处理
  if (selectRef.value) {
    const input = selectRef.value.$el.querySelector('input')
    if (input) {
      // 监听 compositionend 事件
      input.addEventListener('compositionend', handleMobileInput)
      // 监听 input 事件，处理非中文输入情况
      input.addEventListener('input', (e: Event) => {
        // 如果正在进行中文拼音输入，则忽略 input 事件，等待 compositionend
        if (!(e as any).isComposing) {
           handleMobileInput(e)
        }
      })
    }
  }
})
</script>

<template>
  <header class="h-20 w-full flex justify-between items-center px-2 py-3 
                 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800
                 c-xs:h-16 sticky top-0 z-50">
    <div class="flex items-center flex-1 gap-3 mr-4">
      <!-- 移动端菜单按钮 -->
      <button 
        @click="componentStore.setleftComDrawerStatus(!componentStore.leftComDrawer)" 
        class="w-10 h-10 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200 hidden c-sm:flex c-md:hidden c-xs:flex"
      >
        <Icon size="20">
          <Bars class="text-slate-600 dark:text-slate-400" />
        </Icon>
      </button>

      <!-- 桌面端菜单按钮 -->
      <Transition name="fold">
        <button 
          v-if="!componentStore.leftCom" 
          @click="componentStore.setLeftComStatus(true)" 
          class="hidden c-md:flex w-10 h-10 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200"
        >
          <Icon size="20">
            <AngleLeft class="text-slate-600 dark:text-slate-400" />
          </Icon>
        </button>
        <button 
          v-else 
          @click="componentStore.setLeftComStatus(false)" 
          class="hidden c-md:flex w-10 h-10 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200"
        >
          <Icon size="20">
            <AngleRight class="text-slate-600 dark:text-slate-400" />
          </Icon>
        </button>
      </Transition>

      <!-- 首页图标 -->
      <router-link 
        to="/" 
        class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-all duration-200 group"
      >
        <Icon size="20">
          <Home class="text-slate-600 dark:text-slate-400 transition-transform" />
        </Icon>
      </router-link>
      
      <!-- 搜索框 -->
      <div class="c-xs:flex-1 flex-1 max-w-2xl search-container min-w-0">
        <el-select
          ref="selectRef"
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
                <ToolIcon v-if="item.logo" :logo="item.logo" :size="24" rounded="rounded" />
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
        class="hidden c-sm:w-10 c-sm:h-10 c-sm:flex items-center justify-center rounded-full 
               hover:bg-blue-50 dark:hover:bg-blue-900/40 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400
               transition-all duration-200"
      >
        <Icon size="20">
          <Github />
        </Icon>
      </a>

      <!-- 关于 -->
      <router-link 
        to="/about" 
        class="w-10 h-10 flex items-center justify-center rounded-full 
               hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200
               transition-all duration-200"
      >
        <Icon size="20">
          <InfoCircle />
        </Icon>
      </router-link>

      <ThemeSwitcher />
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

.dark .search-input :deep(.el-select__wrapper) {
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border-color: #334155;
}

.search-input :deep(.el-select__wrapper:hover) {
  border-color: #93c5fd;
  box-shadow: 0 4px 6px -1px rgb(59 130 246 / 0.1);
}

.dark .search-input :deep(.el-select__wrapper:hover) {
  border-color: #3b82f6;
  box-shadow: none;
}

.search-input :deep(.el-select__wrapper.is-focused) {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.dark .search-input :deep(.el-select__wrapper.is-focused) {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}

.search-input :deep(.el-select__placeholder) {
  color: #94a3b8;
}

.dark .search-input :deep(.el-select__placeholder) {
  color: #64748b;
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

.dark .search-dropdown.el-select__popper {
  background: #1e293b !important;
  border-color: #334155 !important;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3) !important;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .search-dropdown.el-select__popper {
    max-width: calc(100vw - 32px) !important;
  }
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

.dark .search-dropdown .el-select-dropdown__item:hover {
  background: #334155 !important;
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

.dark .search-dropdown .search-option-icon {
  background: #1e293b;
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
  max-width: 100%;
  word-break: break-word;
}

.dark .search-dropdown .search-option-title {
  color: #cbd5e1;
}

.search-dropdown .search-option-desc {
  font-size: 11px;
  color: #94a3b8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
  max-width: 100%;
  word-break: break-word;
}

.dark .search-dropdown .search-option-desc {
  color: #64748b;
}

/* 移动端文本截断 */
@media (max-width: 480px) {
  .search-dropdown .search-option-title {
    font-size: 12px;
  }
  
  .search-dropdown .search-option-desc {
    font-size: 10px;
  }
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
