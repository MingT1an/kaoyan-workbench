import { useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, Square } from 'lucide-react'
import type {
  CalendarDay,
  Subject,
  SettingsMap,
  TaskWithSubject,
  TimerState,
  TodayFocus
} from '../../../shared/types'

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

function todayStr(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function fmtClock(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000))
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0')
  const ss = String(totalSec % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 打卡热力等级:0 无 / 1 <30min / 2 <60min / 3 <120min / 4 ≥120min */
function heatLevel(minutes: number): number {
  if (minutes <= 0) return 0
  if (minutes < 30) return 1
  if (minutes < 60) return 2
  if (minutes < 120) return 3
  return 4
}

const LEVEL_CLASS = ['bg-slate-100', 'bg-indigo-100', 'bg-indigo-200', 'bg-indigo-400', 'bg-indigo-600']

const RADIUS = 96
const CIRC = 2 * Math.PI * RADIUS

export default function PomodoroPage() {
  const [settings, setSettings] = useState<SettingsMap | null>(null)
  const [tasks, setTasks] = useState<TaskWithSubject[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [timer, setTimer] = useState<TimerState | null>(null)
  const [focus, setFocus] = useState<TodayFocus | null>(null)
  const [cal, setCal] = useState<CalendarDay[]>([])
  const [selection, setSelection] = useState('')
  const lastPomodoros = useRef(0)

  useEffect(() => {
    window.api.settings.all().then(setSettings).catch(() => {})
    window.api.subjects.list().then(setSubjects).catch(() => {})
    window.api.sessions.today().then(setFocus).catch(() => {})
    window.api.sessions.calendar().then(setCal).catch(() => {})
    window.api.tasks.listByDate(todayStr()).then((list) => {
      setTasks(list)
      const first = list.find((t) => t.status !== 'done')
      setSelection((prev) => prev || (first ? `t${first.id}` : `s${list[0]?.subjectId ?? ''}`))
    }).catch(() => {})
    window.api.timer.getState().then(setTimer).catch(() => {})
    const off = window.api.onTimerChanged((state) => {
      setTimer(state)
      if (state.pomodoros !== lastPomodoros.current) {
        lastPomodoros.current = state.pomodoros
        window.api.sessions.today().then(setFocus).catch(() => {})
        window.api.sessions.calendar().then(setCal).catch(() => {})
      }
    })
    return off
  }, [])

  const unfinished = tasks.filter((t) => t.status !== 'done')
  const finished = tasks.filter((t) => t.status === 'done')

  function startSelection(): void {
    if (selection.startsWith('t')) {
      const id = Number(selection.slice(1))
      const task = tasks.find((t) => t.id === id)
      window.api.timer
        .start({ taskId: id, subjectId: task?.subjectId ?? null })
        .then(setTimer)
        .catch((err) => console.error(err))
    } else if (selection.startsWith('s')) {
      const id = Number(selection.slice(1))
      window.api.timer
        .start({ taskId: null, subjectId: Number.isFinite(id) ? id : null })
        .then(setTimer)
        .catch((err) => console.error(err))
    }
  }

  const status = timer?.status ?? 'idle'
  const plannedMs = (timer?.plannedMinutes ?? 0) * 60_000
  const elapsedMs = timer
    ? status === 'idle'
      ? 0
      : Math.min(plannedMs, plannedMs - (timer.paused ? timer.remainingMs : timer.remainingMs))
    : 0
  const progress = plannedMs > 0 ? elapsedMs / plannedMs : 0
  const statusLabel =
    status === 'focus' ? '专注中' : status === 'break' ? '短休息' : status === 'long_break' ? '长休息' : ''
  const params = settings
    ? `专注 ${settings['pomodoro_focus_min']} 分钟 · 休息 ${settings['pomodoro_break_min']} 分钟 · 每 ${settings['pomodoro_long_every']} 轮长休 ${settings['pomodoro_long_break_min']} 分钟`
    : ''

  const calendarWeeks = useMemo(() => {
    if (cal.length === 0) return []
    const byDate = new Map(cal.map((d) => [d.date, d]))
    const start = new Date(`${cal[0].date}T00:00:00`)
    start.setDate(start.getDate() - start.getDay()) // 对齐到周日
    const weeks: Array<Array<CalendarDay | null>> = []
    const cursor = new Date(start)
    while (cursor <= new Date()) {
      const week: Array<CalendarDay | null> = []
      for (let i = 0; i < 7; i++) {
        const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
        week.push(byDate.get(key) ?? null)
        cursor.setDate(cursor.getDate() + 1)
      }
      weeks.push(week)
    }
    return weeks
  }, [cal])

  return (
    <div className="mx-auto max-w-5xl px-10 py-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">番茄钟</h1>
        <p className="mt-1 text-sm text-slate-500">{params || '参数可在设置中调整'}</p>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* 计时器 */}
        <section className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-8 lg:col-span-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              status === 'focus'
                ? 'bg-indigo-50 text-indigo-600'
                : status === 'idle'
                  ? 'bg-slate-100 text-slate-500'
                  : 'bg-emerald-50 text-emerald-600'
            }`}
          >
            {statusLabel || '准备开始'}
          </span>

          <div className="relative mt-5">
            <svg width="230" height="230" viewBox="0 0 230 230" className="-rotate-90">
              <circle cx="115" cy="115" r={RADIUS} fill="none" stroke="#f1f5f9" strokeWidth="12" />
              <circle
                cx="115"
                cy="115"
                r={RADIUS}
                fill="none"
                stroke={status === 'break' || status === 'long_break' ? '#10b981' : '#6366f1'}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC * (1 - progress)}
                className="transition-[stroke-dashoffset] duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-bold tabular-nums text-slate-900">
                {status === 'idle'
                  ? fmtClock((Number(settings?.['pomodoro_focus_min'] ?? 25)) * 60_000)
                  : fmtClock(timer?.remainingMs ?? 0)}
              </span>
              {timer?.taskTitle && (
                <span className="mt-2 max-w-40 truncate text-xs text-slate-400" title={timer.taskTitle}>
                  {timer.taskTitle}
                </span>
              )}
            </div>
          </div>

          <div className="mt-6 h-10">
            {status === 'idle' ? (
              <div className="flex items-center gap-2">
                <select
                  value={selection}
                  onChange={(e) => setSelection(e.target.value)}
                  className="w-56 rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                >
                  {unfinished.length > 0 && (
                    <optgroup label="今日任务">
                      {unfinished.map((t) => (
                        <option key={t.id} value={`t${t.id}`}>
                          {t.title}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {finished.length > 0 && (
                    <optgroup label="已完成任务">
                      {finished.map((t) => (
                        <option key={t.id} value={`t${t.id}`}>
                          {t.title}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="自由专注(仅记科目)">
                    {subjects.map((s) => (
                      <option key={s.id} value={`s${s.id}`}>
                        {s.name} · 自由专注
                      </option>
                    ))}
                  </optgroup>
                </select>
                <button
                  onClick={startSelection}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500"
                >
                  <Play size={16} />
                  开始专注
                </button>
              </div>
            ) : status === 'focus' && timer?.paused ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.api.timer.resume().then(setTimer)}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500"
                >
                  <Play size={16} />
                  继续
                </button>
                <button
                  onClick={() => window.api.timer.cancel().then(setTimer)}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-5 py-2.5 text-sm text-slate-500 transition hover:bg-slate-50"
                >
                  <Square size={14} />
                  放弃
                </button>
              </div>
            ) : status === 'focus' ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.api.timer.pause().then(setTimer)}
                  className="flex items-center gap-2 rounded-lg bg-slate-800 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
                >
                  <Pause size={16} />
                  暂停
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('确定放弃本轮专注吗?已专注的时长仍会记录。'))
                      window.api.timer.cancel().then(setTimer)
                  }}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-5 py-2.5 text-sm text-slate-500 transition hover:bg-slate-50"
                >
                  <Square size={14} />
                  放弃
                </button>
              </div>
            ) : (
              <button
                onClick={() => window.api.timer.cancel().then(setTimer)}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500"
              >
                <Play size={16} />
                跳过休息
              </button>
            )}
          </div>

          <p className="mt-4 text-xs text-slate-400">
            关闭窗口后会最小化到系统托盘,计时继续;结束时会弹出系统通知
          </p>
        </section>

        {/* 统计侧栏 */}
        <section className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-slate-700">今日专注</h3>
            <div className="mt-3 flex items-end gap-6">
              <div>
                <p className="text-3xl font-bold text-slate-900">{focus?.pomodoros ?? 0}</p>
                <p className="mt-0.5 text-xs text-slate-400">完成番茄</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{focus?.minutes ?? 0}</p>
                <p className="mt-0.5 text-xs text-slate-400">累计分钟</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-slate-700">打卡日历</h3>
            <div className="mt-3 flex gap-2">
              <div className="grid grid-rows-7 gap-1 pt-0.5">
                {WEEKDAY_LABELS.map((label, i) => (
                  <span key={i} className="h-3.5 text-[9px] leading-3.5 text-slate-300">
                    {i % 2 === 1 ? label : ''}
                  </span>
                ))}
              </div>
              <div className="grid flex-1 grid-flow-col grid-rows-7 gap-1">
                {calendarWeeks.map((week, wi) =>
                  week.map((day, di) => (
                    <span
                      key={`${wi}-${di}`}
                      title={
                        day ? `${day.date} · ${day.minutes} 分钟 / ${day.pomodoros} 番茄` : ''
                      }
                      className={`h-3.5 w-3.5 rounded-sm ${
                        day ? LEVEL_CLASS[heatLevel(day.minutes)] : 'bg-slate-50'
                      }`}
                    />
                  ))
                )}
              </div>
            </div>
            <p className="mt-2 text-[10px] text-slate-300">最近 12 周 · 颜色越深专注越久</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-slate-700">最近专注</h3>
            <ul className="mt-3 space-y-2.5">
              {(focus?.recent ?? []).map((s) => (
                <li key={s.id} className="flex items-center gap-2.5 text-xs">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: s.subjectColor ?? '#cbd5e1' }}
                  />
                  <span className="w-24 shrink-0 text-slate-400">
                    {fmtTime(s.startedAt)}
                    {s.endedAt ? ` - ${fmtTime(s.endedAt)}` : ''}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-slate-600">
                    {s.taskTitle ?? s.subjectName ?? '自由专注'}
                  </span>
                  <span className="shrink-0 font-medium text-slate-500">
                    {s.actualMinutes ?? 0} 分钟
                  </span>
                  {s.status === 'abandoned' && (
                    <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-400">
                      放弃
                    </span>
                  )}
                </li>
              ))}
              {(focus?.recent ?? []).length === 0 && (
                <li className="py-2 text-center text-xs text-slate-400">还没有专注记录</li>
              )}
            </ul>
          </div>
        </section>
      </div>
    </div>
  )
}
