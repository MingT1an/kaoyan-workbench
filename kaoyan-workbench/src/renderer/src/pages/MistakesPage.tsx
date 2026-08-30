import { useCallback, useEffect, useRef, useState, type ClipboardEvent } from 'react'
import { ImagePlus, Plus, Search, Trash2 } from 'lucide-react'
import type { Mastery, Mistake } from '@shared/types'
import { useMeta } from '../ctx'
import { Badge, Btn, Card, Empty, Field, IconBtn, Input, Modal, Select, Textarea } from '../components/ui'

const MASTERY_LABEL: Record<Mastery, { text: string; tone: 'bad' | 'warn' | 'ok' }> = {
  unknown: { text: '未掌握', tone: 'bad' },
  fuzzy: { text: '模糊', tone: 'warn' },
  mastered: { text: '已掌握', tone: 'ok' }
}

export function MistakesPage() {
  const { subjects } = useMeta()
  const [list, setList] = useState<Mistake[]>([])
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('')
  const [editing, setEditing] = useState<Mistake | null>(null)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setList(await window.api.mistakes.list())
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = list.filter(m => {
    if (filter && m.subjectId !== filter) return false
    const s = q.trim()
    if (!s) return true
    return (
      m.question.includes(s) ||
      (m.wrongReason ?? '').includes(s) ||
      (m.solution ?? '').includes(s) ||
      (m.chapter ?? '').includes(s)
    )
  })

  const open = creating || editing !== null

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          错题本 <span className="ml-1 text-sm font-normal text-mute">{list.length} 条</span>
        </h1>
        <Btn
          variant="primary"
          onClick={() => {
            setEditing(null)
            setCreating(true)
          }}
        >
          <Plus size={14} />
          新建错题
        </Btn>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
          <Input
            className="w-full pl-8"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="搜索题目、错因、解法…"
          />
        </div>
        <button
          onClick={() => setFilter('')}
          className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors ${
            filter === '' ? 'border-transparent bg-brand/15 text-brand' : 'border-black/10 text-mute hover:text-ink'
          }`}
        >
          全部
        </button>
        {subjects.map(s => (
          <button
            key={s.id}
            onClick={() => setFilter(s.id)}
            className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors ${
              filter === s.id ? 'border-transparent' : 'border-black/10 text-mute hover:text-ink'
            }`}
            style={filter === s.id ? { background: `${s.color}26`, color: s.color } : undefined}
          >
            {s.name}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Empty text={list.length === 0 ? '还没有错题,遇到错题随手拍下来吧' : '没有匹配的错题'} />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filtered.map(m => {
            const mastery = MASTERY_LABEL[m.mastery]
            return (
              <div
                key={m.id}
                onClick={() => setEditing(m)}
                className="glass cursor-pointer rounded-[20px] p-4 transition-shadow hover:shadow-[0_12px_32px_rgba(31,45,80,0.16)]"
              >
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className="inline-flex shrink-0 items-center gap-1"
                    style={{ color: subjects.find(s => s.id === m.subjectId)?.color ?? '#8b95ad' }}
                  >
                    <span
                      className="size-1.5 rounded-full"
                      style={{ background: subjects.find(s => s.id === m.subjectId)?.color ?? '#8b95ad' }}
                    />
                    {subjects.find(s => s.id === m.subjectId)?.name ?? '未分类'}
                  </span>
                  {m.chapter && <span className="truncate text-mute">· {m.chapter}</span>}
                  <span className="flex-1" />
                  {m.inReview && <Badge tone="brand">复习中</Badge>}
                  <Badge tone={mastery.tone}>{mastery.text}</Badge>
                </div>
                <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed">{m.question}</p>
                {m.images.length > 0 && (
                  <div className="mt-2 flex gap-2">
                    {m.images.slice(0, 3).map(n => (
                      <img
                        key={n}
                        src={`media://${n}`}
                        className="h-14 rounded-[10px] border border-black/[.06] object-cover"
                        alt="错题截图"
                      />
                    ))}
                    {m.images.length > 3 && (
                      <span className="self-center text-xs text-mute">+{m.images.length - 3}</span>
                    )}
                  </div>
                )}
                {m.wrongReason && (
                  <p className="mt-2 line-clamp-1 text-xs text-mute">错因:{m.wrongReason}</p>
                )}
                <div className="mt-2 text-[11px] text-mute/70">{m.createdAt.slice(0, 10)}</div>
              </div>
            )
          })}
        </div>
      )}

      <MistakeModal
        open={open}
        mistake={editing}
        onClose={() => {
          setCreating(false)
          setEditing(null)
          load()
        }}
      />
    </div>
  )
}

