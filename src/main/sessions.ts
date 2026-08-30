import { and, desc, eq } from 'drizzle-orm'
import { getDb } from './db'
import { sessions, subjects, tasks } from './schema'
import type { CalendarDay, SessionRow } from '../shared/types'

function localDateStr(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** 计入时长的会话:完成或放弃(放弃也记录实际分钟数) */
const COUNTED = ['completed', 'abandoned']

const rowSelection = {
  id: sessions.id,
  taskId: sessions.taskId,
  subjectId: sessions.subjectId,
  startedAt: sessions.startedAt,
  endedAt: sessions.endedAt,
  plannedMinutes: sessions.plannedMinutes,
  actualMinutes: sessions.actualMinutes,
  status: sessions.status,
  subjectName: subjects.name,
  subjectColor: subjects.color,
  taskTitle: tasks.title
}

export function todayFocus(): { minutes: number; pomodoros: number; recent: SessionRow[] } {
  const db = getDb()
  const today = localDateStr(new Date())
  const rows = db
    .select(rowSelection)
    .from(sessions)
    .leftJoin(subjects, eq(sessions.subjectId, subjects.id))
    .leftJoin(tasks, eq(sessions.taskId, tasks.id))
    .where(eq(sessions.deleted, 0))
    .orderBy(desc(sessions.startedAt))
    .all()

  const todaysCounted = rows.filter(
    (r) => COUNTED.includes(r.status) && localDateStr(new Date(r.startedAt)) === today
  )
  return {
    minutes: todaysCounted.reduce((sum, r) => sum + (r.actualMinutes ?? 0), 0),
    pomodoros: todaysCounted.filter((r) => r.status === 'completed').length,
    recent: rows.filter((r) => r.status === 'completed').slice(0, 5)
  }
}

export function calendar(days = 84): CalendarDay[] {
  const db = getDb()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - (days - 1))
  cutoff.setHours(0, 0, 0, 0)
  const rows = db
    .select({ startedAt: sessions.startedAt, actualMinutes: sessions.actualMinutes, status: sessions.status })
    .from(sessions)
    .where(eq(sessions.deleted, 0))
    .all()

  const map = new Map<string, CalendarDay>()
  for (let i = 0; i < days; i++) {
    const d = new Date(cutoff)
    d.setDate(cutoff.getDate() + i)
    map.set(localDateStr(d), { date: localDateStr(d), minutes: 0, pomodoros: 0 })
  }
  for (const row of rows) {
    if (!COUNTED.includes(row.status)) continue
    const key = localDateStr(new Date(row.startedAt))
    const entry = map.get(key)
    if (entry) {
      entry.minutes += row.actualMinutes ?? 0
      if (row.status === 'completed') entry.pomodoros += 1
    }
  }
  return [...map.values()]
}
