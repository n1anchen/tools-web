<script setup lang="ts">
import { reactive } from 'vue'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
// import { copy } from '@/utils/string'
const info = reactive({
  title: "tool name",
})

//copy
// const copyRes = async (resStr: string) => {
//   copy(resStr)
// }
</script>

<template>
  <div class="flex flex-col mt-3 flex-1">
    <ToolHero :title="info.title"></ToolHero>

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