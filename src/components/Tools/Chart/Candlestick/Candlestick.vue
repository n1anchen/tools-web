<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import Spreadsheet from 'x-data-spreadsheet'
import 'x-data-spreadsheet/dist/locale/zh-cn';
import { UploadProps, UploadRawFile, genFileId } from 'element-plus'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { toSpreadsheetData5Col, toEchartsCandlestickData } from '@/utils/echarts'
import * as echarts from 'echarts'
import * as XLSX from 'xlsx'
import { useSettingStore } from '@/store/modules/setting'

const info = reactive({ title: 'K线图' })
const settingStore = useSettingStore()

const chartDom = ref<HTMLElement | null>()
const myChart = ref<echarts.ECharts>()
const dataFileRef = ref()

const sacleSize = ref(100)
const widthCanvas = ref(720)
const heightCanvas = ref(400)
const downType = ref('1')
const titlePos = ref('center')
const title = ref('Tools-Web')
const subTitle = ref('在线图表制作工具')
const titleSwitch = ref(true)
const subTitleSwitch = ref(true)
const watermarkSwitch = ref(false)
const waterMarkText = ref('Tools-Web')

/** K线图属性 */
const upColor = ref('#ec0000')
const downColor = ref('#00da3c')

const createWatermark = () => {
  let canvas = document.createElement('canvas'); let ctx = canvas.getContext('2d')
  canvas.width = canvas.height = 100
  ctx!.textAlign = 'center'; ctx!.textBaseline = 'middle'
  ctx!.globalAlpha = 0.08; ctx!.font = '20px Microsoft Yahei'
  ctx!.translate(50, 50); ctx!.rotate(-Math.PI / 4)
  ctx!.fillText(waterMarkText.value, 0, 0); return canvas
}

// 默认数据：[日期, 开, 收, 低, 高]
const rawDates = ref(['2024/3/1','2024/3/4','2024/3/5','2024/3/6','2024/3/7','2024/3/8','2024/3/11','2024/3/12','2024/3/13','2024/3/14'])
const rawOpen  = ref([120.2, 127.2, 130.6, 131.0, 126.3, 125.0, 124.9, 127.5, 128.6, 130.6])
const rawClose = ref([125.5, 131.1, 128.6, 126.4, 124.7, 127.9, 128.4, 130.3, 129.7, 127.1])
const rawLow   = ref([118.5, 126.5, 126.1, 123.5, 122.3, 122.1, 123.2, 126.4, 127.1, 125.5])
const rawHigh  = ref([127.2, 134.0, 132.5, 132.1, 127.5, 129.5, 131.0, 132.4, 131.4, 132.8])

const datesData  = ref<string[]>([...rawDates.value])
const seriesData = ref<number[][]>([])

const buildKlineData = () => {
  seriesData.value = rawOpen.value.map((o, i) => [o, rawClose.value[i], rawLow.value[i], rawHigh.value[i]])
}

const option: any = {
  backgroundColor: 'transparent',
  title: { text: title.value, subtext: subTitle.value, left: titlePos.value },
  tooltip: {
    trigger: 'axis', axisPointer: { type: 'cross' },
    formatter: (params: any) => {
      const p = params[0]; const d = p.data
      return `${p.name}<br/>开：${d[0]}<br/>收：${d[1]}<br/>低：${d[2]}<br/>高：${d[3]}`
    }
  },
  xAxis: { data: datesData.value, scale: true, boundaryGap: false, axisLine: { onZero: false }, splitLine: { show: false }, min: 'dataMin', max: 'dataMax' },
  yAxis: { scale: true, splitArea: { show: true } },
  dataZoom: [
    { type: 'inside', start: 0, end: 100 },
    { show: true, type: 'slider', bottom: 10, start: 0, end: 100 },
  ],
  series: [{
    type: 'candlestick',
    data: seriesData.value,
    itemStyle: {
      color: upColor.value,
      color0: downColor.value,
      borderColor: upColor.value,
      borderColor0: downColor.value,
    },
  }],
}

const canvasHandle = (type: string) => {
  const element = chartDom.value
  switch (type) {
    case 'scale':
      element!.style.transform = `scale(${sacleSize.value / 100})`; break
    case 'size':
      element!.style.width = widthCanvas.value + 'px'
      element!.style.height = heightCanvas.value + 'px'
      reloadCanvas(); break
    case 'title': {
      const t = titleSwitch.value ? title.value : ''
      const s = subTitleSwitch.value ? subTitle.value : ''
      myChart.value?.setOption({ title: { text: t, subtext: s, left: titlePos.value } }); break
    }
    case 'watermark':
      myChart.value?.setOption({
        backgroundColor: watermarkSwitch.value ? { image: createWatermark() } : 'transparent'
      }); break
    case 'color':
      myChart.value?.setOption({
        series: [{ itemStyle: { color: upColor.value, color0: downColor.value, borderColor: upColor.value, borderColor0: downColor.value } }]
      }); break
    case 'data':
      myChart.value?.setOption({
        xAxis: { data: datesData.value },
        series: [{ data: seriesData.value }],
      }); break
  }
}

