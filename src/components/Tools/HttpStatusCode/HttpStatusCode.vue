<script setup lang="ts">
import { computed, ref } from 'vue'
import { Search } from '@element-plus/icons-vue'
import CopyButton from '@/components/Common/CopyButton.vue'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import { filterHttpStatuses } from '@/utils/developerTools'
import {
  HTTP_STATUS_CATEGORIES,
  HTTP_STATUS_CODES,
  type HttpStatusCategory,
  type HttpStatusCode,
} from '@/data/httpStatusCodes'

type CategorySelection = 'all' | HttpStatusCategory

const query = ref('')
const category = ref<CategorySelection>('all')
const commonOnly = ref(true)
const selected = ref<HttpStatusCode>(HTTP_STATUS_CODES.find(status => status.code === 404)!)

const results = computed(() => filterHttpStatuses(HTTP_STATUS_CODES, query.value, category.value, commonOnly.value))
const commonStatuses = HTTP_STATUS_CODES.filter(status => status.common)
const selectedCategory = computed(() => HTTP_STATUS_CATEGORIES.find(item => item.value === selected.value.category)!)

function chooseCategory(value: CategorySelection) {
  category.value = value
  if (value !== 'all') commonOnly.value = false
}

function selectStatus(status: HttpStatusCode) {
  selected.value = status
}
</script>

<template>
  <div class="http-page flex flex-col mt-3 flex-1">
    <ToolHero summary="先理解响应，再定位问题" description="搜索状态码、英文名称或中文场景，快速找到含义与处理建议。数据对照 IANA 官方登记表（2025-09-15 更新），可前往 iana.org/assignments/http-status-codes 核实。" />

    <section class="category-grid">
      <button v-for="item in HTTP_STATUS_CATEGORIES" :key="item.value" :class="[item.tone, { active: category === item.value }]" @click="chooseCategory(item.value)">
        <strong>{{ item.value }}xx</strong><div><b>{{ item.label }}</b><span>{{ item.summary }}</span></div><small>{{ HTTP_STATUS_CODES.filter(status => status.category === item.value).length }} 项</small>
      </button>
    </section>

    <section class="search-card">
      <div class="search-box"><el-icon><Search /></el-icon><el-input v-model="query" size="large" placeholder="搜索 404、Not Found、缓存、限流……" clearable /></div>
      <div class="filter-row">
        <div class="category-tabs">
          <button :class="{ active: category === 'all' }" @click="chooseCategory('all')">全部</button>
          <button v-for="item in HTTP_STATUS_CATEGORIES" :key="item.value" :class="{ active: category === item.value }" @click="chooseCategory(item.value)">{{ item.value }}xx</button>
        </div>
        <el-switch v-model="commonOnly" active-text="仅看常用" />
      </div>
    </section>

    <section class="selected-card" :class="`tone-${selected.category}`">
      <div class="selected-code"><span>{{ selected.code }}</span><small>{{ selectedCategory.label }}</small></div>
      <div class="selected-main">
        <div class="selected-heading"><div><span class="eyebrow">SELECTED STATUS</span><h3>{{ selected.name }}</h3></div><CopyButton link type="primary" :text="`${selected.code} ${selected.name}`" /></div>
        <p>{{ selected.description }}</p>
        <div class="selected-details">
          <div><span>典型场景</span><strong>{{ selected.usage || selectedCategory.summary }}</strong></div>
          <div><span>处理建议</span><strong>{{ selected.advice || (selected.category === '4' ? '检查请求参数、认证状态和资源条件。' : selected.category === '5' ? '检查服务日志、上游依赖和容量状态。' : '结合方法、响应头和业务语义判断。') }}</strong></div>
        </div>
        <div class="tag-row"><span v-if="selected.note" class="note-tag">{{ selected.note }}</span><span v-for="tag in selected.tags" :key="tag">{{ tag }}</span></div>
      </div>
    </section>

    <section class="common-card">
      <div class="section-heading"><div><span class="eyebrow">QUICK ACCESS</span><h3>高频状态码</h3></div><span>点击查看详情</span></div>
      <div class="common-list"><button v-for="status in commonStatuses" :key="status.code" :class="{ active: selected.code === status.code }" @click="selectStatus(status)"><strong>{{ status.code }}</strong><span>{{ status.name }}</span></button></div>
    </section>

    <section class="results-card">
      <div class="section-heading"><div><span class="eyebrow">STATUS DIRECTORY</span><h3>状态码目录</h3></div><span>找到 {{ results.length }} 项</span></div>
      <div v-if="results.length" class="status-grid">
        <article v-for="status in results" :key="status.code" :class="[`category-${status.category}`, { selected: selected.code === status.code }]" @click="selectStatus(status)">
          <div class="status-heading"><strong>{{ status.code }}</strong><div><h4>{{ status.name }}</h4><span>{{ HTTP_STATUS_CATEGORIES.find(item => item.value === status.category)?.label }}</span></div><small v-if="status.common">常用</small></div>
          <p>{{ status.description }}</p>
          <div class="status-footer"><span v-if="status.note">{{ status.note }}</span><span v-else>{{ status.tags?.slice(0, 2).join(' · ') || 'HTTP' }}</span><CopyButton link type="primary" stop :text="String(status.code)" /></div>
        </article>
      </div>
      <div v-else class="empty-state">没有找到匹配的状态码，请尝试其他关键词或关闭筛选。</div>
    </section>

    <ToolGuide title="分类说明">
      <el-text>1xx 表示继续处理；2xx 表示成功；3xx 表示需要重定向或使用缓存；4xx 通常与请求、认证或资源状态有关；5xx 表示服务端或上游未能完成请求。状态码只能说明协议层结果，实际排查仍需结合 HTTP 方法、响应头、响应体和服务日志。</el-text>
    </ToolGuide>
  </div>
