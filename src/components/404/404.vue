<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Compass } from '@vicons/fa'
import { Icon } from '@vicons/utils'

const router = useRouter()
</script>

<template>
  <div class="flex flex-col items-center justify-center flex-1 px-4 py-20 text-center">
    <!-- 404 主视觉：大号渐变数字 + 模糊装饰圆 -->
    <div class="relative select-none">
      <div class="pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-100/70 blur-2xl dark:bg-blue-900/30" />
      <div class="relative bg-gradient-to-b from-blue-500 to-blue-700 bg-clip-text text-8xl font-black leading-none tracking-tight text-transparent dark:from-blue-400 dark:to-blue-600 sm:text-9xl">
        404
      </div>
    </div>

    <div class="mt-8 flex items-center gap-2 text-slate-500 dark:text-slate-400">
      <Icon size="15"><Compass /></Icon>
      <span class="text-sm sm:text-base">页面不存在或已被移除，请检查地址是否正确</span>
    </div>

    <div class="mt-8">
      <el-button type="primary" size="large" round @click="router.push('/')">
        返回首页
      </el-button>
    </div>
  </div>
</template>