import React from 'react'

interface MinimalProgressBarProps {
  value: number // 0 - 100
  label?: string
  warningThreshold?: number
  className?: string
  barWidth?: string // e.g. "w-[96px]" or "w-full"
}

export const MinimalProgressBar: React.FC<MinimalProgressBarProps> = ({
  value,
  label,
  warningThreshold = 80,
  className = '',
  barWidth = 'w-[96px]',
}) => {
  const clamped = Math.min(100, Math.max(0, isNaN(value) ? 0 : value))
  const isWarning = clamped > warningThreshold

  return (
    <div className={`inline-flex items-center gap-3 font-sans tabular-nums ${className}`}>
      <span className="table-value w-12 text-right whitespace-nowrap text-black dark:text-[#F2F2F2]">
        {label ?? `${clamped.toFixed(1)}%`}
      </span>
      <div className={`swiss-progress-track ${barWidth} shrink-0`}>
        <div
          className={`swiss-progress-fill ${isWarning ? 'is-warning' : ''}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}
