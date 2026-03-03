<script setup lang="ts">
import {ref, reactive, onMounted, watch } from 'vue'
import Spreadsheet from 'x-data-spreadsheet'
import 'x-data-spreadsheet/dist/locale/zh-cn';
import { UploadProps,UploadRawFile,genFileId } from 'element-plus'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
// import { copy } from '@/utils/string'
import { toEchartsPieData, toSpreadsheetData, tranObjAndColumn } from '@/utils/echarts'
import * as echarts from 'echarts'
import * as XLSX from 'xlsx'
import { useSettingStore } from '@/store/modules/setting'
const info = reactive({
  title: "饼图 / 环形图",
})

// 图形类型：饼图 or 环形图
const pieType = ref<'pie' | 'doughnut'>('pie')
const settingStore = useSettingStore()

const chartDom = ref<HTMLElement|null>()
const myChart = ref<echarts.ECharts>()
const dataFileRef = ref()

const setOptionName = ref(1)
//缩放比例
const sacleSize = ref(100)
//画布宽高
const widthCanvas = ref(720)
const heightCanvas = ref(400)
//下载文件类型
const downType = ref('1')
//图形属性颜色
const attrColor = ref('#5470c6')
//标题位置
const titlePos = ref('center')
//标题
const title = ref('Tools-Web')
//副标题
const subTitle = ref('在线图表制作工具')
//显示标题 - 开关
const titleSwitch = ref(true)
//显示副标题 - 开关
const subTitleSwitch = ref(true)

/** 水印 */
const watermarkSwitch = ref(false)  //开关
const waterMarkText = ref('Tools-Web');

//创建水印
const createWatermark = () => {
  let canvas = document.createElement('canvas');
  let ctx = canvas.getContext('2d');
  canvas.width = canvas.height = 100;
  ctx!.textAlign = 'center';
  ctx!.textBaseline = 'middle';
  ctx!.globalAlpha = 0.08;
  ctx!.font = '20px Microsoft Yahei';
  ctx!.translate(50, 50);
  ctx!.rotate(-Math.PI / 4);
  ctx!.fillText(waterMarkText.value, 0, 0);
  return canvas
}

//操作图表
const canvasHandle = (type) => {
  // let element = document.getElementById('main')
  let element = chartDom.value
  switch(type) {
    case "scale":
      //缩放画布
      let scale = sacleSize.value / 100
      element!.style.transform = `scale(${scale})`
      break
    case "size":
      //图表尺寸
      element!.style.width = widthCanvas.value + 'px';
      element!.style.height = heightCanvas.value + 'px';
      reloadCanvas()
      break
    case "title":
      let fakerTitle = ''
      let fakerSubTitle = ''
      //修改标题相关配置
      if (titleSwitch.value === true) {
        fakerTitle = title.value
      }
      if (subTitleSwitch.value === true) {
        fakerSubTitle = subTitle.value
      }
      myChart.value?.setOption({
        title: {
          text: fakerTitle,
          subtext: fakerSubTitle,
          left: titlePos.value
        }
      })
      break
    case "color":
      //图表属性颜色
      myChart.value?.setOption({
        series: [
          {
            itemStyle: {
              color: attrColor.value
            }
          }
        ]
      })
      break;
    case "watermark":
      //水印
      if (watermarkSwitch.value === true) {
        myChart.value?.setOption({
          backgroundColor: {
            image: createWatermark(),
          }
        })
      } else {
        myChart.value?.setOption({
          backgroundColor: 'transparent'
        })
      }
      break;
    case "data":
      //更新数据
      myChart.value?.setOption({
        series: [
          {
            data: seriesData.value,
          }
        ]
      })
      break;
    case "pieType":
      //切换饼图 / 环形图
      myChart.value?.setOption({
        series: [
          {
            radius: pieType.value === 'doughnut' ? ['40%', '70%'] : '50%',
          }
        ]
      })
      break;
  }
}
const handleChange = () => {

}

