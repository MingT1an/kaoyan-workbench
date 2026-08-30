import { app } from 'electron'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { randomUUID } from 'node:crypto'
import type {
  FocusSession,
  Mistake,
  ReviewCard,
  Settings,
  Subject,
  Task
} from '../shared/types'

export const DEFAULT_SETTINGS: Settings = {
  examDate: '2026-12-26',
  phases: [
    { id: 'basic', name: '基础阶段', start: '2026-03-01', end: '2026-07-31' },
    { id: 'strengthen', name: '强化阶段', start: '2026-08-01', end: '2026-10-31' },
    { id: 'sprint', name: '冲刺阶段', start: '2026-11-01', end: '2026-12-25' }
  ],
  focusMinutes: 25,
  breakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
  dailyGoalPomodoros: 4,
  reviewIntervals: [1, 2, 4, 7, 15, 30],
  closeToTray: true,
  autoStartBreak: true
}

export const DEFAULT_SUBJECTS: Subject[] = [
  { id: 'politics', name: '政治', color: '#ff9500', order: 0 },
  { id: 'english', name: '英语', color: '#34c759', order: 1 },
  { id: 'math', name: '数学', color: '#007aff', order: 2 },
  { id: 'major', name: '专业课', color: '#af52de', order: 3 }
]

export interface DBData {
  version: number
  settings: Settings
  subjects: Subject[]
  tasks: Task[]
  sessions: FocusSession[]
  mistakes: Mistake[]
  cards: ReviewCard[]
}

let data: DBData
let dataDir = ''
let dataFile = ''
let imagesDir = ''
let saveTimer: NodeJS.Timeout | null = null

export function initStore(): void {
  dataDir = app.getPath('userData')
  imagesDir = path.join(dataDir, 'images')
  fs.mkdirSync(imagesDir, { recursive: true })
  dataFile = path.join(dataDir, 'data.json')

  let loaded: Partial<DBData> = {}
  try {
    loaded = JSON.parse(fs.readFileSync(dataFile, 'utf-8')) as Partial<DBData>
  } catch {
    loaded = {}
  }

  data = {
    version: 1,
    settings: { ...DEFAULT_SETTINGS, ...(loaded.settings ?? {}) },
    subjects: loaded.subjects && loaded.subjects.length > 0 ? loaded.subjects : DEFAULT_SUBJECTS,
    tasks: loaded.tasks ?? [],
    sessions: loaded.sessions ?? [],
    mistakes: loaded.mistakes ?? [],
    cards: loaded.cards ?? []
  }
  if (!fs.existsSync(dataFile)) flush()
}

export function getData(): DBData {
  return data
}

export function update(fn: (db: DBData) => void): void {
  fn(data)
  scheduleSave()
}

export function replaceAll(next: DBData): void {
  data = {
    version: 1,
    settings: { ...DEFAULT_SETTINGS, ...(next.settings ?? {}) },
    subjects: next.subjects && next.subjects.length > 0 ? next.subjects : DEFAULT_SUBJECTS,
    tasks: next.tasks ?? [],
    sessions: next.sessions ?? [],
    mistakes: next.mistakes ?? [],
    cards: next.cards ?? []
  }
  flush()
}

function scheduleSave(): void {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(flush, 400)
}

/** 临时文件 + 原子替换,避免写一半崩溃损坏数据 */
export function flush(): void {
  if (!dataFile) return
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  const tmp = `${dataFile}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8')
  fs.renameSync(tmp, dataFile)
}

export function paths(): { dataDir: string; dataFile: string; imagesDir: string } {
  return { dataDir, dataFile, imagesDir }
}

export function imagesPath(): string {
  return imagesDir
}

export function newId(): string {
  return randomUUID()
}

const IMAGE_RE = /^data:image\/(png|jpe?g);base64,(.+)$/

export function saveImage(dataUrl: string): string {
  const m = IMAGE_RE.exec(dataUrl)
  if (!m) throw new Error('无效的图片数据')
  const ext = m[1] === 'png' ? 'png' : 'jpg'
  const name = `${randomUUID()}.${ext}`
  fs.writeFileSync(path.join(imagesDir, name), Buffer.from(m[2], 'base64'))
  return name
}
