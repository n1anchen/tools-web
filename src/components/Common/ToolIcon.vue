<script setup lang="ts">
import { computed, defineAsyncComponent, type Component } from 'vue'
import { Icon } from '@vicons/utils'

const props = withDefaults(defineProps<{
  /** 图标：图片路径（以 / 或 http 开头）或 @vicons/fa 图标名（如 "Download"） */
  logo: string
  /** 图标尺寸（px），默认 36 */
  size?: number
  /** 图标圆角 class，默认 rounded-lg */
  rounded?: string
}>(), {
  size: 36,
  rounded: 'rounded-lg'
})

/** 是否为图片 URL */
const isImageUrl = computed(() => {
  return props.logo.startsWith('/') || props.logo.startsWith('http')
})

/** 是否为 @vicons/fa 图标名 */
const isIconName = computed(() => {
  return props.logo !== '' && !isImageUrl.value
})

/** 动态加载 @vicons/fa 图标组件 */
const faIconComponent = computed<Component | null>(() => {
  if (!isIconName.value) return null
  const name = props.logo
  return defineAsyncComponent(() =>
    import('@vicons/fa').then((mod) => {
      const comp = (mod as Record<string, Component>)[name]
      if (!comp) {
        console.warn(`[ToolIcon] @vicons/fa 中未找到图标: "${name}"`)
        return Promise.reject(new Error(`Icon "${name}" not found`))
      }
      return comp
    })
  )
})

const iconSize = computed(() => Math.round(props.size * 0.6))
</script>

<template>
  <!-- @vicons/fa 图标 -->
  <div
    v-if="isIconName && faIconComponent"
    :class="['flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-700 dark:to-slate-600', rounded]"
    :style="{ width: size + 'px', height: size + 'px', minWidth: size + 'px', minHeight: size + 'px' }"
  >
    <Icon :size="iconSize" class="text-blue-500 dark:text-blue-400">
      <component :is="faIconComponent" />
    </Icon>
  </div>

  <!-- 图片 URL -->
  <el-image
    v-else-if="isImageUrl"
    :src="logo"
    :class="['shadow-sm', rounded]"
    :style="{ width: size + 'px', height: size + 'px', minWidth: size + 'px', minHeight: size + 'px' }"
    fit="cover"
  >
    <template #error>
      <div
        :class="['bg-gradient-to-br from-blue-100 to-blue-200 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center', rounded]"
        :style="{ width: size + 'px', height: size + 'px' }"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-blue-400 dark:text-blue-500" viewBox="0 0 512 512" fill="currentColor">
          <path d="M501.1 395.7L384 278.6c-23.1-23.1-57.6-27.6-85.4-13.9L192 158.1V96L64 0L0 64l96 128h62.1l106.6 106.6c-13.6 27.8-9.2 62.3 13.9 85.4l117.1 117.1c14.6 14.6 38.2 14.6 52.7 0l52.7-52.7c14.5-14.6 14.5-38.2 0-52.7zM331.7 225c28.3 0 54.9 11 74.9 31l19.4 19.4c15.8-6.9 30.8-16.5 43.8-29.5c37.1-37.1 49.7-89.3 37.9-136.7c-2.2-9-13.5-12.1-20.1-5.5l-74.4 74.4l-67.9-11.3L334 98.9l74.4-74.4c6.6-6.6 3.4-17.9-5.7-20.2c-47.4-11.7-99.6.9-136.6 37.9c-28.5 28.5-41.9 66.1-41.2 103.6l82.1 82.1c8.1-1.9 16.5-2.9 24.7-2.9zm-103.9 82l-56.7-56.7L18.7 402.8c-25 25-25 65.5 0 90.5s65.5 25 90.5 0l123.6-123.6c-7.6-19.9-9.9-41.6-5-62.7zM64 472c-13.2 0-24-10.8-24-24c0-13.3 10.7-24 24-24s24 10.7 24 24c0 13.2-10.7 24-24 24z" fill="currentColor"></path>
        </svg>
      </div>
    </template>
  </el-image>

  <!-- 无 logo 的 fallback -->
  <slot v-else name="fallback">
    <div
      :class="['bg-gradient-to-br from-blue-100 to-blue-200 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center', rounded]"
      :style="{ width: size + 'px', height: size + 'px', minWidth: size + 'px', minHeight: size + 'px' }"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-blue-400 dark:text-blue-500" viewBox="0 0 512 512" fill="currentColor">
        <path d="M501.1 395.7L384 278.6c-23.1-23.1-57.6-27.6-85.4-13.9L192 158.1V96L64 0L0 64l96 128h62.1l106.6 106.6c-13.6 27.8-9.2 62.3 13.9 85.4l117.1 117.1c14.6 14.6 38.2 14.6 52.7 0l52.7-52.7c14.5-14.6 14.5-38.2 0-52.7zM331.7 225c28.3 0 54.9 11 74.9 31l19.4 19.4c15.8-6.9 30.8-16.5 43.8-29.5c37.1-37.1 49.7-89.3 37.9-136.7c-2.2-9-13.5-12.1-20.1-5.5l-74.4 74.4l-67.9-11.3L334 98.9l74.4-74.4c6.6-6.6 3.4-17.9-5.7-20.2c-47.4-11.7-99.6.9-136.6 37.9c-28.5 28.5-41.9 66.1-41.2 103.6l82.1 82.1c8.1-1.9 16.5-2.9 24.7-2.9zm-103.9 82l-56.7-56.7L18.7 402.8c-25 25-25 65.5 0 90.5s65.5 25 90.5 0l123.6-123.6c-7.6-19.9-9.9-41.6-5-62.7zM64 472c-13.2 0-24-10.8-24-24c0-13.3 10.7-24 24-24s24 10.7 24 24c0 13.2-10.7 24-24 24z" fill="currentColor"></path>
      </svg>
    </div>
  </slot>
</template>
