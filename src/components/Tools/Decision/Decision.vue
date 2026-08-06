<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Aim, Clock, Collection, Delete, MagicStick, RefreshRight } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import SectionHeading from '@/components/Common/SectionHeading.vue'
import { parseDecisionOptions, pickDecision } from '@/utils/generators'

type PresetKey = 'food' | 'activity' | 'custom'

interface HistoryItem {
  id: number
  label: string
  optionCount: number
}

const presetOptions = [
  { key: 'food' as const, label: '今天吃什么' },
  { key: 'activity' as const, label: '现在做什么' },
  { key: 'custom' as const, label: '自定义选择' },
]
const presetContent: Record<Exclude<PresetKey, 'custom'>, string> = {
  food: '火锅 | 3\n烧烤 | 2\n小炒肉\n兰州拉面\n黄焖鸡\n螺蛳粉\n猪脚饭\n轻食沙拉',
  activity: '散步 | 2\n锻炼\n看电影\n听音乐\n阅读\n整理房间\n学习新技能\n早点休息',
}

const activePreset = ref<PresetKey>('food')
const scope = ref(presetContent.food)
const customScope = ref('方案 A\n方案 B\n方案 C')
const weightedMode = ref(false)
const excludeLast = ref(true)
const currentResult = ref('')
const lastFinalResult = ref('')
const choosing = ref(false)
const history = ref<HistoryItem[]>([])
let chooseInterval: ReturnType<typeof setInterval> | null = null

const parsedOptions = computed(() => {
  const options = parseDecisionOptions(scope.value)
  return weightedMode.value ? options : options.map(option => ({ ...option, weight: 1 }))
})
const visibleOptions = computed(() => parsedOptions.value.slice(0, 12))
const totalWeight = computed(() => parsedOptions.value.reduce((sum, option) => sum + option.weight, 0))

watch(scope, (value) => {
  if (activePreset.value === 'custom') customScope.value = value
})

function selectPreset(key: PresetKey) {
  activePreset.value = key
  scope.value = key === 'custom' ? customScope.value : presetContent[key]
  currentResult.value = ''
}

function finishChoice() {
  const result = pickDecision(
    parsedOptions.value,
    excludeLast.value ? lastFinalResult.value : '',
  )
  currentResult.value = result.label
  lastFinalResult.value = result.label
  history.value = [
    { id: Date.now(), label: result.label, optionCount: parsedOptions.value.length },
    ...history.value,
  ].slice(0, 8)
  choosing.value = false
}

function choose() {
  if (choosing.value) return
  if (!parsedOptions.value.length) {
    ElMessage.warning('请至少输入一个有效选项')
    return
  }

  choosing.value = true
  let tick = 0
  chooseInterval = setInterval(() => {
    currentResult.value = pickDecision(parsedOptions.value).label
    tick += 1
    if (tick >= 9) {
      if (chooseInterval) clearInterval(chooseInterval)
      chooseInterval = null
      finishChoice()
    }
  }, 55)
}

function clearAll() {
  if (chooseInterval) clearInterval(chooseInterval)
  chooseInterval = null
  activePreset.value = 'custom'
  customScope.value = ''
  scope.value = ''
  currentResult.value = ''
  lastFinalResult.value = ''
  history.value = []
  choosing.value = false
}

onMounted(() => {
  currentResult.value = '准备好了吗？'
})

onBeforeUnmount(() => {
  if (chooseInterval) clearInterval(chooseInterval)
})
</script>

