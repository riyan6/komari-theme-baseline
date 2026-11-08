import { toMetricChartConfig } from "@/components/metricChartShared";
import type { MetricPoint, MetricSeries, PublicPingTask } from "@/types/metrics";
import {
  PING_LOSS_METRIC,
  applyMetricEwma,
  comparePingTaskOrder,
  countMetricPoints,
  isLoss,
  isPingMetric,
  metricChartBoundaryTicks,
  metricSeriesColor,
  metricSeriesDataKey,
  metricSeriesKey,
  metricTags,
  metricTagsKey,
  sortMetricChartRows,
  trimMetricChartBoundaryRows,
  type MetricChartRow,
} from "@/utils/metricSeries";
import type { RecordFormat } from "@/utils/RecordHelper";
import { MAX_REALTIME_POINTS } from "./constants";
import { fallbackCatalogMap, getMetricKind } from "./catalog";
import { asMetricValue, formatSeriesLabel, formatTags, getLatestText } from "./format";
import type {
  BuiltChartData,
  ChartAxis,
  DashboardChart,
  MetricDefinition,
  NodeLike,
  PreparedChartData,
  RenderSeries,
  TFn,
} from "./types";

export const buildRowsFromMetricSeries = (
  metricSeries: MetricSeries[],
  chart: DashboardChart,
  definitions: Map<string, MetricDefinition>,
  pingTaskMap: ReadonlyMap<string, PublicPingTask>,
  t: TFn,
) => {
  const rows = new Map<string, Record<string, string | number | null>>();
  const renderSeries: RenderSeries[] = [];

  const pingLossByTagKey = new Map<string, Map<string, MetricPoint>>();
  metricSeries
    .filter((series) => series.metric_key === PING_LOSS_METRIC)
    .forEach((series) => {
      const tagKey = metricTagsKey(metricTags(series));
      const pointMap = pingLossByTagKey.get(tagKey) ?? new Map<string, MetricPoint>();
      for (const point of series.points ?? []) {
        const timestamp = new Date(point.time).toISOString();
        pointMap.set(timestamp, point);
      }
      pingLossByTagKey.set(tagKey, pointMap);
    });

  metricSeries
    .filter((series) => chart.metrics.includes(series.metric_key))
    .forEach((series, index) => {
      const tags = metricTags(series);
      const stableKey = metricSeriesKey(series.metric_key, tags);
      const dataKey = metricSeriesDataKey(series.metric_key, tags);
      const label = formatSeriesLabel(series.metric_key, tags, definitions, pingTaskMap, t);
      const kind = getMetricKind(series.metric_key, series.unit);
      const isPing = isPingMetric(series.metric_key) || kind === "milliseconds";
      const points = series.points ?? [];
      const hasPointCounts = points.some(
        (point) => typeof point.count === "number" && point.count > 0,
      );
      const lossMap = isPing ? pingLossByTagKey.get(metricTagsKey(tags)) : undefined;
      const samples: Array<{ time: number; value: number | null }> | undefined = isPing
        ? []
        : undefined;

      for (const point of points) {
        const timestamp = new Date(point.time).toISOString();
        const timeMs = new Date(point.time).getTime();
        const rawValue = asMetricValue(point.value);

        if (isPing) {
          const lossPoint = lossMap?.get(timestamp);
          const rawCount = point.count ?? lossPoint?.count;
          // 跳过 fill_empty 在区间首尾生成的无采样占位点（count 缺失或为 0 且无有效值）
          if (
            hasPointCounts &&
            (!rawCount || rawCount <= 0) &&
            rawValue === null &&
            (lossPoint?.value === null || lossPoint?.value === undefined)
          ) {
            continue;
          }

          const count =
            typeof rawCount === "number" && rawCount > 0 ? rawCount : 1;
          const lossRatio =
            lossPoint &&
            typeof lossPoint.value === "number" &&
            Number.isFinite(lossPoint.value)
              ? Math.min(1, Math.max(0, lossPoint.value))
              : isLoss(rawValue)
                ? 1
                : 0;
          const lostCount = Math.min(
            count,
            Math.max(0, Math.round(lossRatio * count)),
          );
          const validCount = count - lostCount;
          const validSampleValue = isLoss(rawValue) ? null : rawValue;

          for (let i = 0; i < validCount; i += 1) {
            samples!.push({ time: timeMs, value: validSampleValue });
          }
          for (let i = 0; i < lostCount; i += 1) {
            samples!.push({ time: timeMs, value: null });
          }

          const row = rows.get(timestamp) ?? { time: timestamp };
          row[dataKey] =
            lostCount >= count || isLoss(rawValue) ? null : rawValue;
          rows.set(timestamp, row);
        } else {
          const row = rows.get(timestamp) ?? { time: timestamp };
          row[dataKey] = rawValue;
          rows.set(timestamp, row);
        }
      }

      renderSeries.push({
        dataKey,
        stableKey,
        metricKey: series.metric_key,
        label,
        color: metricSeriesColor(index),
        kind,
        pointCount: countMetricPoints(series),
        unit: series.unit,
        tags,
        samples,
      });
    });

  return {
    rows: sortMetricChartRows(Array.from(rows.values())),
    series: renderSeries,
  };
};

