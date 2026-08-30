import { contextBridge, ipcRenderer } from 'electron'
import type {
  BackupExportResult,
  BackupImportResult,
  BackupInfo,
  CardInput,
  CardsBoard,
  FocusSession,
  Mistake,
  MistakeInput,
  MistakeUpdate,
  ReviewCard,
  ReviewResult,
  Settings,
  StatsOverview,
  StatsRange,
  Subject,
  Task,
  TaskInput,
  TaskUpdate,
  TimerStartInput,
  TimerState,
  TodayFocus
} from '../shared/types'

function invoke<T>(channel: string, payload?: unknown): Promise<T> {
  return ipcRenderer.invoke(channel, payload) as Promise<T>
}

const api = {
  settings: {
    get: () => invoke<Settings>('settings:get'),
    set: (patch: Partial<Settings>) => invoke<Settings>('settings:set', patch)
  },
  subjects: {
    list: () => invoke<Subject[]>('subjects:list'),
    add: (input: { name: string; color: string }) => invoke<Subject[]>('subjects:add', input),
    update: (subject: Subject) => invoke<Subject[]>('subjects:update', subject),
    remove: (id: string) => invoke<Subject[]>('subjects:remove', id)
  },
  tasks: {
    list: (date: string) => invoke<Task[]>('tasks:list', { date }),
    overdue: (today: string) => invoke<Task[]>('tasks:overdue', { today }),
    add: (input: TaskInput) => invoke<Task>('tasks:add', input),
    update: (patch: TaskUpdate) => invoke<Task | null>('tasks:update', patch),
    remove: (id: string) => invoke<void>('tasks:remove', { id })
  },
  focus: {
    state: () => invoke<TimerState>('focus:state'),
    today: () => invoke<TodayFocus>('focus:today'),
    start: (input: TimerStartInput) => invoke<TimerState>('focus:start', input),
    pause: () => invoke<TimerState>('focus:pause'),
    resume: () => invoke<TimerState>('focus:resume'),
    stop: () => invoke<TimerState>('focus:stop')
  },
  mistakes: {
    list: () => invoke<Mistake[]>('mistakes:list'),
    add: (input: MistakeInput) => invoke<Mistake>('mistakes:add', input),
    update: (patch: MistakeUpdate) => invoke<Mistake | null>('mistakes:update', patch),
    remove: (id: string) => invoke<void>('mistakes:remove', { id }),
    saveImage: (dataUrl: string) => invoke<string>('mistakes:saveImage', { dataUrl })
  },
  cards: {
    board: () => invoke<CardsBoard>('cards:board'),
    add: (input: CardInput) => invoke<ReviewCard>('cards:add', input),
    review: (id: string, result: ReviewResult) => invoke<ReviewCard>('cards:review', { id, result }),
    remove: (id: string) => invoke<void>('cards:remove', { id })
  },
  stats: {
    overview: (range: StatsRange) => invoke<StatsOverview>('stats:overview', { range })
  },
  backup: {
    exportData: () => invoke<BackupExportResult>('backup:export'),
    importData: () => invoke<BackupImportResult>('backup:import'),
    openDataDir: () => invoke<void>('backup:openDir'),
    info: () => invoke<BackupInfo>('backup:info')
  },
  system: {
    ping: () => invoke<boolean>('app:ping')
  },
  onTimer: (cb: (state: TimerState) => void) => {
    const fn = (_e: unknown, state: TimerState) => cb(state)
    ipcRenderer.on('timer:changed', fn)
    return () => {
      ipcRenderer.removeListener('timer:changed', fn)
    }
  },
  onNavigate: (cb: (page: string) => void) => {
    const fn = (_e: unknown, page: string) => cb(page)
    ipcRenderer.on('app:navigate', fn)
    return () => {
      ipcRenderer.removeListener('app:navigate', fn)
    }
  },
  onDataChanged: (cb: () => void) => {
    const fn = () => cb()
    ipcRenderer.on('data:changed', fn)
    return () => {
      ipcRenderer.removeListener('data:changed', fn)
    }
  }
}

export type Api = typeof api
export type { FocusSession }

contextBridge.exposeInMainWorld('api', api)
