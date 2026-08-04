<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { CopyDocument, DataAnalysis, Delete, Filter, Search, TrendCharts } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import { copy } from '@/utils/string'
import { analyzeWordFrequency } from '@/utils/textTools'

const inputText = ref('')
const customStopWords = ref('')
const searchQuery = ref('')
const analyzed = ref(false)
const options = reactive({
  minLength: 1,
  caseSensitive: false,
  excludeStopWords: true,
  topLimit: 50,
})

const customStopWordList = computed(() => customStopWords.value.split(/[\s,，]+/).map(word => word.trim()).filter(Boolean))
const result = computed(() => analyzed.value
  ? analyzeWordFrequency(inputText.value, {
      minLength: options.minLength,
      caseSensitive: options.caseSensitive,
      excludeStopWords: options.excludeStopWords,
      customStopWords: customStopWordList.value,
    })
  : { items: [], totalWords: 0, uniqueWords: 0, diversity: 0 })
const filteredItems = computed(() => result.value.items
  .filter(item => !searchQuery.value || item.word.toLocaleLowerCase().includes(searchQuery.value.toLocaleLowerCase()))
  .slice(0, options.topLimit))
const chartItems = computed(() => result.value.items.slice(0, 10))
const maximumCount = computed(() => chartItems.value[0]?.count ?? 1)

const sampleText = `数据分析让复杂信息变得清晰。好的数据分析不仅关注数据，也关注业务问题和用户需求。
Data tools help teams understand data, discover patterns, and make better decisions with data.`

function analyze() {
  if (!inputText.value.trim()) {
    ElMessage.warning('请先输入需要分析的文本')
    return
  }
  analyzed.value = true
  searchQuery.value = ''
}

function loadSample() {
  inputText.value = sampleText
  analyzed.value = true
}

function clearAll() {
  inputText.value = ''
  customStopWords.value = ''
  searchQuery.value = ''
  analyzed.value = false
}

function copyAll() {
  copy(filteredItems.value.map(item => `${item.word}\t${item.count}\t${item.percentage.toFixed(2)}%`).join('\n'))
}
</script>

<template>
  <div class="frequency-page flex flex-col mt-3 flex-1">
    <ToolHero />

    <section class="workspace-card">
      <div class="workspace-header">
        <div class="section-heading">
          <div class="heading-icon"><el-icon><DataAnalysis /></el-icon></div>
          <div>
            <h2>输入分析文本</h2>
            <p>使用浏览器智能分词，同时识别中文词语和英文单词</p>
          </div>
        </div>
        <div>
          <el-button text @click="loadSample">载入示例</el-button>
          <el-button text :icon="Delete" :disabled="!inputText" @click="clearAll">清空</el-button>
        </div>
      </div>

      <el-input
        v-model="inputText"
        type="textarea"
        :rows="9"
        resize="none"
        placeholder="粘贴文章、评论、调研记录或其他需要提取高频词的文本"
      />

      <div class="analysis-settings">
        <label>
          <span>最短词长</span>
          <el-input-number v-model="options.minLength" :min="1" :max="10" controls-position="right" />
        </label>
        <label>
          <span>显示数量</span>
          <el-select v-model="options.topLimit">
            <el-option :value="20" label="前 20 个" />
            <el-option :value="50" label="前 50 个" />
            <el-option :value="100" label="前 100 个" />
            <el-option :value="200" label="前 200 个" />
          </el-select>
        </label>
        <div class="check-options">
          <el-checkbox v-model="options.caseSensitive">区分英文大小写</el-checkbox>
          <el-checkbox v-model="options.excludeStopWords">过滤常用停用词</el-checkbox>
        </div>
        <el-button type="primary" size="large" :icon="TrendCharts" @click="analyze">开始统计</el-button>
      </div>

      <label class="stop-word-field">
        <span>自定义停用词 <small>可选，用逗号或空格分隔</small></span>
        <el-input v-model="customStopWords" clearable placeholder="例如：产品，公司，我们" />
      </label>
    </section>

    <template v-if="analyzed">
      <section class="metric-grid">
        <div><span>有效词数</span><strong>{{ result.totalWords }}</strong><small>过滤后参与统计</small></div>
        <div><span>不同词语</span><strong>{{ result.uniqueWords }}</strong><small>去重后的词语数</small></div>
        <div><span>词汇丰富度</span><strong>{{ result.diversity.toFixed(1) }}%</strong><small>不同词语 / 总词数</small></div>
        <div><span>最高频词</span><strong>{{ result.items[0]?.word || '—' }}</strong><small>{{ result.items[0]?.count || 0 }} 次</small></div>
      </section>

      <div v-if="result.items.length" class="result-grid">
        <section class="chart-card">
          <div class="section-heading">
            <div class="heading-icon violet"><el-icon><TrendCharts /></el-icon></div>
            <div><h2>高频词概览</h2><p>按出现次数展示前 10 个词语</p></div>
          </div>
          <div class="bar-chart">
            <div v-for="(item, index) in chartItems" :key="item.word" class="bar-row">
              <span>{{ index + 1 }}</span>
              <strong :title="item.word">{{ item.word }}</strong>
              <div><i :style="{ width: `${item.count / maximumCount * 100}%` }" /></div>
              <b>{{ item.count }}</b>
            </div>
          </div>
        </section>

        <section class="ranking-card">
          <div class="ranking-header">
            <div class="section-heading">
              <div class="heading-icon green"><el-icon><Filter /></el-icon></div>
              <div><h2>完整排行</h2><p>当前显示 {{ filteredItems.length }} 个词语</p></div>
            </div>
            <el-button :icon="CopyDocument" :disabled="!filteredItems.length" @click="copyAll">复制表格</el-button>
          </div>

          <el-input v-model="searchQuery" class="ranking-search" clearable placeholder="在统计结果中搜索词语">
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>

          <div class="ranking-table">
            <div class="table-head"><span>#</span><span>词语</span><span>频次</span><span>占比</span><span /></div>
            <button v-for="(item, index) in filteredItems" :key="item.word" type="button" @click="copy(item.word)">
              <span>{{ index + 1 }}</span>
              <strong>{{ item.word }}</strong>
              <b>{{ item.count }}</b>
              <span>{{ item.percentage.toFixed(2) }}%</span>
              <el-icon><CopyDocument /></el-icon>
            </button>
            <div v-if="!filteredItems.length" class="empty-filter">没有符合搜索条件的词语</div>
          </div>
        </section>
      </div>

      <section v-else class="empty-card">
        <el-icon><Search /></el-icon>
        <strong>没有找到符合条件的词语</strong>
        <span>可以降低最短词长、关闭停用词过滤或调整自定义停用词。</span>
      </section>
    </template>

    <ToolGuide title="统计规则">
      <div class="guide-grid">
        <div><strong>智能中英文分词</strong><span>中文按词语边界切分，英文按单词处理，数字和字母组合会保留。</span></div>
        <div><strong>停用词过滤</strong><span>可排除“的、是、and、the”等高频但信息量较低的常用词。</span></div>
        <div><strong>词汇丰富度</strong><span>不同词语数除以有效词数，可作为文本用词多样性的简单参考。</span></div>
      </div>
    </ToolGuide>
  </div>
