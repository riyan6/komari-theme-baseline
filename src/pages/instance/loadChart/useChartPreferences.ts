import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { Aggregation, RenderSeries } from "./types";

/*
  hidden in swiss theme: 采样算法 / EWMA / 隐藏曲线入口已从详情页移除，
  这里保留原有偏好状态定义，避免历史 localStorage 数据和旧组件失效。
*/

/** 持久化在 localStorage 的图表偏好：采样算法、EWMA 开关、每张图隐藏的曲线 */
export function useChartPreferences() {
  const [aggregation, setAggregation] = useLocalStorage<Aggregation>(
    "komari-instance-metric-aggregation",
    "avg",
  );
  const [ewmaEnabled, setEwmaEnabled] = useLocalStorage(
    "komari-instance-metric-ewma",
    false,
  );
  const [hiddenSeries, setHiddenSeries] = useLocalStorage<Record<string, boolean>>(
    "komari-instance-metric-hidden-series",
    {},
  );

  const hiddenKey = (chartId: string, series: RenderSeries) =>
    `${chartId}:${series.stableKey}`;

  const isSeriesHidden = (chartId: string, series: RenderSeries) =>
    hiddenSeries[hiddenKey(chartId, series)] === true;

  const toggleSeries = (chartId: string, series: RenderSeries) => {
    const key = hiddenKey(chartId, series);
    setHiddenSeries((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const toggleAllSeries = (chartId: string, series: RenderSeries[]) => {
    const allHidden = series.length > 0 && series.every((item) => isSeriesHidden(chartId, item));
    setHiddenSeries((current) => {
      const next = { ...current };
      for (const item of series) {
        next[hiddenKey(chartId, item)] = !allHidden;
      }
      return next;
    });
  };

  return {
    aggregation,
    setAggregation,
    ewmaEnabled,
    setEwmaEnabled,
    isSeriesHidden,
    toggleSeries,
    toggleAllSeries,
  };
}
