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
          desc: '内置常用字体栈可直接试用，也可载入字体文件或授权读取本机字体；在真实段落与字号瀑布中比较字形、密度和节奏。',
          url: '/fontpreview/',
          cateId: 1,
          cate: '在线编辑'
        },
        {
          id: 1,
          title: '表格数据转换',
          logo: 'FileExcel',
          desc: '直接粘贴 CSV / TSV 或 JSON 转成表格，也可以导入完整工作簿；编辑后再按需要输出为 Excel、CSV / TSV 或结构化 JSON。',
          url: '/spreadsheet-converter/',
          cateId: 1,
          cate: '在线编辑'
        },
        {
          id: 1,
          title: 'Markdown 工作台',
          logo: 'Markdown',
          desc: '实时编写与预览 Markdown，随时导入、复制或导出；草稿只保存在当前浏览器，不会上传。',
          url: '/markdown/',
          cateId: 1,
          cate: '在线编辑'
        },
        {
          id: 1,
          title: 'JSON 工作台',
          logo: '/images/logo/json.png',
          desc: '安全格式化、压缩、递归排序和字符串转义分开处理，避免一个按钮悄悄破坏数据。',
          url: '/json/',
          cateId: 1,
          cate: '在线编辑',
        },
        {
          id: 1,
          title: 'JavaScript 工作台',
          logo: 'Js',
          desc: '格式化和发布压缩都由 Terser 解析，目标语法、模块模式、变量改名和 Console 策略由你明确控制。',
          url: '/jsformat/',
          cateId: 1,
          cate: '在线编辑',
        },
        {
          id: 1,
          title: 'HTML / XML 工作台',
          logo: 'Html5',
          desc: '在格式化、结构校验和保守压缩之间切换，预格式文本、脚本与样式块不会被意外改写。',
          url: '/htmlformat/',
          cateId: 1,
          cate: '在线编辑',
        },
        {
          id: 1,
          title: 'CSS 工作台',
          logo: 'Css3',
          desc: '格式化负责审阅，CSSO 负责语法解析和优化压缩；结果、体积收益与错误诊断都清晰可见。',
          url: '/cssformat/',
          cateId: 1,
          cate: '在线编辑',
        },
        {
          id: 1,
          title: '富文本与 HTML 工作台',
          logo: 'Edit',
          desc: '使用可视化工具栏编排正文，同时获得干净的 HTML 和纯文本；支持模板、导入、本地草稿与多格式导出。',
          url: '/textedit/',
          cateId: 1,
          cate: '在线编辑'
        },
        {
          id: 1,
          title: 'SQL 工作台',
          logo: 'Database',
          desc: '选择方言与排版规则，格式化、保守压缩、撤回和导出都在同一个工作台完成。',
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
          desc: '并排核对两个版本，按字符或词组高亮；支持忽略规则、文件导入、交换文本和差异导出。',
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
          desc: '21 种本地字体、宽度与字距实时可调；确认效果后可复制或下载纯文本，不上传输入内容。',
          url: '/asciiwordpic/',
          cateId: 2,
          cate: '文本处理',
        },
        {
          id: 1,
          title: '日语转罗马音',
          logo: 'Language',
          desc: '轻量模式适合假名，精准模式会分析汉字读音；结果可切换罗马音、平假名与片假名。',
          url: '/romaji/',
          cateId: 2,
          cate: '文本处理',
        },
        {
          id: 1,
          title: '日语动词变化',
          logo: 'Language',
          desc: '识别输入属于哪种变化，再按基础形、礼貌体、语气和语态整理完整活用。',
          url: '/japaneseverb/',
          cateId: 2,
          cate: '文本处理',
        },
        {
          id: 1,
          title: '日语歌词学习工具',
          logo: 'Music',
          desc: '自动识别时间轴与双语行，并将假名、罗马音、助词和活用语尾整理成清晰对照。',
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
          desc: '用常用周期快速生成，也可以直接编辑表达式；实时解释每个字段，并在浏览器本地时区预览后续执行时间。',
          url: '/cron/',
          cateId: 3,
          cate: '开发运维'
        },
        {
          id: 1,
          title: 'MD5 摘要校验',
          logo: '/images/logo/md5.png',
          desc: '支持文本与大文件分块计算、16/32 位格式转换和校验值比对，全程在本地完成。',
          url: '/md5/',
          cateId: 3,
          cate: '开发运维',
        },
        {
          id: 1,
          title: '正则测试工具',
          logo: '/images/logo/reg.png',
          desc: '实时高亮、捕获组拆解、替换预览和准确的错误定位。',
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
          desc: '搜索状态码、英文名称或中文场景，快速找到含义与处理建议。',
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
          desc: '覆盖 ASCII 标准字符、控制字符和 Windows-1252 扩展区；按字符、名称或任意进制定位，并集中查看完整编码详情。',
          url: '/ascii/',
          cateId: 3,
          cate: '开发运维'
        },
        {
          id: 1,
          title: 'Color 选择器',
          logo: '/images/logo/color_picker.png',
          desc: '统一转换常用颜色格式、生成 50–900 色阶，并用 WCAG 对比度判断正文、大号文字和 UI 图形是否清晰。',
          url: '/colorpicker/',
          cateId: 3,
          cate: '开发运维'
        },
        {
          id: 1,
          title: '短链接解析',
          logo: 'Link',
          desc: '本地检查链接结构和营销参数；配置解析服务后，还能安全追踪完整重定向链。',
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
          desc: '输入 IP/CIDR，即时计算网段、主机范围与地址属性，也可继续拆分子网。',
          url: '/ipcalc/',
          cateId: 3,
          cate: '开发运维'
        },
        {
          id: 1,
          title: 'Base64 编解码',
          logo: 'Lock',
          desc: '支持 UTF-8 文本、Base64 URL、Data URL 和常见文件类型；所有内容只在当前浏览器中处理。',
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
          desc: '覆盖公制、市制、英美制、航海、工程和温标；结果实时计算，并明确标注近似值与定义来源。',
          url: '/unit/',
          cateId: 4,
          cate: '单位换算'
        },
        {
          id: 1,
          title: '长度单位转换',
          logo: '/images/logo/length.png',
          desc: '支持公制、中国市制、英美制与航海长度，采用英寸、海里等精确定义',
          url: '/length/',
          cateId: 4,
          cate: '单位换算'
        },
        {
          id: 1,
          title: '面积单位转换',
          logo: '/images/logo/area.png',
          desc: '支持公制土地面积、中国市制与英美面积，包含亩、公顷、英亩等常用单位',
          url: '/area/',
          cateId: 4,
          cate: '单位换算'
        },
        {
          id: 1,
          title: '重量单位转换',
          logo: '/images/logo/weight.png',
          desc: '支持公制、中国市制、常衡制和金衡制，并区分日常盎司与金衡盎司',
          url: '/weight/',
          cateId: 4,
          cate: '单位换算'
        },
        {
          id: 1,
          title: '时间单位转换',
          logo: '/images/logo/time_unit.png',
          desc: '支持纳秒至平均公历年，并明确区分固定时长与月、年的日历近似值',
          url: '/time/',
          cateId: 4,
          cate: '单位换算'
        },
        {
          id: 1,
          title: '温度单位转换',
          logo: '/images/logo/temperature.png',
          desc: '摄氏、华氏、开尔文、列氏和兰氏实时互转，并检查绝对零度边界',
          url: '/temperature/',
          cateId: 4,
          cate: '单位换算'
        },
        {
          id: 1,
          title: '压力单位转换',
          logo: '/images/logo/pressure.png',
          desc: '覆盖 Pa、bar、atm、Torr、mmHg、psi 等工程、气象和轮胎常用单位',
          url: '/pressure/',
          cateId: 4,
          cate: '单位换算'
        },
        {
          id: 1,
          title: '能量单位转换',
          logo: '/images/logo/heat.png',
          desc: '覆盖 Wh、J、cal、BTU 与电子伏特，可处理电能、机械能和热量换算',
          url: '/heat/',
          cateId: 4,
          cate: '单位换算'
        },
        {
          id: 1,
          title: '功率单位转换',
          logo: '/images/logo/power.png',
          desc: '覆盖 W、kW、机械马力、公制马力、BTU/h 与 kcal/h 等功率单位',
          url: '/power/',
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
          desc: '支持网址、Wi-Fi、邮件和电话模板，所有内容只在本地浏览器中生成。',
          url: '/qrcode/',
          cateId: 5,
          cate: '图片处理'
        },
        {
          id: 1,
          title: '在线图片处理',
          logo: '/images/logo/img.png',
          desc: '裁剪、旋转、翻转、画笔、形状、文字、Emoji 标注与滤镜调整，图片只在浏览器本地处理。',
          url: '/signimage/',
          cateId: 5,
          cate: '图片处理',
        },
        {
          id: 1,
          title: '图片分割',
          logo: '/images/logo/imgCut.png',
          desc: '自由设置行列、即时查看切线，并将全部切片按顺序打包为 ZIP；除不尽的尺寸也不会丢失边缘像素。',
          url: '/imgcut/',
          cateId: 5,
          cate: '图片处理',
        },
        {
          id: 1,
          title: '电子包浆模拟器',
          logo: 'Image',
          desc: '通过多轮 JPEG 压缩、色度偏移和像素抖动生成做旧效果；用预设快速开始，也可以精确控制损伤程度。',
          url: '/electronicpatina/',
          cateId: 5,
          cate: '图片处理',
        },
        {
          id: 1,
          title: '表情包配字',
          logo: 'CommentDots',
          desc: '载入图片后实时调整字幕、位置与描边，自动换行并输出适合聊天、社交平台和二次创作的成品。',
          url: '/memecaption/',
          cateId: 5,
          cate: '图片处理',
        },
        {
          id: 1,
          title: '图片拼接',
          logo: 'Images',
          desc: '纵向、横向与影视台词三种工作流实时预览；桌面可拖拽排序，手机也能用上下按钮精确调整顺序。',
          url: '/imgstitch/',
          cateId: 5,
          cate: '图片处理',
        },
        {
          id: 1,
          title: '图片 EXIF 查看',
          logo: 'Camera',
          desc: '集中检查拍摄参数、设备、时间与位置，并可导出元数据或生成去除 EXIF 的副本。',
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
          desc: '像素级取色、主色提取与格式转换均在本地完成，图片不会上传。',
          url: '/imagecolorpicker/',
          cateId: 5,
          cate: '图片处理',
        },
        {
          id: 1,
          title: '图片水印',
          logo: 'Stamp',
          desc: '单点与平铺水印实时预览，描边、阴影、透明度和导出质量全部在浏览器本地完成。',
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
          desc: '自由组合左右文字、双栏配色、圆角与画布形状，实时生成适合头像、封面和梗图的高对比徽标。',
          url: '/pornhublogo/',
          cateId: 6,
          cate: '趣味工具',
        },
        {
          id: 1,
          title: '5000兆円生成器',
          logo: '/images/logo/5000choyen.png',
          desc: '组合红金主标题与银色副标题，拖动微调错位关系，并输出适合表情包、封面和视频贴纸的透明 PNG。',
          url: '/choyen5000/',
          cateId: 6,
          cate: '趣味工具',
        },
        {
          id: 1,
          title: '蔚蓝档案标题生成',
          logo: '/images/logo/bluearchive.png',
          desc: '左右文字、光环位置、画布形状与导出倍率都可实时调整；所有合成均在浏览器画布中完成。',
          url: '/bluearchive/',
          cateId: 6,
          cate: '趣味工具',
        },
        {
          id: 1,
          title: '光棱坦克工厂',
          logo: 'LayerGroup',
          desc: '两张图片在像素层交错混合，也可以把已有坦克图中的隐藏内容重新显现。',
          url: '/miragetank/',
          cateId: 6,
          cate: '趣味工具',
        },
        {
          id: 1,
          title: '接头霸王',
          logo: 'Smile',
          desc: '内置角色贴纸，也支持上传自定义素材；画布可缩放、旋转、翻转和调整图层。',
          url: '/head-sticker/',
          cateId: 6,
          cate: '趣味工具',
        },
        {
          id: 1,
          title: '谜语人',
          logo: 'CommentDots',
          desc: '选择任意可逆方案作为来源，自动解码后生成佛曰、如是我闻、兽语、Base64、Base32 与 MD5 对照结果。',
          url: '/riddleman/',
          cateId: 6,
          cate: '趣味工具',
        },
        {
          id: 1,
          title: '反应速度测试',
          logo: 'Bolt',
          desc: '多轮采样、抢跑检测、稳定度与个人最佳，让偶然的一次点击变成更可信的结果。',
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
          desc: '粘贴表格或 JSON 数据，实时切换纵向与横向布局，统一完成标签、坐标轴、配色和高清导出。',
          url: '/bar/',
          cateId: 8,
          cate: '数据图表',
        },{
          id: 1,
          title: '折线图 / 面积图',
          logo: '/images/logo/line.png',
          desc: '输入连续序列，一键切换折线图与面积图，并控制平滑曲线、标签、坐标轴和主题配色。',
          url: '/line/',
          cateId: 8,
          cate: '数据图表',
        },
        {
          id: 1,
          title: '饼图 / 环形图',
          logo: '/images/logo/pie.png',
          desc: '用饼图或环形图展示占比，实时调整图例、标签和配色，并复制配置或导出透明高清 PNG。',
          url: '/pie/',
          cateId: 8,
          cate: '数据图表',
        },
        {
          id: 1,
          title: '散点图',
          logo: '/images/logo/scatter.png',
          desc: '输入 X、Y 与可选名称，实时观察数据分布，支持标准点与强调气泡两种表现和轴标题配置。',
          url: '/scatter/',
          cateId: 8,
          cate: '数据图表',
        },
        {
          id: 1,
          title: '漏斗图',
          logo: 'Filter',
          desc: '录入各流程阶段数值，调整排序与标签位置，快速生成营销、招聘、销售等转化漏斗。',
          url: '/funnel/',
          cateId: 8,
          cate: '数据图表',
        },
        {
          id: 1,
          title: '雷达图',
          logo: 'Bullseye',
          desc: '使用宽表录入维度与多个系列，自动计算或指定各维度最大值，并切换多边形、圆形与填充强度。',
          url: '/radar/',
          cateId: 8,
          cate: '数据图表',
        },
        {
          id: 1,
          title: '仪表盘',
          logo: 'TachometerAlt',
          desc: '录入一个或多个指标，设置最小值、最大值、刻度和单位，并在指针盘与进度盘之间实时切换。',
          url: '/gauge/',
          cateId: 8,
          cate: '数据图表',
        },
        {
          id: 1,
          title: '热力图',
          logo: 'Fire',
          desc: '按 X、Y 分类和数值录入数据，自动生成矩阵与视觉色阶，支持颜色端点、数值标签和圆角单元格。',
          url: '/heatmap/',
          cateId: 8,
          cate: '数据图表',
        },
        {
          id: 1,
          title: 'K线图',
          logo: 'ChartLine',
          desc: '录入日期与 OHLC 数据，逐行验证价格关系，自定义涨跌色并通过缩放条浏览较长序列。',
          url: '/candlestick/',
          cateId: 8,
          cate: '数据图表',
        },
        {
          id: 1,
          title: '堆叠柱 / 堆叠面积线',
          logo: 'LayerGroup',
          desc: '使用多系列宽表生成堆叠柱状图或堆叠面积线，支持图例、总量标签、主题配色和高清导出。',
          url: '/stack/',
          cateId: 8,
          cate: '数据图表',
        },
        {
          id: 1,
          title: '矩形树图',
          logo: 'ThLarge',
          desc: '用斜线描述任意层级，自动构建父子树、计算叶节点占比，并通过面包屑与钻取层级浏览复杂结构。',
          url: '/treemap/',
          cateId: 8,
          cate: '数据图表',
        },
        {
          id: 1,
          title: '桑基图',
          logo: 'ProjectDiagram',
          desc: '逐行录入来源、目标与流量，自动提取节点，并在绘制前检查重复连接、自环与有向环路。',
          url: '/sankey/',
          cateId: 8,
          cate: '数据图表',
        },
        {
          id: 1,
          title: '箱线图',
          logo: 'BoxOpen',
          desc: '既可逐条输入原始样本并自动计算 Tukey 箱线，也可直接提供五数概括与异常值。',
          url: '/boxplot/',
          cateId: 8,
          cate: '数据图表',
        },
        {
          id: 1,
          title: '日历图',
          logo: 'CalendarAlt',
          desc: '严格校验 YYYY-MM-DD 日期，自动识别多个年份、统计缺失天数，并通过年度色阶观察活跃度与周期。',
          url: '/calendar/',
          cateId: 8,
          cate: '数据图表',
        },
        {
          id: 1,
          title: '词云图',
          logo: 'Cloud',
          desc: '自动完成中英文分词、词频统计与停用词过滤；调整形状、配色和布局后实时预览，并导出高清 PNG 或完整词频 CSV。',
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
          desc: '支持多条内容、滚动/常亮/呼吸模式、方向与对比度检查；全屏失败时也会自动使用沉浸式覆盖层。',
          url: '/barrage/',
          cateId: 7,
          cate: '其他工具',
        },
        {
          id: 1,
          title: '摩斯电码',
          logo: '/images/logo/medium.png',
          desc: '支持英文、数字、常用标点与中文编码，输入后即时转换。',
          url: '/morse/',
          cateId: 7,
          cate: '其他工具'
        },
        {
          id: 1,
          title: 'M3U8 播放器',
          logo: 'Play',
          desc: '解析清单、切换清晰度、查看缓冲与错误建议，适合播放和排查 HLS 直播或点播地址。',
          url: '/m3u8player/',
          cateId: 7,
          cate: '其他工具',
        },
        {
          id: 1,
          title: 'Emoji 大全',
          logo: 'Smile',
          desc: '按场景分类浏览，也可以搜索中文名称、Emoji 本身或 Unicode 编码。收藏和最近使用仅保存在当前浏览器。',
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
