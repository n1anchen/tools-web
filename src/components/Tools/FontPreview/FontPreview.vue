<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { Upload } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const info = reactive({
  title: '字体在线预览',
})

// 预览文本
const previewText = ref(
  '天地玄黄，宇宙洪荒。日月盈昃，辰宿列张。\nabcdefghijklmnopqrstuvwxyz\nABCDEFGHIJKLMNOPQRSTUVWXYZ\n0123456789 !@#$%^&*()-=_+'
)

// 字体设置
const fontSize = ref(32)
const fontWeight = ref(400)
const fontStyle = ref<'normal' | 'italic'>('normal')
const fontColor = ref('#000000')

// 当前选中的字体
const selectedFont = ref('')
// 本机字体列表
const localFonts = ref<{ family: string; fullName: string; postscriptName: string; style: string }[]>([])
// 去重后的字体家族列表
const fontFamilies = computed(() => {
  const seen = new Set<string>()
  return localFonts.value.filter((f) => {
    if (seen.has(f.family)) return false
    seen.add(f.family)
    return true
  })
})

// 上传的自定义字体
const customFontName = ref('')
const customFontUrl = ref('')

// 是否显示全部字体预览
const showAllFonts = ref(false)

// 搜索过滤
const searchQuery = ref('')
const filteredFontFamilies = computed(() => {
  if (!searchQuery.value) return fontFamilies.value
  const q = searchQuery.value.toLowerCase()
  return fontFamilies.value.filter(
    (f) => f.family.toLowerCase().includes(q) || f.fullName.toLowerCase().includes(q)
  )
})

// 是否支持 Local Font Access API
const isLocalFontSupported = ref(false)

// 加载状态
const loadingFonts = ref(false)

onMounted(() => {
  isLocalFontSupported.value = 'queryLocalFonts' in window
})

// 读取本机字体
const readLocalFonts = async () => {
  if (!isLocalFontSupported.value) {
    ElMessage.warning('当前浏览器不支持读取本机字体，请使用最新版 Chrome 或 Edge 浏览器')
    return
  }
  loadingFonts.value = true
  try {
    // @ts-ignore - Local Font Access API
    const fonts = await window.queryLocalFonts()
    localFonts.value = fonts.map((f: any) => ({
      family: f.family,
      fullName: f.fullName,
      postscriptName: f.postscriptName,
      style: f.style,
    }))
    if (localFonts.value.length > 0 && !selectedFont.value) {
      selectedFont.value = localFonts.value[0].family
    }
    ElMessage.success(`已读取 ${fontFamilies.value.length} 个字体家族`)
  } catch (e: any) {
    if (e.name === 'NotAllowedError') {
      ElMessage.warning('用户拒绝了字体访问权限')
    } else {
      ElMessage.error('读取本机字体失败: ' + e.message)
    }
  } finally {
    loadingFonts.value = false
  }
}

// 打开字体文件
const openFontFile = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.ttf,.otf,.woff,.woff2'
  input.onchange = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return

    // 清理之前的自定义字体
    if (customFontUrl.value) {
      URL.revokeObjectURL(customFontUrl.value)
    }

    const url = URL.createObjectURL(file)
    const fontName = file.name.replace(/\.(ttf|otf|woff2?|woff)$/i, '')

    try {
      const font = new FontFace(fontName, `url(${url})`)
      await font.load()
      document.fonts.add(font)

      customFontName.value = fontName
      customFontUrl.value = url
      selectedFont.value = fontName

      ElMessage.success(`字体 "${fontName}" 加载成功`)
    } catch (err: any) {
      URL.revokeObjectURL(url)
      ElMessage.error('字体文件加载失败: ' + err.message)
    }
  }
  input.click()
}

// 选择字体
const selectFont = (family: string) => {
  selectedFont.value = family
  showAllFonts.value = false
}

// 当前预览字体的 CSS font-family
const previewFontFamily = computed(() => {
  if (!selectedFont.value) return 'sans-serif'
  return `"${selectedFont.value}", sans-serif`
})

// 查看所有本机字体
const viewAllFonts = () => {
  if (fontFamilies.value.length === 0) {
    ElMessage.warning('请先读取本机字体')
    return
  }
  showAllFonts.value = !showAllFonts.value
}