export const buildRowsFromRealtime = (
  records: RecordFormat[],
  chart: DashboardChart,
  node: NodeLike | undefined,
  pingTaskMap: ReadonlyMap<string, PublicPingTask>,
  t: TFn,
) => {
  const rows = new Map<string, Record<string, string | number | null>>();
  const renderSeries: RenderSeries[] = [];
  const seriesIndex = new Map<string, RenderSeries>();
  const recent = Array.isArray(records) ? records.slice(-MAX_REALTIME_POINTS) : [];

  for (const record of recent) {
    const time = record.time;
    if (!time) continue;
    const row = rows.get(time) ?? { time };

    for (const metricKey of chart.metrics) {
      const metric = fallbackCatalogMap.get(metricKey);
      if (!metric) continue;
      // 没有实时数据源的指标（例如延迟）交给历史查询，避免在实时记录里生成一条全空序列。
      if (!metric.realtimeValue && !metric.realtimeTaggedValues) continue;

      if (metric.realtimeTaggedValues) {
        const values = metric.realtimeTaggedValues(record, node);
        for (const tagged of values) {
          const key = `${metricKey}:${metricTagsKey(tagged.tags)}`;
          let item = seriesIndex.get(key);
          if (!item) {
            const tagLabel = formatTags(metricKey, tagged.tags, pingTaskMap, t);
            const stableKey = metricSeriesKey(metricKey, tagged.tags);
            item = {
              dataKey: metricSeriesDataKey(metricKey, tagged.tags),
              stableKey,
              metricKey,
              label: tagLabel ? `${metric.label} ${tagLabel}` : metric.label,
              color: metricSeriesColor(renderSeries.length),
              kind: metric.kind,
              unit: metric.unit,
              tags: tagged.tags,
            };
            seriesIndex.set(key, item);
            renderSeries.push(item);
          }
          row[item.dataKey] = asMetricValue(tagged.value);
        }
        continue;
      }

      const key = `${metricKey}:`;
      let item = seriesIndex.get(key);
      if (!item) {
        const stableKey = metricSeriesKey(metricKey);
        item = {
          dataKey: metricSeriesDataKey(metricKey),
          stableKey,
          metricKey,
          label: metric.label,
          color: metricSeriesColor(renderSeries.length),
          kind: metric.kind,
          unit: metric.unit,
        };
        seriesIndex.set(key, item);
        renderSeries.push(item);
      }
      row[item.dataKey] = asMetricValue(metric.realtimeValue?.(record, node));
    }

    rows.set(time, row);
  }

  return {
    rows: sortMetricChartRows(Array.from(rows.values())),
    series: renderSeries,
  };
};

export const mergeBuiltChartData = (
  primary: BuiltChartData,
  supplemental: BuiltChartData,
): BuiltChartData => {
  const existingSeries = new Set(primary.series.map((series) => series.stableKey));
  const addedSeries = supplemental.series.filter(
    (series) => !existingSeries.has(series.stableKey),
  );
  if (addedSeries.length === 0) return primary;

  const addedDataKeys = new Set(addedSeries.map((series) => series.dataKey));
  const rows = new Map(primary.rows.map((row) => [String(row.time), { ...row }]));
  for (const row of supplemental.rows) {
    const time = String(row.time);
    const merged = rows.get(time) ?? { time };
    for (const dataKey of addedDataKeys) {
      if (dataKey in row) merged[dataKey] = row[dataKey];
    }
    rows.set(time, merged);
  }

  return {
    rows: sortMetricChartRows(Array.from(rows.values())),
    series: [...primary.series, ...addedSeries].map((series, index) => ({
      ...series,
      color: metricSeriesColor(index),
    })),
  };
};

