import type { ToolsReqData } from '@/components/Tools/tools.type.ts'

//获取tools分类与对应的工具
export function getToolsCate() {
  return [
    {
      id: 0,
      title: '独立工具',
      icon: '',
      list: [
        {
          id: 0,
          title: 'it-tools工具集',
          logo: 'Tools',
          desc: '各种IT相关的小工具，基于sharevb/it-tools构建',
          url: 'https://it-tools.nianchen.top',
          cateId: 0,
          cate: '独立工具'
        },
        {
          id: 0,
          title: '智能排座工具',
          logo: 'ThLarge',
          desc: '智能排座工具，根据人员名单自动生成排座图，支持拖拽操作',
          url: 'https://seat.nianchen.top',
          cateId: 0,
          cate: '独立工具'
        },
        {
          id: 0,
          title: 'xicons图标库预览',
          logo: 'Icons',
          desc: 'xicons图标库前端页面，方便查看、搜索和选择图标',
          url: 'https://xicons.nianchen.top',
          cateId: 0,
          cate: '独立工具'
        }
      ]
    },
    {
      id: 1,
      title: '在线编辑',
      icon: '',
      list: [
        {
          id: 1,
          title: '字体在线预览',
          logo: 'Font',
          desc: '用真实样文和字号瀑布预览字体，支持本机字体、字体文件与 CSS 复制',
          url: '/fontpreview/',
          cateId: 1,
          cate: '在线编辑'
        },
        {
          id: 1,
          title: '表格数据转换',
          logo: 'FileExcel',
          desc: '直接粘贴 CSV / TSV 或 JSON 转成表格，也可导入工作簿并在线编辑，再输出为 XLSX、CSV 或 JSON',
          url: '/spreadsheet-converter/',
          cateId: 1,
          cate: '在线编辑'
        },
        {
          id: 1,
          title: 'Markdown 工作台',
          logo: 'Markdown',
          desc: '实时编写与预览 Markdown，支持模板、本地草稿、文档统计和 MD/HTML 导出',
          url: '/markdown/',
          cateId: 1,
          cate: '在线编辑'
        },
        {
          id: 1,
          title: 'Json 工作台',
          logo: '/images/logo/json.png',
          desc: '校验、格式化和安全压缩 JSON，支持错误定位、键名排序与字符串转义',
          url: '/json/',
          cateId: 1,
          cate: '在线编辑',
        },
        {
          id: 1,
          title: 'JavaScript 工作台',
          logo: 'Js',
          desc: '使用 Terser 校验、格式化与压缩 JavaScript，提供明确的构建选项',
          url: '/jsformat/',
          cateId: 1,
          cate: '在线编辑',
        },
        {
          id: 1,
          title: 'HTML / XML 工作台',
          logo: 'Html5',
          desc: 'HTML/XML 格式化、XML 结构校验、标记统计与保守压缩',
          url: '/htmlformat/',
          cateId: 1,
          cate: '在线编辑',
        },
        {
          id: 1,
          title: 'CSS 工作台',
          logo: 'Css3',
          desc: 'CSS 格式化、语法解析、结构优化与压缩收益统计',
          url: '/cssformat/',
          cateId: 1,
          cate: '在线编辑',
        },
        {
          id: 1,
          title: '富文本与 HTML 工作台',
          logo: 'Edit',
          desc: '可视化编辑富文本，实时获取 HTML 与纯文本，支持模板、本地草稿和多格式导出',
          url: '/textedit/',
          cateId: 1,
          cate: '在线编辑'
        },
        {
          id: 1,
          title: 'SQL 工作台',
          logo: 'Database',
          desc: '在线 SQL 格式化与压缩工具，支持 MySQL、PostgreSQL、SQLite、T-SQL 等多种方言',
          url: '/sqlformat/',
          cateId: 1,
          cate: '在线编辑',
        },
      ]
    },
    {
      id: 2,
      title: '文本处理',
      icon: '',
      list: [
        {
          id: 1,
          title: '文本对比',
          logo: '/images/logo/diff.png',
          desc: '并排、混合或逐行对比文本，支持忽略规则、变更统计、文件导入和差异导出',
          url: '/diff/',
          cateId: 2,
          cate: '文本处理'
        },
        {
          id: 1,
          title: '字数统计',
          logo: '/images/logo/wordCount.png',
          desc: '在线统计字符串的字数、段落、标点符号数量',
          url: '/wordcount/',
          cateId: 2,
          cate: '文本处理',
        },
        {
          id: 1,
          title: '文本去重',
          logo: '/images/logo/textRemoveDuplicate.png',
          desc: '可以删除或去除文本或字符串中的重复行',
          url: '/textremoveduplicate/',
          cateId: 2,
          cate: '文本处理',
        },
        {
          id: 1,
          title: 'ASCII 字形生成器',
          logo: '/images/logo/ascii_word_pic.png',
          desc: '21 种 FIGlet 字体实时预览，支持版式调节与 TXT 导出',
          url: '/asciiwordpic/',
          cateId: 2,
          cate: '文本处理',
        },
        {
          id: 1,
          title: '日语转罗马音',
          logo: 'Language',
          desc: '支持假名快速转换与汉字精准读音分析，可对照罗马音、平假名、片假名和词元信息',
          url: '/romaji/',
          cateId: 2,
          cate: '文本处理',
        },
        {
          id: 1,
          title: '日语动词变化',
          logo: 'Language',
          desc: '从任意常见形式反推动词原形，以候选置信度、分类活用卡片和速查表完成对照学习',
          url: '/japaneseverb/',
          cateId: 2,
          cate: '文本处理',
        },
        {
          id: 1,
          title: '日语歌词学习工具',
          logo: 'Music',
          desc: '把日语歌词或 LRC 整理成逐行学习稿，支持精准读音、专注模式、学习进度和 TXT 导出',
          url: '/japaneselyrics/',
          cateId: 2,
          cate: '文本处理',
        },
        {
          id: 1,
          title: '文本替换',
          logo: 'Search',
          desc: '在线文本查找替换工具，支持普通文本和正则表达式，实时预览替换结果',
          url: '/textreplace/',
          cateId: 2,
          cate: '文本处理',
        },
        {
          id: 1,
          title: '词频统计',
          logo: 'SortAmountDown',
          desc: '在线词频统计工具，分析文本中各词出现频率，适合关键词提取和文本分析',
          url: '/wordfrequency/',
          cateId: 2,
          cate: '文本处理',
        },
      ]
    },
    {
      id: 3,
      title: '开发运维',
      icon: '',
      list: [
        {
          id: 1,
          title: '随机密码生成',
          logo: '/images/logo/keywords.png',
          desc: '密码生成器、随机字符串生成,批量生成',
          url: '/randompassword/',
          cateId: 3,
          cate: '开发运维',
        },
        {
          id: 1,
          title: 'URL编码/解码',
          logo: '/images/logo/url.png',
          desc: 'URL在线编码解码工具（UrlEncode编码 和 UrlDecode解码）',
          url: '/urlencode/',
          cateId: 3,
          cate: '开发运维',
        },
        {
          id: 1,
          title: 'UUID生成器',
          logo: '/images/logo/uuid.png',
          desc: '批量生成UUID',
          url: '/uuid/',
          cateId: 3,
          cate: '开发运维',
        },
        {
          id: 1,
          title: '时间戳转换',
          logo: '/images/logo/Time.png',
          desc: '在线时间戳转换工具以及获取当前时间戳',
          url: '/timetran/',
          cateId: 3,
          cate: '开发运维',
        },
        {
          id: 1,
          title: 'CRON 表达式',
          logo: 'Clock',
          desc: '生成、解析 CRON 表达式，解释字段并预览后续执行计划',
          url: '/cron/',
          cateId: 3,
          cate: '开发运维'
        },
        {
          id: 1,
          title: 'MD5 摘要校验',
          logo: '/images/logo/md5.png',
          desc: '计算文本或文件的 MD5 摘要，支持 16/32 位格式转换与校验值比对',
          url: '/md5/',
          cateId: 3,
          cate: '开发运维',
        },
        {
          id: 1,
          title: '正则测试工具',
          logo: '/images/logo/reg.png',
          desc: '正则表达式测试工具, 常用正则表达式',
          url: '/reg/',
          cateId: 3,
          cate: '开发运维',
        },
        {
          id: 1,
          title: 'Unicode转中文',
          logo: '/images/logo/union.png',
          desc: 'Unicode和中文的相互转换',
          url: '/unicode/',
          cateId: 3,
          cate: '开发运维',
        },
        {
          id: 1,
          title: 'HTTP状态码',
          logo: '/images/logo/http_code.png',
          desc: 'http状态对应的名称和含义解释',
          url: '/httpstatuscode/',
          cateId: 3,
          cate: '开发运维',
        },
        {
          id: 1,
          title: 'JWT解析',
          logo: '/images/logo/jwt_parse.png',
          desc: '解析和解码JSON Web Token（jwt）',
          url: '/jwt/',
          cateId: 3,
          cate: '开发运维',
        },
        {
          id: 1,
          title: 'html实体转义',
          logo: '/images/logo/HtmlEntity.png',
          desc: 'html实体转义，实体转义成html',
          url: '/htmlentity/',
          cateId: 3,
          cate: '开发运维',
        },
        {
          id: 1,
          title: '常用进制转换',
          logo: '/images/logo/scaletran.png',
          desc: '在线进制转换工具,可在2到64进制之间相互转换',
          url: '/scaletran/',
          cateId: 3,
          cate: '开发运维',
        },
        {
          id: 1,
          title: 'ASCII 字符对照表',
          logo: '/images/logo/ascii.png',
          desc: '搜索和换算 ASCII 字符，查看多进制、Unicode 与 HTML 实体',
          url: '/ascii/',
          cateId: 3,
          cate: '开发运维'
        },
        {
          id: 1,
          title: 'Color 选择器',
          logo: '/images/logo/color_picker.png',
          desc: '颜色格式转换、色阶生成与 WCAG 对比度可访问性检查',
          url: '/colorpicker/',
          cateId: 3,
          cate: '开发运维'
        },
        {
          id: 1,
          title: '短链接解析',
          logo: 'Link',
          desc: '本地诊断并清理链接参数，配置解析服务后可安全追踪完整重定向链路',
          url: '/urlunshorten/',
          cateId: 3,
          cate: '开发运维'
        },
        {
          id: 1,
          title: '地图坐标系互转',
          logo: 'MapMarkedAlt',
          desc: '五种坐标系单点与批量互转，支持地图选点、Excel 粘贴、逐行校验及 CSV/JSON 导出',
          url: '/coordtransform/',
          cateId: 3,
          cate: '开发运维'
        },
        {
          id: 1,
          title: 'IP 计算器',
          logo: 'NetworkWired',
          desc: '计算 CIDR 边界与地址属性，支持子网拆分规划、IP 进制转换和掩码双向换算',
          url: '/ipcalc/',
          cateId: 3,
          cate: '开发运维'
        },
        {
          id: 1,
          title: 'Base64 编解码',
          logo: 'Lock',
          desc: '支持 UTF-8 文本、Base64 URL、Data URL 和文件双向转换，可识别类型、预览并下载',
          url: '/base64/',
          cateId: 3,
          cate: '开发运维',
        },
        {
          id: 1,
          title: '哈希计算器',
          logo: 'Key',
          desc: '在线哈希值计算工具，支持 MD5、SHA-1、SHA-256、SHA-512 及 HMAC 系列算法',
          url: '/hashcalculator/',
          cateId: 3,
          cate: '开发运维',
        },
      ]
    },
    {
      id: 4,
      title: '单位换算',
      icon: '',
      list: [
        {
          id: 1,
          title: '单位换算',
          logo: '/images/logo/unit.png',
          desc: '统一换算长度、面积、重量、时间、温度、压力、能量和功率，一次输入查看全部单位结果',
          url: '/unit/',
          cateId: 4,
          cate: '单位换算'
        },
        {
          id: 1,
          title: '长度单位转换',
          logo: '/images/logo/length.png',
          desc: '支持公制、中国市制、英美制与航海长度，采用英寸、海里等精确定义',
          url: '/unit/?active=length',
          cateId: 4,
          cate: '单位换算'
        },
        {
          id: 1,
          title: '面积单位转换',
          logo: '/images/logo/area.png',
          desc: '支持公制土地面积、中国市制与英美面积，包含亩、公顷、英亩等常用单位',
          url: '/unit/?active=area',
          cateId: 4,
          cate: '单位换算'
        },
        {
          id: 1,
          title: '重量单位转换',
          logo: '/images/logo/weight.png',
          desc: '支持公制、中国市制、常衡制和金衡制，并区分日常盎司与金衡盎司',
          url: '/unit/?active=weight',
          cateId: 4,
          cate: '单位换算'
        },
        {
          id: 1,
          title: '时间单位转换',
          logo: '/images/logo/time_unit.png',
          desc: '支持纳秒至平均公历年，并明确区分固定时长与月、年的日历近似值',
          url: '/unit/?active=time',
          cateId: 4,
          cate: '单位换算'
        },
        {
          id: 1,
          title: '温度单位转换',
          logo: '/images/logo/temperature.png',
          desc: '摄氏、华氏、开尔文、列氏和兰氏实时互转，并检查绝对零度边界',
          url: '/unit/?active=temperature',
          cateId: 4,
          cate: '单位换算'
        },
        {
          id: 1,
          title: '压力单位转换',
          logo: '/images/logo/pressure.png',
          desc: '覆盖 Pa、bar、atm、Torr、mmHg、psi 等工程、气象和轮胎常用单位',
          url: '/unit/?active=pressure',
          cateId: 4,
          cate: '单位换算'
        },
        {
          id: 1,
          title: '能量单位转换',
          logo: '/images/logo/heat.png',
          desc: '覆盖 Wh、J、cal、BTU 与电子伏特，可处理电能、机械能和热量换算',
          url: '/unit/?active=heat',
          cateId: 4,
          cate: '单位换算'
        },
        {
          id: 1,
          title: '功率单位转换',
          logo: '/images/logo/power.png',
          desc: '覆盖 W、kW、机械马力、公制马力、BTU/h 与 kcal/h 等功率单位',
          url: '/unit/?active=power',
          cateId: 4,
          cate: '单位换算'
        },
        {
          id: 1,
          title: '存储单位换算',
          logo: 'Hdd',
          desc: '在线数据存储单位换算工具，支持 bit、B、KB、MB、GB、TB、PB、EB 互转',
          url: '/storageconverter/',
          cateId: 4,
          cate: '单位换算',
        },
      ]
    },
    {
      id: 5,
      title: '图片处理',
      icon: '',
      list: [
        {
          id: 1,
          title: '二维码生成',
          logo: '/images/logo/qrcode.png',
          desc: '在线生成带logo、透明、艺术的二维码',
          url: '/qrcode/',
          cateId: 5,
          cate: '图片处理'
        },
        {
          id: 1,
          title: '在线图片处理',
          logo: '/images/logo/img.png',
          desc: '在线图片裁剪，图片标注，图片滤镜，图片画笔、图片旋转、图片文字等操作',
          url: '/signimage/',
          cateId: 5,
          cate: '图片处理',
        },
        {
          id: 1,
          title: '图片分割',
          logo: '/images/logo/imgCut.png',
          desc: '按自定义行列精确分割图片，支持切线预览、单片下载和 ZIP 批量导出，不丢失余数像素',
          url: '/imgcut/',
          cateId: 5,
          cate: '图片处理',
        },
        {
          id: 1,
          title: '电子包浆模拟器',
          logo: 'Image',
          desc: '用预设或自定义压缩配方模拟多次转发后的色偏、噪点与做旧效果',
          url: '/electronicpatina/',
          cateId: 5,
          cate: '图片处理',
        },
        {
          id: 1,
          title: '表情包配字',
          logo: 'CommentDots',
          desc: '为图片添加自动换行字幕，支持视觉模板、位置、描边和多尺寸导出',
          url: '/memecaption/',
          cateId: 5,
          cate: '图片处理',
        },
        {
          id: 1,
          title: '图片拼接',
          logo: 'Images',
          desc: '纵向、横向和影视台词拼接，支持拖拽与手机按钮排序、画布安全检查，导出 JPG/PNG/WebP',
          url: '/imgstitch/',
          cateId: 5,
          cate: '图片处理',
        },
        {
          id: 1,
          title: '图片 EXIF 查看',
          logo: 'Camera',
          desc: '查看、检索并导出照片元数据，集中提示位置、时间、设备等隐私字段并生成干净副本',
          url: '/exifviewer/',
          cateId: 5,
          cate: '图片处理',
        },
        {
          id: 1,
          title: 'ICO图标工具',
          logo: 'Icons',
          desc: '按网站、Windows 或应用场景生成图标套件，支持裁切调校、多图层 ICO、单图下载与 ZIP 交付',
          url: '/icotool/',
          cateId: 5,
          cate: '图片处理',
        },
        {
          id: 1,
          title: '传图取色',
          logo: 'EyeDropper',
          desc: '上传图片后点击任意像素即可取色，同时显示 HEX、RGB、HSL 三种颜色格式',
          url: '/imagecolorpicker/',
          cateId: 5,
          cate: '图片处理',
        },
        {
          id: 1,
          title: '图片水印',
          logo: 'Stamp',
          desc: '实时添加单点或平铺文字水印，支持描边、阴影、旋转和 PNG/JPG/WebP 导出，全程本地处理',
          url: '/imagewatermark/',
          cateId: 5,
          cate: '图片处理',
        },
      ]
    },
    {
      id: 6,
      title: '趣味工具',
      icon: '',
      list: [
        {
          id: 1,
          title: 'P站风格Logo生成',
          logo: '/images/logo/hub.png',
          desc: '生成P站风格的黑黄 Logo 图片，可自定义双栏文字、配色、圆角与画布形状，支持高清 PNG',
          url: '/pornhublogo/',
          cateId: 6,
          cate: '趣味工具',
        },
        {
          id: 1,
          title: '5000兆円生成器',
          logo: '/images/logo/5000choyen.png',
          desc: '生成5000兆円风格图片的工具。可自定义文本内容和字体颜色，支持拖拽定位、透明背景和高清 PNG。',
          url: '/choyen5000/',
          cateId: 6,
          cate: '趣味工具',
        },
        {
          id: 1,
          title: '蔚蓝档案标题生成',
          logo: '/images/logo/bluearchive.png',
          desc: '生成类似《蔚蓝档案》(Blue Archive) 游戏主标题 Logo 风格的图片，可实时调整双栏标题与光环位置，支持透明背景和多倍率导出。',
          url: '/bluearchive/',
          cateId: 6,
          cate: '趣味工具',
        },
        {
          id: 1,
          title: '光棱坦克工厂',
          logo: 'LayerGroup',
          desc: '将两张图片混合成一张光棱坦克图：白色背景下显现隐藏图，深色背景下显现表面图，支持解码还原',
          url: '/miragetank/',
          cateId: 6,
          cate: '趣味工具',
        },
        {
          id: 1,
          title: '接头霸王',
          logo: 'Smile',
          desc: '上传底图并组合内置或自定义头像贴纸，支持图层、复制、翻转和原图分辨率导出',
          url: '/head-sticker/',
          cateId: 6,
          cate: '趣味工具',
        },
        {
          id: 1,
          title: '谜语人',
          logo: 'CommentDots',
          desc: '佛曰、如是我闻、兽语与 Base 编码统一互转，支持结果对照、方案说明和本次转换历史',
          url: '/riddleman/',
          cateId: 6,
          cate: '趣味工具',
        },
        {
          id: 1,
          title: '反应速度测试',
          logo: 'Bolt',
          desc: '趣味反应速度测试，屏幕变绿立即点击，记录反应时间并统计最佳成绩',
          url: '/reactiontest/',
          cateId: 6,
          cate: '趣味工具',
        }
      ]
    },
    {
      id: 8,
      title: '数据图表',
      icon: '',
      list: [
        {
          id: 1,
          title: '柱状图 / 横向柱状图',
          logo: '/images/logo/bar.png',
          desc: '直接编辑表格或粘贴 Excel / WPS 数据生成柱状图与横向排行，也支持 CSV、JSON、主题配色、配置复制与高清导出',
          url: '/bar/',
          cateId: 8,
          cate: '数据图表',
        },{
          id: 1,
          title: '折线图 / 面积图',
          logo: '/images/logo/line.png',
          desc: '使用表格或 JSON 数据制作折线图与面积图，支持平滑曲线、坐标轴、标签、主题配色和高清导出',
          url: '/line/',
          cateId: 8,
          cate: '数据图表',
        },
        {
          id: 1,
          title: '饼图 / 环形图',
          logo: '/images/logo/pie.png',
          desc: '实时制作饼图与环形图，提供占比示例、数据校验、图例标签、成套配色、ECharts 配置复制与 PNG 导出',
          url: '/pie/',
          cateId: 8,
          cate: '数据图表',
        },
        {
          id: 1,
          title: '散点图',
          logo: '/images/logo/scatter.png',
          desc: '输入 X、Y 与可选名称观察变量关系，支持标准散点与强调气泡、轴标题、数据校验、主题配色和高清导出',
          url: '/scatter/',
          cateId: 8,
          cate: '数据图表',
        },
        {
          id: 1,
          title: '漏斗图',
          logo: 'Filter',
          desc: '用表格或 JSON 制作业务流程漏斗，支持排序、内外标签、示例数据、配置复制和高清 PNG 导出',
          url: '/funnel/',
          cateId: 8,
          cate: '数据图表',
        },
        {
          id: 1,
          title: '雷达图',
          logo: 'Bullseye',
          desc: '使用多系列宽表制作能力雷达图，支持每维最大值、自动刻度、多边形与圆形、主题配色和高清导出',
          url: '/radar/',
          cateId: 8,
          cate: '数据图表',
        },
        {
          id: 1,
          title: '仪表盘',
          logo: 'TachometerAlt',
          desc: '制作单指标或多指标仪表盘，支持范围越界提示、刻度、单位、指针与进度盘切换及高清导出',
          url: '/gauge/',
          cateId: 8,
          cate: '数据图表',
        },
        {
          id: 1,
          title: '热力图',
          logo: 'Fire',
          desc: '使用 X、Y 分类和数值生成二维热力矩阵，支持结构校验、自动色阶、数值标签、颜色端点和高清导出',
          url: '/heatmap/',
          cateId: 8,
          cate: '数据图表',
        },
        {
          id: 1,
          title: 'K线图',
          logo: 'ChartLine',
          desc: '录入日期与开收低高数据生成 K 线图，提供 OHLC 关系校验、涨跌色、数据缩放和高清 PNG 导出',
          url: '/candlestick/',
          cateId: 8,
          cate: '数据图表',
        },
        {
          id: 1,
          title: '堆叠柱 / 堆叠面积线',
          logo: 'LayerGroup',
          desc: '使用多系列宽表生成堆叠柱与堆叠面积线，支持总量标签、图例、主题配色、配置复制和高清导出',
          url: '/stack/',
          cateId: 8,
          cate: '数据图表',
        },
        {
          id: 1,
          title: '矩形树图',
          logo: 'ThLarge',
          desc: '用斜线路径构建多层矩形树图，支持层级校验、钻取深度、面包屑、主题配色和高清导出',
          url: '/treemap/',
          cateId: 8,
          cate: '数据图表',
        },
        {
          id: 1,
          title: '桑基图',
          logo: 'ProjectDiagram',
          desc: '录入来源、目标和流量生成桑基图，自动检查重复、自环和成环连线，支持方向、对齐与曲率配置',
          url: '/sankey/',
          cateId: 8,
          cate: '数据图表',
        },
        {
          id: 1,
          title: '箱线图',
          logo: 'BoxOpen',
          desc: '从原始样本自动计算五数概括与 Tukey 异常值，也可直接录入统计摘要，支持分组比较和高清导出',
          url: '/boxplot/',
          cateId: 8,
          cate: '数据图表',
        },
        {
          id: 1,
          title: '日历图',
          logo: 'CalendarAlt',
          desc: '严格校验每日数据并生成年度日历热图，支持多年份切换、缺失日期提示、色阶配置和高清导出',
          url: '/calendar/',
          cateId: 8,
          cate: '数据图表',
        },
        {
          id: 1,
          title: '词云图',
          logo: 'Cloud',
          desc: '中英文分词与停用词过滤，实时调整词云形状、配色和布局，支持高清 PNG 与词频 CSV 导出',
          url: '/wordcloud/',
          cateId: 8,
          cate: '数据图表',
        }
      ]
    },
    {
      id: 9,
      title: '选择随机',
      icon: '',
      list: [
        {
          id: 1,
          title: '生成随机数',
          logo: '/images/logo/random.png',
          desc: '可定制范围内进行随机数字，可用于抽奖、点名等用途',
          url: '/random/',
          cateId: 9,
          cate: '选择随机'
        },
        {
          id: 1,
          title: '帮我决定',
          logo: '/images/logo/choose.png',
          desc: '选择困难，难以决定，今天吃什么，现在做什么，自定义选项都给你安排的明明白白',
          url: '/decision/',
          cateId: 9,
          cate: '选择随机'
        },
        {
          id: 1,
          title: '抛硬币',
          logo: '/images/logo/coin.png',
          desc: '在线抛硬币，选择困难那么交给硬币来帮你选择吧',
          url: '/coin/',
          cateId: 9,
          cate: '选择随机',
        },
        {
          id: 1,
          title: '投骰子',
          logo: '/images/logo/dice.png',
          desc: '在线投骰子，可自定义骰子数量，简单好用的骰子工具',
          url: '/dice/',
          cateId: 9,
          cate: '选择随机',
        },
      ]
    },
    {
      id: 10,
      title: '生活财务',
      icon: '',
      list: [
        {
          id: 1,
          title: '房贷计算器',
          logo: 'ChartLine',
          desc: '支持商业贷、公积金和组合贷，对比等额本息与等额本金，并模拟利率变化、提前还款等情景',
          url: '/mortgage/',
          cateId: 10,
          cate: '生活财务',
        },
        {
          id: 1,
          title: '延迟退休计算器',
          logo: 'Clock',
          desc: '根据出生年月和人员类别计算改革后法定退休年龄、退休年月、延迟月数及弹性退休区间',
          url: '/retirement/',
          cateId: 10,
          cate: '生活财务',
        },
      ]
    },
    {
      id: 7,
      title: '其他工具',
      icon: '',
      list: [
        {
          id: 1,
          title: '数字转金额大写',
          logo: '/images/logo/numberToChinese.png',
          desc: '在线数字一键转换成人民币大写，中文大写转换数字',
          url: '/numbertochinese/',
          cateId: 7,
          cate: '其他工具'
        },
        {
          id: 1,
          title: '手持弹幕',
          logo: '/images/logo/dm.png',
          desc: '多条消息、实时预览、场景配色与全屏展示',
          url: '/barrage/',
          cateId: 7,
          cate: '其他工具',
        },
        {
          id: 1,
          title: '摩斯电码',
          logo: '/images/logo/medium.png',
          desc: '支持中文的摩斯电码编码解码',
          url: '/morse/',
          cateId: 7,
          cate: '其他工具'
        },
        {
          id: 1,
          title: 'M3U8 播放器',
          logo: 'Play',
          desc: '在线 M3U8/HLS 视频流播放器，基于 hls.js 实现，支持直播和点播',
          url: '/m3u8player/',
          cateId: 7,
          cate: '其他工具',
        },
        {
          id: 1,
          title: 'Emoji 大全',
          logo: 'Smile',
          desc: '按分类浏览和搜索 Emoji，支持一键复制、最近使用与浏览器本地收藏',
          url: '/emoji/',
          cateId: 7,
          cate: '其他工具',
        }
      ]
    }
  ]
}

