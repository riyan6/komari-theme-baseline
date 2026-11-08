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
  monthlyCost: number // CNY / month
  yearlyCost: number // CNY / year
}

const formatCny = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return '¥0.00'
  return `¥${value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export const StatusHero: React.FC<StatusHeroProps> = ({
  onlineCount,
  totalCount,
  speedUp,
  speedDown,
  trafficUp,
  trafficDown,
  monthlyCost,
  yearlyCost,
}) => {
  const { t } = useTranslation()
  const totalSpeed = speedUp + speedDown
  const totalTraffic = trafficUp + trafficDown
  const allOnline = totalCount > 0 && onlineCount === totalCount
  const offlineCount = Math.max(0, totalCount - onlineCount)

  return (
    <section className="mb-8 grid grid-cols-1 items-start border-b border-black pb-8 md:grid-cols-12 md:items-start dark:border-[#333333]">
      {/* Left: Online / Total */}
      <div className="flex flex-col items-start justify-start pr-0 md:col-span-6 md:pr-8 lg:col-span-6">
        <div className="label-swiss">{t('status.online_total')}</div>
        <div className="main-number mt-2 whitespace-nowrap tabular-nums text-black dark:text-[#F2F2F2]">
          {onlineCount}
          <span
            className="inline-block text-[#6B6B6B] dark:text-[#8C8C8C]"
            style={{ fontSize: '0.9em', transform: 'translateY(-0.04em)' }}
          >
            /
          </span>
          {totalCount}
        </div>
        <div className="mt-4 flex items-center gap-2">
          <span className={allOnline ? 'status-square-online' : 'status-square-offline'} />
          <span className="type-control whitespace-nowrap uppercase tracking-wider text-[#6B6B6B] dark:text-[#8C8C8C]">
            {allOnline
              ? t('status.all_online')
              : offlineCount > 0
              ? t('status.nodes_summary', { online: onlineCount, offline: offlineCount })
              : t('status.waiting_nodes')}
          </span>
        </div>
      </div>

      {/* Right: network speed / traffic / monthly cost / yearly cost */}
      <div className="mt-6 border-t border-black pt-6 md:col-span-6 md:mt-0 md:border-l md:border-t-0 md:pl-8 md:pt-0 lg:col-span-6 dark:border-[#333333]">
        <div className="grid grid-cols-1 items-start gap-x-8 gap-y-6 lg:grid-cols-2">
          {/* Network speed */}
          <div className="flex flex-col justify-start">
            <div className="label-swiss">{t('network_speed')}</div>
            <div className="sub-number mt-1.5 whitespace-nowrap tabular-nums text-black dark:text-[#F2F2F2]">
              {formatCompactSpeed(totalSpeed)}
            </div>
            <div className="mt-1.5 flex items-center gap-3 type-control whitespace-nowrap tabular-nums text-[#6B6B6B] dark:text-[#8C8C8C]">
              <span>↓ {formatCompactSpeed(speedDown)}</span>
              <span>↑ {formatCompactSpeed(speedUp)}</span>
            </div>
          </div>

          {/* Traffic overview */}
          <div className="flex flex-col justify-start">
            <div className="label-swiss">{t('traffic_overview')}</div>
            <div className="sub-number mt-1.5 whitespace-nowrap tabular-nums text-black dark:text-[#F2F2F2]">
              {formatCompactBytes(totalTraffic)}
            </div>
            <div className="mt-1.5 flex items-center gap-3 type-control whitespace-nowrap tabular-nums text-[#6B6B6B] dark:text-[#8C8C8C]">
              <span>↓ {formatCompactBytes(trafficDown)}</span>
              <span>↑ {formatCompactBytes(trafficUp)}</span>
            </div>
          </div>

          {/* Monthly cost */}
          <div className="flex flex-col justify-start">
            <div className="label-swiss">{t('status.monthly_cost')}</div>
            <div className="sub-number mt-1.5 whitespace-nowrap tabular-nums text-black dark:text-[#F2F2F2]">
              {formatCny(monthlyCost)}
            </div>
          </div>

          {/* Yearly cost */}
          <div className="flex flex-col justify-start">
            <div className="label-swiss">{t('status.yearly_cost')}</div>
            <div className="sub-number mt-1.5 whitespace-nowrap tabular-nums text-black dark:text-[#F2F2F2]">
              {formatCny(yearlyCost)}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
