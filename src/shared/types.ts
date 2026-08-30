export interface Subject {
  id: number
  name: string
  color: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type SettingsMap = Record<string, string>

export interface AppInfo {
  dbPath: string
  version: string
}

export interface SubjectInput {
  name: string
  color: string
}

export interface SubjectUpdate {
  id: number
  name?: string
  color?: string
}

/** 重复规则:'daily' 或 'weekdays:0,3'(数字为星期几,0=周日) */
export type RepeatRule = string

export interface Task {
  id: number
  subjectId: number | null
  title: string
  date: string
  estimatedMinutes: number | null
  priority: number
  status: 'todo' | 'done'
  repeatRule: RepeatRule | null
  repeatOf: number | null
  note: string | null
  createdAt: string
  updatedAt: string
}

export interface TaskWithSubject extends Task {
  subjectName: string | null
  subjectColor: string | null
}

export interface TaskInput {
  subjectId: number | null
  title: string
  date: string
  estimatedMinutes?: number | null
  repeatRule?: RepeatRule | null
  note?: string | null
}

export interface TaskUpdate {
  id: number
  subjectId?: number | null
  title?: string
  date?: string
  estimatedMinutes?: number | null
  status?: 'todo' | 'done'
  note?: string | null
}

export interface Phase {
  id: string
  name: string
  start: string
  end: string
}

export type TimerStatus = 'idle' | 'focus' | 'break' | 'long_break'

export interface TimerState {
  status: TimerStatus
  taskId: number | null
  subjectId: number | null
  taskTitle: string | null
  startedAt: string | null
  endsAt: string | null
  paused: boolean
  remainingMs: number
  plannedMinutes: number
  /** 今日已完成的专注番茄数 */
  pomodoros: number
}

export interface SessionRow {
  id: number
  taskId: number | null
  subjectId: number | null
  startedAt: string
  endedAt: string | null
  plannedMinutes: number
  actualMinutes: number | null
  status: string
  subjectName: string | null
  subjectColor: string | null
  taskTitle: string | null
}

export interface TodayFocus {
  minutes: number
  pomodoros: number
  recent: SessionRow[]
}

export interface CalendarDay {
  date: string
  minutes: number
  pomodoros: number
}

export interface TimerStartInput {
  taskId: number | null
  subjectId: number | null
}

export type ReviewResult = 'remember' | 'fuzzy' | 'forgot'

export interface ReviewItem {
  id: number
  sourceType: 'note' | 'mistake' | null
  sourceId: number | null
  title: string
  content: string | null
  intervalIndex: number
  nextDueDate: string
  createdAt: string
  updatedAt: string
}

export interface ReviewInput {
  title: string
  content?: string | null
}

export interface ReviewStats {
  total: number
  due: number
  reviewedToday: number
}

export const SETTING_KEYS = {
  examDate: 'exam_date',
  pomodoroFocus: 'pomodoro_focus_min',
  pomodoroBreak: 'pomodoro_break_min',
  pomodoroLongBreak: 'pomodoro_long_break_min',
  pomodoroLongEvery: 'pomodoro_long_every',
  reviewIntervals: 'review_intervals',
  phasePlan: 'phase_plan'
} as const

export const DEFAULT_PHASES: Phase[] = [
  { id: 'basic', name: '基础阶段', start: '2026-03-01', end: '2026-07-31' },
  { id: 'strengthen', name: '强化阶段', start: '2026-08-01', end: '2026-10-31' },
  { id: 'sprint', name: '冲刺阶段', start: '2026-11-01', end: '2026-12-25' }
]

/** 首次启动时写入的默认设置 */
export const DEFAULT_SETTINGS: Record<string, string> = {
  [SETTING_KEYS.examDate]: '2026-12-26',
  [SETTING_KEYS.pomodoroFocus]: '25',
  [SETTING_KEYS.pomodoroBreak]: '5',
  [SETTING_KEYS.pomodoroLongBreak]: '15',
  [SETTING_KEYS.pomodoroLongEvery]: '4',
  [SETTING_KEYS.reviewIntervals]: '1,2,4,7,15,30',
  [SETTING_KEYS.phasePlan]: JSON.stringify(DEFAULT_PHASES)
}
