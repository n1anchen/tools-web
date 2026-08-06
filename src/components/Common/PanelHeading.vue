<script setup lang="ts">
/**
 * 面板头部：标题 + 统计小字 + 右侧操作区。
 * 统一「面板标题」模式（原 editor-title 的紧凑/宽条两档）：
 *   <PanelHeading title="HTML / 普通文本" :stats="`${input.length} 字符`">
 *     <template #actions><el-button ... /></template>
 *   </PanelHeading>
 */
withDefaults(defineProps<{
  title: string
  /** 统计/状态小字（如「12 字符」） */
  stats?: string
  /** 尺寸：compact（默认，34px 紧凑头）/ bar（52px 宽条带内边距） */
  size?: 'compact' | 'bar'
}>(), { size: 'compact' })
</script>

<template>
  <div class="editor-title" :class="`et-${size}`">
    <div class="et-main">
      <strong>{{ title }}</strong>
      <span v-if="stats">{{ stats }}</span>
    </div>
    <div class="et-actions"><slot name="actions" /></div>
  </div>
</template>

<style scoped>
.editor-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.et-compact {
  min-height: 34px;
  margin-bottom: 10px;
}
.et-bar {
  min-height: 52px;
  padding: 0 14px;
}
.et-main {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}
.et-main strong {
  color: var(--c-text-strong);
  font-size: 14px;
}
.et-main span {
  color: var(--c-text-muted);
  font-size: 11px;
}
.et-actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 8px;
}
.dark .et-main strong { color: var(--c-text-primary); }
</style>
