import type { NodeBasicInfo } from '@/contexts/NodeListContext'

export interface Sample {
  time: number
  cpu: number | null
  mem: number | null
  up: number | null
  down: number | null
  rtt: number | null
}

export interface ProbeNode {
  id: string
  uuid: string
  name: string
  region: string
  city: string
  provider: string
  group: string
  tags: string
  os: string
  kernel: string
  arch: string
  cpuModel: string
  ip: string
  cores: number
  memory: number // MiB
  storage: number // GiB
  online: boolean
  lastSeen: number | null
  uptime: number
  cpu: number // percentage 0-100
  mem: number // percentage 0-100
  disk: number // percentage 0-100
  up: number // KB/s (legacy compatibility)
  down: number // KB/s (legacy compatibility)
  upBytes: number // bytes/s
  downBytes: number // bytes/s
  totalUp: number // bytes
  totalDown: number // bytes
  total: number // bytes
  trafficUsed: number // bytes counted toward quota
  trafficLimit: number // bytes (0 = unlimited)
  trafficLimitType: 'sum' | 'max' | 'min' | 'up' | 'down'
  trafficPercent: number // percentage when trafficLimit > 0
  price: number
  billingCycle: number
  currency: string
  expiredAt: string
  daysLeft: number | null
  memUsed: number // bytes
  memTotal: number // bytes
  swapUsed: number // bytes
  swapTotal: number // bytes
  diskUsed: number // bytes
  diskTotal: number // bytes
  load: number
  load1: number
  load5: number
  load15: number
  tcpConns: number
  udpConns: number
  processCount: number
  rtt: number
  history: Sample[]
  rawNode?: NodeBasicInfo
}
