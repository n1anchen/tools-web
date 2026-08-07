<script setup lang="ts">
// 双面板 + 中间操作区 布局外壳（"两栏输入框 + 中间操作区按钮"模式）
//
// 用法：
//   <SplitWorkspace :actions-width="72" :gap="12" :margin-top="18" collapse="640">
//     <template #input>…左/上面板…</template>
//     <template #actions>…中间操作区…</template>
//     <template #output>…右/下面板…</template>
//   </SplitWorkspace>
//
// 职责：3 列网格（minmax(0,1fr) 中间列 minmax(0,1fr)）+ 中间操作列垂直居中 + 窄屏折叠为单列。
// 面板与操作内容均通过插槽传入（父组件 scoped 样式可直接作用于插槽内容）。

withDefaults(defineProps<{
  /** 中间操作列宽度（px），默认 72 */
  actionsWidth?: number
  /** 列间距（px），默认 12；无间距布局（中间列即间距）传 0 */
  gap?: number
  /** 顶部间距（px），默认 18 */
  marginTop?: number
  /** 折叠为单列的断点（px），支持 640 / 820 / 900 / 1050，默认 640 */
  collapse?: number
}>(), {
  actionsWidth: 72,
  gap: 12,
  marginTop: 18,
  collapse: 640,
})
</script>

<template>
  <div
    class="split-workspace"
    :data-collapse="collapse"
    :style="{
      '--actions-width': `${actionsWidth}px`,
      '--split-gap': `${gap}px`,
      '--split-margin-top': `${marginTop}px`,
    }"
  >
    <slot name="input" />
    <div class="split-actions"><slot name="actions" /></div>
    <slot name="output" />
  </div>
</template>

<style scoped>
.split-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--actions-width) minmax(0, 1fr);
  gap: var(--split-gap);
  margin-top: var(--split-margin-top);
  align-items: stretch;
}

.split-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
}

.split-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

/* 窄屏折叠为单列，中间操作区改为横向 */
@media (max-width: 640px) {
  .split-workspace[data-collapse='640'] { grid-template-columns: 1fr; }
  .split-workspace[data-collapse='640'] .split-actions { flex-direction: row; }
}
@media (max-width: 820px) {
  .split-workspace[data-collapse='820'] { grid-template-columns: 1fr; }
  .split-workspace[data-collapse='820'] .split-actions { flex-direction: row; }
}
@media (max-width: 900px) {
  .split-workspace[data-collapse='900'] { grid-template-columns: 1fr; }
  .split-workspace[data-collapse='900'] .split-actions { flex-direction: row; }
}
@media (max-width: 1050px) {
  .split-workspace[data-collapse='1050'] { grid-template-columns: 1fr; }
  .split-workspace[data-collapse='1050'] .split-actions { flex-direction: row; }
}
</style>
