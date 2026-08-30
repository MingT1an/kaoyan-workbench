import { useEffect, useMemo, useState } from 'react'
import { Check, Pencil, Plus, Repeat, Trash2, X } from 'lucide-react'
import {
  SETTING_KEYS,
  DEFAULT_PHASES,
  type Phase,
  type Subject,
  type TaskWithSubject
} from '../../../shared/types'

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

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

function ruleText(rule: string): string {
  if (rule === 'daily') return '每天'
  if (rule.startsWith('weekdays:')) {
    const days = rule
      .slice('weekdays:'.length)
      .split(',')
      .map((n) => `周${WEEKDAY_LABELS[Number(n)]}`)
    return days.join('、')
  }
  return rule
}

function todayStr(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export default function PlanPage() {
  // ---------- 科目管理 ----------
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [name, setName] = useState('')
  const [color, setColor] = useState(PALETTE[0])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [error, setError] = useState('')

  // ---------- 重复任务 ----------
  const [templates, setTemplates] = useState<TaskWithSubject[]>([])
  const [rtTitle, setRtTitle] = useState('')
  const [rtSubjectId, setRtSubjectId] = useState<number | null>(null)
  const [rtDaily, setRtDaily] = useState(true)
  const [rtWeekdays, setRtWeekdays] = useState<number[]>([1, 3, 5])

  // ---------- 阶段规划 ----------
  const [phases, setPhases] = useState<Phase[]>([])
  const [phasesSaved, setPhasesSaved] = useState(false)

  useEffect(() => {
    reload()
    window.api.settings
      .all()
      .then((map) => {
        try {
          const parsed = JSON.parse(map[SETTING_KEYS.phasePlan] ?? '[]')
          if (Array.isArray(parsed) && parsed.length > 0) setPhases(parsed)
          else setPhases(DEFAULT_PHASES)
        } catch {
          setPhases(DEFAULT_PHASES)
        }
      })
      .catch((err) => console.error('加载设置失败', err))
  }, [])

  function reload() {
    window.api.subjects
      .list()
      .then((list) => {
        setSubjects(list)
        setRtSubjectId((prev) => prev ?? list[0]?.id ?? null)
      })
      .catch((err) => console.error('加载科目失败', err))
    window.api.tasks
      .templates()
      .then(setTemplates)
      .catch((err) => console.error('加载重复任务失败', err))
  }

  async function addSubject() {
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

  async function removeSubject(subject: Subject) {
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

  function toggleWeekday(day: number) {
    setRtWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    )
  }

  async function addTemplate() {
    const trimmed = rtTitle.trim()
    if (!trimmed) return
    const rule = rtDaily
      ? 'daily'
      : rtWeekdays.length > 0
        ? `weekdays:${rtWeekdays.join(',')}`
        : null
    if (!rule) return
    await window.api.tasks.create({
      subjectId: rtSubjectId,
      title: trimmed,
      date: todayStr(),
      repeatRule: rule
    })
    setRtTitle('')
    reload()
  }

  async function removeTemplate(id: number) {
    await window.api.tasks.remove(id)
    reload()
  }

  const currentPhaseId = useMemo(() => {
    const today = todayStr()
    return phases.find((p) => p.start <= today && today <= p.end)?.id ?? null
  }, [phases])

  const phasesInvalid = phases.some((p) => p.start > p.end)

  async function savePhases() {
    if (phasesInvalid) return
    await window.api.settings.set(SETTING_KEYS.phasePlan, JSON.stringify(phases))
    setPhasesSaved(true)
    window.setTimeout(() => setPhasesSaved(false), 2000)
  }

  const inputClass =
    'rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400'

  return (
    <div className="mx-auto max-w-5xl px-10 py-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">计划</h1>
        <p className="mt-1 text-sm text-slate-500">科目、重复任务与备考阶段管理</p>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* 科目管理 */}
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
                  <div className="group flex items-center gap-3">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: subject.color }}
                    />
                    <span className="text-sm text-slate-700">{subject.name}</span>
                    <div className="ml-auto flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                      <button
                        onClick={() => startEdit(subject)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        title="编辑"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => removeSubject(subject)}
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
                onKeyDown={(e) => e.key === 'Enter' && addSubject()}
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
                onClick={addSubject}
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

        {/* 重复任务 */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-700">重复任务</h3>
          <p className="mt-1 text-xs text-slate-400">每天自动出现在对应日期的任务清单里</p>

          <ul className="mt-3 space-y-1">
            {templates.map((tpl) => (
              <li key={tpl.id} className="group flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-slate-50">
                <Repeat size={14} className="shrink-0 text-slate-300" />
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: tpl.subjectColor ?? '#cbd5e1' }}
                  title={tpl.subjectName ?? '未分类'}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-slate-700">{tpl.title}</p>
                  <p className="text-xs text-slate-400">{ruleText(tpl.repeatRule ?? '')}</p>
                </div>
                <button
                  onClick={() => removeTemplate(tpl.id)}
                  className="rounded-lg p-1.5 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                  title="删除(已生成的历史任务保留)"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
            {templates.length === 0 && (
              <li className="py-4 text-center text-xs text-slate-400">还没有重复任务</li>
            )}
          </ul>

          <div className="mt-3 space-y-2 border-t border-slate-100 pt-4">
            <input
              value={rtTitle}
              onChange={(e) => setRtTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTemplate()}
              placeholder="如:背 100 个单词"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
            <div className="flex items-center gap-2">
              <select
                value={rtSubjectId ?? ''}
                onChange={(e) => setRtSubjectId(e.target.value ? Number(e.target.value) : null)}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-indigo-400"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
                <input
                  type="radio"
                  checked={rtDaily}
                  onChange={() => setRtDaily(true)}
                  className="accent-indigo-600"
                />
                每天
              </label>
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
                <input
                  type="radio"
                  checked={!rtDaily}
                  onChange={() => setRtDaily(false)}
                  className="accent-indigo-600"
                />
                每周
              </label>
            </div>
            {!rtDaily && (
              <div className="flex items-center gap-1">
                {WEEKDAY_LABELS.map((label, day) => (
                  <button
                    key={day}
                    onClick={() => toggleWeekday(day)}
                    className={`h-7 w-7 rounded-full text-xs transition ${
                      rtWeekdays.includes(day)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={addTemplate}
              disabled={!rtTitle.trim() || (rtDaily ? false : rtWeekdays.length === 0)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={15} />
              添加重复任务
            </button>
          </div>
        </section>

        {/* 备考阶段 */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">备考阶段</h3>
            <button
              onClick={savePhases}
              disabled={phasesInvalid}
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {phasesSaved ? '已保存 ✓' : '保存阶段'}
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {phases.map((phase, index) => (
              <div
                key={phase.id}
                className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 ${
                  currentPhaseId === phase.id
                    ? 'border-indigo-200 bg-indigo-50/60'
                    : 'border-slate-100'
                }`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-600">
                  {index + 1}
                </span>
                <input
                  value={phase.name}
                  onChange={(e) =>
                    setPhases((prev) =>
                      prev.map((p) => (p.id === phase.id ? { ...p, name: e.target.value } : p))
                    )
                  }
                  className="w-28 bg-transparent text-sm font-medium text-slate-700 outline-none"
                />
                {currentPhaseId === phase.id && (
                  <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-medium text-white">
                    进行中
                  </span>
                )}
                <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
                  <input
                    type="date"
                    value={phase.start}
                    onChange={(e) =>
                      setPhases((prev) =>
                        prev.map((p) => (p.id === phase.id ? { ...p, start: e.target.value } : p))
                      )
                    }
                    className={`rounded-lg border px-2 py-1.5 text-xs outline-none focus:border-indigo-400 ${
                      phase.start > phase.end ? 'border-red-300' : 'border-slate-200'
                    }`}
                  />
                  <span>至</span>
                  <input
                    type="date"
                    value={phase.end}
                    onChange={(e) =>
                      setPhases((prev) =>
                        prev.map((p) => (p.id === phase.id ? { ...p, end: e.target.value } : p))
                      )
                    }
                    className={`rounded-lg border px-2 py-1.5 text-xs outline-none focus:border-indigo-400 ${
                      phase.start > phase.end ? 'border-red-300' : 'border-slate-200'
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
          {phasesInvalid && (
            <p className="mt-2 text-xs text-red-500">开始日期不能晚于结束日期,修正后再保存</p>
          )}
        </section>
      </div>
    </div>
  )
}
