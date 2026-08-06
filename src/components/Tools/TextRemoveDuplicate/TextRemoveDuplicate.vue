<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { DataAnalysis, Delete, Filter, RefreshRight, Switch } from '@element-plus/icons-vue'
import CopyButton from '@/components/Common/CopyButton.vue'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import SectionHeading from '@/components/Common/SectionHeading.vue'
import { copy } from '@/utils/string'
import { dedupeLines, type DedupeMode } from '@/utils/textTools'

const content = ref('')
const options = reactive({
  trimLines: true,
  ignoreEmpty: true,
  caseSensitive: true,
  mode: 'global' as DedupeMode,
  sort: false,
})

const result = computed(() => dedupeLines(content.value, options))
const reductionRate = computed(() => result.value.originalLines
  ? Math.round(result.value.removedLines / result.value.originalLines * 100)
  : 0)

const duplicateGroups = computed(() => {
  if (!content.value) return []
  const groups = new Map<string, { label: string; count: number }>()
  for (const sourceLine of content.value.split(/\r\n|\r|\n/)) {
    const label = options.trimLines ? sourceLine.trim() : sourceLine
    if (options.ignoreEmpty && !label) continue
    const key = options.caseSensitive ? label : label.toLocaleLowerCase()
    const current = groups.get(key)
    if (current) current.count += 1
    else groups.set(key, { label: label || '空行', count: 1 })
  }
  return [...groups.values()].filter(item => item.count > 1).sort((a, b) => b.count - a.count).slice(0, 4)
})

const sampleText = 'Apple\napple\nBanana\n  Banana  \n\nOrange\nApple'

function clearAll() {
  content.value = ''
}

function useResultAsInput() {
  content.value = result.value.text
}
</script>

<template>
  <div class="dedupe-page flex flex-col mt-3 flex-1">
    <ToolHero />

    <section class="workspace-card">
      <SectionHeading :icon="Filter" title="设置去重规则" description="结果会随输入和规则实时更新，并保持原始顺序" tone="violet">
        <template #actions>
          <el-segmented
            v-model="options.mode"
            :options="[
              { label: '全局重复行', value: 'global' },
              { label: '仅连续重复', value: 'adjacent' },
            ]"
          />
        </template>
      </SectionHeading>

      <div class="option-row">
        <el-checkbox v-model="options.trimLines">忽略行首尾空白</el-checkbox>
        <el-checkbox v-model="options.ignoreEmpty">移除空行</el-checkbox>
        <el-checkbox v-model="options.caseSensitive">区分大小写</el-checkbox>
        <el-checkbox v-model="options.sort">结果按文字排序</el-checkbox>
      </div>

      <div class="editor-grid">
        <article class="editor-panel">
          <div class="editor-title">
            <div>
              <strong>原始文本</strong>
              <span>{{ result.originalLines }} 行</span>
            </div>
            <el-button text :icon="Delete" :disabled="!content" @click="clearAll">清空</el-button>
          </div>
          <el-input v-model="content" type="textarea" :rows="11" resize="none" placeholder="每行输入一项，支持直接粘贴名单、URL 或数据列表" />
        </article>

        <div class="direction-column">
          <div class="removed-badge">
            <strong>-{{ result.removedLines }}</strong>
            <span>重复行</span>
          </div>
          <el-icon><Switch /></el-icon>
        </div>

        <article class="editor-panel result-panel">
          <div class="editor-title">
            <div>
              <strong>去重结果</strong>
              <span>{{ result.resultLines }} 行 · 减少 {{ reductionRate }}%</span>
            </div>
            <CopyButton text-btn :text="result.text" :disabled="!result.text" />
          </div>
          <el-input :model-value="result.text" type="textarea" :rows="11" resize="none" readonly placeholder="处理结果会显示在这里" />
        </article>
      </div>

      <div class="workspace-footer">
        <button type="button" class="sample-button" @click="content = sampleText">载入示例数据</button>
        <el-button :icon="RefreshRight" :disabled="!result.text" @click="useResultAsInput">用结果继续处理</el-button>
      </div>
    </section>

    <section class="summary-card">
      <SectionHeading :icon="DataAnalysis" title="处理摘要" description="快速确认本次去重范围与重复热点" tone="green" />

      <div class="summary-grid">
        <div><span>原始行数</span><strong>{{ result.originalLines }}</strong></div>
        <div><span>保留行数</span><strong>{{ result.resultLines }}</strong></div>
        <div class="removed"><span>移除行数</span><strong>{{ result.removedLines }}</strong></div>
        <div><span>精简比例</span><strong>{{ reductionRate }}%</strong></div>
      </div>

      <div class="duplicate-preview">
        <span class="preview-label">高频重复项</span>
        <div v-if="duplicateGroups.length" class="duplicate-list">
          <button v-for="item in duplicateGroups" :key="item.label" type="button" @click="copy(item.label)">
            <span>{{ item.label }}</span><strong>× {{ item.count }}</strong>
          </button>
        </div>
        <p v-else>{{ content ? '当前规则下没有发现重复内容' : '输入多行文本后显示重复热点' }}</p>
      </div>
    </section>

    <ToolGuide title="规则说明">
      <div class="detail-grid">
        <div><h4>全局重复行</h4><p>整段文本中相同的内容只保留第一次出现，适合名单、链接和数据列表。</p></div>
        <div><h4>仅连续重复</h4><p>只合并相邻的相同行，后续再次出现的内容仍会保留，适合日志和段落清理。</p></div>
        <div><h4>匹配细节</h4><p>可选择忽略首尾空白和大小写；排序操作在去重完成后执行。</p></div>
      </div>
    </ToolGuide>
  </div>
