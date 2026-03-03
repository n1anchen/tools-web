/**
 * 转换成Spreadsheet数据格式
 */
export function toSpreadsheetData(data, type = 'bar') {
  let res = {}
  let columnLen = data[0].value.length
  switch(type) {
    case 'bar':
      for (let i = 0; i < columnLen; i++) {
        res[i] = {
          cells: {
            0: {text: String(data[0].value[i] ?? '')},
            1: {text: String(data[1].value[i] ?? '')}
          }
        }
      }
      break;
    default:
      break;
  }
  return res
}

/**
 * 转换成echarts使用的数据 - 基础格式(适用于柱状图、折线图等)
 */
export function toEchartsData(data) {
  let tmpColumn: Array<any> = [];
  let tmpValue: Array<any> = [];
  for (let item in data.rows) {
    if (item == 'len') {
      continue
    }
    tmpColumn.push(data.rows[item]['cells'][0] ? data.rows[item]['cells'][0]['text'] : '')
    tmpValue.push(data.rows[item]['cells'][1] ? data.rows[item]['cells'][1]['text'] : '')
  }
  return [tmpColumn, tmpValue];
}

/**
 * 转换成echarts使用的数据 - 适用于饼图
 * 
 * @param data 
 * @returns 
 */
export function toEchartsPieData(data) {
  let tmpArr: Array<Object> = []
  for (let item in data.rows) {
    if (item == 'len') {
      continue
    }
    tmpArr.push({
      name: data.rows[item]['cells'][0] ? data.rows[item]['cells'][0]['text'] : '',
      value: data.rows[item]['cells'][1] ? data.rows[item]['cells'][1]['text'] : ''
    })
    // tmpColumn.push(data.rows[item]['cells'][0] ? data.rows[item]['cells'][0]['text'] : '')
    // tmpValue.push(data.rows[item]['cells'][1] ? data.rows[item]['cells'][1]['text'] : '')
  }
  return tmpArr;
}

/**
 * 数据格式转换 - 根据type转换格式
 * 对象格式{name: '', value: ''};  列格式： nameArr = [], valueArr = []
 * @param data 
 * @returns 
 */
export function tranObjAndColumn(data, type = 'toObj') {
  let returnData = [] as any[];
  if (type == 'toObj') {
    if (data.len === 0 || data[0].len === 0) {
      return returnData;
    }
    //转换成饼图使用的obj
    let nameArr = data[0];
    let valueArr = data[1];
    let tmpArr: Array<Object> = []

    for (let item in nameArr) {
      if (item == 'len') {
        continue
      }
      tmpArr.push({
        name: nameArr[item] ? nameArr[item] : '',
        value: valueArr[item] ? valueArr[item] : '',
      })
    }
    returnData = tmpArr
  } else if (type == 'toColumn') {
    //饼图对象转换成列数组
    let nameArr = [] as string[]
    let valueArr = [] as number[]
    for (let item in data) {
      nameArr.push(data[item]?.name)
      valueArr.push(data[item]?.value)
    }
    returnData = [nameArr, valueArr]
  } else if (type == "toCoord") {
    //转换成坐标(散点图用到)
    if (data.len === 0 || data[0].len === 0) {
      return returnData;
    }
    //转换成饼图使用的obj
    let nameArr = data[0];
    let valueArr = data[1];
    let tmpArr: Array<any> = []

    for (let item in nameArr) {
      if (item == 'len') {
        continue
      }
      tmpArr.push([
        nameArr[item] ? nameArr[item] : 0,
        valueArr[item] ? valueArr[item] : 0,
      ])
    }
    returnData = tmpArr
  }
  return returnData;
}


/**
 * 转换成3列 Spreadsheet 格式（热力图：x, y, value）
 */
export function toSpreadsheetData3Col(data) {
  let res = {}
  const xArr = data[0].value
  const yArr = data[1].value
  const vArr = data[2].value
  for (let i = 0; i < xArr.length; i++) {
    res[i] = {
      cells: {
        0: { text: xArr[i] ?? '' },
        1: { text: yArr[i] ?? '' },
        2: { text: vArr[i] ?? '' },
      }
    }
  }
  return res
}

/**
 * 转换成5列 Spreadsheet 格式（K线图：date, open, close, low, high）
 */
export function toSpreadsheetData5Col(data) {
  let res = {}
  for (let i = 0; i < data[0].value.length; i++) {
    res[i] = {
      cells: {
        0: { text: data[0].value[i] ?? '' },
        1: { text: data[1].value[i] ?? '' },
        2: { text: data[2].value[i] ?? '' },
        3: { text: data[3].value[i] ?? '' },
        4: { text: data[4].value[i] ?? '' },
      }
    }
  }
  return res
}

