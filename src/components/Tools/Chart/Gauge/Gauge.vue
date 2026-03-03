<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import Spreadsheet from 'x-data-spreadsheet'
import 'x-data-spreadsheet/dist/locale/zh-cn';
import { UploadProps, UploadRawFile, genFileId } from 'element-plus'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { toSpreadsheetData, toEchartsGaugeData } from '@/utils/echarts'
import * as echarts from 'echarts'
import * as XLSX from 'xlsx'
import { useSettingStore } from '@/store/modules/setting'

const info = reactive({ title: '仪表盘' })
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

/** 仪表盘属性 */
const minVal = ref(0)
const maxVal = ref(100)
const splitNum = ref(10)

const createWatermark = () => {
  let canvas = document.createElement('canvas')
  let ctx = canvas.getContext('2d')
  canvas.width = canvas.height = 100
  ctx!.textAlign = 'center'; ctx!.textBaseline = 'middle'
  ctx!.globalAlpha = 0.08; ctx!.font = '20px Microsoft Yahei'
  ctx!.translate(50, 50); ctx!.rotate(-Math.PI / 4)
  ctx!.fillText(waterMarkText.value, 0, 0)
  return canvas
}

const colunmData = ref(['速度'])
const valueData = ref([88])
const seriesData = ref<any[]>([])

/** 根据数量自动水平分散各指针的名称/数值标签，避免重叠 */
const applyGaugeOffsets = (items: {name:string, value:number}[]) => {
  const count = items.length
  return items.map((item, i) => {
    const xOffset = count === 1 ? '0%' : `${-60 + i * (120 / (count - 1))}%`
    return {
      ...item,
      title: { offsetCenter: [xOffset, '75%'] },
      detail: { offsetCenter: [xOffset, '95%'], fontSize: 18 },
    }
  })
}

const buildGaugeData = () => {
  const raw = colunmData.value.map((name, i) => ({ name, value: valueData.value[i] ?? 0 }))
  seriesData.value = applyGaugeOffsets(raw)
}

const option: any = {
  backgroundColor: 'transparent',
  title: { text: title.value, subtext: subTitle.value, left: titlePos.value },
  tooltip: { formatter: '{a} <br/>{b} : {c}' },
  series: [{
    name: '仪表盘',
    type: 'gauge',
    min: minVal.value,
    max: maxVal.value,
    splitNumber: splitNum.value,
    data: seriesData.value,
    detail: { formatter: '{value}' },
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
    case 'gauge':
      myChart.value?.setOption({
        series: [{ min: minVal.value, max: maxVal.value, splitNumber: splitNum.value }]
      }); break
    case 'data':
      myChart.value?.setOption({ series: [{ data: seriesData.value }] }); break
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
  Spreadsheet.locale('zh-cn', (window.x_spreadsheet as any).$messages['zh-cn'])
  new Spreadsheet('#x-spreadsheet', {
    showToolbar: false, showBottomBar: false,
    view: { height: () => document.documentElement.clientHeight / 2, width: () => document.documentElement.clientWidth }
  }).loadData({ rows: rowsData.value }).change(data => {
    seriesData.value = applyGaugeOffsets(toEchartsGaugeData(data))
    canvasHandle('data')
  })
}

const fileList = ref()
const updateDataFile = async (params: any) => {
  const fileReader = new FileReader()
  fileReader.onload = (ev) => {
    try {
      const workbook = XLSX.read(ev.target!.result, { type: 'binary' })
      let tmpCol: any[] = [], tmpVal: any[] = [], used = 0
      for (const sheet in workbook.Sheets) {
        if (used > 0) continue
        XLSX.utils.sheet_to_json(workbook.Sheets[sheet], { header: ['0', '1'] }).forEach((row: any) => {
          tmpCol.push(row['0']); tmpVal.push(parseFloat(row['1']) || 0)
        })
        used++
      }
      colunmData.value = tmpCol; valueData.value = tmpVal
      buildGaugeData()
      canvasHandle('data')
      rowsData.value = toSpreadsheetData([{ value: colunmData.value }, { value: valueData.value }])
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
  buildGaugeData()
  chartDom.value = document.getElementById('main')
  canvasHandle('size')
  rowsData.value = toSpreadsheetData([{ value: colunmData.value }, { value: valueData.value }])
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
              <el-tooltip content="支持上传：xls, xlsx, csv文件（两列：名称、数值）" placement="top" effect="dark">
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
            <!-- 仪表盘属性 -->
            <div>
              <div class="flex items-center gap-1.5 mb-2">
                <div class="w-0.5 h-3.5 bg-purple-500 rounded-full"></div>
                <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide">仪表盘属性</span>
              </div>
              <div class="space-y-2 pl-2">
                <div class="flex items-center gap-2">
                  <span class="text-xs text-slate-500 dark:text-slate-400 w-12 shrink-0">最小值</span>
                  <el-input-number v-model="minVal" controls-position="right" size="small" class="flex-1" @change="canvasHandle('gauge')" />
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-slate-500 dark:text-slate-400 w-12 shrink-0">最大值</span>
                  <el-input-number v-model="maxVal" controls-position="right" size="small" class="flex-1" @change="canvasHandle('gauge')" />
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-slate-500 dark:text-slate-400 w-12 shrink-0">刻度数</span>
                  <el-input-number v-model="splitNum" :min="1" :max="20" controls-position="right" size="small" class="flex-1" @change="canvasHandle('gauge')" />
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
        仪表盘适用于展示关键指标的完成进度或当前状态，一目了然。<br>
        在线制作仪表盘，表格第一列为指针名称，第二列为当前数值（在最小值/最大值范围内）。<br>
        支持设置刻度范围与刻度数，支持多指针同时显示，支持导出png/jpeg格式。<br>
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