const reloadCanvas = () => {
  if (myChart.value) myChart.value.dispose()
  myChart.value = echarts.init(chartDom.value, settingStore.isDark ? 'dark' : undefined)
  myChart.value.resize({ width: widthCanvas.value, height: heightCanvas.value })
  myChart.value.setOption(option)
  canvasHandle('data')
}

watch(() => settingStore.isDark, () => reloadCanvas())

const downEchartsImg = () => {
  const ext = downType.value === '1' ? 'png' : 'jpeg'
  const imgUrl = myChart.value?.getDataURL({ type: ext as 'png' | 'jpeg', pixelRatio: 2 })
  if (imgUrl) { const a = document.createElement('a'); a.href = imgUrl; a.download = 'echart.' + ext; a.click() }
}

const drawer = ref(false)
const rowsData = ref({})

const editData = () => {
  if (drawer.value) { drawer.value = false; return }
  drawer.value = true
  rowsData.value = toSpreadsheetData5Col([
    { value: rawDates.value }, { value: rawOpen.value },
    { value: rawClose.value }, { value: rawLow.value }, { value: rawHigh.value }
  ])
  Spreadsheet.locale('zh-cn', (window.x_spreadsheet as any).$messages['zh-cn'])
  new Spreadsheet('#x-spreadsheet', {
    showToolbar: false, showBottomBar: false,
    view: { height: () => document.documentElement.clientHeight / 2, width: () => document.documentElement.clientWidth }
  }).loadData({ rows: rowsData.value }).change(data => {
    const parsed = toEchartsCandlestickData(data)
    datesData.value = parsed.dates
    seriesData.value = parsed.values
    canvasHandle('data')
  })
}

const fileList = ref()
const updateDataFile = async (params: any) => {
  const fileReader = new FileReader()
  fileReader.onload = (ev) => {
    try {
      const workbook = XLSX.read(ev.target!.result, { type: 'binary' })
      let rows: any[] = [], used = 0
      for (const sheet in workbook.Sheets) {
        if (used > 0) continue
        rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheet], { header: ['0','1','2','3','4'] }) as any[]
        used++
      }
      const dates: string[] = [], opens: number[] = [], closes: number[] = [], lows: number[] = [], highs: number[] = []
      rows.forEach((row: any) => {
        dates.push(String(row['0']))
        opens.push(parseFloat(row['1']) || 0); closes.push(parseFloat(row['2']) || 0)
        lows.push(parseFloat(row['3']) || 0); highs.push(parseFloat(row['4']) || 0)
      })
      rawDates.value = dates; rawOpen.value = opens; rawClose.value = closes; rawLow.value = lows; rawHigh.value = highs
      datesData.value = [...dates]
      seriesData.value = opens.map((o, i) => [o, closes[i], lows[i], highs[i]])
      canvasHandle('data')
    } catch (e) { console.log(e) }
  }
  fileReader.readAsArrayBuffer(params.file)
}

const handleExceed: UploadProps['onExceed'] = (files) => {
  dataFileRef.value!.clearFiles()
  const file = files[0] as UploadRawFile; file.uid = genFileId()
  dataFileRef.value!.handleStart(file); dataFileRef.value!.submit()
}

onMounted(() => {
  buildKlineData()
  chartDom.value = document.getElementById('main')
  canvasHandle('size')
})
</script>

