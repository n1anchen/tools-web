/**
 * 图表工作台公共逻辑：草稿持久化（防抖）、图表生命周期、导入 / 重置 / 导出
 *
 * 三个图表工作台（ChartWorkbench / AdvancedChartWorkbench / SpecialChartWorkbench）
 * 的草稿恢复与保存、echarts 渲染与销毁、importData / resetWorkbench / downloadData /
 * downloadPng 逻辑完全一致，仅数据序列化、默认值等少量差异，统一收口到这里。
 */
import { nextTick, onBeforeUnmount, onMounted, watch, type ComputedRef, type Ref } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import { autoDown } from '@/utils/file'
import { clearChartDraft, loadChartDraft, saveChartDraft } from '@/utils/chartDraft'
import { CHART_PALETTES } from '@/utils/chartStudio'

export interface ChartWorkbenchRefs {
  dataMode: Ref<string>
  activeSample: Ref<string>
  chartHeight: Ref<number>
  currentPaletteId: Ref<string>
  dataText: Ref<string>
}

export interface ChartWorkbenchOptions<S extends object> {
  /** 草稿存储键（工具 type） */
  type: string
  /** reactive 配置对象 */
  settings: S
  /** 创建默认配置（重置 / 草稿合并用） */
  createSettings: () => S
  /** 数据 / 配置 refs */
  refs: ChartWorkbenchRefs
  /** 重置后的默认图表高度 */
  defaultChartHeight: number
  /** 重置后的默认示例 id */
  defaultActiveSample: () => string
  /** 是否有可导出的有效数据 */
  hasData: () => boolean
  /** 按当前数据序列化导出文本（json / table） */
  serializeCurrent: (mode: 'json' | 'table') => string
  /** 重置时使用的默认示例数据文本 */
  serializeDefault: () => string
  /** 导入文件内容是否为 JSON（决定导入模式） */
  detectJson: (content: string) => boolean
  /** 图表容器 */
  chartElement: Ref<HTMLElement | null>
  /** 图表配置 */
  option: ComputedRef<object>
  /** 当前是否为暗色主题 */
  isDark: ComputedRef<boolean>
  /** PNG 导出文件名基础 */
  filenameBase: () => string
  /** 草稿恢复后的回调（如 Special 的日历年度同步） */
  onAfterRestore?: () => void
  /** 导入完成后的回调 */
  onAfterImport?: () => void
}

export function useChartWorkbench<S extends object>(options: ChartWorkbenchOptions<S>) {
  const { type, settings, createSettings, refs, defaultChartHeight, defaultActiveSample, hasData, serializeCurrent, serializeDefault, detectJson, chartElement, option, isDark, filenameBase } = options
  const { dataMode, activeSample, chartHeight, currentPaletteId, dataText } = refs

  let chart: echarts.ECharts | null = null
  let resizeObserver: ResizeObserver | null = null

  // ---- 恢复该图表类型的本地草稿（跨工具切换 / 刷新后保留输入数据与配置）----
  const restoredDraft = loadChartDraft<S>(type)
  if (restoredDraft) {
    dataMode.value = restoredDraft.dataMode
    activeSample.value = restoredDraft.activeSample
    chartHeight.value = restoredDraft.chartHeight
    currentPaletteId.value = restoredDraft.currentPaletteId
    dataText.value = restoredDraft.dataText
    Object.assign(settings, { ...createSettings(), ...restoredDraft.settings })
    if (options.onAfterRestore) nextTick(options.onAfterRestore)
  }

  // ---- 草稿保存：变更后防抖写入；仅在有实际改动时才落盘，重置后清除 ----
  let draftTimer: ReturnType<typeof setTimeout> | null = null
  let draftDirty = false
  function writeDraft() {
    saveChartDraft(type, {
      dataText: dataText.value,
      dataMode: dataMode.value,
      activeSample: activeSample.value,
      chartHeight: chartHeight.value,
      currentPaletteId: currentPaletteId.value,
      settings: { ...settings },
    })
  }
  function scheduleDraft() {
    draftDirty = true
    if (draftTimer) clearTimeout(draftTimer)
    draftTimer = setTimeout(writeDraft, 400)
  }
  watch([dataMode, dataText, activeSample, chartHeight, currentPaletteId], scheduleDraft)
  watch(settings, scheduleDraft, { deep: true })

  // ---- 图表渲染 ----
  function renderChart() {
    if (!chartElement.value) return
    if (!chart) chart = echarts.init(chartElement.value, isDark.value ? 'dark' : undefined, { renderer: 'canvas' })
    chart.setOption(option.value as echarts.EChartsOption, true)
    chart.resize()
  }
  function recreateChart() {
    chart?.dispose()
    chart = null
    nextTick(renderChart)
  }

  // ---- 重置：恢复默认示例与配置 ----
  function resetWorkbench() {
    Object.assign(settings, createSettings())
    dataMode.value = 'grid'
    activeSample.value = defaultActiveSample()
    dataText.value = serializeDefault()
    chartHeight.value = defaultChartHeight
    currentPaletteId.value = CHART_PALETTES[0].id
    draftDirty = false
    clearChartDraft(type)
    ElMessage.success('已恢复默认示例与配置')
  }

  // ---- 导入数据文件 ----
  async function importData(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    if (file.size > 1024 * 1024) {
      ElMessage.warning('单个数据文件请控制在 1 MB 以内')
      return
    }
    const content = await file.text()
    dataMode.value = file.name.toLowerCase().endsWith('.json') || detectJson(content) ? 'json' : 'grid'
    dataText.value = content
    activeSample.value = ''
    options.onAfterImport?.()
    ElMessage.success(`已载入 ${file.name}`)
  }

  // ---- 导出数据（json / csv）----
  function downloadData() {
    if (!hasData()) {
      ElMessage.warning('没有可导出的有效数据')
      return
    }
    const mode = dataMode.value === 'json' ? 'json' : 'table'
    const content = serializeCurrent(mode)
    const blob = new Blob([content], { type: mode === 'json' ? 'application/json;charset=utf-8' : 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    autoDown(url, `chart-data.${mode === 'json' ? 'json' : 'csv'}`)
  }

  // ---- 导出 PNG ----
  function downloadPng() {
    if (!chart || !hasData()) {
      ElMessage.warning('请先输入有效数据')
      return
    }
    autoDown(
      chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: isDark.value ? '#0F172A' : '#FFFFFF' }),
      `${filenameBase().replace(/[\\/:*?"<>|]/g, '-')}.png`
    )
  }

  // ---- 生命周期 ----
  watch(option, () => nextTick(renderChart), { deep: true })
  watch(() => isDark.value, recreateChart)

  onMounted(() => {
    nextTick(() => {
      renderChart()
      if (chartElement.value) {
        resizeObserver = new ResizeObserver(() => chart?.resize())
        resizeObserver.observe(chartElement.value)
      }
    })
  })

  onBeforeUnmount(() => {
    // 组件销毁前把未落盘的草稿写入，保证跨工具切换后数据不丢失
    if (draftTimer) { clearTimeout(draftTimer); draftTimer = null }
    if (draftDirty) writeDraft()
    resizeObserver?.disconnect()
    chart?.dispose()
    chart = null
  })

  return { resetWorkbench, importData, downloadData, downloadPng }
}
