import { contextBridge, ipcRenderer } from 'electron'
import type {
  AppInfo,
  CalendarDay,
  Mastery,
  Mistake,
  MistakeInput,
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

export interface SubjectMinutes {
  name: string
  color: string
  minutes: number
}

export interface DayMinutes {
  date: string
  minutes: number
}

export interface WeekStats {
  done: number
  total: number
}

export interface Overview {
  totalMinutes: number
  totalPomodoros: number
  mistakeCount: number
  reviewCount: number
  reviewReviewed: number
}

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
  stats: {
    overview: (): Promise<Overview> => ipcRenderer.invoke('stats:overview'),
    bySubject: (): Promise<SubjectMinutes[]> => ipcRenderer.invoke('stats:bySubject'),
    dailyMinutes: (): Promise<DayMinutes[]> => ipcRenderer.invoke('stats:dailyMinutes'),
    weekTasks: (): Promise<WeekStats> => ipcRenderer.invoke('tasks:weekStats')
  },
  data: {
    export: (): Promise<string | null> => ipcRenderer.invoke('data:export'),
    backupsDir: (): Promise<string> => ipcRenderer.invoke('data:backupsDir')
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
  mistakes: {
    list: (filter: { subjectId?: number | null; mastery?: Mastery | null }): Promise<Mistake[]> =>
      ipcRenderer.invoke('mistakes:list', filter),
    create: (input: MistakeInput): Promise<Mistake> => ipcRenderer.invoke('mistakes:create', input),
    setMastery: (id: number, mastery: Mastery): Promise<Mistake> =>
      ipcRenderer.invoke('mistakes:update', id, { mastery }),
    remove: (id: number): Promise<void> => ipcRenderer.invoke('mistakes:remove', id),
    linkReview: (id: number): Promise<void> => ipcRenderer.invoke('mistakes:linkReview', id),
    saveImage: (dataUrl: string): Promise<string> => ipcRenderer.invoke('mistakes:saveImage', dataUrl),
    image: (file: string): Promise<string> => ipcRenderer.invoke('mistakes:image', file)
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
