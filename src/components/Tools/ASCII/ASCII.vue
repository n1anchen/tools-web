<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { CopyDocument, Search } from '@element-plus/icons-vue'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import { copy } from '@/utils/string'
import { createAsciiEntries, filterAsciiEntries, findAsciiEntry, type AsciiEntry, type AsciiGroup } from '@/utils/asciiTools'

const entries = createAsciiEntries()
const query = ref('')
const group = ref<'all' | AsciiGroup>('printable')
const selected = ref<AsciiEntry>(entries[65])
const lookupInput = ref('A')

const groups = [
  { value: 'printable', label: '标准字符', note: '32–126', count: 95 },
  { value: 'control', label: '控制字符', note: '0–31、127', count: 33 },
  { value: 'extended', label: '扩展字符', note: '128–255', count: 128 },
  { value: 'all', label: '全部', note: '完整字节范围', count: 256 },
] as const
const filteredEntries = computed(() => filterAsciiEntries(entries, query.value, group.value))
const currentGroup = computed(() => groups.find(item => item.value === group.value) ?? groups[3])
const heroMetrics = computed(() => [
  { value: String(filteredEntries.value.length), label: '当前结果' },
  { value: currentGroup.value.note, label: '编码范围' },
  { value: selected.value.symbol, label: '已选字符' },
])
const popularCodes = [9, 10, 13, 32, 48, 65, 97, 127]

function choose(entry: AsciiEntry) {
  selected.value = entry
}

function locateEntry() {
  const match = findAsciiEntry(entries, lookupInput.value)
  if (!match) {
    ElMessage.warning('仅支持 0–255、0x00–0xFF 或对应的单个字符')
    return
  }
  selected.value = match
  group.value = match.group
  query.value = ''
}

function copyValue(value: string) {
  copy(value)
}
</script>

