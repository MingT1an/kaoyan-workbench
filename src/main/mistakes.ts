import { and, desc, eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'
import { getDb } from './db'
import { mistakes, reviewItems, subjects } from './schema'
import { createReview } from './review'
import type { Mastery, Mistake, MistakeInput } from '../shared/types'

const MASTERY_VALUES: Mastery[] = ['unknown', 'fuzzy', 'mastered']

export const rowSelection = {
  id: mistakes.id,
  subjectId: mistakes.subjectId,
  chapter: mistakes.chapter,
  question: mistakes.question,
  imagePath: mistakes.imagePath,
  wrongReason: mistakes.wrongReason,
  solution: mistakes.solution,
  mastery: mistakes.mastery,
  createdAt: mistakes.createdAt,
  updatedAt: mistakes.updatedAt,
  subjectName: subjects.name,
  subjectColor: subjects.color
}

type CoreRow = {
  id: number
  subjectId: number | null
  chapter: string | null
  question: string
  imagePath: string | null
  wrongReason: string | null
  solution: string | null
  mastery: string
  createdAt: string
  updatedAt: string
  subjectName?: string | null
  subjectColor?: string | null
}

function withInReview(rows: CoreRow[]): Mistake[] {
  const db = getDb()
  const linked = new Set(
    db
      .select({ sourceId: reviewItems.sourceId })
      .from(reviewItems)
      .where(and(eq(reviewItems.deleted, 0), eq(reviewItems.sourceType, 'mistake')))
      .all()
      .map((r) => r.sourceId)
  )
  return rows.map((r) => ({
    ...r,
    subjectName: r.subjectName ?? null,
    subjectColor: r.subjectColor ?? null,
    mastery: (MASTERY_VALUES.includes(r.mastery as Mastery) ? r.mastery : 'unknown') as Mastery,
    inReview: linked.has(r.id)
  }))
}

export function listMistakes(filter: {
  subjectId?: number | null
  mastery?: Mastery | null
}): Mistake[] {
  const conds = [eq(mistakes.deleted, 0)]
  if (filter.subjectId != null) conds.push(eq(mistakes.subjectId, filter.subjectId))
  if (filter.mastery) conds.push(eq(mistakes.mastery, filter.mastery))
  const rows = getDb()
    .select(rowSelection)
    .from(mistakes)
    .leftJoin(subjects, eq(mistakes.subjectId, subjects.id))
    .where(and(...conds))
    .orderBy(desc(mistakes.id))
    .all()
  return withInReview(rows)
}

export function createMistake(input: MistakeInput): Mistake {
  const question = String(input?.question ?? '').trim()
  if (!question) throw new Error('题干不能为空')
  const nowIso = new Date().toISOString()
  const inserted = getDb()
    .insert(mistakes)
    .values({
      subjectId: input?.subjectId ?? null,
      chapter: input?.chapter?.trim() || null,
      question,
      imagePath: input?.imagePath ?? null,
      wrongReason: input?.wrongReason?.trim() || null,
      solution: input?.solution?.trim() || null,
      mastery: input?.mastery ?? 'unknown',
      createdAt: nowIso,
      updatedAt: nowIso
    })
    .returning()
    .all()
  return withInReview([inserted[0] as CoreRow])[0]
}

export function updateMistake(
  id: number,
  patch: { mastery?: Mastery; chapter?: string; wrongReason?: string; solution?: string }
): Mistake | undefined {
  const set: Record<string, unknown> = { updatedAt: new Date().toISOString() }
  if (patch.mastery && MASTERY_VALUES.includes(patch.mastery)) set.mastery = patch.mastery
  if (patch.chapter !== undefined) set.chapter = patch.chapter.trim() || null
  if (patch.wrongReason !== undefined) set.wrongReason = patch.wrongReason.trim() || null
  if (patch.solution !== undefined) set.solution = patch.solution.trim() || null
  const updated = getDb()
    .update(mistakes)
    .set(set)
    .where(eq(mistakes.id, Number(id)))
    .returning()
    .all()
  const row = updated[0] as CoreRow | undefined
  return row ? withInReview([row])[0] : undefined
}

export function removeMistake(id: number): void {
  getDb()
    .update(mistakes)
    .set({ deleted: 1, updatedAt: new Date().toISOString() })
    .where(eq(mistakes.id, Number(id)))
    .run()
}

/** 错题一键加入复习队列:标题取题干摘要,内容为错因+思路 */
export function linkMistakeToReview(id: number): void {
  const rows = getDb()
    .select()
    .from(mistakes)
    .where(and(eq(mistakes.id, Number(id)), eq(mistakes.deleted, 0)))
    .all()
  const m = rows[0]
  if (!m) throw new Error('错题不存在')
  const already = getDb()
    .select({ id: reviewItems.id })
    .from(reviewItems)
    .where(
      and(
        eq(reviewItems.deleted, 0),
        eq(reviewItems.sourceType, 'mistake'),
        eq(reviewItems.sourceId, m.id)
      )
    )
    .all()
  if (already.length > 0) throw new Error('该错题已在复习队列中')
  const parts = [
    m.wrongReason ? `错因:${m.wrongReason}` : null,
    m.solution ? `思路:${m.solution}` : null
  ].filter(Boolean)
  createReview({
    title: m.question.length > 40 ? `${m.question.slice(0, 40)}…` : m.question,
    content: parts.length > 0 ? parts.join('\n') : null,
    sourceType: 'mistake',
    sourceId: m.id
  })
}

/** 保存粘贴的截图(dataURL),返回相对文件名 */
export function saveMistakeImage(dataUrl: string): string {
  const match = /^data:image\/(png|jpeg|webp);base64,(.+)$/.exec(dataUrl)
  if (!match) throw new Error('不支持的图片格式')
  const dir = join(app.getPath('userData'), 'images')
  mkdirSync(dir, { recursive: true })
  const file = `${Date.now()}-${randomUUID().slice(0, 8)}.${match[1] === 'jpeg' ? 'jpg' : match[1]}`
  writeFileSync(join(dir, file), Buffer.from(match[2], 'base64'))
  return file
}

/** 读取截图为 dataURL 供渲染层显示 */
export function readMistakeImage(file: string): string {
  if (!/^[a-zA-Z0-9._-]+$/.test(file)) throw new Error('非法文件名')
  const buf = readFileSync(join(app.getPath('userData'), 'images', file))
  const ext = file.endsWith('.jpg') ? 'jpeg' : file.endsWith('.webp') ? 'webp' : 'png'
  return `data:image/${ext};base64,${buf.toString('base64')}`
}
