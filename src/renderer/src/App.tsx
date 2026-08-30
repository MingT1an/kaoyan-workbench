import { useState } from 'react'
import Sidebar from './components/Sidebar'
import TodayPage from './pages/TodayPage'
import PlanPage from './pages/PlanPage'
import PomodoroPage from './pages/PomodoroPage'
import ReviewPage from './pages/ReviewPage'
import MistakesPage from './pages/MistakesPage'
import StatsPage from './pages/StatsPage'
import SettingsPage from './pages/SettingsPage'

export type PageId =
  | 'today'
  | 'plan'
  | 'pomodoro'
  | 'mistakes'
  | 'review'
  | 'stats'
  | 'settings'

export default function App() {
  const [page, setPage] = useState<PageId>('today')

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f6fa] text-slate-800">
      <Sidebar current={page} onChange={setPage} />
      <main className="h-full flex-1 overflow-y-auto">
        {page === 'today' && <TodayPage onNavigate={(p) => setPage(p as PageId)} />}
        {page === 'plan' && <PlanPage />}
        {page === 'pomodoro' && <PomodoroPage />}
        {page === 'mistakes' && <MistakesPage />}
        {page === 'review' && <ReviewPage />}
        {page === 'stats' && <StatsPage />}
        {page === 'settings' && <SettingsPage />}
      </main>
    </div>
  )
}
