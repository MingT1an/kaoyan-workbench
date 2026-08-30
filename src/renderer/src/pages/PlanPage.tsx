import { useEffect, useState } from 'react'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import type { Subject } from '../../../shared/types'

const PALETTE = [
  '#6366f1',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#a855f7',
  '#ec4899',
  '#14b8a6'
]

const PHASES = [
  { name: '基础阶段', time: '3 - 6 月', desc: '过完教材与基础课程,搭建知识框架' },
  { name: '强化阶段', time: '7 - 10 月', desc: '刷题强化,整理错题与笔记' },
  { name: '冲刺阶段', time: '11 - 12 月', desc: '真题模考、背诵冲刺、查漏补缺' }
]

export default function PlanPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [name, setName] = useState('')
  const [color, setColor] = useState(PALETTE[0])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    reload()
  }, [])

  function reload() {
    window.api.subjects
      .list()
      .then(setSubjects)
      .catch((err) => console.error('加载科目失败', err))
  }

  async function add() {
    const trimmed = name.trim()
    if (!trimmed) return
    try {
      await window.api.subjects.create({ name: trimmed, color })
      setName('')
      setError('')
      reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function remove(subject: Subject) {
    if (!window.confirm(`确定删除科目「${subject.name}」吗?`)) return
    await window.api.subjects.remove(subject.id)
    reload()
  }

  function startEdit(subject: Subject) {
    setEditingId(subject.id)
    setEditName(subject.name)
    setEditColor(subject.color)
  }

  async function saveEdit() {
    if (editingId === null) return
    const trimmed = editName.trim()
    if (!trimmed) return
    await window.api.subjects.update({ id: editingId, name: trimmed, color: editColor })
    setEditingId(null)
    reload()
  }

  return (
    <div className="mx-auto max-w-5xl px-10 py-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">计划</h1>
        <p className="mt-1 text-sm text-slate-500">科目与备考阶段管理</p>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-3">
          <h3 className="text-sm font-semibold text-slate-700">科目管理</h3>

          <ul className="mt-4 space-y-1">
            {subjects.map((subject) => (
              <li key={subject.id} className="rounded-xl px-2 py-2 hover:bg-slate-50">
                {editingId === subject.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-40 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-400"
                      autoFocus
                    />
                    <div className="flex items-center gap-1.5">
                      {PALETTE.map((c) => (
                        <button
                          key={c}
                          onClick={() => setEditColor(c)}
                          style={{ backgroundColor: c }}
                          className={`h-5 w-5 rounded-full transition ${
                            editColor === c ? 'ring-2 ring-slate-400 ring-offset-2' : ''
                          }`}
                        />
                      ))}
                    </div>
                    <div className="ml-auto flex items-center gap-1">
                      <button
                        onClick={saveEdit}
                        className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50"
                        title="保存"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                        title="取消"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: subject.color }}
                    />
                    <span className="text-sm text-slate-700">{subject.name}</span>
                    <div className="ml-auto flex items-center gap-1 opacity-0 transition hover:opacity-100 focus-within:opacity-100 [li:hover>&]:opacity-100">
                      <button
                        onClick={() => startEdit(subject)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        title="编辑"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => remove(subject)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                        title="删除"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>

          <div className="mt-4 border-t border-slate-100 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && add()}
                placeholder="新科目名称,如:408 计算机"
                className="w-56 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
              />
              <div className="flex items-center gap-1.5">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    style={{ backgroundColor: c }}
                    className={`h-5 w-5 rounded-full transition ${
                      color === c ? 'ring-2 ring-slate-400 ring-offset-2' : ''
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={add}
                disabled={!name.trim()}
                className="ml-auto flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus size={15} />
                添加科目
              </button>
            </div>
            {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-700">备考阶段</h3>
          <ul className="mt-4 space-y-4">
            {PHASES.map((phase, index) => (
              <li key={phase.name} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-600">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    {phase.name}
                    <span className="ml-2 text-xs font-normal text-slate-400">{phase.time}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">{phase.desc}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-400">
            V0.2 起支持自定义各阶段起止日期,并把阶段目标拆解为每周、每日任务
          </p>
        </section>
      </div>
    </div>
  )
}