</template>

<style scoped>
.frequency-page { gap: 18px; }
.workspace-card, .metric-grid > div, .chart-card, .ranking-card, .empty-card { border: 1px solid #e2e8f0; border-radius: 20px; background: #fff; box-shadow: 0 12px 32px rgba(15, 23, 42, .05); }
.workspace-card, .chart-card, .ranking-card, .empty-card { padding: 24px; }
.workspace-header, .section-heading, .analysis-settings, .ranking-header { display: flex; align-items: center; }
.workspace-header, .ranking-header { justify-content: space-between; gap: 18px; }
.section-heading { gap: 12px; }
.heading-icon { display: grid; width: 42px; height: 42px; flex: 0 0 42px; place-items: center; border-radius: 13px; color: #2563eb; background: #eff6ff; font-size: 20px; }
.heading-icon.violet { color: #7c3aed; background: #f5f3ff; } .heading-icon.green { color: #059669; background: #ecfdf5; }
.section-heading h2 { margin: 0; color: #0f172a; font-size: 18px; }
.section-heading p { margin: 3px 0 0; color: #64748b; font-size: 13px; }
.workspace-card > :deep(.el-textarea) { margin-top: 20px; }
.workspace-card :deep(.el-textarea__inner) { font: 13px/1.75 ui-monospace, SFMono-Regular, Menlo, monospace; }
.analysis-settings { gap: 14px; margin-top: 16px; padding: 15px; border-radius: 14px; background: #f8fafc; }
.analysis-settings label { width: 140px; }
.analysis-settings label > span, .stop-word-field > span { display: block; margin-bottom: 7px; color: #475569; font-size: 12px; font-weight: 650; }
.analysis-settings :deep(.el-input-number), .analysis-settings :deep(.el-select) { width: 100%; }
.check-options { display: flex; min-width: 0; flex: 1; gap: 12px; }
.stop-word-field { display: block; margin-top: 14px; }
.stop-word-field small { color: #94a3b8; font-weight: 400; }
.metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.metric-grid > div { padding: 18px 20px; }
.metric-grid span, .metric-grid strong, .metric-grid small { display: block; }
.metric-grid span { color: #64748b; font-size: 11px; }
.metric-grid strong { overflow: hidden; margin-top: 5px; color: #0f172a; font-size: 22px; text-overflow: ellipsis; white-space: nowrap; }
.metric-grid small { margin-top: 3px; color: #94a3b8; font-size: 10px; }
.result-grid { display: grid; grid-template-columns: minmax(300px, .8fr) minmax(0, 1.2fr); gap: 18px; }
.bar-chart { display: grid; gap: 12px; margin-top: 22px; }
.bar-row { display: grid; grid-template-columns: 20px 90px minmax(70px, 1fr) 32px; align-items: center; gap: 8px; }
.bar-row > span { color: #c4b5fd; font-size: 10px; }
.bar-row > strong { overflow: hidden; color: #334155; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.bar-row > div { height: 8px; overflow: hidden; border-radius: 999px; background: #ede9fe; }
.bar-row i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #8b5cf6, #c084fc); }
.bar-row b { color: #7c3aed; font-size: 12px; text-align: right; }
.ranking-search { margin-top: 18px; }
.ranking-table { max-height: 510px; margin-top: 12px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 13px; }
.table-head, .ranking-table > button { display: grid; grid-template-columns: 35px minmax(100px, 1fr) 65px 70px 20px; align-items: center; gap: 9px; padding: 10px 12px; text-align: left; }
.table-head { position: sticky; z-index: 1; top: 0; color: #94a3b8; background: #f8fafc; font-size: 10px; }
.ranking-table > button { width: 100%; border-top: 1px solid #eef2f7; color: #64748b; background: #fff; font-size: 11px; }
.ranking-table > button:hover { color: #059669; background: #f0fdf4; }
.ranking-table strong { overflow: hidden; color: #334155; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.ranking-table b { color: #059669; font-size: 13px; }
.empty-filter { padding: 30px; color: #94a3b8; font-size: 12px; text-align: center; }
.empty-card { display: flex; min-height: 180px; flex-direction: column; align-items: center; justify-content: center; color: #94a3b8; text-align: center; }
.empty-card .el-icon { font-size: 30px; } .empty-card strong { margin-top: 10px; color: #475569; } .empty-card span { margin-top: 5px; font-size: 12px; }
.guide-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.guide-grid div { padding: 14px; border-radius: 13px; background: #f8fafc; }
.guide-grid strong, .guide-grid span { display: block; }
.guide-grid strong { color: #334155; font-size: 13px; }
.guide-grid span { margin-top: 5px; color: #64748b; font-size: 12px; line-height: 1.65; }
:global(html.dark .frequency-page .workspace-card), :global(html.dark .frequency-page .metric-grid > div), :global(html.dark .frequency-page .chart-card), :global(html.dark .frequency-page .ranking-card), :global(html.dark .frequency-page .empty-card) { border-color: #334155; background: #1e293b; box-shadow: none; }
:global(html.dark .frequency-page .section-heading h2), :global(html.dark .frequency-page .analysis-settings label > span), :global(html.dark .frequency-page .stop-word-field > span), :global(html.dark .frequency-page .metric-grid strong), :global(html.dark .frequency-page .bar-row > strong), :global(html.dark .frequency-page .ranking-table strong), :global(html.dark .frequency-page .guide-grid strong) { color: #e2e8f0; }
:global(html.dark .frequency-page .analysis-settings), :global(html.dark .frequency-page .guide-grid div), :global(html.dark .frequency-page .table-head) { background: #0f172a; }
:global(html.dark .frequency-page .ranking-table) { border-color: #334155; }
:global(html.dark .frequency-page .ranking-table > button) { border-color: #334155; background: #111c2f; }
@media (max-width: 960px) { .analysis-settings { display: grid; grid-template-columns: repeat(2, 1fr); } .analysis-settings label { width: auto; } .check-options { align-items: flex-start; flex-direction: column; gap: 0; } .result-grid { grid-template-columns: 1fr; } }
@media (max-width: 640px) { .workspace-card, .chart-card, .ranking-card { padding: 18px; } .workspace-header, .ranking-header { align-items: flex-start; flex-direction: column; } .analysis-settings, .metric-grid { grid-template-columns: 1fr 1fr; } .analysis-settings > .el-button, .check-options { grid-column: span 2; } .metric-grid > div { padding: 15px; } .bar-row { grid-template-columns: 18px 70px minmax(60px, 1fr) 28px; } .table-head, .ranking-table > button { grid-template-columns: 28px minmax(80px, 1fr) 45px 18px; } .table-head span:nth-child(4), .ranking-table > button > span:nth-child(4) { display: none; } .guide-grid { grid-template-columns: 1fr; } }
</style>
