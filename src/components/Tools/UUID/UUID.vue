<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Clock, CopyDocument, DataBoard, DocumentCopy, RefreshRight } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { v4 as uuidv4, v7 as uuidv7 } from 'uuid'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import SectionHeading from '@/components/Common/SectionHeading.vue'
import { formatUuid } from '@/utils/generators'
import { copy } from '@/utils/string'

type UuidVersion = 'v4' | 'v7'

const version = ref<UuidVersion>('v4')
const count = ref(5)
const rawUuids = ref<string[]>([])
const format = reactive({
  uppercase: false,
  hyphens: true,
  braces: false,
})

const formattedUuids = computed(() => rawUuids.value.map(value => formatUuid(value, format)))
const formatLabel = computed(() => [
  format.uppercase ? '大写' : '小写',
  format.hyphens ? '保留连字符' : '无连字符',
  format.braces ? '带大括号' : '',
].filter(Boolean).join(' · '))

function generateAll() {
  const total = Number(count.value)
  if (!Number.isInteger(total) || total < 1 || total > 100) {
    ElMessage.warning('生成数量应为 1～100')
    return
  }
  const createUuid = version.value === 'v7' ? uuidv7 : uuidv4
  rawUuids.value = Array.from({ length: total }, () => createUuid())
}

function selectVersion(value: UuidVersion) {
  version.value = value
  generateAll()
}

function copyAll() {
  copy(formattedUuids.value.join('\n'))
}

onMounted(generateAll)
</script>

<template>
  <div class="uuid-page flex flex-col mt-3 flex-1">
    <ToolHero />

    <section class="workspace-card">
      <SectionHeading :icon="DataBoard" title="生成规则" description="选择 UUID 版本与输出格式，单次最多生成 100 条" tone="blue" />

      <div class="version-grid">
        <button type="button" :class="{ active: version === 'v4' }" @click="selectVersion('v4')">
          <span class="version-badge">V4</span>
          <span><strong>随机型 UUID</strong><small>兼容性最好，适合通用唯一标识</small></span>
        </button>
        <button type="button" :class="{ active: version === 'v7' }" @click="selectVersion('v7')">
          <span class="version-badge violet">V7</span>
          <span><strong>时间有序 UUID</strong><small>按生成时间排序，更适合作为数据库主键</small></span>
        </button>
      </div>

      <div class="control-grid">
        <label class="count-field">
          <span>生成数量</span>
          <el-input-number v-model="count" :min="1" :max="100" controls-position="right" />
        </label>
        <div class="format-field">
          <span>输出格式</span>
          <div class="format-options">
            <el-checkbox v-model="format.uppercase">大写字母</el-checkbox>
            <el-checkbox v-model="format.hyphens">保留连字符</el-checkbox>
            <el-checkbox v-model="format.braces">添加大括号</el-checkbox>
          </div>
        </div>
        <el-button type="primary" size="large" :icon="RefreshRight" @click="generateAll">重新生成</el-button>
      </div>
    </section>

    <section class="result-card">
      <SectionHeading :icon="DocumentCopy" title="UUID 列表" :description="formattedUuids.length + ' 条 · ' + formatLabel" tone="green">
        <template #actions>
          <el-button :icon="CopyDocument" :disabled="!formattedUuids.length" @click="copyAll">复制全部</el-button>
        </template>
      </SectionHeading>

      <div class="uuid-list">
        <button
          v-for="(uuid, index) in formattedUuids"
          :key="rawUuids[index]"
          type="button"
          title="复制这个 UUID"
          @click="copy(uuid)"
        >
          <span class="row-number">{{ String(index + 1).padStart(2, '0') }}</span>
          <code>{{ uuid }}</code>
          <span class="row-version">{{ version.toUpperCase() }}</span>
          <el-icon><CopyDocument /></el-icon>
        </button>
      </div>
    </section>

    <ToolGuide title="版本选择参考">
      <div class="reference-grid">
        <article>
          <div class="reference-icon blue"><el-icon><DataBoard /></el-icon></div>
          <div><strong>UUID v4 · 通用优先</strong><p>完全基于随机数生成，生态支持成熟。适合文件、请求、会话等无需排序的标识。</p></div>
        </article>
        <article>
          <div class="reference-icon violet"><el-icon><Clock /></el-icon></div>
          <div><strong>UUID v7 · 数据库友好</strong><p>高位包含毫秒时间戳，新记录大致递增，可降低随机主键造成的索引碎片。</p></div>
        </article>
        <article>
          <div class="reference-icon green"><el-icon><CopyDocument /></el-icon></div>
          <div><strong>格式不改变 UUID 含义</strong><p>大小写、连字符和大括号只影响展示；接入系统前请确认对方要求的格式。</p></div>
        </article>
      </div>
    </ToolGuide>
  </div>
</template>

