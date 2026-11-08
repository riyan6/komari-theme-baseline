import type { TFunction } from 'i18next'

/**
 * Formatting utilities for the status dashboard
 */

/**
 * 将后端返回的旗帜 emoji（Unicode Regional Indicator Symbol，如 🇯🇵 / 🇺🇸）
 * 还原为纯 ASCII 两位国家/地区代码（JP / US），避免 iOS / Android 等移动端渲染彩色国旗 emoji。
 */
export function normalizeRegionCode(region?: string | null): string {
  if (!region) return ''
  const trimmed = region.trim()
  if (!trimmed) return ''
  const chars = Array.from(trimmed)
  if (chars.length === 2) {
    const start = 0x1f1e6
    const first = chars[0].codePointAt(0) ?? 0
    const second = chars[1].codePointAt(0) ?? 0
    if (
      first >= start &&
      first <= 0x1f1ff &&
      second >= start &&
      second <= 0x1f1ff
    ) {
      return String.fromCharCode(
        first - start + 65,
        second - start + 65
      ).toUpperCase()
    }
  }
  if (trimmed === '🇺🇳' || trimmed === '🌐') return 'UN'
  return trimmed.toUpperCase()
}

export function formatRegionCode(region?: string | null): string {
  return normalizeRegionCode(region) || '—'
}

export function formatCompactSpeed(bytesPerSec: number): string {
  if (bytesPerSec <= 0 || isNaN(bytesPerSec)) return '0 B/s'
  if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} B/s`
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)}K/s`
  if (bytesPerSec < 1024 * 1024 * 1024) return `${(bytesPerSec / (1024 * 1024)).toFixed(1)}M/s`
  return `${(bytesPerSec / (1024 * 1024 * 1024)).toFixed(1)}G/s`
}

export function formatCompactBytes(bytes: number): string {
  if (bytes <= 0 || isNaN(bytes)) return '0B'
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)}K`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)}M`
  if (bytes < 1024 ** 4) return `${(bytes / 1024 ** 3).toFixed(1)}G`
  return `${(bytes / 1024 ** 4).toFixed(1)}T`
}

