import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PingMetricStat } from "@/types/metrics";
import {
  isLoss,
  isPingMetric,
  pingMetricStatKey,
  pingTaskId,
} from "@/utils/metricSeries";
import { formatValue, labelFormatter } from "../loadChart/format";
import type { ChartView } from "../loadChart/series";
import type { ChartAxis, MetricKind, RenderSeries } from "../loadChart/types";

type ChartBlockProps = {
  title: string;
  view: ChartView;
  /** 绘图区总高（含 X 轴刻度） */
  height?: number;
  /** CPU 图：Y 轴自适应上限 = max(10%, 数据最大值向上取整到整齐刻度)，刻度 3 个 */
  isCpu?: boolean;
  /** 进程数图：Y 轴使用整齐整数刻度（如 0 / 35 / 70） */
  compactY?: boolean;
  /** 延迟图：不显示上方图例，下方显示监控目标明细表 */
  isPing?: boolean;
  displayRangeHours?: number;
  pingStatsMap?: ReadonlyMap<string, PingMetricStat>;
  uuid?: string;
  busy?: boolean;
  last?: boolean;
};

const SERIES_DASHES: Array<string | undefined> = [
  undefined,
  "4 2",
  "1 2",
  "6 2 1 2",
];

const seriesStyle = (index: number) => ({
  strokeDasharray: SERIES_DASHES[index % SERIES_DASHES.length],
  strokeWidth: 1.25 + Math.floor(index / SERIES_DASHES.length) * 0.5,
});

const latestValueText = (view: ChartView) => {
  for (let rowIndex = view.rows.length - 1; rowIndex >= 0; rowIndex -= 1) {
    const row = view.rows[rowIndex];
    for (const item of view.series) {
      const value = row[item.dataKey];
      if (typeof value !== "number" || !Number.isFinite(value)) continue;
      // 延迟指标的丢包样本不是真实延迟，最新值不能取它。
      if (item.kind === "milliseconds" && isLoss(value)) continue;
      return formatValue(value, item.kind);
    }
  }
  return "—";
};

const valuesForAxis = (view: ChartView, axis: ChartAxis) => {
  const series = view.series.filter((item) => item.yAxisId === axis.id);
  const values: number[] = [];
  for (const row of view.rows) {
    for (const item of series) {
      const value = row[item.dataKey];
      if (typeof value === "number" && Number.isFinite(value)) {
        if (
          (axis.kind === "milliseconds" || isPingMetric(item.metricKey)) &&
          isLoss(value)
        ) {
          continue;
        }
        values.push(value);
      }
    }
  }
  return values;
};

/** 向上取整到 1、2、5 × 10^n 整齐刻度 */
const niceCeil125 = (value: number, min = 1): number => {
  const target = Math.max(value, min);
  const exp = Math.floor(Math.log10(target));
  const base = 10 ** exp;
  const normalized = target / base;
  const factor =
    normalized <= 1 + 1e-9
      ? 1
      : normalized <= 2 + 1e-9
        ? 2
        : normalized <= 5 + 1e-9
          ? 5
          : 10;
  return factor * base;
};

const axisDomain = (
  view: ChartView,
  axis: ChartAxis,
  isCpu?: boolean,
  compactY?: boolean,
) => {
  const values = valuesForAxis(view, axis);
  const maximum = values.length > 0 ? Math.max(0, ...values) : 0;

  if (axis.kind === "percent") {
    if (isCpu) {
      const niceMax = Math.min(100, Math.max(10, niceCeil125(maximum, 10)));
      return {
        domain: [0, niceMax] as [number, number],
        ticks: [0, niceMax / 2, niceMax],
      };
    }
    return { domain: [0, 100] as [number, number], ticks: [0, 50, 100] };
  }

  if (axis.kind === "milliseconds") {
    const niceMax = niceCeil125(maximum, 10);
    return {
      domain: [0, niceMax] as [number, number],
      ticks: [0, niceMax / 2, niceMax],
    };
  }

  if (compactY || axis.kind === "count") {
    let top: number;
    if (maximum <= 10) {
      top = Math.max(2, Math.ceil(maximum / 2) * 2);
    } else if (maximum <= 100) {
      top = Math.ceil(maximum / 10) * 10;
    } else {
      const step = niceCeil125(maximum / 2, 10);
      top = step * 2;
    }
    return {
      domain: [0, top] as [number, number],
      ticks: [0, Math.round(top / 2), top],
    };
  }

  if (axis.kind === "bytes" || axis.kind === "bytesPerSecond") {
    const unitsMax = 5;
    let unitIndex = 0;
    let scaled = maximum;
    while (scaled >= 1024 && unitIndex < unitsMax) {
      scaled /= 1024;
      unitIndex += 1;
    }
    const niceScaled = niceCeil125(scaled, 1);
    const niceMax = niceScaled * 1024 ** unitIndex;
    return {
      domain: [0, niceMax] as [number, number],
      ticks: [0, niceMax / 2, niceMax],
    };
  }

  const niceMax = niceCeil125(maximum, 1);
  return {
    domain: [0, niceMax] as [number, number],
    ticks: [0, niceMax / 2, niceMax],
  };
};

