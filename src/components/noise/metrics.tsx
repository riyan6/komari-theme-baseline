import { memo, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import type { Sample } from '@/lib/noise-types'
import { rangeSamples, type Metric } from '@/lib/noise-telemetry'
import { exceedsThreshold, thresholds, type ThresholdMetric } from '@/lib/noise-thresholds'
import { useNoiseT } from '@/lib/noise-i18n'

export const StatusDot = memo(function StatusDot({ online }: { online: boolean }) {
  const t = useNoiseT()
  return <span className={`status-dot ${online ? '' : 'is-offline'}`} aria-label={online ? t.online : t.offline} />
})

export function LiveIndicator({ tick, stale }: { tick: number; stale: boolean }) {
  const previous = useRef(tick)
  const [started, setStarted] = useState(false)
  useEffect(() => {
    if (previous.current !== tick) setStarted(true)
    previous.current = tick
  }, [tick])
  const t = useNoiseT()
  return (
    <span className="label live-label">
      <span key={tick} className={`status-dot ${stale ? 'is-offline' : started ? 'live-tick' : ''}`} />
      {stale ? t.connectionLost : t.live}
    </span>
  )
}

/** Render helper. Flips key when value crosses threshold so CSS flash replays. */
export function metricValue(value: number, threshold: number | undefined, text: ReactNode) {
  const warning = exceedsThreshold(value, threshold)
  return (
    <span key={warning ? 'warning' : 'normal'} className={warning ? 'metric-value warning' : 'metric-value'}>
      {text}
    </span>
  )
}

type SegmentsProps = { value: number; offline?: boolean; label?: string; metric?: ThresholdMetric }
const segmentsView = ({ value, offline = false, metric = 'cpu' }: SegmentsProps) =>
  [Math.ceil(value / 5), Math.round(value), offline, exceedsThreshold(value, thresholds[metric])].join()

/** Re-renders only when the filled count, announced value or warning state changes */
export const Segments = memo(
  function Segments({ value, offline = false, label = 'UTILIZATION', metric = 'cpu' }: SegmentsProps) {
    return (
      <div
        className={`segments ${!offline && exceedsThreshold(value, thresholds[metric]) ? 'warning' : ''}`}
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={offline ? 0 : Math.round(value)}
      >
        {Array.from({ length: 20 }, (_, i) => (
          <span key={i} className={!offline && i < Math.ceil(value / 5) ? 'filled' : ''} />
        ))}
      </div>
    )
  },
  (previous, next) => previous.label === next.label && segmentsView(previous) === segmentsView(next)
)

function areaFill(id: string, opacity = 0.16) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--fg)" stopOpacity={opacity} />
        <stop offset="100%" stopColor="var(--fg)" stopOpacity={0} />
      </linearGradient>
    </defs>
  )
}

function ceiling(data: Sample[], metric: Metric) {
  if (metric === 'cpu' || metric === 'mem') return 100
  const maximum = Math.max(
    1,
    ...data.map((point) => (metric === 'net' ? Math.max(point.up ?? 0, point.down ?? 0) : point.rtt ?? 0))
  )
  const step = metric === 'net' ? 1024 : 10 ** Math.floor(Math.log10(maximum))
  return Math.ceil(maximum / step) * step
}

const SPARK_HEIGHT = 42
const SPARK_TOP = 3

/** Positions are seconds within displayed minute; null readings break the path */
function sparkPaths(values: (number | null)[], max: number, positions: number[]) {
  let line = ''
  let area = ''
  let start = -1
  let previous = -1
  const y = (value: number) => (SPARK_HEIGHT - (Math.min(value, max) / max) * (SPARK_HEIGHT - SPARK_TOP)).toFixed(2)
  const close = () => {
    if (start >= 0) area += `L${previous} ${SPARK_HEIGHT}L${start} ${SPARK_HEIGHT}Z`
  }
  values.forEach((value, index) => {
    const x = positions[index]
    if (value === null) {
      close()
      start = -1
      return
    }
    const point = `${x} ${y(value)}`
    if (start < 0) {
      start = x
      line += `M${point}`
      area += `M${point}`
    } else {
      line += `L${point}`
      area += `L${point}`
    }
    previous = x
  })
  close()
  return { line, area }
}

/** Plain SVG keeps per-card redraws inexpensive as live snapshots arrive */
export function MiniChart({ history, metric }: { history: Sample[]; metric: 'cpu' | 'net' }) {
  const t = useNoiseT()
  const rawId = useId()
  const fill = `mini-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`
  const data = rangeSamples(history, '1m')
  const max = ceiling(data, metric)
  const end = data.at(-1)?.time ?? Date.now()
  const positions = data.map((point) => (point.time - end + 60_000) / 1000)
  const primary = sparkPaths(
    data.map((point) => (metric === 'cpu' ? point.cpu : point.down)),
    max,
    positions
  )
  const secondary = metric === 'net' ? sparkPaths(data.map((point) => point.up), max, positions) : null

  return (
    <div className="mini-chart-block" aria-label={`${metric.toUpperCase()} / 60s`}>
      <div className="mini-caption label">
        <span>{t.metric[metric]}</span>
        <span>60s</span>
      </div>
      <svg className="mini-chart" viewBox={`0 0 60 ${SPARK_HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
        {areaFill(fill)}
        <path d={primary.area} fill={`url(#${fill})`} />
        <path
          d={primary.line}
          fill="none"
          stroke={metric === 'net' ? 'var(--muted)' : 'var(--fg)'}
          strokeWidth={1.25}
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        />
        {secondary && (
          <path
            d={secondary.line}
            fill="none"
            stroke="var(--fg)"
            strokeWidth={1.25}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </div>
  )
}
