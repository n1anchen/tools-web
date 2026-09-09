<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import sourceEmojiData from 'emojibase-data/zh/compact.json'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import MetricsBar from '@/components/Common/MetricsBar.vue'
import { copy } from '@/utils/string'


const categories = [
  { key: 'face', label: '笑脸与情感', icon: '😀' },
  { key: 'gesture', label: '人物与身体', icon: '👋' },
  { key: 'nature', label: '动物与自然', icon: '🌿' },
  { key: 'food', label: '食物与饮料', icon: '🍜' },
  { key: 'travel', label: '旅行与地点', icon: '✈️' },
  { key: 'activity', label: '活动', icon: '⚽' },
  { key: 'object', label: '物品', icon: '💡' },
  { key: 'symbol', label: '符号', icon: '✨' },
  { key: 'flag', label: '旗帜', icon: '🏳️' },
]

type EmojiCategory = typeof categories[number]['key']

interface SourceEmoji {
  unicode: string
  label: string
  hexcode: string
  group?: number
  order?: number
  tags?: string[]
  skins?: SourceEmoji[]
}

interface EmojiItem {
  emoji: string
  name: string
  category: EmojiCategory
  keywords: string[]
  hexcode: string
  order: number
}

const groupCategories: Record<number, EmojiCategory> = {
  0: 'face',
  1: 'gesture',
  3: 'nature',
  4: 'food',
  5: 'travel',
  6: 'activity',
  7: 'object',
  8: 'symbol',
  9: 'flag',
}

function mapEmoji(item: SourceEmoji, group: number, inheritedKeywords: string[] = []): EmojiItem {
  return {
    emoji: item.unicode,
    name: item.label,
    category: groupCategories[group],
    keywords: [...new Set([...(item.tags ?? []), ...inheritedKeywords])],
    hexcode: item.hexcode,
    order: item.order ?? Number.MAX_SAFE_INTEGER,
  }
}

const emojiData: EmojiItem[] = (sourceEmojiData as SourceEmoji[])
  .filter((item): item is SourceEmoji & { group: number } => item.group !== undefined && item.group !== 2)
  .flatMap(item => [
    mapEmoji(item, item.group),
    ...(item.skins ?? []).map(skin => mapEmoji(skin, item.group, [item.label, ...(item.tags ?? [])])),
  ])
  .sort((left, right) => left.order - right.order)

const searchText = ref('')
const activeCategory = ref('all')
const viewMode = ref<'all' | 'favorites' | 'recent'>('all')
const favorites = ref<string[]>([])
const recent = ref<string[]>([])
const FAVORITES_KEY = 'emoji-tool-favorites'
const RECENT_KEY = 'emoji-tool-recent'
const PAGE_SIZE = 240
const visibleCount = ref(PAGE_SIZE)

const categoryLabels = Object.fromEntries(categories.map(category => [category.key, category.label]))
const categoryCounts = computed(() => Object.fromEntries(categories.map(category => [category.key, emojiData.filter(item => item.category === category.key).length])))

function emojiCode(emoji: string) {
  return Array.from(emoji).map(char => `U+${char.codePointAt(0)?.toString(16).toUpperCase()}`).join(' ')
}

function persist() {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites.value))
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.value))
  } catch { /* 浏览器禁用存储时仍可在本次会话使用 */ }
}

function setViewMode(mode: 'all' | 'favorites' | 'recent') {
  viewMode.value = mode
  activeCategory.value = 'all'
}

function selectCategory(key: string) {
  viewMode.value = 'all'
  activeCategory.value = key
}

function toggleFavorite(emoji: string) {
  favorites.value = favorites.value.includes(emoji)
    ? favorites.value.filter(item => item !== emoji)
    : [emoji, ...favorites.value].slice(0, 100)
  persist()
}

async function copyEmoji(emoji: string) {
  if (!await copy(emoji)) return
  recent.value = [emoji, ...recent.value.filter(item => item !== emoji)].slice(0, 24)
  persist()
}

