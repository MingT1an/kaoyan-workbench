import { useCallback, useEffect, useState } from 'react'
import { BarChart3, BookX, CalendarDays, Home, RefreshCcw, Settings as SettingsIcon, Timer } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Settings, Subject, TimerState } from '@shared/types'
import { daysBetween, todayStr } from '@shared/util'
import { MetaContext, type Meta, type PageId } from './ctx'
import { TodayPage } from './pages/TodayPage'
import { PlanPage } from './pages/PlanPage'
import { FocusPage } from './pages/FocusPage'
import { MistakesPage } from './pages/MistakesPage'
import { ReviewPage } from './pages/ReviewPage'
import { StatsPage } from './pages/StatsPage'
import { SettingsPage } from './pages/SettingsPage'

const NAV: { id: PageId; label: string; icon: LucideIcon }[] = [
  { id: 'today', label: '今日', icon: Home },
  { id: 'plan', label: '计划', icon: CalendarDays },
  { id: 'focus', label: '专注', icon: Timer },
  { id: 'mistakes', label: '错题本', icon: BookX },
  { id: 'review', label: '复习', icon: RefreshCcw },
  { id: 'stats', label: '统计', icon: BarChart3 },
  { id: 'settings', label: '设置', icon: SettingsIcon }
]

export default function App() {
  const [page, setPage] = useState<PageId>('today')
  const [settings, setSettings] = useState<Settings | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [timer, setTimer] = useState<TimerState | null>(null)
  const [dueCount, setDueCount] = useState(0)

  const reloadMeta = useCallback(async () => {
    const [s, subs] = await Promise.all([window.api.settings.get(), window.api.subjects.list()])
    setSettings(s)
    setSubjects(subs)
  }, [])

  const refreshDue = useCallback(async () => {
    const board = await window.api.cards.board()
    setDueCount(board.due.length)
  }, [])

  useEffect(() => {
    reloadMeta()
    refreshDue()
    window.api.focus.state().then(setTimer)
    const offTimer = window.api.onTimer(setTimer)
    const offNav = window.api.onNavigate(p => setPage(p as PageId))
    const offData = window.api.onDataChanged(() => {
      reloadMeta()
      refreshDue()
    })
    const t = setInterval(refreshDue, 60_000)
    return () => {
      offTimer()
      offNav()
      offData()
      clearInterval(t)
    }
  }, [reloadMeta, refreshDue])

  if (!settings) {
    return <div className="flex h-full items-center justify-center text-mute">加载中…</div>
  }

  const meta: Meta = { settings, subjects, reloadMeta, page, setPage, timer, dueCount, refreshDue }
  const remain = Math.max(0, daysBetween(todayStr(), settings.examDate))

  return (
    <MetaContext.Provider value={meta}>
      <div className="flex h-full gap-3 p-3">
        <aside className="glass-rail flex w-56 shrink-0 flex-col rounded-[26px] px-3 py-4">
          <div className="px-2 pb-4 pt-1">
            <div className="text-[17px] font-bold tracking-tight">考研工作台</div>
            <span className="mt-2 inline-flex rounded-full bg-white/60 px-2.5 py-1 text-[11px] font-medium text-mute">
              距初试 {remain} 天
            </span>
          </div>
          <nav className="flex-1 space-y-1">
            {NAV.map(item => {
              const active = page === item.id
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => setPage(item.id)}
                  className={`flex w-full cursor-pointer items-center gap-2.5 rounded-[13px] px-3 py-2 text-sm font-medium transition-all ${
                    active
                      ? 'bg-white/85 text-ink shadow-[0_2px_10px_rgba(31,45,80,0.10)]'
                      : 'text-mute hover:bg-black/[.04] hover:text-ink'
                  }`}
                >
                  <Icon size={17} className={active ? 'text-brand' : ''} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.id === 'review' && dueCount > 0 && (
                    <span className="rounded-full bg-[#ff3b30] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                      {dueCount}
                    </span>
                  )}
                  {item.id === 'focus' && timer && timer.status !== 'idle' && (
                    <span
                      className={`size-1.5 rounded-full ${
                        timer.paused ? 'bg-warn' : 'bg-ok'
                      } ${timer.status === 'focus' && !timer.paused ? 'animate-pulse' : ''}`}
                    />
                  )}
                </button>
              )
            })}
          </nav>
          <div className="px-2 pt-3 text-[11px] text-mute/80">V1.1 · 数据存于本机</div>
        </aside>
        <main className="h-full flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-5xl px-6 py-6">
            {page === 'today' && <TodayPage />}
            {page === 'plan' && <PlanPage />}
            {page === 'focus' && <FocusPage />}
            {page === 'mistakes' && <MistakesPage />}
            {page === 'review' && <ReviewPage />}
            {page === 'stats' && <StatsPage />}
            {page === 'settings' && <SettingsPage />}
          </div>
        </main>
      </div>
    </MetaContext.Provider>
  )
}