const formatCleanByteAxis = (bytes: number, perSecond: boolean) => {
  const suffix = perSecond ? "/s" : "";
  if (!Number.isFinite(bytes) || bytes <= 0) return `0 B${suffix}`;
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  const cleanNum = Number(size.toFixed(1));
  return `${cleanNum} ${units[unitIndex]}${suffix}`;
};

const formatAxisTick = (value: number, kind: MetricKind): string => {
  if (!Number.isFinite(value)) return "";
  switch (kind) {
    case "percent":
      return `${Math.round(value)}%`;
    case "count":
      return `${Math.round(value)}`;
    case "milliseconds":
      return `${Math.round(value)} ms`;
    case "bytes":
      return formatCleanByteAxis(value, false);
    case "bytesPerSecond":
      return formatCleanByteAxis(value, true);
    case "temperature":
      return `${Number(value.toFixed(1))}°C`;
    case "load":
      return `${Number(value.toFixed(2))}`;
    default:
      return `${Number(value.toFixed(2))}`;
  }
};

const xTicksForRows = (rows: ChartView["rows"]) => {
  const times = rows.map((row) => String(row.time));
  if (times.length <= 1) return times;
  const count = Math.min(6, Math.max(4, times.length));
  const step = (times.length - 1) / (count - 1);
  return Array.from(
    new Set(Array.from({ length: count }, (_, index) => times[Math.round(index * step)])),
  );
};

const hoverTime = (value: unknown, displayRangeHours: number | undefined) =>
  labelFormatter(displayRangeHours)(value);

const ChartHoverReadout = ({
  active,
  payload,
  label,
  view,
  displayRangeHours,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string | number; value?: number | string | null }>;
  label?: string | number;
  view: ChartView;
  displayRangeHours?: number;
}) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      className="pointer-events-none flex max-w-full flex-wrap items-center justify-end gap-x-3 gap-y-1 text-right text-[11px] tabular-nums"
      style={{ color: "var(--km-chart-tick)" }}
    >
      <span style={{ color: "var(--km-instance-rule)" }}>
        {hoverTime(label, displayRangeHours)}
      </span>
      {payload.map((item) => {
        const series = view.series.find((entry) => entry.dataKey === item.dataKey);
        if (!series) return null;
        return (
          <span key={series.stableKey} className="whitespace-nowrap">
            {series.label}:{" "}
            <span style={{ color: "var(--km-instance-rule)" }}>
              {formatValue(item.value, series.kind)}
            </span>
          </span>
        );
      })}
    </div>
  );
};

const LegendItem = ({
  series,
  index,
  stat,
}: {
  series: RenderSeries;
  index: number;
  stat?: PingMetricStat;
}) => {
  const style = seriesStyle(index);
  const loss = typeof stat?.loss === "number" ? stat.loss : null;

  return (
    <span className="inline-flex items-center gap-2 text-[13px] leading-none text-black dark:text-[#F2F2F2]">
      <svg width="24" height="8" viewBox="0 0 24 8" aria-hidden="true" className="shrink-0">
        <line
          x1="0"
          y1="4"
          x2="24"
          y2="4"
          stroke="var(--km-chart-line)"
          strokeWidth={style.strokeWidth}
          strokeDasharray={style.strokeDasharray}
        />
      </svg>
      <span>{series.label}</span>
      {loss !== null && loss >= 2 && (
        <span style={{ color: "var(--km-instance-alert)" }}>
          {loss.toFixed(2)}%
        </span>
      )}
    </span>
  );
};

type LatencyBucket = {
  state: "ok" | "loss" | "empty";
  avg: number | null;
  loss: number | null;
  lossRatio: number;
  start: number;
  end: number;
};