const filtered = computed(() => {
  let list = [...emojiData]
  if (viewMode.value === 'favorites') list = list.filter(item => favorites.value.includes(item.emoji))
  if (viewMode.value === 'recent') {
    const order = new Map(recent.value.map((emoji, index) => [emoji, index]))
    list = list.filter(item => order.has(item.emoji)).sort((left, right) => (order.get(left.emoji) ?? 99) - (order.get(right.emoji) ?? 99))
  }
  if (activeCategory.value !== 'all') list = list.filter(item => item.category === activeCategory.value)
  const query = searchText.value.trim().toLocaleLowerCase('zh-CN')
  if (query) {
    const terms = query.split(/\s+/)
    list = list.filter(item => {
      const unicodeCode = emojiCode(item.emoji)
      const haystack = [
        item.emoji,
        item.name,
        ...item.keywords,
        categoryLabels[item.category],
        unicodeCode,
        item.hexcode,
        item.hexcode.replace(/-/g, ' '),
      ].join(' ').toLocaleLowerCase('zh-CN')
      return terms.every(term => haystack.includes(term))
    })
  }
  return list
})

const visibleEmoji = computed(() => filtered.value.slice(0, visibleCount.value))
const hasMore = computed(() => visibleCount.value < filtered.value.length)

function loadMore() {
  visibleCount.value += PAGE_SIZE
}

watch([searchText, activeCategory, viewMode], () => {
  visibleCount.value = PAGE_SIZE
})

onMounted(() => {
  try {
    const savedFavorites = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]')
    const savedRecent = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
    if (Array.isArray(savedFavorites)) favorites.value = savedFavorites.filter(item => typeof item === 'string').slice(0, 100)
    if (Array.isArray(savedRecent)) recent.value = savedRecent.filter(item => typeof item === 'string').slice(0, 24)
  } catch { /* 忽略损坏的历史数据 */ }
})
</script>

