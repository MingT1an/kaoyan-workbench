import { useCallback, useEffect, useState } from 'react'
import { Plus, RefreshCcw, Trash2 } from 'lucide-react'
import type { CardInput, CardsBoard, ReviewCard, ReviewResult } from '@shared/types'
import { fmtShort, weekdayCN } from '@shared/util'
import { useMeta } from '../ctx'
import { Badge, Btn, Card, Empty, Field, IconBtn, Modal, Select, SubjectChip, Textarea } from '../components/ui'

const RESULT_LABEL: Record<ReviewResult, string> = {
  remember: '记得',
  fuzzy: '模糊',
  forgot: '忘了'
}

export function ReviewPage() {
  const { subjects, settings, refreshDue } = useMeta()
  const [board, setBoard] = useState<CardsBoard | null>(null)
  const [flipped, setFlipped] = useState(false)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    const b = await window.api.cards.board()
    setBoard(b)
    setFlipped(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const review = async (result: ReviewResult) => {
    if (!board || board.due.length === 0) return
    await window.api.cards.review(board.due[0].id, result)
    await load()
    await refreshDue()
  }

  const delCard = async (id: string) => {
    if (!confirm('删除这张复习卡?(不会删除来源错题)')) return
    await window.api.cards.remove(id)
    await load()
    await refreshDue()
  }

  const total = board?.total ?? 0
  const dueCount = board?.due.length ?? 0
  const card: ReviewCard | null = board && board.due.length > 0 ? board.due[0] : null

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          复习{' '}
          <span className="ml-1 text-sm font-normal text-mute">
            到期 {dueCount} · 今日已复习 {board?.reviewedToday ?? 0} · 共 {total} 张
          </span>
        </h1>
        <Btn variant="primary" onClick={() => setCreating(true)}>
          <Plus size={14} />
          新建卡片
        </Btn>
      </div>

      {!board ? null : card ? (
        <Card>
          <div className="flex items-center justify-between text-xs text-mute">
            <span>
              第 {Math.max(1, (board.reviewedToday ?? 0) + 1)} 张 · 剩余 {dueCount} 张
            </span>
            <div className="flex items-center gap-2">
              <SubjectChip subjects={subjects} subjectId={card.subjectId} />
              <span>间隔 {settings.reviewIntervals[Math.min(card.intervalIndex, settings.reviewIntervals.length - 1)]} 天</span>
              {card.lastResult && <Badge tone="muted">上次:{RESULT_LABEL[card.lastResult]}</Badge>}
              <IconBtn className="hover:!text-bad" title="删除卡片" onClick={() => delCard(card.id)}>
                <Trash2 size={14} />
              </IconBtn>
            </div>
          </div>

          <div className="mt-4 min-h-32 whitespace-pre-wrap text-[15px] leading-relaxed">{card.title}</div>

          {flipped ? (
            <>
              <div className="my-4 border-t border-black/[.08]" />
              <div className="min-h-20 whitespace-pre-wrap text-sm leading-relaxed text-mute">
                {card.content || '(没有填写答案)'}
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3">
                <Btn variant="danger" onClick={() => review('forgot')}>
                  忘了
                </Btn>
                <Btn variant="warn" onClick={() => review('fuzzy')}>
                  模糊
                </Btn>
                <Btn variant="ok" onClick={() => review('remember')}>
                  记得
                </Btn>
              </div>
            </>
          ) : (
            <Btn variant="primary" className="mt-6 w-full" onClick={() => setFlipped(true)}>
              显示答案
            </Btn>
          )}
        </Card>
      ) : (
        <Card>
          <div className="py-8 text-center">
            <div className="text-4xl">🎉</div>
            <div className="mt-3 text-sm">
              {total === 0 ? '还没有复习卡片,从错题本录入或新建一张吧' : '今日复习完成,卡片已全部清空'}
            </div>
          </div>
        </Card>
      )}

      {board && board.upcoming.length > 0 && (
        <Card title={`即将到来 · ${board.upcoming.length} 张`}>
          <div className="space-y-1">
            {board.upcoming.slice(0, 10).map(c => (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-black/[.04]"
              >
                <span className="w-24 shrink-0 text-xs tabular-nums text-mute">
                  {fmtShort(c.nextDue)} {weekdayCN(c.nextDue)}
                </span>
                <span className="flex-1 truncate">{c.title}</span>
                <SubjectChip subjects={subjects} subjectId={c.subjectId} />
                {c.sourceType === 'mistake' && <Badge tone="brand">错题</Badge>}
              </div>
            ))}
          </div>
        </Card>
      )}

      <CardModal
        open={creating}
        onClose={async () => {
          setCreating(false)
          await load()
          await refreshDue()
        }}
      />
    </div>
  )
}

function CardModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { subjects } = useMeta()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [subjectId, setSubjectId] = useState('')

  useEffect(() => {
    if (!open) return
    setTitle('')
    setContent('')
    setSubjectId('')
  }, [open])

  const save = async () => {
    const t = title.trim()
    if (!t) return
    const input: CardInput = {
      title: t,
      content: content.trim() || null,
      subjectId: subjectId || null
    }
    await window.api.cards.add(input)
    onClose()
  }

  return (
    <Modal open={open} title="新建复习卡片" onClose={onClose}>
      <div className="space-y-4">
        <Field label="正面(题目/知识点)">
          <Textarea rows={3} value={title} onChange={e => setTitle(e.target.value)} autoFocus />
        </Field>
        <Field label="背面(答案/要点)">
          <Textarea rows={3} value={content} onChange={e => setContent(e.target.value)} />
        </Field>
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
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Btn onClick={onClose}>取消</Btn>
        <Btn variant="primary" disabled={!title.trim()} onClick={save}>
          保存(今日到期)
        </Btn>
      </div>
    </Modal>
  )
}

export { RefreshCcw }
