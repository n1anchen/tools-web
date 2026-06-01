<script setup lang="ts">
import { ref, computed } from 'vue'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { ElMessage } from 'element-plus'
import { copy } from '@/utils/string'

const title = '文本替换'
const inputText = ref('')
const findText = ref('')
const replaceText = ref('')
const useRegex = ref(false)
const caseSensitive = ref(true)
const replaceError = ref('')

const replaceResult = computed(() => {
  if (!inputText.value) return ''
  if (!findText.value) return inputText.value
  replaceError.value = ''
  try {
    const flags = caseSensitive.value ? 'g' : 'gi'
    const pattern = useRegex.value
      ? new RegExp(findText.value, flags)
      : new RegExp(findText.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags)
    return inputText.value.replace(pattern, replaceText.value)
  } catch (e: any) {
    replaceError.value = e.message
    return ''
  }
})

const matchCount = computed(() => {
  if (!inputText.value || !findText.value || replaceError.value) return 0
  try {
    const flags = caseSensitive.value ? 'g' : 'gi'
    const pattern = useRegex.value
      ? new RegExp(findText.value, flags)
      : new RegExp(findText.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags)
    return (inputText.value.match(pattern) || []).length
  } catch { return 0 }
})
</script>

<template>
  <div class="flex flex-col mt-3 flex-1">
    <DetailHeader :title="title" />
    <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-300 space-y-3">
      <el-input v-model="inputText" type="textarea" :rows="6" placeholder="请输入要处理的文本" />
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <el-input v-model="findText" placeholder="查找内容" clearable>
          <template #prepend>查找</template>
        </el-input>
        <el-input v-model="replaceText" placeholder="替换为（可留空）">
          <template #prepend>替换</template>
        </el-input>
      </div>
      <div class="flex flex-wrap items-center gap-4">
        <el-checkbox v-model="useRegex">使用正则表达式</el-checkbox>
        <el-checkbox v-model="caseSensitive">区分大小写</el-checkbox>
        <span v-if="matchCount > 0" class="text-sm text-blue-500">共匹配 {{ matchCount }} 处</span>
        <span v-if="replaceError" class="text-sm text-red-500">正则错误：{{ replaceError }}</span>
      </div>
      <div class="flex gap-2">
        <el-button @click="inputText = ''; findText = ''; replaceText = ''">清空</el-button>
        <el-button type="primary" :disabled="!replaceResult" @click="copy(replaceResult)">复制结果</el-button>
      </div>
      <div class="relative">
        <el-input :value="replaceResult" type="textarea" :rows="6" placeholder="替换结果" readonly />
        <el-button v-if="replaceResult" class="absolute top-1 right-1" size="small" @click="copy(replaceResult)">复制</el-button>
      </div>
    </div>
    <ToolDetail title="使用说明">
      <p>在线文本替换工具，实时预览替换效果。</p>
      <ul class="list-disc list-inside mt-1 space-y-1">
        <li><b>普通替换</b>：输入文字后直接全局替换</li>
        <li><b>正则替换</b>：支持正则表达式捕获组（如 <code>$1</code>）</li>
        <li>替换内容留空可实现批量删除</li>
      </ul>
    </ToolDetail>
  </div>
</template>
