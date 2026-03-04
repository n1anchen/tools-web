<script setup lang="ts">
import { ref, computed } from 'vue'
import * as wanakana from 'wanakana'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { copy } from '@/utils/string'

const title = '日语转罗马音'

const input = ref('')
const result = ref('')

const isEmpty = computed(() => input.value.trim() === '')
const hasResult = computed(() => result.value !== '')

function convert() {
  result.value = wanakana.toRomaji(input.value)
}

function clear() {
  input.value = ''
  result.value = ''
}

function copyResult() {
  copy(result.value)
}
</script>

<template>
  <div class="flex flex-col mt-3 flex-1">
    <DetailHeader :title="title" />

    <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-300 space-y-4">

      <!-- 输入区 -->
      <div>
        <label class="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
          输入日语（平假名 / 片假名）
        </label>
        <el-input
          v-model="input"
          type="textarea"
          :rows="6"
          placeholder="在此输入日语，例如：はじめまして…"
          resize="none"
          class="w-full"
        />
      </div>

      <!-- 操作按钮 -->
      <div class="flex flex-wrap gap-2">
        <button
          :disabled="isEmpty"
          @click="convert"
          class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          转换
        </button>

        <button
          v-if="hasResult"
          @click="copyResult"
          class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          复制结果
        </button>

        <button
          v-if="input || hasResult"
          @click="clear"
          class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          清空
        </button>
      </div>

      <!-- 结果区 -->
      <div v-if="hasResult">
        <label class="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
          罗马音结果
        </label>
        <div
          class="w-full min-h-[120px] p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 text-base leading-relaxed whitespace-pre-wrap break-all select-all"
        >{{ result }}</div>
      </div>

    </div>

    <ToolDetail title="使用说明">
      <el-text>
        1. 在输入框中输入日语文本（支持平假名、片假名，及混合文本）<br />
        2. 点击「转换」按钮，将假名转换为 Hepburn 式罗马音<br />
        3. 转换完成后点击「复制结果」一键复制<br />
        <br />
        <b>注意：</b>本工具仅转换假名字符，漢字（如「東京」）会原样保留，不会被转换。
        若需连漢字一起转换为罗马音，建议先通过其他工具（如在线日语词典）将漢字转换为假名后再使用。<br />
        输入中的空格会被保留，可以手动在词语间加空格以区分分词。
      </el-text>
    </ToolDetail>
  </div>
</template>
