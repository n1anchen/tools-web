<script setup lang="ts">
import type { Component } from 'vue'
import { CopyDocument } from '@element-plus/icons-vue'
import { copy } from '@/utils/string'

/**
 * 复制按钮：统一 CopyDocument 图标 + copy() 反馈逻辑。
 * 两种用法（互斥）：
 *  1. 传 :text → 点击时内部调用 copy(text)（自动 toast 反馈）
 *  2. 不传 :text，改用 @click → 自定义逻辑（如 copyAll 包装函数）
 * 按钮样式透传 type / size / plain / text / link / circle / disabled。
 */
const props = withDefaults(defineProps<{
  /** 要复制的文本（传了则内部调用 copy()；不传则必须配合 @click） */
  text?: string
  /** 按钮文案，默认「复制」；可用 #default 插槽覆盖 */
  label?: string
  /** 复制图标，默认 CopyDocument */
  icon?: Component
  disabled?: boolean
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  size?: 'large' | 'default' | 'small'
  plain?: boolean
  /** text 变体（无边框文字按钮） */
  textBtn?: boolean
  link?: boolean
  circle?: boolean
  /** @click.stop（如嵌套在可点击元素内） */
  stop?: boolean
}>(), {
  label: '复制',
  disabled: false,
  plain: false,
  textBtn: false,
  link: false,
  circle: false,
  stop: false,
})

function handleClick(event: MouseEvent) {
  if (props.stop) event.stopPropagation()
  // 仅当传入 text 时内部复制；否则交给父级 @click（透传到根元素）
  if (props.text !== undefined) copy(props.text)
}
</script>

<template>
  <el-button
    :icon="icon ?? CopyDocument"
    :disabled="disabled"
    :type="type"
    :size="size"
    :plain="plain"
    :text="textBtn"
    :link="link"
    :circle="circle"
    @click="handleClick"
  >
    <slot>{{ label }}</slot>
  </el-button>
</template>
