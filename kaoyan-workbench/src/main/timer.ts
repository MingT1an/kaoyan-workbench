import { randomUUID } from 'node:crypto'
import type { FocusSession, TimerStartInput, TimerState, TimerStatus } from '../shared/types'
import { todayStr } from '../shared/util'
import { getData, update } from './store'

interface TimerOptions {
  notify: (body: string) => void
}

/**
 * 番茄状态机,运行在主进程:窗口关闭进托盘后计时照常,结束弹系统通知。
 * 状态变化只通过 onChange 事件对外广播,渲染层根据 endsAt/remainingMs 本地推进秒针。
 */
export class PomodoroTimer {
  private status: TimerStatus = 'idle'
  private paused = false
  private subjectId: string | null = null
  private taskId: string | null = null
  private taskTitle: string | null = null
  private startedAt: string | null = null
  private endAtMs = 0
  private remainingMs = 0
  private plannedMinutes = 0
  private interval: NodeJS.Timeout | null = null
  private listeners = new Set<(s: TimerState) => void>()
  private notifyFn: (body: string) => void

  constructor(options: TimerOptions) {
    this.notifyFn = options.notify
    this.interval = setInterval(() => this.check(), 500)
  }

  onChange(fn: (s: TimerState) => void): () => void {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  private emit(): void {
    const state = this.getState()
    this.listeners.forEach(fn => fn(state))
  }

  private isRunning(): boolean {
    return this.status === 'focus' || this.status === 'break' || this.status === 'long_break'
  }

  private completedToday(): number {
    const today = todayStr()
    return getData().sessions.filter(
      s => s.date === today && s.status === 'completed' && s.mode === 'focus'
    ).length
  }

  getState(): TimerState {
    const running = this.isRunning()
    const now = Date.now()
    return {
      status: this.status,
      paused: this.paused,
      subjectId: this.subjectId,
      taskId: this.taskId,
      taskTitle: this.taskTitle,
      startedAt: this.startedAt,
      endsAt: running && !this.paused ? new Date(this.endAtMs).toISOString() : null,
      remainingMs: running
        ? this.paused
          ? this.remainingMs
          : Math.max(0, this.endAtMs - now)
        : 0,
      plannedMinutes: this.plannedMinutes,
      pomodorosToday: this.completedToday()
    }
  }

  private accumSec(): number {
    if (this.status !== 'focus') return 0
    const plannedMs = this.plannedMinutes * 60_000
    const remain = this.paused ? this.remainingMs : Math.max(0, this.endAtMs - Date.now())
    return Math.max(0, Math.floor((plannedMs - remain) / 1000))
  }

  /** 记录专注会话;提前结束且不足 1 分钟的不入库 */
  private saveSession(status: 'completed' | 'stopped'): void {
    if (this.status !== 'focus') return
    const actualSeconds =
      status === 'completed' ? this.plannedMinutes * 60 : this.accumSec()
    if (status === 'stopped' && actualSeconds < 60) return
    const session: FocusSession = {
      id: randomUUID(),
      date: todayStr(),
      subjectId: this.subjectId,
      taskId: this.taskId,
      taskTitle: this.taskTitle,
      startedAt: this.startedAt ?? new Date().toISOString(),
      endedAt: new Date().toISOString(),
      plannedMinutes: this.plannedMinutes,
      actualSeconds,
      status,
      mode: 'focus'
    }
    update(db => {
      db.sessions.push(session)
    })
  }

  private toIdle(): void {
    this.status = 'idle'
    this.paused = false
    this.subjectId = null
    this.taskId = null
    this.taskTitle = null
    this.startedAt = null
    this.plannedMinutes = 0
    this.endAtMs = 0
    this.remainingMs = 0
  }

  start(input: TimerStartInput): void {
    if (this.status === 'focus') this.saveSession('stopped')
    const settings = getData().settings
    this.status = 'focus'
    this.paused = false
    this.subjectId = input.subjectId ?? null
    this.taskId = input.taskId ?? null
    this.taskTitle = input.taskTitle ?? null
    this.startedAt = new Date().toISOString()
    this.plannedMinutes = settings.focusMinutes
    this.endAtMs = Date.now() + settings.focusMinutes * 60_000
    this.remainingMs = 0
    this.emit()
  }

  pause(): void {
    if (this.isRunning() && !this.paused) {
      this.remainingMs = Math.max(0, this.endAtMs - Date.now())
      this.paused = true
      this.emit()
    }
  }

  resume(): void {
    if (this.isRunning() && this.paused) {
      this.endAtMs = Date.now() + this.remainingMs
      this.paused = false
      this.emit()
    }
  }

  /** 专注中=提前结束并入库;休息中=跳过 */
  stop(): void {
    if (this.status === 'focus') {
      this.saveSession('stopped')
      this.toIdle()
    } else if (this.status === 'break' || this.status === 'long_break') {
      this.toIdle()
    }
    this.emit()
  }

  private check(): void {
    if (!this.isRunning() || this.paused) return
    if (Date.now() < this.endAtMs) return

    if (this.status === 'focus') {
      this.saveSession('completed')
      const settings = getData().settings
      const done = this.completedToday()
      const isLong = settings.longBreakEvery > 0 && done % settings.longBreakEvery === 0
      this.notifyFn(isLong ? `完成一个番茄,来个 ${settings.longBreakMinutes} 分钟长休息吧` : '完成一个番茄,休息一下')
      if (settings.autoStartBreak) {
        this.status = isLong ? 'long_break' : 'break'
        this.paused = false
        this.startedAt = new Date().toISOString()
        this.plannedMinutes = isLong ? settings.longBreakMinutes : settings.breakMinutes
        this.endAtMs = Date.now() + this.plannedMinutes * 60_000
      } else {
        this.toIdle()
      }
    } else {
      this.notifyFn('休息结束,开始下一个番茄吧')
      this.toIdle()
    }
    this.emit()
  }

  destroy(): void {
    if (this.interval) clearInterval(this.interval)
    this.interval = null
  }
}
