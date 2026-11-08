import { useMemo, useState, useEffect } from 'react'
import { useNodeList } from '@/contexts/NodeListContext'
import { useLiveData } from '@/contexts/LiveDataContext'
import { summarize } from '@/lib/noise-telemetry'
import { getDaysLeft, normalizeRegionCode, parseValidTimestampMs } from '@/utils/statusFormat'
import type { ProbeNode, Sample } from '@/lib/noise-types'

// Global in-memory rolling history map across re-renders
const nodeHistoryMap = new Map<string, Sample[]>()

function seedHistory(initialCpu: number, initialUp: number, initialDown: number): Sample[] {
  const now = Date.now()
  const history: Sample[] = []
  // Seed with 6 points across the past 30s
  for (let s = 30; s >= 0; s -= 5) {
    history.push({
      time: now - s * 1000,
      cpu: Math.max(0, initialCpu + (Math.random() * 4 - 2)),
      mem: null,
      up: Math.max(0, initialUp + (Math.random() * 20 - 10)),
      down: Math.max(0, initialDown + (Math.random() * 30 - 15)),
      rtt: null,
    })
  }
  return history
}

export function useNoiseProbe() {
  const { nodeList, isLoading, error } = useNodeList()
  const { live_data, showCallout } = useLiveData()
  const [updatedAt, setUpdatedAt] = useState<number>(() => Date.now())

  const rawLive = live_data?.data
  const onlineSet = useMemo(() => new Set(rawLive?.online ?? []), [rawLive?.online])

  useEffect(() => {
    if (rawLive) {
      const now = Date.now()
      setUpdatedAt(now)
    }
  }, [rawLive])

  const nodes = useMemo((): ProbeNode[] => {
    if (!nodeList) return []
    const now = Date.now()

    return nodeList.map((raw) => {
      const isOnline = onlineSet.has(raw.uuid)
      const live = rawLive?.data?.[raw.uuid]

      const memTotalBytes = raw.mem_total || 1
      const diskTotalBytes = raw.disk_total || 1
      const swapTotalBytes = raw.swap_total || 0

      const cpu = isOnline && live ? live.cpu.usage : 0
      const memBytes = isOnline && live ? live.ram.used : 0
      const swapBytes = isOnline && live ? live.swap?.used ?? 0 : 0
      const diskBytes = isOnline && live ? live.disk.used : 0

      const memPercent = Math.min(100, (memBytes / memTotalBytes) * 100)
      const diskPercent = Math.min(100, (diskBytes / diskTotalBytes) * 100)

      // Network: live.network.up & down are bytes/sec
      const upBytes = isOnline && live ? live.network.up || 0 : 0
      const downBytes = isOnline && live ? live.network.down || 0 : 0
      const totalUpBytes = live ? live.network.totalUp || 0 : 0
      const totalDownBytes = live ? live.network.totalDown || 0 : 0
      const total = totalUpBytes + totalDownBytes

      // Traffic quota & usage
      const trafficLimit = raw.traffic_limit || 0
      const trafficLimitType = raw.traffic_limit_type || 'sum'
      let trafficUsed = total
      if (trafficLimit > 0) {
        switch (trafficLimitType) {
          case 'max':
            trafficUsed = Math.max(totalUpBytes, totalDownBytes)
            break
          case 'min':
            trafficUsed = Math.min(totalUpBytes, totalDownBytes)
            break
          case 'up':
            trafficUsed = totalUpBytes
            break
          case 'down':
            trafficUsed = totalDownBytes
            break
          case 'sum':
          default:
            trafficUsed = total
            break
        }
      }
      const trafficPercent =
        trafficLimit > 0 ? (trafficUsed / trafficLimit) * 100 : 0

      // Billing & expiration
      const price = raw.price ?? 0
      const billingCycle = raw.billing_cycle ?? 0
      const currency = raw.currency ?? ''
      const expiredAt = raw.expired_at ?? ''
      const daysLeft = getDaysLeft(expiredAt, now)

      const upKb = upBytes / 1024
      const downKb = downBytes / 1024

      const load1 = isOnline && live ? live.load.load1 || 0 : 0
      const load5 = isOnline && live ? live.load.load5 || 0 : 0
      const load15 = isOnline && live ? live.load.load15 || 0 : 0
      const uptimeSec = isOnline && live ? live.uptime || 0 : 0

      const tcpConns = isOnline && live ? live.connections?.tcp ?? 0 : 0
      const udpConns = isOnline && live ? live.connections?.udp ?? 0 : 0
      const processCount = isOnline && live ? live.process ?? 0 : 0

      // In-memory rolling history
      let history = nodeHistoryMap.get(raw.uuid)
      if (!history || history.length === 0) {
        history = isOnline ? seedHistory(cpu, upKb, downKb) : []
        nodeHistoryMap.set(raw.uuid, history)
      }

      if (isOnline) {
        // Append new sample if time moved forward
        const lastSample = history.at(-1)
        if (!lastSample || now - lastSample.time >= 1500) {
          history.push({
            time: now,
            cpu,
            mem: memPercent,
            up: upKb,
            down: downKb,
            rtt: null,
          })
          // Keep only past 90 seconds
          while (history.length > 0 && now - history[0].time > 90_000) {
            history.shift()
          }
        }
      }

      const ip = raw.ipv4 || raw.ipv6 || ''
      const lastSeen =
        parseValidTimestampMs(live?.updated_at) ??
        parseValidTimestampMs(raw.updated_at)

      const regionCode = normalizeRegionCode(raw.region)

      return {
        id: raw.uuid,
        uuid: raw.uuid,
        name: raw.name,
        region: regionCode,
        city: raw.group || regionCode,
        provider: raw.virtualization || raw.tags || 'VPS',
        group: raw.group || '',
        tags: raw.tags || '',
        os: raw.os || 'Linux',
        kernel: raw.kernel_version || '',
        arch: raw.arch || '',
        cpuModel: raw.cpu_name || '',
        ip,
        cores: raw.cpu_cores || 1,
        memory: Math.round(memTotalBytes / (1024 * 1024)), // MiB
        storage: Math.round(diskTotalBytes / (1024 * 1024 * 1024)), // GiB
        online: isOnline,
        lastSeen,
        uptime: uptimeSec,
        cpu,
        mem: memPercent,
        disk: diskPercent,
        up: upKb,
        down: downKb,
        upBytes,
        downBytes,
        totalUp: totalUpBytes,
        totalDown: totalDownBytes,
        total,
        trafficUsed,
        trafficLimit,
        trafficLimitType,
        trafficPercent,
        price,
        billingCycle,
        currency,
        expiredAt,
        daysLeft,
        memUsed: memBytes,
        memTotal: memTotalBytes,
        swapUsed: swapBytes,
        swapTotal: swapTotalBytes,
        diskUsed: diskBytes,
        diskTotal: diskTotalBytes,
        load: load1,
        load1,
        load5,
        load15,
        tcpConns,
        udpConns,
        processCount,
        rtt: 0,
        history,
        rawNode: raw,
      }
    })
  }, [nodeList, rawLive, onlineSet])

  const connection = error || !showCallout ? 'disconnected' : isLoading && !nodeList ? 'connecting' : 'connected'
  const stale = connection === 'disconnected'

  const fleet = useMemo(() => summarize(nodes), [nodes])
  const busiest = useMemo(
    () => nodes.reduce<ProbeNode | null>((top, node) => (node.online && (!top || node.cpu > top.cpu) ? node : top), null),
    [nodes]
  )

  return {
    nodes,
    fleet,
    busiest,
    connection,
    updatedAt,
    stale,
    sourceLabel: 'Komari RPC2',
    isLoading: isLoading && !nodeList,
    error,
  }
}
