import { formatMilliseconds } from "@/components/metricChartShared";
import type { PublicPingTask } from "@/types/metrics";
import {
  PING_LATENCY_METRIC,
  formatRemainingTags,
  isLoss,
  isPingMetric,
  pingTaskId,
  pingTaskName,
} from "@/utils/metricSeries";
import { formatBytes } from "@/utils/unitHelper";
import { getMetricLabel } from "./catalog";
import type { MetricDefinition, MetricKind, RenderSeries, TFn } from "./types";

export const formatTags = (
  metricKey: string,
  tags: Record<string, string> | undefined,
  pingTaskMap: ReadonlyMap<string, PublicPingTask>,
  t: TFn,
) => {
  if (!tags || Object.keys(tags).length === 0) return "";

  const taskId = pingTaskId(tags);
  if (isPingMetric(metricKey) && taskId) {
    const taskLabel = pingTaskName(
      taskId,
      pingTaskMap,
      (id) => `${t("ping.task")} ${id}`,
    );
    const remaining = formatRemainingTags(tags, ["task_id"]);
    return remaining ? `${taskLabel} ${remaining}` : taskLabel;
  }

  if (tags.device_name) {
    const remaining = formatRemainingTags(tags, ["device_name", "device_index"]);
    return remaining ? `${tags.device_name} ${remaining}` : String(tags.device_name);
  }
  if (tags.device_index !== undefined) {
    const deviceLabel = `GPU ${Number(tags.device_index) + 1}`;
    const remaining = formatRemainingTags(tags, ["device_index"]);
    return remaining ? `${deviceLabel} ${remaining}` : deviceLabel;
  }
  if (taskId) {
    const taskLabel = `${t("ping.task")} ${taskId}`;
    const remaining = formatRemainingTags(tags, ["task_id"]);
    return remaining ? `${taskLabel} ${remaining}` : taskLabel;
  }
  return formatRemainingTags(tags);
};

export const formatSeriesLabel = (
  metricKey: string,
  tags: Record<string, string> | undefined,
  definitions: Map<string, MetricDefinition>,
  pingTaskMap: ReadonlyMap<string, PublicPingTask>,
  t: TFn,
) => {
  const tagLabel = formatTags(metricKey, tags, pingTaskMap, t);
  if (metricKey === PING_LATENCY_METRIC && tagLabel) return tagLabel;
  const metricLabel = getMetricLabel(metricKey, definitions);
  return tagLabel ? `${metricLabel} ${tagLabel}` : metricLabel;
};

export const asMetricValue = (value: number | null | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
};

export const formatValue = (value: unknown, kind: MetricKind) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  switch (kind) {
    case "percent":
      return `${value.toFixed(1)}%`;
    case "bytes":
      return formatBytes(value);
    case "bytesPerSecond":
      return `${formatBytes(value)}/s`;
    case "count":
      return `${Math.round(value)}`;
    case "temperature":
      return `${value.toFixed(1)}°C`;
    case "milliseconds":
      return formatMilliseconds(value);
    case "load":
      return value.toFixed(2);
    default:
      return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
};

const pad2 = (n: number) => String(n).padStart(2, "0");

export const labelFormatter = (hours: number | undefined) => {
  return (value: unknown) => {
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return "";
    const hh = pad2(date.getHours());
    const min = pad2(date.getMinutes());
    const ss = pad2(date.getSeconds());
    if (!hours || hours < 24) {
      return `${hh}:${min}:${ss}`;
    }
    const mm = pad2(date.getMonth() + 1);
    const dd = pad2(date.getDate());
    return `${mm}-${dd} ${hh}:${min}`;
  };
};

export const getLatestText = (
  rows: Array<Record<string, string | number | null>>,
  series: RenderSeries[],
) => {
  for (let rowIndex = rows.length - 1; rowIndex >= 0; rowIndex--) {
    const row = rows[rowIndex];
    for (let seriesIndex = 0; seriesIndex < series.length; seriesIndex++) {
      const item = series[seriesIndex];
      const value = row[item.dataKey];
      if (
        typeof value === "number" &&
        Number.isFinite(value) &&
        !(item.kind === "milliseconds" && isLoss(value))
      ) {
        return `${item.label}: ${formatValue(value, item.kind)}`;
      }
    }
  }
  return "-";
};