export function formatUptimeCompact(seconds: number): string {
  if (!seconds || seconds <= 0 || isNaN(seconds)) return '0m'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

const pad2 = (n: number) => String(n).padStart(2, '0')

export function formatTzOffset(date: Date = new Date()): string {
  const offsetMinutes = -date.getTimezoneOffset()
  if (offsetMinutes === 0) return 'UTC+0'
  const sign = offsetMinutes > 0 ? '+' : '-'
  const abs = Math.abs(offsetMinutes)
  const hours = Math.floor(abs / 60)
  const minutes = abs % 60
  return minutes > 0
    ? `UTC${sign}${hours}:${pad2(minutes)}`
    : `UTC${sign}${hours}`
}

export function formatDateTimeWithTz(value: string | number | Date): string {
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return '—'
  const yyyy = d.getFullYear()
  const mm = pad2(d.getMonth() + 1)
  const dd = pad2(d.getDate())
  const hh = pad2(d.getHours())
  const min = pad2(d.getMinutes())
  const ss = pad2(d.getSeconds())
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss} ${formatTzOffset(d)}`
}

export function parseValidTimestampMs(ts?: string | number | null): number | null {
  if (ts === null || ts === undefined || ts === '') return null
  if (typeof ts === 'number') {
    if (!Number.isFinite(ts) || ts <= 0) return null
    const ms = ts < 1e11 ? ts * 1000 : ts
    const d = new Date(ms)
    return isNaN(d.getTime()) || d.getFullYear() <= 1971 ? null : ms
  }
  const trimmed = ts.trim()
  if (!trimmed || trimmed.startsWith('0001-') || trimmed.startsWith('1970-01-01')) {
    return null
  }
  const d = new Date(trimmed)
  if (isNaN(d.getTime()) || d.getFullYear() <= 1971) {
    return null
  }
  return d.getTime()
}

export function formatOfflineDuration(
  lastSeen: number | null,
  t: TFunction,
  nowMs = Date.now()
): string {
  if (lastSeen === null || !Number.isFinite(lastSeen) || lastSeen <= 0) {
    return t('status.offline')
  }
  const diffMs = Math.max(0, nowMs - lastSeen)
  const totalMinutes = Math.floor(diffMs / 60_000)
  if (totalMinutes < 60) {
    return t('status.offline_minutes', { count: Math.max(1, totalMinutes) })
  }
  const totalHours = Math.floor(diffMs / 3_600_000)
  if (totalHours < 24) {
    return t('status.offline_hours', { count: totalHours })
  }
  const totalDays = Math.floor(diffMs / 86_400_000)
  return t('status.offline_days', { count: totalDays })
}

export function parseValidExpiryDate(expiredAt?: string | null): Date | null {
  if (!expiredAt) return null
  const trimmed = expiredAt.trim()
  if (!trimmed || trimmed.startsWith('0001-') || trimmed.startsWith('1970-01-01')) {
    return null
  }
  const parsed = new Date(trimmed)
  if (isNaN(parsed.getTime()) || parsed.getFullYear() <= 1971) {
    return null
  }
  return parsed
}

export function getDaysLeft(expiredAt?: string | null, nowMs = Date.now()): number | null {
  const expiry = parseValidExpiryDate(expiredAt)
  if (!expiry) return null
  return Math.ceil((expiry.getTime() - nowMs) / 86_400_000)
}

export interface FormattedBillingInfo {
  priceText: string | null
  remainText: string | null
  isUrgent: boolean
  expiryTooltip: string | undefined
}

export function formatBillingInfo(
  params: {
    price: number
    billingCycle: number
    currency: string
    expiredAt: string
    daysLeft: number | null
  },
  t: TFunction
): FormattedBillingInfo {
  const { price, billingCycle, currency, expiredAt, daysLeft } = params

  let priceText: string | null = null
  if (price === -1) {
    priceText = t('common.free')
  } else if (price > 0) {
    const rawCurrency = (currency || '').trim()
    const formattedAmount = !rawCurrency
      ? `¥${price}`
      : /^[A-Za-z]{2,4}$/.test(rawCurrency)
      ? `${rawCurrency.toUpperCase()} ${price}`
      : `${rawCurrency}${price}`

    let cycleSuffix = ''
    if (billingCycle >= 27 && billingCycle <= 32) {
      cycleSuffix = `/${t('status.cycle_month')}`
    } else if (billingCycle >= 87 && billingCycle <= 95) {
      cycleSuffix = `/${t('status.cycle_quarter')}`
    } else if (billingCycle >= 175 && billingCycle <= 185) {
      cycleSuffix = `/${t('status.cycle_half_year')}`
    } else if (billingCycle >= 360 && billingCycle <= 370) {
      cycleSuffix = `/${t('status.cycle_year')}`
    } else if (billingCycle >= 720 && billingCycle <= 750) {
      cycleSuffix = `/${t('status.cycle_2year')}`
    } else if (billingCycle >= 1080 && billingCycle <= 1150) {
      cycleSuffix = `/${t('status.cycle_3year')}`
    } else if (billingCycle >= 1800 && billingCycle <= 1850) {
      cycleSuffix = `/${t('status.cycle_5year')}`
    } else if (billingCycle === -1) {
      cycleSuffix = `/${t('status.cycle_once')}`
    } else if (billingCycle > 0) {
      cycleSuffix = `/${billingCycle}${t('status.cycle_day')}`
    }

    priceText = `${formattedAmount}${cycleSuffix}`
  }

  let remainText: string | null = null
  let isUrgent = false
  if (daysLeft !== null) {
    if (daysLeft <= 0) {
      remainText = t('common.expired')
      isUrgent = true
    } else if (daysLeft > 36500) {
      remainText = t('common.long_term')
    } else {
      remainText = t('status.days_left', { days: daysLeft })
      isUrgent = daysLeft <= 7
    }
  } else if (billingCycle === -1 || price === -1) {
    remainText = t('common.long_term')
  }

  const expiryDate = parseValidExpiryDate(expiredAt)
  const expiryTooltip = expiryDate ? expiryDate.toISOString().slice(0, 10) : undefined

  return {
    priceText,
    remainText,
    isUrgent,
    expiryTooltip,
  }
}
