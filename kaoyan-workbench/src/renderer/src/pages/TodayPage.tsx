import { useCallback, useEffect, useState } from 'react'
import { Play, Plus, RefreshCcw } from 'lucide-react'
import type { Task } from '@shared/types'
import { daysBetween, fmtTime, todayStr, weekdayCN } from '@shared/util'
import { useMeta } from '../ctx'
import { Badge, Btn, Card, Check, Empty, Input, SubjectChip } from '../components/ui'
import { GoalRing } from '../components/charts'
import type { TodayFocus } from '@shared/types'

export function TodayPage() {
  const { settings, subjects, setPage, timer, dueCount } = useMeta()
  const [tasks, setTasks] = useState<Task[]>([])
  const [focus, setFocus] = useState<TodayFocus | null>(null)
  const [draft, setDraft] = useState('')

  const today = todayStr()
  const load = useCallback(async () => {
    setTasks(await window.api.tasks.list(today))
    setFocus(await window.api.focus.today())
  }, [today])

  useEffect(() => {
    load()
  }, [load])
  useEffect(() => {
    if (timer?.status === 'idle') load()
  }, [timer?.status, load])

  const addQuick = async () => {
    const title = draft.trim()
    if (!title) return
    await window.api.tasks.add({ title, subjectId: null, date: today })
    setDraft('')
    load()
  }

  const toggle = async (t: Task) => {
    await window.api.tasks.update({ id: t.id, status: t.status === 'done' ? 'todo' : 'done' })
    load()
  }

  const remain = Math.max(0, daysBetween(today, settings.examDate))
  const phase = settings.phases.find(p => today >= p.start && today <= p.end)
  const hour = new Date().getHours()
  const greeting = hour < 5 ? '夜深了' : hour < 11 ? '早上好' : hour < 13 ? '中午好' : hour < 18 ? '下午好' : '晚上好'
  const todo = tasks.filter(t => t.status === 'todo')
  const done = tasks.filter(t => t.status === 'done')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">{greeting},离上岸又近一天</h1>
        <p className="mt-1 text-sm text-mute">
          {today} {weekdayCN(today)}
          {phase ? ` · ${phase.name}` : ''}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <div className="text-xs text-mute">距离初试</div>
          <div className="mt-2 flex items-end gap-1.5">
            <span className="text-5xl font-semibold leading-none tabular-nums">{remain}</span>
            <span className="pb-0.5 text-mute">天</span>
          </div>
          <div className="mt-3 text-xs text-mute">{settings.examDate} · 2027 考研初试(预计,可在设置中修改)</div>
        </Card>

        <Card>
          <div className="text-xs text-mute">今日专注</div>
          <div className="mt-2 flex items-center justify-between">
            <div>
              <div className="text-3xl font-semibold leading-none tabular-nums">
                {focus?.minutes ?? 0}
                <span className="ml-1 text-sm font-normal text-mute">分钟</span>
              </div>
              <div className="mt-2 text-xs text-mute">
                目标 {settings.dailyGoalPomodoros} 个番茄 · 已完成 {focus?.pomodoros ?? 0} 个
              </div>
            </div>
            <div className="relative">
              <GoalRing value={focus?.pomodoros ?? 0} goal={settings.dailyGoalPomodoros} />
              <span className="absolute inset-0 flex items-center justify-center text-xs tabular-nums text-mute">
                {focus?.pomodoros ?? 0}
              </span>
            </div>
          </div>
          <Btn variant="primary" className="mt-3 w-full" onClick={() => setPage('focus')}>
            <Play size={14} />
            开始专注
          </Btn>
        </Card>

        <Card>
          <div className="text-xs text-mute">待复习</div>
          <div className="mt-2 flex items-end gap-1.5">
            <span className="text-5xl font-semibold leading-none tabular-nums">{dueCount}</span>
            <span className="pb-0.5 text-mute">张卡片到期</span>
          </div>
          <Btn className="mt-3 w-full" onClick={() => setPage('review')}>
            <RefreshCcw size={14} />
            去复习
          </Btn>
        </Card>
      </div>

      <Card title={`今日任务 · ${todo.length} 项待完成`}>
        <div className="flex gap-2">
          <Input
            className="flex-1"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') addQuick()
            }}
            placeholder="添加一个任务,回车快速创建…"
          />
          <Btn variant="primary" onClick={addQuick}>
            <Plus size={14} />
            添加
          </Btn>
        </div>
        {tasks.length === 0 ? (
          <div className="mt-3">
            <Empty text="今天还没有安排,先列 3 件最重要的事吧" />
          </div>
        ) : (
          <div className="mt-3 space-y-1">
            {[...todo, ...done].map(t => (
              <div
                key={t.id}
                className="group flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-black/[.04]"
              >
                <Check done={t.status === 'done'} onClick={() => toggle(t)} />
                <span className={`flex-1 truncate text-sm ${t.status === 'done' ? 'text-mute line-through' : ''}`}>
                  {t.title}
                </span>
                <SubjectChip subjects={subjects} subjectId={t.subjectId} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="最近专注">
        {(focus?.recent.length ?? 0) === 0 ? (
          <Empty text="还没有专注记录,去专注页开始第一个番茄吧" />
        ) : (
          <div className="space-y-2">
            {focus!.recent.map(s => (
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
