import type { StatsOverview, StatsRange } from '../shared/types'
import { addDays, todayStr } from '../shared/util'
import { getData } from './store'

const STREAK_MIN_SECONDS = 25 * 60

function focusMinutesOn(date: string): number {
  return (
    getData().sessions
      .filter(s => s.date === date && s.mode === 'focus')
      .reduce((sum, s) => sum + s.actualSeconds, 0) / 60
  )
}

export function computeOverview(range: StatsRange): StatsOverview {
  const db = getData()
  const today = todayStr()

  const focusSessions = db.sessions.filter(s => s.mode === 'focus')
  const secondsOn = (date: string) =>
    focusSessions.filter(s => s.date === date).reduce((sum, s) => sum + s.actualSeconds, 0)

  const todaySeconds = secondsOn(today)
  const weekStart = addDays(today, -6)
  const weekSeconds = focusSessions
    .filter(s => s.date >= weekStart && s.date <= today)
    .reduce((sum, s) => sum + s.actualSeconds, 0)
  const totalSeconds = focusSessions.reduce((sum, s) => sum + s.actualSeconds, 0)

  const series14: { date: string; minutes: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const date = addDays(today, -i)
    series14.push({ date, minutes: Math.round(secondsOn(date) / 60) })
  }

  const rangeStart = range === 'week' ? weekStart : range === 'month' ? addDays(today, -29) : '0000-00-00'
  const byRange = focusSessions.filter(s => s.date >= rangeStart && s.date <= today)
  const map = new Map<string, number>()
  for (const s of byRange) {
    const key = s.subjectId ?? '__none__'
    map.set(key, (map.get(key) ?? 0) + s.actualSeconds / 60)
  }
  const bySubject = [...map.entries()]
    .map(([key, minutes]) => {
      const subject = db.subjects.find(x => x.id === key)
      return {
        subjectId: key === '__none__' ? null : key,
        name: subject?.name ?? '未分类',
        color: subject?.color ?? '#8b95ad',
        minutes: Math.round(minutes)
      }
    })
    .sort((a, b) => b.minutes - a.minutes)

  // 连续打卡:当日达标 ≥25 分钟;今天未达标则从昨天开始向前数
  const done = (date: string) => secondsOn(date) >= STREAK_MIN_SECONDS
  let cursor = done(today) ? today : addDays(today, -1)
  let streak = 0
  while (done(cursor)) {
    streak++
    cursor = addDays(cursor, -1)
  }

  const tasksToday = db.tasks.filter(t => t.date === today)
  const dueCards = db.cards.filter(c => c.nextDue <= today).length
  const todayIso = new Date(today + 'T00:00:00').getTime()

  return {
    todayMinutes: Math.round(todaySeconds / 60),
    weekMinutes: Math.round(weekSeconds / 60),
    totalMinutes: Math.round(totalSeconds / 60),
    todayPomodoros: focusSessions.filter(s => s.date === today && s.status === 'completed').length,
    totalPomodoros: focusSessions.filter(s => s.status === 'completed').length,
    streak,
    series14,
    bySubject,
    tasksToday: {
      total: tasksToday.length,
      done: tasksToday.filter(t => t.status === 'done').length
    },
    dueCards
  }
}

export { focusMinutesOn }