<template>
  <div class="emoji-page flex flex-col mt-3 flex-1">
    <ToolHero summary="找到表情，收藏起来，点一下就复制">
      <template #metrics>
        <MetricsBar :items="[{ label: '收录表情', value: emojiData.length }, { label: '我的收藏', value: favorites.length }, { label: '最近使用', value: recent.length }]" />
      </template>
    </ToolHero>

    <section class="browser-card">
      <div class="search-row">
        <label><span>搜索 Emoji</span><div class="search-box"><span>⌕</span><input v-model="searchText" placeholder="例如：笑、爱心、U+1F44D" aria-label="搜索 Emoji"></div></label>
        <div class="view-tabs" aria-label="Emoji 查看范围">
          <button type="button" :class="{ active: viewMode === 'all' }" @click="setViewMode('all')">全部 <span>{{ emojiData.length }}</span></button>
          <button type="button" :class="{ active: viewMode === 'favorites' }" @click="setViewMode('favorites')">★ 收藏 <span>{{ favorites.length }}</span></button>
          <button type="button" :class="{ active: viewMode === 'recent' }" @click="setViewMode('recent')">↺ 最近 <span>{{ recent.length }}</span></button>
        </div>
      </div>

      <nav class="category-rail" aria-label="Emoji 分类">
        <button type="button" :class="{ active: activeCategory === 'all' && viewMode === 'all' }" @click="selectCategory('all')"><span>🧭</span><strong>全部分类</strong><em>{{ emojiData.length }}</em></button>
        <button v-for="category in categories" :key="category.key" type="button" :class="{ active: activeCategory === category.key && viewMode === 'all' }" @click="selectCategory(category.key)"><span>{{ category.icon }}</span><strong>{{ category.label }}</strong><em>{{ categoryCounts[category.key] }}</em></button>
      </nav>

      <div v-if="recent.length && viewMode === 'all' && !searchText" class="recent-strip">
        <header><div><strong>最近使用</strong><span>点击可再次复制</span></div><button type="button" @click="setViewMode('recent')">查看全部</button></header>
        <div><button v-for="emoji in recent.slice(0, 12)" :key="emoji" type="button" :aria-label="`复制最近使用的 ${emoji}`" @click="copyEmoji(emoji)">{{ emoji }}</button></div>
      </div>

      <div class="result-heading"><div><span class="eyebrow">{{ viewMode === 'favorites' ? 'FAVORITES' : viewMode === 'recent' ? 'RECENT' : 'BROWSE' }}</span><h3>{{ viewMode === 'favorites' ? '我的收藏' : viewMode === 'recent' ? '最近使用' : activeCategory === 'all' ? '全部 Emoji' : categoryLabels[activeCategory] }}</h3></div><p>找到 {{ filtered.length }} 个结果 · 点击卡片复制，点击星标收藏</p></div>

      <div v-if="filtered.length" class="emoji-grid">
        <article v-for="item in visibleEmoji" :key="item.emoji" :class="{ favorite: favorites.includes(item.emoji) }">
          <button type="button" class="favorite-button" :aria-label="favorites.includes(item.emoji) ? `取消收藏 ${item.name}` : `收藏 ${item.name}`" @click="toggleFavorite(item.emoji)">{{ favorites.includes(item.emoji) ? '★' : '☆' }}</button>
          <button type="button" class="emoji-button" :aria-label="`复制 ${item.name} ${item.emoji}`" @click="copyEmoji(item.emoji)"><span>{{ item.emoji }}</span><strong>{{ item.name }}</strong><small>{{ emojiCode(item.emoji) }}</small></button>
        </article>
      </div>
      <div v-if="hasMore" class="load-more"><button type="button" @click="loadMore">再显示 {{ Math.min(PAGE_SIZE, filtered.length - visibleCount) }} 个</button><span>已显示 {{ visibleEmoji.length }} / {{ filtered.length }}</span></div>
      <div v-if="!filtered.length" class="empty-state"><span>{{ viewMode === 'favorites' ? '☆' : '⌕' }}</span><strong>{{ viewMode === 'favorites' ? '还没有收藏 Emoji' : '没有找到匹配结果' }}</strong><p>{{ viewMode === 'favorites' ? '浏览表情时点击右上角星标，常用 Emoji 会更容易找到。' : '尝试更短的中文关键词、切换全部分类，或搜索 Unicode 编码。' }}</p><button v-if="searchText || viewMode !== 'all'" type="button" @click="searchText = ''; setViewMode('all')">查看全部 Emoji</button></div>
    </section>

    <ToolGuide title="搜索、收藏与隐私说明">
      <div class="detail-grid"><article><strong>多维搜索</strong><p>支持中文名称、Emoji 字符、分类名称和 Unicode 编码；空格分隔的多个关键词需同时匹配。</p></article><article><strong>收藏与最近使用</strong><p>收藏最多保留 100 个，最近使用保留 24 个；两者均存放在当前浏览器的本地存储中。</p></article><article><strong>一键复制</strong><p>点击表情卡片即可复制，并自动进入最近使用。不同系统的 Emoji 字形可能略有差异。</p></article></div>
    </ToolGuide>
  </div>
</template>

