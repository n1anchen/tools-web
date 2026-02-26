<template>
  <div 
    ref="editorRef" 
    class="ace-editor" 
    :style="{ height: height, width: '100%' }"
  ></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue'
import { useSettingStore } from '@/store/modules/setting'

const settingStore = useSettingStore()
const isDark = computed(() => settingStore.isDark)

interface Props {
  modelValue: string
  mode?: string // 'css' | 'javascript' | 'html' | 'json'
  theme?: string
  height?: string
  showWhitespace?: boolean
  showLineNumbers?: boolean
  wordWrap?: boolean
  readonly?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'text',
  theme: 'monokai',
  height: '400px',
  showWhitespace: false,
  showLineNumbers: true,
  wordWrap: true,
  readonly: false
})

const emit = defineEmits<Emits>()

const editorRef = ref<HTMLElement>()
let editor: any = null
let aceLoaded = false

// 动态加载 Ace 编辑器
const loadAceEditor = async () => {
  if (aceLoaded) return editor

  // 动态导入 ace-builds
  const ace = await import('ace-builds')
  
  // 根据模式动态加载对应的语言模式
  switch (props.mode) {
    case 'css':
      await import('ace-builds/src-noconflict/mode-css')
      break
    case 'javascript':
      await import('ace-builds/src-noconflict/mode-javascript')
      break
    case 'html':
      await import('ace-builds/src-noconflict/mode-html')
      break
    case 'json':
      await import('ace-builds/src-noconflict/mode-json')
      break
  }
  
  // 加载主题
  await Promise.all([
    import('ace-builds/src-noconflict/theme-monokai'),
    import('ace-builds/src-noconflict/theme-chrome')
  ])
  
  // 按需加载扩展
  await Promise.all([
    import('ace-builds/src-noconflict/ext-language_tools'),
    import('ace-builds/src-noconflict/ext-searchbox'),
    import('ace-builds/src-noconflict/ext-whitespace'),
    import('ace-builds/src-noconflict/ext-beautify'),
    import('ace-builds/src-noconflict/ext-error_marker')
  ])

  // 配置 Ace 编辑器路径
  ace.config.set('workerPath', '/ace/')
  
  aceLoaded = true
  return ace.default || ace
}

// 初始化编辑器
const initEditor = async () => {
  if (!editorRef.value) return

  try {
    const ace = await loadAceEditor()
    
    editor = ace.edit(editorRef.value)
    editor.setTheme(isDark.value ? 'ace/theme/monokai' : 'ace/theme/chrome')
    editor.session.setMode(`ace/mode/${props.mode}`)
    
    // 基础配置
    editor.setOptions({
      enableBasicAutocompletion: true,
      enableSnippets: false,
      enableLiveAutocompletion: true,
      fontSize: 14,
      showPrintMargin: false,
      wrap: props.wordWrap,
      showInvisibles: props.showWhitespace,
      showLineNumbers: props.showLineNumbers,
      showGutter: props.showLineNumbers,
      highlightActiveLine: true,
      highlightSelectedWord: true,
      foldStyle: "markbegin",
      readOnly: props.readonly
    })

    // 启用扩展功能
    ace.require("ace/ext/language_tools")
    ace.require("ace/ext/searchbox")
    ace.require("ace/ext/whitespace")
    ace.require("ace/ext/beautify")
    
    // 监听内容变化
    editor.on('change', () => {
      const value = editor.getValue()
      emit('update:modelValue', value)
      emit('change', value)
    })

    // 设置初始值
    if (props.modelValue) {
      editor.setValue(props.modelValue, -1)
    }

    // 添加格式化快捷键
    editor.commands.addCommand({
      name: 'formatCode',
      bindKey: { win: 'Ctrl-Shift-F', mac: 'Cmd-Shift-F' },
      exec: () => {
        const beautify = ace.require("ace/ext/beautify")
        beautify.beautify(editor.session)
      }
    })

  } catch (error) {
    console.error('Failed to load Ace editor:', error)
  }
}

// 监听 modelValue 变化
watch(() => props.modelValue, (newValue) => {
  if (editor && editor.getValue() !== newValue) {
    editor.setValue(newValue || '', -1)
  }
})

// 监听编辑器选项变化
watch(() => props.showWhitespace, (value) => {
  if (editor) {
    editor.setOption('showInvisibles', value)
  }
})

watch(() => props.showLineNumbers, (value) => {
  if (editor) {
    editor.setOption('showLineNumbers', value)
    editor.setOption('showGutter', value)
  }
})

watch(() => props.wordWrap, (value) => {
  if (editor) {
    editor.setOption('wrap', value)
  }
})

watch(isDark, (dark) => {
  if (editor) {
    editor.setTheme(dark ? 'ace/theme/monokai' : 'ace/theme/chrome')
  }
})

// 暴露编辑器方法
const setValue = (value: string) => {
  if (editor) {
    editor.setValue(value, -1)
  }
}

const getValue = () => {
  return editor ? editor.getValue() : ''
}

const formatCode = () => {
  if (editor) {
    const ace = (window as any).ace
    const beautify = ace.require("ace/ext/beautify")
    beautify.beautify(editor.session)
  }
}

const toggleWhitespace = () => {
  if (editor) {
    const current = editor.getOption('showInvisibles')
    editor.setOption('showInvisibles', !current)
  }
}

const toggleLineNumbers = () => {
  if (editor) {
    const current = editor.getOption('showLineNumbers')
    editor.setOption('showLineNumbers', !current)
    editor.setOption('showGutter', !current)
  }
}

const toggleWordWrap = () => {
  if (editor) {
    const current = editor.getOption('wrap')
    editor.setOption('wrap', !current)
  }
}

const openSearchBox = () => {
  if (editor) {
    editor.execCommand('find')
  }
}

defineExpose({
  setValue,
  getValue,
  formatCode,
  toggleWhitespace,
  toggleLineNumbers,
  toggleWordWrap,
  openSearchBox,
  editor: () => editor
})

onMounted(() => {
  nextTick(() => {
    initEditor()
  })
})

onUnmounted(() => {
  if (editor) {
    editor.destroy()
  }
})
</script>

<style scoped>
.ace-editor {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.dark .ace-editor {
  border-color: #4c4d4f;
}
</style>