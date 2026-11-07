export const percent = (value: number) => `${value.toFixed(1)}%`

/** KB/s in, ['42.91', 'MB/s'] out. */
export const rateParts = (value: number) =>
  value >= 1024
    ? [(value / 1024).toFixed(2), 'MB/s'] as const
    : [value.toFixed(1), 'KB/s'] as const

export const rate = (value: number) => rateParts(value).join(' ')

export const traffic = (value: number) =>
  value >= 1024 ** 4
    ? `${(value / 1024 ** 4).toFixed(2)} TiB`
    : `${(value / 1024 ** 3).toFixed(2)} GiB`

export const uptime = (value: number) =>
  `${Math.floor(value / 86400)}d ${String(Math.floor((value % 86400) / 3600)).padStart(2, '0')}h`

export const duration = (value: number) =>
  value >= 86400
    ? uptime(value)
    : value >= 3600
    ? `${Math.floor(value / 3600)}h ${String(Math.floor((value % 3600) / 60)).padStart(2, '0')}m`
    : value >= 60
    ? `${Math.floor(value / 60)}m ${String(Math.floor(value % 60)).padStart(2, '0')}s`
    : `${Math.floor(value)}s`

/** Used and total capacity in GiB, sharing the total's unit: '4.65 / 8.00 GiB', '415 / 512 GiB', '1.20 / 2.00 TiB'. */
export const capacity = (usedGiB: number, totalGiB: number) => {
  const scale = totalGiB >= 1024 ? 1024 : 1
  const total = totalGiB / scale
  const digits = total >= 100 ? 0 : total >= 10 ? 1 : 2
  return `${(usedGiB / scale).toFixed(digits)} / ${total.toFixed(digits)} ${scale > 1 ? 'TiB' : 'GiB'}`
}

export const utc = (value: number) => {
  try {
    return new Date(value).toISOString().slice(11, 19)
  } catch {
    return '00:00:00'
  }
}
