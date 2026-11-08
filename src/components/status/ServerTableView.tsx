import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  formatBillingInfo,
  formatCompactBytes,
  formatCompactSpeed,
  formatDateTimeWithTz,
  formatOfflineDuration,
  formatRegionCode,
  formatUptimeCompact,
} from '@/utils/statusFormat'
import type { ProbeNode } from '@/lib/noise-types'
import type { StatusSortDir, StatusSortKey } from './StatusToolbar'

interface ServerTableViewProps {
  nodes: ProbeNode[]
  sortKey: StatusSortKey
  sortDir: StatusSortDir
  onToggleSort: (k: StatusSortKey) => void
}

export const ServerTableView: React.FC<ServerTableViewProps> = ({
  nodes,
  sortKey,
  sortDir,
  onToggleSort,
}) => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const renderSortIndicator = (key: StatusSortKey) => {
    if (sortKey !== key) return null
    return (
      <span className="ml-1 text-black dark:text-white">
        {sortDir === 'desc' ? '↓' : '↑'}
      </span>
    )
  }

  const headerBtnClass = (key: StatusSortKey, alignRight = false) =>
    `inline-flex ${
      alignRight ? 'w-full justify-end' : ''
    } items-center hover:text-black dark:hover:text-white cursor-pointer uppercase transition-colors ${
      sortKey === key ? 'text-black dark:text-white' : ''
    }`

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[1200px] table-fixed border-collapse text-left font-sans">
        <colgroup>
          <col className="w-auto" />
          <col className="w-[68px]" />
          <col className="w-[78px]" />
          <col className="w-[132px]" />
          <col className="w-[132px]" />
          <col className="w-[132px]" />
          <col className="w-[132px]" />
          <col className="w-[128px]" />
          <col className="w-[132px]" />
          <col className="w-[136px]" />
        </colgroup>
        <thead>
          <tr className="border-b border-black type-table-head dark:border-[#333333]">
            <th className="h-[46px] pl-2 pr-4 font-semibold">
              <button
                type="button"
                onClick={() => onToggleSort('name')}
                className={headerBtnClass('name')}
              >
                <span>{t('status.th_node')}</span> {renderSortIndicator('name')}
              </button>
            </th>
            <th className="h-[46px] px-2.5 font-semibold">
              <button
                type="button"
                onClick={() => onToggleSort('region')}
                className={headerBtnClass('region')}
              >
                <span>{t('status.th_region')}</span> {renderSortIndicator('region')}
              </button>
            </th>
            <th className="h-[46px] px-2.5 font-semibold text-right">
              <button
                type="button"
                onClick={() => onToggleSort('load')}
                className={headerBtnClass('load', true)}
              >
                <span>{t('status.th_load')}</span> {renderSortIndicator('load')}
              </button>
            </th>
            <th className="h-[46px] px-3.5 font-semibold text-right">
              <button
                type="button"
                onClick={() => onToggleSort('cpu')}
                className={headerBtnClass('cpu', true)}
              >
                <span>{t('status.th_cpu')}</span> {renderSortIndicator('cpu')}
              </button>
            </th>
            <th className="h-[46px] px-3.5 font-semibold text-right">
              <button
                type="button"
                onClick={() => onToggleSort('mem')}
                className={headerBtnClass('mem', true)}
              >
                <span>{t('status.th_mem')}</span> {renderSortIndicator('mem')}
              </button>
            </th>
            <th className="h-[46px] px-3.5 font-semibold text-right">
              <button
                type="button"
                onClick={() => onToggleSort('disk')}
                className={headerBtnClass('disk', true)}
              >
                <span>{t('status.th_disk')}</span> {renderSortIndicator('disk')}
              </button>
            </th>
            <th className="h-[46px] px-3.5 font-semibold text-right">
              <button
                type="button"
                onClick={() => onToggleSort('traffic')}
                className={headerBtnClass('traffic', true)}
              >
                <span>{t('status.th_traffic')}</span> {renderSortIndicator('traffic')}
              </button>
            </th>
            <th className="h-[46px] px-3.5 font-semibold text-right">
              <button
                type="button"
                onClick={() => onToggleSort('billing')}
                className={headerBtnClass('billing', true)}
              >
                <span>{t('status.th_billing')}</span> {renderSortIndicator('billing')}
              </button>
            </th>
            <th className="h-[46px] px-3.5 font-semibold">
              <button
                type="button"
                onClick={() => onToggleSort('speed')}
                className={headerBtnClass('speed')}
              >
                <span>{t('status.th_speed')}</span> {renderSortIndicator('speed')}
              </button>
            </th>
            <th className="h-[46px] pl-3 pr-2 font-semibold text-right">
              <button
                type="button"
                onClick={() => onToggleSort('uptime')}
                className={headerBtnClass('uptime', true)}
              >
                <span>{t('status.th_uptime')}</span> {renderSortIndicator('uptime')}
              </button>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/20 dark:divide-white/20">
          {nodes.map((node) => {
            const clampedCpu = Math.min(100, Math.max(0, isNaN(node.cpu) ? 0 : node.cpu))
            const clampedMem = Math.min(100, Math.max(0, isNaN(node.mem) ? 0 : node.mem))
            const clampedDisk = Math.min(100, Math.max(0, isNaN(node.disk) ? 0 : node.disk))

            const hasTrafficQuota = node.trafficLimit > 0
            const rawTrafficPct = isNaN(node.trafficPercent)
              ? 0
              : Math.max(0, node.trafficPercent)
            const clampedTraffic = Math.min(100, rawTrafficPct)
            const hasTrafficData = node.online || node.total > 0

            const memDetail = `${formatCompactBytes(node.memUsed)} / ${formatCompactBytes(node.memTotal)}`
            const diskDetail = `${formatCompactBytes(node.diskUsed)} / ${formatCompactBytes(node.diskTotal)}`
            const trafficDetail = hasTrafficQuota
              ? `${formatCompactBytes(node.trafficUsed)} / ${formatCompactBytes(node.trafficLimit)} (↓ ${formatCompactBytes(node.totalDown)} · ↑ ${formatCompactBytes(node.totalUp)})`
              : `↓ ${formatCompactBytes(node.totalDown)} · ↑ ${formatCompactBytes(node.totalUp)}`

            const billing = formatBillingInfo(node, t)

            return (
              <tr
                key={node.id}
                onClick={() => navigate(`/instance/${node.id}`)}
                className="group h-[62px] cursor-pointer transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
              >
                {/* Node Name & Online State */}
                <td className="h-[62px] py-2.5 pl-2 pr-4 align-middle">
                  <div className="node-name text-black group-hover:underline dark:text-[#F2F2F2] truncate">
                    {node.name}
                  </div>
                  <div
                    className="mt-0.5 flex items-center gap-1.5 type-meta tracking-wider text-[#6B6B6B] dark:text-[#8C8C8C] whitespace-nowrap"
                    title={
                      !node.online && node.lastSeen
                        ? formatDateTimeWithTz(node.lastSeen)
                        : undefined
                    }
                  >
                    <span
                      className={
                        node.online ? 'status-square-online' : 'status-square-offline'
                      }
                    />
                    <span className={node.online ? 'uppercase' : 'text-[#E5001C]'}>
                      {node.online
                        ? t('status.online')
                        : formatOfflineDuration(node.lastSeen, t)}
                    </span>
                  </div>
                </td>

                {/* Region: Same font style as node name */}
                <td className="h-[62px] px-2.5 align-middle whitespace-nowrap uppercase">
                  <span className="node-name text-black dark:text-[#F2F2F2]">
                    {formatRegionCode(node.region)}
                  </span>
                </td>

                {/* System Load */}
                <td className="h-[62px] px-2.5 align-middle text-right table-value">
                  {node.online ? (
                    <span
                      className={`whitespace-nowrap ${
                        node.load1 > node.cores * 1.5
                          ? 'text-[#E5001C] font-semibold'
                          : 'text-black dark:text-[#F2F2F2]'
                      }`}
                      title={`Load 1/5/15: ${node.load1.toFixed(2)}, ${node.load5.toFixed(2)}, ${node.load15.toFixed(2)}`}
                    >
                      {node.load1.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-[#6B6B6B] whitespace-nowrap">—</span>
                  )}
                </td>

                {/* CPU: number right-aligned on top (1 decimal place), 4px bar below */}
                <td className="h-[62px] px-3.5 align-middle text-right">
                  {node.online ? (
                    <div className="flex flex-col items-stretch">
                      <div className="table-value text-right font-semibold whitespace-nowrap text-black dark:text-[#F2F2F2]">
                        {clampedCpu.toFixed(1)}%
                      </div>
                      <div className="swiss-progress-track w-full mt-[6px]">
                        <div
                          className={`swiss-progress-fill ${clampedCpu > 80 ? 'is-warning' : ''}`}
                          style={{ width: `${clampedCpu}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="table-value text-[#6B6B6B] whitespace-nowrap">—</span>
                  )}
                </td>

                {/* MEM: percentage on top, 4px bar below, title with exact usage */}
                <td
                  className="h-[62px] px-3.5 align-middle text-right"
                  title={memDetail}
                >
                  {node.online ? (
                    <div className="flex flex-col items-stretch">
                      <div className="table-value text-right font-semibold whitespace-nowrap text-black dark:text-[#F2F2F2]">
                        {clampedMem.toFixed(1)}%
                      </div>
                      <div className="swiss-progress-track w-full mt-[6px]">
                        <div
                          className={`swiss-progress-fill ${clampedMem > 80 ? 'is-warning' : ''}`}
                          style={{ width: `${clampedMem}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="table-value text-[#6B6B6B] whitespace-nowrap">—</span>
                  )}
                </td>

                {/* DISK: percentage on top, 4px bar below, title with exact usage */}
                <td
                  className="h-[62px] px-3.5 align-middle text-right"
                  title={diskDetail}
                >
                  {node.online ? (
                    <div className="flex flex-col items-stretch">
                      <div className="table-value text-right font-semibold whitespace-nowrap text-black dark:text-[#F2F2F2]">
                        {clampedDisk.toFixed(1)}%
                      </div>
                      <div className="swiss-progress-track w-full mt-[6px]">
                        <div
                          className={`swiss-progress-fill ${clampedDisk > 80 ? 'is-warning' : ''}`}
                          style={{ width: `${clampedDisk}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="table-value text-[#6B6B6B] whitespace-nowrap">—</span>
                  )}
                </td>

                {/* TRAFFIC: quota percentage + 4px bar (or cumulative traffic when no limit) */}
                <td
                  className="h-[62px] px-3.5 align-middle text-right"
                  title={trafficDetail}
                >
                  {hasTrafficData ? (
                    <div className="flex flex-col items-stretch">
                      <div className="table-value text-right font-semibold whitespace-nowrap text-black dark:text-[#F2F2F2]">
                        {hasTrafficQuota
                          ? `${Math.min(999.9, rawTrafficPct).toFixed(1)}%`
                          : formatCompactBytes(node.total)}
                      </div>
                      <div className="swiss-progress-track w-full mt-[6px]">
                        <div
                          className={`swiss-progress-fill ${
                            hasTrafficQuota && rawTrafficPct > 80 ? 'is-warning' : ''
                          }`}
                          style={{ width: `${hasTrafficQuota ? clampedTraffic : 0}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="table-value text-[#6B6B6B] whitespace-nowrap">—</span>
                  )}
                </td>

                {/* Billing: Renewal Cycle Price & Remaining Days (placed right after Traffic) */}
                <td
                  className="h-[62px] px-3.5 text-right align-middle"
                  title={billing.expiryTooltip}
                >
                  {billing.priceText || billing.remainText ? (
                    <div className="flex flex-col items-end leading-snug">
                      <span
                        className={`table-value whitespace-nowrap ${
                          !billing.priceText && billing.isUrgent
                            ? 'text-[#E5001C]'
                            : 'text-black dark:text-[#F2F2F2]'
                        }`}
                      >
                        {billing.priceText ?? billing.remainText}
                      </span>
                      {billing.priceText && billing.remainText && (
                        <span
                          className={`mt-0.5 type-meta whitespace-nowrap ${
                            billing.isUrgent
                              ? 'text-[#E5001C] font-semibold'
                              : 'text-[#6B6B6B] dark:text-[#8C8C8C]'
                          }`}
                        >
                          {billing.remainText}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="table-value text-[#6B6B6B] whitespace-nowrap">—</span>
                  )}
                </td>

                {/* Speed: Clean sans font, tabular-nums */}
                <td className="h-[62px] px-3.5 align-middle type-meta whitespace-nowrap text-[#6B6B6B] dark:text-[#8C8C8C]">
                  {node.online ? (
                    <div className="flex flex-col leading-snug whitespace-nowrap">
                      <span>↓ {formatCompactSpeed(node.downBytes)}</span>
                      <span>↑ {formatCompactSpeed(node.upBytes)}</span>
                    </div>
                  ) : (
                    <span className="table-value text-[#6B6B6B] whitespace-nowrap">—</span>
                  )}
                </td>

                {/* Uptime */}
                <td className="h-[62px] pl-3 pr-2 text-right align-middle table-value whitespace-nowrap text-black dark:text-[#F2F2F2]">
                  {node.online ? formatUptimeCompact(node.uptime) : (
                    <span className="text-[#6B6B6B]">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
