# AGENTS.md — komari-web 项目开发约束

> 本文件是本仓库所有 AI 编码代理（Gemini / Antigravity / Claude / Codex / Cursor 等）的项目级硬约束。
> 优先级：**用户当次明确指令 > 本文件 > 现有代码风格 > 通用最佳实践**。
> 若本文件与用户当次要求冲突，先向用户确认，不要自行取舍。

---

## 0. 官方文档（强制参考，优先级等同硬约束）

本项目是 **Komari 主题开发**，主题结构、配置字段、模板占位符、API 契约一律以官方文档为准：

- 主题开发指南：<https://komari-document.pages.dev/dev/theme>
- API 接口：<https://komari-document.pages.dev/dev/api>
- 托管配置（managed configuration）：<https://komari-document.pages.dev/dev/managed-config>

硬性要求：

1. 改主题结构、`komari-theme.json`、`dist/index.html` 模板或动态配置前，先查主题开发文档；文档没有的字段、类型、行为不要臆造。
2. 调后端接口前，先查 API 文档，确认 HTTP 方法、路径、参数、响应包络和鉴权；只使用文档中存在的接口和 JSON-RPC 方法。
3. 公开展示端只允许使用公开接口和 public/common RPC：
   - HTTP：`/api/public`、`/api/nodes`、`/api/recent/:uuid`、`/api/records/load`、`/api/records/ping`、`/api/task/ping`、`/api/clients` WebSocket、`/api/plugin/:short/*`
   - JSON-RPC：`public:*`、`common:*`
   - **禁止**调用 `/api/admin` 或 `admin:*` 方法（本主题没有管理权限）。
4. 代码与文档冲突时，以线上文档为准并先向用户报告，不要擅自改接口或猜字段。
5. 改动涉及主题配置/API 时，在说明里写出参考的文档章节或 URL，便于复核。

## 1. 项目定位（不可偏离）

- 本项目是 **Komari 监控系统的公开展示端主题**（`komari-theme`），不是完整后台，也不是通用管理面板。
- 只保留公开页面：
  - `/` 监控概览
  - `/instance/:uuid` 实例详情
  - `/plugin/:short/*` 插件展示
  - 404 页面
- **禁止恢复或新增 `/admin`（管理后台）、`/terminal`（运维终端）相关页面和依赖**。生产环境中这两个路径由 Komari 后端直接接管。
- **实例详情页不显示左侧服务器列表**；不要恢复 `showServerListInDetails` 配置或侧栏组件。
- 构建产物是主题包 ZIP：`preview.webp` + `komari-theme.json` + `dist/`，上传到 Komari 后台「主题管理」使用。

## 2. 技术栈锁定（不要擅自替换）

- React 19 + TypeScript 5.8 + Vite 6 + React Router 7（Library 模式，`BrowserRouter` + `useRoutes`）。
- 样式：Tailwind CSS 4（CSS-first：`@import "tailwindcss"` + `@theme inline`）+ Radix Themes 3 + `src/components/ui` 的 shadcn/ui 风格组件 + 现有自定义 CSS。
- 动画：`motion/react`（Motion 12）。不要新增 `framer-motion` 或其他动画库。
- 图表：`recharts`。
- 拖拽：`@dnd-kit/core` / `@dnd-kit/sortable` / `@dnd-kit/modifiers`。
- 状态：`zustand`（持久化偏好）+ React Context（RPC2 / LiveData / NodeList / PublicInfo / Theme）。
- 图标：`lucide-react`、`@radix-ui/react-icons`。字体：`@fontsource*`。
- **禁止擅自新增、升级、删除依赖**。确需变更依赖时，先说明理由、影响范围和替代方案，得到用户确认后才能改 `package.json` / `package-lock.json`。
- 不要引入第二套 UI 框架、CSS-in-JS、CSS 预处理器、请求库（axios 等）、状态库或路由库。

## 3. 目录与模块边界

| 目录 | 用途 |
|---|---|
| `src/pages` | 页面级组件 |
| `src/routes.ts` | 路由表（懒加载 + 预加载） |
| `src/components` | 可复用业务组件 |
| `src/components/ui` | 基础 UI 组件（shadcn 风格） |
| `src/components/status` / `src/components/noise` | 当前状态页视图模块 |
| `src/contexts` | 全局 Provider 与业务状态 |
| `src/hooks` | 自定义 hooks |
| `src/lib` | 数据层、RPC、工具库、纯函数 |
| `src/utils` | 格式化、国际化文本等工具 |
| `src/types` | 共享类型定义 |
| `src/i18n` | i18next 配置与语言包 |

