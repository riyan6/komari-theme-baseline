import { useTranslation } from "react-i18next";
import { toDateTimeLocalValue } from "./timeRange";
import type { CustomTimeRange } from "./types";

type CustomRangePanelProps = {
  open: boolean;
  draft: CustomTimeRange;
  error: string | null;
  onDraftChange: (patch: Partial<CustomTimeRange>) => void;
  onSelectRecentRange: (days: number) => void;
  onApply: () => void;
};

/** Swiss 主题的自定义时间范围：两个方形日期输入 + 文字查询按钮。 */
const CustomRangePanel = ({
  open,
  draft,
  error,
  onDraftChange,
  onApply,
}: CustomRangePanelProps) => {
  const { t } = useTranslation();
  const customInputMax = toDateTimeLocalValue(new Date());

  if (!open) return null;

  return (
    <div className="mt-4 border-y border-[color:var(--km-instance-hairline-soft)] py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[color:var(--km-instance-muted)]">
            {t("chart.startTime")}
          </span>
          <input
            type="datetime-local"
            value={draft.start}
            max={customInputMax}
            onChange={(event) => onDraftChange({ start: event.target.value })}
            aria-label={t("chart.startTime")}
            className="h-10 w-full border border-[color:var(--km-instance-hairline)] bg-transparent px-3 text-[13px] text-black outline-none focus:outline-none dark:text-[#F2F2F2]"
          />
        </label>
        <span className="hidden pb-3 text-[13px] text-[color:var(--km-instance-muted)] sm:block">
          —
        </span>
        <label className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[color:var(--km-instance-muted)]">
            {t("chart.endTime")}
          </span>
          <input
            type="datetime-local"
            value={draft.end}
            max={customInputMax}
            onChange={(event) => onDraftChange({ end: event.target.value })}
            aria-label={t("chart.endTime")}
            className="h-10 w-full border border-[color:var(--km-instance-hairline)] bg-transparent px-3 text-[13px] text-black outline-none focus:outline-none dark:text-[#F2F2F2]"
          />
        </label>
        <button
          type="button"
          onClick={onApply}
          className="h-10 shrink-0 border border-[color:var(--km-instance-hairline)] px-4 text-[11px] font-semibold uppercase tracking-[0.06em] text-black transition-colors hover:bg-black hover:text-white dark:text-[#F2F2F2] dark:hover:bg-[#F2F2F2] dark:hover:text-black"
        >
          {t("chart.query")}
        </button>
      </div>
      {error && (
        <div className="mt-2 text-[13px]" style={{ color: "var(--km-instance-alert)" }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default CustomRangePanel;
