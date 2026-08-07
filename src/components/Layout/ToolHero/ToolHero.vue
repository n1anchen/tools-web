<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Setting, StarFilled } from '@element-plus/icons-vue'
import { Star, StarRegular } from '@vicons/fa'
import { Icon } from '@vicons/utils'
import { useRoute } from 'vue-router'
import ToolIcon from '@/components/Common/ToolIcon.vue'
import ToastNotification from '@/components/Common/ToastNotification.vue'
import { getTools } from '@/components/Tools/tools.ts'
import { useToolsStore } from '@/store/modules/tools'
import { rtrim } from '@/utils/string'

const props = withDefaults(defineProps<{
  title?: string
  eyebrow?: string
  summary?: string
  description?: string
}>(), {
  eyebrow: 'ONLINE TOOL STUDIO',
  summary: '',
  description: '',
})

const route = useRoute()
const toolsStore = useToolsStore()
const toast = ref(false)
const toastType = ref<'add' | 'remove'>('add')
const toastTimer = ref<ReturnType<typeof setTimeout> | null>(null)
// 以 tools.ts 为唯一数据源，按当前路由同步派生工具信息（标题/描述/图标/分类）
const toolInfo = computed(() => getTools({ cateId: 0, title: '', route: rtrim(route.path, '/') }))
const favorited = computed(() => toolsStore.isFavorite(toolInfo.value.url))
const resolvedDescription = computed(() => props.description || toolInfo.value.desc || '在线处理，简单高效')

function showToast(type: 'add' | 'remove') {
  if (toastTimer.value) clearTimeout(toastTimer.value)
  const show = () => {
    toastType.value = type
    toast.value = true
    toastTimer.value = setTimeout(() => { toast.value = false }, 3000)
  }
  if (toast.value) {
    toast.value = false
    setTimeout(() => nextTick(show), 350)
  } else {
    show()
  }
}

function toggleFavorite() {
  if (!toolInfo.value.url) return
  const wasFavorited = toolsStore.isFavorite(toolInfo.value.url)
  if (!toolsStore.toggleFavorite(toolInfo.value)) {
    ElMessage.error('收藏保存失败，请检查浏览器存储权限')
    return
  }
  showToast(wasFavorited ? 'remove' : 'add')
}

onBeforeUnmount(() => {
  if (toastTimer.value) clearTimeout(toastTimer.value)
})
</script>

<template>
  <section class="tool-hero">
    <div class="hero-copy">
      <div class="hero-head">
        <div class="hero-context">
          <div class="tool-icon">
            <ToolIcon v-if="toolInfo.logo" :logo="toolInfo.logo" :size="34" rounded="rounded" />
            <Setting v-else />
          </div>
          <div>
            <span class="eyebrow">{{ props.eyebrow }}</span>
            <span v-if="toolInfo.cate" class="category">{{ toolInfo.cate }}</span>
          </div>
        </div>
        <div class="hero-actions">
          <slot name="actions" />
        </div>
      </div>

      <div class="hero-title-row">
        <h1>{{ toolInfo.title || props.title }}</h1>
        <button
          v-if="toolInfo.url"
          class="favorite-button"
          :class="{ active: favorited }"
          :title="favorited ? '取消收藏' : '收藏此工具'"
          :aria-label="favorited ? '取消收藏' : '收藏工具'"
          @click="toggleFavorite"
        >
          <Icon size="15"><Star v-if="favorited" /><StarRegular v-else /></Icon>
          {{ favorited ? '已收藏' : '收藏工具' }}
        </button>
      </div>
      <strong v-if="props.summary" class="summary">{{ props.summary }}</strong>
      <p>{{ resolvedDescription }}</p>
    </div>

    <div v-if="$slots.metrics" class="hero-slot">
      <slot name="metrics" />
    </div>
  </section>

  <div class="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center">
    <ToastNotification v-model="toast" :icon-class="toastType === 'add' ? 'text-yellow-500' : 'text-slate-400'">
      <template #icon><el-icon class="text-base"><StarFilled /></el-icon></template>
      <template #title>{{ toastType === 'add' ? '收藏成功' : '已取消收藏' }}</template>
      <template #desc>{{ toastType === 'add' ? '可在首页的「收藏」分类中找到该工具' : '该工具已从收藏列表中移除' }}</template>
    </ToastNotification>
  </div>