function MistakeModal({
  open,
  mistake,
  onClose
}: {
  open: boolean
  mistake: Mistake | null
  onClose: () => void
}) {
  const { subjects } = useMeta()
  const [subjectId, setSubjectId] = useState('')
  const [chapter, setChapter] = useState('')
  const [question, setQuestion] = useState('')
  const [wrongReason, setWrongReason] = useState('')
  const [solution, setSolution] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [mastery, setMastery] = useState<Mastery>('unknown')
  const [inReview, setInReview] = useState(true)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setSubjectId(mistake?.subjectId ?? '')
    setChapter(mistake?.chapter ?? '')
    setQuestion(mistake?.question ?? '')
    setWrongReason(mistake?.wrongReason ?? '')
    setSolution(mistake?.solution ?? '')
    setImages(mistake?.images ?? [])
    setMastery(mistake?.mastery ?? 'unknown')
    setInReview(mistake ? mistake.inReview : true)
  }, [open, mistake])

  const addImageFile = async (file: File) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    const name = await window.api.mistakes.saveImage(dataUrl)
    setImages(prev => [...prev, name])
  }

  const onPaste = (e: ClipboardEvent<HTMLDivElement>) => {
    const files = [...e.clipboardData.files].filter(f => f.type.startsWith('image/'))
    if (files.length === 0) return
    e.preventDefault()
    for (const f of files) addImageFile(f)
  }

  const save = async () => {
    const questionTrimmed = question.trim()
    if (!questionTrimmed || saving) return
    setSaving(true)
    const payload = {
      subjectId: subjectId || null,
      chapter: chapter.trim() || null,
      question: questionTrimmed,
      wrongReason: wrongReason.trim() || null,
      solution: solution.trim() || null,
      images,
      mastery,
      inReview
    }
    if (mistake) await window.api.mistakes.update({ id: mistake.id, ...payload })
    else await window.api.mistakes.add(payload)
    setSaving(false)
    onClose()
  }

  const remove = async () => {
    if (!mistake) return
    if (!confirm('删除这条错题?其生成的复习卡也会一并删除。')) return
    await window.api.mistakes.remove(mistake.id)
    onClose()
  }

  return (
    <Modal open={open} title={mistake ? '编辑错题' : '新建错题'} onClose={onClose} wide>
      <div className="space-y-4" onPaste={onPaste}>
        <div className="grid grid-cols-3 gap-3">
          <Field label="科目">
            <Select className="w-full" value={subjectId} onChange={e => setSubjectId(e.target.value)}>
              <option value="">未分类</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="章节/考点">
            <Input className="w-full" value={chapter} onChange={e => setChapter(e.target.value)} placeholder="如:高数·微分中值定理" />
          </Field>
          <Field label="掌握度">
            <Select className="w-full" value={mastery} onChange={e => setMastery(e.target.value as Mastery)}>
              <option value="unknown">未掌握</option>
              <option value="fuzzy">模糊</option>
              <option value="mastered">已掌握</option>
            </Select>
          </Field>
        </div>
        <Field label="题目(必填)">
          <Textarea rows={4} value={question} onChange={e => setQuestion(e.target.value)} placeholder="题目内容,可粘贴文字;截图直接 Ctrl+V 粘贴到本弹窗" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="我的错因">
            <Textarea rows={3} value={wrongReason} onChange={e => setWrongReason(e.target.value)} placeholder="为什么做错:概念不清 / 计算失误 / 思路错误…" />
          </Field>
          <Field label="正确解法">
            <Textarea rows={3} value={solution} onChange={e => setSolution(e.target.value)} placeholder="关键步骤,复习时作为卡片背面" />
          </Field>
        </div>

        <Field label="截图">
          <div className="flex flex-wrap items-center gap-2">
            {images.map(n => (
              <div key={n} className="group relative">
                <img src={`media://${n}`} className="h-16 rounded-[10px] border border-black/[.06] object-cover" alt="截图" />
                <button
                  onClick={() => setImages(prev => prev.filter(x => x !== n))}
                  className="absolute -right-1.5 -top-1.5 flex size-5 cursor-pointer items-center justify-center rounded-full bg-bad text-white shadow"
                  title="移除"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
            <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-line px-3 text-sm text-mute transition-colors hover:border-brand/50 hover:text-ink">
              <ImagePlus size={14} />
              添加截图
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg"
                multiple
                className="hidden"
                onChange={async e => {
                  const files = [...(e.target.files ?? [])]
                  e.target.value = ''
                  for (const f of files) await addImageFile(f)
                }}
              />
            </label>
            <span className="text-xs text-mute/70">支持在弹窗内 Ctrl+V 粘贴截图</span>
          </div>
        </Field>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={inReview}
            onChange={e => setInReview(e.target.checked)}
            className="size-4 accent-[#5b8cff]"
          />
          加入复习队列(以题目为正面、解法为背面,按艾宾浩斯间隔复习)
        </label>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div>
          {mistake && (
            <IconBtn className="hover:!text-bad" onClick={remove} title="删除错题">
              <Trash2 size={16} />
            </IconBtn>
          )}
        </div>
        <div className="flex gap-2">
          <Btn onClick={onClose}>取消</Btn>
          <Btn variant="primary" disabled={!question.trim() || saving} onClick={save}>
            {saving ? '保存中…' : '保存'}
          </Btn>
        </div>
      </div>
    </Modal>
  )
}