/**
 * 解析 Spreadsheet 数据为雷达图格式（col0=指标, col1=值）
 * 返回 { indicators: [{name,max}], values: number[] }
 */
export function toEchartsRadarData(data) {
  let indicators: {name:string,max:number}[] = []
  let values: number[] = []
  for (let item in data.rows) {
    if (item === 'len') continue
    const cells = data.rows[item]['cells'] || {}
    const val = parseFloat(cells[1]?.text ?? '0') || 0
    indicators.push({ name: cells[0]?.text ?? '', max: 0 })
    values.push(val)
  }
  const maxVal = Math.max(...values, 1) * 1.2
  indicators.forEach(ind => ind.max = maxVal)
  return { indicators, values }
}

/**
 * 解析 Spreadsheet 数据为仪表盘格式（col0=名称, col1=值 0-100）
 * 返回 [{name, value}]
 */
export function toEchartsGaugeData(data) {
  let arr: {name:string, value:number}[] = []
  for (let item in data.rows) {
    if (item === 'len') continue
    const cells = data.rows[item]['cells'] || {}
    arr.push({
      name: cells[0]?.text ?? '',
      value: parseFloat(cells[1]?.text ?? '0') || 0,
    })
  }
  return arr
}

/**
 * 解析 Spreadsheet 数据为热力图格式（col0=x, col1=y, col2=value）
 * 返回 { xCategories, yCategories, data: [xi, yi, value][] }
 */
export function toEchartsHeatmapData(data) {
  let xSet: string[] = []
  let ySet: string[] = []
  let rawItems: {x:string, y:string, v:number}[] = []
  for (let item in data.rows) {
    if (item === 'len') continue
    const cells = data.rows[item]['cells'] || {}
    const x = cells[0]?.text ?? ''
    const y = cells[1]?.text ?? ''
    const v = parseFloat(cells[2]?.text ?? '0') || 0
    if (!xSet.includes(x)) xSet.push(x)
    if (!ySet.includes(y)) ySet.push(y)
    rawItems.push({ x, y, v })
  }
  const chartData = rawItems.map(item => [xSet.indexOf(item.x), ySet.indexOf(item.y), item.v])
  return { xCategories: xSet, yCategories: ySet, data: chartData }
}

/**
 * 解析 Spreadsheet 数据为 K 线图格式（col0=日期, col1=开, col2=收, col3=低, col4=高）
 * 返回 { dates: string[], values: [open,close,low,high][] }
 */
export function toEchartsCandlestickData(data) {
  let dates: string[] = []
  let values: number[][] = []
  for (let item in data.rows) {
    if (item === 'len') continue
    const cells = data.rows[item]['cells'] || {}
    dates.push(cells[0]?.text ?? '')
    values.push([
      parseFloat(cells[1]?.text ?? '0') || 0,
      parseFloat(cells[2]?.text ?? '0') || 0,
      parseFloat(cells[3]?.text ?? '0') || 0,
      parseFloat(cells[4]?.text ?? '0') || 0,
    ])
  }
  return { dates, values }
}

/**
 * 多系列数据 → Spreadsheet 格式（第1列=分类，第2+列=系列值）
 * data: [{name:string, value:any[]}]  data[0]=分类列, data[1..n]=系列列
 */
export function toSpreadsheetDataNCol(data: {name?:string, value:any[]}[]) {
  const res: Record<string, any> = {}
  const len = data[0]?.value?.length ?? 0
  for (let i = 0; i < len; i++) {
    const cells: Record<number, {text:string}> = {}
    for (let c = 0; c < data.length; c++) {
      cells[c] = { text: String(data[c].value[i] ?? '') }
    }
    res[i] = { cells }
  }
  return res
}

/**
 * Spreadsheet 多列 → 折线/柱状多系列格式
 * 返回 { categories: string[], series: { name: string, data: number[] }[] }
 * 第0列=分类(xAxis), 后续列=各系列
 */
export function toEchartsStackData(data: any) {
  const categories: string[] = []
  const seriesMap: Record<number, number[]> = {}
  let maxCol = 0
  for (const item in data.rows) {
    if (item === 'len') continue
    const cells = data.rows[item]['cells'] || {}
    categories.push(cells[0]?.text ?? '')
    const colKeys = Object.keys(cells).map(Number).filter(k => k > 0)
    if (colKeys.length > 0) maxCol = Math.max(maxCol, ...colKeys)
    for (let c = 1; c <= (maxCol || 1); c++) {
      if (!seriesMap[c]) seriesMap[c] = []
      seriesMap[c].push(parseFloat(cells[c]?.text ?? '0') || 0)
    }
  }
  // ensure we have at least 1 series
  if (Object.keys(seriesMap).length === 0) seriesMap[1] = []
  const series = Object.keys(seriesMap).map(k => ({ name: `系列${k}`, data: seriesMap[Number(k)] }))
  return { categories, series }
}

