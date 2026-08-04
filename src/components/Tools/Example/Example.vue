<script setup lang="ts">
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
// import { copy } from '@/utils/string'

//copy
// const copyRes = async (resStr: string) => {
//   copy(resStr)
// }
</script>

<template>
  <div class="flex flex-col mt-3 flex-1">
    <!-- 标题、图标、分类、描述统一由 tools.ts 维护，ToolHero 按当前路由自动获取，无需传 title -->
    <ToolHero />

    <div class="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-300">
      
    </div>

    <!-- desc -->
    <ToolGuide title="描述">
      <el-text>
        示例...
      </el-text> 
    </ToolGuide>

  </div>
</template>

<style scoped>

</style>