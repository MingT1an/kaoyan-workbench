import { app, ipcMain } from 'electron'
import { asc, eq, sql } from 'drizzle-orm'
import { getDb, getDbPath } from './db'
import { settings, subjects } from './schema'
import type { SubjectInput, SubjectUpdate } from '../shared/types'

function now(): string {
  return new Date().toISOString()
}

const COLOR_RE = /^#[0-9a-fA-F]{6}$/

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
}
