<script setup lang="ts">
import type { Component } from 'vue'

withDefaults(defineProps<{
  icon?: Component
  title: string
  description?: string
  /** 图标底色色调：blue（默认）/ violet / pink / amber / orange / green */
  tone?: 'blue' | 'violet' | 'pink' | 'amber' | 'orange' | 'green'
}>(), { tone: 'blue' })
</script>

<template>
  <!-- 区块标题（A 类：图标 + 标题 + 描述；#actions 插槽放右侧操作区；样式自包含） -->
  <div class="section-heading">
    <div v-if="icon" class="heading-icon" :class="`heading-${tone}`">
      <el-icon><component :is="icon" /></el-icon>
    </div>
    <div class="sh-grow">
      <h2>{{ title }}</h2>
      <p v-if="description">{{ description }}</p>
    </div>
    <slot name="actions" />
  </div>
</template>

<style scoped>
.section-heading {
  display: flex;
  align-items: center;
  gap: 12px;
}
.heading-icon {
  display: grid;
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  place-items: center;
  border-radius: 13px;
  font-size: 20px;
}
.sh-grow {
  flex: 1;
  min-width: 0;
}
/* 窄屏：标题占满一行，右侧操作区换行到下一行（复刻原 header 容器的移动端 column 行为） */
@media (max-width: 640px) {
  .section-heading { flex-wrap: wrap; }
  .sh-grow { flex: 1 0 100%; }
}
.heading-blue { color: #2563eb; background: #eff6ff; }
.heading-violet { color: #7c3aed; background: #f5f3ff; }
.heading-pink { color: #db2777; background: #fdf2f8; }
.heading-amber { color: #d97706; background: #fffbeb; }
.heading-orange { color: #ea580c; background: #fff7ed; }
.heading-green { color: #059669; background: #ecfdf5; }
.section-heading h2 { margin: 0; color: #0f172a; font-size: 18px; }
.section-heading p { margin: 3px 0 0; color: #64748b; font-size: 13px; }
.dark .section-heading h2 { color: #f8fafc; }
.dark .section-heading p { color: #94a3b8; }
</style>
