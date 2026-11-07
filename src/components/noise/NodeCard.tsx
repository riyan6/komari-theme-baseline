import React from 'react'
import { Link } from 'react-router-dom'
import { GripVertical } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { MiniChart, Segments, StatusDot, metricValue } from './metrics'
import { capacity, duration, percent, rate, traffic, uptime } from '@/lib/noise-format'
import { priority } from '@/lib/noise-telemetry'
import { thresholds } from '@/lib/noise-thresholds'
import type { ProbeNode } from '@/lib/noise-types'
import { useNoiseT, type Messages } from '@/lib/noise-i18n'

const gripIcon = <GripVertical size={14} />

function netRates(node: ProbeNode) {
  return (
    <span className="net-rates">
      <span>
        <span className="muted">↑</span> {rate(node.up)}
      </span>
      <span>
        <span className="muted">↓</span> {rate(node.down)}
      </span>
    </span>
  )
}

function amounts(node: ProbeNode, t: Messages) {
  const memoryGiB = node.memory / 1024
  return {
    cpu: (
      <>
        {t.cores(node.cores)}
        <span className="resource-sep">·</span>
        {t.metric.load} {node.load.toFixed(2)}
      </>
    ),
    mem: capacity((memoryGiB * node.mem) / 100, memoryGiB),
    disk: capacity((node.storage * node.disk) / 100, node.storage),
  }
}

const RESOURCES = ['cpu', 'mem', 'disk'] as const

function compactBody(node: ProbeNode, t: Messages) {
  const amount = amounts(node, t)
  return (
    <>
      <div className="node-meta label">
        <span>{node.os}</span>
        <span>{uptime(node.uptime)}</span>
      </div>
      <div className="utilizations">
        {RESOURCES.map((metric) => (
          <div className="utilization" key={metric}>
            <span className="label">{t.metric[metric]}</span>
            <span className="meter-hover">
              <Segments value={node[metric]} metric={metric} label={t.metric[metric]} />
              <span className="meter-tip" aria-hidden="true">
                <span className="label">{t.metric[metric]}</span>
                {amount[metric]}
              </span>
            </span>
            {metricValue(node[metric], thresholds[metric], percent(node[metric]))}
          </div>
        ))}
        <div className="utilization">
          <span className="label">{t.metric.net}</span>
          {netRates(node)}
        </div>
      </div>
      <div className="card-charts">
        <MiniChart history={node.history} metric="cpu" />
        <MiniChart history={node.history} metric="net" />
      </div>
      <div className="node-card-foot">
        <span>
          <span className="label">Σ </span>
          {traffic(node.total)}
        </span>
        <span>
          <span className="label">{t.metric.load} </span>
          {node.load.toFixed(2)}
        </span>
        <span>
          <span className="label">{t.metric.rtt} </span>
          {metricValue(node.rtt, thresholds.rtt, `${node.rtt.toFixed(0)} ms`)}
        </span>
      </div>
    </>
  )
}

function detailedBody(node: ProbeNode, t: Messages) {
  const amount = amounts(node, t)
  return (
    <>
      <div className="node-meta label">
        <span>
          {node.os} <span className="resource-sep">·</span> {node.arch}
        </span>
        <span>{uptime(node.uptime)}</span>
      </div>
      <div className="resources">
        {RESOURCES.map((key) => (
          <div className="resource" key={key}>
            <div className="resource-head">
              <span className="label">{t.metric[key]}</span>
              <span className="resource-amount">{amount[key]}</span>
              {metricValue(node[key], thresholds[key], percent(node[key]))}
            </div>
            <Segments value={node[key]} metric={key} label={t.metric[key]} />
          </div>
        ))}
        <div className="resource resource-net">
          <div className="resource-head">
            <span className="label">{t.metric.net}</span>
            {netRates(node)}
          </div>
        </div>
      </div>
      <div className="card-charts">
        <MiniChart history={node.history} metric="cpu" />
        <MiniChart history={node.history} metric="net" />
      </div>
      <div className="node-card-foot">
        <span>
          <span className="label">Σ </span>
          {traffic(node.total)}
        </span>
        <span className="muted">{node.ip || node.provider}</span>
        <span>
          <span className="label">{t.metric.rtt} </span>
          {metricValue(node.rtt, thresholds.rtt, `${node.rtt.toFixed(0)} ms`)}
        </span>
      </div>
    </>
  )
}

export function NodeCard({
  node,
  index,
  detailed = false,
}: {
  node: ProbeNode
  index: number
  detailed?: boolean
}) {
  const t = useNoiseT()
  const rank = priority(node)
  const href = `/instance/${node.id}`
  const lastSeen = node.lastSeen === null ? null : new Date(node.lastSeen).toISOString()
  const downFor =
    node.lastSeen === null ? null : Math.max(0, (Date.now() - node.lastSeen) / 1000)

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: node.id,
  })

  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
      : undefined,
    transition,
    zIndex: isDragging ? 5 : undefined,
  }

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`node-card ${detailed ? 'is-detailed' : ''} ${
        rank === 1 ? 'node-warning' : rank === 2 ? 'node-offline' : ''
      } ${isDragging ? 'dragging' : ''}`}
    >
      <div className="node-card-head">
        <span className="node-index">{String(index + 1).padStart(2, '0')}</span>
        <Link
          className="node-select"
          to={href}
          aria-label={t.openNode(node.name)}
        >
          <StatusDot online={node.online} />
          <span className="node-name">{node.name}</span>
        </Link>
        <span className="region-code">{node.region}</span>
        <button
          ref={setActivatorNodeRef}
          type="button"
          className="drag-handle"
          {...attributes}
          {...listeners}
          aria-label={t.reorderNode(node.name)}
        >
          {gripIcon}
        </button>
      </div>
      <Link
        className="node-body"
        to={href}
        aria-label={t.nodeDetails(node.name)}
        tabIndex={-1}
      >
        {!node.online ? (
          <div className="offline-body">
            <div className="offline-state label">
              <span className="critical">{t.offline}</span>
              {downFor !== null && <span>{duration(downFor)}</span>}
            </div>
            <div className="offline-hatch" aria-hidden="true" />
            <div className="last-seen">
              <span className="label">{t.lastSeen}</span>
              {lastSeen ? (
                <time dateTime={lastSeen}>
                  {lastSeen.slice(0, 19).replace('T', ' ')} UTC
                </time>
              ) : (
                <span className="muted">{t.noReading}</span>
              )}
            </div>
          </div>
        ) : detailed ? (
          detailedBody(node, t)
        ) : (
          compactBody(node, t)
        )}
      </Link>
    </article>
  )
}
