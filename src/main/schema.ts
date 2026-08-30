import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const subjects = sqliteTable('subjects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  color: text('color').notNull().default('#6366f1'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deleted: integer('deleted').notNull().default(0)
})

export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  subjectId: integer('subject_id').references(() => subjects.id),
  title: text('title').notNull(),
  date: text('date').notNull(),
  estimatedMinutes: integer('estimated_minutes'),
  priority: integer('priority').notNull().default(0),
  status: text('status').notNull().default('todo'),
  repeatRule: text('repeat_rule'),
  repeatOf: integer('repeat_of'),
  note: text('note'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deleted: integer('deleted').notNull().default(0)
})

export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taskId: integer('task_id').references(() => tasks.id),
  subjectId: integer('subject_id').references(() => subjects.id),
  startedAt: text('started_at').notNull(),
  endedAt: text('ended_at'),
  plannedMinutes: integer('planned_minutes').notNull(),
  actualMinutes: integer('actual_minutes'),
  status: text('status').notNull().default('running'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deleted: integer('deleted').notNull().default(0)
})

export const mistakes = sqliteTable('mistakes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  subjectId: integer('subject_id').references(() => subjects.id),
  chapter: text('chapter'),
  question: text('question').notNull(),
  imagePath: text('image_path'),
  wrongReason: text('wrong_reason'),
  solution: text('solution'),
  mastery: text('mastery').notNull().default('unknown'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deleted: integer('deleted').notNull().default(0)
})

export const reviewItems = sqliteTable('review_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sourceType: text('source_type', { enum: ['note', 'mistake'] }),
  sourceId: integer('source_id'),
  title: text('title').notNull(),
  content: text('content'),
  intervalIndex: integer('interval_index').notNull().default(0),
  nextDueDate: text('next_due_date').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deleted: integer('deleted').notNull().default(0)
})

export const reviewLogs = sqliteTable('review_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  itemId: integer('item_id').notNull().references(() => reviewItems.id),
  reviewedAt: text('reviewed_at').notNull(),
  result: text('result').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deleted: integer('deleted').notNull().default(0)
})

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull()
})
