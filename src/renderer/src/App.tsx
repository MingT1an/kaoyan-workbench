import { useState } from 'react'
import { BarChart3 } from 'lucide-react'
import Sidebar from './components/Sidebar'
import PlaceholderPage from './components/PlaceholderPage'
import TodayPage from './pages/TodayPage'
import PlanPage from './pages/PlanPage'
import PomodoroPage from './pages/PomodoroPage'
import ReviewPage from './pages/ReviewPage'
import MistakesPage from './pages/MistakesPage'
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
        {page === 'stats' && (
          <PlaceholderPage
            icon={BarChart3}
            title="统计"
            version="V0.6"
            description="学习时长趋势、科目占比、打卡热力图与连续打卡天数"
          />
        )}
        {page === 'settings' && <SettingsPage />}
      </main>
    </div>
  )
}
