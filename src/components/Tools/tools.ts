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
          title: '字体标本工作室',
          logo: 'Font',
          desc: '用真实样文和字号瀑布预览字体，支持本机字体、字体文件与 CSS 复制',
          url: '/fontpreview/',
          cateId: 1,
          cate: '在线编辑'
        },
        {
          id: 1,
          title: 'Markdown 文档工作台',
          logo: 'Markdown',
          desc: '实时编写与预览 Markdown，支持模板、本地草稿、文档统计和 MD/HTML 导出',
          url: '/markdown/',
          cateId: 1,
          cate: '在线编辑'
        },
        {
          id: 1,
          title: 'JSON 工作台',
          logo: '/images/logo/json.png',
          desc: '校验、格式化和安全压缩 JSON，支持错误定位、键名排序与字符串转义',
          url: '/json/',
          cateId: 1,
          cate: '在线编辑',
        },
        {
          id: 1,
          title: 'JavaScript 格式化与压缩',
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
          title: 'CSS 格式化与优化',
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
          title: 'SQL 格式化',
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
          title: '文本差异工作台',
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
          title: 'ASCII 字形工作室',
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
          desc: '将日语平假名/片假名转换为罗马音，支持一键复制',
          url: '/romaji/',
          cateId: 2,
          cate: '文本处理',
        },
        {
          id: 1,
          title: '日语动词变化',
          logo: 'Language',
          desc: '输入日语动词任意常见形式，展示对应的辞书形、ます形、て形、可能形、被动形、使役形等活用',
          url: '/japaneseverb/',
          cateId: 2,
          cate: '文本处理',
        },
        {
          id: 1,
          title: '日语歌词学习工具',
          logo: 'Music',
          desc: '输入日语歌词或 LRC，自动展示时间轴、罗马音、双语翻译，并用颜色标注助词、活用语尾和片假名词',
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
          title: 'CRON 调度工作台',
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
          title: 'ASCII 字符工作台',
          logo: '/images/logo/ascii.png',
          desc: '搜索和换算 ASCII 字符，查看多进制、Unicode 与 HTML 实体',
          url: '/ascii/',
          cateId: 3,
          cate: '开发运维'
        },
        {
          id: 1,
          title: 'Color 配色工作台',
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
          desc: '追踪短链接重定向，还原完整原始链接，并自动清除所有 URL 跟踪参数',
          url: '/urlunshorten/',
          cateId: 3,
          cate: '开发运维'
        },
        {
          id: 1,
          title: '地图坐标系互转',
          logo: 'MapMarkedAlt',
          desc: 'WGS84、CGCS2000、GCJ-02、BD-09、Web Mercator 五种坐标系互转，支持地图选点与拖拽定位',
          url: '/coordtransform/',
          cateId: 3,
          cate: '开发运维'
        },
        {
          id: 1,
          title: 'IP 计算器',
          logo: 'NetworkWired',
          desc: '计算子网掩码、网络地址、广播地址、可用主机数，支持 IP 进制转换与子网掩码换算',
          url: '/ipcalc/',
          cateId: 3,
          cate: '开发运维'
        },
        {
          id: 1,
          title: 'Base64 数据工作台',
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
          title: '电子包浆实验室',
          logo: 'Image',
          desc: '用预设或自定义压缩配方模拟多次转发后的色偏、噪点与做旧效果',
          url: '/electronicpatina/',
          cateId: 5,
          cate: '图片处理',
        },
        {
          id: 1,
          title: '字幕梗图工作室',
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
          desc: '查看照片完整 EXIF 信息（拍摄参数、设备型号、GPS 坐标），支持地图定位，一键下载去除 EXIF 的原图',
          url: '/exifviewer/',
          cateId: 5,
          cate: '图片处理',
        },
        {
          id: 1,
          title: 'ICO图标工具',
          logo: 'Icons',
          desc: '上传图片后一键生成多尺寸 PNG / ICO 图标，支持拖拽调整位置、缩放和圆角设置',
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
          title: '双栏徽标工作室',
          logo: '/images/logo/hub.png',
          desc: '自定义双栏文字、配色、圆角与画布形状，支持高清 PNG',
          url: '/pornhublogo/',
          cateId: 6,
          cate: '趣味工具',
        },
        {
          id: 1,
          title: '金属冲击标题工作室',
          logo: '/images/logo/5000choyen.png',
          desc: '生成红金与银色错位标题，支持拖拽定位、透明背景和高清 PNG',
          url: '/choyen5000/',
          cateId: 6,
          cate: '趣味工具',
        },
        {
          id: 1,
          title: '蔚蓝标题工作室',
          logo: '/images/logo/bluearchive.png',
          desc: '实时调整双栏标题与光环位置，支持透明背景和多倍率导出',
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
          desc: '上传底图，拖拽凯露等角色的头像贴纸合成趣味图片，支持缩放、旋转、翻转，一键下载成果',
          url: '/head-sticker/',
          cateId: 6,
          cate: '趣味工具',
        },
        {
          id: 1,
          title: '谜语人',
          logo: 'CommentDots',
          desc: '多种趣味编码语言互转：佛曰、如是我闻等，任意框修改即时同步转换',
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
          desc: '在线制作柱状图与横向柱状图，支持一键切换两种模式，像做表格一样制作可视化图表，支持导出静态或动态图表',
          url: '/bar/',
          cateId: 8,
          cate: '数据图表',
        },{
          id: 1,
          title: '折线图 / 面积图',
          logo: '/images/logo/line.png',
          desc: '在线制作折线图与面积图，支持一键切换两种模式，像做表格一样制作可视化图表，支持导出静态或动态图表',
          url: '/line/',
          cateId: 8,
          cate: '数据图表',
        },
        {
          id: 1,
          title: '饼图 / 环形图',
          logo: '/images/logo/pie.png',
          desc: '在线制作饼图与环形图，支持一键切换两种模式，像做表格一样制作可视化图表，支持导出静态或动态图表',
          url: '/pie/',
          cateId: 8,
          cate: '数据图表',
        },
        {
          id: 1,
          title: '散点图',
          logo: '/images/logo/scatter.png',
          desc: '在线制作散点图，像做表格一样制作可视化图表，支持导出静态或动态图表',
          url: '/scatter/',
          cateId: 8,
          cate: '数据图表',
        },
        {
          id: 1,
          title: '漏斗图',
          logo: 'Filter',
          desc: '在线制作漏斗图，直观展示业务流程各环节转化率，支持排序与标签自定义，支持导出图表',
          url: '/funnel/',
          cateId: 8,
          cate: '数据图表',
        },
        {
          id: 1,
          title: '雷达图',
          logo: 'Bullseye',
          desc: '在线制作雷达图，多维度数据对比，支持多边形/圆形两种模式，支持导出图表',
          url: '/radar/',
          cateId: 8,
          cate: '数据图表',
        },
        {
          id: 1,
          title: '仪表盘',
          logo: 'TachometerAlt',
          desc: '在线制作仪表盘，通过指针直观展示关键指标，支持多指针同时展示，支持导出图表',
          url: '/gauge/',
          cateId: 8,
          cate: '数据图表',
        },
        {
          id: 1,
          title: '热力图',
          logo: 'Fire',
          desc: '在线制作热力图，通过色阶变化展示二维矩阵数据分布，支持导出图表',
          url: '/heatmap/',
          cateId: 8,
          cate: '数据图表',
        },
        {
          id: 1,
          title: 'K线图',
          logo: 'ChartLine',
          desc: '在线制作 K 线图（蜡烛图），展示开收高低价格，支持自定义涨跌颜色，支持导出图表',
          url: '/candlestick/',
          cateId: 8,
          cate: '数据图表',
        },
        {
          id: 1,
          title: '堆叠柱/线图',
          logo: 'LayerGroup',
          desc: '在线制作堆叠柱/线图，展示多系列数据的累积对比，支持堆叠柱图与堆叠折线图一键切换，支持导出图表',
          url: '/stack/',
          cateId: 8,
          cate: '数据图表',
        },
        {
          id: 1,
          title: '矩形树图',
          logo: 'ThLarge',
          desc: '在线制作矩形树图（Treemap），用嵌套矩形展示层级占比，内置 ECharts 原生支持，支持导出图表',
          url: '/treemap/',
          cateId: 8,
          cate: '数据图表',
        },
        {
          id: 1,
          title: '桑基图',
          logo: 'ProjectDiagram',
          desc: '在线制作桑基图（Sankey），展示流量与流向关系，常用于网站流量分析、能源分布场景，支持导出图表',
          url: '/sankey/',
          cateId: 8,
          cate: '数据图表',
        },
        {
          id: 1,
          title: '箱线图',
          logo: 'BoxOpen',
          desc: '在线制作箱线图（Box Plot），展示最小值、Q1、中位数、Q3、最大值五个统计量，适合统计分析，支持导出图表',
          url: '/boxplot/',
          cateId: 8,
          cate: '数据图表',
        },
        {
          id: 1,
          title: '日历图',
          logo: 'CalendarAlt',
          desc: '在线制作日历图，以全年日历形式展示时序数据，类似 GitHub 活跃度热图，支持自定义年份，支持导出图表',
          url: '/calendar/',
          cateId: 8,
          cate: '数据图表',
        },
        {
          id: 1,
          title: '词云图',
          logo: 'Cloud',
          desc: '在线词云生成工具，自动统计词频并生成美观的词云图，支持多种形状和配色',
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
          title: '手持弹幕工作台',
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
          desc: '完整的 Emoji 表情大全，按分类浏览，支持搜索，点击一键复制',
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
