<script setup lang="ts">
import { reactive, ref } from 'vue'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import AceEditor from '@/components/Common/AceEditor.vue'
import { ElMessage } from 'element-plus'
import { copy } from '@/utils/string'
import { format } from 'sql-formatter'

const info = reactive({
  title: 'SQL 格式化',
  code: '',
  showWhitespace: false,
  showLineNumbers: true,
  wordWrap: true,
})

const aceEditorRef = ref<InstanceType<typeof AceEditor>>()
const dialect = ref('sql')

const dialects = [
  { label: 'Standard SQL', value: 'sql' },
  { label: 'MySQL', value: 'mysql' },
  { label: 'PostgreSQL', value: 'postgresql' },
  { label: 'SQLite', value: 'sqlite' },
  { label: 'T-SQL (SQL Server)', value: 'tsql' },
]

const formatSql = () => {
  const code = aceEditorRef.value?.getValue() || info.code
  if (!code.trim()) { ElMessage.warning('请输入 SQL 内容'); return }
  try {
    const result = format(code, { language: dialect.value as any, tabWidth: 2, keywordCase: 'upper' })
    info.code = result
    aceEditorRef.value?.setValue(result)
    ElMessage.success('格式化成功')
  } catch (e: any) {
    ElMessage.error('格式化失败：' + e.message)
  }
}

const minifySql = () => {
  const code = aceEditorRef.value?.getValue() || info.code
  if (!code.trim()) { ElMessage.warning('请输入 SQL 内容'); return }
  const result = code.replace(/\s+/g, ' ').trim()
  info.code = result
  aceEditorRef.value?.setValue(result)
  ElMessage.success('压缩成功')
}

const clear = () => {
  info.code = ''
  aceEditorRef.value?.setValue('')
}

const copyRes = () => copy(aceEditorRef.value?.getValue() || info.code)

const toggleWhitespace = () => {
  info.showWhitespace = !info.showWhitespace
  aceEditorRef.value?.toggleWhitespace()
}
const toggleLineNumbers = () => {
  info.showLineNumbers = !info.showLineNumbers
  aceEditorRef.value?.toggleLineNumbers()
}
const toggleWordWrap = () => {
  info.wordWrap = !info.wordWrap
  aceEditorRef.value?.toggleWordWrap()
}
const openSearchBox = () => aceEditorRef.value?.openSearchBox()
</script>

<template>
  <div class="flex flex-col mt-3 flex-1">
    <DetailHeader :title="info.title" />
    <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-300">
      <AceEditor
        ref="aceEditorRef"
        v-model="info.code"
        mode="sql"
        :show-whitespace="info.showWhitespace"
        :show-line-numbers="info.showLineNumbers"
        :word-wrap="info.wordWrap"
        height="420px"
      />
      <div class="mt-4 space-y-3">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-sm text-slate-600 dark:text-slate-300">方言：</span>
          <el-select v-model="dialect" size="small" style="width:180px">
            <el-option v-for="d in dialects" :key="d.value" :label="d.label" :value="d.value" />
          </el-select>
          <el-button type="primary" @click="formatSql">格式化</el-button>
          <el-button type="success" @click="minifySql">压缩</el-button>
          <el-button type="primary" @click="copyRes">复制</el-button>
          <el-button @click="clear">清空</el-button>
        </div>
        <div class="flex flex-wrap gap-2">
          <el-button :type="info.showWhitespace ? 'success' : 'default'" size="small" @click="toggleWhitespace">
            {{ info.showWhitespace ? '隐藏' : '显示' }}空白字符
          </el-button>
          <el-button :type="info.showLineNumbers ? 'success' : 'default'" size="small" @click="toggleLineNumbers">
            {{ info.showLineNumbers ? '隐藏' : '显示' }}行号
          </el-button>
          <el-button :type="info.wordWrap ? 'success' : 'default'" size="small" @click="toggleWordWrap">
            {{ info.wordWrap ? '关闭' : '开启' }}自动换行
          </el-button>
          <el-button size="small" type="info" @click="openSearchBox">搜索 (Ctrl+F)</el-button>
        </div>
      </div>
    </div>
    <ToolDetail title="使用说明">
      <p>在线 SQL 代码编辑器，支持语法高亮、格式化与压缩。</p>
      <ul class="list-disc list-inside mt-1 space-y-1">
        <li><b>格式化</b>：美化 SQL，关键字大写，自动缩进</li>
        <li><b>压缩</b>：去除多余空白，减少体积</li>
        <li>支持 Standard SQL、MySQL、PostgreSQL、SQLite、T-SQL</li>
        <li>支持语法高亮、行号、自动换行、全文搜索（Ctrl+F）</li>
      </ul>
    </ToolDetail>
  </div>
</template>