<template>
  <div class="decision-page flex flex-col mt-3 flex-1">
    <ToolHero />

    <div class="workspace-grid">
      <section class="settings-card">
        <SectionHeading :icon="Collection" title="准备候选项" description="每行一个选项，也兼容逗号分隔" tone="pink" />

        <div class="preset-tabs">
          <button
            v-for="preset in presetOptions"
            :key="preset.key"
            type="button"
            :class="{ active: activePreset === preset.key }"
            @click="selectPreset(preset.key)"
          >
            {{ preset.label }}
          </button>
        </div>

        <label class="option-editor">
          <span>候选内容 <small>使用“选项 | 权重”可设置 1～100 的权重</small></span>
          <el-input
            v-model="scope"
            type="textarea"
            :rows="9"
            resize="none"
            placeholder="例如：\n方案 A | 3\n方案 B | 1\n方案 C | 2"
          />
        </label>

        <div class="option-preview">
          <div class="preview-header">
            <span>已识别 {{ parsedOptions.length }} 项</span>
            <small v-if="weightedMode">总权重 {{ totalWeight }}</small>
          </div>
          <div v-if="visibleOptions.length" class="option-chips">
            <span v-for="option in visibleOptions" :key="`${option.label}-${option.weight}`">
              {{ option.label }}<b v-if="weightedMode">×{{ option.weight }}</b>
            </span>
            <span v-if="parsedOptions.length > visibleOptions.length" class="more-chip">+{{ parsedOptions.length - visibleOptions.length }}</span>
          </div>
          <div v-else class="empty-preview">输入候选项后会在这里预览</div>
        </div>

        <div class="setting-row">
          <div><strong>启用权重</strong><small>权重越大，被选中的概率越高</small></div>
          <el-switch v-model="weightedMode" />
        </div>
        <div class="setting-row">
          <div><strong>避开上次结果</strong><small>有多个选项时，不连续得到相同结果</small></div>
          <el-switch v-model="excludeLast" />
        </div>
      </section>

      <section class="decision-card">
        <span class="eyebrow">THE CHOICE IS</span>
        <div class="decision-orbit" :class="{ spinning: choosing }">
          <div class="orbit-ring" />
          <div class="decision-icon"><el-icon><Aim /></el-icon></div>
        </div>
        <div class="decision-result" :class="{ choosing }">{{ currentResult || '等待选择' }}</div>
        <p v-if="choosing">正在公平抽取候选项…</p>
        <p v-else>{{ parsedOptions.length }} 个候选项{{ weightedMode ? ' · 已启用权重' : ' · 等概率选择' }}</p>

        <el-button type="primary" size="large" :icon="MagicStick" :loading="choosing" :disabled="!parsedOptions.length" @click="choose">
          {{ choosing ? '决定中' : '帮我决定' }}
        </el-button>
        <div class="secondary-actions">
          <el-button :icon="RefreshRight" :disabled="choosing || !parsedOptions.length" @click="choose">再选一次</el-button>
          <el-button :icon="Delete" :disabled="choosing" @click="clearAll">全部清空</el-button>
        </div>
        <div class="local-note">所有选择均在本机完成，不会保存或上传内容</div>
      </section>
    </div>

    <section v-if="history.length" class="history-card">
      <SectionHeading :icon="Clock" title="选择历史" description="按最近顺序保留 8 次结果" tone="green">
        <template #actions>
          <button type="button" class="clear-history" @click="history = []">清空历史</button>
        </template>
      </SectionHeading>
      <div class="history-list">
        <div v-for="(item, index) in history" :key="item.id">
          <span>{{ index + 1 }}</span>
          <strong>{{ item.label }}</strong>
          <small>从 {{ item.optionCount }} 项中选出</small>
        </div>
      </div>
    </section>

    <ToolGuide title="权重与随机说明">
      <div class="guide-grid">
        <div><strong>普通模式</strong><span>每个候选项机会相同，适合抽签、轮值和日常选择。</span></div>
        <div><strong>权重模式</strong><span>写成“火锅 | 3”表示它的机会是权重 1 选项的三倍。</span></div>
        <div><strong>避免连续重复</strong><span>开启后仅排除上一次最终结果，不影响其他选项原有权重。</span></div>
      </div>
    </ToolGuide>
  </div>
</template>

<style scoped>
.decision-page { gap: 18px; }
.workspace-grid { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(320px, .8fr); gap: 18px; }
.settings-card, .decision-card, .history-card {padding: 24px}
.setting-row {display: flex; align-items: center;}

