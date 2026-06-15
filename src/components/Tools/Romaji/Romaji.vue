<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import * as wanakana from 'wanakana'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { copy } from '@/utils/string'
import {
  analyzeJapaneseText,
  analysisTokensToRomaji,
  cacheKuromojiDictionary,
  clearKuromojiDictionaryCache,
  KUROMOJI_DICTIONARY_CACHE_PREFERENCE_KEY,
} from '@/utils/japaneseAnalyzer'

const title = '日语转罗马音'

const input = ref('')
const result = ref('')
const preciseReading = ref(localStorage.getItem('japaneseRomajiPreciseReading') === 'true')
const cacheDictionary = ref(readCacheDictionaryPreference())
const converting = ref(false)
const cacheBusy = ref(false)
const analyzerError = ref('')

const isEmpty = computed(() => input.value.trim() === '')
const hasResult = computed(() => result.value !== '')

watch(preciseReading, (value) => {
  localStorage.setItem('japaneseRomajiPreciseReading', String(value))
})

watch(cacheDictionary, async (value) => {
  localStorage.setItem(KUROMOJI_DICTIONARY_CACHE_PREFERENCE_KEY, String(value))
  localStorage.removeItem('japaneseRomajiCacheDictionary')
  localStorage.removeItem('japaneseLyricsCacheDictionary')
  cacheBusy.value = true
  try {
    if (value) {
      await cacheKuromojiDictionary()
      ElMessage.success('日语词典已加入离线缓存')
    } else {
      await clearKuromojiDictionaryCache()
      ElMessage.success('日语词典缓存已清理')
    }
  } catch (error) {
    ElMessage.error(value ? '词典缓存失败，请稍后重试' : '词典缓存清理失败')
    cacheDictionary.value = !value
  } finally {
    cacheBusy.value = false
  }
})

function readCacheDictionaryPreference() {
  const sharedPreference = localStorage.getItem(KUROMOJI_DICTIONARY_CACHE_PREFERENCE_KEY)
  if (sharedPreference !== null) return sharedPreference === 'true'

  return localStorage.getItem('japaneseRomajiCacheDictionary') === 'true'
    || localStorage.getItem('japaneseLyricsCacheDictionary') === 'true'
}

async function convert() {
  if (isEmpty.value || converting.value) return

  converting.value = true
  analyzerError.value = ''
  try {
    if (preciseReading.value) {
      if (cacheDictionary.value) {
        await cacheKuromojiDictionary()
      }
      result.value = await convertPrecise(input.value)
    } else {
      result.value = wanakana.toRomaji(input.value)
    }
  } catch (error) {
    analyzerError.value = '精准转换失败，请检查网络或稍后重试'
    ElMessage.error(analyzerError.value)
  } finally {
    converting.value = false
  }
}

async function convertPrecise(value: string) {
  const lines = value.replace(/\r\n?/g, '\n').split('\n')
  const converted = await Promise.all(lines.map(async line => {
    if (!line.trim()) return ''
    const tokens = await analyzeJapaneseText(line)
    return analysisTokensToRomaji(tokens)
  }))
  return converted.join('\n')
}

function clear() {
  input.value = ''
  result.value = ''
  analyzerError.value = ''
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
          输入日语
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

      <div class="grid gap-3 md:grid-cols-2">
        <div class="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 p-3 flex items-center justify-between gap-3">
          <div>
            <div class="text-sm font-medium text-slate-700 dark:text-slate-200">精准汉字读音</div>
            <div class="text-xs text-slate-500 dark:text-slate-400">按需加载 kuromoji 词典</div>
          </div>
          <el-switch v-model="preciseReading" :loading="converting && preciseReading" />
        </div>
        <div class="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 p-3 flex items-center justify-between gap-3">
          <div>
            <div class="text-sm font-medium text-slate-700 dark:text-slate-200">离线缓存词典</div>
            <div class="text-xs text-slate-500 dark:text-slate-400">与日语歌词工具共用缓存</div>
          </div>
          <el-switch v-model="cacheDictionary" :loading="cacheBusy" />
        </div>
      </div>

      <div v-if="analyzerError" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-200">
        {{ analyzerError }}
      </div>

      <!-- 操作按钮 -->
      <div class="flex flex-wrap gap-2">
        <button
          :disabled="isEmpty || converting"
          @click="convert"
          class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {{ converting ? '转换中...' : '转换' }}
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
        1. 在输入框中输入日语文本（支持平假名、片假名、汉字混合文本）<br />
        2. 默认轻量模式使用 wanakana 转换假名；开启「精准汉字读音」后会按需加载 kuromoji 词典，将汉字读音一并转换为罗马音<br />
        3. 转换完成后点击「复制结果」一键复制<br />
        <br />
        <b>注意：</b>精准模式会在首次使用时加载较大的日语词典；打开「离线缓存词典」后，会缓存同一份 kuromoji 词典，日语歌词学习工具和日语转罗马音工具共用，后续可离线使用。
        在任一工具中关闭该开关都会清理这份共享词典缓存。
        人名、地名、歌词特殊读法等仍可能需要人工确认。
      </el-text>
    </ToolDetail>
  </div>
</template>