- 使用 `@/` 别名指向 `src`，**不要写超过两层的相对路径**（如 `../../../`）。
- **不要修改生成物**：`dist/`、`node_modules/`、`bundle-analysis.html`、`*.zip` 主题包。
- 不要在 `src` 下新建与现有目录职责重复的目录（如再建 `src/services`、`src/store`），先复用现有结构。

## 4. 数据与接口（必须走现有通道）

- 所有 Komari RPC 调用必须走 `src/lib/rpc2.ts` / `src/contexts/RPC2Context.tsx`：
  - 不要自己 `new WebSocket()` 或直接连接 `/api/rpc2`。
  - 不要在组件里绕过 Provider 发 RPC。
- 普通 REST 请求必须走 `src/lib/http.ts` 的 `requestJson` / `api.*`：
  - 不要在组件里散落裸 `fetch()`。
  - 不要自己重复实现错误处理、超时、JSON 解析。
- 实时数据优先复用 `LiveDataContext`，节点列表优先复用 `NodeListContext`，站点/主题配置优先复用 `PublicInfoContext`。
- 新增接口字段时：
  1. 先确认 `src/types` 是否已有类型；
  2. 缺失则在对应类型文件补充；
  3. 不要用 `any` 绕过类型问题。
- 接口清单、参数和字段类型必须与官方 API 文档一致，不要凭记忆或旧代码猜：<https://komari-document.pages.dev/dev/api>

## 5. 国际化（所有用户可见文案必须 i18n）

- 所有用户可见文案必须通过 i18next（`useTranslation` / `t()`）或现有 `noise-i18n` / `resolveI18nText` 机制，**禁止在组件中硬编码中英文文案**。
- 新增翻译 key 至少同步：
  - `src/i18n/locales/en.json`
  - `src/i18n/locales/zh_CN.json`
- 其他语言（`zh_TW` / `ja_JP` / `id_ID`）由 `npm run i18n:sync` 或人工补齐，不要删除已有 key。
- 语言切换、语言 cookie、`document.documentElement.lang` 统一走 `src/utils/language.ts`，不要另写一套。
- `komari-theme.json` 中的配置项名称/帮助文本要同时提供 `en` / `zh-CN` / `ja` 三种语言。
- 用户可见文案统一使用「服务器节点 / 节点数据」，**不要出现「遥测」「Telemetry」「快照」等内部术语**。

## 6. 主题配置（komari-theme.json）

- 主题可配置项必须在 `komari-theme.json` 的 `configuration.data` 中声明（`type: "managed"`）。
- 新增配置项约定：
  - 唯一 `key`，提供 `type`（`switch` / `string` / `select` 等）和 `default`；
  - 提供 `name` 和 `help` 的多语言文本；
  - 读取时复用 `PublicInfoContext` / `theme_settings`，不要新增 `window` 全局变量。
- 外观（appearance / accent color / font）继续使用 `ThemeContext` + `useLocalStorage` + `useSystemTheme`。

### 6.1 主题包与模板硬性规则

- 主题包根目录必须包含 `komari-theme.json`，并与 `dist/`、`preview.webp` 一起打包；不要只发布源码压缩包。
- `komari-theme.json` 的 `name`、`short` 必填；`short` 只能包含大小写字母、数字、下划线和连字符，不能为空，也不能是 `default`。
- `dist/index.html` 必须保留以下原文，否则服务端无法替换自定义标题和描述：
  - `<title>Komari Monitor</title>`
  - `<meta name="description" content="A simple server monitor tool." />`
- 必须保留页脚 `Powered by Komari Monitor.`。
- 主题只能使用公开路由，不得占用 `/admin`、`/terminal`。
- 动态配置 `configuration.type` 支持 `managed` / `raw` / `redirect`；`managed` 的 `theme_settings` 是公开可读的，**禁止存放密钥、Token、私密 URL 等敏感信息**。
- 前端必须优雅处理旧版本/缺省配置：`configuration` 不存在、`data` 为 `null` / 空数组、配置项缺 `key` 或类型未知时不能崩溃。
- 版本兼容：`configuration` 约需服务器 `>= 1.0.5`；`raw` / `redirect` 需服务器 `> 1.2.0`。不要假设所有部署都支持新字段。
- 尽量保留语义化 `km-` 前缀 classname，方便用户通过自定义头部/底部 HTML 脚本定位元素。

