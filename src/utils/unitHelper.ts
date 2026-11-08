import type { TFunction } from "i18next";

// 数值部分：仅接受整数/小数的数字字面量（如 1000、1.5、.5）
const SIZE_NUMBER_PATTERN = /^(?:\d+(?:\.\d*)?|\.\d+)$/;

/**
 * 将表示数据大小的字符串（如 '1.5GB'、'512 MiB'、'2t'）转换为字节数。
 */
export function stringToBytes(str: string): number | null {
  if (typeof str !== "string" || str.trim() === "") {
    return 0;
  }
  const units: { [key: string]: number } = {
    b: 1,
    byte: 1,
    bytes: 1,
    k: 1024,
    kb: 1024,
    ki: 1024,
    kib: 1024,
    kilobyte: 1024,
    m: 1024 ** 2,
    mb: 1024 ** 2,
    mi: 1024 ** 2,
    mib: 1024 ** 2,
    megabyte: 1024 ** 2,
    g: 1024 ** 3,
    gb: 1024 ** 3,
    gi: 1024 ** 3,
    gib: 1024 ** 3,
    gigabyte: 1024 ** 3,
    t: 1024 ** 4,
    tb: 1024 ** 4,
    ti: 1024 ** 4,
    tib: 1024 ** 4,
    terabyte: 1024 ** 4,
    p: 1024 ** 5,
    pb: 1024 ** 5,
    pi: 1024 ** 5,
    pib: 1024 ** 5,
    petabyte: 1024 ** 5,
  };

  const cleanStr = str.toLowerCase().replace(/,/g, "").replace(/\s/g, "");
  const unitKeys = Object.keys(units).sort((a, b) => b.length - a.length);
  const unitRegex = new RegExp(`(${unitKeys.join("|")})$`);

  let unit = "b";
  let numericPart = cleanStr;

  const match = cleanStr.match(unitRegex);
  if (match) {
    unit = match[1];
    numericPart = cleanStr.substring(0, cleanStr.length - unit.length);
  }

  if (numericPart === "") {
    numericPart = "1";
  }

  if (!SIZE_NUMBER_PATTERN.test(numericPart)) {
    return null;
  }
  const value = Number(numericPart);
  if (!Number.isFinite(value)) {
    return null;
  }

  const result = Math.round(value * units[unit]);
  return Number.isFinite(result) ? result : null;
}

export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  if (unitIndex === 0) {
    return `${Math.round(size)} ${units[unitIndex]}`;
  } else if (unitIndex >= 2 && bytes >= 1024 ** 3) {
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  } else if (size > 99.99) {
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  } else {
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}

/** 紧凑格式运行时间："122d 17h 53m"（不足 1 天显示 "17h 53m"，不显示秒） */
export function formatUptime(seconds: number, _t?: TFunction): string {
  void _t;
  if (!seconds || seconds <= 0 || !Number.isFinite(seconds)) return "0m";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) {
    return `${d}d ${h}h ${m}m`;
  }
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  return `${m}m`;
}

/** 速率格式化（字节/秒）：B、KB 不带小数，GB 以上 1 位小数，数值 ≥100 时不带小数 */
export function formatSpeed(bytes: number): string {
  if (bytes === 0) return "0 B/s";
  const units = ["B/s", "KB/s", "MB/s", "GB/s", "TB/s"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  let decimals = 2;
  if (i >= 3) decimals = 1;
  if (i <= 1) decimals = 0;
  if (size >= 100) decimals = 0;
  return `${size.toFixed(decimals)} ${units[i]}`;
}
