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
  /** 进程数等小图：Y 轴取数据的最小/最大紧凑范围，不从 0 开始 */
  compactY?: boolean;
  /** 延迟图下方显示监控目标明细表 */
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
      // 延迟指标的负值是后端写入的丢包标记，不是真实延迟，最新值不能取它。
      if (item.kind === "milliseconds" && value < 0) continue;
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
        values.push(value);
      }
    }
  }
  return values;
};

const axisDomain = (view: ChartView, axis: ChartAxis, compactY?: boolean) => {
  if (axis.kind === "percent") {
    return { domain: [0, 100] as [number, number], ticks: [0, 50, 100] };
  }
  if (axis.kind === "milliseconds") {
    const values = valuesForAxis(view, axis);
    const maximum = values.length > 0 ? Math.max(...values) : 0;
    const niceMax = Math.max(50, Math.ceil(maximum / 50) * 50);
    return {
      domain: [0, niceMax] as [number, number],
      ticks: [0, Math.round(niceMax / 3), Math.round((niceMax * 2) / 3), niceMax],
    };
  }
  if (compactY && axis.kind === "count") {
    const values = valuesForAxis(view, axis);
    if (values.length === 0) {
      return { domain: [0, 1] as [number, number], ticks: [0, 1] };
    }
    const low = Math.floor(Math.min(...values));
    const high = Math.ceil(Math.max(...values));
    const min = low === high ? low - 1 : low;
    const max = low === high ? high + 1 : high;
    return { domain: [min, max] as [number, number], ticks: [min, max] };
  }
  return { domain: [0, "auto"] as [number, string], ticks: undefined };
};

const xTicksForRows = (rows: ChartView["rows"]) => {
  const times = rows.map((row) => String(row.time));
  if (times.length <= 1) return times;
  const count = Math.min(7, Math.max(5, times.length));
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
  state: "solid" | "hollow" | "empty";
  avg: number | null;
  loss: number | null;
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

    /*
      只统计「本目标自己的采样」：图上所有 ping 目标共用一行集合，其它目标的时间戳在这一列是 null，
      不能算作本目标的丢包（之前按总行数算会得到 65.5% 这种假丢包）。
      延迟为负值是后端写入的丢包标记（internal/metricstore/ping_records.go），不计入有效延迟。
    */
    const ownValues = rows
      .map((row) => row[series.dataKey])
      .filter(isNumber);
    const validValues = ownValues.filter((value) => value >= 0);
    const totalSamples = ownValues.length;

    const fallbackAvg =
      validValues.length > 0
        ? validValues.reduce((sum, value) => sum + value, 0) / validValues.length
        : null;
    const fallbackJitter =
      validValues.length > 1
        ? validValues
            .slice(1)
            .reduce(
              (sum, value, valueIndex) =>
                sum + Math.abs(value - validValues[valueIndex]),
              0,
            ) /
          (validValues.length - 1)
        : null;
    const fallbackLoss =
      totalSamples > 0
        ? ((totalSamples - validValues.length) / totalSamples) * 100
        : null;
    const fallbackLast =
      validValues.length > 0 ? validValues[validValues.length - 1] : null;

    // 均值 / 丢包 / 最新值优先用后端 getPingMetricStats 的权威统计，避免从降采样行反推。
    const statAvg = stat?.avg;
    const statLoss = stat?.loss;
    const statLatest = stat?.latest;
    const avg = isNumber(statAvg) ? statAvg : fallbackAvg;
    const loss = typeof statLoss === "number" ? statLoss : fallbackLoss;
    const last = isNumber(statLatest) ? statLatest : fallbackLast;
    // 后端未提供 jitter，用本目标自身的有效采样（排除负值丢包标记）计算平均绝对差。
    const jitter = fallbackJitter;

    const buckets: LatencyBucket[] = Array.from({ length: 60 }, (_, bucketIndex) => {
      const bucketStart = start + (span * bucketIndex) / 60;
      const bucketEnd = start + (span * (bucketIndex + 1)) / 60;
      const bucketSamples: number[] = [];
      const bucketValid: number[] = [];
      let bucketLost = 0;
      rows.forEach((row, rowIndex) => {
        const time = times[rowIndex];
        const inBucket =
          bucketIndex === 59
            ? time >= bucketStart && time <= end
            : time >= bucketStart && time < bucketEnd;
        if (!inBucket) return;
        const value = row[series.dataKey];
        if (!isNumber(value)) return;
        bucketSamples.push(value);
        if (value >= 0) bucketValid.push(value);
        else bucketLost += 1;
      });
      const bucketLoss =
        bucketSamples.length > 0
          ? (bucketLost / bucketSamples.length) * 100
          : null;
      const bucketAvg =
        bucketValid.length > 0
          ? bucketValid.reduce((sum, value) => sum + value, 0) /
            bucketValid.length
          : null;

      let state: LatencyBucket["state"] = "empty";
      if (bucketSamples.length > 0 && bucketValid.length > 0) {
        if (bucketLoss === 0) state = "solid";
        else if (bucketLoss !== null && bucketLoss < 50) state = "hollow";
      }

      return {
        state,
        avg: bucketAvg,
        loss: bucketLoss,
        start: bucketStart,
        end: bucketEnd,
      };
    });

    return { series, index, avg, jitter, loss, last, buckets };
  });
};

