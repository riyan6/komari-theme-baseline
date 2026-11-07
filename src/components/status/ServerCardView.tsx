import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSortable } from '@dnd-kit/sortable'
import {
  formatCompactBytes,
  formatCompactSpeed,
  formatOfflineDuration,
  formatUptimeCompact,
} from '@/utils/statusFormat'
import type { ProbeNode } from '@/lib/noise-types'

interface ServerCardUnitProps {
  node: ProbeNode
}

const ServerCardUnit: React.FC<ServerCardUnitProps> = ({ node }) => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const isZh = i18n.language?.toLowerCase().startsWith('zh')

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id })

  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
      : undefined,
    transition,
    zIndex: isDragging ? 20 : undefined,
  }

  const renderMetric = (label: string, value: number, detailText?: string) => {
    const clamped = Math.min(100, Math.max(0, isNaN(value) ? 0 : value))
    const isWarning = clamped > 80

    return (
      <div className="flex flex-col min-w-0">
        <span className="label-swiss whitespace-nowrap">{label}</span>
        <span className="mt-1 text-[28px] font-bold leading-none tracking-tight tabular-nums whitespace-nowrap text-black dark:text-[#F2F2F2]">
          {node.online ? `${clamped.toFixed(0)}%` : '—'}
        </span>
        <div className="swiss-progress-track mt-2 w-full h-[4px]">
          <div
            className={`swiss-progress-fill ${isWarning ? 'is-warning' : ''}`}
            style={{ width: `${node.online ? clamped : 0}%` }}
          />
        </div>
        <div className="h-[18px] mt-1 flex items-center">
          {detailText && node.online ? (
            <span
              className="type-caption text-[#6B6B6B] dark:text-[#8C8C8C] truncate"
              title={detailText}
            >
              {detailText}
            </span>
          ) : (
            <span className="type-caption text-transparent select-none">—</span>
          )}
        </div>
      </div>
    )
  }

  const memDetail = `${formatCompactBytes(node.memUsed)} / ${formatCompactBytes(node.memTotal)}`
  const diskDetail = `${formatCompactBytes(node.diskUsed)} / ${formatCompactBytes(node.diskTotal)}`

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => navigate(`/instance/${node.id}`)}
      className={`group relative flex flex-col justify-between pt-3 pb-2.5 cursor-pointer select-none transition-colors border-t ${
        !node.online
          ? 'opacity-60 border-[#E5001C] hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'
          : 'border-black dark:border-[#F2F2F2] hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'
      } ${
        isDragging
          ? 'outline-2 outline-black dark:outline-[#F2F2F2] bg-white dark:bg-[#0A0A0A]'
          : ''
      }`}
      {...attributes}
      {...listeners}
    >
      <div>
        {/* Line 1: Node Name + Uppercase Region Code with exact same font style */}
        <div className="flex items-baseline justify-between gap-2">
          <span className="node-name text-black dark:text-[#F2F2F2] truncate">
            {node.name}
          </span>
          <span className="node-name text-black dark:text-[#F2F2F2] shrink-0 uppercase whitespace-nowrap">
            {node.region ? node.region.toUpperCase() : '—'}
          </span>
        </div>

        {/* Line 2: Status square + ONLINE/OFFLINE + Load + Uptime */}
        <div className="mt-1 flex items-center justify-between type-caption uppercase tracking-wider text-[#6B6B6B] dark:text-[#8C8C8C]">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span
              className={
                node.online ? 'status-square-online' : 'status-square-offline'
              }
            />
            <span
              className={node.online ? '' : 'text-[#E5001C]'}
              title={
                !node.online && node.lastSeen
                  ? new Date(node.lastSeen).toLocaleString()
                  : undefined
              }
            >
              {node.online
                ? t('status.online')
                : formatOfflineDuration(node.lastSeen, t)}
            </span>
            {node.online && (
              <>
                <span>·</span>
                <span className="tabular-nums lowercase">load {node.load1.toFixed(2)}</span>
              </>
            )}
          </div>
          <span className="tabular-nums whitespace-nowrap">
            {node.online ? formatUptimeCompact(node.uptime, isZh) : '—'}
          </span>
        </div>

        {/* Line 3: Three metrics strictly locked in 3-column grid (CPU / MEM / DISK) */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {renderMetric(t('status.th_cpu'), node.cpu, `${node.cores} Core`)}
          {renderMetric(t('status.th_mem'), node.mem, memDetail)}
          {renderMetric(t('status.th_disk'), node.disk, diskDetail)}
        </div>
      </div>

      {/* Line 4: Speed rates and Total traffic (Original clean sans font) */}
      <div className="mt-4 flex items-center justify-between border-t border-black/20 pt-2.5 type-meta whitespace-nowrap text-[#6B6B6B] dark:border-white/20 dark:text-[#8C8C8C]">
        <div className="flex items-center gap-3">
          <span className="tabular-nums">↓ {formatCompactSpeed(node.downBytes)}</span>
          <span className="tabular-nums">↑ {formatCompactSpeed(node.upBytes)}</span>
        </div>
        <div className="type-caption text-[#8C8C8C] dark:text-[#6B6B6B]">
          {formatCompactBytes(node.total)}
        </div>
      </div>
    </div>
  )
}

interface ServerCardViewProps {
  nodes: ProbeNode[]
}

export const ServerCardView: React.FC<ServerCardViewProps> = ({ nodes }) => {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {nodes.map((node) => (
        <ServerCardUnit key={node.id} node={node} />
      ))}
    </div>
  )
}
