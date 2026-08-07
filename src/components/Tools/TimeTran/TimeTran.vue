<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Clock, CopyDocument, VideoPause, VideoPlay } from '@element-plus/icons-vue'
import ToolHero from '@/components/Layout/ToolHero/ToolHero.vue'
import ToolGuide from '@/components/Layout/ToolGuide/ToolGuide.vue'
import { copy } from '@/utils/string'
import {
  formatDateTime,
  getTimestampUnitLabel,
  normalizeTimestamp,
  parseDateTime,
  type TimestampUnit,
} from '@/utils/converters'

type UnitSelection = 'auto' | TimestampUnit
type TimeZoneMode = 'local' | 'utc'

const nowMilliseconds = ref(Date.now())
const isClockRunning = ref(true)
const timestampInput = ref(String(Date.now()))
const timestampUnit = ref<UnitSelection>('auto')
const dateInput = ref(formatDateTime(Date.now(), 'local'))
const dateZone = ref<TimeZoneMode>('local')
let timer: ReturnType<typeof setInterval> | null = null

const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '本地时区'
const nowDateTime = computed(() => formatDateTime(nowMilliseconds.value, 'local'))
const nowSeconds = computed(() => Math.floor(nowMilliseconds.value / 1000))

const timestampResult = computed(() => {
  if (!timestampInput.value.trim()) return { error: '', value: null as null | ReturnType<typeof normalizeTimestamp> }
  try {
    const value = normalizeTimestamp(
      timestampInput.value,
      timestampUnit.value === 'auto' ? undefined : timestampUnit.value,
    )
    return { error: '', value }
  } catch (error) {
    return { error: error instanceof Error ? error.message : '无法识别时间戳', value: null }
  }
})

const timestampDetails = computed(() => {
  const normalized = timestampResult.value.value
  if (!normalized) return null
  const date = new Date(normalized.milliseconds)
  return {
    local: formatDateTime(normalized.milliseconds, 'local'),
    utc: formatDateTime(normalized.milliseconds, 'utc'),
    iso: date.toISOString(),
    weekday: new Intl.DateTimeFormat('zh-CN', { weekday: 'long' }).format(date),
  }
})

const dateResult = computed(() => {
  if (!dateInput.value.trim()) return { error: '', milliseconds: null as number | null }
  try {
    return { error: '', milliseconds: parseDateTime(dateInput.value, dateZone.value) }
  } catch (error) {
    return { error: error instanceof Error ? error.message : '无法识别日期', milliseconds: null }
  }
})

const convertedTimestamps = computed(() => {
  const milliseconds = dateResult.value.milliseconds
  if (milliseconds === null) return null
  return {
    seconds: String(Math.floor(milliseconds / 1000)),
    milliseconds: String(milliseconds),
    microseconds: String(BigInt(milliseconds) * 1000n),
    iso: new Date(milliseconds).toISOString(),
  }
})

function startClock() {
  if (timer) return
  isClockRunning.value = true
  timer = setInterval(() => { nowMilliseconds.value = Date.now() }, 250)
}

function stopClock() {
  if (timer) clearInterval(timer)
  timer = null
  isClockRunning.value = false
}

function toggleClock() {
  if (isClockRunning.value) stopClock()
  else startClock()
}

function useCurrentTimestamp(unit: TimestampUnit = 'milliseconds') {
  const now = Date.now()
  timestampUnit.value = 'auto'
  timestampInput.value = unit === 'seconds'
    ? String(Math.floor(now / 1000))
    : unit === 'microseconds'
      ? String(BigInt(now) * 1000n)
      : String(now)
}

function setDatePreset(preset: 'now' | 'today' | 'tomorrow') {
  const date = new Date()
  if (preset !== 'now') date.setHours(0, 0, 0, 0)
  if (preset === 'tomorrow') date.setDate(date.getDate() + 1)
  dateInput.value = formatDateTime(date.getTime(), 'local')
  dateZone.value = 'local'
}

onMounted(startClock)
onUnmounted(stopClock)
</script>

