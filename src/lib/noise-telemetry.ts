import type { ProbeNode, Sample } from './noise-types'
import { exceedsThreshold, thresholds, type ThresholdMetric } from './noise-thresholds'

export type Metric = 'cpu' | 'mem' | 'net' | 'rtt'

export function priority(node: ProbeNode) {
  if (!node.online) return 2
  return breaches(node).length ? 1 : 0
}

export const comparePriority = (a: ProbeNode, b: ProbeNode) => priority(b) - priority(a)

/** Metrics currently strictly above their threshold, in threshold order. */
export function breaches(node: ProbeNode): ThresholdMetric[] {
  if (!node.online) return []
  return (Object.keys(thresholds) as ThresholdMetric[]).filter(metric =>
    exceedsThreshold(node[metric], thresholds[metric])
  )
}

/** Fleet-wide totals over online nodes; CPU and memory are capacity-weighted averages. */
export function summarize(nodes: ProbeNode[]) {
  const online = nodes.filter(node => node.online)
  const totals = online.reduce(
    (sum, node) => ({
      up: sum.up + node.up,
      down: sum.down + node.down,
      cpu: sum.cpu + node.cpu * node.cores,
      cores: sum.cores + node.cores,
      mem: sum.mem + node.mem * node.memory,
      memory: sum.memory + node.memory,
    }),
    { up: 0, down: 0, cpu: 0, cores: 0, mem: 0, memory: 0 }
  )
  return {
    online: online.length,
    offline: nodes.length - online.length,
    up: totals.up,
    down: totals.down,
    cores: totals.cores,
    memory: totals.memory,
    cpu: totals.cores ? totals.cpu / totals.cores : 0,
    mem: totals.memory ? totals.mem / totals.memory : 0,
    transfer: nodes.reduce((sum, node) => sum + node.total, 0),
  }
}

export function rangeSamples(history: Sample[], range: '1m' | '15m' | '1h') {
  const seconds = range === '1m' ? 60 : range === '15m' ? 900 : 3600
  const last = history.at(-1)?.time ?? Date.now()
  const samples = history.filter(sample => sample.time > last - seconds * 1000)
  const step = Math.max(1, Math.ceil(samples.length / 180))
  return samples.filter((_, index) => index % step === 0 || index === samples.length - 1)
}