//数据
const colunmData = ref(['Search Engine', 'Direct', 'Email', 'Union Ads', 'Video Ads'] as string[]);
const valueData = ref([1048, 735, 580, 484, 300] as number[]);
const seriesData = ref([] as Object[])
//选项
const option = {
  backgroundColor: 'transparent',
  // backgroundColor: {
  //   // type: 'pattern',
  //   // image: canvas,
  //   // repeat: 'repeat'
  // },
  title: {
    text: title.value,
    subtext: subTitle.value,
    left: titlePos.value
  },
  series: [
    {
      type: 'pie',
      radius: '50%',
      data: seriesData.value,
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    },
  ],
  tooltip: {
    // trigger: 'item'
  },
};

//重新加载画布
const reloadCanvas = () => {
  if (myChart.value) {
    myChart.value.dispose()
  }
  myChart.value = echarts.init(chartDom.value, settingStore.isDark ? 'dark' : undefined)
  myChart.value.resize({
    width: widthCanvas.value,
    height: heightCanvas.value
  })
  myChart.value.setOption(option)
  //加载数据
  canvasHandle('data')
}

watch(() => settingStore.isDark, () => {
  reloadCanvas()
})

//下载echarts图表图片
const downEchartsImg = () => {
  let ext = downType.value == '1' ? 'png' : 'jpeg'
  let imgUrl = myChart.value?.getDataURL({
    type: ext as "png" | 'jpeg',
    pixelRatio: 2,
  })

  if (imgUrl != undefined) {
    var downloadLink = document.createElement('a');
    downloadLink.href = imgUrl;
    downloadLink.download = 'echart.' + ext;
    downloadLink.click();
  }
}


/** 上传、编辑数据 */
//抽屉开关
const drawer = ref(false)
const rowsData = ref({})

const editData = () => {
  if (drawer.value == true) {
    drawer.value = false
  } else {
    drawer.value = true
    /** 在线excel */
    Spreadsheet.locale('zh-cn', (window.x_spreadsheet as any).$messages['zh-cn']);
    //const sheet = new Spreadsheet("#x-spreadsheet", {
    new Spreadsheet("#x-spreadsheet", {
      showToolbar: false, //隐藏顶部工具栏
      showBottomBar: false,//隐藏底部工具栏,
      view: {
        height: () => document.documentElement.clientHeight / 2,
        width: () => document.documentElement.clientWidth,
      }
    })
      .loadData({
        //样式
        styles: [
          { 
            bgcolor: '#f4f5f8', 
            textwrap: true, 
            color: '#900b09', 
            border: { 
              top: ['thin', '#0366d6'], 
              bottom: ['thin', '#0366d6'], 
              right: ['thin', '#0366d6'], 
              left: ['thin', '#0366d6'], 
            }, 
          }, 
        ], 
        //数据
        rows: rowsData.value
      }) // load data
      .change(data => {
        //表格数据改变后触发
        //规则: 获取第一列和第二列的数据
        seriesData.value = toEchartsPieData(data)
        canvasHandle('data')
      });
      // sheet.validate()
  }
}

//上传数据文件
const fileList = ref()
const updateDataFile = async (params) => {
  const _file = params.file;
  const fileReader = new FileReader();
  fileReader.onload = (ev) => {
    try {
      if (!ev.target) {
        return
      }
      const data = ev.target.result;
      const workbook = XLSX.read(data, {
        type: 'binary'
      });
      let useCount = 0;
      let tmpColumnData:any[] = [];
      let tmpValueData:any[] = [];
      for (let sheet in workbook.Sheets) {
        //这里只需要第一个sheet
        if (useCount > 0) {
          continue;
        }
        //循环读取每个文件
        const sheetArray = XLSX.utils.sheet_to_json(workbook.Sheets[sheet], {header: ['0', '1']});
        //若当前sheet没有数据，则continue
        if(sheetArray.length == 0){
          continue;
        }

        for(let item in sheetArray){
          if (sheetArray[item] != undefined) {
              let tmp1 = sheetArray as []
              tmpColumnData.push(tmp1[item][0])
              tmpValueData.push(tmp1[item][1])
          }
        }
        useCount++
      }
      //更新数据
      colunmData.value = tmpColumnData
      valueData.value = tmpValueData
      seriesData.value = tranObjAndColumn([
        colunmData.value, valueData.value
      ])
      //更新图表
      canvasHandle('data')
      //更新表格
      rowsData.value = toSpreadsheetData([
        colunmData, valueData
      ])
    } catch (e) {
      console.log('error')
      console.log(e)
    }
  }
  fileReader.readAsArrayBuffer(_file)
}

