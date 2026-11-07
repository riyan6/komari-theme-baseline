import { lazy, use, useState, type ComponentType } from "react";
import type { RouteObject } from "react-router-dom";
import React from "react";
import { currentNavigationSeq, pendingNavigationGate } from "@/lib/routeData";

/**
 * 页面切换时等数据：随某次导航挂载的路由元素，在这次导航登记的请求到达（或 ROUTE_DATA_BUDGET_MS 预算用完）前挂起，
 * transition 让旧页面继续显示。只有挂载时所属的那次导航会挂起：已挂载的布局之后再重渲染不会挂起，
 * 同步更新也就不会意外露出 Suspense 的 fallback。这里只有一个 hook，use() 放在最后。
 */
const RouteGate = ({ component: Component }: { component: ComponentType }) => {
  const [seq] = useState(currentNavigationSeq);
  const gate = pendingNavigationGate(seq);
  if (gate) use(gate);
  return React.createElement(Component);
};

/**
 * 懒加载页面：element 用 React.lazy，handle.preload 指向同一个 import()，
 * 悬停 / 点击时 routePreload 按地址匹配并提前下载代码块（同一模块只下载一次）。
 */
const page = (importer: () => Promise<{ default: ComponentType }>) => {
  const Component = lazy(importer);
  return { element: React.createElement(RouteGate, { component: Component }), handle: { preload: importer } };
};

const Index = page(() => import("./pages/Index"));
const Instance = page(() => import("./pages/instance"));
const PluginPage = page(() => import("./pages/plugin_page"));
const NotFound = page(() => import("./pages/404"));

export const routes: RouteObject[] = [
  {
    path: "/",
    ...page(() => import("./pages/_layout")),
    children: [
      { index: true, ...Index },
      {
        path: "instance/:uuid",
        ...Instance,
      },
      {
        path: "plugin/:short/*",
        ...PluginPage,
      },
    ],
  },
  // Catch-all 404 route
  { path: "*", ...NotFound },
];
