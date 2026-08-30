import { Notification } from 'electron'
import { and, eq } from 'drizzle-orm'
import { getDb } from './db'
import { sessions, settings, tasks } from './schema'
import { SETTING_KEYS, type TimerState, type TimerStatus } from '../shared/types'

let ticker: NodeJS.Timeout | null = null
let broadcast: ((state: TimerState) => void) | null = null
let currentSessionId: number | null = null

let state: TimerState = {
  status: 'idle',
  taskId: null,
  subjectId: null,
  taskTitle: null,
  startedAt: null,
  endsAt: null,
  paused: false,
  remainingMs: 0,
  plannedMinutes: 0,
  pomodoros: 0
}

function localDateStr(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function readNumberSetting(key: string, fallback: number): number {
  const rows = getDb()
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, key))
    .all()
  const v = Number(rows[0]?.value)
  return Number.isFinite(v) && v > 0 ? v : fallback
}

export function getState(): TimerState {
  return state
}

export function initTimer(opts: { broadcast: (state: TimerState) => void }): void {
  broadcast = opts.broadcast
  reconcileOrphanSessions()
  state.pomodoros = completedPomodorosToday()
  startTicker()
}

function completedPomodorosToday(): number {
  const db = getDb()
  const today = localDateStr(new Date())
  const rows = db
    .select({ startedAt: sessions.startedAt })
    .from(sessions)
    .where(and(eq(sessions.deleted, 0), eq(sessions.status, 'completed')))
    .all()
  return rows.filter((r) => localDateStr(new Date(r.startedAt)) === today).length
}

/**
 * 崩溃/断电恢复:把遗留的 running 会话按实际经过时间落账,
 * 计时接近满一个番茄按完成计,否则按放弃计。
 */
function reconcileOrphanSessions(): void {
  const db = getDb()
  const orphans = db
    .select()
    .from(sessions)
    .where(and(eq(sessions.deleted, 0), eq(sessions.status, 'running')))
    .all()
  for (const row of orphans) {
    const started = new Date(row.startedAt).getTime()
    const elapsedMs = Date.now() - started
    const plannedMs = row.plannedMinutes * 60_000
    const effectiveMs = Math.min(elapsedMs, plannedMs)
    const actualMinutes = Math.floor(effectiveMs / 60_000)
    const status = elapsedMs >= plannedMs * 0.98 ? 'completed' : 'abandoned'
    db.update(sessions)
      .set({
        endedAt: new Date(started + effectiveMs).toISOString(),
        actualMinutes,
        status,
        updatedAt: new Date().toISOString()
      })
      .where(eq(sessions.id, row.id))
      .run()
  }
  if (orphans.length > 0) {
    console.log(`[timer] 恢复了 ${orphans.length} 条中断的专注记录`)
  }
}

function startTicker(): void {
  if (ticker) return
  ticker = setInterval(() => {
    if (state.status === 'idle' || state.paused) return
    state.remainingMs = state.endsAt ? new Date(state.endsAt).getTime() - Date.now() : 0
    if (state.remainingMs <= 0) {
      completePhase()
    } else {
      broadcast?.({ ...state })
    }
  }, 1000)
}

function phaseMinutes(status: Extract<TimerStatus, 'focus' | 'break' | 'long_break'>): number {
  if (status === 'focus') return readNumberSetting(SETTING_KEYS.pomodoroFocus, 25)
  if (status === 'break') return readNumberSetting(SETTING_KEYS.pomodoroBreak, 5)
  return readNumberSetting(SETTING_KEYS.pomodoroLongBreak, 15)
}

