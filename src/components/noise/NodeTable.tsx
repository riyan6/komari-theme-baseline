import { useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import type { ProbeNode } from '@/lib/noise-types'
import { useNoisePreferences, type SortKey } from '@/lib/noise-store'
import { percent, rate, traffic, uptime } from '@/lib/noise-format'
import { StatusDot, metricValue } from './metrics'
import { comparePriority } from '@/lib/noise-telemetry'
import { thresholds } from '@/lib/noise-thresholds'
import { useNoiseT } from '@/lib/noise-i18n'

const columns: Exclude<SortKey, 'priority'>[] = [
  'online',
  'name',
  'region',
  'os',
  'uptime',
  'cpu',
  'mem',
  'disk',
  'up',
  'down',
  'total',
  'load',
  'rtt',
]

export function NodeTable({ nodes }: { nodes: ProbeNode[] }) {
  const t = useNoiseT()
  const navigate = useNavigate()
  const { sort, setSort } = useNoisePreferences()

  const sorted = useMemo(() => {
    return [...nodes].sort((a, b) => {
      if (sort.key === 'priority') return comparePriority(a, b)
      const x = a[sort.key]
      const y = b[sort.key]
      const result =
        typeof x === 'string'
          ? x.localeCompare(String(y))
          : Number(x) - Number(y)
      return (
        (result || a.id.localeCompare(b.id)) * (sort.direction === 'asc' ? 1 : -1)
      )
    })
  }, [nodes, sort])

  const cell = (node: ProbeNode, key: SortKey) => {
    if (key === 'online') {
      return (
        <span className={node.online ? 'table-state' : 'table-state critical'}>
          <StatusDot online={node.online} />
          {node.online ? t.stateUp : t.stateDown}
        </span>
      )
    }
    if (key === 'name') {
      return (
        <Link
          className="table-name"
          to={`/instance/${node.id}`}
          onClick={(e) => e.stopPropagation()}
        >
          {node.name}
        </Link>
      )
    }
    if (key === 'region' || key === 'os') return node[key]
    if (key === 'total') return traffic(node.total)
    if (!node.online) return '—'
    if (key === 'uptime') return uptime(node.uptime)
    if (key === 'cpu' || key === 'mem' || key === 'disk') {
      return metricValue(node[key], thresholds[key], percent(node[key]))
    }
    if (key === 'up' || key === 'down') return rate(node[key])
    return key === 'rtt'
      ? metricValue(node.rtt, thresholds.rtt, `${node.rtt.toFixed(0)} ms`)
      : node.load.toFixed(2)
  }

  return (
    <div className="table-scroll">
      <table className="noise-table">
        <thead>
          <tr>
            {columns.map((key) => (
              <th
                key={key}
                aria-sort={
                  sort.key === key
                    ? sort.direction === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
              >
                <button type="button" onClick={() => setSort(key)}>
                  {t.column[key]}
                  <span className={sort.key === key ? 'sort-active' : 'sort-idle'}>
                    {sort.key === key && sort.direction === 'desc' ? '↓' : '↑'}
                  </span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((node) => (
            <tr key={node.id} onClick={() => navigate(`/instance/${node.id}`)}>
              {columns.map((key) => (
                <td key={key}>{cell(node, key)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