type LatencyTarget = {
  series: RenderSeries;
  index: number;
  avg: number | null;
  jitter: number | null;
  loss: number | null;
  last: number | null;
  buckets: LatencyBucket[];
};

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const buildLatencyTargets = (
  view: ChartView,
  pingStatsMap?: ReadonlyMap<string, PingMetricStat>,
  uuid?: string,
): LatencyTarget[] => {
  const rows = view.rows;
  if (rows.length === 0) return [];
  const times = rows.map((row) => new Date(String(row.time)).getTime());
  const start = times[0];
  const end = times[times.length - 1] > start ? times[times.length - 1] : start + 60_000;
  const span = end - start;

  return view.series.map((series, index) => {
    const taskId = pingTaskId(series.tags);
    const stat =
      uuid && taskId ? pingStatsMap?.get(pingMetricStatKey(uuid, taskId)) : undefined;

    // 只统计本目标自己的采样点（不可把其它目标的时间戳算作本目标缺失）
    const samples: Array<{ time: number; value: number | null }> =
      series.samples && series.samples.length > 0
        ? series.samples
        : rows.reduce<Array<{ time: number; value: number | null }>>(
            (acc, row, rowIndex) => {
              if (series.dataKey in row) {
                const raw = row[series.dataKey];
                acc.push({
                  time: times[rowIndex],
                  value: isNumber(raw) ? raw : null,
                });
              }
              return acc;
            },
            [],
          );

    const totalSamples = samples.length;
    let totalLost = 0;
    const validSampleValues: number[] = [];

    for (const sample of samples) {
      if (isLoss(sample)) {
        totalLost += 1;
      } else if (isNumber(sample.value)) {
        validSampleValues.push(sample.value);
      }
    }

    const rowValidValues = rows
      .map((row) => row[series.dataKey])
      .filter((value): value is number => !isLoss(value) && isNumber(value));

    const fallbackAvg =
      validSampleValues.length > 0
        ? validSampleValues.reduce((sum, value) => sum + value, 0) /
          validSampleValues.length
        : null;
    const fallbackJitter =
      rowValidValues.length > 1
        ? rowValidValues
            .slice(1)
            .reduce(
              (sum, value, valueIndex) =>
                sum + Math.abs(value - rowValidValues[valueIndex]),
              0,
            ) /
          (rowValidValues.length - 1)
        : null;
    // 条和表格的"丢包率"列统一使用共用函数 isLoss(sample) 计算
    const loss =
      totalSamples > 0 ? (totalLost / totalSamples) * 100 : null;
    const fallbackLast =
      rowValidValues.length > 0
        ? rowValidValues[rowValidValues.length - 1]
        : null;

    const statAvg = stat?.avg;
    const statLatest = stat?.latest;
    const avg = !isLoss(statAvg) && isNumber(statAvg) ? statAvg : fallbackAvg;
    const last =
      !isLoss(statLatest) && isNumber(statLatest) ? statLatest : fallbackLast;
    const jitter = fallbackJitter;

    const buckets: LatencyBucket[] = Array.from({ length: 60 }, (_, bucketIndex) => {
      const bucketStart = start + (span * bucketIndex) / 60;
      const bucketEnd = start + (span * (bucketIndex + 1)) / 60;
      let bucketTotal = 0;
      let bucketLost = 0;
      const bucketValid: number[] = [];

      for (const sample of samples) {
        const inBucket =
          bucketIndex === 59
            ? sample.time >= bucketStart && sample.time <= end
            : sample.time >= bucketStart && sample.time < bucketEnd;
        if (!inBucket) continue;
        bucketTotal += 1;
        if (isLoss(sample)) {
          bucketLost += 1;
        } else if (isNumber(sample.value)) {
          bucketValid.push(sample.value);
        }
      }

      const lossRatio = bucketTotal > 0 ? bucketLost / bucketTotal : 0;
      const bucketLoss = bucketTotal > 0 ? lossRatio * 100 : null;
      const bucketAvg =
        bucketValid.length > 0
          ? bucketValid.reduce((sum, value) => sum + value, 0) /
            bucketValid.length
          : null;

      let state: LatencyBucket["state"] = "empty";
      if (bucketTotal > 0) {
        state = bucketLost > 0 ? "loss" : "ok";
      }

      return {
        state,
        avg: bucketAvg,
        loss: bucketLoss,
        lossRatio,
        start: bucketStart,
        end: bucketEnd,
      };
    });

    return { series, index, avg, jitter, loss, last, buckets };
  });
};

