<script setup lang="ts">
interface MetricsBarItem {
  label: string
  value: string | number
}

defineProps<{ items: MetricsBarItem[] }>()
</script>

<template>
  <!-- 指标条：样式由全局 .hero-metrics 提供（@layer components），本组件统一结构 -->
  <div class="hero-metrics">
    <div v-for="item in items" :key="item.label">
      <span>{{ item.label }}</span>
      <strong>{{ item.value }}</strong>
    </div>
  </div>
</template>
