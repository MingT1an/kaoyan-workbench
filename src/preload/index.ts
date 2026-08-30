import { contextBridge, ipcRenderer } from 'electron'
import type {
  AppInfo,
  CalendarDay,
  ReviewInput,
  ReviewItem,
  ReviewResult,
  ReviewStats,
  SettingsMap,
  Subject,
  SubjectInput,
  SubjectUpdate,
  Task,
  TaskInput,
  TaskUpdate,
  TaskWithSubject,
  TimerStartInput,
  TimerState,
  TodayFocus
} from '../shared/types'

const api = {
  subjects: {
    list: (): Promise<Subject[]> => ipcRenderer.invoke('subjects:list'),
    create: (input: SubjectInput): Promise<Subject> => ipcRenderer.invoke('subjects:create', input),
    update: (input: SubjectUpdate): Promise<Subject> => ipcRenderer.invoke('subjects:update', input),
    remove: (id: number): Promise<void> => ipcRenderer.invoke('subjects:remove', id)
  },
  tasks: {
    listByDate: (date: string): Promise<TaskWithSubject[]> =>
      ipcRenderer.invoke('tasks:listByDate', date),
    templates: (): Promise<TaskWithSubject[]> => ipcRenderer.invoke('tasks:templates'),
    create: (input: TaskInput): Promise<Task> => ipcRenderer.invoke('tasks:create', input),
    update: (input: TaskUpdate): Promise<Task> => ipcRenderer.invoke('tasks:update', input),
    toggle: (id: number): Promise<Task> => ipcRenderer.invoke('tasks:toggle', id),
    remove: (id: number): Promise<void> => ipcRenderer.invoke('tasks:remove', id)
  },
  timer: {
    getState: (): Promise<TimerState> => ipcRenderer.invoke('timer:getState'),
    start: (input: TimerStartInput): Promise<TimerState> =>
      ipcRenderer.invoke('timer:start', input),
    pause: (): Promise<TimerState> => ipcRenderer.invoke('timer:pause'),
    resume: (): Promise<TimerState> => ipcRenderer.invoke('timer:resume'),
    cancel: (): Promise<TimerState> => ipcRenderer.invoke('timer:cancel')
  },
  sessions: {
    today: (): Promise<TodayFocus> => ipcRenderer.invoke('sessions:today'),
    calendar: (): Promise<CalendarDay[]> => ipcRenderer.invoke('sessions:calendar')
  },
  review: {
    due: (): Promise<ReviewItem[]> => ipcRenderer.invoke('review:due'),
    upcoming: (): Promise<ReviewItem[]> => ipcRenderer.invoke('review:upcoming'),
    all: (): Promise<ReviewItem[]> => ipcRenderer.invoke('review:all'),
    stats: (): Promise<ReviewStats> => ipcRenderer.invoke('review:stats'),
    create: (input: ReviewInput): Promise<ReviewItem> =>
      ipcRenderer.invoke('review:create', input),
    grade: (id: number, result: ReviewResult): Promise<ReviewItem> =>
      ipcRenderer.invoke('review:grade', id, result),
    remove: (id: number): Promise<void> => ipcRenderer.invoke('review:remove', id)
  },
  onTimerChanged: (callback: (state: TimerState) => void): (() => void) => {
    const listener = (_event: unknown, state: TimerState): void => callback(state)
    ipcRenderer.on('timer:changed', listener)
    return () => {
      ipcRenderer.removeListener('timer:changed', listener)
    }
  },
  settings: {
    all: (): Promise<SettingsMap> => ipcRenderer.invoke('settings:all'),
    set: (key: string, value: string): Promise<void> =>
      ipcRenderer.invoke('settings:set', { key, value })
  },
  app: {
    info: (): Promise<AppInfo> => ipcRenderer.invoke('app:info')
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