//当超出限制时，执行的钩子函数
//这里覆盖前一个文件
const handleExceed: UploadProps['onExceed'] = (files) => {
  dataFileRef.value!.clearFiles()
  const file = files[0] as UploadRawFile
  file.uid = genFileId()
  dataFileRef.value!.handleStart(file)
  dataFileRef.value!.submit()
}

//copy
// const copyRes = async (resStr: string) => {
//   copy(resStr)
// }

onMounted(() => {
  //初始化数据
  seriesData.value = tranObjAndColumn([
    colunmData.value, valueData.value
  ])
  //init echart dom
  chartDom.value = document.getElementById('main')
  //设置画布宽高
  canvasHandle('size')
  //reload canvas
  reloadCanvas()
  //数据格式转换成
  rowsData.value = toSpreadsheetData([
    colunmData, valueData
  ])
  // console.log(rowsData.value)
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
        <!-- <div class="flex justify-center items-center"> -->
        <div class="flex justify-center items-center max-h-[500px] max-w-[1000px] overflow-auto">
          <div id="main" class="bg-white dark:bg-slate-800"></div>
        </div>
      </div>     
      <div class="w-2/6 ml-3 flex flex-col rounded-lg border border-slate-100 dark:border-slate-700 overflow-hidden">
        <!-- 操作区 -->
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
                  <el-upload
                    v-model:file-list="fileList"
                    class="dataFileRef flex"
                    ref="dataFileRef"
                    accept=".xls,.xlsx,.csv"
                    :http-request="updateDataFile"
                    :on-exceed="handleExceed"
                    :limit="1"
                  >上传数据</el-upload>
                </el-button>
              </el-tooltip>
              <el-button size="small" @click="editData">编辑数据</el-button>
            </div>
          </div>
        </div>
        <!-- 配置区 -->
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
            <!-- 图形类型 -->
            <div>
              <div class="flex items-center gap-1.5 mb-2">
                <div class="w-0.5 h-3.5 bg-purple-500 rounded-full"></div>
                <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide">图形类型</span>
              </div>
              <div class="pl-2">
                <el-radio-group v-model="pieType" size="small" @change="canvasHandle('pieType')">
                  <el-radio-button value="pie">饼图</el-radio-button>
                  <el-radio-button value="doughnut">环形图</el-radio-button>
                </el-radio-group>
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
    
    <el-drawer id="x-spreadsheet" v-model="drawer" direction="btt" custom-class="sheet" style="">
    </el-drawer>

    <!-- desc -->
    <ToolDetail title="描述">
      <el-text>
        饼图通过圆内各扇形的角度展示数据占比关系，环形图（甜甜圈图）在饼图基础上添加内空，是现代 UI 中常见的数据可视化形式。<br>
        可通过右侧"图形类型"一键切换饼图与环形图两种模式。<br>
        在线图表制作工具，在线制作饼图与环形图<br>
        支持导入表格并在线编辑表格生成图表，支持 PNG 和 JPEG 格式导出<br>
        支持超全的自定义配置，轻松实现你的个性化图表需求<br>
      </el-text> 
    </ToolDetail>
  </div>
</template>

<style scoped>
:deep(.el-drawer__body){
  display: none !important;
}
:deep(.el-drawer__header){
  display: none !important;
  margin-bottom: 0 !important;
}
:deep(.el-drawer){
  height: 50% !important;
}
:deep(.el-upload-list){
  display: none !important;
}
</style>
