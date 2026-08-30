import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { getDb } from './db'
import { mistakes, reviewItems, reviewLogs, sessions, subjects, tasks } from './schema'

const COUNTED = ['completed', 'abandoned']

function localDateStr(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** 近 N 天各科目专注分钟数 */
export function focusBySubject(
  days = 30
): Array<{ name: string; color: string; minutes: number }> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - (days - 1))
  cutoff.setHours(0, 0, 0, 0)
  const rows = getDb()
    .select({
      subjectId: sessions.subjectId,
      startedAt: sessions.startedAt,
      actualMinutes: sessions.actualMinutes,
      status: sessions.status,
      name: subjects.name,
      color: subjects.color
    })
    .from(sessions)
    .leftJoin(subjects, eq(sessions.subjectId, subjects.id))
    .where(and(eq(sessions.deleted, 0), inArray(sessions.status, COUNTED)))
    .all()

  const map = new Map<string, { name: string; color: string; minutes: number }>()
  for (const row of rows) {
    if (new Date(row.startedAt) < cutoff) continue
    const key = row.subjectId == null ? 'none' : String(row.subjectId)
    const entry = map.get(key) ?? {
      name: row.name ?? '未分类',
      color: row.color ?? '#cbd5e1',
      minutes: 0
    }
    entry.minutes += row.actualMinutes ?? 0
    map.set(key, entry)
  }
  return [...map.values()]
    .filter((s) => s.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes)
}

/** 本周(周一起)任务完成率 */
export function weekTaskStats(): { done: number; total: number } {
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  const start = localDateStr(monday)
  const rows = getDb()
    .select({ status: tasks.status })
    .from(tasks)
    .where(and(eq(tasks.deleted, 0), sql`${tasks.date} >= ${start}`))
    .all()
  return {
    total: rows.length,
    done: rows.filter((r) => r.status === 'done').length
  }
}

/** 概览:累计专注分钟/番茄数、错题数、复习项数 */
export function overview(): {
  totalMinutes: number
  totalPomodoros: number
  mistakeCount: number
  reviewCount: number
  reviewReviewed: number
} {
  const db = getDb()
  const sessionRows = db
    .select({
      actualMinutes: sessions.actualMinutes,
      status: sessions.status,
      startedAt: sessions.startedAt
    })
    .from(sessions)
    .where(and(eq(sessions.deleted, 0), inArray(sessions.status, COUNTED)))
    .all()
  const today = localDateStr(new Date())
  const mistakeRows = db
    .select({ c: sql<number>`count(*)` })
    .from(mistakes)
    .where(eq(mistakes.deleted, 0))
    .all()
  const reviewRows = db
    .select({ c: sql<number>`count(*)` })
    .from(reviewItems)
    .where(eq(reviewItems.deleted, 0))
    .all()
  const logRows = db
    .select({ reviewedAt: reviewLogs.reviewedAt })
    .from(reviewLogs)
    .where(eq(reviewLogs.deleted, 0))
    .all()

  return {
    totalMinutes: sessionRows.reduce((sum, r) => sum + (r.actualMinutes ?? 0), 0),
    totalPomodoros: sessionRows.filter((r) => r.status === 'completed').length,
    mistakeCount: Number(mistakeRows[0]?.c ?? 0),
    reviewCount: Number(reviewRows[0]?.c ?? 0),
    reviewReviewed: logRows.length
  }
}

/** 最近 N 天每日专注分钟(趋势图用) */
export function dailyMinutes(days = 30): Array<{ date: string; minutes: number }> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - (days - 1))
  cutoff.setHours(0, 0, 0, 0)
  const rows = getDb()
    .select({
      startedAt: sessions.startedAt,
      actualMinutes: sessions.actualMinutes,
      status: sessions.status
    })
    .from(sessions)
    .where(and(eq(sessions.deleted, 0), inArray(sessions.status, COUNTED)))
    .orderBy(desc(sessions.startedAt))
    .all()

  const map = new Map<string, number>()
  for (let i = 0; i < days; i++) {
    const d = new Date(cutoff)
    d.setDate(cutoff.getDate() + i)
    map.set(localDateStr(d), 0)
  }
  for (const row of rows) {
    const key = localDateStr(new Date(row.startedAt))
    if (map.has(key)) map.set(key, (map.get(key) ?? 0) + (row.actualMinutes ?? 0))
  }
  return [...map.entries()].map(([date, minutes]) => ({ date, minutes }))
}