<style scoped>
.emoji-page {
  --accent: #f97316;
  gap:18px
}
.browser-card {
  border: 1px solid var(--c-border);
  border-radius: var(--radius-card);
  background: var(--c-surface);
  box-shadow: var(--shadow-card)
}
.eyebrow {
  display: block;
  color: var(--accent);
  font-size: 12px;
  font-weight: 900;
  letter-spacing:.12em
}
.browser-card {
  padding:22px
}
.search-row {
  display: grid;
  grid-template-columns: minmax(280px,1fr) auto;
  gap: 14px;
  align-items:end
}
.search-row label>span {
  display: block;
  margin-bottom: 6px;
  color: var(--c-text-body);
  font-size: 12px;
  font-weight:850
}
.search-box {
  display: flex;
  height: 44px;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border: 1px solid #dbe3ef;
  border-radius: var(--radius-md);
  background: var(--c-surface-subtle)
}
.search-box>span {
  color: var(--c-text-muted);
  font-size:22px
}
.search-box input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: #1e293b;
  font-size:14px
}
.view-tabs {
  display: flex;
  gap: 6px;
  padding: 5px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface-subtle)
}
.view-tabs button {
  min-height: 34px;
  padding: 0 11px;
  border: 1px solid transparent;
  border-radius: var(--radius-xs);
  background: transparent;
  color: var(--c-text-secondary);
  font-size: 12px;
  font-weight: 800;
  cursor:pointer
}
.view-tabs button span {
  margin-left: 4px;
  color: var(--c-text-muted)
}
.view-tabs button.active {
  border-color: #fed7aa;
  background: var(--c-surface);
  color: #c2410c;
  box-shadow:0 3px 10px rgba(249,115,22,.1)
}
.category-rail {
  display: grid;
  grid-template-columns: repeat(10,minmax(0,1fr));
  gap: 7px;
  margin-top: 14px;
  overflow-x:auto
}
.category-rail button {
  position: relative;
  min-width: 86px;
  padding: 11px 7px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface-subtle);
  color: var(--c-text-secondary);
  text-align: center;
  cursor:pointer
}
.category-rail button>span,.category-rail button>strong {
  display:block
}
.category-rail button>span {
  font-size:23px
}
.category-rail button>strong {
  margin-top: 5px;
  font-size:12px
}
.category-rail button>em {
  position: absolute;
  top: 6px;
  right: 7px;
  color: var(--c-text-muted);
  font-size: 10px;
  font-style:normal
}
.category-rail button.active {
  border-color: #fdba74;
  background: #fff7ed;
  color: #c2410c;
  box-shadow:0 4px 12px rgba(249,115,22,.1)
}
.recent-strip {
  margin-top: 14px;
  padding: 12px;
  border: 1px solid #ffedd5;
  border-radius: var(--radius-md);
  background:#fffaf5
}
.recent-strip header {
  display: flex;
  align-items: center;
  justify-content:space-between
}
.recent-strip header strong,.recent-strip header span {
  display:block
}
.recent-strip header strong {
  color: #9a3412;
  font-size:13px
}
.recent-strip header span {
  margin-top: 2px;
  color: var(--c-text-muted);
  font-size:12px
}
.recent-strip header button {
  border: 0;
  background: transparent;
  color: #ea580c;
  font-size: 12px;
  font-weight: 850;
  cursor:pointer
}
.recent-strip>div {
  display: flex;
  gap: 7px;
  margin-top: 9px;
  overflow-x:auto
}
.recent-strip>div button {
  width: 42px;
  height: 42px;
  flex: none;
  border: 1px solid #fed7aa;
  border-radius: var(--radius-sm);
  background: var(--c-surface);
  font-size: 23px;
  cursor:pointer
}
.result-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin:20px 0 11px
}
.result-heading h3 {
  margin: 4px 0 0;
  color: var(--c-text-primary);
  font-size:19px
}
.result-heading p {
  margin: 0;
  color: var(--c-text-secondary);
  font-size:12px
}
.emoji-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill,minmax(104px,1fr));
  gap:8px
}
.emoji-grid article {
  position: relative;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface-subtle);
  transition:.16s
}
.emoji-grid article:hover {
  border-color: #fdba74;
  background: #fff7ed;
  transform: translateY(-2px);
  box-shadow:0 8px 18px rgba(249,115,22,.1)
}
.emoji-grid article.favorite {
  border-color:#fed7aa
}
.load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 7px;
  margin-top: 18px
}
.load-more button {
  padding: 10px 18px;
  border: 1px solid #fed7aa;
  border-radius: var(--radius-sm);
  background: #fff7ed;
  color: #c2410c;
  font-size: 13px;
  font-weight: 850;
  cursor: pointer
}
.load-more span {
  color: var(--c-text-muted);
  font-size: 11px
}
.favorite-button {
  position: absolute;
  z-index: 1;
  top: 5px;
  right: 6px;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: var(--radius-full);
  background: transparent;
  color: #f59e0b;
  font-size: 18px;
  cursor:pointer
}
.emoji-button {
  display: flex;
  width: 100%;
  min-height: 112px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 13px 7px 9px;
  border: 0;
  background: transparent;
  cursor:pointer
}
.emoji-button>span {
  font-size: 34px;
  line-height:1.2
}
.emoji-button strong {
  display: block;
  width: 100%;
  overflow: hidden;
  margin-top: 7px;
  color: var(--c-text-strong);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space:nowrap
}
.emoji-button small {
  display: block;
  width: 100%;
  overflow: hidden;
  margin-top: 3px;
  color: var(--c-text-muted);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space:nowrap
}
.empty-state {
  display: flex;
  min-height: 330px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  border: 1px dashed #fed7aa;
  border-radius: var(--radius-lg);
  background: #fffaf5;
  text-align:center
}
.empty-state>span {
  color: #fdba74;
  font-size:48px
}
.empty-state strong {
  margin-top: 8px;
  color: #9a3412;
  font-size:16px
}
.empty-state p {
  max-width: 440px;
  margin: 7px 20px 0;
  color: var(--c-text-secondary);
  font-size: 13px;
  line-height:1.7
}
.empty-state button {
  margin-top: 13px;
  padding: 9px 13px;
  border: 0;
  border-radius: var(--radius-sm);
  background: #f97316;
  color: var(--c-on-accent);
  font-size: 12px;
  font-weight: 850;
  cursor:pointer
}
.detail-grid {
  display: grid;
  grid-template-columns: repeat(3,1fr);
  gap:12px
}
.detail-grid article {
  padding: 14px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface-subtle)
}
.detail-grid strong {
  color: var(--c-text-strong);
  font-size:13px
}
.detail-grid p {
  margin: 5px 0 0;
  color: var(--c-text-secondary);
  font-size: 12px;
  line-height:1.7
}
:global(html.dark .browser-card) {
  border-color: var(--c-border);
  background: var(--c-surface);
  box-shadow:none
}
:global(html.dark .search-row label>span),:global(html.dark .result-heading h3),:global(html.dark .emoji-button strong),:global(html.dark .detail-grid strong) {
  color:#f1f5f9
}
:global(html.dark .result-heading p),:global(html.dark .emoji-button small),:global(html.dark .detail-grid p),:global(html.dark .empty-state p),:global(html.dark .recent-strip header span) {
  color: var(--c-text-muted)
}
:global(html.dark .search-box),:global(html.dark .view-tabs),:global(html.dark .category-rail button),:global(html.dark .emoji-grid article),:global(html.dark .detail-grid article) {
  border-color: var(--c-border);
  background:#172033
}
:global(html.dark .search-box input) {
  color: var(--c-text-primary)
}
:global(html.dark .view-tabs button.active) {
  border-color: #9a3412;
  background: #431407;
  color:#fdba74
}
:global(html.dark .category-rail button.active),:global(html.dark .emoji-grid article:hover) {
  border-color: #9a3412;
  background: #431407;
  color:#fdba74
}
:global(html.dark .load-more button) {
  border-color: #9a3412;
  background: #431407;
  color:#fdba74
}
:global(html.dark .recent-strip),:global(html.dark .empty-state) {
  border-color: #7c2d12;
  background:#2a160e
}
:global(html.dark .recent-strip>div button) {
  border-color: #7c2d12;
  background:#431407
}
:global(html.dark .recent-strip header strong),:global(html.dark .empty-state strong) {
  color:#fdba74
}
@media(max-width:1050px) {
  .category-rail {
    grid-template-columns:repeat(10,96px)
  }
  .search-row {
    grid-template-columns:1fr
  }
  .view-tabs {
    width:max-content
  }
}
@media(max-width:720px) {
  .emoji-page {
    gap:12px
  }
  .browser-card {
    border-radius:var(--radius-lg)
  }
  .browser-card {
    padding:15px
  }
  .view-tabs {
    width:100%
  }
  .view-tabs button {
    flex: 1;
    padding-inline:6px
  }
  .result-heading {
    align-items: flex-start;
    flex-direction:column
  }
  .emoji-grid {
    grid-template-columns:repeat(auto-fill,minmax(92px,1fr))
  }
  .detail-grid {
    grid-template-columns:1fr
  }
}
@media(max-width:430px) {
  .view-tabs button span {
    display:none
  }
  .emoji-grid {
    grid-template-columns: repeat(3,minmax(0,1fr));
    gap:6px
  }
  .emoji-button {
    min-height:106px
  }
  .emoji-button>span {
    font-size:30px
  }
}
</style>