<style scoped>
.uuid-page {
  gap: 18px;
}
.workspace-card {
  padding: 24px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-card);
  background: var(--c-surface);
  box-shadow: var(--shadow-card);
}
.control-grid {
  display: flex;
  align-items: center;
}
.version-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 22px;
}
.version-grid > button {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 17px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  color: var(--c-text-strong);
  background: var(--c-surface-subtle);
  text-align: left;
  transition: .2s ease;
}
.version-grid > button:hover {
  border-color: var(--c-primary-300);
  transform: translateY(-1px);
}
.version-grid > button.active {
  border-color: var(--c-primary-500);
  background: var(--c-primary-50);
  box-shadow: inset 0 0 0 1px var(--c-primary-500);
}
.version-grid > button > span:last-child, .version-grid strong, .version-grid small {
  display: block;
}
.version-grid strong {
  font-size: 14px;
}
.version-grid small {
  margin-top: 4px;
  color: var(--c-text-secondary);
  font-size: 12px;
}
.version-badge {
  display: grid;
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  place-items: center;
  border-radius: var(--radius-md);
  color: var(--c-primary-700);
  background: var(--c-primary-100);
  font-size: 13px;
  font-weight: 800;
}
.version-badge.violet {
  color: #6d28d9;
  background: #ede9fe;
}
.control-grid {
  gap: 20px;
  margin-top: 18px;
  padding: 16px;
  border-radius: var(--radius-md);
  background: var(--c-surface-subtle);
}
.count-field > span, .format-field > span {
  display: block;
  margin-bottom: 7px;
  color: var(--c-text-body);
  font-size: 12px;
  font-weight: 650;
}
.count-field :deep(.el-input-number) {
  width: 145px;
}
.format-field {
  min-width: 0;
  flex: 1;
}
.format-options {
  display: flex;
  min-height: 32px;
  align-items: center;
  gap: 20px;
}
.control-grid > .el-button {
  align-self: flex-end;
}
.uuid-list {
  display: grid;
  gap: 9px;
  margin-top: 20px;
}
.uuid-list > button {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) 42px 20px;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 13px 15px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  color: var(--c-text-secondary);
  background: var(--c-surface-subtle);
  text-align: left;
  transition: .2s ease;
}
.uuid-list > button:hover {
  border-color: var(--c-primary-300);
  color: var(--c-primary);
  background: var(--c-primary-50);
}
.row-number {
  color: var(--c-text-muted);
  font-size: 11px;
}
.uuid-list code {
  overflow: hidden;
  color: #1e293b;
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.row-version {
  padding: 3px 6px;
  border-radius: 6px;
  color: var(--c-primary);
  background: var(--c-primary-100);
  font-size: 10px;
  font-weight: 750;
  text-align: center;
}
.reference-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.reference-grid article {
  display: flex;
  gap: 12px;
  padding: 15px;
  border-radius: var(--radius-md);
  background: var(--c-surface-subtle);
}
.reference-icon {
  display: grid;
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  place-items: center;
  border-radius: var(--radius-sm);
}
.reference-icon.blue {
  color: var(--c-primary);
  background: var(--c-primary-100);
}
.reference-icon.violet {
  color: #7c3aed;
  background: #ede9fe;
}
.reference-icon.green {
  color: #059669;
  background: #d1fae5;
}
.reference-grid strong {
  color: var(--c-text-strong);
  font-size: 13px;
}
.reference-grid p {
  margin: 5px 0 0;
  color: var(--c-text-secondary);
  font-size: 12px;
  line-height: 1.65;
}
:global(html.dark .uuid-page .workspace-card), :global(html.dark .uuid-page .result-card) {
  border-color: var(--c-border);
  background: var(--c-surface);
  box-shadow: none;
}
:global(html.dark .uuid-page .version-grid strong), :global(html.dark .uuid-page .uuid-list code), :global(html.dark .uuid-page .reference-grid strong) {
  color: var(--c-text-primary);
}
:global(html.dark .uuid-page .version-grid > button), :global(html.dark .uuid-page .control-grid), :global(html.dark .uuid-page .uuid-list > button), :global(html.dark .uuid-page .reference-grid article) {
  border-color: var(--c-border);
  background: var(--c-surface-subtle);
}
:global(html.dark .uuid-page .version-grid > button.active) {
  border-color: var(--c-primary-500);
  background: rgba(30, 64, 175, .18);
}
@media (max-width: 760px) {
  .control-grid {
    align-items: stretch;
    flex-direction: column;
    gap: 14px;
  }
  .format-options {
    flex-wrap: wrap;
    gap: 4px 16px;
  }
  .control-grid > .el-button {
    align-self: stretch;
  }
  .reference-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 640px) {
  .workspace-card, .result-card {
    padding: 18px;
  }
  .version-grid {
    grid-template-columns: 1fr;
  }
  .uuid-list > button {
    grid-template-columns: 24px minmax(0, 1fr) 18px;
  }
  .row-version {
    display: none;
  }
}
</style>
