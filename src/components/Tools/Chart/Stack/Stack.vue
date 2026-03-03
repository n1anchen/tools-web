<script setup lang="ts">
import {ref, reactive, onMounted, watch } from 'vue'
import Spreadsheet from 'x-data-spreadsheet'
import 'x-data-spreadsheet/dist/locale/zh-cn';
import { UploadProps,UploadRawFile,genFileId } from 'element-plus'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { toEchartsStackData, toSpreadsheetDataNCol } from '@/utils/echarts'
import * as echarts from 'echarts'
import * as XLSX from 'xlsx'
import { useSettingStore } from '@/store/modules/setting'

const info = reactive({ title: "堆叠柱/线图" })
const settingStore = useSettingStore()

const chartDom = ref<HTMLElement|null>()
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
// bar | line
const stackChartType = ref<'bar' | 'line'>('bar')

const createWatermark = () => {
  let canvas = document.createElement('canvas');
  let ctx = canvas.getContext('2d');
  canvas.width = canvas.height = 100;
  ctx!.textAlign = 'center'; ctx!.textBaseline = 'middle'; ctx!.globalAlpha = 0.08;
  ctx!.font = '20px Microsoft Yahei'; ctx!.translate(50, 50); ctx!.rotate(-Math.PI / 4);
  ctx!.fillText(waterMarkText.value, 0, 0);
  return canvas
}

