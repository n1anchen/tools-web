<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { CopyDocument, Download, MagicStick, RefreshLeft, Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { format, type IndentStyle, type KeywordCase, type LogicalOperatorNewline, type SqlLanguage } from 'sql-formatter'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import AceEditor from '@/components/Common/AceEditor.vue'
import { copy } from '@/utils/string'
import { countSqlStatements, minifySqlSafely } from '@/utils/workbenchTools'

const defaultSql = `SELECT u.id, u.name, COUNT(o.id) AS order_count, SUM(o.total) AS revenue
FROM users u
LEFT JOIN orders o ON o.user_id = u.id AND o.status = 'paid  order'
WHERE u.created_at >= '2026-01-01' AND u.status = 'active'
GROUP BY u.id, u.name
HAVING COUNT(o.id) > 2
ORDER BY revenue DESC;`

const info = reactive({
  code: defaultSql,
  showWhitespace: false,
  showLineNumbers: true,
  wordWrap: true,
})

const options = reactive({
  dialect: 'sql' as SqlLanguage,
  keywordCase: 'upper' as KeywordCase,
  tabWidth: 2,
  useTabs: false,
  indentStyle: 'standard' as IndentStyle,
  logicalOperatorNewline: 'before' as LogicalOperatorNewline,
  expressionWidth: 50,
  linesBetweenQueries: 1,
  denseOperators: false,
})

const aceEditorRef = ref<InstanceType<typeof AceEditor>>()
const lastOriginal = ref('')
const lastAction = ref('等待处理')
const lastError = ref('')

const dialects: Array<{ label: string; value: SqlLanguage; badge: string }> = [
  { label: 'Standard SQL', value: 'sql', badge: 'ANSI' },
  { label: 'MySQL', value: 'mysql', badge: 'MySQL' },
  { label: 'PostgreSQL', value: 'postgresql', badge: 'PG' },
  { label: 'SQLite', value: 'sqlite', badge: 'SQLite' },
  { label: 'T-SQL / SQL Server', value: 'transactsql', badge: 'T-SQL' },
  { label: 'BigQuery', value: 'bigquery', badge: 'BQ' },
]

const samples = [
  { label: '聚合查询', dialect: 'sql' as SqlLanguage, code: defaultSql },
  { label: '窗口函数', dialect: 'postgresql' as SqlLanguage, code: `SELECT department, employee, salary, RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS salary_rank FROM payroll WHERE period = '2026-07';` },
  { label: 'CTE 分页', dialect: 'transactsql' as SqlLanguage, code: `WITH ranked AS (SELECT id, title, ROW_NUMBER() OVER (ORDER BY created_at DESC) AS row_num FROM articles WHERE status = 'published') SELECT id, title FROM ranked WHERE row_num BETWEEN 21 AND 40;` },
  { label: 'JSON 字段', dialect: 'postgresql' as SqlLanguage, code: `SELECT id, payload->>'name' AS name FROM events WHERE payload @> '{"active": true}'::jsonb AND created_at > NOW() - INTERVAL '7 days';` },
]

const currentDialect = computed(() => dialects.find(item => item.value === options.dialect)!)
const stats = computed(() => ({
  characters: info.code.length,
  lines: info.code ? info.code.split('\n').length : 0,
  statements: countSqlStatements(info.code),
  bytes: new TextEncoder().encode(info.code).length,
}))
const changedRatio = computed(() => {
  if (!lastOriginal.value.length) return 0
  return Math.round((info.code.length - lastOriginal.value.length) / lastOriginal.value.length * 100)
})

function getCode() {
  return aceEditorRef.value?.getValue() || info.code
}

function setCode(value: string) {
  info.code = value
  aceEditorRef.value?.setValue(value)
}

function formatSql() {
  const source = getCode()
  if (!source.trim()) {
    ElMessage.warning('请输入 SQL 内容')
    return
  }
  try {
    const result = format(source, {
      language: options.dialect,
      keywordCase: options.keywordCase,
      tabWidth: options.tabWidth,
      useTabs: options.useTabs,
      indentStyle: options.indentStyle,
      logicalOperatorNewline: options.logicalOperatorNewline,
      expressionWidth: options.expressionWidth,
      linesBetweenQueries: options.linesBetweenQueries,
      denseOperators: options.denseOperators,
    })
    lastOriginal.value = source
    lastAction.value = '格式化完成'
    lastError.value = ''
    setCode(result)
  } catch (error) {
    lastError.value = error instanceof Error ? error.message : '无法解析 SQL'
    lastAction.value = '格式化失败'
  }
}

function minifySql() {
  const source = getCode()
  if (!source.trim()) {
    ElMessage.warning('请输入 SQL 内容')
    return
  }
  lastOriginal.value = source
  lastAction.value = '安全压缩完成'
  lastError.value = ''
  setCode(minifySqlSafely(source))
}

function restoreOriginal() {
  if (!lastOriginal.value) return
  const current = getCode()
  setCode(lastOriginal.value)
  lastOriginal.value = current
  lastAction.value = '已撤回上次处理'
  lastError.value = ''
}

function loadSample(sample: typeof samples[number]) {
  options.dialect = sample.dialect
  lastOriginal.value = ''
  lastAction.value = `已载入${sample.label}`
  lastError.value = ''
  setCode(sample.code)
}

function clear() {
  lastOriginal.value = getCode()
  lastAction.value = '已清空'
  lastError.value = ''
  setCode('')
}

function downloadSql() {
  const code = getCode()
  if (!code) return
  const url = URL.createObjectURL(new Blob([code], { type: 'text/sql;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `formatted-${options.dialect}.sql`
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="sql-page flex flex-col mt-3 flex-1">
    <DetailHeader title="SQL 格式化" />

    <section class="hero-card">
      <div><span class="eyebrow">SQL WORKBENCH</span><h2>从一行查询，到清晰可审阅的 SQL</h2><p>选择方言与排版规则，格式化、保守压缩、撤回和导出都在同一个工作台完成。</p></div>
      <div class="hero-dialect"><span>当前方言</span><strong>{{ currentDialect.label }}</strong><small>{{ currentDialect.badge }}</small></div>
    </section>

    <section class="sample-card"><span>载入示例</span><button v-for="sample in samples" :key="sample.label" @click="loadSample(sample)"><strong>{{ sample.label }}</strong><small>{{ dialects.find(item => item.value === sample.dialect)?.badge }}</small></button></section>

    <section class="workspace">
      <article class="editor-card">
        <div class="editor-toolbar">
          <div><span class="status-dot" :class="{ error: lastError }"><i />{{ lastAction }}</span><small v-if="lastOriginal">长度变化 {{ changedRatio > 0 ? '+' : '' }}{{ changedRatio }}%</small></div>
          <div class="toolbar-actions"><el-button :icon="RefreshLeft" :disabled="!lastOriginal" @click="restoreOriginal">撤回</el-button><el-button :icon="CopyDocument" @click="copy(getCode())">复制</el-button><el-button :icon="Download" @click="downloadSql">导出</el-button></div>
        </div>
        <AceEditor ref="aceEditorRef" v-model="info.code" mode="sql" :show-whitespace="info.showWhitespace" :show-line-numbers="info.showLineNumbers" :word-wrap="info.wordWrap" height="510px" />
        <div v-if="lastError" class="error-panel"><strong>格式化失败</strong><code>{{ lastError }}</code><span>请检查括号、引号、方言专属语法或未完成的语句。</span></div>
        <div class="editor-footer"><div><span>{{ stats.lines }} 行</span><span>{{ stats.characters }} 字符</span><span>{{ stats.statements }} 条语句</span><span>{{ stats.bytes }} Bytes</span></div><div><button :class="{ active: info.showLineNumbers }" @click="info.showLineNumbers = !info.showLineNumbers">行号</button><button :class="{ active: info.wordWrap }" @click="info.wordWrap = !info.wordWrap">换行</button><button :class="{ active: info.showWhitespace }" @click="info.showWhitespace = !info.showWhitespace">空白</button><button @click="aceEditorRef?.openSearchBox()"><el-icon><Search /></el-icon>搜索</button></div></div>
      </article>

      <aside class="settings-card">
        <div class="section-heading"><div><span class="eyebrow">FORMAT RULES</span><h3>排版设置</h3></div><span>{{ currentDialect.badge }}</span></div>
        <div class="settings-list">
          <label><span>SQL 方言</span><el-select v-model="options.dialect"><el-option v-for="item in dialects" :key="item.value" :label="item.label" :value="item.value" /></el-select></label>
          <label><span>关键字大小写</span><el-select v-model="options.keywordCase"><el-option label="大写 SELECT" value="upper" /><el-option label="小写 select" value="lower" /><el-option label="保持原样" value="preserve" /></el-select></label>
          <div class="split-settings"><label><span>缩进宽度</span><el-input-number v-model="options.tabWidth" :min="1" :max="8" /></label><label><span>语句间空行</span><el-input-number v-model="options.linesBetweenQueries" :min="0" :max="5" /></label></div>
          <label><span>缩进风格</span><el-select v-model="options.indentStyle"><el-option label="标准缩进" value="standard" /><el-option label="表格式 · 左对齐" value="tabularLeft" /><el-option label="表格式 · 右对齐" value="tabularRight" /></el-select></label>
          <label><span>AND / OR 换行位置</span><el-radio-group v-model="options.logicalOperatorNewline"><el-radio-button value="before">运算符在行首</el-radio-button><el-radio-button value="after">运算符在行尾</el-radio-button></el-radio-group></label>
          <label><span>表达式换行宽度 <b>{{ options.expressionWidth }}</b></span><el-slider v-model="options.expressionWidth" :min="20" :max="120" :step="5" /></label>
          <div class="switch-row"><span>使用 Tab 缩进</span><el-switch v-model="options.useTabs" /></div><div class="switch-row"><span>紧凑运算符</span><el-switch v-model="options.denseOperators" /></div>
        </div>
        <div class="primary-actions"><el-button type="primary" :icon="MagicStick" @click="formatSql">格式化 SQL</el-button><el-button @click="minifySql">安全压缩</el-button><el-button link type="danger" @click="clear">清空</el-button></div>
        <p>安全压缩只合并 SQL 结构外的连续空白，字符串、引号标识符和注释内容会保持原样。</p>
      </aside>
    </section>

    <section class="stat-strip"><div><span>方言</span><strong>{{ currentDialect.badge }}</strong></div><div><span>语句</span><strong>{{ stats.statements }}</strong></div><div><span>行数</span><strong>{{ stats.lines }}</strong></div><div><span>字符</span><strong>{{ stats.characters }}</strong></div><div><span>上次操作</span><strong>{{ lastAction }}</strong></div></section>

    <ToolDetail title="使用说明"><el-text>格式化由当前选择的 SQL 方言和排版参数驱动；如果语法不完整，错误会直接显示在编辑器下方。安全压缩采用保守策略，不删除注释，也不会改写单引号字符串、双引号标识符、反引号、方括号标识符或 PostgreSQL Dollar-quoted 字符串。</el-text></ToolDetail>
  </div>
</template>

<style scoped>
.sql-page { --blue: #2563eb; gap: 16px; }.hero-card, .sample-card, .editor-card, .settings-card, .stat-strip { border: 1px solid #e2e8f0; border-radius: 22px; background: #fff; box-shadow: 0 12px 35px rgb(15 23 42 / 6%); }.hero-card { display: flex; align-items: center; justify-content: space-between; gap: 22px; padding: 25px 28px; background: radial-gradient(circle at 88% 10%, #dbeafe, transparent 28%), #fff; }.eyebrow { color: var(--blue); font-size: 10px; font-weight: 800; letter-spacing: .15em; }.hero-card h2 { margin: 6px 0 4px; color: #0f172a; font-size: clamp(21px, 3vw, 28px); }.hero-card p { margin: 0; color: #64748b; font-size: 13px; }.hero-dialect { display: grid; min-width: 145px; grid-template-columns: 1fr auto; gap: 2px 8px; padding: 11px 13px; border: 1px solid #bfdbfe; border-radius: 14px; background: #eff6ff; }.hero-dialect span { grid-column: 1 / -1; color: #60a5fa; font-size: 8px; }.hero-dialect strong { color: #1e40af; font-size: 11px; }.hero-dialect small { padding: 2px 5px; border-radius: 5px; color: #fff; background: #2563eb; font-size: 8px; }
.sample-card { display: flex; align-items: center; gap: 7px; padding: 11px 14px; overflow-x: auto; }.sample-card > span { flex: none; color: #94a3b8; font-size: 9px; }.sample-card button { display: flex; align-items: center; gap: 7px; flex: none; padding: 6px 9px; border: 1px solid #e2e8f0; border-radius: 9px; color: #475569; background: #f8fafc; cursor: pointer; }.sample-card strong { font-size: 9px; }.sample-card small { padding: 2px 4px; border-radius: 4px; color: #2563eb; background: #dbeafe; font-size: 7px; }
.workspace { display: grid; grid-template-columns: minmax(0, 1fr) 300px; align-items: start; gap: 16px; }.editor-card { min-width: 0; overflow: hidden; }.editor-toolbar, .editor-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 14px; }.editor-toolbar > div:first-child { display: flex; align-items: center; gap: 9px; }.status-dot { display: flex; align-items: center; gap: 6px; color: #16a34a; font-size: 9px; }.status-dot i { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 0 4px #dcfce7; }.status-dot.error { color: #dc2626; }.status-dot.error i { background: #ef4444; box-shadow: 0 0 0 4px #fee2e2; }.editor-toolbar small { color: #94a3b8; font-size: 8px; }.toolbar-actions { display: flex; gap: 4px; }.editor-card :deep(.ace-editor) { border-width: 1px 0; border-radius: 0; }.error-panel { display: flex; flex-direction: column; padding: 11px 14px; color: #991b1b; background: #fef2f2; }.error-panel strong { font-size: 10px; }.error-panel code { margin: 4px 0; font-size: 9px; overflow-wrap: anywhere; }.error-panel span { font-size: 8px; opacity: .75; }.editor-footer > div { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; }.editor-footer span { padding: 3px 6px; border-radius: 6px; color: #64748b; background: #f1f5f9; font-size: 8px; }.editor-footer button { display: flex; align-items: center; gap: 3px; padding: 4px 6px; border: 0; border-radius: 6px; color: #64748b; background: transparent; font-size: 8px; cursor: pointer; }.editor-footer button.active { color: #1d4ed8; background: #dbeafe; }
.settings-card { position: sticky; top: 14px; padding: 19px; }.section-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }.section-heading h3 { margin: 3px 0 0; color: #0f172a; font-size: 16px; }.section-heading > span { padding: 3px 6px; border-radius: 6px; color: #2563eb; background: #dbeafe; font-size: 8px; }.settings-list { display: flex; flex-direction: column; gap: 12px; margin-top: 17px; }.settings-list > label, .split-settings label { display: flex; min-width: 0; flex-direction: column; gap: 5px; }.settings-list label > span, .switch-row > span { color: #64748b; font-size: 9px; }.settings-list b { float: right; color: #334155; font-family: ui-monospace, monospace; }.split-settings { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }.split-settings :deep(.el-input-number) { width: 100%; }.settings-list :deep(.el-radio-group) { display: grid; grid-template-columns: 1fr 1fr; }.settings-list :deep(.el-radio-button__inner) { width: 100%; padding: 8px 5px; font-size: 9px; }.switch-row { display: flex; align-items: center; justify-content: space-between; }.primary-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; margin-top: 17px; }.primary-actions .el-button { margin: 0; }.primary-actions .el-button:last-child { grid-column: 1 / -1; }.settings-card > p { margin: 12px 0 0; color: #94a3b8; font-size: 8px; line-height: 1.55; }
.stat-strip { display: grid; grid-template-columns: repeat(5, 1fr); padding: 10px; }.stat-strip div { display: flex; align-items: center; flex-direction: column; padding: 8px; border-right: 1px solid #e2e8f0; }.stat-strip div:last-child { border: 0; }.stat-strip span { color: #94a3b8; font-size: 8px; }.stat-strip strong { margin-top: 2px; color: #334155; font-size: 10px; }
:global(html.dark .sql-page .hero-card), :global(html.dark .sql-page .sample-card), :global(html.dark .sql-page .editor-card), :global(html.dark .sql-page .settings-card), :global(html.dark .sql-page .stat-strip) { border-color: #334155; background: #1e293b; box-shadow: none; }:global(html.dark .sql-page .hero-card) { background: radial-gradient(circle at 88% 10%, #1e3a8a, transparent 28%), #1e293b; }:global(html.dark .sql-page h2), :global(html.dark .sql-page h3), :global(html.dark .sql-page .settings-list b), :global(html.dark .sql-page .stat-strip strong) { color: #f8fafc; }:global(html.dark .sql-page .sample-card button), :global(html.dark .sql-page .editor-footer span) { border-color: #334155; color: #cbd5e1; background: #0f172a; }:global(html.dark .sql-page .hero-dialect) { border-color: #1d4ed8; background: #172554; }:global(html.dark .sql-page .hero-dialect strong) { color: #bfdbfe; }:global(html.dark .sql-page .stat-strip div) { border-color: #334155; }:global(html.dark .sql-page .error-panel) { color: #fecaca; background: #450a0a; }
@media (max-width: 930px) { .workspace { grid-template-columns: 1fr; }.settings-card { position: static; }.settings-list { display: grid; grid-template-columns: 1fr 1fr; }.primary-actions { grid-template-columns: repeat(3, 1fr); }.primary-actions .el-button:last-child { grid-column: auto; } }
@media (max-width: 640px) { .hero-card { align-items: flex-start; flex-direction: column; padding: 21px; }.hero-dialect { width: 100%; }.editor-toolbar, .editor-footer { align-items: flex-start; flex-direction: column; }.toolbar-actions { width: 100%; }.toolbar-actions .el-button { min-width: 0; flex: 1; padding: 7px 5px; }.settings-card { padding: 17px; border-radius: 19px; }.settings-list { display: flex; }.primary-actions { grid-template-columns: 1fr; }.stat-strip { grid-template-columns: repeat(2, 1fr); }.stat-strip div { border-bottom: 1px solid #e2e8f0; }.stat-strip div:last-child { grid-column: 1 / -1; }.split-settings { grid-template-columns: 1fr 1fr; } }
</style>