const formatBucketTime = (value: number, displayRangeHours?: number) =>
  labelFormatter(displayRangeHours)(value);

const LATENCY_GRID_CLASS =
  "grid grid-cols-[minmax(0,1fr)_72px_72px_72px] sm:grid-cols-[minmax(0,1fr)_72px_72px_72px_72px] lg:grid-cols-[minmax(120px,1.4fr)_minmax(0,2fr)_72px_72px_72px_72px]";

const LatencyTargetTable = ({
  view,
  displayRangeHours,
  pingStatsMap,
  uuid,
  activeSeriesKey,
}: {
  view: ChartView;
  displayRangeHours?: number;
  pingStatsMap?: ReadonlyMap<string, PingMetricStat>;
  uuid?: string;
  activeSeriesKey?: string | null;
}) => {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState<{
    targetIndex: number;
    bucketIndex: number;
  } | null>(null);
  const targets = useMemo(
    () => buildLatencyTargets(view, pingStatsMap, uuid),
    [view, pingStatsMap, uuid],
  );
  if (targets.length === 0) return null;

  return (
    <div className="w-full">
      <div className={`${LATENCY_GRID_CLASS} h-8 items-center border-b border-[color:var(--km-instance-hairline-soft)]`}>
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[color:var(--km-instance-muted)]">
          {t("ping.target")}
        </span>
        <span className="hidden text-[11px] font-semibold uppercase tracking-[0.06em] text-[color:var(--km-instance-muted)] lg:block">
          {t("chart.qualityLoss")}
        </span>
        <span className="text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-[color:var(--km-instance-muted)]">
          {t("chart.avg")}
        </span>
        <span className="hidden text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-[color:var(--km-instance-muted)] sm:block">
          {t("chart.jitter")}
        </span>
        <span className="text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-[color:var(--km-instance-muted)]">
          {t("chart.lossRate")}
        </span>
        <span className="text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-[color:var(--km-instance-muted)]">
          {t("chart.latest")}
        </span>
      </div>

      {targets.map((target) => {
        const warning = target.loss !== null && target.loss >= 2;
        const isRowActive = activeSeriesKey === target.series.stableKey;
        const hoveredBucket =
          hovered?.targetIndex === target.index
            ? target.buckets[hovered.bucketIndex]
            : null;
        const style = seriesStyle(target.index);

        return (
          <div
            key={target.series.stableKey}
            className={`${LATENCY_GRID_CLASS} h-10 items-center border-b border-[color:var(--km-instance-hairline-soft)] transition-colors sm:h-9 ${
              isRowActive
                ? "bg-[var(--km-ping-row-hover)]"
                : "hover:bg-[var(--km-ping-row-hover)]"
            }`}
          >
            <div className="flex min-w-0 items-center gap-2">
              <svg width="24" height="8" viewBox="0 0 24 8" aria-hidden="true" className="shrink-0">
                <line
                  x1="0"
                  y1="4"
                  x2="24"
                  y2="4"
                  stroke="var(--km-chart-line)"
                  strokeWidth={style.strokeWidth}
                  strokeDasharray={style.strokeDasharray}
                />
              </svg>
              <span className="truncate text-[13px] font-semibold">{target.series.label}</span>
            </div>

            <div className="relative hidden min-w-0 items-center lg:flex">
              <div
                className="grid h-[12px] w-full items-end"
                style={{
                  gridTemplateColumns: "repeat(60, minmax(0, 1fr))",
                  gap: "1px",
                }}
              >
                {target.buckets.map((bucket, bucketIndex) => {
                  const lossColor = warning
                    ? "var(--km-instance-alert)"
                    : "var(--km-quality-loss)";
                  const barHeight = Math.min(
                    10,
                    Math.max(4, Math.round(2 + bucket.lossRatio * 8)),
                  );

                  return (
                    <span
                      key={bucketIndex}
                      className="flex h-full w-full items-end"
                      onMouseEnter={() =>
                        setHovered({ targetIndex: target.index, bucketIndex })
                      }
                      onMouseLeave={() => setHovered(null)}
                    >
                      {bucket.state === "ok" ? (
                        <span
                          className="block w-full"
                          style={{
                            height: "2px",
                            backgroundColor: "var(--km-quality-baseline)",
                          }}
                        />
                      ) : bucket.state === "loss" ? (
                        <span
                          className="block w-full"
                          style={{
                            height: `${barHeight}px`,
                            backgroundColor: lossColor,
                          }}
                        />
                      ) : null}
                    </span>
                  );
                })}
              </div>
              {hoveredBucket && (
                <div
                  className="pointer-events-none absolute left-0 top-full z-10 mt-0.5 whitespace-nowrap text-[10px] leading-none tabular-nums"
                  style={{ color: "var(--km-instance-muted)" }}
                >
                  {formatBucketTime(hoveredBucket.start, displayRangeHours)}–
                  {formatBucketTime(hoveredBucket.end, displayRangeHours)} ·{" "}
                  {t("chart.lossRate")}{" "}
                  {hoveredBucket.loss === null
                    ? "—"
                    : `${Number(hoveredBucket.loss.toFixed(1))}%`}{" "}
                  · {t("chart.avgShort")}{" "}
                  {hoveredBucket.avg === null
                    ? "—"
                    : `${Math.round(hoveredBucket.avg)} ms`}
                </div>
              )}
            </div>

            <span className="text-right text-[13px] font-medium tabular-nums whitespace-nowrap">
              {target.avg === null ? "—" : `${Math.round(target.avg)} ms`}
            </span>
            <span className="hidden text-right text-[13px] font-medium tabular-nums whitespace-nowrap sm:block">
              {target.jitter === null ? "—" : `${target.jitter.toFixed(1)} ms`}
            </span>
            <span
              className="text-right text-[13px] font-medium tabular-nums whitespace-nowrap"
              style={{ color: warning ? "var(--km-instance-alert)" : undefined }}
            >
              {target.loss === null ? "—" : `${target.loss.toFixed(1)}%`}
            </span>
            <span className="text-right text-[13px] font-medium tabular-nums whitespace-nowrap">
              {target.last === null ? "—" : `${Math.round(target.last)} ms`}
            </span>
          </div>
        );
      })}
    </div>
  );
};

