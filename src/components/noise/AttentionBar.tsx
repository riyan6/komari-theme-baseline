import { Link } from 'react-router-dom'
import { StatusDot } from './metrics'
import type { ProbeNode } from '@/lib/noise-types'
import { duration, percent } from '@/lib/noise-format'
import { breaches } from '@/lib/noise-telemetry'
import { useNoiseT } from '@/lib/noise-i18n'

interface AttentionBarProps {
  nodes: ProbeNode[]
}

export function AttentionBar({ nodes }: AttentionBarProps) {
  const t = useNoiseT()
  const offline = nodes.filter((node) => !node.online)
  const hot = nodes
    .map((node) => ({ node, metrics: breaches(node) }))
    .filter((item) => item.metrics.length > 0)

  if (offline.length === 0 && hot.length === 0) {
    return (
      <section className="attention is-clear" aria-label={t.fleetHealth}>
        <StatusDot online />
        <span className="label">{t.allHealthy}</span>
      </section>
    )
  }

  return (
    <section className="attention" aria-label={t.needsAttention}>
      <span className="label attention-title">{t.needsAttention}</span>
      <div className="attention-items">
        {offline.map((node) => {
          const down =
            node.lastSeen !== null
              ? Math.max(0, (Date.now() - node.lastSeen) / 1000)
              : null
          return (
            <Link
              key={node.id}
              className="attention-chip is-offline"
              to={`/instance/${node.id}`}
            >
              <StatusDot online={false} />
              <span className="chip-name">{node.name}</span>
              <span className="chip-detail critical">
                {t.offline}
                {down !== null && ` · ${duration(down)}`}
              </span>
            </Link>
          )
        })}
        {hot.map(({ node, metrics }) => (
          <Link
            key={node.id}
            className="attention-chip is-warning"
            to={`/instance/${node.id}`}
          >
            <span className="chip-mark" aria-hidden="true" />
            <span className="chip-name">{node.name}</span>
            <span className="chip-detail warning">
              {metrics
                .map((metric) =>
                  metric === 'rtt'
                    ? `${t.metric[metric]} ${node.rtt.toFixed(0)} ms`
                    : `${t.metric[metric]} ${percent(node[metric])}`
                )
                .join(' · ')}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
