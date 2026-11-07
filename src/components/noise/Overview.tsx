import { Link } from 'react-router-dom'
import { StatusDot } from './metrics'
import type { ProbeNode } from '@/lib/noise-types'
import { rate, rateParts, traffic, percent } from '@/lib/noise-format'
import { exceedsThreshold, thresholds } from '@/lib/noise-thresholds'
import { useNoiseT } from '@/lib/noise-i18n'

interface OverviewProps {
  nodes: ProbeNode[]
  fleet: {
    online: number
    offline: number
    up: number
    down: number
    transfer: number
  }
  busiest: ProbeNode | null
}

const pad = (value: number) => String(value).padStart(2, '0')

export function Overview({ nodes, fleet, busiest }: OverviewProps) {
  const t = useNoiseT()
  const [transfer, transferUnit] = traffic(fleet.transfer).split(' ')
  const [throughput, throughputUnit] = rateParts(fleet.up + fleet.down)
  const regions = [...new Set(nodes.map((node) => node.region).filter((r) => r && r !== '—'))].sort()

  return (
    <section className="overview" aria-label={t.fleetOverview}>
      {/* 1. Fleet Status */}
      <div className="overview-cell fleet-cell">
        <span className="label">{t.fleetStatus}</span>
        <div className="fleet-line">
          <strong>{pad(fleet.online)}</strong>
          <span className="muted">/ {pad(nodes.length)}</span>
          <div className="fleet-note">
            <span className="label">{t.online}</span>
            <span className={fleet.offline ? 'critical label' : 'label'}>
              {pad(fleet.offline)} {t.offline}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Live Network Rate */}
      <div className="overview-cell rate-cell">
        <span className="label">{t.networkLive}</span>
        <div className="overview-reading">
          <span className="overview-value">{throughput}</span>
          <span className="label">{throughputUnit}</span>
        </div>
        <div className="overview-split">
          <span>
            <span className="label">↑ {t.upload}</span>
            {rate(fleet.up)}
          </span>
          <span>
            <span className="label">↓ {t.download}</span>
            {rate(fleet.down)}
          </span>
        </div>
      </div>

      {/* 3. Busiest Node */}
      <div className="overview-cell busiest-cell">
        <div className="overview-heading">
          <span className="label">{t.busiest}</span>
          {busiest && <span className="label">{busiest.region}</span>}
        </div>
        <div className="overview-reading">
          <span
            className={
              busiest && exceedsThreshold(busiest.cpu, thresholds.cpu)
                ? 'overview-value warning'
                : 'overview-value'
            }
          >
            {busiest ? busiest.cpu.toFixed(1) : '—'}
          </span>
          {busiest && <span className="label">%</span>}
        </div>
        {busiest ? (
          <div className="overview-split">
            <Link className="busiest-node" to={`/instance/${busiest.id}`}>
              <StatusDot online />
              {busiest.name}
            </Link>
            <span>
              <span className="label">{t.metric.mem}</span>
              {percent(busiest.mem)}
              <span className="label busiest-gap">{t.metric.disk}</span>
              {percent(busiest.disk)}
            </span>
          </div>
        ) : (
          <div className="overview-split label">{t.noReading}</div>
        )}
      </div>

      {/* 4. Total Bandwidth Transfer */}
      <div className="overview-cell traffic-cell">
        <span className="label">{t.transferTotal}</span>
        <div className="overview-reading">
          <span className="overview-value">{transfer}</span>
          <span className="label">{transferUnit}</span>
        </div>
        <div className="label">
          {t.regions(regions.length)} <span>·</span> {t.endpoints(nodes.length)}
        </div>
      </div>
    </section>
  )
}