## 7. UI / 样式规范

- 优先复用 `src/components/ui`、`src/components/status`、`src/components/noise` 中已有组件；不要重复造轮子。
- 使用现有设计 token（`--accent-*`、`--chart-*`、`--background`、`--foreground` 等）和现有间距/圆角规范；不要随手引入新色板或随意 px 值。
- 深色模式：使用 `.dark` class 和 `@custom-variant dark`，新组件必须同时兼容浅色/深色。
- 响应式：同时保证桌面端和移动端（使用现有 `use-mobile` hook）；不要只改一端。
- 动画遵循 `prefers-reduced-motion`（复用 `useReducedMotion`），不要强制播放大幅动画。
- 处理 UI 像素/窗口坐标时按用户全局规则**直接取整输出，不要在思考阶段反复多轮验算**。

### 7.1 字体规范（硬约束）

- 页面右上角的 **FontSwitcher 字体切换器决定英文/拉丁文本的字体**，可选 `Inter Tight` / `Geist` / `Space Grotesk`。
- 字体切换的唯一实现链路是：
  - `src/lib/font-store.ts` 写入 `document.documentElement.dataset.font = "inter-tight" | "geist" | "space-grotesk"`；
  - `src/noise.css` 根据 `html[data-font="..."]` 定义 `--font-current-sans`；
  - `--font-sans`、`--font-serif`、`--font-mono` 都必须指向 `var(--font-current-sans)`。
- **英文/拉丁文本、UI 标签、按钮、菜单、弹层、表格、数字必须继承页面选中的字体**（`font-sans` 或 `--font-current-sans`）。
- **禁止**给正文/UI 默认使用以下等宽字体或样式：
  - Tailwind `font-mono`
  - CSS `font-family: monospace` / `ui-monospace` / `"Cascadia Mono"` / `"Courier New"` / `Consolas`
  - 在 `[role="menu"]`、`body`、`button`、`.rt-PopoverContent` 等全局选择器上写死 `monospace`
- 数字对齐必须用 `tabular-nums` / `font-variant-numeric: tabular-nums`，**不要用等宽字体来凑对齐**。
- 只有真正的代码/日志/终端内容才允许等宽字体，且必须：
  1. 用独立 class 局部作用，不要污染全局选择器；
  2. 在改动说明中明确告知用户。
- 新增字体时必须扩展现有 `FONT_OPTIONS` 与 `noise.css` 的 `data-font` 规则，**不要另建第二套字体变量或第二套切换逻辑**。

### 7.2 字阶规范（硬约束）

公开展示端统一采用 `src/noise.css` 中定义的 **7 级编码字阶系统**，所有新增或修改的 UI 区域必须按层级选用对应的 CSS 变量或语义类，**禁止随意硬编码 `10px`、`11px` 等过小字号**：

| 等级 | CSS 变量 / 语义类 | 字号 / 字重 | 对应 UI 区域 |
|---|---|---|---|
| **L1 Hero** | `--font-size-hero` / `.type-hero` (`.main-number`) | `clamp(96px, 12vw, 168px)` | `StatusHero` 左侧核心在线比主数字 |
| **L2 Stat** | `--font-size-stat` / `.type-stat` (`.sub-number`) | `42px` | `StatusHero` 右侧全网瞬时速率、全网累计流量 |
| **L3 Title** | `--font-size-title` / `.type-title` | `18px / 600` | `NavBar` 站点品牌名、`Index` 空状态主标题 |
| **L4 Value** | `--font-size-value` / `.type-value` (`.table-value`, `.node-name`) | `16px / 600` | 节点名称、地区代码、负载、CPU/内存/磁盘/流量主数值、运行时间、账单周期价格、服务器匹配数 |
| **L5 Control** | `--font-size-control` / `.type-control` | `14px / 500-600` | 搜索/排序/视图切换控件（高度 `42px`）、Hero 状态摘要与上下行明细、右侧服务器总数计数、「管理后台」按钮 |
| **L6 Label** | `--font-size-label` / `.type-label` (`.label-swiss`, `.type-table-head`) | `13px / 600` | 顶栏 `实时 · 2S` 与 `FontSwitcher`、Hero 小标题、分组栏标签与各分组胶囊、工具栏字段标题、表格表头行 |
| **L7 Meta** | `--font-size-meta` / `.type-meta`（卡片紧凑辅助处 `.type-caption` `12px`） | `13px / 500` | 顶栏 `EN / 中`、表格行内在线状态、实时上下行速率、账单剩余天数、`ServerCardView` 卡片底部速率、`Footer` 页脚 |

