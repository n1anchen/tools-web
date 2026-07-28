<script setup lang="ts">
import { reactive } from 'vue'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { copy } from '@/utils/string'


const info = reactive({
  title: "Unicode转中文",
  content: '',
  tranRes: '',
})

const clearRes = () => {
  info.tranRes = ''
}

//to zh
//值转换中文
const toZH = () => {
  clearRes()
  info.tranRes = info.content
    .replace(/\\u\{([0-9a-f]{1,6})\}/gi, (_, hex: string) => {
      const codePoint = Number.parseInt(hex, 16)
      return codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : _
    })
    .replace(/\\u([0-9a-f]{4})/gi, (_, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    )
}
//to unicode
const toUnicode = () => {
  //clear
  clearRes()
  for (const char of info.content) {
    const codePoint = char.codePointAt(0)!
    if (codePoint > 0x7f) {
      if (codePoint <= 0xffff) {
        info.tranRes += `\\u${codePoint.toString(16).padStart(4, '0')}`
      } else {
        const offset = codePoint - 0x10000
        const high = 0xd800 + (offset >> 10)
        const low = 0xdc00 + (offset & 0x3ff)
        info.tranRes += `\\u${high.toString(16)}\\u${low.toString(16)}`
      }
    } else {
      info.tranRes += char
    }
  }
}

//copy
const copyRes = async () => {
  copy(info.tranRes)
}
</script>

<template>
  <div class="flex flex-col mt-3 flex-1">
    <DetailHeader :title="info.title"></DetailHeader>

    <div  class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div>
        <el-input
          v-model="info.content"
          type="textarea"
          :rows="8"
          placeholder=""
          resize="vertical"
        />
      </div>

      <div class="mt-4">
        <el-button type="primary" @click="toZH">unicode转中文</el-button>
        <el-button type="primary" @click="toUnicode">中文转unicode</el-button>
        <el-button type="primary" @click="copyRes">复制结果</el-button>
      </div>

      <div class="mt-3 min-h-md bg-gray-100 dark:bg-slate-700 p-3 mb-3">
        <el-input type="textarea" :rows="8" v-model="info.tranRes"></el-input>
      </div>
    </div>

    <!-- desc -->
    <ToolDetail title="描述">
      <el-text>
        Unicode是计算机科学领域里的一项业界标准，有时候我们需要对一段文本或者一段内容进行重新排版编译的时候就需要将获取的值进行转码。
      </el-text> 
    </ToolDetail>

  </div>
</template>

<style scoped>
</style>
