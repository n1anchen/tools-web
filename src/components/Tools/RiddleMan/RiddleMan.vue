<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { copy } from '@/utils/string'
import { encoders } from './encoders/index'

// 双向编码器（textarea 多行）
const normalEncoders = computed(() => encoders.filter((e) => !e.singleLine))
// 单行只读编码器（如 MD5）
const singleLineEncoders = computed(() => encoders.filter((e) => e.singleLine))

const title = '谜语人'

// 每个编码器对应一个文本框的值
const values = reactive<Record<string, string>>(
  Object.fromEntries(encoders.map((enc) => [enc.key, ''])),
)

/** 当前解码/编码失败的框的 key，空字符串表示无错误 */
const errorKey = ref('')

let debounceTimer: ReturnType<typeof setTimeout> | null = null

/** 从指定编码器解码，再用所有其他编码器重新编码 */
async function syncFrom(srcKey: string, val: string) {
  if (!val.trim()) {
    encoders.forEach((enc) => { values[enc.key] = '' })
    errorKey.value = ''
    return
  }
  try {
    const srcEncoder = encoders.find((e) => e.key === srcKey)!
    const plainText = await srcEncoder.decode(val)
    errorKey.value = ''
    for (const enc of encoders) {
      if (enc.key === srcKey) continue
      values[enc.key] = await enc.encode(plainText)
    }
  } catch {
    // 解码失败（通常是输入不完整），高亮当前框、不更新其他框
    errorKey.value = srcKey
  }
}

function onInput(srcKey: string, val: string) {
  const enc = encoders.find((e) => e.key === srcKey)
  if (enc?.readonly) return // 只读编码器不触发同步
  values[srcKey] = val
  // 用户开始编辑时先清除上次错误状态
  if (errorKey.value === srcKey) errorKey.value = ''
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => syncFrom(srcKey, val), 400)
}

function onClear(_srcKey: string) {
  if (debounceTimer) clearTimeout(debounceTimer)
  errorKey.value = ''
  encoders.forEach((enc) => { values[enc.key] = '' })
}

function copyValue(key: string) {
  if (values[key]) copy(values[key])
}
</script>

<template>
  <div class="flex flex-col mt-3 flex-1">
    <DetailHeader :title="title" />

    <div
      class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-300"
    >
      <!-- 双向编码器：2 列 textarea 网格 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="enc in normalEncoders" :key="enc.key" class="flex flex-col gap-1">
          <!-- 标签行 -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span
                class="text-sm font-semibold text-slate-700 dark:text-slate-200"
                :class="{ 'text-red-500 dark:text-red-400': errorKey === enc.key }"
              >
                {{ enc.label }}
              </span>
              <span
                v-if="errorKey === enc.key"
                class="text-xs text-red-500 dark:text-red-400"
              >
                解码失败，请检查输入
              </span>
            </div>
            <el-button
              size="small"
              type="primary"
              plain
              :disabled="!values[enc.key]"
              @click="copyValue(enc.key)"
            >
              复制
            </el-button>
          </div>

          <!-- 文本框：出错时加红色边框 -->
          <div
            :class="errorKey === enc.key ? 'rounded-lg ring-2 ring-red-400 dark:ring-red-500' : ''"
          >
            <el-input
              type="textarea"
              :rows="8"
              :model-value="values[enc.key]"
              clearable
              :placeholder="enc.label === '正常文本' ? '在任意框输入内容，其他框自动同步' : enc.prefix + '…'"
              @input="(v: string) => onInput(enc.key, v)"
              @clear="() => onClear(enc.key)"
            />
          </div>

          <!-- 字符计数 -->
          <div class="text-right text-xs text-slate-400 dark:text-slate-500 pr-1">
            {{ values[enc.key].length }} 字符
          </div>
        </div>
      </div>

      <!-- 单行只读编码器（如 MD5），位于网格下方全宽展示 -->
      <template v-if="singleLineEncoders.length">
        <div class="mt-4 border-t border-slate-100 dark:border-slate-700 pt-4 flex flex-col gap-3">
          <div v-for="enc in singleLineEncoders" :key="enc.key" class="flex flex-col gap-1">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {{ enc.label }}
                </span>
                <span
                  class="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 select-none"
                >
                  只读 · 不可逆
                </span>
              </div>
              <el-button
                size="small"
                type="primary"
                plain
                :disabled="!values[enc.key]"
                @click="copyValue(enc.key)"
              >
                复制
              </el-button>
            </div>
            <el-input
              :model-value="values[enc.key]"
              readonly
              :placeholder="enc.label + ' 值将在此处显示'"
            />
            <div class="text-right text-xs text-slate-400 dark:text-slate-500 pr-1">
              {{ values[enc.key].length }} 字符
            </div>
          </div>
        </div>
      </template>
    </div>

    <ToolDetail title="使用说明">
      <el-text>
        在任意文本框中输入或粘贴内容，其他框将自动同步转换。支持以下编码：
      </el-text>
      <ul class="mt-2 space-y-1 list-disc list-inside text-sm text-slate-600 dark:text-slate-400">
        <li><b>正常文本</b>：原始明文</li>
        <li>
          <b>佛曰</b>：与佛论禅第一版（Tudou v1）——AES-256-CBC + UTF-16LE + 128字符映射，与原版完全兼容
        </li>
        <li>
          <b>如是我闻</b>：与佛论禅第二版（Tudou v2）——AES-256-CBC + ZIP/7-zip + 256字符映射；解码完全兼容原版网站（7-zip+LZMA）和 TudouCode C#（ZIP+LZMA），编码输出为 ZIP+Deflate 格式
        </li>
        <li><b>Base64</b>：标准 Base64 编解码，支持任意 UTF-8 文本</li>
        <li><b>MD5</b>：32位小写 MD5 哈希，单向不可逆，仅在输入明文时自动计算</li>
      </ul>
    </ToolDetail>
  </div>
</template>
