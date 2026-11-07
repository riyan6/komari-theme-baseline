/*
  hidden in swiss theme: S/M/L 尺寸、删除、拖拽、新增图表、重置入口已从详情页移除；
  这里保留看板状态与全局模板读取，避免其它入口或后续页面继续复用旧状态时失效。
*/
import { useEffect, useMemo, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import type { DragEndEvent } from "@dnd-kit/core";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import { getMetricLabel } from "./catalog";
import { DASHBOARD_TEMPLATE_KEY } from "./constants";
import { normalizeDashboard, parseDashboardTemplate } from "./dashboard";
import type { ChartSize, DashboardChart, MetricDefinition } from "./types";

/** 图表看板：卡片列表（由全局模板初始化）、增删改排序（只读配置，不回写主题设置） */
export function useDashboard(definitionMap: Map<string, MetricDefinition>) {
  const { publicInfo } = usePublicInfo();
  const globalDashboardTemplate =
    publicInfo?.theme_settings?.[DASHBOARD_TEMPLATE_KEY];
  const [dashboard, setDashboard] = useState<DashboardChart[]>(() =>
    parseDashboardTemplate(globalDashboardTemplate),
  );
  const charts = useMemo(() => normalizeDashboard(dashboard), [dashboard]);

  useEffect(() => {
    setDashboard(parseDashboardTemplate(globalDashboardTemplate));
  }, [globalDashboardTemplate]);

  const updateChart = (id: string, updater: (chart: DashboardChart) => DashboardChart) => {
    setDashboard((current) => normalizeDashboard(current).map((chart) => (chart.id === id ? updater(chart) : chart)));
  };

  const addChart = (metricKey: string) => {
    if (!metricKey) return;
    setDashboard((current) => {
      const normalized = normalizeDashboard(current);
      const nextIndex = normalized.length + 1;
      const title = getMetricLabel(metricKey, definitionMap);
      return [
        ...normalized,
        {
          id: `custom-${Date.now()}`,
          title: title || `Chart ${nextIndex}`,
          metrics: [metricKey],
          size: "medium",
        },
      ];
    });
  };

  const removeChart = (id: string) => {
    setDashboard((current) => normalizeDashboard(current).filter((chart) => chart.id !== id));
  };

  const resetDashboard = () => {
    setDashboard(parseDashboardTemplate(globalDashboardTemplate));
  };

  const addMetric = (chartId: string, metricKey: string) => {
    updateChart(chartId, (chart) => {
      if (!metricKey || chart.metrics.includes(metricKey)) return chart;
      return {
        ...chart,
        metrics: [...chart.metrics, metricKey],
      };
    });
  };

  const removeMetric = (chartId: string, metricKey: string) => {
    updateChart(chartId, (chart) => ({
      ...chart,
      metrics: chart.metrics.filter((item) => item !== metricKey),
    }));
  };

  const setChartSize = (chartId: string, size: ChartSize) => {
    updateChart(chartId, (chart) => ({ ...chart, size }));
  };

  const handleChartDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setDashboard((current) => {
      const normalized = normalizeDashboard(current);
      const oldIndex = normalized.findIndex((chart) => chart.id === active.id);
      const newIndex = normalized.findIndex((chart) => chart.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return current;
      return arrayMove(normalized, oldIndex, newIndex);
    });
  };

  return {
    charts,
    resetDashboard,
    addChart,
    removeChart,
    addMetric,
    removeMetric,
    setChartSize,
    handleChartDragEnd,
  };
}