</template>

<style scoped>
.tool-hero{position:relative;display:flex;align-items:stretch;justify-content:space-between;gap:26px;overflow:hidden;margin-bottom:14px;padding:22px 26px;border:1px solid #dbe5f1;border-radius:22px;background:linear-gradient(135deg,#eef7ff 0%,#f6f2ff 58%,#fff8ee 100%);box-shadow:0 12px 32px rgba(51,65,85,.06)}
.tool-hero::after{position:absolute;right:-70px;bottom:-90px;width:230px;height:230px;border-radius:50%;background:rgba(255,255,255,.45);content:'';filter:blur(4px)}
.hero-copy,.hero-slot{position:relative;z-index:1}.hero-copy{min-width:0;flex:1}.hero-head{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}.hero-context{display:flex;align-items:center;gap:11px}.tool-icon{display:grid;place-items:center;width:44px;height:44px;overflow:hidden;border:1px solid rgba(151,179,214,.45);border-radius:13px;background:rgba(255,255,255,.8);color:#3978f6;box-shadow:0 5px 15px rgba(65,105,160,.1)}.tool-icon>svg{width:20px}
.eyebrow,.category{font-size:12px;font-weight:800}.eyebrow{display:block;letter-spacing:.14em;color:#5076a7}.category{display:inline-block;margin-top:4px;padding:3px 8px;border:1px solid #cfe0f3;border-radius:999px;background:rgba(255,255,255,.65);color:#537294}
.hero-title-row{display:flex;align-items:center;gap:12px;margin-top:11px}.hero-title-row h1{margin:0;font-size:25px;font-weight:850;letter-spacing:-.02em;color:#263247}.hero-title-row .favorite-button{flex:none}.summary{display:block;margin-top:3px;font-size:15px;line-height:1.55;color:#3c4b61}.hero-copy p{max-width:680px;margin:5px 0 0;font-size:13.5px;line-height:1.7;color:#64748b}
.hero-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}.favorite-button{display:flex;align-items:center;gap:6px;padding:7px 11px;border:1px solid #cfdceb;border-radius:var(--radius-full);background:rgba(255,255,255,.75);font-size:12.5px;font-weight:700;color:#52637a;transition:.2s;white-space:nowrap}.favorite-button:hover{border-color:#91b5e8;color:#356eae}.favorite-button.active{border-color:#ecd28f;background:#fff8dc;color:#a26708}.favorite-button.active svg{color:#e5a400}
.hero-slot{display:flex;align-items:center;min-width:390px}.hero-slot>*{flex:1;width:100%}.dark .tool-hero{border-color:#334155;background:linear-gradient(135deg,#172c40,#241d3b 60%,#302619)}.dark .tool-hero::after{background:rgba(44,56,77,.28)}.dark h1,.dark .summary{color:#e7edf6!important}.dark .hero-copy p{color:#a8b4c5!important}.dark .tool-icon,.dark .category,.dark .favorite-button{border-color:#40516a!important;background:rgba(15,23,42,.55)!important;color:#c5d2e2!important}.dark .favorite-button.active{border-color:#78652c;background:#352e19;color:#f0c75e}
@media(max-width:1100px){.tool-hero{flex-direction:column}.hero-slot{min-width:0}}
@media(max-width:640px){.tool-hero{padding:18px 16px}.tool-icon{width:38px;height:38px}.hero-head{align-items:flex-start;flex-direction:column}.hero-actions{justify-content:flex-start;width:100%}.hero-title-row{flex-wrap:wrap;margin-top:10px}.hero-title-row h1{font-size:22px}.hero-title-row .favorite-button{width:100%;justify-content:center}.summary{font-size:14px}.hero-copy p{font-size:13px}.hero-slot{display:block}.hero-slot>*{width:auto}}
</style>
