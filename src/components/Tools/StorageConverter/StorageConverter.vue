<script setup lang="ts">
import { ref, computed } from 'vue'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { copy } from '@/utils/string'

const title = '数据存储单位换算'
const inputValue = ref('')
const fromUnit = ref('B')

const units = [
  { label: 'bit（比特）', value: 'bit', bits: 1 },
  { label: 'B（字节）', value: 'B', bits: 8 },
  { label: 'KB（千字节）', value: 'KB', bits: 8 * 1024 },
  { label: 'MB（兆字节）', value: 'MB', bits: 8 * 1024 ** 2 },
  { label: 'GB（吉字节）', value: 'GB', bits: 8 * 1024 ** 3 },
  { label: 'TB（太字节）', value: 'TB', bits: 8 * 1024 ** 4 },
  { label: 'PB（拍字节）', value: 'PB', bits: 8 * 1024 ** 5 },
  { label: 'EB（艾字节）', value: 'EB', bits: 8 * 1024 ** 6 },
]

const fmt = (v: number) => {
  if (v === 0) return '0'
  if (Number.isInteger(v)) return v.toString()
  const abs = Math.abs(v)
  // 计算小数点后有多少个前导零，以此确定需要的小数位数（保留6位有效数字）
  const leadingZeros = abs < 1 ? Math.max(0, Math.floor(-Math.log10(abs))) : 0
  const decimals = Math.min(leadingZeros + 6, 20)
  return v.toFixed(decimals).replace(/\.?0+$/, '')
}

const results = computed(() => {
  const raw = parseFloat(inputValue.value)
  if (!inputValue.value || isNaN(raw)) return []
  const fromBits = units.find(u => u.value === fromUnit.value)!.bits
  const totalBits = raw * fromBits
  return units.map(u => ({ label: u.label, value: fmt(totalBits / u.bits) }))
})
</script>

<template>
  <div class="flex flex-col mt-3 flex-1">
    <DetailHeader :title="title" />
    <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-300 space-y-4">
      <div class="flex flex-wrap gap-3 items-center">
        <el-input v-model="inputValue" type="number" placeholder="输入数值" style="max-width:200px" />
        <el-select v-model="fromUnit" style="width:180px">
          <el-option v-for="u in units" :key="u.value" :label="u.label" :value="u.value" />
        </el-select>
        <el-button @click="inputValue = ''">清空</el-button>
      </div>
      <div v-if="results.length" class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div
          v-for="r in results" :key="r.label"
          class="flex items-center justify-between rounded-lg border border-slate-100 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2"
        >
          <span class="text-sm text-slate-600 dark:text-slate-300">{{ r.label }}</span>
          <div class="flex items-center gap-2">
            <span class="font-mono text-sm font-semibold text-slate-800 dark:text-slate-100">{{ r.value }}</span>
            <el-button size="small" text @click="copy(r.value)">复制</el-button>
          </div>
        </div>
      </div>
      <div v-else class="text-center text-slate-400 dark:text-slate-500 py-6">输入数值后显示换算结果</div>
    </div>
    <ToolDetail title="使用说明">
      <p>在线数据存储单位换算工具，输入数值和源单位后，自动换算所有常用存储单位。</p>
      <ul class="list-disc list-inside mt-1 space-y-1">
        <li>支持 bit、B、KB、MB、GB、TB、PB、EB</li>
        <li>基于 1 KB = 1024 B（二进制换算）</li>
      </ul>
    </ToolDetail>
  </div>
</template>
