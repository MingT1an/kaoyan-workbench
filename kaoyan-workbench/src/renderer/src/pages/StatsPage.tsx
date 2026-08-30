import { useCallback, useEffect, useState } from 'react'
import { Flame } from 'lucide-react'
import type { StatsOverview, StatsRange } from '@shared/types'
import { fmtHours } from '@shared/util'
import { useMeta } from '../ctx'
import { Card, Empty } from '../components/ui'
import { DayBars, SubjectBars } from '../components/charts'

const RANGES: { id: StatsRange; label: string }[] = [
  { id: 'week', label: '近 7 天' },
  { id: 'month', label: '近 30 天' },
  { id: 'all', label: '全部' }
]

export function StatsPage() {
  const [range, setRange] = useState<StatsRange>('week')
  const [data, setData] = useState<StatsOverview | null>(null)

  const load = useCallback(async () => {
    setData(await window.api.stats.overview(range))
  }, [range])

  useEffect(() => {
    load()
  }, [load])

  if (!data) return null

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">统计</h1>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <div className="text-xs text-mute">今日专注</div>
          <div className="mt-2 text-3xl font-semibold leading-none tabular-nums">
            {data.todayMinutes}
            <span className="ml-1 text-sm font-normal text-mute">分钟</span>
          </div>
          <div className="mt-2 text-xs text-mute">完成 {data.todayPomodoros} 个番茄</div>
        </Card>
        <Card>
          <div className="text-xs text-mute">近 7 天</div>
          <div className="mt-2 text-3xl font-semibold leading-none tabular-nums">{fmtHours(data.weekMinutes)}</div>
          <div className="mt-2 text-xs text-mute">日均 {Math.round(data.weekMinutes / 7)} 分钟</div>
        </Card>
        <Card>
          <div className="flex items-center gap-1 text-xs text-mute">
            <Flame size={12} className="text-warn" />
            连续打卡
          </div>
          <div className="mt-2 text-3xl font-semibold leading-none tabular-nums">
            {data.streak}
            <span className="ml-1 text-sm font-normal text-mute">天</span>
          </div>
          <div className="mt-2 text-xs text-mute">当日专注 ≥ 25 分钟记为打卡</div>
        </Card>
        <Card>
          <div className="text-xs text-mute">累计专注</div>
          <div className="mt-2 text-3xl font-semibold leading-none tabular-nums">{fmtHours(data.totalMinutes)}</div>
          <div className="mt-2 text-xs text-mute">共 {data.totalPomodoros} 个完整番茄</div>
        </Card>
      </div>

      <Card title="近 14 天专注趋势">
        <DayBars data={data.series14} />
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card
          title="科目分布"
          right={
            <div className="flex gap-1">
              {RANGES.map(r => (
                <button
                  key={r.id}
                  onClick={() => setRange(r.id)}
                  className={`cursor-pointer rounded-md px-2 py-1 text-xs transition-colors ${
                    range === r.id ? 'bg-brand/15 text-brand' : 'text-mute hover:text-ink'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          }
        >
          <SubjectBars items={data.bySubject} />
        </Card>

        <Card title="今日任务">
          {data.tasksToday.total === 0 ? (
            <Empty text="今天还没有安排任务" />
          ) : (
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-semibold tabular-nums">
                  {data.tasksToday.done}
                  <span className="text-sm font-normal text-mute"> / {data.tasksToday.total}</span>
                </span>
                <span className="text-xs text-mute">
                  完成 {Math.round((data.tasksToday.done / data.tasksToday.total) * 100)}%
                </span>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-black/[.06]">
                <div
                  className="h-full rounded-full bg-brand transition-all"
                  style={{ width: `${(data.tasksToday.done / data.tasksToday.total) * 100}%` }}
                />
              </div>
              {data.dueCards > 0 && (
                <div className="mt-4 text-xs text-warn">还有 {data.dueCards} 张复习卡片待完成</div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
