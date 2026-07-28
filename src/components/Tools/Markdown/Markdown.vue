<script setup lang="ts">
import { computed, reactive } from 'vue'
import { MdEditor, type ToolbarNames } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { useSettingStore } from '@/store/modules/setting'

const info = reactive({
  title: "在线markdown编辑器",
  content: '',
})
const settingStore = useSettingStore()
const editorTheme = computed(() => settingStore.isDark ? 'dark' : 'light')
const unavailableToolbars: ToolbarNames[] = ['mermaid', 'katex', 'prettier', 'fullscreen']
</script>

<template>
  <div class="flex flex-col mt-3 flex-1">
    <DetailHeader :title="info.title"></DetailHeader>

    <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-300">
      <MdEditor
        v-model="info.content"
        :theme="editorTheme"
        :style="{ height: '500px' }"
        language="zh-CN"
        no-highlight
        no-prettier
        no-upload-img
        no-mermaid
        no-katex
        no-echarts
        :toolbars-exclude="unavailableToolbars"
      />
    </div>

    <!-- desc -->
    <ToolDetail title="描述">
      <el-text>
        在线编辑markdown
      </el-text> 
    </ToolDetail>

  </div>
</template>

<style scoped></style>