硬性规则：
- `.type-label` 仅声明字号/字重/字距/大写等排版属性，**禁止在未分层的 `.type-label` 中写死 `color`**，避免覆盖 Tailwind 的 `text-white` / `text-black` 等状态色类；默认弱化灰字统一用 `.label-swiss` 或显式颜色工具类。
- 调整字阶时统一修改 `src/noise.css` 中的 `--font-size-*` 变量，保持全站各区域比例联动。

## 8. 编码风格

- TypeScript `strict: true`。除非确实无法避免，不使用 `any`；禁止用 `@ts-ignore` / `@ts-expect-error` 掩盖错误。
- 组件 `PascalCase`，hooks `useXxx`，函数/变量 `camelCase`，常量 `UPPER_SNAKE_CASE`。
- 跟随所在文件既有格式（缩进、引号、分号风格）；项目没有 Prettier，**不要擅自做全文件格式化**。
- 不做与任务无关的 import 排序、重命名、删除注释、重排代码。
- 单次改动尽量小而聚焦：一次只解决一个问题，避免大范围“顺手重构”。

## 9. 构建、Lint 与验证

- Node.js 要求 22+（当前环境 Node 24）。
- 安装依赖：`npm install`
- 本地开发：`npm run dev`
- 类型检查 + 生产构建：`npm run build`（= `tsc -b && vite build`）
- Lint：`npm run lint`
- 主题打包：`npm run build:theme`
- i18n 同步：`npm run i18n:sync` / `npm run i18n:sync:dry`
- 本地开发时 `VITE_API_TARGET` 应指向**本地或内网的 Komari 后端**（默认 `http://127.0.0.1:25774`）；不要长期指向 Cloudflare 公网域名，否则所有 API 会经 Vite 的 HTTP/1.1 代理，延迟不可控。

**验证策略：**

- 遵循用户全局规则：**默认改完代码直接交还控制权，不自动启动 dev server、不做浏览器检查、不运行额外验证脚本**。
- 如果用户明确要求验证，优先执行 `npm run build` 和 `npm run lint`，并把结果如实汇报。
- 改动完成后向用户说明：改了哪些文件、为什么改、哪些地方没有验证。

## 10. 明确禁止事项

- ❌ 禁止新增管理后台、运维终端页面或相关依赖。
- ❌ 禁止引入新的 UI 框架、CSS 方案、状态管理库、路由库、请求库。
- ❌ 禁止直接编辑 `dist/`、`node_modules/`、`package-lock.json`（依赖变更除外）。
- ❌ 禁止为了“通过编译”把类型改成 `any` 或加 `@ts-ignore`。
- ❌ 禁止删除、改坏已有 i18n key、主题配置字段、RPC 类型或公共 API 结构。
- ❌ 禁止修改用户没有点名的文件；不要以“顺手优化”为理由扩大改动范围。
- ❌ 禁止把项目改回完整 Komari Web 后台。

## 11. 已知问题与历史坑

- `package.json` 中曾存在 `"komari-web": "file:"` 自依赖，会在 `node_modules/komari-web` 生成指向项目根目录的 Junction，导致递归扫描无限循环。**该依赖已移除，不要加回来**。
- `react-router-dom` 实际是运行时依赖，但当前放在 `devDependencies`；如调整依赖分类，需要说明原因并同步 lockfile。
- 项目目前没有单元测试 / E2E 测试框架；不要擅自创建测试目录或安装测试依赖，除非用户明确要求。
- 主题包构建依赖 `preview.webp`、`komari-theme.json`、`dist/` 三个文件/目录，删除或改名前务必确认。
- 已移除：`src/pages/instance/loadChart/useDashboard.ts` 曾调用 `POST /api/admin/theme/settings` 保存全局图表模板。该「保存为全局模板」按钮和写入逻辑已删除；主题只读取 `theme_settings.chartDashboardTemplate`，不要再加回任何 admin 写接口。

## 12. 用户补充约束（每次按需追加）

<!-- 在此追加你临时要求 Gemini 必须遵守的规则；越具体越好。 -->
- （示例）只允许修改 `src/pages/Index.tsx` 及其直接依赖，不要改动其他页面。
- （示例）保持现有视觉风格不变，不新增颜色、不改布局。
- （示例）不要新增任何依赖。