function startPhase(status: Extract<TimerStatus, 'focus' | 'break' | 'long_break'>): void {
  const minutes = phaseMinutes(status)
  const nowIso = new Date().toISOString()

  if (status === 'focus') {
    const db = getDb()
    const inserted = db
      .insert(sessions)
      .values({
        taskId: state.taskId,
        subjectId: state.subjectId,
        startedAt: nowIso,
        endedAt: null,
        plannedMinutes: minutes,
        actualMinutes: null,
        status: 'running',
        createdAt: nowIso,
        updatedAt: nowIso
      })
      .returning()
      .all()
    currentSessionId = inserted[0]?.id ?? null
  } else {
    currentSessionId = null
  }

  state = {
    ...state,
    status,
    startedAt: nowIso,
    endsAt: new Date(Date.now() + minutes * 60_000).toISOString(),
    paused: false,
    remainingMs: minutes * 60_000,
    plannedMinutes: minutes
  }
  broadcast?.({ ...state })
}

function finishSession(status: 'completed' | 'abandoned', actualMinutes: number): void {
  if (currentSessionId == null) return
  getDb()
    .update(sessions)
    .set({
      endedAt: new Date().toISOString(),
      actualMinutes,
      status,
      updatedAt: new Date().toISOString()
    })
    .where(eq(sessions.id, currentSessionId))
    .run()
  currentSessionId = null
}

function completePhase(): void {
  if (state.status === 'focus') {
    finishSession('completed', state.plannedMinutes)
    state.pomodoros += 1
    notify('专注完成!', `本轮 ${state.plannedMinutes} 分钟专注结束,休息一下~`)
    const isLong = state.pomodoros % readNumberSetting(SETTING_KEYS.pomodoroLongEvery, 4) === 0
    startPhase(isLong ? 'long_break' : 'break')
  } else {
    notify('休息结束', '已自动开始下一个番茄钟,继续加油!')
    startPhase('focus')
  }
}

function notify(title: string, body: string): void {
  try {
    new Notification({ title: `考研工作台 · ${title}`, body, silent: false }).show()
  } catch (err) {
    console.error('[timer] 通知失败', err)
  }
}

export function startFocus(input: { taskId: number | null; subjectId: number | null }): TimerState {
  if (state.status !== 'idle') {
    throw new Error('已有计时在进行中')
  }
  let taskTitle: string | null = null
  if (input.taskId != null) {
    const rows = getDb()
      .select({ title: tasks.title })
      .from(tasks)
      .where(eq(tasks.id, Number(input.taskId)))
      .all()
    taskTitle = rows[0]?.title ?? null
  }
  state = {
    ...state,
    taskId: input.taskId ?? null,
    subjectId: input.subjectId ?? null,
    taskTitle
  }
  startPhase('focus')
  return { ...state }
}

export function pause(): TimerState {
  if (state.status === 'idle' || state.paused) return { ...state }
  state = {
    ...state,
    paused: true,
    remainingMs: Math.max(0, new Date(state.endsAt ?? Date.now()).getTime() - Date.now())
  }
  broadcast?.({ ...state })
  return { ...state }
}

export function resume(): TimerState {
  if (state.status === 'idle' || !state.paused) return { ...state }
  state = {
    ...state,
    paused: false,
    endsAt: new Date(Date.now() + state.remainingMs).toISOString()
  }
  broadcast?.({ ...state })
  return { ...state }
}

/** 专注中=放弃并按实际时长落账;休息中=跳过休息直接开始下个番茄 */
export function cancel(): TimerState {
  if (state.status === 'idle') return { ...state }
  if (state.status === 'focus') {
    const remainingMs = state.paused
      ? state.remainingMs
      : Math.max(0, new Date(state.endsAt ?? Date.now()).getTime() - Date.now())
    const elapsedSec = (state.plannedMinutes * 60_000 - remainingMs) / 1000
    const actualMinutes = Math.floor(elapsedSec / 60)
    finishSession('abandoned', actualMinutes)
    state = {
      ...state,
      status: 'idle',
      endsAt: null,
      startedAt: null,
      paused: false,
      remainingMs: 0
    }
    broadcast?.({ ...state })
    return { ...state }
  }
  startPhase('focus')
  return { ...state }
}

export { completedPomodorosToday }
