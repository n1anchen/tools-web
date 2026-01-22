<script setup lang="ts">
import { reactive, ref } from 'vue'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import AceEditor from '@/components/Common/AceEditor.vue'
import { copy } from '@/utils/string'

const info = reactive({
  title: "html格式化/压缩",
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

//格式化 - 使用 Ace 编辑器自带的美化功能
const formatCode = () => {
  if (aceEditorRef.value) {
    aceEditorRef.value.formatCode()
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

    <div class="p-4 rounded-2xl bg-white ">
      
      <div>
        <AceEditor
          ref="aceEditorRef"
          v-model="info.code"
          mode="html"
          :show-whitespace="info.showWhitespace"
          :show-line-numbers="info.showLineNumbers"
          :word-wrap="info.wordWrap"
          height="400px"
        />
      </div>
      
      <div class="mt-4">
        <!-- HTML 操作按钮 -->
        <div class="mb-3">
          <el-button type="primary" @click="formatCode">格式化 (Ctrl+Shift+F)</el-button>
          <el-button type="primary" @click="copyRes">复制</el-button>
          <el-button type="primary" @click="clear">清空</el-button>
        </div>
        
        <!-- 编辑器控制按钮 -->
        <div class="flex flex-wrap gap-2">
          <el-button 
            :type="info.showWhitespace ? 'success' : 'default'" 
            @click="toggleWhitespace"
            size="small"
          >
            {{ info.showWhitespace ? '隐藏' : '显示' }}空白字符
          </el-button>
          
          <el-button 
            :type="info.showLineNumbers ? 'success' : 'default'" 
            @click="toggleLineNumbers"
            size="small"
          >
            {{ info.showLineNumbers ? '隐藏' : '显示' }}行号
          </el-button>
          
          <el-button 
            :type="info.wordWrap ? 'success' : 'default'" 
            @click="toggleWordWrap"
            size="small"
          >
            {{ info.wordWrap ? '关闭' : '开启' }}自动换行
          </el-button>
          
          <el-button 
            @click="openSearchBox"
            size="small"
            type="info"
          >
            搜索 (Ctrl+F)
          </el-button>
          
          <el-button 
            @click="beautifyCode"
            size="small"
            type="warning"
          >
            美化代码
          </el-button>
        </div>
      </div>

      <div class="mt-3 min-h-md bg-red-100 p-3 mb-3" v-show="info.isParseErr">
        <el-text type="danger">{{ info.parseErr }}</el-text>
      </div>
    </div>

    <!-- desc -->
    <ToolDetail title="描述">
      <el-text>
        提供在线html、xml格式化
      </el-text> 
    </ToolDetail>
  </div>
</template>

<style scoped>
</style>