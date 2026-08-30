import { useEffect, useState } from 'react'
import { Brain, Eye, Plus, Trash2 } from 'lucide-react'
import type { ReviewItem, ReviewResult, ReviewStats } from '../../../shared/types'

function todayStr(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

const GRADE_BUTTONS: Array<{ result: ReviewResult; label: string; class: string }> = [
  { result: 'forgot', label: '忘了', class: 'bg-red-500 hover:bg-red-400' },
  { result: 'fuzzy', label: '模糊', class: 'bg-amber-500 hover:bg-amber-400' },
  { result: 'remember', label: '记得', class: 'bg-emerald-600 hover:bg-emerald-500' }
]

export default function ReviewPage() {
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [due, setDue] = useState<ReviewItem[]>([])
  const [items, setItems] = useState<ReviewItem[]>([])
  const [current, setCurrent] = useState<ReviewItem | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  useEffect(() => {
    reload()
  }, [])

  function reload(keepCurrent = false): void {
    window.api.review.stats().then(setStats).catch(() => {})
    window.api.review
      .due()
      .then((list) => {
        setDue(list)
        setCurrent((prev) => {
          if (keepCurrent && prev && list.some((d) => d.id === prev.id)) return prev
          return list[0] ?? null
        })
        setRevealed(false)
      })
      .catch(() => {})
    window.api.review.all().then(setItems).catch(() => {})
  }

  async function grade(result: ReviewResult): Promise<void> {
    if (!current) return
    await window.api.review.grade(current.id, result)
    reload(true)
  }

  async function add(): Promise<void> {
    const trimmed = title.trim()
    if (!trimmed) return
    await window.api.review.create({ title: trimmed, content: content.trim() || null })
    setTitle('')
    setContent('')
    reload()
  }

  async function remove(id: number): Promise<void> {
    await window.api.review.remove(id)
    reload()
  }

  const dueOthers = due.filter((d) => d.id !== current?.id)

  return (
    <div className="mx-auto max-w-5xl px-10 py-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">复习</h1>
        <p className="mt-1 text-sm text-slate-500">艾宾浩斯遗忘曲线 · 到期知识点自动推送</p>
      </header>

      <section className="mt-6 grid grid-cols-3 gap-4">
        <StatCard label="项目总数" value={stats?.total ?? 0} />
        <StatCard label="今日到期" value={stats?.due ?? 0} highlight={(stats?.due ?? 0) > 0} />
        <StatCard label="今日已复习" value={stats?.reviewedToday ?? 0} />
      </section>

      {/* 复习卡 */}
      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-6">
        {current ? (
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">复习卡片</h3>
              <span className="text-xs text-slate-400">
                还剩 {due.length} 项待复习 · 第 {current.intervalIndex + 1} 轮
              </span>
            </div>
            <div className="mt-4 rounded-xl bg-slate-50 px-5 py-6 text-center">
              <p className="text-lg font-medium text-slate-800">{current.title}</p>
              {current.content ? (
                revealed ? (
                  <p className="mx-auto mt-4 max-w-xl whitespace-pre-wrap text-sm leading-6 text-slate-500">
                    {current.content}
                  </p>
                ) : (
                  <button
                    onClick={() => setRevealed(true)}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
                  >
                    <Eye size={15} />
                    显示内容
                  </button>
                )
              ) : (
                <p className="mt-3 text-xs text-slate-400">(无附加内容,凭记忆自评即可)</p>
              )}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {GRADE_BUTTONS.map((g) => (
                <button
                  key={g.result}
                  onClick={() => grade(g.result)}
                  className={`rounded-xl px-4 py-3 text-sm font-medium text-white transition ${g.class}`}
                >
                  {g.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-center text-xs text-slate-400">
              记得 → 进入下一间隔 · 模糊 → 明天再来 · 忘了 → 回到第一间隔
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500">
              <Brain size={24} />
            </div>
            <p className="mt-3 text-sm font-medium text-slate-600">今日复习已清空!</p>
            <p className="mt-1 text-xs text-slate-400">
              到期的知识点会自动出现在这里,也可以在下方添加新的复习项
            </p>
          </div>
        )}
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 到期队列 */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-slate-700">到期队列</h3>
          <ul className="mt-3 space-y-1">
            {dueOthers.slice(0, 8).map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => {
                    setCurrent(item)
                    setRevealed(false)
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left hover:bg-slate-50"
                >
                  <span className="h-2 w-2 shrink-0 rounded-full bg-red-400" />
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                    {item.title}
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">
                    {item.nextDueDate === todayStr() ? '今天' : item.nextDueDate}
                  </span>
                </button>
              </li>
            ))}
            {dueOthers.length === 0 && (
              <li className="py-3 text-center text-xs text-slate-400">
                {due.length > 0 ? '其余都在上方卡片复习' : '没有到期项'}
              </li>
            )}
          </ul>

          <div className="mt-4 border-t border-slate-100 pt-4">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
              placeholder="新知识点,如:马原·矛盾分析法"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="内容(可选):定义、要点、口诀…"
              rows={3}
              className="mt-2 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
            <button
              onClick={add}
              disabled={!title.trim()}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={15} />
              添加复习项(明天到期)
            </button>
          </div>
        </section>

        {/* 全部项目 */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-slate-700">全部项目</h3>
          <ul className="mt-3 max-h-96 space-y-1 overflow-y-auto">
            {items.map((item) => (
              <li key={item.id} className="group flex items-center gap-2 rounded-xl px-2 py-2 hover:bg-slate-50">
                <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-300" />
                <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{item.title}</span>
                <span className="shrink-0 text-xs text-slate-400">第 {item.intervalIndex + 1} 轮</span>
                <span className="w-20 shrink-0 text-right text-xs text-slate-400">
                  {item.nextDueDate}
                </span>
                <button
                  onClick={() => remove(item.id)}
                  className="rounded-lg p-1.5 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                  title="删除"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
            {items.length === 0 && (
              <li className="py-3 text-center text-xs text-slate-400">还没有复习项</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  highlight
}: {
  label: string
  value: number
  highlight?: boolean
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p
        className={`mt-3 text-3xl font-bold ${
          highlight ? 'text-indigo-600' : 'text-slate-900'
        }`}
      >
        {value}
      </p>
    </div>
  )
}
