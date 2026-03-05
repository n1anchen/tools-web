<script setup lang="ts">
/**
 * 通用浮窗提示组件
 * 
 * 用法示例：
 * <ToastNotification v-model="show" icon-class="text-yellow-500">
 *   <template #icon><Star /></template>
 *   <template #title>已收藏</template>
 *   <template #desc>可在首页「收藏」分类中找到该工具</template>
 * </ToastNotification>
 */
defineProps<{
  modelValue: boolean
  iconClass?: string
}>()

defineEmits<{
  (e: 'update:modelValue', val: boolean): void
}>()
</script>

<template>
  <Transition name="toast-notify">
    <div
      v-if="modelValue"
      class="flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl
             bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700
             text-sm text-slate-700 dark:text-slate-200 whitespace-nowrap"
    >
      <!-- 图标 -->
      <span v-if="$slots.icon" :class="['flex items-center text-base', iconClass]">
        <slot name="icon" />
      </span>

      <!-- 文字区 -->
      <div class="flex flex-col gap-0.5">
        <span v-if="$slots.title" class="font-medium">
          <slot name="title" />
        </span>
        <span v-if="$slots.desc" class="text-xs text-slate-400 dark:text-slate-500">
          <slot name="desc" />
        </span>
      </div>

      <!-- 操作按钮区 -->
      <slot name="actions" />

      <!-- 默认关闭按钮（无 actions slot 时不显示，由调用方决定） -->
    </div>
  </Transition>
</template>

<style scoped>
.toast-notify-enter-active,
.toast-notify-leave-active {
  transition: opacity 0.35s ease, transform 0.35s ease;
}
.toast-notify-enter-from,
.toast-notify-leave-to {
  opacity: 0;
  transform: translateY(16px);
}
</style>
