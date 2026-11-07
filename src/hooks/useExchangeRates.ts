import { useEffect, useState } from 'react'
import { requestJson } from '@/lib/http'
import { CNY_PER_UNIT } from '@/utils/currency'

/**
 * 实时汇率：拉取「1 单位各货币 = 多少人民币」。
 *
 * - 数据源：open.er-api.com（免 API Key，每日更新，返回全量货币对美元汇率，CORS 允许跨域）。
 * - 缓存到 localStorage，12 小时内不重复请求。
 * - 请求失败时回退到上一次缓存；再没有则回退内置近似汇率 CNY_PER_UNIT。
 * - 汇率仅用于首页月/年支出展示，不涉及任何敏感数据。
 */
const RATE_API_URL = 'https://open.er-api.com/v6/latest/USD'
const RATE_CACHE_KEY = 'komari-cny-rates-v1'
const RATE_CACHE_TTL_MS = 12 * 60 * 60 * 1000

type RateCache = {
  fetchedAt: number
  rates: Record<string, number>
}

type ErApiResponse = {
  result?: string
  rates?: Record<string, number>
}

const readCache = (): RateCache | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(RATE_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<RateCache>
    if (
      parsed &&
      typeof parsed.fetchedAt === 'number' &&
      parsed.rates &&
      typeof parsed.rates === 'object'
    ) {
      return { fetchedAt: parsed.fetchedAt, rates: parsed.rates }
    }
  } catch {
    // ignore
  }
  return null
}

const writeCache = (cache: RateCache) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(RATE_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // ignore
  }
}

/** 把「各货币兑美元」的汇率换算成「1 单位货币 = 多少人民币」。 */
const buildCnyPerUnit = (usdRates: Record<string, number>): Record<string, number> => {
  const cnyPerUsd = usdRates.CNY
  if (typeof cnyPerUsd !== 'number' || cnyPerUsd <= 0) return {}
  const result: Record<string, number> = {}
  for (const [code, rate] of Object.entries(usdRates)) {
    if (typeof rate === 'number' && rate > 0) {
      result[code] = cnyPerUsd / rate
    }
  }
  return result
}

/** 返回「1 单位货币 = 多少人民币」的汇率表（含实时汇率，失败时回退内置汇率）。 */
export function useCnyRates(): Record<string, number> {
  const [rates, setRates] = useState<Record<string, number>>(
    () => readCache()?.rates ?? CNY_PER_UNIT,
  )

  useEffect(() => {
    const cached = readCache()
    if (cached) setRates(cached.rates)
    if (cached && Date.now() - cached.fetchedAt < RATE_CACHE_TTL_MS) return

    let active = true
    requestJson<ErApiResponse>(RATE_API_URL, { method: 'GET', expectSuccess: false })
      .then((response) => {
        if (!active || !response?.rates) return
        const next = buildCnyPerUnit(response.rates)
        if (Object.keys(next).length > 0) {
          setRates(next)
          writeCache({ fetchedAt: Date.now(), rates: next })
        }
      })
      .catch(() => {
        // 网络失败时保留缓存/内置汇率
      })

    return () => {
      active = false
    }
  }, [])

  return rates
}