const formatBucketTime = (value: number, displayRangeHours?: number) => {
  const date = new Date(value);
  if (displayRangeHours && displayRangeHours >= 24) {
    return date.toLocaleString([], {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const LATENCY_GRID_CLASS =
  "grid grid-cols-[minmax(0,1fr)_72px_72px_72px] sm:grid-cols-[minmax(0,1fr)_72px_72px_72px_72px] lg:grid-cols-[minmax(120px,1.4fr)_minmax(0,2fr)_72px_72px_72px_72px]";

const LatencyTargetTable = ({
  view,
  displayRangeHours,
  pingStatsMap,
  uuid,
}: {
  view: ChartView;
  displayRangeHours?: number;
  pingStatsMap?: ReadonlyMap<string, PingMetricStat>;
  uuid?: string;
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
        const hoveredBucket =
          hovered?.targetIndex === target.index
            ? target.buckets[hovered.bucketIndex]
            : null;
        const style = seriesStyle(target.index);

        return (
          <div
            key={target.series.stableKey}
            className={`${LATENCY_GRID_CLASS} h-10 items-center border-b border-[color:var(--km-instance-hairline-soft)] sm:h-9`}
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

            <div className="relative hidden min-w-0 lg:block">
              <div
                className="grid w-full"
                style={{
                  gridTemplateColumns: "repeat(60, minmax(0, 1fr))",
                  gap: "1px",
                }}
              >
                {target.buckets.map((bucket, bucketIndex) => {
                  const bucketColor = warning
                    ? "var(--km-instance-alert)"
                    : "var(--km-chart-line)";
                  return (
                    <span
                      key={bucketIndex}
                      className="block h-[10px] w-full"
                      style={
                        bucket.state === "solid"
                          ? {
                              height: "10px",
                              backgroundColor: "var(--km-chart-line)",
                            }
                          : bucket.state === "hollow"
                            ? {
                                height: "10px",
                                border: `1px solid ${bucketColor}`,
                                boxSizing: "border-box",
                                backgroundColor: "transparent",
                              }
                            : {
                                height: "10px",
                                borderBottom: "2px solid #D0D0D0",
                                boxSizing: "border-box",
                              }
                      }
                      onMouseEnter={() =>
                        setHovered({ targetIndex: target.index, bucketIndex })
                      }
                      onMouseLeave={() => setHovered(null)}
                    />
                  );
                })}
              </div>
              {hoveredBucket && (
                <div
                  className="pointer-events-none absolute left-0 top-full z-10 mt-1 whitespace-nowrap text-[10px] tabular-nums"
                  style={{ color: "var(--km-instance-muted)" }}
                >
                  {formatBucketTime(hoveredBucket.start, displayRangeHours)}–
                  {formatBucketTime(hoveredBucket.end, displayRangeHours)} ·{" "}
                  {hoveredBucket.avg === null ? "—" : `${Math.round(hoveredBucket.avg)} ms`} ·{" "}
                  {hoveredBucket.loss === null ? "—" : `${hoveredBucket.loss.toFixed(1)}%`}
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
  compactY,
  isPing,
  displayRangeHours,
  pingStatsMap,
  uuid,
  busy,
  last,
}: ChartBlockProps) => {
  const xTicks = useMemo(() => xTicksForRows(view.rows), [view.rows]);
  const empty = view.rows.length === 0 || view.series.length === 0;
  const axisConfig = useMemo(
    () => view.axes.map((axis) => ({ axis, ...axisDomain(view, axis, compactY) })),
    [view, compactY],
  );
  const yTickCount = height <= 80 ? 2 : height <= 140 ? 3 : 4;

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

      {view.series.length > 0 && (
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
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--km-chart-grid)"
                strokeWidth={1}
              />
              <XAxis
                dataKey="time"
                ticks={xTicks}
                tickFormatter={(value) => hoverTime(value, displayRangeHours)}
                tick={{ fontSize: 11, fill: "var(--km-chart-tick)" }}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                height={28}
                minTickGap={12}
                interval={0}
                padding={{ left: 0, right: 0 }}
              />
              {axisConfig.map(({ axis, domain, ticks }) => (
                <YAxis
                  key={axis.id}
                  yAxisId={axis.id}
                  orientation={axis.orientation}
                  domain={domain}
                  ticks={ticks}
                  tickCount={ticks ? undefined : yTickCount}
                  width={46}
                  tickFormatter={(value) =>
                    formatValue(Number(value), axis.kind as MetricKind).replace(
                      / /g,
                      "\u00a0",
                    )
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
          />
        </div>
      )}
    </section>
  );
};

export default ChartBlock;
