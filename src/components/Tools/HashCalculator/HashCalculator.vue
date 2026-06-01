<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { ElMessage } from 'element-plus'
import { copy } from '@/utils/string'
import { Md5 } from 'ts-md5'
import CryptoJS from 'crypto-js'

const title = 'Hash 计算器'
const inputText = ref('')
const algorithm = ref('MD5')
const hmacKey = ref('')
const hashResult = ref('')

const isHmac = computed(() => algorithm.value.startsWith('HMAC-'))

const algorithmOptions = [
  { label: 'MD5', value: 'MD5' },
  { label: 'SHA-1', value: 'SHA-1' },
  { label: 'SHA-256', value: 'SHA-256' },
  { label: 'SHA-384', value: 'SHA-384' },
  { label: 'SHA-512', value: 'SHA-512' },
  { label: 'HMAC-MD5', value: 'HMAC-MD5' },
  { label: 'HMAC-SHA1', value: 'HMAC-SHA1' },
  { label: 'HMAC-SHA256', value: 'HMAC-SHA256' },
  { label: 'HMAC-SHA512', value: 'HMAC-SHA512' },
]

const hexFromBuffer = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')

watch([inputText, algorithm, hmacKey], async () => {
  if (!inputText.value) { hashResult.value = ''; return }
  try {
    const algo = algorithm.value
    if (algo === 'MD5') {
      hashResult.value = Md5.hashStr(inputText.value)
    } else if (algo === 'HMAC-MD5') {
      if (!hmacKey.value) { hashResult.value = '请输入 HMAC 密钥'; return }
      hashResult.value = CryptoJS.HmacMD5(inputText.value, hmacKey.value).toString()
    } else if (algo.startsWith('HMAC-')) {
      if (!hmacKey.value) { hashResult.value = '请输入 HMAC 密钥'; return }
      const shaMap: Record<string, string> = { 'HMAC-SHA1': 'SHA-1', 'HMAC-SHA256': 'SHA-256', 'HMAC-SHA512': 'SHA-512' }
      const enc = new TextEncoder()
      const key = await crypto.subtle.importKey('raw', enc.encode(hmacKey.value), { name: 'HMAC', hash: shaMap[algo] }, false, ['sign'])
      hashResult.value = hexFromBuffer(await crypto.subtle.sign('HMAC', key, enc.encode(inputText.value)))
    } else {
      const enc = new TextEncoder()
      hashResult.value = hexFromBuffer(await crypto.subtle.digest(algo, enc.encode(inputText.value)))
    }
  } catch (e) {
    hashResult.value = '计算失败：' + e
  }
}, { immediate: true })

const copyResult = () => {
  if (!hashResult.value) { ElMessage.warning('没有可复制的内容'); return }
  copy(hashResult.value)
}
</script>

<template>
  <div class="flex flex-col mt-3 flex-1">
    <DetailHeader :title="title" />
    <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-300 space-y-3">
      <el-input v-model="inputText" type="textarea" :rows="5" placeholder="请输入要计算哈希的文本" />
      <div class="flex flex-wrap items-center gap-3">
        <span class="text-sm text-slate-600 dark:text-slate-300">算法：</span>
        <el-select v-model="algorithm" style="width:160px">
          <el-option v-for="o in algorithmOptions" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
        <template v-if="isHmac">
          <span class="text-sm text-slate-600 dark:text-slate-300">密钥：</span>
          <el-input v-model="hmacKey" placeholder="HMAC 密钥" style="width:200px" />
        </template>
      </div>
      <div class="rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 p-3 font-mono text-sm break-all text-slate-800 dark:text-slate-200 min-h-[48px]">
        {{ hashResult || '输入文本后自动计算' }}
      </div>
      <el-button type="primary" @click="copyResult">复制结果</el-button>
    </div>
    <ToolDetail title="使用说明">
      <p>在线 Hash 计算器，支持多种哈希算法，输入内容后实时计算。</p>
      <ul class="list-disc list-inside mt-1 space-y-1">
        <li>支持 MD5、SHA-1、SHA-256、SHA-384、SHA-512</li>
        <li>支持 HMAC 系列（需要额外输入密钥）</li>
      </ul>
    </ToolDetail>
  </div>
</template>
