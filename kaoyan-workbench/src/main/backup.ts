import { app, dialog, shell } from 'electron'
import * as fs from 'node:fs'
import * as path from 'node:path'
import type { BackupExportResult, BackupImportResult } from '../shared/types'
import { getData, imagesPath, paths, replaceAll, saveImage } from './store'

interface BackupPayload {
  app: 'kaoyan-workbench'
  version: number
  savedAt: string
  data: unknown
  images: Record<string, string>
}

export async function exportBackup(): Promise<BackupExportResult> {
  const now = new Date()
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  ].join('') + '-' + [
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0')
  ].join('')
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: '导出备份',
    defaultPath: path.join(app.getPath('documents'), `kaoyan-backup-${stamp}.json`),
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })
  if (canceled || !filePath) return { canceled: true }

  const images: Record<string, string> = {}
  const dir = imagesPath()
  if (fs.existsSync(dir)) {
    for (const name of fs.readdirSync(dir)) {
      const file = path.join(dir, name)
      if (fs.statSync(file).isFile()) {
        images[name] = fs.readFileSync(file).toString('base64')
      }
    }
  }
  const payload: BackupPayload = {
    app: 'kaoyan-workbench',
    version: 1,
    savedAt: now.toISOString(),
    data: getData(),
    images
  }
  fs.writeFileSync(filePath, JSON.stringify(payload), 'utf-8')
  return { path: filePath }
}

export async function importBackup(): Promise<BackupImportResult> {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: '导入备份(将覆盖当前数据)',
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })
  if (canceled || filePaths.length === 0) return { canceled: true }

  const raw = fs.readFileSync(filePaths[0], 'utf-8')
  const payload = JSON.parse(raw) as BackupPayload
  if (payload.app !== 'kaoyan-workbench' || !payload.data) {
    throw new Error('不是有效的考研工作台备份文件')
  }

  const images = payload.images ?? {}
  for (const [name, base64] of Object.entries(images)) {
    if (!/^[\w-]+\.(png|jpe?g)$/i.test(name)) continue
    fs.writeFileSync(path.join(imagesPath(), name), Buffer.from(base64, 'base64'))
  }
  for (const mistake of (payload.data as { mistakes?: { images?: string[] }[] }).mistakes ?? []) {
    for (const name of mistake.images ?? []) {
      // 备份里缺失的图片用空占位重建,避免 media:// 404 时布局塌陷
      const file = path.join(imagesPath(), name)
      if (!fs.existsSync(file)) {
        mistake.images = (mistake.images ?? []).filter(n => n !== name)
      }
    }
  }

  replaceAll(payload.data as Parameters<typeof replaceAll>[0])
  const db = getData()
  return {
    tasks: db.tasks.length,
    sessions: db.sessions.length,
    mistakes: db.mistakes.length,
    cards: db.cards.length
  }
}

export async function openDataDir(): Promise<void> {
  await shell.openPath(paths().dataDir)
}

export { saveImage }