<template>
  <div class="time-page flex flex-col mt-3 flex-1">
    <ToolHero />

    <section class="clock-card">
      <div class="clock-icon"><el-icon><Clock /></el-icon></div>
      <div class="clock-main">
        <span>当前本地时间 · {{ timezone }}</span>
        <strong>{{ nowDateTime }}</strong>
      </div>
      <div class="clock-stamps">
        <button @click="copy(String(nowMilliseconds))"><span>毫秒</span><strong>{{ nowMilliseconds }}</strong></button>
        <button @click="copy(String(nowSeconds))"><span>秒</span><strong>{{ nowSeconds }}</strong></button>
      </div>
      <el-button circle :icon="isClockRunning ? VideoPause : VideoPlay" :title="isClockRunning ? '暂停时钟' : '继续时钟'" @click="toggleClock" />
    </section>

    <div class="converter-grid">
      <section class="converter-card">
        <div class="card-heading">
          <div><span class="step">01</span><div><h2>时间戳 → 日期</h2><p>自动识别 10 / 13 / 16 位时间戳</p></div></div>
        </div>

        <label class="field-label">输入时间戳</label>
        <div class="timestamp-input">
          <el-input v-model="timestampInput" size="large" placeholder="例如 1735689600000" />
          <el-select v-model="timestampUnit" size="large" aria-label="时间戳单位">
            <el-option label="自动识别" value="auto" />
            <el-option label="秒 s" value="seconds" />
            <el-option label="毫秒 ms" value="milliseconds" />
            <el-option label="微秒 μs" value="microseconds" />
          </el-select>
        </div>
        <div class="preset-row">
          <span>快速填入</span>
          <button @click="useCurrentTimestamp('seconds')">当前秒</button>
          <button @click="useCurrentTimestamp('milliseconds')">当前毫秒</button>
          <button @click="useCurrentTimestamp('microseconds')">当前微秒</button>
        </div>

        <div v-if="timestampResult.error" class="error-box">{{ timestampResult.error }}</div>
        <template v-else-if="timestampDetails && timestampResult.value">
          <div class="detected-unit">已识别为 {{ getTimestampUnitLabel(timestampResult.value.unit) }}</div>
          <div class="result-stack">
            <button @click="copy(timestampDetails.local)"><span>本地时间 · {{ timezone }}</span><strong>{{ timestampDetails.local }}</strong><small>{{ timestampDetails.weekday }}</small></button>
            <button @click="copy(timestampDetails.utc)"><span>UTC 时间</span><strong>{{ timestampDetails.utc }}</strong><small>世界协调时间</small></button>
            <button @click="copy(timestampDetails.iso)"><span>ISO 8601</span><strong>{{ timestampDetails.iso }}</strong><el-icon><CopyDocument /></el-icon></button>
          </div>
        </template>
      </section>

      <section class="converter-card">
        <div class="card-heading">
          <div><span class="step warm">02</span><div><h2>日期 → 时间戳</h2><p>明确选择本地时间或 UTC 语义</p></div></div>
        </div>

        <label class="field-label">日期与时间</label>
        <el-input v-model="dateInput" size="large" placeholder="YYYY-MM-DD HH:mm:ss" />
        <div class="date-options">
          <el-radio-group v-model="dateZone" size="small">
            <el-radio-button value="local">本地时间</el-radio-button>
            <el-radio-button value="utc">UTC</el-radio-button>
          </el-radio-group>
          <div class="preset-row compact">
            <button @click="setDatePreset('now')">现在</button>
            <button @click="setDatePreset('today')">今天 00:00</button>
            <button @click="setDatePreset('tomorrow')">明天 00:00</button>
          </div>
        </div>

        <div v-if="dateResult.error" class="error-box">{{ dateResult.error }}</div>
        <div v-else-if="convertedTimestamps" class="timestamp-results">
          <button @click="copy(convertedTimestamps.seconds)"><div><span>秒</span><small>10 位常见格式</small></div><strong>{{ convertedTimestamps.seconds }}</strong><el-icon><CopyDocument /></el-icon></button>
          <button @click="copy(convertedTimestamps.milliseconds)"><div><span>毫秒</span><small>JavaScript 常用</small></div><strong>{{ convertedTimestamps.milliseconds }}</strong><el-icon><CopyDocument /></el-icon></button>
          <button @click="copy(convertedTimestamps.microseconds)"><div><span>微秒</span><small>高精度日志常用</small></div><strong>{{ convertedTimestamps.microseconds }}</strong><el-icon><CopyDocument /></el-icon></button>
        </div>
      </section>
    </div>

    <section class="note-card">
      <strong>单位与时区是两件事</strong>
      <p>时间戳表示同一个绝对时刻，显示成日期时才受到时区影响。自动识别依据数字位数推断单位；历史数据、负数时间戳或非标准精度建议手动指定单位。</p>
    </section>

    <ToolGuide title="时间戳说明">
      <el-text>
        Unix 时间戳以 1970-01-01 00:00:00 UTC 为起点，不计闰秒。常见后端使用秒，JavaScript 使用毫秒，部分数据库和日志系统使用微秒。本工具的所有计算都在浏览器本地完成。
      </el-text>
    </ToolGuide>
  </div>