<template>
  <div class="flex flex-col mt-3 flex-1">
    <DetailHeader :title="info.title"></DetailHeader>
    <div class="p-4 rounded-2xl flex bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div class="w-4/6">
        <div class="flex flex-row-reverse mb-4">
          <el-input-number v-model="sacleSize" :min="1" :max="100" :step="5" @change="canvasHandle('scale')" step-strictly/>
          <el-text>缩放：</el-text>
        </div>
        <div class="flex justify-center items-center max-h-[500px] max-w-[1000px] overflow-auto">
          <div id="main" class="bg-white dark:bg-slate-800"></div>
        </div>
      </div>
      <div class="w-2/6 ml-3 flex flex-col rounded-lg border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div class="p-3 bg-slate-50 dark:bg-slate-700/60 border-b border-slate-100 dark:border-slate-700 space-y-2">
          <el-button class="w-full" type="primary" size="large" @click="downEchartsImg">下载图表</el-button>
          <div class="flex items-center justify-between">
            <el-radio-group v-model="downType" size="small">
              <el-radio-button value="1">PNG</el-radio-button>
              <el-radio-button value="2">JPEG</el-radio-button>
            </el-radio-group>
            <div class="flex gap-1.5">
              <el-tooltip content="支持上传：xls, xlsx, csv文件（五列：日期、开盘、收盘、最低、最高）" placement="top" effect="dark">
                <el-button size="small">
                  <el-upload v-model:file-list="fileList" class="dataFileRef flex" ref="dataFileRef"
                    accept=".xls,.xlsx,.csv" :http-request="updateDataFile" :on-exceed="handleExceed" :limit="1">上传数据</el-upload>
                </el-button>
              </el-tooltip>
              <el-button size="small" @click="editData">编辑数据</el-button>
            </div>
          </div>
        </div>
        <el-scrollbar class="flex-1 bg-white dark:bg-slate-800">
          <div class="p-3 space-y-4">
            <!-- 画布尺寸 -->
            <div>
              <div class="flex items-center gap-1.5 mb-2">
                <div class="w-0.5 h-3.5 bg-blue-500 rounded-full"></div>
                <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide">画布尺寸</span>
              </div>
              <div class="space-y-2 pl-2">
                <div class="flex items-center gap-2">
                  <span class="text-xs text-slate-500 dark:text-slate-400 w-7 shrink-0">宽</span>
                  <el-input-number v-model="widthCanvas" :min="1" :max="4000" :step="10" controls-position="right" size="small" class="flex-1" @change="canvasHandle('size')" />
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-slate-500 dark:text-slate-400 w-7 shrink-0">高</span>
                  <el-input-number v-model="heightCanvas" :min="1" :max="4000" :step="10" controls-position="right" size="small" class="flex-1" @change="canvasHandle('size')" />
                </div>
              </div>
            </div>
            <div class="border-t border-slate-100 dark:border-slate-700"></div>
            <!-- 标题设置 -->
            <div>
              <div class="flex items-center gap-1.5 mb-2">
                <div class="w-0.5 h-3.5 bg-emerald-500 rounded-full"></div>
                <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide">标题设置</span>
              </div>
              <div class="space-y-2 pl-2">
                <div class="flex items-center gap-2">
                  <span class="text-xs text-slate-500 dark:text-slate-400 w-12 shrink-0">位置</span>
                  <el-radio-group v-model="titlePos" size="small" @change="canvasHandle('title')">
                    <el-radio-button value="left">左</el-radio-button>
                    <el-radio-button value="center">中</el-radio-button>
                    <el-radio-button value="right">右</el-radio-button>
                  </el-radio-group>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-slate-500 dark:text-slate-400 w-12 shrink-0">主标题</span>
                  <el-switch v-model="titleSwitch" size="small" @change="canvasHandle('title')" />
                  <el-input v-model="title" size="small" class="flex-1" @blur="canvasHandle('title')" :disabled="!titleSwitch" />
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-slate-500 dark:text-slate-400 w-12 shrink-0">副标题</span>
                  <el-switch v-model="subTitleSwitch" size="small" @change="canvasHandle('title')" />
                  <el-input v-model="subTitle" size="small" class="flex-1" @blur="canvasHandle('title')" :disabled="!subTitleSwitch" />
                </div>
              </div>
            </div>
            <div class="border-t border-slate-100 dark:border-slate-700"></div>
            <!-- K线颜色 -->
            <div>
              <div class="flex items-center gap-1.5 mb-2">
                <div class="w-0.5 h-3.5 bg-purple-500 rounded-full"></div>
                <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide">蜡烛颜色</span>
              </div>
              <div class="space-y-2 pl-2">
                <div class="flex items-center gap-2">
                  <span class="text-xs text-slate-500 dark:text-slate-400 w-12 shrink-0">涨色</span>
                  <el-color-picker v-model="upColor" size="small" @change="canvasHandle('color')" />
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-slate-500 dark:text-slate-400 w-12 shrink-0">跌色</span>
                  <el-color-picker v-model="downColor" size="small" @change="canvasHandle('color')" />
                </div>
              </div>
            </div>
            <div class="border-t border-slate-100 dark:border-slate-700"></div>
            <!-- 水印设置 -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-1.5">
                  <div class="w-0.5 h-3.5 bg-amber-500 rounded-full"></div>
                  <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide">水印设置</span>
                </div>
                <el-switch v-model="watermarkSwitch" size="small" @change="canvasHandle('watermark')" />
              </div>
              <div class="pl-2">
                <el-input v-model="waterMarkText" size="small" placeholder="水印文字" :disabled="!watermarkSwitch" @change="canvasHandle('watermark')" />
              </div>
            </div>
          </div>
        </el-scrollbar>
      </div>
    </div>
    <el-drawer id="x-spreadsheet" v-model="drawer" direction="btt" custom-class="sheet"></el-drawer>
    <ToolDetail title="描述">
      <el-text>
        K线图（蜡烛图）是金融领域常用的图表，展示某时间段内资产价格的开盘、收盘、最低、最高价。<br>
        在线制作K线图，表格五列依次为：日期、开盘价、收盘价、最低价、最高价。<br>
        支持自定义涨/跌颜色，内置数据缩放，支持导出png/jpeg格式。<br>
      </el-text>
    </ToolDetail>
  </div>
</template>

<style scoped>
:deep(.el-drawer__body){ display: none !important; }
:deep(.el-drawer__header){ display: none !important; margin-bottom: 0 !important; }
:deep(.el-drawer){ height: 50% !important; }
:deep(.el-upload-list){ display: none !important; }
</style>
