export const thresholds = { cpu: 85, mem: 85, disk: 90, rtt: 150 } as const
export type ThresholdMetric = keyof typeof thresholds

export function exceedsThreshold(value: number, threshold?: number) {
  return threshold !== undefined && value > threshold
}

export function metricThreshold(metric: ThresholdMetric | 'net') {
  return metric === 'net' ? undefined : thresholds[metric]
}
