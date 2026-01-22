<script setup lang="ts">
import { onMounted } from 'vue';
const props = defineProps({
  title: {
    type: String,
    default: '描述'
  }
})

onMounted(() => {
})
</script>

<template>
  <!-- desc -->
  <div class="mt-4 rounded-2xl bg-white border border-slate-100 shadow-sm 
              hover:shadow-md transition-shadow duration-300 overflow-hidden">
    <div class="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
      <div class="flex items-center gap-3">
        <div class="w-1 h-5 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
        <h3 class="font-semibold text-slate-700">{{ props.title }}</h3>
      </div>
    </div>
    <div class="p-6">
      <slot></slot>
    </div> 
  </div>
</template>

<style scoped>

</style>