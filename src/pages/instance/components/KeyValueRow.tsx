import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type KeyValueRowProps = {
  label: ReactNode;
  value: ReactNode;
  /** 0–100 的占比；传入时在值下方显示 4px 进度条 */
  progress?: number | null;
  /** 系统、内核等长字符串：允许换行并使用更小字号 */
  breakAll?: boolean;
  /** 最后一行不画浅分隔线，由外层画黑色收口线 */
  last?: boolean;
  className?: string;
};

/** 详情页键值表的一行：固定 52px 行高，右侧值右对齐、tabular-nums。 */
const KeyValueRow = ({
  label,
  value,
  progress,
  breakAll,
  last,
  className,
}: KeyValueRowProps) => {
  const percent =
    typeof progress === "number" && Number.isFinite(progress)
      ? Math.min(100, Math.max(0, progress))
      : null;
  const warning = percent !== null && percent >= 80;

  return (
    <div
      className={cn(
        "km-kv-row flex min-h-[52px] items-center justify-between gap-6",
        !last && "border-b border-[color:var(--km-instance-hairline-soft)]",
        className,
      )}
    >
      <div className="shrink-0 text-[13px] font-semibold leading-[1.3]">
        {label}
      </div>
      <div className="flex min-w-0 w-[58%] flex-col items-end justify-center text-right">
        <div
          className={cn(
            "w-full whitespace-nowrap text-right text-[14px] font-medium tabular-nums max-sm:whitespace-normal max-sm:break-words",
            breakAll && "whitespace-normal break-all text-[13px]",
          )}
        >
          {value}
        </div>
        {percent !== null && (
          <div className="mt-1 h-[4px] w-full bg-[var(--km-instance-progress-bg)]">
            <div
              className="h-full"
              style={{
                width: `${percent}%`,
                backgroundColor: warning
                  ? "var(--km-instance-alert)"
                  : "var(--km-instance-rule)",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default KeyValueRow;