</template>

<style scoped>
.dedupe-page { gap: 18px; }
.workspace-card {padding: 24px;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.05);}
.option-row, .editor-title, .workspace-footer, .duplicate-preview {display: flex; align-items: center;}

.option-row {
  flex-wrap: wrap;
  gap: 8px 22px;
  margin-top: 18px;
  padding: 12px 15px;
  border-radius: 12px;
  background: #f8fafc;
}
.editor-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 80px minmax(0, 1fr);
  gap: 12px;
  margin-top: 18px;
}
.editor-panel {
  min-width: 0;
  padding: 15px;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #f8fafc;
}
.result-panel { border-color: #bbf7d0; background: #f7fef9; }
.editor-title { min-height: 34px; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
.editor-title strong,
.editor-title span { display: block; }
.editor-title strong { color: #1e293b; font-size: 14px; }
.editor-title span { margin-top: 2px; color: #94a3b8; font-size: 11px; }
.editor-panel :deep(.el-textarea__inner) {
  min-height: 265px !important;
  border-radius: 11px;
  color: #1e293b;
  background: #fff;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  line-height: 1.65;
  box-shadow: 0 0 0 1px #dbe3ef inset;
}
.direction-column {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  color: #94a3b8;
}
.direction-column > .el-icon { font-size: 22px; }
.removed-badge {
  min-width: 64px;
  padding: 9px 6px;
  border-radius: 12px;
  color: #7c3aed;
  background: #f5f3ff;
  text-align: center;
}
.removed-badge strong,
.removed-badge span { display: block; }
.removed-badge strong { font-size: 18px; }
.removed-badge span { margin-top: 2px; font-size: 10px; }
.workspace-footer { justify-content: space-between; gap: 12px; margin-top: 14px; }
.sample-button {
  padding: 7px 12px;
  border: 1px solid #e9d5ff;
  border-radius: 999px;
  color: #7c3aed;
  background: #faf5ff;
  font-size: 12px;
  cursor: pointer;
}
.sample-button:hover { border-color: #c084fc; background: #f3e8ff; }
.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 20px;
}
.summary-grid > div { padding: 15px; border-radius: 13px; background: #f8fafc; }
.summary-grid span,
.summary-grid strong { display: block; }
.summary-grid span { color: #64748b; font-size: 12px; }
.summary-grid strong { margin-top: 5px; color: #1e293b; font-size: 23px; }
.summary-grid .removed { background: #fff7ed; }
.summary-grid .removed strong { color: #ea580c; }
.duplicate-preview {
  align-items: flex-start;
  gap: 12px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #e2e8f0;
}
.preview-label { flex: 0 0 auto; padding-top: 7px; color: #64748b; font-size: 12px; }
.duplicate-list { display: flex; flex-wrap: wrap; gap: 8px; }
.duplicate-list button {
  display: flex;
  max-width: 210px;
  gap: 8px;
  padding: 6px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
  color: #475569;
  background: #fff;
  cursor: pointer;
}
.duplicate-list button span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.duplicate-list button strong { color: #7c3aed; white-space: nowrap; }
.duplicate-preview p { margin: 5px 0 0; color: #94a3b8; font-size: 12px; }
.detail-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 22px; }
.detail-grid h4 { margin: 0 0 6px; color: #1e293b; }
.detail-grid p { margin: 0; color: #64748b; line-height: 1.7; }

:global(html.dark .dedupe-page .workspace-card),
:global(html.dark .dedupe-page .summary-card) { border-color: #334155; background: #0f172a; box-shadow: none; }
:global(html.dark .dedupe-page .editor-title strong),
:global(html.dark .dedupe-page .detail-grid h4) { color: #f1f5f9; }
:global(html.dark .dedupe-page .option-row),
:global(html.dark .dedupe-page .editor-panel),
:global(html.dark .dedupe-page .summary-grid > div) { border-color: #334155; background: #111c2f; }
:global(html.dark .dedupe-page .result-panel) { border-color: #14532d; background: #082f2a; }
:global(html.dark .dedupe-page .editor-panel .el-textarea__inner) {
  color: #e2e8f0;
  background: #0b1324;
  box-shadow: 0 0 0 1px #334155 inset;
}
:global(html.dark .dedupe-page .summary-grid strong) { color: #e2e8f0; }
:global(html.dark .dedupe-page .summary-grid .removed) { background: #3b1f0d; }
:global(html.dark .dedupe-page .duplicate-preview) { border-color: #334155; }
:global(html.dark .dedupe-page .duplicate-list button) { border-color: #334155; color: #cbd5e1; background: #111c2f; }@media (max-width: 900px) {
  .editor-grid { grid-template-columns: 1fr; }
  .direction-column { flex-direction: row; }
  .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }}@media (max-width: 640px) {
  .workspace-card,
  .summary-card { padding: 18px; border-radius: 16px; }
  .option-row { align-items: flex-start; flex-direction: column; }
  .editor-panel :deep(.el-textarea__inner) { min-height: 220px !important; }
  .workspace-footer { align-items: stretch; flex-direction: column; }
  .summary-grid,
  .detail-grid { grid-template-columns: 1fr; }
  .duplicate-preview { flex-direction: column; }}</style>