//工具list
export function toolsList() {
  let list = [] as any[]
  let toolsCate = getToolsCate()
  for (let item in toolsCate) {
    for (let _item in toolsCate[item].list) {
      list.push(toolsCate[item].list[_item])
    }
  }
  return list
}

/**
 * url为键名的工具list map
 * @returns 
 */
export function urlKeyMap() {
  // let toolsMapByUrlKey = new Map()
  // let list = toolsList()
  // for (let item in list) {
  //   toolsMapByUrlKey.set(list[item].url, list[item])
  // }
  // return toolsMapByUrlKey
}

//获取工具
export function getTools(data: ToolsReqData) {
  //接收参数
  const { cateId, title, route } = data
  //获取工具list
  let list = toolsList()
  
  //路由筛选（精确匹配单个工具）
  if (route && route != '') {
    const tool = list.find(item => {
      // 去掉末尾斜杠后比较
      const itemUrl = item.url.replace(/\/$/, '')
      const searchRoute = route.replace(/\/$/, '')
      return itemUrl === searchRoute
    })
    return tool || {}
  }
  
  //标题筛选
  if (title != '') {
    list = list.filter(item => {
      let tmpValue = item.title.toLowerCase()
      let tmpDesc = item.desc.toLowerCase()
      // console.log(tmpValue.indexOf(title.toLowerCase()))
      return tmpValue.indexOf(title.toLowerCase()) !== -1 || tmpDesc.indexOf(title.toLowerCase()) !== -1;
    });
  }
  //分类筛选
  if (cateId > 0) {
    list = list.filter(item => {
      return item.cateId == cateId;  
    });
  }
  return list
}

const ToolsExport = {
  getTools,
  getToolsCate,
  toolsList,
};

export default ToolsExport;
