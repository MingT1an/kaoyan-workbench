/** 全部使用本地时区处理的日期工具,日期字符串格式统一为 YYYY-MM-DD */

export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function todayStr(): string {
  return fmtDate(new Date())
}

/** 解析 YYYY-MM-DD 为本地时区当日 0 点(避免 new Date('2026-01-02') 按 UTC 解析) */
export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function addDays(s: string, days: number): string {
  const d = parseDate(s)
  d.setDate(d.getDate() + days)
  return fmtDate(d)
}

/** b - a 的自然日天数 */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86_400_000)
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export function weekdayCN(s: string): string {
  return WEEKDAYS[parseDate(s).getDay()]
}

/** 秒数 → "X小时Y分钟" / "Y分钟" */
export function fmtMinutes(totalSeconds: number): string {
  const m = Math.round(totalSeconds / 60)
  if (m < 1) return '不足 1 分钟'
  const h = Math.floor(m / 60)
  const mm = m % 60
  if (h === 0) return `${mm} 分钟`
  if (mm === 0) return `${h} 小时`
  return `${h} 小时 ${mm} 分钟`
}

/** 小时数(浮点) → "X.X 小时" */
export function fmtHours(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} 分钟`
  return `${(minutes / 60).toFixed(1)} 小时`
}

export function fmtClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  if (h > 0) return `${h}:${pad2(m)}:${pad2(ss)}`
  return `${pad2(m)}:${pad2(ss)}`
}

export function fmtTime(iso: string): string {
  const d = new Date(iso)
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/** MM-DD 短日期 */
export function fmtShort(s: string): string {
  const [, m, d] = s.split('-')
  return `${Number(m)}-${Number(d)}`
}
