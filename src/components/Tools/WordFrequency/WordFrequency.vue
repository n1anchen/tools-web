<script setup lang="ts">
import { ref } from 'vue'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { ElMessage } from 'element-plus'
import { copy } from '@/utils/string'

const title = '词频统计'
const inputText = ref('')
const minLength = ref(2)
const results = ref<{ word: string; count: number }[]>([])
const analyzed = ref(false)

const analyze = () => {
  if (!inputText.value.trim()) { ElMessage.warning('请输入文本'); return }
  const words = inputText.value
    .toLowerCase()
    .replace(/[\p{P}\p{S}]/gu, ' ')
    .split(/\s+/)
    .filter(w => w.length >= minLength.value)
  const map = new Map<string, number>()
  words.forEach(w => map.set(w, (map.get(w) || 0) + 1))
  results.value = [...map.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
  analyzed.value = true
  ElMessage.success(`统计完成，共 ${results.value.length} 个词`)
}

const copyAll = () => {
  if (!results.value.length) return
  copy(results.value.map(r => `${r.word}\t${r.count}`).join('\n'))
}
</script>

<template>
  <div class="flex flex-col mt-3 flex-1">
    <DetailHeader :title="title" />
    <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-300 space-y-3">
      <el-input v-model="inputText" type="textarea" :rows="6" placeholder="请输入要统计词频的文本" />
      <div class="flex flex-wrap items-center gap-3">
        <span class="text-sm text-slate-600 dark:text-slate-300">最短词长度：</span>
        <el-input-number v-model="minLength" :min="1" :max="10" size="small" style="width:80px" />
        <el-button type="primary" @click="analyze">统计</el-button>
        <el-button @click="inputText = ''; results = []; analyzed = false">清空</el-button>
        <el-button v-if="results.length" @click="copyAll">复制全部</el-button>
      </div>
      <div v-if="analyzed">
        <template v-if="results.length">
          <div class="text-sm text-slate-500 dark:text-slate-400 mb-2">
            共 {{ results.length }} 个不同词，显示前 200 个高频词
          </div>
          <el-table :data="results.slice(0, 200)" stripe size="small" style="width:100%">
            <el-table-column type="index" label="#" width="50" />
            <el-table-column prop="word" label="词语" />
            <el-table-column prop="count" label="出现次数" width="120" sortable />
            <el-table-column label="操作" width="80">
              <template #default="{ row }">
                <el-button size="small" text @click="copy(row.word)">复制</el-button>
              </template>
            </el-table-column>
          </el-table>
        </template>
        <div v-else class="text-center text-slate-400 py-4">未找到符合条件的词</div>
      </div>
    </div>
    <ToolDetail title="使用说明">
      <p>在线词频统计工具，分析文本中各词出现的频率，适合关键词提取和文本分析。</p>
      <ul class="list-disc list-inside mt-1 space-y-1">
        <li>自动去除标点符号，不区分大小写</li>
        <li>可设置最短词长度过滤无意义短词</li>
        <li>结果按出现次数降序排列，最多显示 200 个高频词</li>
      </ul>
    </ToolDetail>
  </div>
</template>
