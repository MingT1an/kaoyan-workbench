import { fmtHours, fmtShort } from '@shared/util'

export function DayBars({ data }: { data: { date: string; minutes: number }[] }) {
  const max = Math.max(30, ...data.map(d => d.minutes))
  return (
    <div>
      <div className="flex h-28 items-end gap-1.5">
        {data.map((d, i) => (
          <div
            key={d.date}
            title={`${d.date} · ${d.minutes} 分钟`}
            className="flex h-full flex-1 cursor-default items-end"
          >
            <div
              className={`w-full rounded-t-[5px] transition-colors ${
                i === data.length - 1 ? 'bg-brand' : 'bg-brand/40 hover:bg-brand/60'
              }`}
              style={{ height: `${Math.max(3, (d.minutes / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5 text-[10px] text-mute">
        {data.map((d, i) => (
          <div key={d.date} className="flex-1 text-center">
            {i === data.length - 1 ? '今天' : i % 3 === 0 ? fmtShort(d.date) : ''}
          </div>
        ))}
      </div>
    </div>
  )
}

export function SubjectBars({
  items
}: {
  items: { name: string; color: string; minutes: number }[]
}) {
  if (items.length === 0) return <div className="py-6 text-center text-sm text-mute">该时间段还没有专注记录</div>
  const max = Math.max(1, ...items.map(i => i.minutes))
  return (
    <div className="space-y-2.5">
      {items.map(it => (
        <div key={it.name} className="flex items-center gap-3">
          <span className="w-14 shrink-0 truncate text-xs text-mute">{it.name}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-black/[.06]">
            <div className="h-full rounded-full" style={{ width: `${(it.minutes / max) * 100}%`, background: it.color }} />
          </div>
          <span className="w-16 shrink-0 text-right text-xs tabular-nums text-mute">{fmtHours(it.minutes)}</span>
        </div>
      ))}
    </div>
  )
}

export function GoalRing({ value, goal, size = 60 }: { value: number; goal: number; size?: number }) {
  const pct = Math.min(1, goal > 0 ? value / goal : 0)
  const r = (size - 8) / 2
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(15,23,42,0.08)" strokeWidth="6" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#007aff"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
      />
    </svg>
  )
}
