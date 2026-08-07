<script setup lang="ts">
// 统一交换按钮（"双面板 + 中间操作区"布局的操作列按钮）
import { Switch } from '@element-plus/icons-vue'

withDefaults(defineProps<{
  /** 按钮提示文案（title / aria-label） */
  label?: string
  disabled?: boolean
}>(), {
  label: '交换输入输出',
  disabled: false,
})

const emit = defineEmits<{ (e: 'click'): void }>()
</script>

<template>
  <button
    type="button"
    class="swap-button"
    :title="label"
    :aria-label="label"
    :disabled="disabled"
    @click="emit('click')"
  >
    <el-icon><Switch /></el-icon>
  </button>
</template>

<style scoped>
.swap-button {
  display: grid;
  flex: none;
  width: 40px;
  height: 40px;
  place-items: center;
  border: 1px solid var(--c-border-strong);
  border-radius: 50%;
  color: var(--c-text-secondary);
  background: var(--c-surface);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s, background-color 0.2s;
}
.swap-button:hover {
  border-color: var(--c-primary-300);
  color: var(--c-primary);
  background: var(--c-primary-50);
}
.swap-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