.preset-tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; margin-top: 21px; padding: 4px; border-radius: 12px; background: #f1f5f9; }
.preset-tabs button { padding: 9px 7px; border-radius: 9px; color: #64748b; font-size: 12px; }
.preset-tabs button.active { color: #be185d; background: #fff; box-shadow: 0 2px 8px rgba(15, 23, 42, .08); font-weight: 650; }
.option-editor { display: block; margin-top: 17px; }
.option-editor > span { display: flex; justify-content: space-between; margin-bottom: 8px; color: #334155; font-size: 13px; font-weight: 650; }
.option-editor small { color: #94a3b8; font-weight: 400; }
.option-editor :deep(textarea) { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; line-height: 1.75; }
.option-preview { margin-top: 13px; padding: 13px; border-radius: 13px; background: #f8fafc; }
.preview-header { display: flex; justify-content: space-between; color: #64748b; font-size: 11px; }
.option-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 9px; }
.option-chips > span { padding: 5px 8px; border: 1px solid #fbcfe8; border-radius: 7px; color: #9d174d; background: #fdf2f8; font-size: 11px; }
.option-chips b { margin-left: 4px; color: #db2777; }
.option-chips .more-chip { border-color: #e2e8f0; color: #64748b; background: #fff; }
.empty-preview { padding: 12px 0 3px; color: #94a3b8; font-size: 12px; text-align: center; }
.setting-row { justify-content: space-between; gap: 15px; margin-top: 11px; padding: 11px 2px 0; }
.setting-row + .setting-row { margin-top: 9px; border-top: 1px solid #f1f5f9; }
.setting-row strong, .setting-row small { display: block; }
.setting-row strong { color: #334155; font-size: 13px; }
.setting-row small { margin-top: 2px; color: #94a3b8; font-size: 11px; }
.decision-card { display: flex; min-height: 100%; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; text-align: center; background: radial-gradient(circle at 50% 28%, #fdf2f8, #fff 55%); }
.eyebrow { color: #db2777; font-size: 10px; font-weight: 800; letter-spacing: .24em; }
.decision-orbit { position: relative; display: grid; width: 104px; height: 104px; margin-top: 19px; place-items: center; }
.orbit-ring { position: absolute; inset: 0; border: 1px dashed #f9a8d4; border-radius: 50%; }
.decision-orbit::after { position: absolute; top: -3px; width: 9px; height: 9px; border-radius: 50%; background: #ec4899; box-shadow: 0 0 0 5px #fce7f3; content: ''; }
.decision-orbit.spinning { animation: orbit-spin .55s linear infinite; }
@keyframes orbit-spin { to { transform: rotate(360deg); } }
.decision-icon { display: grid; width: 62px; height: 62px; place-items: center; border-radius: 20px; color: #db2777; background: #fce7f3; font-size: 28px; box-shadow: 0 12px 25px rgba(219, 39, 119, .14); }
.decision-result { max-width: 100%; min-height: 64px; margin-top: 24px; overflow: hidden; color: #0f172a; font-size: clamp(28px, 4vw, 42px); font-weight: 800; line-height: 1.5; text-overflow: ellipsis; white-space: nowrap; }
.decision-result.choosing { color: #db2777; transform: scale(.96); }
.decision-card > p { margin: 2px 0 23px; color: #94a3b8; font-size: 12px; }
.decision-card > .el-button { min-width: 190px; }
.secondary-actions { display: flex; margin-top: 10px; }
.local-note { margin-top: 24px; color: #94a3b8; font-size: 10px; }
.clear-history { color: #64748b; font-size: 12px; }
.history-list { display: grid; grid-template-columns: repeat(4, 1fr); gap: 9px; margin-top: 18px; }
.history-list > div { display: grid; grid-template-columns: 22px minmax(0, 1fr); align-items: center; gap: 2px 8px; padding: 12px; border-radius: 12px; background: #f8fafc; }
.history-list span { grid-row: span 2; color: #f9a8d4; font-size: 11px; }
.history-list strong { overflow: hidden; color: #334155; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.history-list small { color: #94a3b8; font-size: 10px; }
.guide-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.guide-grid div { padding: 14px; border-radius: 13px; background: #f8fafc; }
.guide-grid strong, .guide-grid span { display: block; }
.guide-grid strong { color: #334155; font-size: 13px; }
.guide-grid span { margin-top: 5px; color: #64748b; font-size: 12px; line-height: 1.65; }
:global(html.dark .decision-page .settings-card), :global(html.dark .decision-page .decision-card), :global(html.dark .decision-page .history-card) { border-color: #334155; background: #1e293b; box-shadow: none; }
:global(html.dark .decision-page .decision-card) { background: radial-gradient(circle at 50% 28%, rgba(131, 24, 67, .25), #1e293b 58%); }
:global(html.dark .decision-page .option-editor > span), :global(html.dark .decision-page .setting-row strong), :global(html.dark .decision-page .decision-result), :global(html.dark .decision-page .history-list strong), :global(html.dark .decision-page .guide-grid strong) { color: #e2e8f0; }
:global(html.dark .decision-page .preset-tabs), :global(html.dark .decision-page .option-preview), :global(html.dark .decision-page .history-list > div), :global(html.dark .decision-page .guide-grid div) { background: #0f172a; }
:global(html.dark .decision-page .preset-tabs button.active) { color: #f9a8d4; background: #334155; }
:global(html.dark .decision-page .setting-row + .setting-row) { border-color: #334155; }@media (max-width: 900px) { .workspace-grid { grid-template-columns: 1fr; } .decision-card { min-height: 470px; } .history-list { grid-template-columns: repeat(2, 1fr); }}@media (max-width: 640px) { .settings-card, .decision-card, .history-card { padding: 18px; } .preset-tabs { grid-template-columns: 1fr; } .option-editor > span { align-items: flex-start; flex-direction: column; gap: 3px; } .history-list, .guide-grid { grid-template-columns: 1fr; }}</style>
