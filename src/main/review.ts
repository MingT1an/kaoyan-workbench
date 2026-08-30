import { and, asc, eq, lte, sql } from 'drizzle-orm'
import { getDb } from './db'
import { reviewItems, reviewLogs, settings } from './schema'
import { SETTING_KEYS, type ReviewItem, type ReviewResult, type ReviewStats } from '../shared/types'

function localDateStr(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function today(): string {
  return localDateStr(new Date())
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`)
  d.setDate(d.getDate() + days)
  return localDateStr(d)
}

/** 艾宾浩斯间隔序列(天),可在设置中自定义 */
export function reviewIntervals(): number[] {
  const rows = getDb()
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, SETTING_KEYS.reviewIntervals))
    .all()
  const parsed = String(rows[0]?.value ?? '')
    .split(',')
    .map((n) => Number(n.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
  return parsed.length > 0 ? parsed : [1, 2, 4, 7, 15, 30]
}

export function createReview(input: {
  title: string
  content?: string | null
  sourceType?: 'note' | 'mistake' | null
  sourceId?: number | null
}): ReviewItem {
  const title = String(input?.title ?? '').trim()
  if (!title) throw new Error('复习项标题不能为空')
  const intervals = reviewIntervals()
  const nowIso = new Date().toISOString()
  const inserted = getDb()
    .insert(reviewItems)
    .values({
      sourceType: input?.sourceType ?? 'note',
      sourceId: input?.sourceId ?? null,
      title,
      content: typeof input?.content === 'string' && input.content.trim() ? input.content : null,
      intervalIndex: 0,
      nextDueDate: addDays(today(), intervals[0]),
      createdAt: nowIso,
      updatedAt: nowIso
    })
    .returning()
    .all()
  return inserted[0]
}

/** 到期项(含过期未复习的) */
export function dueItems(): ReviewItem[] {
  return getDb()
    .select()
    .from(reviewItems)
    .where(and(eq(reviewItems.deleted, 0), lte(reviewItems.nextDueDate, today())))
    .orderBy(asc(reviewItems.nextDueDate), asc(reviewItems.id))
    .all()
}

export function upcomingItems(): ReviewItem[] {
  return getDb()
    .select()
    .from(reviewItems)
    .where(and(eq(reviewItems.deleted, 0), sql`${reviewItems.nextDueDate} > ${today()}`))
    .orderBy(asc(reviewItems.nextDueDate), asc(reviewItems.id))
    .all()
}

export function allItems(): ReviewItem[] {
  return getDb()
    .select()
    .from(reviewItems)
    .where(eq(reviewItems.deleted, 0))
    .orderBy(asc(reviewItems.nextDueDate), asc(reviewItems.id))
    .all()
}

/**
 * 复习自评:
 * - 记得:进入下一间隔
 * - 模糊:停留当前间隔(明天再来)
 * - 忘了:回到第一间隔
 */
export function gradeReview(id: number, result: ReviewResult): ReviewItem {
  const db = getDb()
  const rows = db.select().from(reviewItems).where(eq(reviewItems.id, Number(id))).all()
  const item = rows[0]
  if (!item) throw new Error('复习项不存在')
  const intervals = reviewIntervals()
  let nextIndex = item.intervalIndex
  if (result === 'remember') nextIndex = Math.min(item.intervalIndex + 1, intervals.length - 1)
  if (result === 'forgot') nextIndex = 0
  const gap = result === 'fuzzy' ? 1 : intervals[nextIndex]
  const nowIso = new Date().toISOString()
  db.insert(reviewLogs)
    .values({
      itemId: item.id,
      reviewedAt: nowIso,
      result,
      createdAt: nowIso,
      updatedAt: nowIso
    })
    .run()
  const updated = db
    .update(reviewItems)
    .set({ intervalIndex: nextIndex, nextDueDate: addDays(today(), gap), updatedAt: nowIso })
    .where(eq(reviewItems.id, item.id))
    .returning()
    .all()
  return updated[0]
}

export function removeReview(id: number): void {
  getDb()
    .update(reviewItems)
    .set({ deleted: 1, updatedAt: new Date().toISOString() })
    .where(eq(reviewItems.id, Number(id)))
    .run()
}

export function reviewStats(): ReviewStats {
  const db = getDb()
  const totalRows = db
    .select({ c: sql<number>`count(*)` })
    .from(reviewItems)
    .where(eq(reviewItems.deleted, 0))
    .all()
  const dueRows = db
    .select({ c: sql<number>`count(*)` })
    .from(reviewItems)
    .where(and(eq(reviewItems.deleted, 0), lte(reviewItems.nextDueDate, today())))
    .all()
  const todayIso = new Date().toISOString().slice(0, 10)
  const logRows = db
    .select({ reviewedAt: reviewLogs.reviewedAt })
    .from(reviewLogs)
    .where(eq(reviewLogs.deleted, 0))
    .all()
  return {
    total: Number(totalRows[0]?.c ?? 0),
    due: Number(dueRows[0]?.c ?? 0),
    reviewedToday: logRows.filter((r) => r.reviewedAt.slice(0, 10) === todayIso).length
  }
}
