import { app, BrowserWindow, dialog } from 'electron'
import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { getDb } from './db'
import { mistakes, reviewItems, reviewLogs, sessions, settings, subjects, tasks } from './schema'

function dumpAll(): Record<string, unknown> {
  const db = getDb()
  const now = new Date()
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`
  return {
    exportedAt: now.toISOString(),
    appVersion: app.getVersion(),
    date,
    subjects: db.select().from(subjects).all(),
    tasks: db.select().from(tasks).all(),
    sessions: db.select().from(sessions).all(),
    reviewItems: db.select().from(reviewItems).all(),
    reviewLogs: db.select().from(reviewLogs).all(),
    mistakes: db.select().from(mistakes).all(),
    settings: db.select().from(settings).all()
  }
}

/** 每次启动自动备份到 userData/backups,保留最近 14 份 */
export function autoBackup(): void {
  try {
    const dir = join(app.getPath('userData'), 'backups')
    mkdirSync(dir, { recursive: true })
    const dump = dumpAll()
    writeFileSync(
      join(dir, `kaoyan-backup-${String(dump.date)}.json`),
      JSON.stringify(dump)
    )
    const files = readdirSync(dir)
      .filter((f) => f.startsWith('kaoyan-backup-') && f.endsWith('.json'))
      .sort()
    while (files.length > 14) {
      const oldest = files.shift()
      if (oldest) unlinkSync(join(dir, oldest))
    }
  } catch (err) {
    console.error('[backup] 自动备份失败', err)
  }
}

export function backupsDir(): string {
  return join(app.getPath('userData'), 'backups')
}

/** 手动导出:弹保存对话框,返回保存路径(取消返回 null) */
export async function exportData(): Promise<string | null> {
  const win = BrowserWindow.getAllWindows()[0]
  const now = new Date()
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}`
  const res = await dialog.showSaveDialog(win, {
    title: '导出数据备份',
    defaultPath: `kaoyan-backup-${date}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })
  if (res.canceled || !res.filePath) return null
  writeFileSync(res.filePath, JSON.stringify(dumpAll(), null, 2))
  return res.filePath
}
