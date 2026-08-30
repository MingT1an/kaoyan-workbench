import { createContext, useContext } from 'react'
import type { Settings, Subject, TimerState } from '@shared/types'

export type PageId = 'today' | 'plan' | 'focus' | 'mistakes' | 'review' | 'stats' | 'settings'

export interface Meta {
  settings: Settings
  subjects: Subject[]
  reloadMeta: () => Promise<void>
  page: PageId
  setPage: (p: PageId) => void
  timer: TimerState | null
  dueCount: number
  refreshDue: () => Promise<void>
}

export const MetaContext = createContext<Meta | null>(null)

export function useMeta(): Meta {
  const ctx = useContext(MetaContext)
  if (!ctx) throw new Error('MetaContext 未初始化')
  return ctx
}
