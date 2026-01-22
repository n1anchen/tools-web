<script setup lang="ts">
import { reactive, ref } from 'vue'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import AceEditor from '@/components/Common/AceEditor.vue'
import { transferred, copy } from '@/utils/string'

const info = reactive({
  title: "Json在线转换",
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

//格式化json
const formatJson = () => {
  try {
    //初始化错误信息
    info.isParseErr = false;
    info.parseErr = ''
    // 1、JSON.parse：把JSON字符串转换为JSON对象
    // 2、JSON.stringify：把JSON对象 转换为 有缩进的 JSON字符串格式
    const formatted = JSON.stringify(JSON.parse(info.code), null, '\t');
    info.code = formatted;
    if (aceEditorRef.value) {
      aceEditorRef.value.setValue(formatted)
    }
  } catch(error) {
    info.isParseErr = true;
    // info.parseErr = (error as Error).message
    info.parseErr = '无效的JSON'
  }
}

//压缩
const compress = () => {
  const compressed = info.code.replace(/[\r\n\t]/g, "")
  info.code = compressed
  if (aceEditorRef.value) {
    aceEditorRef.value.setValue(compressed)
  }
}

//转义
const tran = () => {
  const escaped = transferred(info.code, "\"")
  info.code = escaped
  if (aceEditorRef.value) {
    aceEditorRef.value.setValue(escaped)
  }
}

//去转义
const unTransferred = () => {
  const unescaped = info.code.replace(/[\\]/g, ``)
  info.code = unescaped
  if (aceEditorRef.value) {
    aceEditorRef.value.setValue(unescaped)
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
        <!-- 
          tabSize: tab键前进的个数
          style： 自定义样式
          autofocus： 挂载后立即聚焦在编辑器
          indent-with-tab：绑定键盘tab事件
          extensions： 扩展，传数组
          
          @ready="console.log('ready', $event)"
          @change="console.log('change', $event)"
          @focus="console.log('focus', $event)"
          @blur="console.log('blur', $event)"
         -->
        <AceEditor
          ref="aceEditorRef"
          v-model="info.code"
          mode="json"
          :show-whitespace="info.showWhitespace"
          :show-line-numbers="info.showLineNumbers"
          :word-wrap="info.wordWrap"
          height="400px"
        />
      </div>
      
      <div class="mt-4">
        <!-- JSON 操作按钮 -->
        <div class="mb-3">
          <el-button type="primary" @click="formatJson">校验/格式化 (Ctrl+Shift+F)</el-button>
          <el-button type="primary" @click="compress">压缩</el-button>
          <el-button type="primary" @click="tran">转义</el-button>
          <el-button type="primary" @click="unTransferred">去转义</el-button>
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
            {{ info.showWhitespace ? '隐藏' : '显示' }}空白字符 (Ctrl+Shift+W)
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
        JSON（JavaScript Object Notation）是一种轻量级的数据交换格式。它基于JavaScript的一个子集，但与语言无关，因此在多种编程环境中广泛使用。JSON格式易于人阅读和编写，同时也易于机器解析和生成。它通常用于网络应用程序中服务器与客户端之间的数据传输。<br><br>
        <strong>功能特性：</strong><br>
        • JSON 语法高亮和代码折叠<br>
        • 实时语法校验和错误提示<br>
        • 格式化、压缩、转义和去转义<br>
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