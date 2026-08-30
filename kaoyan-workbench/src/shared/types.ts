export interface Subject {
  id: string
  name: string
  color: string
  order: number
}

export interface Phase {
  id: string
  name: string
  start: string
  end: string
}

export type RepeatRule = 'daily' | 'weekdays' | null

export interface Task {
  id: string
  title: string
  subjectId: string | null
  date: string
  estimatedMinutes: number | null
  repeatRule: RepeatRule
  repeatOf: string | null
  status: 'todo' | 'done'
  note: string | null
  createdAt: string
}

export interface TaskInput {
  title: string
  subjectId: string | null
  date: string
  estimatedMinutes?: number | null
  repeatRule?: RepeatRule
  note?: string | null
}

export interface TaskUpdate {
  id: string
  title?: string
  subjectId?: string | null
  date?: string
  estimatedMinutes?: number | null
  repeatRule?: RepeatRule
  status?: 'todo' | 'done'
  note?: string | null
}

export type TimerStatus = 'idle' | 'focus' | 'break' | 'long_break'

export interface TimerState {
  status: TimerStatus
  paused: boolean
  subjectId: string | null
  taskId: string | null
  taskTitle: string | null
  startedAt: string | null
  /** 运行中(未暂停)的预计结束时间 ISO;其余情况为 null */
  endsAt: string | null
  /** 暂停时的剩余毫秒;运行中由 endsAt 计算;空闲为 0 */
  remainingMs: number
  plannedMinutes: number
  pomodorosToday: number
}

export interface TimerStartInput {
  subjectId: string | null
  taskId: string | null
  taskTitle?: string | null
}

export type SessionMode = 'focus'
export type SessionStatus = 'completed' | 'stopped'

export interface FocusSession {
  id: string
  date: string
  subjectId: string | null
  taskId: string | null
  taskTitle: string | null
  startedAt: string
  endedAt: string
  plannedMinutes: number
  actualSeconds: number
  status: SessionStatus
  mode: SessionMode
}

export interface TodayFocus {
  minutes: number
  pomodoros: number
  recent: FocusSession[]
}

export type Mastery = 'unknown' | 'fuzzy' | 'mastered'

export interface Mistake {
  id: string
  subjectId: string | null
  chapter: string | null
  question: string
  wrongReason: string | null
  solution: string | null
  images: string[]
  mastery: Mastery
  inReview: boolean
  createdAt: string
}

export interface MistakeInput {
  subjectId: string | null
  chapter: string | null
  question: string
  wrongReason: string | null
  solution: string | null
  images: string[]
  mastery: Mastery
  inReview: boolean
}

export interface MistakeUpdate {
  id: string
  subjectId?: string | null
  chapter?: string | null
  question?: string
  wrongReason?: string | null
  solution?: string | null
  images?: string[]
  mastery?: Mastery
  inReview?: boolean
}

export type ReviewResult = 'remember' | 'fuzzy' | 'forgot'

export interface ReviewCard {
  id: string
  sourceType: 'mistake' | 'manual'
  sourceId: string | null
  subjectId: string | null
  title: string
  content: string | null
  intervalIndex: number
  nextDue: string
  lastResult: ReviewResult | null
  lastReviewedAt: string | null
  createdAt: string
}

export interface CardInput {
  title: string
  content: string | null
  subjectId: string | null
}

export interface CardsBoard {
  due: ReviewCard[]
  upcoming: ReviewCard[]
  total: number
  reviewedToday: number
}

export type StatsRange = 'week' | 'month' | 'all'

export interface StatsOverview {
  todayMinutes: number
  weekMinutes: number
  totalMinutes: number
  todayPomodoros: number
  totalPomodoros: number
  streak: number
  series14: { date: string; minutes: number }[]
  bySubject: { subjectId: string | null; name: string; color: string; minutes: number }[]
  tasksToday: { total: number; done: number }
  dueCards: number
}

export interface Settings {
  examDate: string
  phases: Phase[]
  focusMinutes: number
  breakMinutes: number
  longBreakMinutes: number
  longBreakEvery: number
  dailyGoalPomodoros: number
  reviewIntervals: number[]
  closeToTray: boolean
  autoStartBreak: boolean
}

export interface BackupExportResult {
  canceled?: boolean
  path?: string
}

export interface BackupImportResult {
  canceled?: boolean
  tasks?: number
  sessions?: number
  mistakes?: number
  cards?: number
}

export interface BackupInfo {
  dataFile: string
  imagesDir: string
}
