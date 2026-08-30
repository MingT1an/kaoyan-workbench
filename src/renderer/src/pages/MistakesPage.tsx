import { useEffect, useRef, useState } from 'react'
import { Camera, ChevronDown, ChevronUp, Plus, Repeat, Trash2, X } from 'lucide-react'
import type { Mastery, Mistake, Subject } from '../../../shared/types'

const MASTERY_META: Record<Mastery, { label: string; badge: string }> = {
  unknown: { label: '未掌握', badge: 'bg-red-50 text-red-500' },
  fuzzy: { label: '模糊', badge: 'bg-amber-50 text-amber-600' },
  mastered: { label: '已掌握', badge: 'bg-emerald-50 text-emerald-600' }
}
const MASTERY_ORDER: Mastery[] = ['unknown', 'fuzzy', 'mastered']

export default function MistakesPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [list, setList] = useState<Mistake[]>([])
  const [filterSubject, setFilterSubject] = useState<string>('')
  const [filterMastery, setFilterMastery] = useState<string>('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [error, setError] = useState('')

  // 表单
  const [subjectId, setSubjectId] = useState<number | null>(null)
  const [chapter, setChapter] = useState('')
  const [question, setQuestion] = useState('')
  const [wrongReason, setWrongReason] = useState('')
  const [solution, setSolution] = useState('')
  const [addToReview, setAddToReview] = useState(true)
  const [image, setImage] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    window.api.subjects
      .list()
      .then((list) => {
        setSubjects(list)
        setSubjectId((prev) => prev ?? list[0]?.id ?? null)
      })
      .catch(() => {})
    reload()
  }, [])

  useEffect(() => {
    reload()
  }, [filterSubject, filterMastery])

  function reload(): void {
    window.api.mistakes
      .list({
        subjectId: filterSubject ? Number(filterSubject) : null,
        mastery: (filterMastery || null) as Mastery | null
      })
      .then(setList)
      .catch((err) => console.error(err))
  }

  function handlePaste(e: React.ClipboardEvent): void {
    const items = e.clipboardData?.items ?? []
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (!file) continue
        const reader = new FileReader()
        reader.onload = () => setImage(String(reader.result))
        reader.readAsDataURL(file)
        e.preventDefault()
        return
      }
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImage(String(reader.result))
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function submit(): Promise<void> {
    const trimmed = question.trim()
    if (!trimmed) return
    try {
      let imagePath: string | null = null
      if (image) imagePath = await window.api.mistakes.saveImage(image)
      const created = await window.api.mistakes.create({
        subjectId,
        chapter: chapter || null,
        question: trimmed,
        wrongReason: wrongReason || null,
        solution: solution || null,
        imagePath
      })
      if (addToReview) {
        try {
          await window.api.mistakes.linkReview(created.id)
        } catch {
          // 复习队列联动失败不阻塞录入
        }
      }
      setQuestion('')
      setChapter('')
      setWrongReason('')
      setSolution('')
      setImage(null)
      setError('')
      reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function cycleMastery(m: Mistake): Promise<void> {
    const next = MASTERY_ORDER[(MASTERY_ORDER.indexOf(m.mastery) + 1) % MASTERY_ORDER.length]
    await window.api.mistakes.setMastery(m.id, next)
    reload()
  }

  async function remove(m: Mistake): Promise<void> {
    if (!window.confirm('确定删除这道错题吗?')) return
    await window.api.mistakes.remove(m.id)
    reload()
  }

  async function linkReview(m: Mistake): Promise<void> {
    try {
      await window.api.mistakes.linkReview(m.id)
      reload()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : String(err))
    }
  }

  const inputClass =
    'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400'

  return (
    <div className="mx-auto max-w-5xl px-10 py-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">错题本</h1>
          <p className="mt-1 text-sm text-slate-500">录错题、粘截图、一键加入复习队列</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:border-indigo-400"
          >
            <option value="">全部科目</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={filterMastery}
            onChange={(e) => setFilterMastery(e.target.value)}
            className="rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:border-indigo-400"
          >
            <option value="">全部状态</option>
            <option value="unknown">未掌握</option>
            <option value="fuzzy">模糊</option>
            <option value="mastered">已掌握</option>
          </select>
        </div>
      </header>

      {/* 录入表单 */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex gap-3">
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
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              placeholder="章节/来源,如:660题 第3章"
              className={`${inputClass} flex-1`}
            />
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <label className="flex cursor-pointer items-center gap-1.5">
              <input
                type="checkbox"
                checked={addToReview}
                onChange={(e) => setAddToReview(e.target.checked)}
                className="accent-indigo-600"
              />
              同时加入复习队列
            </label>
            <div className="ml-auto flex items-center gap-1.5">
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 transition hover:bg-slate-50"
                title="选择截图"
              >
                <Camera size={14} />
                截图
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />
              {image && (
                <button
                  onClick={() => setImage(null)}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                >
                  <X size={14} />
                  移除图
                </button>
              )}
            </div>
          </div>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onPaste={handlePaste}
            placeholder={'题干(可直接粘贴截图)…'}
            rows={3}
            className={`${inputClass} md:col-span-1`}
          />
          {image ? (
            <img
              src={image}
              alt="题目截图"
              className="max-h-28 rounded-lg border border-slate-200 object-contain"
            />
          ) : (
            <textarea
              value={wrongReason}
              onChange={(e) => setWrongReason(e.target.value)}
              placeholder="错误原因(可选):概念不清 / 计算失误 / 审题偏差…"
              rows={3}
              className={`${inputClass} md:col-span-1`}
            />
          )}
          <textarea
            value={solution}
            onChange={(e) => setSolution(e.target.value)}
            placeholder="正确思路(可选)…"
            rows={2}
            className={`${inputClass} md:col-span-1`}
          />
          <button
            onClick={submit}
            disabled={!question.trim()}
            className="flex items-center justify-center gap-1.5 self-end rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40 md:col-span-1"
          >
            <Plus size={15} />
            收录错题
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      </section>

      {/* 列表 */}
      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-2">
        <ul className="divide-y divide-slate-50">
          {list.map((m) => (
            <li key={m.id}>
              <div
                className="flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 hover:bg-slate-50"
                onClick={() => setExpandedId((id) => (id === m.id ? null : m.id))}
              >
                {expandedId === m.id ? (
                  <ChevronUp size={15} className="shrink-0 text-slate-300" />
                ) : (
                  <ChevronDown size={15} className="shrink-0 text-slate-300" />
                )}
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: m.subjectColor ?? '#cbd5e1' }}
                  title={m.subjectName ?? '未分类'}
                />
                <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{m.question}</span>
                {m.inReview && (
                  <span className="flex shrink-0 items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] text-indigo-500">
                    <Repeat size={10} />
                    复习中
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    cycleMastery(m)
                  }}
                  className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-medium transition ${MASTERY_META[m.mastery].badge}`}
                  title="点击切换掌握程度"
                >
                  {MASTERY_META[m.mastery].label}
                </button>
              </div>

              {expandedId === m.id && (
                <div className="px-12 pb-4">
                  {m.chapter && (
                    <p className="text-xs text-slate-400">来源:{m.chapter}</p>
                  )}
                  {m.imagePath && <MistakeImage file={m.imagePath} />}
                  {m.wrongReason && (
                    <p className="mt-2 text-sm leading-6 text-red-400">
                      <span className="font-medium">错因:</span>
                      {m.wrongReason}
                    </p>
                  )}
                  {m.solution && (
                    <p className="mt-1 text-sm leading-6 text-emerald-600">
                      <span className="font-medium">思路:</span>
                      {m.solution}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    {!m.inReview && (
                      <button
                        onClick={() => linkReview(m)}
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-500"
                      >
                        加入复习队列
                      </button>
                    )}
                    <button
                      onClick={() => remove(m)}
                      className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 transition hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 size={12} />
                      删除
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
          {list.length === 0 && (
            <li className="py-10 text-center text-sm text-slate-400">
              还没有错题,用上面的表单录入第一道吧(支持直接粘贴截图)
            </li>
          )}
        </ul>
      </section>
    </div>
  )
}

function MistakeImage({ file }: { file: string }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    window.api.mistakes
      .image(file)
      .then(setSrc)
      .catch(() => {})
  }, [file])
  if (!src) return null
  return (
    <img
      src={src}
      alt="错题截图"
      className="mt-2 max-h-56 rounded-lg border border-slate-200 object-contain"
    />
  )
}
