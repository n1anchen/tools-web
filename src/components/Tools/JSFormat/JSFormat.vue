<script setup lang="ts">
import { reactive, ref } from 'vue'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import AceEditor from '@/components/Common/AceEditor.vue'
import { copy } from '@/utils/string'
import { ElMessage } from 'element-plus'

const info = reactive({
  title: "js代码格式化/压缩",
  code: '',
  isParseErr: false,
  parseErr: '',
  // 编辑器配置选项
  showWhitespace: false,
  showLineNumbers: true,
  wordWrap: true
})

// Ace 编辑器引用
const aceEditorRef = ref<InstanceType<typeof AceEditor>>()

const loadMinifier = async () => {
  const { minify } = await import('terser')
  return { minify }
}

interface Error {
    name: string;
    message: string;
    stack?: string;
}

//格式化 - 使用 Ace 编辑器自带的美化功能
const formatCode = () => {
  if (aceEditorRef.value) {
    aceEditorRef.value.formatCode()
  }
}

//混淆压缩
const confuseCompress = async () => {
  try {
    const { minify } = await loadMinifier()
    let res = await minify(info.code, {
      mangle: {
        toplevel: true,
      }
    })
    const compressed = res.code != undefined ? res.code : info.code
    info.code = compressed
    if (aceEditorRef.value) {
      aceEditorRef.value.setValue(compressed)
    }
  } catch(error) {
    ElMessage({
      showClose: true,
      message: '请填入正确的js代码: ' + (error as Error).message,
      type: 'error',
    })
  }
}

//清空输入框
const clear = () => {
  info.code = ''
  if (aceEditorRef.value) {
    aceEditorRef.value.setValue('')
  }
}

const copyRes = async () => {
  copy(info.code)
}

// 编辑器控制函数
const toggleWhitespace = () => {
  info.showWhitespace = !info.showWhitespace
  if (aceEditorRef.value) {
    aceEditorRef.value.toggleWhitespace()
  }
}

const toggleLineNumbers = () => {
  info.showLineNumbers = !info.showLineNumbers
  if (aceEditorRef.value) {
    aceEditorRef.value.toggleLineNumbers()
  }
}

const toggleWordWrap = () => {
  info.wordWrap = !info.wordWrap
  if (aceEditorRef.value) {
    aceEditorRef.value.toggleWordWrap()
  }
}

const openSearchBox = () => {
  if (aceEditorRef.value) {
    aceEditorRef.value.openSearchBox()
  }
}

const beautifyCode = () => {
  if (aceEditorRef.value) {
    aceEditorRef.value.formatCode()
  }
}
</script>

<template>
  <div class="flex flex-col mt-3 flex-1">
    <DetailHeader :title="info.title"></DetailHeader>
    <div class="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-300">
      
      <div>
        <AceEditor
          ref="aceEditorRef"
          v-model="info.code"
          mode="javascript"
          :show-whitespace="info.showWhitespace"
          :show-line-numbers="info.showLineNumbers"
          :word-wrap="info.wordWrap"
          height="400px"
        />
      </div>
      
      <div class="mt-4">
        <!-- JS 操作按钮 -->
        <div class="mb-3">
          <el-button type="primary" @click="formatCode">格式化 (Ctrl+Shift+F)</el-button>
          <el-button type="primary" @click="confuseCompress">混淆压缩</el-button>
          <el-button type="primary" @click="copyRes">复制</el-button>
          <el-button type="primary" @click="clear">清空</el-button>
        </div>
        
        <!-- 编辑器控制按钮 -->
        <div class="flex flex-wrap gap-2">
          <el-button 
            size="small" 
            :type="info.showWhitespace ? 'primary' : 'default'"
            @click="toggleWhitespace"
          >
            显示空白字符
          </el-button>
          <el-button 
            size="small" 
            :type="info.showLineNumbers ? 'primary' : 'default'"
            @click="toggleLineNumbers"
          >
            显示行号
          </el-button>
          <el-button 
            size="small" 
            :type="info.wordWrap ? 'primary' : 'default'"
            @click="toggleWordWrap"
          >
            自动换行
          </el-button>
          <el-button size="small" @click="openSearchBox">搜索 (Ctrl+F)</el-button>
          <el-button size="small" @click="beautifyCode">美化代码</el-button>
        </div>
      </div>

      <div class="mt-3 min-h-md bg-red-100 p-3 mb-3" v-show="info.isParseErr">
        <el-text type="danger">{{ info.parseErr }}</el-text>
      </div>
    </div>

    <!-- desc -->
    <ToolDetail title="描述">
      <el-text>
        JS格式化/压缩工具，提供在线JS格式化、JS压缩、JS混淆功能。<br><br>
        <strong>功能特性：</strong><br>
        • JavaScript 语法高亮和代码折叠<br>
        • 实时语法校验和错误提示<br>
        • 代码格式化和混淆压缩<br>
        • 智能代码补全和美化<br>
        • 搜索和替换功能 (Ctrl+F)<br>
        • 空白字符显示切换<br>
        • 自动换行和行号显示<br>
        • 快捷键支持 (Ctrl+Shift+F 格式化, Ctrl+Shift+W 切换空白字符显示)
      </el-text> 
    </ToolDetail>
  </div>
</template>

<style scoped>
</style>