</template>

<style scoped>
.http-page {
  --sky: #0284c7;
  --emerald: #059669;
  --amber: #d97706;
  --rose: #e11d48;
  --violet: #7c3aed;
  gap: 16px;
}
.search-card, .selected-card, .common-card, .results-card {
  border: 1px solid var(--c-border);
  border-radius: var(--radius-card);
  background: var(--c-surface);
  box-shadow: var(--shadow-card);
}
.eyebrow {
  color: #2563eb;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .15em;
}
.category-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 9px;
}
.category-grid button {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 9px;
  min-width: 0;
  padding: 13px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  text-align: left;
  background: var(--c-surface);
  cursor: pointer;
  transition: .18s ease;
}
.category-grid button:hover, .category-grid button.active {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgb(15 23 42 / 9%);
}
.category-grid button > strong {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: var(--radius-md);
  color: var(--c-on-accent);
}
.category-grid button div {
  display: flex;
  min-width: 0;
  flex-direction: column;
}
.category-grid b {
  color: var(--c-text-strong);
  font-size: 12px;
}
.category-grid span, .category-grid small {
  color: var(--c-text-muted);
  font-size: 9px;
}
.category-grid small {
  grid-column: 2;
}
.category-grid .sky > strong {
  background: var(--sky);
}
.category-grid .emerald > strong {
  background: var(--emerald);
}
.category-grid .amber > strong {
  background: var(--amber);
}
.category-grid .rose > strong {
  background: var(--rose);
}
.category-grid .violet > strong {
  background: var(--violet);
}
.category-grid .sky.active {
  border-color: #7dd3fc;
  background: #f0f9ff;
}
.category-grid .emerald.active {
  border-color: #6ee7b7;
  background: #ecfdf5;
}
.category-grid .amber.active {
  border-color: #fcd34d;
  background: #fffbeb;
}
.category-grid .rose.active {
  border-color: #fda4af;
  background: #fff1f2;
}
.category-grid .violet.active {
  border-color: #c4b5fd;
  background: #f5f3ff;
}
.search-card {
  padding: 17px 20px;
}
.search-box {
  display: flex;
  align-items: center;
  gap: 9px;
}
.search-box > .el-icon {
  color: var(--c-text-secondary);
  font-size: 20px;
}
.search-box :deep(.el-input__wrapper) {
  box-shadow: none;
  background: var(--c-surface-subtle);
}
.filter-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: 12px;
}
.category-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.category-tabs button {
  padding: 5px 11px;
  border: 0;
  border-radius: var(--radius-full);
  color: var(--c-text-secondary);
  background: #f1f5f9;
  cursor: pointer;
}
.category-tabs button.active {
  color: var(--c-on-accent);
  background: #2563eb;
}
.selected-card {
  display: grid;
  grid-template-columns: 145px minmax(0, 1fr);
  overflow: hidden;
}
.selected-code {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: var(--c-on-accent);
}
.selected-code span {
  font-size: 48px;
  font-weight: 900;
  line-height: 1;
}
.selected-code small {
  margin-top: 7px;
  opacity: .8;
}
.tone-1 .selected-code {
  background: var(--sky);
}
.tone-2 .selected-code {
  background: var(--emerald);
}
.tone-3 .selected-code {
  background: var(--amber);
}
.tone-4 .selected-code {
  background: var(--rose);
}
.tone-5 .selected-code {
  background: var(--violet);
}
.selected-main {
  min-width: 0;
  padding: 21px 23px;
}
.selected-heading, .section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.selected-heading h3 {
  margin: 4px 0 0;
  color: var(--c-text-primary);
  font-size: 22px;
}
.selected-main > p {
  margin: 11px 0 15px;
  color: var(--c-text-body);
  line-height: 1.65;
}
.selected-details {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 9px;
}
.selected-details > div {
  display: flex;
  flex-direction: column;
  padding: 11px 13px;
  border-radius: var(--radius-md);
  background: var(--c-surface-subtle);
}
.selected-details span {
  color: var(--c-text-muted);
  font-size: 9px;
}
.selected-details strong {
  margin-top: 3px;
  color: var(--c-text-strong);
  font-size: 11px;
  line-height: 1.5;
}
.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 11px;
}
.tag-row span {
  padding: 3px 7px;
  border-radius: 99px;
  color: var(--c-text-body);
  background: #f1f5f9;
  font-size: 9px;
}
.tag-row .note-tag {
  color: #9a3412;
  background: #ffedd5;
}
.common-card, .results-card {
  padding: 22px;
}
.section-heading h3 {
  margin: 4px 0 0;
  color: var(--c-text-primary);
  font-size: 18px;
}
.section-heading > span {
  color: var(--c-text-muted);
  font-size: 10px;
}
.common-list {
  display: flex;
  gap: 7px;
  margin-top: 15px;
  overflow-x: auto;
  padding-bottom: 4px;
}
.common-list button {
  display: flex;
  align-items: center;
  gap: 7px;
  flex: none;
  padding: 7px 10px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  color: var(--c-text-body);
  background: var(--c-surface-subtle);
  cursor: pointer;
}
.common-list button.active {
  border-color: #93c5fd;
  color: #1d4ed8;
  background: #eff6ff;
}
.common-list strong {
  font: 800 12px ui-monospace, monospace;
}
.common-list span {
  font-size: 10px;
}
.status-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 17px;
}
.status-grid article {
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--c-border);
  border-left-width: 4px;
  border-radius: var(--radius-md);
  background: var(--c-surface-subtle);
  cursor: pointer;
  transition: .18s ease;
}
.status-grid article:hover, .status-grid article.selected {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgb(15 23 42 / 8%);
}
.status-grid .category-1 {
  border-left-color: var(--sky);
}
.status-grid .category-2 {
  border-left-color: var(--emerald);
}
.status-grid .category-3 {
  border-left-color: var(--amber);
}
.status-grid .category-4 {
  border-left-color: var(--rose);
}
.status-grid .category-5 {
  border-left-color: var(--violet);
}
.status-heading {
  display: flex;
  align-items: center;
  gap: 10px;
}
.status-heading > strong {
  color: var(--c-text-primary);
  font: 900 20px ui-monospace, monospace;
}
.status-heading > div {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}
.status-heading h4 {
  margin: 0;
  color: var(--c-text-strong);
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  white-space: nowrap;
}
.status-heading span, .status-heading small {
  color: var(--c-text-muted);
  font-size: 9px;
}
.status-heading small {
  padding: 3px 6px;
  border-radius: 99px;
  color: #2563eb;
  background: #dbeafe;
}
.status-grid article > p {
  min-height: 42px;
  margin: 11px 0;
  color: var(--c-text-secondary);
  font-size: 11px;
  line-height: 1.7;
}
.status-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.status-footer > span {
  color: var(--c-text-muted);
  font-size: 9px;
}
.empty-state {
  margin-top: 16px;
  padding: 36px;
  border-radius: var(--radius-md);
  color: var(--c-text-muted);
  background: var(--c-surface-subtle);
  text-align: center;
}
:global(html.dark .http-page .search-card), :global(html.dark .http-page .selected-card), :global(html.dark .http-page .common-card), :global(html.dark .http-page .results-card), :global(html.dark .http-page .category-grid button) {
  border-color: var(--c-border);
  background: var(--c-surface);
  box-shadow: none;
}
:global(html.dark .http-page h3), :global(html.dark .http-page .category-grid b), :global(html.dark .http-page .status-heading > strong), :global(html.dark .http-page .status-heading h4) {
  color: #f8fafc;
}
:global(html.dark .http-page .common-list button.active) {
  border-color: #1d4ed8;
  color: #93c5fd;
  background: #172554;
}
:global(html.dark .http-page .search-box .el-input__wrapper), :global(html.dark .http-page .selected-details > div), :global(html.dark .http-page .common-list button), :global(html.dark .http-page .status-grid article), :global(html.dark .http-page .empty-state) {
  border-color: var(--c-border);
  color: var(--c-text-secondary);
  background: var(--c-surface-subtle);
}
:global(html.dark .http-page .selected-main > p), :global(html.dark .http-page .selected-details strong) {
  color: var(--c-text-secondary);
}
:global(html.dark .http-page .category-grid button.active) {
  border-color: var(--c-border-strong);
  background: #172033;
}
@media (max-width: 900px) {
  .category-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .category-grid button:nth-child(n+4) {
    grid-column: span 1;
  }
}
@media (max-width: 640px) {
  .category-grid {
    grid-template-columns: 1fr 1fr;
  }
  .category-grid button:last-child {
    grid-column: 1 / -1;
  }
  .search-card, .common-card, .results-card {
    padding: 17px;
    border-radius: 19px;
  }
  .filter-row {
    align-items: flex-start;
    flex-direction: column;
  }
  .selected-card {
    grid-template-columns: 1fr;
  }
  .selected-code {
    padding: 19px;
  }
  .selected-code span {
    font-size: 38px;
  }
  .selected-main {
    padding: 18px;
  }
  .selected-details, .status-grid {
    grid-template-columns: 1fr;
  }
  .status-grid article > p {
    min-height: 0;
  }
}
</style>
