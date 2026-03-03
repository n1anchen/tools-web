<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import Spreadsheet from 'x-data-spreadsheet'
import 'x-data-spreadsheet/dist/locale/zh-cn';
import { UploadProps, UploadRawFile, genFileId } from 'element-plus'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { toSpreadsheetData3Col, toEchartsHeatmapData } from '@/utils/echarts'
import * as echarts from 'echarts'
import * as XLSX from 'xlsx'
import { useSettingStore } from '@/store/modules/setting'

const info = reactive({ title: '热力图' })
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

/** 热力图属性 */
const minColor = ref('#313695')
const maxColor = ref('#a50026')

// 默认使用 "星期×时段" 矩阵数据
const hours = ['12a','1a','2a','3a','4a','5a','6a','7a','8a','9a','10a','11a',
               '12p','1p','2p','3p','4p','5p','6p','7p','8p','9p','10p','11p']
const days  = ['周六','周五','周四','周三','周二','周一','周日']

const generateDefault = () => {
  const data: any[] = []
  hours.forEach((h, hi) => {
    days.forEach((d, di) => {
      data.push([hi, di, Math.floor(Math.random() * 10)])
    })
  })
  return data
}

const xCategories = ref<string[]>([...hours])
const yCategories = ref<string[]>([...days])
const heatData    = ref<any[]>(generateDefault())

// x/y/value 三列原始数据（用于spreadsheet初始化）
const rawX = ref<string[]>([])
const rawY = ref<string[]>([])
const rawV = ref<number[]>([])

const buildRaw = () => {
  rawX.value = []; rawY.value = []; rawV.value = []
  heatData.value.forEach(([xi, yi, v]) => {
    rawX.value.push(xCategories.value[xi] ?? String(xi))
    rawY.value.push(yCategories.value[yi] ?? String(yi))
    rawV.value.push(v)
  })
}

const createWatermark = () => {
  let canvas = document.createElement('canvas'); let ctx = canvas.getContext('2d')
  canvas.width = canvas.height = 100
  ctx!.textAlign = 'center'; ctx!.textBaseline = 'middle'
  ctx!.globalAlpha = 0.08; ctx!.font = '20px Microsoft Yahei'
  ctx!.translate(50, 50); ctx!.rotate(-Math.PI / 4)
  ctx!.fillText(waterMarkText.value, 0, 0); return canvas
}

const option: any = {
  backgroundColor: 'transparent',
  title: { text: title.value, subtext: subTitle.value, left: titlePos.value },
  tooltip: { position: 'top' },
  visualMap: {
    min: 0, max: 10, calculable: true,
    orient: 'horizontal', left: 'center', bottom: '5%',
    inRange: { color: [minColor.value, maxColor.value] }
  },
  xAxis: { type: 'category', data: xCategories.value, splitArea: { show: true } },
  yAxis: { type: 'category', data: yCategories.value, splitArea: { show: true } },
  grid: { top: 80 },
  series: [{ name: '热力值', type: 'heatmap', data: heatData.value, emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } } }],
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
        visualMap: { inRange: { color: [minColor.value, maxColor.value] } }
      }); break
    case 'data':
      myChart.value?.setOption({
        xAxis: { data: xCategories.value },
        yAxis: { data: yCategories.value },
        series: [{ data: heatData.value }],
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
  buildRaw()
  rowsData.value = toSpreadsheetData3Col([{ value: rawX.value }, { value: rawY.value }, { value: rawV.value }])
  Spreadsheet.locale('zh-cn', (window.x_spreadsheet as any).$messages['zh-cn'])
  new Spreadsheet('#x-spreadsheet', {
    showToolbar: false, showBottomBar: false,
    view: { height: () => document.documentElement.clientHeight / 2, width: () => document.documentElement.clientWidth }
  }).loadData({ rows: rowsData.value }).change(data => {
    const parsed = toEchartsHeatmapData(data)
    xCategories.value = parsed.xCategories
    yCategories.value = parsed.yCategories
    heatData.value = parsed.data
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
        rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheet], { header: ['0', '1', '2'] }) as any[]
        used++
      }
      const xArr: string[] = [], yArr: string[] = [], vArr: number[] = []
      rows.forEach((row: any) => {
        xArr.push(row['0']); yArr.push(row['1']); vArr.push(parseFloat(row['2']) || 0)
      })
      rawX.value = xArr; rawY.value = yArr; rawV.value = vArr
      // rebuild categories and coordinate data
      const xCats: string[] = [], yCats: string[] = []
      xArr.forEach(x => { if (!xCats.includes(x)) xCats.push(x) })
      yArr.forEach(y => { if (!yCats.includes(y)) yCats.push(y) })
      xCategories.value = xCats; yCategories.value = yCats
      heatData.value = xArr.map((x, i) => [xCats.indexOf(x), yCats.indexOf(yArr[i]), vArr[i]])
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
  buildRaw()
  chartDom.value = document.getElementById('main')
  canvasHandle('size')
  rowsData.value = toSpreadsheetData3Col([{ value: rawX.value }, { value: rawY.value }, { value: rawV.value }])
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
              <el-tooltip content="支持上传：xls, xlsx, csv文件（三列：x标签、y标签、数值）" placement="top" effect="dark">
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
            <!-- 颜色设置 -->
            <div>
              <div class="flex items-center gap-1.5 mb-2">
                <div class="w-0.5 h-3.5 bg-purple-500 rounded-full"></div>
                <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide">色阶设置</span>
              </div>
              <div class="space-y-2 pl-2">
                <div class="flex items-center gap-2">
                  <span class="text-xs text-slate-500 dark:text-slate-400 w-12 shrink-0">低值颜色</span>
                  <el-color-picker v-model="minColor" size="small" @change="canvasHandle('color')" />
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-slate-500 dark:text-slate-400 w-12 shrink-0">高值颜色</span>
                  <el-color-picker v-model="maxColor" size="small" @change="canvasHandle('color')" />
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
        热力图通过色阶变化直观展示二维矩阵中数值的分布密度，常用于用户行为分析、时段活跃度等场景。<br>
        在线制作热力图，表格三列分别为：X轴标签、Y轴标签、数值；相同标签组合自动聚合为坐标。<br>
        支持自定义低值/高值颜色渐变，支持导出png/jpeg格式。<br>
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
