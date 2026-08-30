import type { ReviewCard, ReviewResult } from '../shared/types'
import { addDays, todayStr } from '../shared/util'
import { getData, newId, update } from './store'

export function isDue(card: ReviewCard, today: string): boolean {
  return card.nextDue <= today
}

/**
 * 艾宾浩斯调度:
 * 记得 → 进入下一档(按间隔表排期);模糊 → 档位不变、明天再见;忘了 → 回到第 0 档(明天再见)。
 */
export function scheduleCard(card: ReviewCard, result: ReviewResult): void {
  const intervals = getData().settings.reviewIntervals
  let idx = card.intervalIndex
  if (result === 'remember') {
    idx = Math.min(idx + 1, intervals.length - 1)
    card.nextDue = addDays(todayStr(), intervals[idx])
  } else {
    if (result === 'forgot') idx = 0
    card.nextDue = addDays(todayStr(), 1)
  }
  card.intervalIndex = idx
  card.lastResult = result
  card.lastReviewedAt = new Date().toISOString()
}

const MASTERY_BY_RESULT: Record<ReviewResult, 'unknown' | 'fuzzy' | 'mastered'> = {
  forgot: 'unknown',
  fuzzy: 'fuzzy',
  remember: 'mastered'
}

/** 复习结果回写来源错题的掌握度 */
export function syncMistakeMastery(card: ReviewCard, result: ReviewResult): void {
  if (card.sourceType !== 'mistake' || !card.sourceId) return
  update(db => {
    const mistake = db.mistakes.find(m => m.id === card.sourceId)
    if (mistake) mistake.mastery = MASTERY_BY_RESULT[result]
  })
}

/** 错题加入复习队列:以题目为正面、解法为背面 */
export function createCardFromMistake(mistakeId: string): ReviewCard | null {
  const db = getData()
  const exists = db.cards.find(c => c.sourceType === 'mistake' && c.sourceId === mistakeId)
  if (exists) return exists
  const mistake = db.mistakes.find(m => m.id === mistakeId)
  if (!mistake) return null
  const card: ReviewCard = {
    id: newId(),
    sourceType: 'mistake',
    sourceId: mistake.id,
    subjectId: mistake.subjectId,
    title: mistake.question,
    content: mistake.solution,
    intervalIndex: 0,
    nextDue: todayStr(),
    lastResult: null,
    lastReviewedAt: null,
    createdAt: new Date().toISOString()
  }
  update(db2 => {
    db2.cards.push(card)
  })
  return card
}