</template>

<style scoped>
.time-page {
  --blue: var(--c-primary);
  --orange: #ea580c;
  gap: 16px;
}
.clock-card, .converter-card, .note-card {
  border: 1px solid var(--c-border);
  border-radius: var(--radius-card);
  background: var(--c-surface);
  box-shadow: var(--shadow-card);
}
.clock-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 22px;
  background: linear-gradient(120deg, var(--c-primary-50), #fff 52%, #f8fafc);
}
.clock-icon {
  display: grid;
  width: 46px;
  height: 46px;
  flex: none;
  place-items: center;
  border-radius: var(--radius-md);
  color: var(--c-on-accent);
  background: var(--blue);
  font-size: 22px;
  box-shadow: 0 8px 18px color-mix(in srgb, var(--c-primary) 25%, transparent);
}
.clock-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}
.clock-main span {
  color: var(--c-text-secondary);
  font-size: 12px;
}
.clock-main strong {
  margin-top: 3px;
  color: var(--c-text-primary);
  font: 700 clamp(20px, 3vw, 27px)/1.25 ui-monospace, SFMono-Regular, Menlo, monospace;
}
.clock-stamps {
  display: flex;
  gap: 8px;
}
.clock-stamps button {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 8px 12px;
  border: 1px solid var(--c-primary-100);
  border-radius: var(--radius-md);
  color: var(--c-primary-900);
  background: var(--c-surface);
  cursor: pointer;
}
.clock-stamps span {
  font-size: 10px;
  text-transform: uppercase;
}
.clock-stamps strong {
  font: 12px ui-monospace, monospace;
}
.converter-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.converter-card {
  min-width: 0;
  padding: 24px;
}
.card-heading > div {
  display: flex;
  align-items: center;
  gap: 13px;
}
.step {
  display: grid;
  width: 38px;
  height: 38px;
  flex: none;
  place-items: center;
  border-radius: var(--radius-md);
  color: var(--c-on-accent);
  background: var(--blue);
  font-weight: 800;
}
.step.warm {
  background: var(--orange);
}
.card-heading h2 {
  margin: 0;
  color: var(--c-text-primary);
  font-size: 18px;
}
.card-heading p {
  margin: 3px 0 0;
  color: var(--c-text-muted);
  font-size: 12px;
}
.field-label {
  display: block;
  margin: 24px 0 8px;
  color: var(--c-text-body);
  font-size: 12px;
  font-weight: 700;
}
.timestamp-input {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 120px;
  gap: 8px;
}
.preset-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 10px;
  color: var(--c-text-muted);
  font-size: 11px;
}
.preset-row button {
  padding: 4px 9px;
  border: 0;
  border-radius: var(--radius-full);
  color: var(--c-text-body);
  background: #f1f5f9;
  cursor: pointer;
}
.preset-row.compact {
  justify-content: flex-end;
  margin: 0;
}
.date-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 12px;
}
.error-box {
  margin-top: 18px;
  padding: 13px 14px;
  border: 1px solid #fecaca;
  border-radius: var(--radius-md);
  color: #b91c1c;
  background: #fef2f2;
  font-size: 13px;
}
.detected-unit {
  display: inline-flex;
  margin-top: 18px;
  padding: 5px 9px;
  border-radius: 99px;
  color: var(--c-primary-700);
  background: var(--c-primary-50);
  font-size: 11px;
  font-weight: 700;
}
.result-stack, .timestamp-results {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}
.result-stack button, .timestamp-results button {
  position: relative;
  display: flex;
  min-width: 0;
  padding: 13px 14px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  text-align: left;
  background: var(--c-surface-subtle);
  cursor: pointer;
}
.result-stack button {
  align-items: flex-start;
  flex-direction: column;
}
.result-stack span, .timestamp-results span {
  color: var(--c-text-secondary);
  font-size: 11px;
}
.result-stack strong, .timestamp-results strong {
  max-width: 100%;
  color: var(--c-text-primary);
  overflow-wrap: anywhere;
  font: 700 14px/1.5 ui-monospace, monospace;
}
.result-stack small, .timestamp-results small {
  color: var(--c-text-muted);
  font-size: 10px;
}
.result-stack .el-icon {
  position: absolute;
  right: 12px;
  top: 12px;
  color: var(--c-text-muted);
}
.timestamp-results button {
  align-items: center;
  gap: 12px;
}
.timestamp-results button > div {
  display: flex;
  width: 105px;
  flex: none;
  flex-direction: column;
}
.timestamp-results strong {
  flex: 1;
  min-width: 0;
}
.timestamp-results .el-icon {
  color: var(--c-text-muted);
}
.note-card {
  padding: 18px 22px;
  border-color: #fed7aa;
  background: #fff7ed;
}
.note-card strong {
  color: #9a3412;
}
.note-card p {
  margin: 5px 0 0;
  color: #7c2d12;
  font-size: 13px;
  line-height: 1.7;
}
:global(html.dark .time-page .clock-card), :global(html.dark .time-page .converter-card), :global(html.dark .time-page .note-card) {
  border-color: var(--c-border);
  color: var(--c-text-primary);
  background: var(--c-surface);
  box-shadow: none;
}
:global(html.dark .time-page .clock-card) {
  background: linear-gradient(120deg, #172554, #1e293b 58%);
}
:global(html.dark .time-page .clock-main strong), :global(html.dark .time-page .card-heading h2), :global(html.dark .time-page .result-stack strong), :global(html.dark .time-page .timestamp-results strong) {
  color: #f8fafc;
}
:global(html.dark .time-page .field-label) {
  color: var(--c-text-secondary);
}
:global(html.dark .time-page .card-heading p), :global(html.dark .time-page .result-stack span), :global(html.dark .time-page .timestamp-results span) {
  color: var(--c-text-muted);
}
:global(html.dark .time-page .clock-stamps button), :global(html.dark .time-page .result-stack button), :global(html.dark .time-page .timestamp-results button) {
  border-color: var(--c-border);
  color: var(--c-primary-200);
  background: var(--c-surface-subtle);
}
:global(html.dark .time-page .preset-row button) {
  color: var(--c-text-secondary);
  background: #334155;
}
:global(html.dark .time-page .error-box) {
  border-color: #7f1d1d;
  color: #fca5a5;
  background: #450a0a;
}
:global(html.dark .time-page .detected-unit) {
  color: var(--c-primary-300);
  background: #172554;
}
:global(html.dark .time-page .note-card) {
  border-color: #7c2d12;
  background: #431407;
}
:global(html.dark .time-page .note-card strong) {
  color: #fdba74;
}
:global(html.dark .time-page .note-card p) {
  color: #fed7aa;
}
@media (max-width: 920px) {
  .clock-card {
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .clock-stamps {
    order: 3;
    width: 100%;
  }
  .clock-stamps button {
    flex: 1;
  }
  .converter-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 640px) {
  .clock-card, .converter-card {
    padding: 18px;
    border-radius: 19px;
  }
  .clock-main strong {
    font-size: 18px;
  }
  .clock-stamps {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  .clock-stamps strong {
    font-size: 11px;
  }
  .timestamp-input {
    grid-template-columns: 1fr;
  }
  .date-options {
    align-items: flex-start;
    flex-direction: column;
  }
  .preset-row.compact {
    justify-content: flex-start;
  }
  .timestamp-results button {
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .timestamp-results button > div {
    width: 82px;
  }
  .timestamp-results strong {
    flex-basis: calc(100% - 115px);
  }
}
</style>
