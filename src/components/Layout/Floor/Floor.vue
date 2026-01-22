<script setup lang="ts">
import {  ref } from 'vue';
const appDesc = ref(import.meta.env.VITE_APP_DESC || '')
</script>

<template>
  <div class="w-full rounded-2xl z-10 p-5 text-center">
    <el-text>{{ appDesc }}  © 2026 <a href="https://tools.nianchen.top" target="_blank" class="text-blue-700">在线工具箱</a></el-text>
  </div>
</template>

<style scoped>

</style>