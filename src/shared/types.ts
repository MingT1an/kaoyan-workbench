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

export const SETTING_KEYS = {
  examDate: 'exam_date',
  pomodoroFocus: 'pomodoro_focus_min',
  pomodoroBreak: 'pomodoro_break_min',
  pomodoroLongBreak: 'pomodoro_long_break_min',
  pomodoroLongEvery: 'pomodoro_long_every',
  reviewIntervals: 'review_intervals'
} as const

/** 首次启动时写入的默认设置 */
export const DEFAULT_SETTINGS: Record<string, string> = {
  [SETTING_KEYS.examDate]: '2026-12-26',
  [SETTING_KEYS.pomodoroFocus]: '25',
  [SETTING_KEYS.pomodoroBreak]: '5',
  [SETTING_KEYS.pomodoroLongBreak]: '15',
  [SETTING_KEYS.pomodoroLongEvery]: '4',
  [SETTING_KEYS.reviewIntervals]: '1,2,4,7,15,30'
}
