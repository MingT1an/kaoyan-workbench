import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Plus, RefreshCcw, Trash2 } from 'lucide-react'
import type { RepeatRule, Task } from '@shared/types'
import { addDays, fmtShort, todayStr, weekdayCN } from '@shared/util'
import { useMeta } from '../ctx'
import { Badge, Btn, Card, Check, Empty, Field, IconBtn, Input, Modal, Select, SubjectChip } from '../components/ui'

type RepeatChoice = 'none' | 'daily' | 'weekdays'

export function PlanPage() {
  const { subjects } = useMeta()
  const [date, setDate] = useState(todayStr())
  const [tasks, setTasks] = useState<Task[]>([])
  const [overdue, setOverdue] = useState<Task[]>([])
  const [title, setTitle] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [minutes, setMinutes] = useState('')
  const [repeat, setRepeat] = useState<RepeatChoice>('none')
  const [editing, setEditing] = useState<Task | null>(null)

  const today = todayStr()
  const load = useCallback(async () => {
    setTasks(await window.api.tasks.list(date))
    setOverdue(await window.api.tasks.overdue(today))
  }, [date, today])

  useEffect(() => {
    load()
  }, [load])

  const add = async () => {
    const t = title.trim()
    if (!t) return
    await window.api.tasks.add({
      title: t,
      subjectId: subjectId || null,
      date,
      estimatedMinutes: minutes ? Number(minutes) : null,
      repeatRule: repeat === 'none' ? null : repeat
    })
    setTitle('')
    setMinutes('')
    setRepeat('none')
    load()
  }

  const toggle = async (t: Task) => {
    await window.api.tasks.update({ id: t.id, status: t.status === 'done' ? 'todo' : 'done' })
    load()
  }

  const remove = async (id: string) => {
    if (!confirm('删除这个任务?')) return
    await window.api.tasks.remove(id)
    load()
  }

  const moveToToday = async (t: Task) => {
    await window.api.tasks.update({ id: t.id, date: today })
    load()
  }

  const todo = tasks.filter(t => t.status === 'todo')
  const done = tasks.filter(t => t.status === 'done')

  const renderRow = (t: Task, showDate = false) => (
    <div
      key={t.id}
      className="group flex cursor-default items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-black/[.04]"
    >
      <Check done={t.status === 'done'} onClick={() => toggle(t)} />
      {t.repeatRule && (
        <span title="重复任务模板" className="text-mute">
          <RefreshCcw size={12} />
        </span>
      )}
      {showDate && <span className="shrink-0 text-xs tabular-nums text-warn">{fmtShort(t.date)}</span>}
      <button
        onClick={() => setEditing(t)}
        className={`flex-1 cursor-pointer truncate text-left text-sm transition-colors hover:text-brand ${
          t.status === 'done' ? 'text-mute line-through' : ''
        }`}
      >
        {t.title}
      </button>
      <SubjectChip subjects={subjects} subjectId={t.subjectId} />
      {t.estimatedMinutes != null && (
        <span className="shrink-0 text-xs tabular-nums text-mute">{t.estimatedMinutes} 分钟</span>
      )}
      <IconBtn
        className="opacity-0 transition-opacity group-hover:opacity-100 hover:!text-bad"
        onClick={() => remove(t.id)}
        title="删除"
      >
        <Trash2 size={14} />
      </IconBtn>
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">计划</h1>
        <div className="flex items-center gap-2">
          <Btn size="sm" onClick={() => setDate(addDays(date, -1))} title="前一天">
            <ChevronLeft size={14} />
          </Btn>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-40" />
          <Btn size="sm" onClick={() => setDate(addDays(date, 1))} title="后一天">
            <ChevronRight size={14} />
          </Btn>
          <Btn size="sm" onClick={() => setDate(today)}>
            今天
          </Btn>
          <span className="ml-1 text-sm text-mute">
            {weekdayCN(date)}
            {date === today ? ' · 今天' : ''}
          </span>
        </div>
      </div>

      <Card title="快速添加">
        <div className="flex gap-2">
          <Input
            className="flex-1"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') add()
            }}
            placeholder="任务标题…"
          />
          <Select value={subjectId} onChange={e => setSubjectId(e.target.value)}>
            <option value="">不限科目</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Input
            type="number"
            min={5}
            step={5}
            className="w-24"
            value={minutes}
            onChange={e => setMinutes(e.target.value)}
            placeholder="预计(分)"
          />
          <Select value={repeat} onChange={e => setRepeat(e.target.value as RepeatChoice)}>
            <option value="none">不重复</option>
            <option value="daily">每天</option>
            <option value="weekdays">工作日</option>
          </Select>
          <Btn variant="primary" onClick={add}>
            <Plus size={14} />
            添加
          </Btn>
        </div>
        <p className="mt-2 text-xs text-mute">
          选择「每天/工作日」后,该任务会作为模板在之后的日期自动生成当日实例(见日历视图),实例可独立完成或删除。
        </p>
      </Card>

      {overdue.length > 0 && (
        <Card title={`逾期未完成 · ${overdue.length}`}>
          <div className="space-y-1">
            {overdue.map(t => (
              <div
                key={t.id}
                className="group flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-black/[.04]"
              >
                <Check done={false} onClick={() => toggle(t)} />
                <span className="shrink-0 text-xs tabular-nums text-warn">{fmtShort(t.date)}</span>
                <button
                  onClick={() => setEditing(t)}
                  className="flex-1 cursor-pointer truncate text-left text-sm transition-colors hover:text-brand"
                >
                  {t.title}
                </button>
                <SubjectChip subjects={subjects} subjectId={t.subjectId} />
                <Btn size="sm" onClick={() => moveToToday(t)}>
                  <CalendarDays size={12} />
                  改期今天
                </Btn>
                <IconBtn
                  className="opacity-0 transition-opacity group-hover:opacity-100 hover:!text-bad"
                  onClick={() => remove(t.id)}
                  title="删除"
                >
                  <Trash2 size={14} />
                </IconBtn>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title={`${date} ${weekdayCN(date)}${date === today ? ' · 今天' : ''} · ${todo.length} 项待完成`}>
        {tasks.length === 0 ? (
          <Empty text="这一天还没有任务" />
        ) : (
          <div className="space-y-1">
            {todo.map(t => renderRow(t, false))}
            {done.length > 0 && (
              <div className="pt-2">
                <Badge tone="muted">已完成 {done.length}</Badge>
              </div>
            )}
            {done.map(t => renderRow(t, false))}
          </div>
        )}
      </Card>

      <TaskModal task={editing} onClose={() => { setEditing(null); load() }} />
    </div>
  )
}

function TaskModal({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const { subjects } = useMeta()
  const [title, setTitle] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [date, setDate] = useState(todayStr())
  const [est, setEst] = useState('')

  useEffect(() => {
    if (!task) return
    setTitle(task.title)
    setSubjectId(task.subjectId ?? '')
    setDate(task.date)
    setEst(task.estimatedMinutes ? String(task.estimatedMinutes) : '')
  }, [task])

  if (!task) return null

  const save = async () => {
    const t = title.trim()
    if (!t) return
    await window.api.tasks.update({
      id: task.id,
      title: t,
      subjectId: subjectId || null,
      date,
      estimatedMinutes: est ? Number(est) : null
    })
    onClose()
  }

  return (
    <Modal open title="编辑任务" onClose={onClose}>
      <div className="space-y-4">
        <Field label="标题">
          <Input className="w-full" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="科目">
            <Select className="w-full" value={subjectId} onChange={e => setSubjectId(e.target.value)}>
              <option value="">不限科目</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="日期">
            <Input type="date" className="w-full" value={date} onChange={e => setDate(e.target.value)} />
          </Field>
          <Field label="预计分钟">
            <Input type="number" min={5} step={5} className="w-full" value={est} onChange={e => setEst(e.target.value)} />
          </Field>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Btn onClick={onClose}>取消</Btn>
        <Btn variant="primary" onClick={save}>
          保存
        </Btn>
      </div>
    </Modal>
  )
}
