<script setup lang="ts">
import {  ref } from 'vue';
import { StarFilled } from '@element-plus/icons-vue'
const appDesc = ref(import.meta.env.VITE_APP_DESC || '')
</script>

<template>
  <div class="w-full rounded-2xl z-10 py-6 text-center border-t border-slate-100 bg-gradient-to-b from-transparent to-slate-50/50">
    <div class="flex flex-col items-center gap-2">
      <div class="flex items-center gap-4 text-slate-400 text-sm">
        <span class="flex items-center gap-1">
          <StarFilled class="w-4 h-4" />
          Made with love
        </span>
        <span class="w-1 h-1 rounded-full bg-slate-300"></span>
        <span>{{ appDesc }}</span>
      </div>
      <div class="text-slate-500 text-sm">
        © 2026 
        <a href="https://tools.nianchen.top" target="_blank" 
           class="text-blue-500 hover:text-blue-600 font-medium transition-colors">
          在线工具箱
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>