<template>
  <div class="ascii-page flex flex-col mt-3 flex-1">
    <ToolHero title="ASCII 字符工作台" legacy>

    <section class="hero-card">
      <div><span class="eyebrow">ASCII CHARACTER STUDIO</span><h2>搜索、换算、复制，不再翻一张长表</h2><p>覆盖 ASCII 标准字符、控制字符和 Windows-1252 扩展区；按字符、名称或任意进制定位，并集中查看完整编码详情。</p></div>
      <div class="hero-stats"><div v-for="metric in heroMetrics" :key="metric.label"><strong>{{ metric.value }}</strong><span>{{ metric.label }}</span></div></div>
    </section>
    </ToolHero>

    <section class="lookup-card">
      <div><span class="eyebrow">DIRECT LOOKUP</span><h3>字符与编码互查</h3><p>输入单个字符、十进制、<code>0x41</code> 或 <code>U+0041</code>。</p></div>
      <div class="lookup-input"><el-input v-model="lookupInput" size="large" aria-label="字符或编码查询" placeholder="例如 A、65、0x41" @keyup.enter="locateEntry" /><button type="button" aria-label="定位字符" @click="locateEntry"><el-icon><Search /></el-icon>定位字符</button></div>
      <div class="popular-list"><span>常用</span><button v-for="code in popularCodes" :key="code" type="button" :aria-label="`查看 ${entries[code].name}，十进制 ${code}`" @click="choose(entries[code])"><b>{{ entries[code].symbol }}</b><small>{{ code }}</small></button></div>
    </section>

    <nav class="group-nav" aria-label="ASCII 字符分类"><button v-for="item in groups" :key="item.value" type="button" :class="{ active: group === item.value }" @click="group = item.value"><span><strong>{{ item.label }}</strong><small>{{ item.note }}</small></span><b>{{ item.count }}</b></button></nav>

    <section class="filter-card">
      <div><span class="eyebrow">FILTER TABLE</span><h3>{{ currentGroup.label }}</h3><p>支持搜索名称、描述、十六进制、八进制、二进制和 Unicode。</p></div>
      <el-input v-model="query" size="large" clearable :prefix-icon="Search" aria-label="筛选 ASCII 字符" placeholder="搜索 LF、换行、41、01000001…" />
      <span>{{ filteredEntries.length }} 个结果</span>
    </section>

    <section class="workspace-grid">
      <article class="result-card">
        <header><div><span class="eyebrow">CHARACTER GRID</span><h3>字符列表</h3></div><small>点击任意字符查看完整编码</small></header>
        <div v-if="filteredEntries.length" class="character-grid">
          <button v-for="entry in filteredEntries" :key="entry.value" type="button" :class="{ selected: selected.value === entry.value }" :aria-label="`${entry.name}，十进制 ${entry.dec}`" @click="choose(entry)">
            <span>{{ entry.symbol }}</span><small>DEC {{ entry.dec }}</small><code>0x{{ entry.hex }}</code>
          </button>
        </div>
        <div v-else class="empty-state">没有匹配字符，尝试缩短搜索词或切换分类。</div>
      </article>

      <aside class="detail-card">
        <header><div><span class="eyebrow">CHARACTER DETAIL</span><h3>编码详情</h3></div><span class="category-pill">{{ selected.category }}</span></header>
        <div class="symbol-preview"><strong>{{ selected.symbol }}</strong><div><span>{{ selected.name }}</span><p>{{ selected.description }}</p></div></div>
        <div class="value-list">
          <button type="button" aria-label="复制十进制编码" @click="copyValue(selected.dec)"><span>十进制 DEC</span><code>{{ selected.dec }}</code><el-icon><CopyDocument /></el-icon></button>
          <button type="button" aria-label="复制十六进制编码" @click="copyValue(`0x${selected.hex}`)"><span>十六进制 HEX</span><code>0x{{ selected.hex }}</code><el-icon><CopyDocument /></el-icon></button>
          <button type="button" aria-label="复制八进制编码" @click="copyValue(selected.oct)"><span>八进制 OCT</span><code>{{ selected.oct }}</code><el-icon><CopyDocument /></el-icon></button>
          <button type="button" aria-label="复制二进制编码" @click="copyValue(selected.binary)"><span>二进制 BIN</span><code>{{ selected.binary }}</code><el-icon><CopyDocument /></el-icon></button>
          <button type="button" aria-label="复制 Unicode 编码" @click="copyValue(selected.unicode)"><span>Unicode</span><code>{{ selected.unicode }}</code><el-icon><CopyDocument /></el-icon></button>
          <button type="button" aria-label="复制 HTML 实体" @click="copyValue(`&#${selected.dec};`)"><span>HTML 实体</span><code>&amp;#{{ selected.dec }};</code><el-icon><CopyDocument /></el-icon></button>
        </div>
        <div class="byte-map"><span>8 位字节结构</span><div><b v-for="(bit, index) in selected.binary" :key="index">{{ bit }}</b></div><small>最高位在左，最低位在右</small></div>
      </aside>
    </section>

    <ToolGuide title="编码范围说明"><div class="detail-copy">标准 ASCII 严格定义 0–127：其中 0–31 与 127 是控制字符，32–126 是可打印字符。128–255 并不属于原始 ASCII，本工具为实用查询沿用 Windows-1252 显示方式；不同旧系统或代码页中的扩展字符可能不同。现代文本建议优先使用 Unicode 与 UTF-8。</div></ToolGuide>
  </div>
</template>

