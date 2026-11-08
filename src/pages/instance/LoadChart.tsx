import { memo, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useNodeList } from "@/contexts/NodeListContext";
import type { RecordFormat } from "@/utils/RecordHelper";
import { PING_LATENCY_METRIC } from "@/utils/metricSeries";
import ChartBlock from "./components/ChartBlock";
import TimeRangeTabs from "./components/TimeRangeTabs";
import { hasRealtimeSource } from "./loadChart/catalog";
import { buildChartView } from "./loadChart/series";
import type { DashboardChart } from "./loadChart/types";
import { useMetricCatalog } from "./loadChart/useMetricCatalog";
import { useMetricQueries } from "./loadChart/useMetricQueries";
import { useTimeRange } from "./loadChart/useTimeRange";

type LoadChartProps = {
  data: RecordFormat[];
  /** 实时历史（/api/recent）还没拉到当前服务器的数据 */
  realtimeLoading?: boolean;
  onRealtimeActiveChange?: (active: boolean) => void;
};

const SWISS_AGGREGATION = "avg" as const;

const LoadChart = ({
  data = [],
  realtimeLoading = false,
  onRealtimeActiveChange,
}: LoadChartProps) => {
  const { t } = useTranslation();
  const { uuid } = useParams<{ uuid: string }>();
  const { nodeList } = useNodeList();
  const node = nodeList?.find((item) => item.uuid === uuid);
  const { maxMetricRetentionDays, definitionMap, pingTaskMap } =
    useMetricCatalog();
  const timeRange = useTimeRange(maxMetricRetentionDays, onRealtimeActiveChange);
  const { isRealtime } = timeRange;

  const allCharts = useMemo<DashboardChart[]>(
    () => [
      {
        id: "cpu",
        title: t("chart.cpu_usage"),
        metrics: ["cpu.usage"],
        size: "small",
      },
      {
        id: "memory",
        title: t("nodeCard.ram"),
        metrics: ["memory.used", "swap.used"],
        size: "small",
      },
      {
        id: "disk",
        title: t("nodeCard.disk"),
        metrics: ["disk.used"],
        size: "small",
      },
      {
        id: "network",
        title: t("nodeCard.networkSpeed"),
        metrics: ["net.in.rate", "net.out.rate"],
        size: "small",
      },
      {
        id: "process",
        title: `${t("chart.process")} · TCP`,
        metrics: ["process.count", "connections.tcp"],
        size: "small",
      },
      {
        id: "ping",
        title: t("nodeCard.ping"),
        metrics: [PING_LATENCY_METRIC],
        size: "small",
      },
    ],
    [t],
  );
  const visibleCharts = allCharts.filter(
    (chart) => chart.id !== "memory" && chart.id !== "disk",
  );

  const { metricSeries, metricKeys, metricsLoading, error, pingStatsMap } =
    useMetricQueries({
      uuid,
      charts: allCharts,
      isRealtime,
      metricRangeParams: timeRange.metricRangeParams,
      aggregation: SWISS_AGGREGATION,
    });

  return (
    <div className="km-load-chart flex w-full min-w-0 flex-col">
      <TimeRangeTabs
        views={timeRange.timeViews}
        value={timeRange.selectedView.key}
        onChange={timeRange.setViewKey}
      />

      <div className="mt-4 border-t border-[color:var(--km-instance-hairline)]" />

      {error && (
        <div
          className="pt-3 text-[13px]"
          style={{ color: "var(--km-instance-alert)" }}
        >
          {error}
        </div>
      )}

      <div>
        {visibleCharts.map((chart, index) => {
          const chartUsesRealtime =
            isRealtime && chart.metrics.some(hasRealtimeSource);
          const chartBusy =
            (metricsLoading &&
              chart.metrics.some((metricKey) => metricKeys.includes(metricKey))) ||
            (chartUsesRealtime && realtimeLoading);
          const height =
            chart.id === "ping"
              ? 200
              : chart.id === "cpu"
                ? 140
                : chart.id === "network"
                  ? 120
                  : chart.id === "process"
                    ? 80
                    : 180;

          return (
            <ChartBlock
              key={chart.id}
              title={chart.title}
              view={buildChartView({
                chart,
                metricSeries,
                records: data,
                node,
                definitionMap,
                pingTaskMap,
                isRealtime,
                ewmaEnabled: false,
                t,
              })}
              height={height}
              isCpu={chart.id === "cpu"}
              compactY={chart.id === "process"}
              isPing={chart.id === "ping"}
              displayRangeHours={timeRange.displayRangeHours}
              pingStatsMap={pingStatsMap}
              uuid={uuid}
              busy={chartBusy}
              last={index === visibleCharts.length - 1}
            />
          );
        })}
      </div>
    </div>
  );
};

export default memo(LoadChart);
