import { join } from 'node:path'
import { app } from 'electron'
import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'
import { DEFAULT_SETTINGS } from '../shared/types'

let sqlite: Database.Database | null = null
let db: BetterSQLite3Database<typeof schema> | null = null
let dbPath = ''

const DDL = `
CREATE TABLE IF NOT EXISTS subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id INTEGER REFERENCES subjects(id),
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  estimated_minutes INTEGER,
  priority INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'todo',
  repeat_rule TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER REFERENCES tasks(id),
  subject_id INTEGER REFERENCES subjects(id),
  started_at TEXT NOT NULL,
  ended_at TEXT,
  planned_minutes INTEGER NOT NULL,
  actual_minutes INTEGER,
  status TEXT NOT NULL DEFAULT 'running',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS mistakes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id INTEGER REFERENCES subjects(id),
  chapter TEXT,
  question TEXT NOT NULL,
  image_path TEXT,
  wrong_reason TEXT,
  solution TEXT,
  mastery TEXT NOT NULL DEFAULT 'unknown',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS review_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_type TEXT,
  source_id INTEGER,
  title TEXT NOT NULL,
  content TEXT,
  interval_index INTEGER NOT NULL DEFAULT 0,
  next_due_date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS review_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL REFERENCES review_items(id),
  reviewed_at TEXT NOT NULL,
  result TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (!db) throw new Error('数据库尚未初始化')
  return db
}

export function getDbPath(): string {
  return dbPath
}

export function initDatabase(): void {
  dbPath = join(app.getPath('userData'), 'kaoyan.db')
  sqlite = new Database(dbPath)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  sqlite.exec(DDL)
  migrate(sqlite)
  db = drizzle(sqlite, { schema })
  seed()
}

/** 老库升级:逐版本补充新增列 */
function migrate(sqlite: Database.Database): void {
  const cols = (table: string): string[] =>
    (sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map(
      (c) => c.name
    )

  if (!cols('tasks').includes('repeat_of')) {
    sqlite.exec('ALTER TABLE tasks ADD COLUMN repeat_of INTEGER REFERENCES tasks(id)')
  }
}

function seed(): void {
  const now = new Date().toISOString()
  const countRow = sqlite?.prepare('SELECT COUNT(*) AS c FROM subjects').get() as
    | { c: number }
    | undefined
  if (!countRow || countRow.c === 0) {
    getDb()
      .insert(schema.subjects)
      .values([
        { name: '政治', color: '#3b82f6', sortOrder: 1, createdAt: now, updatedAt: now },
        { name: '英语', color: '#10b981', sortOrder: 2, createdAt: now, updatedAt: now },
        { name: '数学', color: '#f59e0b', sortOrder: 3, createdAt: now, updatedAt: now },
        { name: '专业课', color: '#a855f7', sortOrder: 4, createdAt: now, updatedAt: now }
      ])
      .run()
  }
  getDb()
    .insert(schema.settings)
    .values(
      Object.entries(DEFAULT_SETTINGS).map(([key, value]) => ({ key, value, updatedAt: now }))
    )
    .onConflictDoNothing()
    .run()
}

export function closeDatabase(): void {
  sqlite?.close()
  sqlite = null
  db = null
}
