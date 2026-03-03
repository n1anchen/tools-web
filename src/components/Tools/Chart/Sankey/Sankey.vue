<script setup lang="ts">
import {ref, reactive, onMounted, watch } from 'vue'
import Spreadsheet from 'x-data-spreadsheet'
import 'x-data-spreadsheet/dist/locale/zh-cn';
import { UploadProps,UploadRawFile,genFileId } from 'element-plus'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { toEchartsSankeyData, toSpreadsheetData3Col } from '@/utils/echarts'
import * as echarts from 'echarts'
import * as XLSX from 'xlsx'
import { useSettingStore } from '@/store/modules/setting'

const info = reactive({ title: "桑基图" })
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

// sankey 原始数据（3列：source/target/value）
const rawData = ref([
  { source: '访问流量', target: '搜索引擎', value: 1200 },
  { source: '访问流量', target: '直接访问', value: 600 },
  { source: '访问流量', target: '社交媒体', value: 300 },
  { source: '搜索引擎', target: '注册用户', value: 400 },
  { source: '搜索引擎', target: '浏览后离开', value: 800 },
  { source: '直接访问', target: '注册用户', value: 200 },
  { source: '直接访问', target: '浏览后离开', value: 400 },
  { source: '社交媒体', target: '注册用户', value: 100 },
  { source: '社交媒体', target: '浏览后离开', value: 200 },
])

const buildNodesLinks = () => {
  const nodeSet = new Set<string>()
  rawData.value.forEach(d => { nodeSet.add(d.source); nodeSet.add(d.target) })
  return {
    nodes: Array.from(nodeSet).map(name => ({ name })),
    links: rawData.value
  }
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
      const { nodes, links } = buildNodesLinks()
      myChart.value?.setOption({ series: [{ nodes, links }] })
      break
  }
}

const option = {
  backgroundColor: 'transparent',
  title: { text: title.value, subtext: subTitle.value, left: titlePos.value },
  tooltip: { trigger: 'item', triggerOn: 'mousemove' },
  series: [{
    type: 'sankey',
    layout: 'none',
    emphasis: { focus: 'adjacency' },
    nodes: buildNodesLinks().nodes,
    links: buildNodesLinks().links
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

// 构建3列spreadsheet行数据
const buildRowsData = () => {
  const arr0 = { name: 'source', value: rawData.value.map(d => d.source) }
  const arr1 = { name: 'target', value: rawData.value.map(d => d.target) }
  const arr2 = { name: 'value', value: rawData.value.map(d => d.value) }
  return toSpreadsheetData3Col([arr0, arr1, arr2])
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
      const { nodes: _n, links } = toEchartsSankeyData(data)
      rawData.value = links
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
        const arr = XLSX.utils.sheet_to_json(workbook.Sheets[sheet], {header: ['0','1','2']}) as any[]
        if(arr.length == 0) continue
        rawData.value = arr.map(r => ({ source: String(r[0] ?? ''), target: String(r[1] ?? ''), value: parseFloat(String(r[2] ?? '0')) || 0 }))
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
        桑基图（Sankey Diagram）用于可视化流量、流向及其比例，常用于网站流量分析、能源分布、资金流向等场景。<br>
        数据格式：3列，分别为来源节点（source）、目标节点（target）和流量值（value）。<br>
        在线制作桑基图，支持导入表格并在线编辑，支持 PNG、JPEG 格式导出。<br>
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