// 多系列数据
const categoriesData = ref(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
const seriesData = ref([
  { name: '系列1', data: [120, 132, 101, 134, 90, 230, 210] },
  { name: '系列2', data: [220, 182, 191, 234, 290, 330, 310] },
  { name: '系列3', data: [150, 232, 201, 154, 190, 330, 410] },
])

const buildSeriesOption = () => seriesData.value.map(s => ({
  name: s.name,
  type: stackChartType.value,
  stack: 'total',
  data: s.data,
  emphasis: { focus: 'series' }
}))

const option = {
  backgroundColor: 'transparent',
  title: { text: title.value, subtext: subTitle.value, left: titlePos.value },
  legend: {},
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  xAxis: { type: 'category', data: categoriesData.value },
  yAxis: { type: 'value' },
  series: buildSeriesOption()
}

const reloadCanvas = () => {
  if (myChart.value) myChart.value.dispose()
  myChart.value = echarts.init(chartDom.value, settingStore.isDark ? 'dark' : undefined)
  myChart.value.resize({ width: widthCanvas.value, height: heightCanvas.value })
  myChart.value.setOption(option)
}

watch(() => settingStore.isDark, () => { reloadCanvas() })

const canvasHandle = (type) => {
  let element = chartDom.value
  switch(type) {
    case "scale":
      element!.style.transform = `scale(${sacleSize.value / 100})`
      break
    case "size":
      element!.style.width = widthCanvas.value + 'px'
      element!.style.height = heightCanvas.value + 'px'
      reloadCanvas()
      break
    case "title":
      myChart.value?.setOption({ title: { text: titleSwitch.value ? title.value : '', subtext: subTitleSwitch.value ? subTitle.value : '', left: titlePos.value } })
      break
    case "watermark":
      myChart.value?.setOption({ backgroundColor: watermarkSwitch.value ? { image: createWatermark() } : 'transparent' })
      break
    case "chartType":
      myChart.value?.setOption({ series: buildSeriesOption() })
      break
    case "data":
      myChart.value?.setOption({
        legend: { data: seriesData.value.map(s => s.name) },
        xAxis: { data: categoriesData.value },
        series: buildSeriesOption()
      })
      break
  }
}

const downEchartsImg = () => {
  let ext = downType.value == '1' ? 'png' : 'jpeg'
  let imgUrl = myChart.value?.getDataURL({ type: ext as "png" | 'jpeg', pixelRatio: 2 })
  if (imgUrl != undefined) { var a = document.createElement('a'); a.href = imgUrl; a.download = 'echart.' + ext; a.click() }
}

const drawer = ref(false)
const rowsData = ref({})

// 初始化 spreadsheet 行数据（第0列=分类，后续列=系列）
const buildRowsData = () => {
  const arr = [] as {name:string, value:any[]}[]
  // col0: categories
  arr.push({ name: 'cat', value: categoriesData.value })
  seriesData.value.forEach(s => arr.push({ name: s.name, value: s.data }))
  return toSpreadsheetDataNCol(arr)
}

const editData = () => {
  if (drawer.value == true) { drawer.value = false; return }
  drawer.value = true
  Spreadsheet.locale('zh-cn', (window.x_spreadsheet as any).$messages['zh-cn'])
  new Spreadsheet("#x-spreadsheet", {
    showToolbar: false, showBottomBar: false,
    view: { height: () => document.documentElement.clientHeight / 2, width: () => document.documentElement.clientWidth }
  })
    .loadData({
      styles: [{ bgcolor: '#f4f5f8', textwrap: true, color: '#900b09', border: { top: ['thin', '#0366d6'], bottom: ['thin', '#0366d6'], right: ['thin', '#0366d6'], left: ['thin', '#0366d6'] } }],
      rows: rowsData.value
    })
    .change(data => {
      const { categories, series } = toEchartsStackData(data)
      categoriesData.value = categories
      seriesData.value = series
      canvasHandle('data')
    })
}

const fileList = ref()
const updateDataFile = async (params) => {
  const _file = params.file
  const fileReader = new FileReader()
  fileReader.onload = (ev) => {
    try {
      if (!ev.target) return
      const workbook = XLSX.read(ev.target.result, { type: 'binary' })
      let useCount = 0
      let tmpData: any[][] = []
      for (let sheet in workbook.Sheets) {
        if (useCount > 0) continue
        const sheetArray = XLSX.utils.sheet_to_json(workbook.Sheets[sheet], { header: 1 }) as any[][]
        if (sheetArray.length == 0) continue
        tmpData = sheetArray
        useCount++
      }
      if (tmpData.length === 0) return
      // first column = categories, remaining = series
      const cols = tmpData[0]?.length ?? 0
      const cats: string[] = []
      const series: {name:string, data:number[]}[] = []
      for (let c = 1; c < cols; c++) series.push({ name: `系列${c}`, data: [] })
      for (const row of tmpData) {
        cats.push(String(row[0] ?? ''))
        series.forEach((s, i) => s.data.push(parseFloat(String(row[i+1] ?? '0')) || 0))
      }
      categoriesData.value = cats
      seriesData.value = series
      canvasHandle('data')
      rowsData.value = buildRowsData()
    } catch(e) { console.log('error', e) }
  }
  fileReader.readAsArrayBuffer(_file)
}

const handleExceed: UploadProps['onExceed'] = (files) => {
  dataFileRef.value!.clearFiles()
  const file = files[0] as UploadRawFile; file.uid = genFileId()
  dataFileRef.value!.handleStart(file); dataFileRef.value!.submit()
}

onMounted(() => {
  chartDom.value = document.getElementById('main')
  canvasHandle('size')
  reloadCanvas()
  rowsData.value = buildRowsData()
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
              <el-tooltip content="支持上传：xls, xlsx, csv文件" placement="top" effect="dark">
                <el-button size="small">
                  <el-upload v-model:file-list="fileList" class="dataFileRef flex" ref="dataFileRef"
                    accept=".xls,.xlsx,.csv" :http-request="updateDataFile" :on-exceed="handleExceed" :limit="1"
                  >上传数据</el-upload>
                </el-button>
              </el-tooltip>
              <el-button size="small" @click="editData">编辑数据</el-button>
            </div>
          </div>
        </div>
        <el-scrollbar class="flex-1 bg-white dark:bg-slate-800">
          <div class="p-3 space-y-4">
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
            <!-- 图形类型 -->
            <div>
              <div class="flex items-center gap-1.5 mb-2">
                <div class="w-0.5 h-3.5 bg-purple-500 rounded-full"></div>
                <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide">图形类型</span>
              </div>
              <div class="pl-2">
                <el-radio-group v-model="stackChartType" size="small" @change="canvasHandle('chartType')">
                  <el-radio-button value="bar">堆叠柱图</el-radio-button>
                  <el-radio-button value="line">堆叠折线</el-radio-button>
                </el-radio-group>
              </div>
            </div>
            <div class="border-t border-slate-100 dark:border-slate-700"></div>
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

    <el-drawer id="x-spreadsheet" v-model="drawer" direction="btt" class="sheet" style="">
    </el-drawer>

    <ToolDetail title="描述">
      <el-text>
        堆叠柱/线图用于展示多系列数据的累积对比，常用于商业报表、预算分析等场景。<br>
        数据格式：第一列为分类（X轴），后续各列为对应系列的数值，支持动态列数。<br>
        可通过右侧"图形类型"一键切换堆叠柱图与堆叠折线图两种模式。<br>
        在线制作堆叠图，支持导入表格并在线编辑，支持 PNG、JPEG 格式导出。<br>
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
