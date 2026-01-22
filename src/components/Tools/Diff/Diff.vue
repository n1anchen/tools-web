<script setup lang="ts">
import { reactive, computed } from 'vue'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import CodeDiff from "v-code-diff";
import * as Diff from 'diff';
// import { copy } from '@/utils/string'
const info = reactive({
  title: "文本对比",
  leftTxt: '这是一段示例文本，用来测试文本对比功能。\n我们可以看到文本的差异对比效果。\n支持中文、英文、数字、特殊字符等各种字符。',
  rightTxt: '这是一段新的示例文本，用以测试文本比较功能。\n我们能够看到文本的差异对比效果。\n支持中文、英文、数字、特殊字符等各种字符内容。'
})

const settings = reactive({
  outputFormat: 'unified' as 'unified' | 'side-by-side' | 'line-by-line',
  diffLevel: 'char' as 'char' | 'word'
})

// 计算混合显示的内容
const unifiedDiff = computed(() => {
  if (settings.diffLevel === 'char') {
    return Diff.diffChars(info.leftTxt, info.rightTxt);
  } else {
    return Diff.diffWords(info.leftTxt, info.rightTxt);
  }
})

//copy
// const copyRes = async (resStr: string) => {
//   copy(resStr)
// }
</script>

<template>
  <div class="flex flex-col mt-3 flex-1">
    <DetailHeader :title="info.title"></DetailHeader>

    <div class="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-300">
      <!-- 设置选项 -->
      <div class="mb-4 flex gap-6">
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium">显示模式:</span>
          <el-radio-group v-model="settings.outputFormat">
            <el-radio-button label="unified">混合</el-radio-button>
            <el-radio-button label="side-by-side">左右</el-radio-button>
            <el-radio-button label="line-by-line">上下</el-radio-button>
          </el-radio-group>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium">比较级别:</span>
          <el-radio-group v-model="settings.diffLevel">
            <el-radio-button label="char">字符级</el-radio-button>
            <el-radio-button label="word">词组级</el-radio-button>
          </el-radio-group>
        </div>
      </div>

      <div class="flex justify-between">
        <el-input type="textarea" :rows="16" v-model="info.leftTxt"></el-input>
        <el-input type="textarea" :rows="16" v-model="info.rightTxt" class="ml-3"></el-input>
      </div>
      
      <!-- v-code-diff 显示 -->
      <code-diff
        v-if="settings.outputFormat !== 'unified'"
        :old-string="info.leftTxt"
        :new-string="info.rightTxt"
        :output-format="settings.outputFormat"
        :diff-style="settings.diffLevel"
        theme="dark"
      />
      
      <!-- 混合显示模式 -->
      <div v-else class="unified-diff-container">
        <div class="unified-diff-content">
          <template v-for="(part, index) in unifiedDiff" :key="index">
            <span
              v-if="part.removed"
              class="diff-removed"
            >{{ part.value }}</span>
            <span
              v-else-if="part.added"
              class="diff-added"
            >{{ part.value }}</span>
            <span v-else>{{ part.value }}</span>
          </template>
        </div>
      </div>
    </div>

    <!-- desc -->
    <ToolDetail title="描述">
      <el-text>
        在线文本差异比对支持中文、英文、代码比对，不限制字数轻松比对文本。
      </el-text> 
    </ToolDetail>

  </div>
</template>

<style scoped>
.unified-diff-container {
  margin-top: 1rem;
  border: 1px solid #404040;
  border-radius: 4px;
  background-color: #1e1e1e;
  overflow: hidden;
}

.unified-diff-content {
  padding: 1rem;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
  color: #d4d4d4;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.diff-removed {
  background-color: rgba(255, 0, 0, 0.15);
  color: #ff6b6b;
  text-decoration: line-through;
  text-decoration-thickness: 2px;
}

.diff-added {
  background-color: rgba(0, 255, 0, 0.15);
  color: #51cf66;
  font-weight: 500;
}
</style>