import React from 'react'
import { useTranslation } from 'react-i18next'
import { formatCompactBytes, formatCompactSpeed } from '@/utils/statusFormat'

interface StatusHeroProps {
  onlineCount: number
  totalCount: number
  speedUp: number // bytes/sec
  speedDown: number // bytes/sec
  trafficUp: number // bytes
  trafficDown: number // bytes
}

export const StatusHero: React.FC<StatusHeroProps> = ({
  onlineCount,
  totalCount,
  speedUp,
  speedDown,
  trafficUp,
  trafficDown,
}) => {
  const { t } = useTranslation()
  const totalSpeed = speedUp + speedDown
  const totalTraffic = trafficUp + trafficDown
  const allOnline = totalCount > 0 && onlineCount === totalCount
  const offlineCount = Math.max(0, totalCount - onlineCount)

  return (
    <section className="mb-8 grid grid-cols-1 md:grid-cols-12 md:items-stretch border-b border-black dark:border-[#333333] pb-8">
      {/* Left: Online / Total */}
      <div className="md:col-span-6 lg:col-span-6 flex flex-col justify-between pr-0 md:pr-8">
        <div>
          <div className="label-swiss">{t('status.online_total')}</div>
          <div className="main-number mt-2 text-black dark:text-[#F2F2F2] tabular-nums whitespace-nowrap">
            {onlineCount}<span className="text-[#6B6B6B] dark:text-[#8C8C8C]">/</span>{totalCount}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className={allOnline ? 'status-square-online' : 'status-square-offline'} />
          <span className="type-control text-[#6B6B6B] dark:text-[#8C8C8C] uppercase tracking-wider whitespace-nowrap">
            {allOnline
              ? t('status.all_online')
              : offlineCount > 0
              ? t('status.nodes_summary', { online: onlineCount, offline: offlineCount })
              : t('status.waiting_nodes')}
          </span>
        </div>
      </div>

      {/* Right: Stacked Total speed on top, 1px horizontal line, Total traffic on bottom */}
      <div className="md:col-span-6 lg:col-span-6 flex flex-col justify-between border-t md:border-t-0 md:border-l border-black dark:border-[#333333] md:pl-8 pt-6 md:pt-0 mt-6 md:mt-0">
        {/* Total speed */}
        <div className="flex-1 flex flex-col justify-center pb-4">
          <div className="label-swiss">{t('status.total_speed')}</div>
          <div className="sub-number mt-1.5 text-black dark:text-[#F2F2F2] tabular-nums whitespace-nowrap">
            {formatCompactSpeed(totalSpeed)}
          </div>
          <div className="mt-1.5 flex items-center gap-3 type-control text-[#6B6B6B] dark:text-[#8C8C8C] tabular-nums whitespace-nowrap">
            <span>↓ {formatCompactSpeed(speedDown)}</span>
            <span>↑ {formatCompactSpeed(speedUp)}</span>
          </div>
        </div>

        {/* 1px Horizontal Separator */}
        <div className="w-full h-[1px] bg-black/20 dark:bg-white/20" />

        {/* Total traffic */}
        <div className="flex-1 flex flex-col justify-center pt-4">
          <div className="label-swiss">{t('status.total_traffic')}</div>
          <div className="sub-number mt-1.5 text-black dark:text-[#F2F2F2] tabular-nums whitespace-nowrap">
            {formatCompactBytes(totalTraffic)}
          </div>
          <div className="mt-1.5 flex items-center gap-3 type-control text-[#6B6B6B] dark:text-[#8C8C8C] tabular-nums whitespace-nowrap">
            <span>↓ {formatCompactBytes(trafficDown)}</span>
            <span>↑ {formatCompactBytes(trafficUp)}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
