# Komari Theme (公开展示端主题)

本项目基于 Komari Web UI 改造，移除了远程运维工作台与管理后台相关页面及依赖，专注于**访客/公开展示端**，作为独立的自定义主题运行在 Komari 监控系统中。

官方参考文档：[Komari 主题开发与配置文件](https://komari-document.pages.dev/dev/theme.html#%E4%B8%BB%E9%A2%98%E9%85%8D%E7%BD%AE%E6%96%87%E4%BB%B6)

## 页面范围

- **首页监控概览 (`/`)**：实时展示服务器节点列表、卡片/表格模式、实时网络上下行、区域统计与离线节点排布。
- **实例详情页 (`/instance/:uuid`)**：节点详细负载图表（CPU、内存/Swap、磁盘、实时吞吐、网络延迟）以及自定义模板。
- **插件展示页 (`/plugin/:short/*`)**：对公开插件的 iframe 嵌入支持。
- **404 页面**。

> **说明**：`/admin`（管理后台）与 `/terminal`（运维终端）在 Komari 生产运行中均由系统后端服务直接内置接管；在本地开发模式（`npm run dev`）下，已配置 Vite 自动代理至后端的对应路径。

## 开发环境配置

### 前置要求

建议安装 Node.js 22 及以上版本。

### 安装依赖

```bash
npm install
```

### 配置后端 API 地址

1. 复制 `.env.example` 文件并重命名为 `.env.development`。
2. 将 `VITE_API_TARGET` 修改为你的 Komari 后端地址（默认为 `http://127.0.0.1:25774`）。

### 启动开发服务器

```bash
npm run dev
```

### 构建主题包

支持跨平台（Windows / Linux / macOS）一键构建打包：

```bash
npm run build:theme
```

或者（Linux / macOS 环境也可使用）：

```bash
./build-theme.sh
```

构建完成后会在根目录下生成 `komari-theme-v<日期>-<commit>.zip` 主题包，直接在 Komari 管理后台的「系统设置 -> 主题管理」中上传并应用即可。

## 主题配置 (`komari-theme.json`)

主题的所有可配置参数在 `komari-theme.json` 的 `configuration` 字段中声明（类型为 `managed`）。上传后，Komari 管理后台会自动生成对应的可视化配置项表单供管理员调整。
