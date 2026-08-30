import {
  BarChart3,
  BookX,
  CalendarDays,
  GraduationCap,
  RotateCcw,
  Settings,
  Sunrise,
  Timer
} from 'lucide-react'
import type { PageId } from '../App'

const NAV_ITEMS: Array<{ id: PageId; label: string; icon: typeof Sunrise }> = [
  { id: 'today', label: '今日', icon: Sunrise },
  { id: 'plan', label: '计划', icon: CalendarDays },
  { id: 'pomodoro', label: '番茄钟', icon: Timer },
  { id: 'mistakes', label: '错题本', icon: BookX },
  { id: 'review', label: '复习', icon: RotateCcw },
  { id: 'stats', label: '统计', icon: BarChart3 }
]

export default function Sidebar({
  current,
  onChange
}: {
  current: PageId
  onChange: (page: PageId) => void
}) {
  return (
    <aside className="flex w-56 shrink-0 flex-col bg-slate-900 text-slate-300">
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500 text-white">
          <GraduationCap size={20} />
        </div>
        <div>
          <div className="text-[15px] font-semibold text-white">考研工作台</div>
          <div className="text-xs text-slate-400">稳步上岸</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
              current === id
                ? 'bg-indigo-600 font-medium text-white'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>

      <div className="px-3 pb-5">
        <button
          onClick={() => onChange('settings')}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
            current === 'settings'
              ? 'bg-indigo-600 font-medium text-white'
              : 'text-slate-300 hover:bg-white/5 hover:text-white'
          }`}
        >
          <Settings size={18} />
          设置
        </button>
      </div>
    </aside>
  )
}
