//对外暴露配置路由(常量路由)
import { filterToolRoutes, parseExcludedTools } from '../utils/toolExclusions'

export const constantRoute = [
  //首页
  {
    path: '/',
    component: () => import('@/components/Home/Home.vue'),
    name: 'home',
    meta: {
      title: '在线工具箱',
      keywords: 'tools-web,在线工具,开发人员工具,时间戳转换,加密,解密,md5,进制转换,二维码,正则表达式,json格式化,照片处理,字数统计',
      description: 'tools-web,在线工具,在线工具大全,开发人员工具,日常生活工具,办公助手,时间戳转换,加密,解密,md5,进制转换,二维码,正则表达式,json格式化,照片处理,字数统计',
    }
  },
  //工具
  {
    path: '/timetran',
    component: () => import('@/components/Tools/TimeTran/TimeTran.vue'),
    name: 'timetran',
    meta: {
      keywords: '时间,日期转换时间戳,Unix时间戳',
      description: 'Unix时间戳转换可以把Unix时间转成北京时间。',
    }
  },
  {
    path: '/md5',
    component: () => import('@/components/Tools/MD5/MD5.vue'),
    name: 'MD5',
    meta: {
      keywords: 'MD5摘要,MD5校验,文件校验,哈希计算',
      description: '在线计算文本或文件的 MD5 摘要，支持16位与32位格式、大小写转换和摘要比对。',
    }
  },
  {
    path: '/json',
    component: () => import('@/components/Tools/JsonTran/JsonTran.vue'),
    name: 'json',
    meta: {
      keywords: 'JSON编辑器,JSON格式化,JSON压缩,JSON转义,JSON校验',
      description: '在线校验、格式化和安全压缩 JSON，支持错误定位、递归键名排序与 JSON 字符串转义。',
    }
  },
  {
    path: '/reg',
    component: () => import('@/components/Tools/RegTest/RegTest.vue'),
    name: 'reg',
    meta: {
      keywords: '正则表达式测试工具,常用正则表达式,在线正则表达式',
      description: '正则表达式测试工具,常用正则表达式,在线正则表达式',
    }
  },
  {
    path: '/unicode',
    component: () => import('@/components/Tools/Unicode/Unicode.vue'),
    name: 'unicode',
    meta: {
      keywords: '在线Unicode编码转换，中文转Unicode，Unicode转中文',
      description: '在线Unicode编码转换，中文转Unicode，Unicode转中文，在文本框里输入要转换的内容，然后点击要转换的类型按钮，转换完成后即可看到对应的内容。..',
    }
  },
  {
    path: '/wordcount',
    component: () => import('@/components/Tools/WordCount/WordCount.vue'),
    name: 'wordcount',
    meta: {
      keywords: '在线字数计算器,计算字数,在线字数统计器,字数计数器',
      description: '在线字数计数器,主要是方便计算字数，以控制文字数量的小工具(小说作者、论文、文案文档、文字编辑必备工具)。',
    }
  },
  {
    path: '/scaletran',
    component: () => import('@/components/Tools/ScaleTran/ScaleTran.vue'),
    name: 'scaletran',
    meta: {
      keywords: '进制转换,进制转换工具,10进制转2进制,2进制转10进制,10进制转62进制,62进制转10进制',
      description: '常用进制转换工具，支持32进制以上进制转换',
    }
  },
  {
    path: '/signimage',
    component: () => import('@/components/Tools/ImageStudio/ImageStudio.vue'),
    name: 'signimage',
    meta: {
      keywords: '在线图片处理,在线图片裁剪,图片标注,图片滤镜,图片画笔,图片旋转,图片文字,图片尺寸调整',
      description: '在线图片裁剪、标注、滤镜、画笔、旋转、文字与尺寸调整等操作，全部在浏览器本地完成',
    }
  },
  {
    path: '/randompassword',
    component: () => import('@/components/Tools/RandomPassword/RandomPassword.vue'),
    name: 'random_password',
    meta: {
      keywords: '在线生成随机密码，批量生成随机密码，密码生成',
      description: '在线随机密码生成',
    }
  },
  {
    path: '/urlencode',
    component: () => import('@/components/Tools/UrlEncode/UrlEncode.vue'),
    name: 'urlencode',
    meta: {
      keywords: 'url编码，url解码，url加密，url解密',
      description: '在线url编码，在线url解码工具',
    }
  },
  {
    path: '/ascii',
    component: () => import('@/components/Tools/ASCII/ASCII.vue'),
    name: 'ascii',
    meta: {
      keywords: 'ASCII码表,ASCII字符,ASCII转换,十六进制,二进制,控制字符,Windows-1252',
      description: '搜索、筛选和换算 ASCII 字符，集中查看十进制、十六进制、二进制、Unicode 与 HTML 实体。',
    }
  },
  {
    path: '/uuid',
    component: () => import('@/components/Tools/UUID/UUID.vue'),
    name: 'uuid',
    meta: {
      keywords: 'UUID生成器',
      description: 'uuid生成器，批量uuid生成',
    }
  },
  {
    path: '/barrage',
    component: () => import('@/components/Tools/Barrage/Barrage.vue'),
    name: 'barrage',
    meta: {
      keywords: '手持弹幕,全屏弹幕,滚动文字,应援屏,大字展示',
      description: '支持多条消息、滚动与常亮模式、场景配色、方向控制和对比度检查的手持弹幕',
    }
  },
  {
    path: '/unit',
    component: () => import('@/components/Tools/Unit/Length.vue'),
    name: 'unit',
    // 兼容旧版 /unit/?active=xxx 分享链接：按参数重定向到独立分类路径
    beforeEnter: (to) => {
      const active = to.query.active
      if (typeof active === 'string') {
        const alias: Record<string, string> = { length: 'length', area: 'area', weight: 'weight', time: 'time', temperature: 'temperature', pressure: 'pressure', heat: 'heat', power: 'power' }
        return { path: `/${alias[active] ?? 'length'}`, replace: true }
      }
    },
    meta: {
      keywords: '单位换算,长度,面积,重量,时间,温度,压力,能量,功率,公制,市制,英制',
      description: '统一换算长度、面积、重量、时间、温度、压力、能量和功率，一次输入查看全部单位与定义说明',
    }
  },
  {
    path: '/length',
    component: () => import('@/components/Tools/Unit/Length.vue'),
    name: 'unit-length',
    meta: {
      keywords: '长度换算,长度转换,公里,米,英里,海里,市制,英制,公制',
      description: '支持公制、中国市制、英美制与航海长度，采用英寸、海里等精确定义',
    }
  },
  {
    path: '/area',
    component: () => import('@/components/Tools/Unit/Area.vue'),
    name: 'unit-area',
    meta: {
      keywords: '面积换算,面积转换,亩,公顷,英亩,平方千米,平方米',
      description: '支持公制土地面积、中国市制与英美面积，包含亩、公顷、英亩等常用单位',
    }
  },
  {
    path: '/weight',
    component: () => import('@/components/Tools/Unit/Weight.vue'),
    name: 'unit-weight',
    meta: {
      keywords: '重量换算,重量转换,千克,磅,盎司,金衡制,市制',
      description: '支持公制、中国市制、常衡制和金衡制，并区分日常盎司与金衡盎司',
    }
  },
  {
    path: '/time',
    component: () => import('@/components/Tools/Unit/Time.vue'),
    name: 'unit-time',
    meta: {
      keywords: '时间换算,时间转换,秒,分钟,小时,天,月,年',
      description: '支持纳秒至平均公历年，并明确区分固定时长与月、年的日历近似值',
    }
  },
  {
    path: '/temperature',
    component: () => import('@/components/Tools/Unit/Temperature.vue'),
    name: 'unit-temperature',
    meta: {
      keywords: '温度换算,温度转换,摄氏,华氏,开尔文,列氏,兰氏',
      description: '摄氏、华氏、开尔文、列氏和兰氏实时互转，并检查绝对零度边界',
    }
  },
  {
    path: '/pressure',
    component: () => import('@/components/Tools/Unit/Pressure.vue'),
    name: 'unit-pressure',
    meta: {
      keywords: '压力换算,压力转换,帕斯卡,巴,大气压,托,毫米汞柱,psi',
      description: '覆盖 Pa、bar、atm、Torr、mmHg、psi 等工程、气象和轮胎常用单位',
    }
  },
  {
    path: '/heat',
    component: () => import('@/components/Tools/Unit/Heat.vue'),
    name: 'unit-heat',
    meta: {
      keywords: '能量换算,能量转换,瓦时,焦耳,卡路里,BTU,电子伏特',
      description: '覆盖 Wh、J、cal、BTU 与电子伏特，可处理电能、机械能和热量换算',
    }
  },
  {
    path: '/power',
    component: () => import('@/components/Tools/Unit/Power.vue'),
    name: 'unit-power',
    meta: {
      keywords: '功率换算,功率转换,瓦,千瓦,马力,BTU/h,kcal/h',
      description: '覆盖 W、kW、机械马力、公制马力、BTU/h 与 kcal/h 等功率单位',
    }
  },
  {
    path: '/qrcode',
    component: () => import('@/components/Tools/Qrcode/Qrcode.vue'),
    name: 'qrcode',
    meta: {
      keywords: '二维码,qrcode,二维码制作,二维码生成,微信二维码',
      description: '在线生成二维码,logo二维码',
    }
  },
  {
    path: '/decision',
    component: () => import('@/components/Tools/Decision/Decision.vue'),
    name: 'decision',
    meta: {
      keywords: '选择困难，难以决定，今天吃什么，现在做什么，自定义选项都给你安排的明明白白',
      description: '选择困难症，自定义选择内容',
    }
  },
  {
    path: '/morse',
    component: () => import('@/components/Tools/Morse/Morse.vue'),
    name: 'morse',
    meta: {
      keywords: 'morse电码,摩斯电码',
      description: '摩斯电码编码解码',
    }
  },
  {
    path: '/random',
    component: () => import('@/components/Tools/Random/Random.vue'),
    name: 'random',
    meta: {
      keywords: '随机数生成,随机数',
      description: '可定制范围内进行随机数字，可用于抽奖、点名等用途',
    }
  },
  {
    path: '/numbertochinese',
    component: () => import('@/components/Tools/NumberToChinese/NumberToChinese.vue'),
    name: 'numberToChinese',
    meta: {
      keywords: '数字转中文,数字转大写,中文转数字,大写转数字,数字中文互转',
      description: '在线数字一键转换成人民币大写，中文大写金额数字应用正楷或行书填写',
    }
  },
  {
    path: '/diff',
    component: () => import('@/components/Tools/Diff/Diff.vue'),
    name: 'diff',
    meta: {
      keywords: '文本对比,差异比对,代码对比,忽略空格,差异导出,diff',
      description: '并排、混合或逐行对比中英文与代码，支持忽略空白和大小写、变更统计、文件导入与 .diff 导出。',
    }
  },
  {
    path: '/markdown',
    component: () => import('@/components/Tools/Markdown/Markdown.vue'),
    name: 'markdown',
    meta: {
      keywords: 'Markdown编辑器,Markdown实时预览,Markdown模板,Markdown导出,本地草稿',
      description: '实时编写与预览 Markdown，支持模板、本地草稿、文档统计和 MD/HTML 导出。',
    }
  },
  {
    path: '/spreadsheet-converter',
    component: () => import('@/components/Tools/SpreadsheetConverter/SpreadsheetConverter.vue'),
    name: 'spreadsheetConverter',
    meta: {
      keywords: 'XLSX转CSV,Excel转JSON,CSV转Excel,JSON转XLSX,在线表格编辑,工作表转换',
      description: '直接粘贴 CSV / TSV 或 JSON 转成可视表格，也可导入工作簿在线编辑，再输出为 XLSX、CSV 或 JSON。',
    }
  },
  {
    path: '/bar',
    component: () => import('@/components/Tools/Chart/Bar/Bar.vue'),
    name: 'bar',
    meta: {
      keywords: '柱状图,横向柱状图,条形图,CSV图表,ECharts配置,PNG导出',
      description: '直接编辑表格或粘贴 Excel / WPS 数据，实时生成柱状图与横向排行，也支持 CSV、TSV、JSON、主题配色与高清导出。',
    }
  },
  {
    path: '/line',
    component: () => import('@/components/Tools/Chart/Line/Line.vue'),
    name: 'line',
    meta: {
      keywords: '折线图,面积图,趋势图,CSV图表,ECharts配置,PNG导出',
      description: '使用表格或 JSON 实时制作折线图与面积图，支持平滑曲线、坐标轴、标签、主题配色和高清导出。',
    }
  },
  {
    path: '/pie',
    component: () => import('@/components/Tools/Chart/Pie/Pie.vue'),
    name: 'pie',
    meta: {
      keywords: '饼图,环形图,占比图,JSON图表,ECharts配置,PNG导出',
      description: '实时制作饼图与环形图，支持占比示例、数据校验、图例标签、成套配色、配置复制与 PNG 导出。',
    }
  },
  {
    path: '/scatter',
    component: () => import('@/components/Tools/Chart/Scatter/Scatter.vue'),
    name: 'scatter',
    meta: {
      keywords: '散点图,气泡图,相关性,二维数据,CSV图表,ECharts配置',
      description: '输入 X、Y 与可选名称制作散点图，支持标准点和强调气泡、轴标题、数据校验、主题配色与高清导出。',
    }
  },
  {
    path: '/funnel',
    component: () => import('@/components/Tools/Chart/Funnel/Funnel.vue'),
    name: 'funnel',
    meta: {
      keywords: '漏斗图,转化漏斗,流程分析,CSV图表,ECharts配置,PNG导出',
      description: '用表格或 JSON 制作转化漏斗，支持阶段排序、内外标签、示例数据、配置复制与高清 PNG 导出。',
    }
  },
  {
    path: '/radar',
    component: () => import('@/components/Tools/Chart/Radar/Radar.vue'),
    name: 'radar',
    meta: {
      keywords: '雷达图,能力图,多系列雷达图,CSV图表,ECharts配置',
      description: '使用多系列宽表制作雷达图，支持每维最大值、自动刻度、多边形与圆形、主题配色和高清导出。',
    }
  },
  {
    path: '/gauge',
    component: () => import('@/components/Tools/Chart/Gauge/Gauge.vue'),
    name: 'gauge',
    meta: {
      keywords: '仪表盘,进度指针,多指标仪表盘,范围校验,ECharts配置',
      description: '制作单指标或多指标仪表盘，支持范围越界提示、刻度、单位、指针与进度盘切换及高清导出。',
    }
  },
  {
    path: '/heatmap',
    component: () => import('@/components/Tools/Chart/Heatmap/Heatmap.vue'),
    name: 'heatmap',
    meta: {
      keywords: '热力图,二维矩阵,色阶图,CSV图表,ECharts配置',
      description: '使用 X、Y 分类和数值生成二维热力矩阵，支持结构校验、自动色阶、数值标签、颜色端点和高清导出。',
    }
  },
  {
    path: '/candlestick',
    component: () => import('@/components/Tools/Chart/Candlestick/Candlestick.vue'),
    name: 'candlestick',
    meta: {
      keywords: 'K线图,蜡烛图,OHLC,开盘收盘,行情图表',
      description: '录入日期与开收低高数据生成 K 线图，提供 OHLC 关系校验、涨跌色、数据缩放和高清 PNG 导出。',
    }
  },
  {
    path: '/stack',
    component: () => import('@/components/Tools/Chart/Stack/Stack.vue'),
    name: 'stack',
    meta: {
      keywords: '堆叠柱状图,堆叠面积图,多系列,宽表,ECharts配置',
      description: '使用多系列宽表生成堆叠柱与堆叠面积线，支持总量标签、图例、主题配色、配置复制和高清导出。',
    }
  },
  {
    path: '/treemap',
    component: () => import('@/components/Tools/Chart/Treemap/Treemap.vue'),
    name: 'treemap',
    meta: {
      keywords: '矩形树图,Treemap,层级路径,父子关系,层级占比,ECharts配置',
      description: '用斜线路径构建多层矩形树图，提供父子关系校验、钻取深度、面包屑、配置复制和高清 PNG 导出。',
    }
  },
  {
    path: '/sankey',
    component: () => import('@/components/Tools/Chart/Sankey/Sankey.vue'),
    name: 'sankey',
    meta: {
      keywords: '桑基图,流量流向,Sankey,节点关系,环路校验,ECharts配置',
      description: '录入来源、目标与流量生成桑基图，自动检查重复、自环和成环连线，支持布局配置与高清 PNG 导出。',
    }
  },
  {
    path: '/boxplot',
    component: () => import('@/components/Tools/Chart/Boxplot/Boxplot.vue'),
    name: 'boxplot',
    meta: {
      keywords: '箱线图,Box Plot,原始样本,五数概括,四分位数,异常值',
      description: '从原始样本计算五数概括与 Tukey 异常值，或直接录入统计摘要，支持多组比较、配置复制和高清导出。',
    }
  },
  {
    path: '/calendar',
    component: () => import('@/components/Tools/Chart/Calendar/Calendar.vue'),
    name: 'calendar',
    meta: {
      keywords: '日历图,活跃度,年度热图,日期校验,缺失日期,ECharts配置',
      description: '校验每日数据并生成年度日历热图，支持多年份切换、缺失日期统计、色阶配置和高清 PNG 导出。',
    }
  },
  {
    path: '/coin',
    component: () => import('@/components/Tools/Coin/Coin.vue'),
    name: 'coin',
    meta: {
      keywords: '抛硬币,硬币',
      description: '在线抛硬币，选择困难那么交给硬币来帮你选择吧',
    }
  },
  {
    path: '/dice',
    component: () => import('@/components/Tools/Dice/Dice.vue'),
    name: 'dice',
    meta: {
      keywords: '投骰子,骰子,自定义骰子',
      description: '在线投骰子，可自定义骰子数量，简单好用的骰子工具',
    }
  },
  {
    path: '/textremoveduplicate',
    component: () => import('@/components/Tools/TextRemoveDuplicate/TextRemoveDuplicate.vue'),
    name: 'textRemoveDuplicate',
    meta: {
      keywords: '文本去重,文本排重，文本去除重复',
      description: '可以删除或去除文本或字符串中的重复行',
    }
  },
  {
    path: '/imgcut',
    component: () => import('@/components/Tools/ImgCut/ImgCut.vue'),
    name: 'imgCut',
    meta: {
      keywords: '图片分割,图片切割,四宫格,九宫格,自定义网格,ZIP导出',
      description: '按自定义行列精确分割图片，支持切线预览、余数像素完整覆盖、单片下载和 ZIP 批量导出',
    }
  },
  {
    path: '/choyen5000',
    component: () => import('@/components/Tools/Choyen5000/Choyen5000.vue'),
    name: 'choyen5000',
    meta: {
      keywords: '5000兆円,金属标题,表情包生成,透明PNG,文字图片生成',
      description: '生成红金与银色错位金属标题，支持拖拽定位、透明背景、经典副标题和多倍率 PNG 导出',
    }
  },
  {
    path: '/pornhublogo',
    component: () => import('@/components/Tools/PornhubLogo/PornhubLogo.vue'),
    name: 'pornhublogo',
    meta: {
      keywords: '双栏Logo,徽标生成,黑橙Logo,头像生成,透明PNG',
      description: '实时生成可自定义文字、配色、圆角、画布形状和清晰倍率的双栏徽标 PNG',
    }
  },
  {
    path: '/bluearchive',
    component: () => import('@/components/Tools/BlueArchive/BlueArchive.vue'),
    name: 'bluearchive',
    meta: {
      keywords: 'BlueArchive,蔚蓝档案Logo,碧蓝档案,标题生成,透明PNG,同人Logo',
      description: '生成蔚蓝档案视觉语言启发的双栏标题，支持光环定位、透明背景和多倍率 PNG 导出',
    }
  },
  {
    path: '/electronicpatina',
    component: () => import('@/components/Tools/ElectronicPatina/ElectronicPatina.vue'),
    name: 'electronicpatina',
    meta: {
      keywords: '电子包浆,图片做旧,JPEG压缩,图片失真,图片处理,梗图',
      description: '使用预设或自定义压缩配方模拟图片多次转发后的色偏、噪点与 JPEG 做旧效果',
    }
  },
  {
    path: '/httpstatuscode',
    component: () => import('@/components/Tools/HttpStatusCode/HttpStatusCode.vue'),
    name: 'HttpStatusCode',
    meta: {
      keywords: 'http状态码',
      description: '所有http状态对应的名称和含义解释',
    }
  },
  {
    path: '/jwt',
    component: () => import('@/components/Tools/JWT/JWT.vue'),
    name: 'jwt',
    meta: {
      keywords: 'jwt解析,jwt解码，JSON Web Token解析',
      description: '解析和解码JSON Web Token（jwt）',
    }
  },
  {
    path: '/htmlentity',
    component: () => import('@/components/Tools/HtmlEntity/HtmlEntity.vue'),
    name: 'HtmlEntity',
    meta: {
      keywords: 'html实体转义',
      description: 'html实体转义，实体转义成html',
    }
  },
  {
    path: '/colorpicker',
    component: () => import('@/components/Tools/ColorPicker/ColorPicker.vue'),
    name: 'ColorPicker',
    meta: {
      keywords: '颜色选择器,颜色转换,HEX,RGB,HSL,LAB,LCH,CMYK,WCAG对比度,色阶',
      description: '转换常用颜色格式、生成 50–900 色阶，并检查正文、大号文字和 UI 图形的 WCAG 对比度。',
    }
  },
  {
    path: '/fontpreview',
    component: () => import('@/components/Tools/FontPreview/FontPreview.vue'),
    name: 'fontPreview',
    meta: {
      keywords: '字体预览,本地字体,字体标本,字号瀑布,CSS字体,font preview',
      description: '使用真实样文和字号瀑布检查字体，支持内置字体栈、字体文件、本机字体及排版 CSS 复制',
    }
  },
  {
    path: '/cron',
    component: () => import('@/components/Tools/Cron/Cron.vue'),
    name: 'cron',
    meta: {
      keywords: 'cron,cron表达式,cron生成,cron解析,执行时间,定时任务,crontab',
      description: '生成和解析五位或六位 CRON 表达式，提供自然语言摘要、字段解释和后续执行时间计划。',
    }
  },
  {
    path: '/asciiwordpic',
    component: () => import('@/components/Tools/ASCIIWordPic/ASCIIWordPic.vue'),
    name: 'asciiWordPic',
    meta: {
      keywords: 'ASCII画,FIGlet,字符画,字形生成器,终端标题',
      description: '使用本地 FIGlet 字体实时生成 ASCII 字形，支持版式调节、复制和 TXT 下载',
    }
  },
  {
    path: '/jsformat',
    alias: '/jsforamt',
    component: () => import('@/components/Tools/JSFormat/JSFormat.vue'),
    name: 'JSFormat',
    meta: {
      keywords: 'JavaScript代码格式化,JS格式化,JS压缩,Terser压缩',
      description: '在线校验、格式化与压缩 JavaScript，支持目标语法、模块模式、变量改名和 Console 移除选项。',
    }
  },
  {
    path: '/htmlformat',
    component: () => import('@/components/Tools/HtmlFormat/HtmlFormat.vue'),
    name: 'HtmlFormat',
    meta: {
      keywords: 'HTML格式化,HTML压缩,XML格式化,XML校验',
      description: '在线格式化 HTML 与 XML，支持 XML 结构校验、标记统计和保护敏感内容块的保守压缩。',
    }
  },
  {
    path: '/cssformat',
    component: () => import('@/components/Tools/CssFormat/CssFormat.vue'),
    name: 'CssFormat',
    meta: {
      keywords: 'CSS格式化,CSS压缩,CSSO优化,CSS校验',
      description: '在线格式化、解析和优化压缩 CSS，支持结构重组、许可证注释保留与压缩收益统计。',
    }
  },
  {
    path: '/textedit',
    component: () => import('@/components/Tools/TextEdit/TextEdit.vue'),
    name: 'TextEdit',
    meta: {
      keywords: '富文本编辑器,在线HTML编辑,HTML源码,纯文本导出,本地草稿',
      description: '可视化编辑富文本，实时获取 HTML 与纯文本，支持模板、本地草稿和多格式导出。',
    }
  },
  {
    path: '/miragetank',
    component: () => import('@/components/Tools/MirageTank/MirageTank.vue'),
    name: 'miragetank',
    meta: {
      keywords: '光棱坦克,幻影坦克,图片隐写,图片混合,图片还原',
      description: '在稳定画布中混合两张图片，提供效果预设、明暗背景检查、自动显形和原尺寸 PNG 导出',
    }
  },
  // 关于
  {
    path: '/about',
    component: () => import('@/components/Home/About.vue'),
    name: 'about',
    meta: {
      title: "关于",
      keywords: '关于工具站',
      description: '',
    }
  },
  {
    path: '/urlunshorten',
    component: () => import('@/components/Tools/UrlUnshorten/UrlUnshorten.vue'),
    name: 'urlUnshorten',
    meta: {
      keywords: '短链接解析,短链接还原,URL还原,去跟踪参数,url追踪',
      description: '本地检查链接结构并清理营销参数，配置解析服务后可安全追踪重定向并查看完整跳转链路',
    }
  },
  {
    path: '/headsticker',
    component: () => import('@/components/Tools/HeadSticker/HeadSticker.vue'),
    name: 'headSticker',
    meta: {
      keywords: '接头霸王,凯露,贴纸,图片合成,哈基米,耄耋,趣味工具',
      description: '上传底图并组合内置或自定义头像贴纸，支持图层、复制、翻转、删除和原图分辨率导出',
    }
  },
  {
    path: '/romaji',
    component: () => import('@/components/Tools/Romaji/Romaji.vue'),
    name: 'romaji',
    meta: {
      keywords: '日语罗马音,日文罗马音,假名转罗马音,平假名,片假名,罗马字,wanakana',
      description: '支持日语假名快速转换与汉字精准读音分析，可对照罗马音、平假名、片假名和词元信息',
    }
  },
  {
    path: '/japaneseverb',
    component: () => import('@/components/Tools/JapaneseVerb/JapaneseVerb.vue'),
    name: 'japaneseverb',
    meta: {
      keywords: '日语动词变化,日语动词活用,日语变形,五段动词,一段动词,サ变动词,カ变动词',
      description: '输入日语动词的任意常见形式，查看原形候选、推断置信度、分类活用卡片与て形、た形速查表',
    }
  },
  {
    path: '/japaneselyrics',
    component: () => import('@/components/Tools/JapaneseLyrics/JapaneseLyrics.vue'),
    name: 'japaneselyrics',
    meta: {
      keywords: '日语歌词,歌词学习,LRC歌词,日语罗马音,日语助词,日语活用,双语歌词',
      description: '把日语歌词或 LRC 整理成逐行学习稿，支持精准读音、专注模式、学习进度、复制和 TXT 导出',
    }
  },
  {
    path: '/memecaption',
    component: () => import('@/components/Tools/MemeCaption/MemeCaption.vue'),
    name: 'memecaption',
    meta: {
      keywords: '表情包,字幕,配字,meme,图片加字,自动换行,梗图生成',
      description: '为图片添加自动换行字幕，支持视觉模板、顶部或底部位置、文字描边、多尺寸和 JPG/PNG 导出',
    }
  },
  {
    path: '/imgstitch',
    component: () => import('@/components/Tools/ImgStitch/ImgStitch.vue'),
    name: 'imgstitch',
    meta: {
      keywords: '图片拼接,纵向拼接,横向拼接,影视台词拼接,图片合并,拼图',
      description: '纵向、横向和影视台词拼接，支持拖拽与手机按钮排序、画布安全检查，实时预览并导出 JPG/PNG/WebP',
    }
  },
  {
    path: '/animationmaker',
    component: () => import('@/components/Tools/AnimationMaker/AnimationMaker.vue'),
    name: 'animationmaker',
    meta: {
      keywords: '动图制作,GIF制作,动画PNG,APNG,精灵图切割,PNG序列,逐帧动画',
      description: '导入图片、ZIP 或精灵图，排序并设置逐帧延时，实时预览后导出 GIF、PNG、APNG 或素材 PNG 序列',
    }
  },
  {
    path: '/riddleman',
    component: () => import('@/components/Tools/RiddleMan/RiddleMan.vue'),
    name: 'riddleman',
    meta: {
      keywords: '谜语人,佛曰,如是我闻,与佛论禅,加密,编码,趣味',
      description: '佛曰、如是我闻、兽语与 Base 编码统一互转，支持七种结果对照、方案说明和本次转换历史。',
    }
  },
  {
    path: '/exifviewer',
    component: () => import('@/components/Tools/ExifViewer/ExifViewer.vue'),
    name: 'exifviewer',
    meta: {

      keywords: 'EXIF,照片信息,拍摄参数,GPS定位,去除EXIF,图片元数据,相机参数,光圈快门ISO',
      description: '查看、检索并导出照片元数据，集中提示位置、时间、设备等隐私字段并生成去除 EXIF 的副本',
    }
  },
  {
    path: '/icotool',
    component: () => import('@/components/Tools/IcoTool/IcoTool.vue'),
    name: 'icotool',
    meta: {

      keywords: 'ico图标生成,favicon生成,图标尺寸转换,png转ico,应用图标,圆角图标',
      description: '按网站、Windows 或应用场景生成多尺寸 PNG 与多图层 ICO，支持裁切、圆角、底色、清晰度检查及 ZIP 交付',
    }
  },
  {
    path: '/coordtransform',
    component: () => import('@/components/Tools/CoordTransform/CoordTransform.vue'),
    name: 'coordtransform',
    meta: {

      keywords: '地图坐标系互转,WGS84,CGCS2000,GCJ-02,BD-09,EPSG:3857,Web Mercator,经纬度转换,地图选点',
      description: '支持五种坐标系单点与批量互转，提供地图选点、Excel 粘贴、逐行校验及 CSV、JSON 导出',
    }
  },
  {
    path: '/ipcalc',
    component: () => import('@/components/Tools/IPCalc/IPCalc.vue'),
    name: 'ipcalc',
    meta: {

      keywords: 'IP计算器,子网掩码,CIDR,网络地址,广播地址,IP进制转换,子网划分',
      description: '快速计算 CIDR 边界、地址属性与可用主机范围，支持子网拆分规划、IP 进制转换及掩码换算',
    }
  },
  {
    path: '/base64',
    component: () => import('@/components/Tools/Base64/Base64.vue'),
    name: 'base64',
    meta: {
      keywords: 'Base64编码,Base64解码,Base64 URL,Data URL,文件转Base64,Base64转文件',
      description: '在浏览器本地进行 UTF-8 文本、Base64 URL、Data URL 与文件的双向转换，支持类型识别、图片预览和文件下载。',
    }
  },
  {
    path: '/hashcalculator',
    component: () => import('@/components/Tools/HashCalculator/HashCalculator.vue'),
    name: 'hashcalculator',
    meta: {

      keywords: '哈希,MD5,SHA1,SHA256,SHA512,HMAC,散列,摘要',
      description: '在线哈希值计算工具，支持 MD5、SHA-1、SHA-256、SHA-512 及 HMAC 系列算法',
    }
  },
  {
    path: '/sqlformat',
    component: () => import('@/components/Tools/SqlFormat/SqlFormat.vue'),
    name: 'sqlformat',
    meta: {

      keywords: 'SQL,格式化,美化,压缩,MySQL,PostgreSQL,SQLite,T-SQL',
      description: '在线 SQL 格式化与压缩工具，支持 MySQL、PostgreSQL、SQLite、T-SQL 等多种方言',
    }
  },
  {
    path: '/storageconverter',
    component: () => import('@/components/Tools/StorageConverter/StorageConverter.vue'),
    name: 'storageconverter',
    meta: {

      keywords: '存储,单位换算,bit,字节,KB,MB,GB,TB,PB,EB',
      description: '在线数据存储单位换算工具，支持 bit、B、KB、MB、GB、TB、PB、EB 互转',
    }
  },
  {
    path: '/textreplace',
    component: () => import('@/components/Tools/TextReplace/TextReplace.vue'),
    name: 'textreplace',
    meta: {
      keywords: '文本,替换,查找,正则,批量替换',
      description: '在线文本查找替换工具，支持普通文本和正则表达式，实时预览替换结果',
    }
  },
  {
    path: '/wordfrequency',
    component: () => import('@/components/Tools/WordFrequency/WordFrequency.vue'),
    name: 'wordfrequency',
    meta: {
      keywords: '词频,统计,文本分析,关键词,词频分析',
      description: '在线词频统计工具，分析文本中各词出现频率，适合关键词提取和文本分析',
    }
  },
  {
    path: '/imagecolorpicker',
    component: () => import('@/components/Tools/ImageColorPicker/ImageColorPicker.vue'),
    name: 'imagecolorpicker',
    meta: {
      keywords: '取色,颜色提取,图片颜色,HEX,RGB,HSL,滴管',
      description: '上传图片后点击任意像素即可取色，同时显示 HEX、RGB、HSL 三种颜色格式',
    }
  },
  {
    path: '/imagewatermark',
    component: () => import('@/components/Tools/ImageWatermark/ImageWatermark.vue'),
    name: 'imagewatermark',
    meta: {
      keywords: '水印,图片,文字水印,平铺水印,图片加字,本地图片处理',
      description: '实时为图片添加单点或平铺文字水印，支持描边、阴影、旋转和多格式导出，全程本地处理',
    }
  },
  {
    path: '/wordcloud',
    component: () => import('@/components/Tools/WordCloud/WordCloud.vue'),
    name: 'wordcloud',
    meta: {
      keywords: '词云,词频,可视化,文字云,ECharts',
      description: '支持中英文分词、停用词过滤、词频明细、实时布局预览，并可导出高清 PNG 与词频 CSV。',
    }
  },
  {
    path: '/reactiontest',
    component: () => import('@/components/Tools/ReactionTest/ReactionTest.vue'),
    name: 'reactiontest',
    meta: {

      keywords: '反应速度,测试,游戏,反应时间,手速',
      description: '趣味反应速度测试，屏幕变绿立即点击，记录反应时间并统计最佳成绩',
    }
  },
  {
    path: '/m3u8player',
    component: () => import('@/components/Tools/M3U8Player/M3U8Player.vue'),
    name: 'm3u8player',
    meta: {

      keywords: 'M3U8,HLS,直播,视频播放,在线播放器',
      description: '在线 M3U8/HLS 视频流播放器，基于 hls.js 实现，支持直播和点播',
    }
  },
  {
    path: '/midiplayer',
    component: () => import('@/components/Tools/MidiPlayer/MidiPlayer.vue'),
    name: 'midiplayer',
    meta: {
      keywords: 'MIDI播放器,在线MIDI播放,钢琴卷帘,音符瀑布,MIDI通道,乐器轨道',
      description: '在浏览器本地播放 MIDI 文件，以钢琴卷帘和音符瀑布查看每个乐器通道，并支持静音、独奏与播放列表。',
    }
  },
  {
    path: '/emoji',
    component: () => import('@/components/Tools/Emoji/Emoji.vue'),
    name: 'emoji',
    meta: {

      keywords: 'Emoji,表情,符号,大全,复制',
      description: '按分类浏览和搜索 Emoji，支持一键复制、最近使用以及浏览器本地收藏。',
    }
  },
  {
    path: '/mortgage',
    component: () => import('@/components/Tools/MortgageCalculator/MortgageCalculator.vue'),
    name: 'mortgage',
    meta: {

      keywords: '房贷计算器,组合贷,商业贷款,公积金贷款,等额本息,等额本金,提前还款,月供计算',
      description: '在线房贷计算器，支持商业贷、公积金和组合贷，同时对比等额本息与等额本金，并模拟利率变化、提前还款、每月多还及房价变化',
    }
  },
  {
    path: '/retirement',
    component: () => import('@/components/Tools/RetirementCalculator/RetirementCalculator.vue'),
    name: 'retirement',
    meta: {

      keywords: '延迟退休计算器,法定退休年龄,退休年龄对照表,弹性退休,退休时间,最低缴费年限',
      description: '根据出生年月和人员类别计算渐进式延迟退休后的法定退休年龄、退休年月、延迟月数、弹性退休区间及最低缴费年限',
    }
  },
  //其他路由
  {
    path: '/404',
    component: () => import('@/components/404/404.vue'),
    name: '404',
    meta: {
      title: "404"
    }
  },
  {
    //重定向
    path: '/:pathMatch(.*)*',
    redirect: '/404',
    name: 'Any',
  },
]

/** Return the route table for the current build profile. */
export function getEnabledRoutes(excludedToolsValue: string | undefined) {
  return filterToolRoutes(constantRoute, parseExcludedTools(excludedToolsValue))
}
