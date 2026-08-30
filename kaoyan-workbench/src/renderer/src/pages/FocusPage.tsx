import { useCallback, useEffect, useState } from 'react'
import { Pause, Play, Square } from 'lucide-react'
import type { Task, TodayFocus } from '@shared/types'
import { fmtClock, fmtTime, todayStr } from '@shared/util'
import { useMeta } from '../ctx'
import { Badge, Btn, Card, Empty, Select, SubjectChip } from '../components/ui'

export function FocusPage() {
  const { settings, subjects, timer } = useMeta()
  const [now, setNow] = useState(Date.now())
  const [subjectId, setSubjectId] = useState('')
  const [taskId, setTaskId] = useState('')
  const [taskOptions, setTaskOptions] = useState<Task[]>([])
  const [today, setToday] = useState<TodayFocus | null>(null)

  const loadToday = useCallback(async () => {
    setToday(await window.api.focus.today())
    const list = await window.api.tasks.list(todayStr())
    setTaskOptions(list.filter(t => t.status === 'todo'))
  }, [])

  useEffect(() => {
    loadToday()
  }, [loadToday])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (timer?.status === 'idle') loadToday()
  }, [timer?.status, loadToday])

  const running = !!timer && timer.status !== 'idle'
  const remainSec =
    timer && timer.status !== 'idle'
      ? timer.paused
        ? Math.ceil(timer.remainingMs / 1000)
        : Math.max(0, Math.ceil(((timer.endsAt ? Date.parse(timer.endsAt) : now) - now) / 1000))
      : settings.focusMinutes * 60

  const statusLabel = !timer || timer.status === 'idle'
    ? '准备开始'
    : timer.status === 'focus'
      ? timer.paused
        ? '已暂停'
        : '专注中'
      : timer.paused
        ? '已暂停'
        : timer.status === 'break'
          ? '休息中'
          : '长休息中'

  const statusTone = !timer || timer.status === 'idle'
    ? 'muted'
    : timer.status === 'focus'
      ? timer.paused
        ? 'warn'
        : 'brand'
      : timer.paused
        ? 'warn'
        : 'ok'

  const digitColor =
    timer && timer.status !== 'idle'
      ? timer.status === 'focus'
        ? timer.paused
          ? 'text-warn'
          : 'text-ink'
        : 'text-ok'
      : 'text-mute'

  const start = () => {
    const task = taskOptions.find(t => t.id === taskId)
    window.api.focus.start({
      subjectId: subjectId || null,
      taskId: task?.id ?? null,
      taskTitle: task?.title ?? null
    })
  }

  const currentSubject = subjects.find(s => s.id === timer?.subjectId)

  return (
    <div className="space-y-5">
      <div className="glass flex flex-col items-center rounded-[26px] py-10">
        <Badge tone={statusTone}>{statusLabel}</Badge>
        <div className={`mt-5 text-[72px] font-semibold leading-none tabular-nums ${digitColor}`}>
          {fmtClock(remainSec)}
        </div>
        <div className="mt-3 text-sm text-mute">
          {running
            ? [
                timer!.taskTitle ?? currentSubject?.name ?? '自由专注',
                `计划 ${timer!.plannedMinutes} 分钟`
              ].join(' · ')
            : `专注 ${settings.focusMinutes} 分钟 · 休息 ${settings.breakMinutes} 分钟 · 每 ${settings.longBreakEvery} 个番茄长休`}
        </div>
        {running && (
          <div className="mt-1.5 text-xs text-mute">
            今日已完成 {timer!.pomodorosToday} 个番茄
          </div>
        )}

        {!running ? (
          <div className="mt-8 w-full max-w-md space-y-3">
            <div className="flex flex-wrap justify-center gap-2">
              {[{ id: '', name: '不关联', color: '#8b95ad' }, ...subjects].map(s => (
                <button
                  key={s.id || 'none'}
                  onClick={() => setSubjectId(s.id)}
                  className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    subjectId === s.id ? 'border-transparent' : 'border-black/10 text-mute hover:text-ink'
                  }`}
                  style={subjectId === s.id ? { background: `${s.color}26`, color: s.color } : undefined}
                >
                  {s.name}
                </button>
              ))}
            </div>
            <Select className="w-full" value={taskId} onChange={e => setTaskId(e.target.value)}>
              <option value="">不关联任务</option>
              {taskOptions.map(t => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </Select>
            <Btn variant="primary" className="h-11 w-full text-base" onClick={start}>
              <Play size={16} />
              开始专注
            </Btn>
          </div>
        ) : (
          <div className="mt-8 flex gap-3">
            {timer!.paused ? (
              <Btn variant="primary" onClick={() => window.api.focus.resume()}>
                <Play size={15} />
                继续
              </Btn>
            ) : (
              <Btn onClick={() => window.api.focus.pause()}>
                <Pause size={15} />
                暂停
              </Btn>
            )}
            <Btn variant="danger" onClick={() => window.api.focus.stop()}>
              <Square size={14} />
              {timer!.status === 'focus' ? '结束专注' : '跳过休息'}
            </Btn>
          </div>
        )}
      </div>

      <Card title={`今日记录 · ${today?.minutes ?? 0} 分钟`}>
        {(today?.recent.length ?? 0) === 0 ? (
          <Empty text="还没有专注记录" />
        ) : (
          <div className="space-y-2">
            {today!.recent.map(s => (
              <div key={s.id} className="flex items-center gap-3 text-sm">
                <span className="w-24 shrink-0 tabular-nums text-mute">
                  {fmtTime(s.startedAt)}–{fmtTime(s.endedAt)}
                </span>
                <SubjectChip subjects={subjects} subjectId={s.subjectId} />
                <span className="flex-1 truncate text-mute">{s.taskTitle ?? ''}</span>
                <Badge tone={s.status === 'completed' ? 'ok' : 'muted'}>
                  {s.status === 'completed' ? '完整番茄' : '提前结束'}
                </Badge>
                <span className="w-16 shrink-0 text-right tabular-nums">
                  {Math.round(s.actualSeconds / 60)} 分钟
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
