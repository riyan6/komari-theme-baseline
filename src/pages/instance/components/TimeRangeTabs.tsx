import { useTranslation } from "react-i18next";
import { formatTzOffset } from "@/utils/statusFormat";
import type { TimeView } from "../loadChart/types";

type TimeRangeTabsProps = {
  views: TimeView[];
  value: string;
  onChange: (key: string) => void;
};

/** 时间范围：纯文字切换，选中项 600 字重 + 2px 黑色下划线，无背景/描边/圆角。 */
const TimeRangeTabs = ({ views, value, onChange }: TimeRangeTabsProps) => {
  const { t } = useTranslation();
  const tzLabel = formatTzOffset();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
      <div className="flex items-baseline gap-2">
        <span className="label-swiss">
          {t("common.timeRange")}
        </span>
        <span className="text-[11px] font-medium tabular-nums text-[color:var(--km-instance-muted)]">
          {tzLabel}
        </span>
      </div>
      <div className="-mx-1 flex flex-wrap items-center gap-x-5 gap-y-2 px-1">
        {views.map((view) => {
          const selected = view.key === value;
          return (
            <button
              key={view.key}
              type="button"
              onClick={() => onChange(view.key)}
              className={`relative cursor-pointer pb-1 font-sans text-[length:var(--font-size-control)] leading-none tabular-nums transition-colors ${
                selected
                  ? "font-semibold text-black dark:text-[#F2F2F2]"
                  : "font-medium text-[color:var(--km-instance-muted)] hover:text-black dark:hover:text-[#F2F2F2]"
              }`}
            >
              {view.label}
              {selected && (
                <span className="absolute inset-x-0 -bottom-[1px] h-[2px] bg-[var(--km-instance-rule)]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TimeRangeTabs;
