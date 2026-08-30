import { useEffect, useMemo, useState } from 'react'
import { Brain, Clock3, ListTodo } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { SETTING_KEYS, type SettingsMap } from '../../../shared/types'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function greeting(hour: number): string {
  if (hour < 6) return '凌晨好'
  if (hour < 12) return '上午好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

export default function TodayPage() {
  const [settings, setSettings] = useState<SettingsMap | null>(null)

  useEffect(() => {
    window.api.settings
      .all()
      .then(setSettings)
      .catch((err) => {
        console.error('加载设置失败', err)
        setSettings({})
      })
  }, [])

  const { daysLeft, examYear } = useMemo(() => {
    const raw = settings?.[SETTING_KEYS.examDate]
    if (!raw) return { daysLeft: null as number | null, examYear: '' }
    const exam = new Date(`${raw}T00:00:00`)
    if (Number.isNaN(exam.getTime())) return { daysLeft: null, examYear: '' }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diff = Math.round((exam.getTime() - today.getTime()) / 86_400_000)
    return { daysLeft: diff, examYear: String(exam.getFullYear() + 1) }
  }, [settings])

  const now = new Date()
  const dateLabel = `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日 星期${WEEKDAYS[now.getDay()]}`

  return (
    <div className="mx-auto max-w-5xl px-10 py-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">
          {greeting(now.getHours())},保持专注!
        </h1>
        <p className="mt-1 text-sm text-slate-500">{dateLabel}</p>
      </header>

      <section className="mt-6 overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-500 px-8 py-7 text-white shadow-sm">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-sm text-indigo-100">
              {examYear ? `${examYear} 考研初试` : '考研初试'}
            </p>
            {daysLeft === null ? (
              <p className="mt-2 text-3xl font-bold">--</p>
            ) : (
              <p className="mt-2">
                <span className="text-5xl font-bold tracking-tight">
                  {daysLeft > 0 ? daysLeft : 0}
                </span>
                <span className="ml-2 text-lg text-indigo-100">天</span>
              </p>
            )}
            <p className="mt-2 text-xs text-indigo-100/90">
              {daysLeft !== null && daysLeft < 0
                ? `初试已结束 ${-daysLeft} 天`
                : daysLeft === 0
                  ? '就是今天,全力以赴!'
                  : `考试日期:${settings?.[SETTING_KEYS.examDate] ?? '未设置'}`}
            </p>
          </div>
          <p className="hidden text-sm text-indigo-100 sm:block">
            每一天的专注,都会在考场上兑现
          </p>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-3 gap-4">
        <StatCard icon={ListTodo} label="今日任务" value="0" hint="待办 0 · 已完成 0" />
        <StatCard icon={Clock3} label="今日专注" value="0 分钟" hint="番茄钟将在 V0.3 接入" />
        <StatCard icon={Brain} label="待复习" value="0" hint="复习引擎将在 V0.4 接入" />
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-slate-700">今日任务</h3>
          <div className="mt-4 flex h-28 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-400">
            任务管理将在 V0.2 上线,届时可在这里安排每天的学习
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-slate-700">今日复习</h3>
          <div className="mt-4 flex h-28 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-400">
            到期的知识点与错题将出现在这里(V0.4)
          </div>
        </div>
      </section>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint
}: {
  icon: LucideIcon
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">{label}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
          <Icon size={16} />
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
    </div>
  )
}
