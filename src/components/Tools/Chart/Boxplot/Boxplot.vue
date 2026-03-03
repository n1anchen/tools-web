<script setup lang="ts">
import {ref, reactive, onMounted, watch } from 'vue'
import Spreadsheet from 'x-data-spreadsheet'
import 'x-data-spreadsheet/dist/locale/zh-cn';
import { UploadProps,UploadRawFile,genFileId } from 'element-plus'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { toEchartsBoxplotData, toSpreadsheetData6Col } from '@/utils/echarts'
import * as echarts from 'echarts'
import * as XLSX from 'xlsx'
import { useSettingStore } from '@/store/modules/setting'

const info = reactive({ title: "箱线图" })
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

const createWatermark = () => {
  let canvas = document.createElement('canvas')
  let ctx = canvas.getContext('2d')
  canvas.width = canvas.height = 100
  ctx!.textAlign = 'center'; ctx!.textBaseline = 'middle'; ctx!.globalAlpha = 0.08
  ctx!.font = '20px Microsoft Yahei'; ctx!.translate(50, 50); ctx!.rotate(-Math.PI / 4)
  ctx!.fillText(waterMarkText.value, 0, 0)
  return canvas
}

// 6列：name/min/Q1/median/Q3/max
const categoriesData = ref(['实验A', '实验B', '实验C', '实验D'])
const boxData = ref([
  [10, 25, 50, 75, 90],
  [15, 30, 55, 70, 85],
  [8, 20, 45, 68, 82],
  [12, 28, 52, 72, 88],
])

const buildRowsData = () => {
  const cols = [
    { value: categoriesData.value },
    { value: boxData.value.map(b => b[0]) },
    { value: boxData.value.map(b => b[1]) },
    { value: boxData.value.map(b => b[2]) },
    { value: boxData.value.map(b => b[3]) },
    { value: boxData.value.map(b => b[4]) },
  ]
  return toSpreadsheetData6Col(cols)
}

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
    case "data":
      myChart.value?.setOption({
        xAxis: { data: categoriesData.value },
        series: [{ data: boxData.value }]
      })
      break
  }
}

const option = {
  backgroundColor: 'transparent',
  title: { text: title.value, subtext: subTitle.value, left: titlePos.value },
  tooltip: { trigger: 'item', axisPointer: { type: 'shadow' } },
  xAxis: { type: 'category', data: categoriesData.value, boundaryGap: true, nameGap: 30 },
  yAxis: { type: 'value' },
  series: [{
    name: '箱线图',
    type: 'boxplot',
    data: boxData.value,
    tooltip: {
      formatter: (param) => {
        return [
          '实验: ' + param.name,
          '最大值: ' + param.data[4],
          'Q3: ' + param.data[3],
          '中位数: ' + param.data[2],
          'Q1: ' + param.data[1],
          '最小值: ' + param.data[0],
        ].join('<br/>')
      }
    }
  }]
}

const reloadCanvas = () => {
  if (myChart.value) myChart.value.dispose()
  myChart.value = echarts.init(chartDom.value, settingStore.isDark ? 'dark' : undefined)
  myChart.value.resize({ width: widthCanvas.value, height: heightCanvas.value })
  myChart.value.setOption(option)
}

watch(() => settingStore.isDark, () => { reloadCanvas() })

const downEchartsImg = () => {
  let ext = downType.value == '1' ? 'png' : 'jpeg'
  let imgUrl = myChart.value?.getDataURL({ type: ext as "png" | 'jpeg', pixelRatio: 2 })
  if (imgUrl != undefined) { var a = document.createElement('a'); a.href = imgUrl; a.download = 'echart.' + ext; a.click() }
}

const drawer = ref(false)
const rowsData = ref({})

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
      const { categories, boxData: bd } = toEchartsBoxplotData(data)
      categoriesData.value = categories
      boxData.value = bd
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
      for (let sheet in workbook.Sheets) {
        if (useCount > 0) continue
        const arr = XLSX.utils.sheet_to_json(workbook.Sheets[sheet], { header: 1 }) as any[][]
        if(!arr.length) continue
        categoriesData.value = arr.map(r => String(r[0] ?? ''))
        boxData.value = arr.map(r => [
          parseFloat(String(r[1] ?? '0')) || 0,
          parseFloat(String(r[2] ?? '0')) || 0,
          parseFloat(String(r[3] ?? '0')) || 0,
          parseFloat(String(r[4] ?? '0')) || 0,
          parseFloat(String(r[5] ?? '0')) || 0,
        ])
        canvasHandle('data')
        rowsData.value = buildRowsData()
        useCount++
      }
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
        箱线图（Box Plot / 须图）是统计分析中常用的图表，用于直观展示数据分布的最小值、Q1（下四分位）、中位数、Q3（上四分位）、最大值五个统计量。<br>
        数据格式：6列，依次为名称、最小值、Q1、中位数、Q3、最大值。<br>
        在线制作箱线图，支持导入表格并在线编辑，支持 PNG、JPEG 格式导出。<br>
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
