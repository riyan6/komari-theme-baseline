/**
 * 节点价格 -> 人民币 折算工具。
 *
 * Komari 的节点 `currency` 是管理员在「货币」里选择的货币符号（默认 `$`，见后端模型默认值），
 * `price` 是「每个账单周期」的金额，单位由 `currency` 决定。
 *
 * Komari 支持的货币单位固定为：¥(人民币) $ (美元) € (欧元) £ (英镑) ₽ (卢布) ₣ (法郎)
 * ₹ (卢比) ₫ (越南盾) ฿ (泰铢)。
 *
 * 下表为「1 单位货币 = 多少人民币」的近似汇率，仅用于首页月/年支出汇总展示；汇率会波动，
 * 需要精确值时直接调整下表即可。
 */
export const CNY_PER_UNIT: Record<string, number> = {
  CNY: 1,
  RMB: 1,
  USD: 7.2,
  EUR: 7.8,
  GBP: 9.1,
  CHF: 8.1,
  JPY: 0.048,
  HKD: 0.92,
  TWD: 0.22,
  MOP: 0.9,
  SGD: 5.35,
  AUD: 4.7,
  CAD: 5.25,
  NZD: 4.3,
  KRW: 0.0052,
  INR: 0.086,
  RUB: 0.08,
  THB: 0.2,
  VND: 0.00028,
  MYR: 1.5,
  PHP: 0.125,
  IDR: 0.00045,
  BRL: 1.3,
  TRY: 0.2,
}

/** 货币符号 -> ISO 代码（覆盖 Komari 支持的 9 个货币单位） */
const SYMBOL_TO_CODE: Record<string, string> = {
  '¥': 'CNY',
  '￥': 'CNY',
  '元': 'CNY',
  $: 'USD',
  'US$': 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '₽': 'RUB',
  '₣': 'CHF',
  '₹': 'INR',
  '₫': 'VND',
  '฿': 'THB',
}

/** 把某货币金额折算成人民币。优先用传入的实时汇率表，缺失时回退内置汇率；未知货币按 1:1 处理。 */
export const toCnyAmount = (
  amount: number,
  currency?: string | null,
  rates: Record<string, number> = CNY_PER_UNIT,
): number => {
  if (!Number.isFinite(amount) || amount <= 0) return 0
  const raw = (currency ?? '').trim()
  // 无货币信息时沿用原有展示约定（当作人民币）。
  if (!raw) return amount

  const normalized = raw.toUpperCase()
  const code = SYMBOL_TO_CODE[raw] ?? SYMBOL_TO_CODE[normalized] ?? normalized
  const rate = rates[code] ?? CNY_PER_UNIT[code]
  return rate === undefined ? amount : amount * rate
}
