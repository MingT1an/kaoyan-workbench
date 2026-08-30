import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import type { SubjectMinutes } from '../../../preload/index'

function fmtDate(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default function StatsPage() {
  const [overview, setOverview] = useState({
    totalMinutes: 0,
    totalPomodoros: 0,
    mistakeCount: 0,
    reviewCount: 0,
    reviewReviewed: 0
  })
  const [daily, setDaily] = useState<Array<{ date: string; minutes: number }>>([])
  const [bySubject, setBySubject] = useState<SubjectMinutes[]>([])
  const [week, setWeek] = useState({ done: 0, total: 0 })
  const [exportMsg, setExportMsg] = useState('')

  useEffect(() => {
    window.api.stats.overview().then(setOverview).catch(() => {})
    window.api.stats.dailyMinutes().then(setDaily).catch(() => {})
    window.api.stats.bySubject().then(setBySubject).catch(() => {})
    window.api.stats.weekTasks().then(setWeek).catch(() => {})
    window.api.review.stats().then(() => {}).catch(() => {})
  }, [])

  async function doExport(): Promise<void> {
    const path = await window.api.data.export()
    if (path) {
      setExportMsg(`已导出:${path}`)
    } else {
      setExportMsg('已取消')
    }
  }

  // ---- 柱状图几何 ----
  const W = 620
  const H = 170
  const PAD_BOTTOM = 22
  const plotH = H - PAD_BOTTOM
  const maxMinutes = Math.max(60, ...daily.map((d) => d.minutes))
  const slot = daily.length > 0 ? W / daily.length : W
  const barW = Math.max(4, slot * 0.6)
  const totalSubjectMinutes = bySubject.reduce((s, x) => s + x.minutes, 0)
  const R = 56
  const CIRC = 2 * Math.PI * R
  let acc = 0
  const weekPct = week.total > 0 ? Math.round((week.done / week.total) * 100) : 0

  return (
    <div className="mx-auto max-w-5xl px-10 py-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">统计</h1>
        <p className="mt-1 text-sm text-slate-500">看见自己的每一步积累</p>
      </header>

      {/* 概览卡 */}
      <section className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card label="累计专注" value={`${overview.totalMinutes} 分钟`} />
        <Card label="完成番茄" value={String(overview.totalPomodoros)} />
        <Card label="收录错题" value={String(overview.mistakeCount)} />
        <Card label="复习项" value={`${overview.reviewCount} · 已复习 ${overview.reviewReviewed} 次`} />
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* 趋势图 */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-3">
          <h3 className="text-sm font-semibold text-slate-700">近 30 天专注趋势</h3>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full">
            {daily.map((d, i) => {
              const h = (d.minutes / maxMinutes) * plotH
              const x = i * slot + (slot - barW) / 2
              return (
                <g key={d.date}>
                  <rect
                    x={x}
                    y={plotH - h}
                    width={barW}
                    height={Math.max(d.minutes > 0 ? 3 : 1.5, h)}
                    rx={2}
                    className={d.minutes > 0 ? 'fill-indigo-500' : 'fill-slate-100'}
                  >
                    <title>{`${d.date} · ${d.minutes} 分钟`}</title>
                  </rect>
                  {(i % 5 === 0 || i === daily.length - 1) && (
                    <text x={x + barW / 2} y={H - 6} textAnchor="middle" className="fill-slate-300 text-[9px]">
                      {fmtDate(new Date(`${d.date}T00:00:00`))}
                    </text>
                  )}
                </g>
              )
            })}
            <line x1="0" y1={plotH} x2={W} y2={plotH} className="stroke-slate-200" />
          </svg>
        </section>

        {/* 科目占比 */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-700">科目占比 · 近 30 天</h3>
          {totalSubjectMinutes > 0 ? (
            <div className="mt-3 flex items-center gap-5">
              <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90 shrink-0">
                <circle cx="70" cy="70" r={R} fill="none" stroke="#f1f5f9" strokeWidth="20" />
                {bySubject.map((s) => {
                  const frac = s.minutes / totalSubjectMinutes
                  const dash = CIRC * frac
                  const offset = -CIRC * acc
                  acc += frac
                  return (
                    <circle
                      key={s.name}
                      cx="70"
                      cy="70"
                      r={R}
                      fill="none"
                      stroke={s.color}
                      strokeWidth="20"
                      strokeDasharray={`${dash} ${CIRC - dash}`}
                      strokeDashoffset={offset}
                    >
                      <title>{`${s.name} · ${s.minutes} 分钟`}</title>
                    </circle>
                  )
                })}
              </svg>
              <ul className="min-w-0 flex-1 space-y-2">
                {bySubject.map((s) => (
                  <li key={s.name} className="flex items-center gap-2 text-xs">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="min-w-0 flex-1 truncate text-slate-600">{s.name}</span>
                    <span className="shrink-0 text-slate-400">
                      {s.minutes} 分 · {Math.round((s.minutes / totalSubjectMinutes) * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-6 text-center text-sm text-slate-400">
              还没有专注记录,去番茄钟开始第一轮吧
            </p>
          )}
        </section>

        {/* 本周任务 */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">本周任务完成率</h3>
            <span className="text-xs text-slate-400">
              {week.done}/{week.total}
            </span>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${weekPct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {week.total === 0 ? '本周还没有安排任务' : `已完成 ${weekPct}% · 继续保持!`}
          </p>
        </section>

        {/* 数据管理 */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-700">数据与备份</h3>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            每次启动自动备份到本地(保留最近 14 份),也可随时手动导出完整 JSON。
          </p>
          <button
            onClick={doExport}
            className="mt-3 flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            <Download size={15} />
            导出数据备份
          </button>
          {exportMsg && <p className="mt-2 break-all text-xs text-emerald-600">{exportMsg}</p>}
        </section>
      </div>
    </div>
  )
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 truncate text-xl font-bold text-slate-900">{value}</p>
    </div>
  )
}