const metricUnitKey = (series: RenderSeries) => {
  const unit = series.unit?.trim().toLowerCase();
  return unit ? `unit:${unit}` : `kind:${series.kind}`;
};

export const prepareChartData = (
  built: BuiltChartData,
  metricOrder: string[],
  pingTaskMap: ReadonlyMap<string, PublicPingTask>,
): PreparedChartData => {
  const metricPositions = new Map(
    metricOrder.map((metricKey, index) => [metricKey, index]),
  );
  const orderedSeries = [...built.series].sort((left, right) => {
    const positionDelta =
      (metricPositions.get(left.metricKey) ?? Number.MAX_SAFE_INTEGER) -
      (metricPositions.get(right.metricKey) ?? Number.MAX_SAFE_INTEGER);
    if (positionDelta !== 0) return positionDelta;
    if (
      left.metricKey === right.metricKey &&
      isPingMetric(left.metricKey)
    ) {
      const taskOrder = comparePingTaskOrder(left.tags, right.tags, pingTaskMap);
      if (taskOrder !== 0) return taskOrder;
    }
    if (left.stableKey === right.stableKey) return 0;
    return left.stableKey < right.stableKey ? -1 : 1;
  });

  const unitAxes = new Map<string, "left" | "right">();
  const axes: ChartAxis[] = [];
  const series: RenderSeries[] = [];
  for (const item of orderedSeries) {
    const unitKey = metricUnitKey(item);
    let yAxisId = unitAxes.get(unitKey);
    if (!yAxisId) {
      if (unitAxes.size >= 2) continue;
      yAxisId = unitAxes.size === 0 ? "left" : "right";
      unitAxes.set(unitKey, yAxisId);
      axes.push({ id: yAxisId, kind: item.kind, orientation: yAxisId });
    }
    series.push({
      ...item,
      yAxisId,
      color: metricSeriesColor(series.length),
    });
  }

  const plottedDataKeys = new Set(series.map((item) => item.dataKey));
  const rows = built.rows.map((row) => {
    const plottedRow: MetricChartRow = { time: row.time };
    for (const dataKey of plottedDataKeys) {
      if (dataKey in row) plottedRow[dataKey] = row[dataKey];
    }
    return plottedRow;
  });

  return { rows, series, axes };
};

/** 一张图表卡片要画的全部数据：历史指标（实时模式下并上 recent 记录）→ 坐标轴分配 → EWMA → 首尾裁剪 */
export const buildChartView = ({
  chart,
  metricSeries,
  records,
  node,
  definitionMap,
  pingTaskMap,
  isRealtime,
  ewmaEnabled,
  t,
}: {
  chart: DashboardChart;
  metricSeries: MetricSeries[];
  records: RecordFormat[];
  node: NodeLike | undefined;
  definitionMap: Map<string, MetricDefinition>;
  pingTaskMap: ReadonlyMap<string, PublicPingTask>;
  isRealtime: boolean;
  ewmaEnabled: boolean;
  t: TFn;
}) => {
  const metricBuilt = buildRowsFromMetricSeries(
    metricSeries,
    chart,
    definitionMap,
    pingTaskMap,
    t,
  );
  const rawBuilt = isRealtime
    ? mergeBuiltChartData(
        buildRowsFromRealtime(records, chart, node, pingTaskMap, t),
        metricBuilt,
      )
    : metricBuilt;
  const built = prepareChartData(rawBuilt, chart.metrics, pingTaskMap);
  const trimmedRows = trimMetricChartBoundaryRows(
    applyMetricEwma(built.rows, built.series, ewmaEnabled),
    built.series.map((item) => item.dataKey),
  );
  const pingDataKeys = built.series
    .filter((item) => isPingMetric(item.metricKey) || item.kind === "milliseconds")
    .map((item) => item.dataKey);
  const rows =
    pingDataKeys.length === 0
      ? trimmedRows
      : trimmedRows.map((row) => {
          let nextRow: MetricChartRow | null = null;
          for (const dataKey of pingDataKeys) {
            if (dataKey in row && isLoss(row[dataKey])) {
              if (!nextRow) nextRow = { ...row };
              nextRow[dataKey] = null;
            }
          }
          return nextRow ?? row;
        });
  return {
    series: built.series,
    axes: built.axes,
    rows,
    ticks: metricChartBoundaryTicks(rows),
    config: toMetricChartConfig(built.series),
    latestText: getLatestText(rows, built.series),
  };
};

export type ChartView = ReturnType<typeof buildChartView>;
