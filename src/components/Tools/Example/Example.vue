<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
// 常用公共组件：按需引入（详见 src/components/Common/）
import SectionHeading from '@/components/Common/SectionHeading.vue'
import MetricsBar from '@/components/Common/MetricsBar.vue'
import CopyButton from '@/components/Common/CopyButton.vue'

// 示例逻辑：实时统计输入文本（替换为你的工具逻辑）
const text = ref('')
const charCount = computed(() => text.value.length)
const wordCount = computed(() => (text.value.trim() ? text.value.trim().split(/\s+/).length : 0))
const lineCount = computed(() => (text.value ? text.value.split('\n').length : 0))
</script>

<template>
  <div class="flex flex-col mt-3 flex-1">
    <!-- 标题、图标、分类、描述统一由 tools.ts 维护，ToolHero 按当前路由自动获取，无需传 title -->
    <ToolHero />

    <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-300">
      <!-- 指标条：MetricsBar 接收 :items 数组（label + value） -->
      <MetricsBar :items="[
        { label: '字符', value: charCount },
        { label: '单词', value: wordCount },
        { label: '行数', value: lineCount },
      ]" />

      <!-- 区块标题：SectionHeading 支持 icon / title / description / tone，右侧操作用 #actions 插槽 -->
      <SectionHeading title="输入文本" description="在这里粘贴或输入要处理的内容">
        <template #actions>
          <!-- 复制按钮：传 :text 则内部调用 copy()；不传可用 @click 自定义逻辑 -->
          <CopyButton :text="text" />
        </template>
      </SectionHeading>

      <el-input v-model="text" type="textarea" :rows="6" placeholder="输入文本..." />
    </div>

    <!-- 底部说明：ToolGuide 接收 title prop（默认「描述」） -->
    <ToolGuide title="使用说明">
      <el-text>
        这是一个示例模板，演示工具页的标准结构。复制本目录并重命名为你的工具名，替换示例逻辑即可。
      </el-text>
    </ToolGuide>
  </div>
</template>

<!-- 优先使用 Tailwind 类（含 dark: 前缀），非必要不写 scoped 样式 -->