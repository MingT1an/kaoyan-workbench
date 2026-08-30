import { app, ipcMain } from 'electron'
import { and, asc, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm'
import { getDb, getDbPath } from './db'
import { settings, subjects, tasks } from './schema'
import { calendar, todayFocus } from './sessions'
import { cancel, getState, pause, resume, startFocus } from './timer'
import type {
  SubjectInput,
  SubjectUpdate,
  TaskInput,
  TaskUpdate,
  TimerStartInput
} from '../shared/types'

function now(): string {
  return new Date().toISOString()
}

const COLOR_RE = /^#[0-9a-fA-F]{6}$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const REPEAT_RULE_RE = /^(daily|weekdays:(?:[0-6](?:,[0-6])*))$/

export function registerIpc(): void {
  ipcMain.handle('subjects:list', () => {
    return getDb()
      .select()
      .from(subjects)
      .where(eq(subjects.deleted, 0))
      .orderBy(asc(subjects.sortOrder), asc(subjects.id))
      .all()
  })

  ipcMain.handle('subjects:create', (_event, input: SubjectInput) => {
    const name = String(input?.name ?? '').trim()
    if (!name) throw new Error('科目名称不能为空')
    const rawColor = typeof input?.color === 'string' ? input.color : ''
    const color = COLOR_RE.test(rawColor) ? rawColor : '#6366f1'
    const rows = getDb()
      .select({ maxOrder: sql<number>`coalesce(max(${subjects.sortOrder}), 0)` })
      .from(subjects)
      .where(eq(subjects.deleted, 0))
      .all()
    const maxOrder = Number(rows[0]?.maxOrder ?? 0)
    const inserted = getDb()
      .insert(subjects)
      .values({ name, color, sortOrder: maxOrder + 1, createdAt: now(), updatedAt: now() })
      .returning()
      .all()
    return inserted[0]
  })

  ipcMain.handle('subjects:update', (_event, input: SubjectUpdate) => {
    const patch: { name?: string; color?: string; updatedAt: string } = { updatedAt: now() }
    if (typeof input?.name === 'string') {
      const name = input.name.trim()
      if (!name) throw new Error('科目名称不能为空')
      patch.name = name
    }
    if (typeof input?.color === 'string' && COLOR_RE.test(input.color)) {
      patch.color = input.color
    }
    const updated = getDb()
      .update(subjects)
      .set(patch)
      .where(eq(subjects.id, input.id))
      .returning()
      .all()
    return updated[0]
  })

  ipcMain.handle('subjects:remove', (_event, id: number) => {
    getDb()
      .update(subjects)
      .set({ deleted: 1, updatedAt: now() })
      .where(eq(subjects.id, id))
      .run()
  })

  ipcMain.handle('settings:all', () => {
    const rows = getDb().select().from(settings).all()
    return Object.fromEntries(rows.map((row) => [row.key, row.value]))
  })

  ipcMain.handle('settings:set', (_event, payload: { key: string; value: string }) => {
    const key = String(payload?.key ?? '')
    const value = String(payload?.value ?? '')
    if (!key) throw new Error('设置键不能为空')
    getDb()
      .insert(settings)
      .values({ key, value, updatedAt: now() })
      .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: now() } })
      .run()
  })

  ipcMain.handle('app:info', () => ({ dbPath: getDbPath(), version: app.getVersion() }))

  // ---------- 番茄钟 ----------

  ipcMain.handle('timer:getState', () => getState())

  ipcMain.handle('timer:start', (_event, input: TimerStartInput) =>
    startFocus({
      taskId: input?.taskId != null ? Number(input.taskId) : null,
      subjectId: input?.subjectId != null ? Number(input.subjectId) : null
    })
  )

  ipcMain.handle('timer:pause', () => pause())
  ipcMain.handle('timer:resume', () => resume())
  ipcMain.handle('timer:cancel', () => cancel())

  // ---------- 专注统计 ----------

  ipcMain.handle('sessions:today', () => todayFocus())
  ipcMain.handle('sessions:calendar', () => calendar())

  // ---------- 任务 ----------

  /** 重复规则是否匹配某日期(模板的 date 为起始日) */
  function ruleMatches(rule: string, date: string, startDate: string): boolean {
    if (date < startDate) return false
    if (rule === 'daily') return true
    if (rule.startsWith('weekdays:')) {
      const weekdays = rule
        .slice('weekdays:'.length)
        .split(',')
        .map((n) => Number(n.trim()))
      const d = new Date(`${date}T00:00:00`)
      return !Number.isNaN(d.getTime()) && weekdays.includes(d.getDay())
    }
    return false
  }

  /** 为日期 D 补齐重复任务的当日实例(已删除的实例不会被重建) */
  function materializeRepeats(date: string): void {
    const db = getDb()
    const templates = db
      .select()
      .from(tasks)
      .where(and(eq(tasks.deleted, 0), isNotNull(tasks.repeatRule)))
      .all()
    for (const tpl of templates) {
      if (!tpl.repeatRule) continue
      if (!ruleMatches(tpl.repeatRule, date, tpl.date)) continue
      const existing = db
        .select({ id: tasks.id })
        .from(tasks)
        .where(and(eq(tasks.repeatOf, tpl.id), eq(tasks.date, date)))
        .all()
      if (existing.length > 0) continue
      const ts = now()
      db.insert(tasks)
        .values({
          subjectId: tpl.subjectId,
          title: tpl.title,
          date,
          estimatedMinutes: tpl.estimatedMinutes,
          priority: tpl.priority,
          status: 'todo',
          repeatOf: tpl.id,
          note: tpl.note,
          createdAt: ts,
          updatedAt: ts
        })
        .run()
    }
  }

  const taskSelection = {
    id: tasks.id,
    subjectId: tasks.subjectId,
    title: tasks.title,
    date: tasks.date,
    estimatedMinutes: tasks.estimatedMinutes,
    priority: tasks.priority,
    status: tasks.status,
    repeatRule: tasks.repeatRule,
    repeatOf: tasks.repeatOf,
    note: tasks.note,
    createdAt: tasks.createdAt,
    updatedAt: tasks.updatedAt,
    subjectName: subjects.name,
    subjectColor: subjects.color
  }

  ipcMain.handle('tasks:listByDate', (_event, date: string) => {
    if (typeof date !== 'string' || !DATE_RE.test(date)) throw new Error('日期格式无效')
    materializeRepeats(date)
    return getDb()
      .select(taskSelection)
      .from(tasks)
      .leftJoin(subjects, eq(tasks.subjectId, subjects.id))
      .where(and(eq(tasks.date, date), eq(tasks.deleted, 0), isNull(tasks.repeatRule)))
      .orderBy(desc(tasks.priority), asc(tasks.id))
      .all()
  })

  ipcMain.handle('tasks:templates', () => {
    return getDb()
      .select(taskSelection)
      .from(tasks)
      .leftJoin(subjects, eq(tasks.subjectId, subjects.id))
      .where(and(eq(tasks.deleted, 0), isNotNull(tasks.repeatRule)))
      .orderBy(asc(tasks.id))
      .all()
  })

  ipcMain.handle('tasks:create', (_event, input: TaskInput) => {
    const title = String(input?.title ?? '').trim()
    if (!title) throw new Error('任务标题不能为空')
    const date = String(input?.date ?? '')
    if (!DATE_RE.test(date)) throw new Error('日期格式无效')
    const repeatRule =
      input?.repeatRule && REPEAT_RULE_RE.test(String(input.repeatRule))
        ? String(input.repeatRule)
        : null
    const estimatedMinutes =
      input?.estimatedMinutes != null && Number(input.estimatedMinutes) > 0
        ? Math.round(Number(input.estimatedMinutes))
        : null
    const subjectId =
      input?.subjectId != null && Number.isInteger(Number(input.subjectId))
        ? Number(input.subjectId)
        : null
    const ts = now()
    const inserted = getDb()
      .insert(tasks)
      .values({
        subjectId,
        title,
        date,
        estimatedMinutes,
        priority: 0,
        status: 'todo',
        repeatRule,
        note: typeof input?.note === 'string' ? input.note : null,
        createdAt: ts,
        updatedAt: ts
      })
      .returning()
      .all()
    return inserted[0]
  })

  ipcMain.handle('tasks:update', (_event, input: TaskUpdate) => {
    const id = Number(input?.id)
    if (!Number.isInteger(id)) throw new Error('无效的任务 ID')
    const patch: Record<string, unknown> = { updatedAt: now() }
    if (typeof input?.title === 'string') {
      const title = input.title.trim()
      if (!title) throw new Error('任务标题不能为空')
      patch.title = title
    }
    if (typeof input?.date === 'string') {
      if (!DATE_RE.test(input.date)) throw new Error('日期格式无效')
      patch.date = input.date
    }
    if (input?.status !== undefined) {
      if (input.status !== 'todo' && input.status !== 'done') throw new Error('无效的状态')
      patch.status = input.status
    }
    if (input?.subjectId !== undefined) {
      patch.subjectId =
        input.subjectId != null && Number.isInteger(Number(input.subjectId))
          ? Number(input.subjectId)
          : null
    }
    if (input?.estimatedMinutes !== undefined) {
      patch.estimatedMinutes =
        input.estimatedMinutes != null && Number(input.estimatedMinutes) > 0
          ? Math.round(Number(input.estimatedMinutes))
          : null
    }
    if (input?.note !== undefined) {
      patch.note = typeof input.note === 'string' ? input.note : null
    }
    const updated = getDb()
      .update(tasks)
      .set(patch)
      .where(eq(tasks.id, id))
      .returning()
      .all()
    return updated[0]
  })

  ipcMain.handle('tasks:toggle', (_event, id: number) => {
    const rows = getDb().select().from(tasks).where(eq(tasks.id, Number(id))).all()
    const row = rows[0]
    if (!row) throw new Error('任务不存在')
    const next = row.status === 'done' ? 'todo' : 'done'
    const updated = getDb()
      .update(tasks)
      .set({ status: next, updatedAt: now() })
      .where(eq(tasks.id, Number(id)))
      .returning()
      .all()
    return updated[0]
  })

  ipcMain.handle('tasks:remove', (_event, id: number) => {
    getDb()
      .update(tasks)
      .set({ deleted: 1, updatedAt: now() })
      .where(eq(tasks.id, Number(id)))
      .run()
  })
}