/** 瑞士风格图表块：固定高度、无彩色、线型区分系列、右上角纯文字悬停读数。 */
const ChartBlock = ({
  title,
  view,
  height = 180,
  isCpu,
  compactY,
  isPing,
  displayRangeHours,
  pingStatsMap,
  uuid,
  busy,
  last,
}: ChartBlockProps) => {
  const [activePingSeriesKey, setActivePingSeriesKey] = useState<string | null>(null);
  const xTicks = useMemo(() => xTicksForRows(view.rows), [view.rows]);
  const empty = view.rows.length === 0 || view.series.length === 0;
  const axisConfig = useMemo(
    () =>
      view.axes.map((axis) => ({
        axis,
        ...axisDomain(view, axis, isCpu, compactY),
      })),
    [view, isCpu, compactY],
  );
  const yMax = useMemo(() => {
    const first = axisConfig[0]?.domain?.[1];
    return typeof first === "number" && first > 0 ? first : 100;
  }, [axisConfig]);

  const handleChartMouseMove = (state: {
    activeTooltipIndex?: number;
    chartY?: number;
  }) => {
    if (!isPing) return;
    const rowIdx = state?.activeTooltipIndex;
    if (typeof rowIdx !== "number" || rowIdx < 0 || rowIdx >= view.rows.length) {
      return;
    }
    const row = view.rows[rowIdx];
    const plotTop = 6;
    const plotBottom = Math.max(plotTop + 1, height - 28);
    const plotHeight = plotBottom - plotTop;
    const mouseY = typeof state.chartY === "number" ? state.chartY : plotTop + plotHeight / 2;

    let closestKey: string | null = null;
    let closestDist = Number.POSITIVE_INFINITY;

    for (const s of view.series) {
      const val = row[s.dataKey];
      if (typeof val !== "number" || !Number.isFinite(val) || isLoss(val)) continue;
      const ratio = Math.min(1, Math.max(0, val / yMax));
      const yPx = plotBottom - ratio * plotHeight;
      const dist = Math.abs(yPx - mouseY);
      if (dist < closestDist) {
        closestDist = dist;
        closestKey = s.stableKey;
      }
    }

    setActivePingSeriesKey(closestKey);
  };

  const handleChartMouseLeave = () => {
    if (isPing) {
      setActivePingSeriesKey(null);
    }
  };

  return (
    <section
      aria-busy={busy}
      className={`km-chart-block py-4 ${
        last ? "" : "border-b border-[color:var(--km-instance-hairline)]"
      }`}
    >
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-[14px] font-semibold leading-none">{title}</h3>
        <span
          className="shrink-0 text-[13px] font-medium tabular-nums"
          style={{ color: "var(--km-instance-muted)" }}
        >
          {latestValueText(view)}
        </span>
      </div>

      {!isPing && view.series.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {view.series.map((item, index) => {
            const taskId = pingTaskId(item.tags);
            const stat =
              uuid && taskId && isPingMetric(item.metricKey)
                ? pingStatsMap?.get(pingMetricStatKey(uuid, taskId))
                : undefined;
            return (
              <LegendItem
                key={item.stableKey}
                series={item}
                index={index}
                stat={stat}
              />
            );
          })}
        </div>
      )}

      <div className="relative mt-3 w-full" style={{ height }}>
        {empty ? (
          <div
            className="flex h-full items-center justify-center text-[13px]"
            style={{ color: "var(--km-instance-muted)" }}
          >
            —
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={view.rows}
              margin={{ top: 6, right: 8, bottom: 0, left: 8 }}
              onMouseMove={handleChartMouseMove}
              onMouseLeave={handleChartMouseLeave}
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--km-chart-grid)"
                strokeWidth={1}
              />
              <XAxis
                dataKey="time"
                ticks={xTicks}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                height={28}
                minTickGap={12}
                interval={0}
                padding={{ left: 0, right: 0 }}
                tick={(props: {
                  x?: number;
                  y?: number;
                  payload?: { value?: string | number };
                  index?: number;
                  visibleTicksCount?: number;
                }) => {
                  const {
                    x = 0,
                    y = 0,
                    payload,
                    index = 0,
                    visibleTicksCount = 0,
                  } = props;
                  const rawValue = payload?.value;
                  const isLast =
                    (visibleTicksCount > 1 && index === visibleTicksCount - 1) ||
                    (xTicks.length > 1 &&
                      String(rawValue) === xTicks[xTicks.length - 1]);
                  return (
                    <text
                      x={x}
                      y={y}
                      dy="0.71em"
                      textAnchor={isLast ? "end" : "middle"}
                      fill="var(--km-chart-tick)"
                      fontSize={11}
                    >
                      {hoverTime(rawValue, displayRangeHours)}
                    </text>
                  );
                }}
              />
              {axisConfig.map(({ axis, domain, ticks }) => (
                <YAxis
                  key={axis.id}
                  yAxisId={axis.id}
                  orientation={axis.orientation}
                  domain={domain}
                  ticks={ticks}
                  width={52}
                  tickFormatter={(value) =>
                    formatAxisTick(
                      Number(value),
                      axis.kind as MetricKind,
                    ).replace(/ /g, "\u00a0")
                  }
                  tick={{ fontSize: 11, fill: "var(--km-chart-tick)" }}
                  tickLine={false}
                  axisLine={false}
                />
              ))}
              <Tooltip
                cursor={{
                  stroke: "var(--km-chart-hover)",
                  strokeWidth: 1,
                  strokeDasharray: "0",
                }}
                isAnimationActive={false}
                wrapperStyle={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  left: "auto",
                  transform: "none",
                  outline: "none",
                  pointerEvents: "none",
                  zIndex: 3,
                }}
                content={
                  <ChartHoverReadout
                    view={view}
                    displayRangeHours={displayRangeHours}
                  />
                }
              />
              {view.series.map((item, index) => {
                const style = seriesStyle(index);
                return (
                  <Line
                    key={item.dataKey}
                    dataKey={item.dataKey}
                    name={item.label}
                    yAxisId={item.yAxisId ?? "left"}
                    type="linear"
                    stroke="var(--km-chart-line)"
                    strokeWidth={style.strokeWidth}
                    strokeDasharray={style.strokeDasharray}
                    dot={false}
                    activeDot={false}
                    fill="none"
                    connectNulls={false}
                    isAnimationActive={false}
                    onMouseEnter={() => {
                      if (isPing) setActivePingSeriesKey(item.stableKey);
                    }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {isPing && view.series.length > 0 && (
        <div className="mt-4 border-t border-[color:var(--km-instance-hairline-soft)] pt-4">
          <LatencyTargetTable
            view={view}
            displayRangeHours={displayRangeHours}
            pingStatsMap={pingStatsMap}
            uuid={uuid}
            activeSeriesKey={activePingSeriesKey}
          />
        </div>
      )}
    </section>
  );
};

export default ChartBlock;