<style scoped>
.ascii-page{--amber:#d97706;gap:18px}.hero-card,.lookup-card,.group-nav,.filter-card,.result-card,.detail-card{border:1px solid #e2e8f0;border-radius:22px;background:#fff;box-shadow:0 14px 38px rgba(15,23,42,.06)}.hero-card{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:28px;padding:30px;border:0;color:#fff;background:radial-gradient(circle at 88% 8%,rgba(253,230,138,.32),transparent 28%),linear-gradient(135deg,#451a03,#b45309 56%,#be123c)}.eyebrow{display:block;margin-bottom:6px;color:#fcd34d;font-size:12px;font-weight:900;letter-spacing:.16em}.hero-card h2{margin:0;font-size:clamp(25px,3vw,36px);line-height:1.2}.hero-card p{max-width:760px;margin:11px 0 0;color:#fef3c7;font-size:14px;line-height:1.75}.hero-stats{display:grid;grid-template-columns:repeat(3,106px)}.hero-stats div{padding:8px;text-align:center;border-left:1px solid rgba(255,255,255,.22)}.hero-stats strong,.hero-stats span{display:block}.hero-stats strong{overflow:hidden;font-size:22px;text-overflow:ellipsis}.hero-stats span{margin-top:5px;color:#fde68a;font-size:12px}.lookup-card{display:grid;grid-template-columns:minmax(220px,.7fr) minmax(320px,1fr) auto;align-items:center;gap:22px;padding:19px 22px}.lookup-card .eyebrow,.filter-card .eyebrow,.result-card .eyebrow,.detail-card .eyebrow{color:var(--amber)}.lookup-card h3,.filter-card h3,.result-card h3,.detail-card h3{margin:0;color:#0f172a;font-size:19px}.lookup-card p,.filter-card p{margin:4px 0 0;color:#64748b;font-size:13px;line-height:1.55}.lookup-input{display:grid;grid-template-columns:1fr auto}.lookup-input :deep(.el-input__wrapper){border-radius:11px 0 0 11px}.lookup-input button{display:inline-flex;align-items:center;justify-content:center;gap:5px;padding:0 14px;border:0;border-radius:0 11px 11px 0;background:linear-gradient(135deg,#d97706,#be123c);color:#fff;font-size:13px;font-weight:800;cursor:pointer}.popular-list{display:flex;align-items:center;gap:6px}.popular-list>span{color:#64748b;font-size:12px}.popular-list button{display:grid;min-width:38px;min-height:40px;place-items:center;padding:4px 7px;border:1px solid #e2e8f0;border-radius:9px;background:#f8fafc;color:#334155;cursor:pointer}.popular-list b{font:800 13px ui-monospace,monospace}.popular-list small{color:#94a3b8;font-size:11px}.group-nav{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;padding:10px}.group-nav button{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px;border:1px solid transparent;border-radius:14px;background:transparent;color:#64748b;text-align:left;cursor:pointer}.group-nav strong,.group-nav small{display:block}.group-nav strong{color:#334155;font-size:15px}.group-nav small{margin-top:2px;color:#94a3b8;font-size:12px}.group-nav b{display:grid;min-width:36px;height:36px;place-items:center;border-radius:10px;background:#f1f5f9;font:800 12px ui-monospace,monospace}.group-nav button.active{border-color:#fbbf24;background:#fffbeb}.group-nav button.active strong,.group-nav button.active b{color:#92400e}.filter-card{display:grid;grid-template-columns:minmax(220px,.7fr) minmax(300px,1fr) auto;align-items:center;gap:22px;padding:18px 22px}.filter-card>span{color:#64748b;font-size:13px;font-weight:750}.workspace-grid{display:grid;grid-template-columns:minmax(0,1fr) 340px;align-items:start;gap:18px}.result-card,.detail-card{padding:22px}.result-card>header,.detail-card>header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.result-card header small{color:#94a3b8;font-size:12px}.character-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:9px;margin-top:17px}.character-grid button{display:flex;min-width:0;min-height:94px;align-items:center;justify-content:center;flex-direction:column;border:1px solid #e2e8f0;border-radius:13px;background:#f8fafc;color:#334155;cursor:pointer}.character-grid button:hover,.character-grid button.selected{border-color:#f59e0b;background:#fffbeb;box-shadow:0 6px 16px rgba(217,119,6,.12)}.character-grid span{max-width:100%;overflow:hidden;font:800 24px ui-monospace,SFMono-Regular,Consolas,monospace;text-overflow:ellipsis}.character-grid small{margin-top:7px;color:#64748b;font-size:12px}.character-grid code{margin-top:2px;color:#94a3b8;font-size:12px}.empty-state{display:grid;min-height:260px;margin-top:17px;place-items:center;border:1px dashed #cbd5e1;border-radius:14px;color:#94a3b8;font-size:13px}.detail-card{position:sticky;top:80px}.category-pill{padding:5px 9px;border-radius:999px;color:#92400e;background:#fef3c7;font-size:12px;font-weight:800}.symbol-preview{display:flex;align-items:center;gap:16px;margin-top:18px;padding:18px;border-radius:15px;color:#fff;background:linear-gradient(135deg,#b45309,#be123c)}.symbol-preview>strong{display:grid;width:78px;height:78px;flex:none;place-items:center;border-radius:14px;background:rgba(255,255,255,.16);font:900 31px ui-monospace,monospace}.symbol-preview span{font:800 18px ui-monospace,monospace}.symbol-preview p{margin:5px 0 0;color:#fef3c7;font-size:13px;line-height:1.55}.value-list{margin-top:14px;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden}.value-list button{display:grid;width:100%;grid-template-columns:1fr 1fr auto;align-items:center;gap:8px;padding:11px 12px;border:0;border-bottom:1px solid #e2e8f0;background:#fff;color:#64748b;text-align:left;cursor:pointer}.value-list button:last-child{border:0}.value-list button:hover{background:#fffbeb}.value-list span{font-size:12px}.value-list code{color:#0f172a;font:800 13px ui-monospace,monospace}.byte-map{margin-top:14px;padding:14px;border-radius:13px;background:#f8fafc}.byte-map>span,.byte-map>small{color:#64748b;font-size:12px}.byte-map>div{display:grid;grid-template-columns:repeat(8,1fr);gap:4px;margin:10px 0}.byte-map b{display:grid;aspect-ratio:1;place-items:center;border-radius:6px;color:#fff;background:#334155;font:800 12px ui-monospace,monospace}.detail-copy{color:#64748b;font-size:14px;line-height:1.9}
:global(html.dark .ascii-page .lookup-card),:global(html.dark .ascii-page .group-nav),:global(html.dark .ascii-page .filter-card),:global(html.dark .ascii-page .result-card),:global(html.dark .ascii-page .detail-card){border-color:#334155;background:#1e293b;box-shadow:none}:global(html.dark .ascii-page h3),:global(html.dark .ascii-page .group-nav strong),:global(html.dark .ascii-page .value-list code){color:#f8fafc}:global(html.dark .ascii-page .popular-list button),:global(html.dark .ascii-page .group-nav b),:global(html.dark .ascii-page .character-grid button),:global(html.dark .ascii-page .value-list button),:global(html.dark .ascii-page .byte-map){border-color:#475569;background:#0f172a;color:#e2e8f0}:global(html.dark .ascii-page .group-nav button.active),:global(html.dark .ascii-page .character-grid button.selected){border-color:#d97706;background:#451a03}:global(html.dark .ascii-page .value-list){border-color:#334155}:global(html.dark .ascii-page .value-list button){border-color:#334155}
@media(max-width:1100px){.lookup-card,.filter-card{grid-template-columns:1fr}.popular-list{overflow-x:auto}.workspace-grid{grid-template-columns:1fr}.detail-card{position:static}.character-grid{grid-template-columns:repeat(auto-fill,minmax(82px,1fr))}}@media(max-width:680px){.ascii-page{gap:14px}.hero-card{grid-template-columns:1fr;padding:22px 18px}.hero-stats{grid-template-columns:repeat(3,1fr)}.hero-stats div:first-child{border-left:0}.lookup-card,.filter-card,.result-card,.detail-card{padding:15px}.lookup-input{grid-template-columns:1fr}.lookup-input :deep(.el-input__wrapper){border-radius:10px}.lookup-input button{min-height:40px;margin-top:8px;border-radius:10px}.group-nav{grid-template-columns:1fr 1fr}.character-grid{grid-template-columns:repeat(3,1fr)}.character-grid button{min-height:88px}.hero-card h2{font-size:25px}.result-card>header{flex-direction:column}}
</style>
