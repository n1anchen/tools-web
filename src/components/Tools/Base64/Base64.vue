<script setup lang="ts">
import { ref } from 'vue'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { ElMessage } from 'element-plus'
import { copy } from '@/utils/string'

const title = 'Base64 加解密'
const activeTab = ref('encode')
const encodeInput = ref('')
const encodeOutput = ref('')
const decodeInput = ref('')
const decodeOutput = ref('')

const encodeText = () => {
  if (!encodeInput.value) { ElMessage.warning('请输入要加密的文本'); return }
  try {
    encodeOutput.value = btoa(unescape(encodeURIComponent(encodeInput.value)))
  } catch (e) {
    ElMessage.error('加密失败：' + e)
  }
}

const decodeText = () => {
  if (!decodeInput.value) { ElMessage.warning('请输入要解密的 Base64 字符串'); return }
  try {
    decodeOutput.value = decodeURIComponent(escape(atob(decodeInput.value)))
  } catch {
    ElMessage.error('解密失败：请输入有效的 Base64 字符串')
  }
}
</script>

<template>
  <div class="flex flex-col mt-3 flex-1">
    <DetailHeader :title="title" />
    <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-300">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="编码（文本 → Base64）" name="encode">
          <el-input v-model="encodeInput" type="textarea" :rows="6" placeholder="请输入要编码的文本" class="mb-3" />
          <div class="flex gap-2 mb-3">
            <el-button type="primary" @click="encodeText">编码</el-button>
            <el-button @click="encodeInput = ''; encodeOutput = ''">清空</el-button>
          </div>
          <div class="flex gap-2">
            <el-input v-model="encodeOutput" type="textarea" :rows="6" placeholder="编码结果" readonly />
            <el-button class="self-end" @click="copy(encodeOutput)">复制</el-button>
          </div>
        </el-tab-pane>
        <el-tab-pane label="解码（Base64 → 文本）" name="decode">
          <el-input v-model="decodeInput" type="textarea" :rows="6" placeholder="请输入要解码的 Base64 字符串" class="mb-3" />
          <div class="flex gap-2 mb-3">
            <el-button type="primary" @click="decodeText">解码</el-button>
            <el-button @click="decodeInput = ''; decodeOutput = ''">清空</el-button>
          </div>
          <div class="flex gap-2">
            <el-input v-model="decodeOutput" type="textarea" :rows="6" placeholder="解码结果" readonly />
            <el-button class="self-end" @click="copy(decodeOutput)">复制</el-button>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
    <ToolDetail title="使用说明">
      <p>Base64 是一种常用的编码方式，可将二进制数据转为可打印的 ASCII 字符。</p>
      <ul class="list-disc list-inside mt-1 space-y-1">
        <li><b>编码</b>：将普通文本转换为 Base64 字符串</li>
        <li><b>解码</b>：将 Base64 字符串还原为原始文本</li>
        <li>支持中文及 Unicode 字符</li>
      </ul>
    </ToolDetail>
  </div>
</template>
