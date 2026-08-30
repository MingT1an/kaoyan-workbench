import { useState } from 'react'
import { BarChart3, BookX, RotateCcw, Timer } from 'lucide-react'
import Sidebar from './components/Sidebar'
import PlaceholderPage from './components/PlaceholderPage'
import TodayPage from './pages/TodayPage'
import PlanPage from './pages/PlanPage'
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
        {page === 'today' && <TodayPage />}
        {page === 'plan' && <PlanPage />}
        {page === 'pomodoro' && (
          <PlaceholderPage
            icon={Timer}
            title="番茄钟"
            version="V0.3"
            description="专注计时、绑定任务、托盘常驻与学习时长统计"
          />
        )}
        {page === 'mistakes' && (
          <PlaceholderPage
            icon={BookX}
            title="错题本"
            version="V0.5"
            description="错题录入(支持截图粘贴)、分类标记,并可一键加入复习队列"
          />
        )}
        {page === 'review' && (
          <PlaceholderPage
            icon={RotateCcw}
            title="复习"
            version="V0.4"
            description="艾宾浩斯遗忘曲线复习引擎,到期知识点自动进入今日清单"
          />
        )}
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
