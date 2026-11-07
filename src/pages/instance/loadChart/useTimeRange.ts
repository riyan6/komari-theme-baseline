import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { CUSTOM_RANGE_DEFAULT_DAYS } from "./constants";
import { buildRecentRange, buildTimeViews, toQueryRange } from "./timeRange";
import type { CustomTimeRange, MetricRangeParams } from "./types";

const TIME_RANGE_STORAGE_KEY = "komari-instance-time-range";

/** 时间范围：预设视图（实时 / 10 分钟 / 1 小时 / 1 天 / 2 天 / 3 天）与本地持久化 */
export function useTimeRange(
  maxMetricRetentionDays: number,
  onRealtimeActiveChange?: (active: boolean) => void,
) {
  const { t } = useTranslation();
  const timeViews = useMemo(
    () => buildTimeViews(t, maxMetricRetentionDays),
    [t, maxMetricRetentionDays],
  );
  const [viewKey, setViewKey] = useLocalStorage<string>(
    TIME_RANGE_STORAGE_KEY,
    "real-time",
  );
  const selectedView = timeViews.find((view) => view.key === viewKey) ?? timeViews[0];
  const isRealtime = selectedView.key === "real-time";
  const isCustomRange = selectedView.key === "custom";
  const [customDraftRange, setCustomDraftRange] = useState<CustomTimeRange>(() =>
    buildRecentRange(CUSTOM_RANGE_DEFAULT_DAYS),
  );
  const [customQueryRange, setCustomQueryRange] = useState<CustomTimeRange>(() =>
    buildRecentRange(CUSTOM_RANGE_DEFAULT_DAYS),
  );
  const [customQueryRevision, setCustomQueryRevision] = useState(0);
  const [customRangeError, setCustomRangeError] = useState<string | null>(null);

  useEffect(() => {
    onRealtimeActiveChange?.(isRealtime);
  }, [isRealtime, onRealtimeActiveChange]);

  useEffect(() => {
    if (!timeViews.some((view) => view.key === viewKey)) {
      setViewKey(timeViews[0]?.key ?? "real-time");
    }
  }, [setViewKey, timeViews, viewKey]);

  const customQuery = useMemo(
    () => toQueryRange(customQueryRange),
    [customQueryRange],
  );
  const queryHours = isRealtime ? 1 : selectedView.hours;
  const queryRange = isCustomRange ? customQuery : null;
  const queryStart = queryRange?.start;
  const queryEnd = queryRange?.end;
  const queryRangeSignature =
    queryStart && queryEnd
      ? `${queryStart}|${queryEnd}|${customQueryRevision}`
      : "";
  const displayRangeHours =
    queryStart && queryEnd
      ? (new Date(queryEnd).getTime() - new Date(queryStart).getTime()) / 3_600_000
      : selectedView.hours;
  const metricRangeParams = useMemo<MetricRangeParams>(
    () =>
      queryRangeSignature
        ? { start: queryStart!, end: queryEnd! }
        : { hours: queryHours ?? 1 },
    [queryEnd, queryHours, queryRangeSignature, queryStart],
  );

  const selectRecentRange = (days: number) => {
    setCustomDraftRange(buildRecentRange(days));
    setCustomRangeError(null);
  };

  const applyCustomRange = () => {
    if (!toQueryRange(customDraftRange)) {
      setCustomRangeError(t("chart.invalidTimeRange"));
      return;
    }
    setCustomQueryRange(customDraftRange);
    setCustomQueryRevision((current) => current + 1);
    setCustomRangeError(null);
  };

  const updateCustomDraft = (patch: Partial<CustomTimeRange>) => {
    setCustomDraftRange((current) => ({ ...current, ...patch }));
    setCustomRangeError(null);
  };

  return {
    timeViews,
    selectedView,
    setViewKey,
    isRealtime,
    isCustomRange,
    customDraftRange,
    customRangeError,
    updateCustomDraft,
    selectRecentRange,
    applyCustomRange,
    displayRangeHours,
    metricRangeParams,
  };
}
