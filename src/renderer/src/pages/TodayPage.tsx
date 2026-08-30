import { useEffect, useMemo, useState } from 'react'
import { Brain, ChevronLeft, ChevronRight, Clock3, ListTodo, Plus, Repeat, Trash2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { SETTING_KEYS, type Subject, type SettingsMap, type TaskWithSubject, type TodayFocus } from '../../../shared/types'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function greeting(hour: number): string {
  if (hour < 6) return '凌晨好'
  if (hour < 12) return '上午好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

function toLocalDateStr(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function dateLabel(date: string, offset: number): string {
  const d = new Date(`${date}T00:00:00`)
  const base = `${d.getMonth() + 1} 月 ${d.getDate()} 日 周${WEEKDAYS[d.getDay()]}`
  if (offset === 0) return `今天 · ${base}`
  if (offset === 1) return `明天 · ${base}`
  if (offset === -1) return `昨天 · ${base}`
  return base
}

export default function TodayPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [settings, setSettings] = useState<SettingsMap | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [tasks, setTasks] = useState<TaskWithSubject[]>([])
  const [offset, setOffset] = useState(0)
  const [title, setTitle] = useState('')
  const [minutes, setMinutes] = useState('')
  const [subjectId, setSubjectId] = useState<number | null>(null)
  const [focus, setFocus] = useState<TodayFocus | null>(null)
  const [reviewDue, setReviewDue] = useState(0)

  const date = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + offset)
    return toLocalDateStr(d)
  }, [offset])

  useEffect(() => {
    window.api.settings
      .all()
      .then(setSettings)
      .catch((err) => {
        console.error('加载设置失败', err)
        setSettings({})
      })
    window.api.subjects
      .list()
      .then((list) => {
        setSubjects(list)
        setSubjectId((prev) => prev ?? list[0]?.id ?? null)
      })
      .catch((err) => console.error('加载科目失败', err))
  }, [])

  useEffect(() => {
    reload()
    reloadFocus()
    reloadReview()
    const off = window.api.onTimerChanged(() => reloadFocus())
    return off
  }, [date])

  function reload() {
    window.api.tasks
      .listByDate(date)
      .then(setTasks)
      .catch((err) => console.error('加载任务失败', err))
  }

  function reloadFocus() {
    window.api.sessions
      .today()
      .then(setFocus)
      .catch(() => {})
  }

  function reloadReview() {
    window.api.review
      .due()
      .then((list) => setReviewDue(list.length))
      .catch(() => {})
  }

  async function add() {
    const trimmed = title.trim()
    if (!trimmed) return
    try {
      await window.api.tasks.create({
        subjectId,
        title: trimmed,
        date,
        estimatedMinutes: minutes ? Number(minutes) : null
      })
      setTitle('')
      setMinutes('')
      reload()
    } catch (err) {
      console.error('添加任务失败', err)
    }
  }

  async function toggle(id: number) {
    await window.api.tasks.toggle(id)
    reload()
  }

  async function remove(id: number) {
    await window.api.tasks.remove(id)
    reload()
  }

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

  const doneCount = tasks.filter((t) => t.status === 'done').length
  const totalMinutes = tasks.reduce((sum, t) => sum + (t.estimatedMinutes ?? 0), 0)

  const now = new Date()
  const todayLabel = `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日 星期${WEEKDAYS[now.getDay()]}`

  return (
    <div className="mx-auto max-w-5xl px-10 py-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">
          {greeting(now.getHours())},保持专注!
        </h1>
        <p className="mt-1 text-sm text-slate-500">{todayLabel}</p>
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
        <StatCard
          icon={ListTodo}
          label="今日任务"
          value={`${doneCount}/${tasks.length}`}
          hint={
            tasks.length > 0
              ? `已完成 ${doneCount} · 预计共 ${totalMinutes} 分钟`
              : '还没有安排任务'
          }
        />
        <StatCard
          icon={Clock3}
          label="今日专注"
          value={`${focus?.minutes ?? 0} 分钟`}
          hint={focus && focus.pomodoros > 0 ? `已完成 ${focus.pomodoros} 个番茄` : '去番茄钟开始第一轮吧'}
        />
        <StatCard
          icon={Brain}
          label="待复习"
          value={String(reviewDue)}
          hint={reviewDue > 0 ? '有到期知识点,记得复习' : '复习引擎已上线(V0.4)'}
        />
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">任务清单</h3>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setOffset((o) => o - 1)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                title="前一天"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="min-w-32 text-center text-xs font-medium text-slate-600">
                {dateLabel(date, offset)}
              </span>
              <button
                onClick={() => setOffset((o) => o + 1)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                title="后一天"
              >
                <ChevronRight size={16} />
              </button>
              {offset !== 0 && (
                <button
                  onClick={() => setOffset(0)}
                  className="ml-1 rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-500 hover:bg-slate-200"
                >
                  回到今天
                </button>
              )}
            </div>
          </div>

          <ul className="mt-3 divide-y divide-slate-50">
            {tasks.map((task) => (
              <li key={task.id} className="group flex items-center gap-3 py-2.5">
                <button
                  onClick={() => toggle(task.id)}
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
                    task.status === 'done'
                      ? 'border-indigo-500 bg-indigo-500 text-white'
                      : 'border-slate-300 hover:border-indigo-400'
                  }`}
                  title={task.status === 'done' ? '标记为未完成' : '标记为完成'}
                >
                  {task.status === 'done' && <span className="text-[10px]">✓</span>}
                </button>
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: task.subjectColor ?? '#cbd5e1' }}
                  title={task.subjectName ?? '未分类'}
                />
                <span
                  className={`flex-1 truncate text-sm ${
                    task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-700'
                  }`}
                  title={task.title}
                >
                  {task.title}
                </span>
                {task.repeatOf != null && (
                  <span title="来自重复任务">
                    <Repeat size={13} className="shrink-0 text-slate-300" />
                  </span>
                )}
                {task.estimatedMinutes != null && (
                  <span className="shrink-0 text-xs text-slate-400">
                    {task.estimatedMinutes} 分钟
                  </span>
                )}
                <button
                  onClick={() => remove(task.id)}
                  className="rounded-lg p-1.5 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                  title="删除"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
            {tasks.length === 0 && (
              <li className="py-8 text-center text-sm text-slate-400">
                这天还没有任务,在下方添加一个吧
              </li>
            )}
          </ul>

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
              placeholder="新任务,如:英语真题阅读 2 篇"
              className="min-w-40 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
            <select
              value={subjectId ?? ''}
              onChange={(e) => setSubjectId(e.target.value ? Number(e.target.value) : null)}
              className="rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:border-indigo-400"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={5}
              step={5}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
              placeholder="分钟"
              className="w-20 rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:border-indigo-400"
            />
            <button
              onClick={add}
              disabled={!title.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={15} />
              添加
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-slate-700">今日复习</h3>
          {reviewDue > 0 ? (
            <div className="mt-4 flex flex-col items-center justify-center rounded-xl bg-indigo-50/60 px-4 py-8 text-center">
              <p className="text-3xl font-bold text-indigo-600">{reviewDue}</p>
              <p className="mt-1 text-xs text-slate-500">个知识点已到期</p>
              <button
                onClick={() => onNavigate('review')}
                className="mt-4 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
              >
                去复习
              </button>
            </div>
          ) : (
            <div className="mt-4 flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-200 px-4 text-center text-sm text-slate-400">
              没有到期的复习项,在「复习」页添加知识点
            </div>
          )}
          <p className="mt-4 text-xs leading-5 text-slate-400">
            提示:错题本里的错题可一键加入复习队列
          </p>
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
