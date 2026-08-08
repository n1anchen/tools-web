<div align="center">
  <pre>
    _______          _         __          __  _     
 |__   __|        | |        \ \        / / | |    
    | | ___   ___ | |___ _____\ \  /\  / /__| |__  
    | |/ _ \ / _ \| / __|______\ \/  \/ / _ \ '_ \ 
    | | (_) | (_) | \__ \       \  /\  /  __/ |_) |
    |_|\___/ \___/|_|___/        \/  \/ \___|_.__/ 
                                                                                                 
  </pre>
  <p> 只需简单几步，即可快速搭建属于自己的在线工具箱。</p> 
  <p> 一个基于 Vite + Vue 3 + TypeScript 的在线工具箱，内置 90+ 实用小工具。</p>

[![node](https://img.shields.io/badge/node-%3E%3D20.19-green)](node)
[![vue](https://img.shields.io/badge/vue-3.5-42b883)](vue)
[![tailwindcss](https://img.shields.io/badge/tailwindcss-3.4-06b6d4)](tailwindcss)
[![elementplus](https://img.shields.io/badge/element--plus-2.14-409eff)](elementplus)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)

</div>

## 目录

- [特性](#特性)
- [技术栈](#技术栈)
- [开始使用](#开始使用)
  - [Docker 部署](#docker-部署)
  - [手动部署](#手动部署)
- [项目结构](#项目结构)
- [工具列表](#工具列表)
- [如何添加新工具](#如何添加新工具)
- [测试](#测试)
- [License](#license)

## 特性

- 🧰 **90+ 工具**：开发运维、文本处理、图片处理、数据图表、单位换算、趣味工具等 11 个分类
- 📊 **ECharts 图表工作台**：柱状、折线、饼图、雷达、桑基、K 线、词云等 15 种图表，支持数据粘贴/草稿/高清导出
- 🌙 **暗色模式**：全站基于 Tailwind `dark:` 前缀 + 设计 Token（`--c-*` 变量），视觉一致
- 📱 **移动端响应式**：桌面 / 窄屏自适应布局
- 🚀 **PWA 支持**：Service Worker 预缓存 + 运行时缓存，可离线访问
- 🔒 **隐私优先**：工具计算全部在浏览器本地完成，输入内容不上传
- 🗂️ **资源按需缓存**：Ace 编辑器、日文词典等大型资源支持手动/自动缓存管理

## 技术栈

| 领域 | 选型 |
|------|------|
| 框架 | Vue 3（`<script setup>` + Composition API）+ TypeScript |
| 构建 | Vite 5 |
| 样式 | Tailwind CSS 3.4（主色调 `blue-*`，暗色 `dark:` 前缀） |
| UI 库 | Element Plus 2.14（组件按需引入） |
| 图标 | `@vicons/tabler`（模板中用 `<Icon>` 组件渲染，`tools.ts` 的 `logo` 字段写图标名字符串） |
| 状态管理 | Pinia（`src/store/modules/`） |
| 路由 | Vue Router 4 |
| 图表 | ECharts 6 + echarts-wordcloud |
| 测试 | Node 内置 `node:test`（133 个用例） |
| 包管理 | pnpm（workspace 模式） |

环境要求：**Node.js ≥ 20.19**、**pnpm ≥ 10**

## 开始使用

### Docker 部署

```bash
# 构建镜像
docker build -t tools-web .

# 运行
docker run -d --name tools-web --restart unless-stopped -p 8080:80 tools-web
```

访问：`http://127.0.0.1:8080`

> 生产镜像已包含 `nginx.conf`（SPA 路由回退、gzip、静态资源缓存）。

### 手动部署

```bash
# 1. 安装 pnpm（如未安装）
npm install -g pnpm

# 2. 克隆并进入项目
git clone <仓库地址> tools-web
cd tools-web

# 3. 安装依赖
pnpm install

# 4. 启动开发服务器
pnpm dev

# 5. 生产构建
pnpm build

# 6. 本地预览构建产物
pnpm preview
```

常用命令：

```bash
pnpm build:check   # 类型检查（vue-tsc + tsc）+ 生产构建
pnpm test          # 运行全部单元测试
```

## 项目结构

```
src/
├── components/
│   ├── Common/            # 跨工具公共组件（见下方清单）
│   ├── Layout/            # 布局：ToolHero / ToolGuide / Header / Left 等
│   └── Tools/             # 各工具页面（<工具名>/<工具名>.vue）
│       ├── Example/       # 新建工具时的参考模板
│       ├── tools.ts       # 工具分类与卡片数据（标题/描述/图标/路由/分类）
│       └── tools.type.ts  # 工具相关 TypeScript 类型
├── composables/           # 组合式函数（useChartWorkbench 等）
├── data/                  # 静态数据（httpStatusCodes 等）
├── router/                # 路由定义（router.ts 含全部工具路由 + meta 派生）
├── store/                 # Pinia store
├── styles/                # 全局样式（tailwind.css 含设计 Token 与全局类）
├── types/                 # 第三方库类型声明
└── utils/                 # 公共工具函数（string/file/clipboard/chartParser 等）
tests/                     # node:test 单元测试
scripts/                   # 构建辅助脚本（copy-assets 等）
```

### 常用公共组件（`src/components/Common/`）

| 组件 | 用途 |
|------|------|
| `ToolHero` | 工具页标题栏（图标/标题/描述/收藏），按当前路由从 `tools.ts` 自动获取 |
| `ToolGuide` | 工具页底部说明区域，接收 `title` prop（默认「描述」） |
| `SectionHeading` | 区块标题（图标 + 标题 + 描述 + `#actions` 插槽） |
| `MetricsBar` | 指标条（`:items` prop，复用全局 `.hero-metrics`） |
| `CopyButton` | 复制按钮（统一 `copy()` 反馈，`:text` 或 `@click` 两种用法） |
| `PanelHeading` | 面板标题（title/stats/actions，compact/bar 两档） |
| `AceEditor` | Ace 代码编辑器封装（动态按需加载语言与主题） |

### 常用工具函数（`src/utils/`）

- `string.ts` — `copy()` 复制（带 toast 反馈）
- `file.ts` — `autoDown()` 下载、`downloadText()` / `downloadBlob()`、`formatBytes()`
- `clipboard.ts` — `copyImageToClipboard()` 图片复制（含浏览器支持检测）
- `format.ts` — `formatNumber()` / `getLineColumn()` 等格式化
- `chartParser.ts` — 图表工作台共享的表格/CSV 解析

## 工具列表

- **独立工具**（3）：it-tools 工具集、智能排座工具、xicons 图标库预览
- **在线编辑**（9）：字体在线预览、表格数据转换、Markdown 工作台、JSON 工作台、JavaScript 工作台、HTML/XML 工作台、CSS 工作台、富文本与 HTML 工作台、SQL 工作台
- **文本处理**（9）：文本对比、字数统计、文本去重、ASCII 字形生成器、日语转罗马音、日语动词变化、日语歌词学习工具、文本替换、词频统计
- **开发运维**（19）：随机密码生成、URL 编码/解码、UUID 生成器、时间戳转换、CRON 表达式、MD5 摘要校验、正则测试工具、Unicode 转中文、HTTP 状态码、JWT 解析、HTML 实体转义、常用进制转换、ASCII 字符对照表、Color 选择器、短链接解析、地图坐标系互转、IP 计算器、Base64 编解码、哈希计算器
- **单位换算**（10）：单位换算、长度、面积、重量、时间、温度、压力、能量、功率、存储
- **图片处理**（10）：二维码生成、在线图片处理、图片分割、电子包浆模拟器、表情包配字、图片拼接、图片 EXIF 查看、ICO 图标工具、传图取色、图片水印
- **趣味工具**（7）：P 站风格 Logo 生成、5000 兆円生成器、蔚蓝档案标题生成、光棱坦克工厂、接头霸王、谜语人、反应速度测试
- **数据图表**（15）：柱状图/横向柱状图、折线图/面积图、饼图/环形图、散点图、漏斗图、雷达图、仪表盘、热力图、K 线图、堆叠柱/堆叠面积线、矩形树图、桑基图、箱线图、日历图、词云图
- **选择随机**（4）：生成随机数、帮我决定、抛硬币、投骰子
- **生活财务**（2）：房贷计算器、延迟退休计算器
- **其他工具**（5）：数字转金额大写、手持弹幕、摩斯电码、M3U8 播放器、Emoji 大全

## 如何添加新工具

1. **创建组件**：在 `src/components/Tools/` 下创建 `<工具英文名>/<工具英文名>.vue`，可拷贝 `Example/` 模板起步
2. **注册路由**：在 `src/router/router.ts` 的 `constantRoute` 数组末尾（404 路由之前）追加路由
3. **登记卡片**：在 `src/components/Tools/tools.ts` 对应分类的 `list` 中追加工具卡片（`title` / `desc` / `logo` / `url` / `cateId`）

工具页标准结构：

```vue
<template>
  <div class="flex flex-col mt-3 flex-1">
    <!-- 标题、图标、分类、描述统一由 tools.ts 维护，ToolHero 按当前路由自动获取 -->
    <ToolHero />

    <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-300">
      <!-- 主功能区：优先使用 SectionHeading / MetricsBar / CopyButton 等公共组件 -->
    </div>

    <ToolGuide title="使用说明">
      <!-- 说明文字 -->
    </ToolGuide>
  </div>
</template>
```

约定：

- 页面标题 / 浏览器标题由路由守卫自动从 `tools.ts` 派生，改名只需改 `tools.ts` 一处
- 优先使用 Tailwind 类（含 `dark:` 前缀），非必要不写 `<style scoped>`
- 复制功能统一用 `copy()`（`src/utils/string.ts`）或 `CopyButton` 组件
- 下载功能统一用 `autoDown()`（`src/utils/file.ts`）
- 大块逻辑拆到 `src/utils/` 或 `src/composables/`，保持组件文件聚焦

## 测试

```bash
pnpm test
```

测试位于 `tests/*.test.mjs`，覆盖各工具的纯逻辑（编解码、解析、图表数据、计算器等），使用 Node 内置 `node:test`，无需额外测试框架。

## License

[MIT](LICENSE)