/**
 * Spreadsheet 3列 → 桑基图格式（col0=source, col1=target, col2=value）
 * 返回 { nodes: {name:string}[], links: {source,target,value}[] }
 */
export function toEchartsSankeyData(data: any) {
  const nodeSet = new Set<string>()
  const links: { source: string; target: string; value: number }[] = []
  for (const item in data.rows) {
    if (item === 'len') continue
    const cells = data.rows[item]['cells'] || {}
    const src = cells[0]?.text ?? ''
    const tgt = cells[1]?.text ?? ''
    const val = parseFloat(cells[2]?.text ?? '0') || 0
    if (!src || !tgt) continue
    nodeSet.add(src)
    nodeSet.add(tgt)
    links.push({ source: src, target: tgt, value: val })
  }
  const nodes = Array.from(nodeSet).map(name => ({ name }))
  return { nodes, links }
}

/**
 * 转换成6列 Spreadsheet 格式（箱线图：分类/min/Q1/median/Q3/max）
 */
export function toSpreadsheetData6Col(data: {value:any[]}[]) {
  const res: Record<string, any> = {}
  const len = data[0]?.value?.length ?? 0
  for (let i = 0; i < len; i++) {
    res[i] = {
      cells: {
        0: { text: String(data[0].value[i] ?? '') },
        1: { text: String(data[1].value[i] ?? '') },
        2: { text: String(data[2].value[i] ?? '') },
        3: { text: String(data[3].value[i] ?? '') },
        4: { text: String(data[4].value[i] ?? '') },
        5: { text: String(data[5].value[i] ?? '') },
      }
    }
  }
  return res
}

/**
 * Spreadsheet 6列 → 箱线图格式（col0=分类, col1-5=min/Q1/median/Q3/max）
 * 返回 { categories: string[], boxData: number[][] }
 */
export function toEchartsBoxplotData(data: any) {
  const categories: string[] = []
  const boxData: number[][] = []
  for (const item in data.rows) {
    if (item === 'len') continue
    const cells = data.rows[item]['cells'] || {}
    categories.push(cells[0]?.text ?? '')
    boxData.push([
      parseFloat(cells[1]?.text ?? '0') || 0,
      parseFloat(cells[2]?.text ?? '0') || 0,
      parseFloat(cells[3]?.text ?? '0') || 0,
      parseFloat(cells[4]?.text ?? '0') || 0,
      parseFloat(cells[5]?.text ?? '0') || 0,
    ])
  }
  return { categories, boxData }
}

/**
 * Spreadsheet 2列 → 日历图格式（col0=日期 YYYY-MM-DD, col1=值）
 * 返回 { data: [date, value][], yearRange: [string, string] }
 */
export function toEchartsCalendarData(data: any) {
  const result: [string, number][] = []
  let minYear = 9999, maxYear = 0
  for (const item in data.rows) {
    if (item === 'len') continue
    const cells = data.rows[item]['cells'] || {}
    const dateStr = cells[0]?.text ?? ''
    const val = parseFloat(cells[1]?.text ?? '0') || 0
    if (!dateStr) continue
    result.push([dateStr, val])
    const year = parseInt(dateStr.substring(0, 4)) || 0
    if (year > 0) {
      minYear = Math.min(minYear, year)
      maxYear = Math.max(maxYear, year)
    }
  }
  if (minYear === 9999) minYear = new Date().getFullYear()
  if (maxYear === 0) maxYear = minYear
  return { data: result, yearRange: [String(minYear), String(maxYear)] }
}

const EchartsUtils = {
  toSpreadsheetData,
  toSpreadsheetData3Col,
  toSpreadsheetData5Col,
  toSpreadsheetDataNCol,
  toSpreadsheetData6Col,
  toEchartsData,
  toEchartsPieData,
  toEchartsRadarData,
  toEchartsGaugeData,
  toEchartsHeatmapData,
  toEchartsCandlestickData,
  toEchartsStackData,
  toEchartsSankeyData,
  toEchartsBoxplotData,
  toEchartsCalendarData,
  tranObjAndColumn,
}
export default EchartsUtils

/**

1: { 
  cells: { 
    0: { text: 'testingtesttestetst' }, 
    2: { text: 'testing' }, 
  }, 
}, 
2: { 
  cells: { 
    0: { text: 'render', style: 0 }, 
    1: { text: 'Hello' }, 
    2: { text: 'haha', merge: [1, 1] }, 
  } 
}, 
8: { 
  cells: { 
    8: { text: 'border test', style: 0 }, 
  } 
} 

 */