// 清空
const clearAll = () => {
  selectedFont.value = ''
  customFontName.value = ''
  if (customFontUrl.value) {
    URL.revokeObjectURL(customFontUrl.value)
    customFontUrl.value = ''
  }
  localFonts.value = []
  showAllFonts.value = false
  searchQuery.value = ''
  previewText.value =
    '天地玄黄，宇宙洪荒。日月盈昃，辰宿列张。\nabcdefghijklmnopqrstuvwxyz\nABCDEFGHIJKLMNOPQRSTUVWXYZ\n0123456789 !@#$%^&*()-=_+'
  fontSize.value = 32
  fontWeight.value = 400
  fontStyle.value = 'normal'
  fontColor.value = '#000000'
}

</script>

<template>
  <div class="flex flex-col mt-3 flex-1">
    <DetailHeader :title="info.title"></DetailHeader>

    <div
      class="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm transition-shadow duration-300"
    >
      <!-- 预览文本输入 -->
      <div class="mb-6">
        <div class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">预览文本</div>
        <el-input
          v-model="previewText"
          type="textarea"
          :rows="3"
          placeholder="请输入预览文本"
          resize="vertical"
        />
      </div>

      <!-- 字体选择与操作 -->
      <div class="flex flex-col gap-4 mb-6">
        <!-- 字体来源 -->
        <div class="flex flex-wrap items-center gap-3">
          <div class="text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0 w-16">字体</div>
          <el-select
            v-if="fontFamilies.length > 0"
            v-model="selectedFont"
            filterable
            placeholder="选择字体"
            class="flex-1 min-w-[200px]"
            size="large"
          >
            <el-option
              v-if="customFontName"
              :key="customFontName"
              :label="customFontName + ' (上传)'"
              :value="customFontName"
            />
            <el-option
              v-for="font in fontFamilies"
              :key="font.family"
              :label="font.family"
              :value="font.family"
            />
          </el-select>
          <el-input
            v-else
            v-model="selectedFont"
            placeholder="请先读取本机字体或上传字体文件"
            class="flex-1 min-w-[200px]"
            size="large"
            readonly
          />
        </div>

        <!-- 操作按钮 -->
        <div class="flex flex-wrap gap-3 ml-0 sm:ml-[76px]">
          <el-button @click="openFontFile" size="default">
            <el-icon class="mr-1"><Upload /></el-icon>
            打开字体文件
          </el-button>
          <el-button
            type="primary"
            @click="readLocalFonts"
            :loading="loadingFonts"
            :disabled="!isLocalFontSupported"
            size="default"
          >
            读取本机字体
          </el-button>
          <el-tooltip
            v-if="!isLocalFontSupported"
            content="需要最新版 Chrome 或 Edge 浏览器支持"
            placement="top"
          >
            <el-tag type="warning" size="small" class="self-center">浏览器不支持</el-tag>
          </el-tooltip>
        </div>
      </div>

      <!-- 字体参数调整 -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <!-- 字体大小 -->
        <div class="flex flex-col gap-2">
          <div class="text-sm font-medium text-gray-700 dark:text-gray-300">
            字体大小 <span class="text-blue-500">{{ fontSize }}px</span>
          </div>
          <el-slider v-model="fontSize" :min="12" :max="120" :step="1" />
        </div>

        <!-- 字重 -->
        <div class="flex flex-col gap-2">
          <div class="text-sm font-medium text-gray-700 dark:text-gray-300">
            字重 <span class="text-blue-500">{{ fontWeight }}</span>
          </div>
          <el-slider v-model="fontWeight" :min="100" :max="900" :step="100" :marks="{ 400: '正常', 700: '粗体' }" />
        </div>

        <!-- 字体样式 -->
        <div class="flex flex-col gap-2">
          <div class="text-sm font-medium text-gray-700 dark:text-gray-300">字体样式</div>
          <el-radio-group v-model="fontStyle">
            <el-radio-button value="normal">常规</el-radio-button>
            <el-radio-button value="italic">斜体</el-radio-button>
          </el-radio-group>
        </div>

        <!-- 字体颜色 -->
        <div class="flex flex-col gap-2">
          <div class="text-sm font-medium text-gray-700 dark:text-gray-300">字体颜色</div>
          <div class="flex items-center gap-2">
            <el-color-picker v-model="fontColor" size="default" />
            <span class="text-sm text-gray-500">{{ fontColor }}</span>
          </div>
        </div>
      </div>

      <!-- 预览区域 -->
      <div class="mb-6">
        <div class="flex items-center justify-between mb-2">
          <div class="text-sm font-medium text-gray-700 dark:text-gray-300">
            预览效果
            <span v-if="selectedFont" class="text-blue-500 ml-2">{{ selectedFont }}</span>
          </div>
          <div class="flex gap-2">
            <el-button size="small" @click="viewAllFonts" :disabled="fontFamilies.length === 0">
              {{ showAllFonts ? '收起全部字体' : '查看所有本机字体' }}
            </el-button>
            <el-button size="small" @click="clearAll">清空</el-button>
          </div>
        </div>
        <div
          class="w-full p-4 sm:p-6 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 min-h-[120px] overflow-auto whitespace-pre-wrap break-words"
          :style="{
            fontFamily: previewFontFamily,
            fontSize: fontSize + 'px',
            fontWeight: fontWeight,
            fontStyle: fontStyle,
            color: fontColor,
            lineHeight: 1.6,
          }"
        >
          {{ previewText || '请输入预览文本' }}
        </div>
      </div>

      <!-- 所有本机字体预览 -->
      <div v-if="showAllFonts" class="mt-6">
        <div class="flex items-center justify-between mb-4">
          <div class="text-sm font-medium text-gray-700 dark:text-gray-300">
            所有本机字体 ({{ filteredFontFamilies.length }} / {{ fontFamilies.length }})
          </div>
          <el-input
            v-model="searchQuery"
            placeholder="搜索字体..."
            class="max-w-[300px]"
            size="default"
            clearable
          />
        </div>
        <div class="grid grid-cols-1 gap-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          <div
            v-for="font in filteredFontFamilies"
            :key="font.family"
            class="p-4 rounded-lg border cursor-pointer transition-all duration-200"
            :class="
              selectedFont === font.family
                ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-600 shadow-sm'
                : 'border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
            "
            @click="selectFont(font.family)"
          >
            <div class="text-xs text-gray-500 dark:text-gray-400 mb-2 font-mono">
              {{ font.family }}
            </div>
            <div
              class="overflow-hidden text-ellipsis whitespace-nowrap"
              :style="{
                fontFamily: `'${font.family}', sans-serif`,
                fontSize: fontSize + 'px',
                fontWeight: fontWeight,
                fontStyle: fontStyle,
                color: fontColor,
                lineHeight: 1.4,
              }"
            >
              {{ previewText.split('\n')[0] || '天地玄黄，宇宙洪荒。The quick brown fox jumps.' }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 简介 -->
    <ToolDetail title="简介">
      <div class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        <el-text
          >在线本地字体预览工具，打开本地字体文件或者读取本地已安装的字体，查看字体的显示效果。</el-text
        >
        <br />
        <el-text class="mt-2"
          >支持打开 WOFF2、WOFF、TTF、OTF 格式的字体文件预览。通过浏览器 Local Font Access
          API 可读取系统已安装的所有字体（需要最新版 Chrome 或 Edge 浏览器）。</el-text
        >
        <div class="mt-3 text-xs text-slate-500 dark:text-slate-500">
          <p>使用说明：</p>
          <ul class="list-disc pl-5 mt-1 space-y-1">
            <li>打开字体文件：选择本地的 .ttf / .otf / .woff / .woff2 字体文件进行预览。</li>
            <li>读取本机字体：通过浏览器 API 读取系统中已安装的所有字体。</li>
            <li>可调节字体大小、字重、样式和颜色来查看不同效果。</li>
            <li>查看所有本机字体：以列表形式浏览所有已读取的系统字体。</li>
            <li>纯前端实现，您的文件不会被上传到任何服务器。</li>
          </ul>
        </div>
      </div>
    </ToolDetail>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background: #475569;
}
</style>
