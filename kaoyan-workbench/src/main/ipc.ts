import { BrowserWindow, ipcMain } from 'electron'
import type {
  CardInput,
  MistakeInput,
  MistakeUpdate,
  Settings,
  StatsRange,
  Subject,
  TaskInput,
  TaskUpdate,
  TimerStartInput
} from '../shared/types'
import { todayStr } from '../shared/util'
import * as backup from './backup'
import { createCardFromMistake, scheduleCard, syncMistakeMastery } from './review'
import { computeOverview } from './stats'
import type { PomodoroTimer } from './timer'
import { getData, newId, paths, saveImage, update } from './store'

interface IpcOptions {
  timer: PomodoroTimer
  showMain(): void
  onReady(): void
}

function subjectsSorted(): Subject[] {
  return [...getData().subjects].sort((a, b) => a.order - b.order)
}

/** 为请求的日期生成重复任务的当日实例(幂等) */
function ensureRepeats(date: string): void {
  update(db => {
    const templates = db.tasks.filter(t => t.repeatRule && t.date < date)
    for (const tpl of templates) {
      if (tpl.repeatRule === 'weekdays') {
        const wd = new Date(`${date}T00:00:00`).getDay()
        if (wd === 0 || wd === 6) continue
      }
      const exists = db.tasks.some(t => t.repeatOf === tpl.id && t.date === date)
      if (exists) continue
      db.tasks.push({
        id: newId(),
        title: tpl.title,
        subjectId: tpl.subjectId,
        date,
        estimatedMinutes: tpl.estimatedMinutes,
        repeatRule: null,
        repeatOf: tpl.id,
        status: 'todo',
        note: tpl.note,
        createdAt: new Date().toISOString()
      })
    }
  })
}

export function registerIpc(options: IpcOptions): void {
  const { timer } = options

  ipcMain.handle('app:ping', () => {
    options.onReady()
    return true
  })

  // ---- 设置 ----
  ipcMain.handle('settings:get', () => getData().settings)
  ipcMain.handle('settings:set', (_e, patch: Partial<Settings>) => {
    update(db => {
      db.settings = { ...db.settings, ...patch }
    })
    return getData().settings
  })

  // ---- 科目 ----
  ipcMain.handle('subjects:list', () => subjectsSorted())
  ipcMain.handle('subjects:add', (_e, input: { name: string; color: string }) => {
    update(db => {
      const order = db.subjects.reduce((max, s) => Math.max(max, s.order), -1) + 1
      db.subjects.push({ id: `s_${newId().slice(0, 8)}`, name: input.name, color: input.color, order })
    })
    return subjectsSorted()
  })
  ipcMain.handle('subjects:update', (_e, subject: Subject) => {
    update(db => {
      const s = db.subjects.find(x => x.id === subject.id)
      if (!s) return
      s.name = subject.name
      s.color = subject.color
    })
    return subjectsSorted()
  })
  ipcMain.handle('subjects:remove', (_e, id: string) => {
    update(db => {
      db.subjects = db.subjects.filter(s => s.id !== id)
      for (const t of db.tasks) if (t.subjectId === id) t.subjectId = null
      for (const s of db.sessions) if (s.subjectId === id) s.subjectId = null
      for (const m of db.mistakes) if (m.subjectId === id) m.subjectId = null
      for (const c of db.cards) if (c.subjectId === id) c.subjectId = null
    })
    return subjectsSorted()
  })

  // ---- 任务 ----
  ipcMain.handle('tasks:list', (_e, payload: { date: string }) => {
    ensureRepeats(payload.date)
    const list = getData().tasks.filter(t => t.date === payload.date)
    list.sort((a, b) =>
      a.status === b.status
        ? a.createdAt.localeCompare(b.createdAt)
        : a.status === 'todo'
          ? -1
          : 1
    )
    return list
  })
  ipcMain.handle('tasks:overdue', (_e, payload: { today: string }) => {
    ensureRepeats(payload.today)
    return getData()
      .tasks.filter(t => t.date < payload.today && t.status === 'todo' && !t.repeatRule)
      .sort((a, b) => a.date.localeCompare(b.date))
  })
  ipcMain.handle('tasks:add', (_e, input: TaskInput) => {
    const task = {
      id: newId(),
      title: input.title,
      subjectId: input.subjectId,
      date: input.date,
      estimatedMinutes: input.estimatedMinutes ?? null,
      repeatRule: input.repeatRule ?? null,
      repeatOf: null,
      status: 'todo' as const,
      note: input.note ?? null,
      createdAt: new Date().toISOString()
    }
    update(db => {
      db.tasks.push(task)
    })
    return task
  })
  ipcMain.handle('tasks:update', (_e, patch: TaskUpdate) => {
    update(db => {
      const t = db.tasks.find(x => x.id === patch.id)
      if (!t) return
      if (patch.title !== undefined) t.title = patch.title
      if (patch.subjectId !== undefined) t.subjectId = patch.subjectId
      if (patch.date !== undefined) t.date = patch.date
      if (patch.estimatedMinutes !== undefined) t.estimatedMinutes = patch.estimatedMinutes
      if (patch.repeatRule !== undefined) t.repeatRule = patch.repeatRule
      if (patch.status !== undefined) t.status = patch.status
      if (patch.note !== undefined) t.note = patch.note
    })
    return getData().tasks.find(x => x.id === patch.id) ?? null
  })
  ipcMain.handle('tasks:remove', (_e, payload: { id: string }) => {
    update(db => {
      db.tasks = db.tasks.filter(t => t.id !== payload.id)
    })
  })

  // ---- 番茄专注 ----
  ipcMain.handle('focus:state', () => timer.getState())
  ipcMain.handle('focus:start', (_e, input: TimerStartInput) => {
    timer.start(input)
    return timer.getState()
  })
  ipcMain.handle('focus:pause', () => {
    timer.pause()
    return timer.getState()
  })
  ipcMain.handle('focus:resume', () => {
    timer.resume()
    return timer.getState()
  })
  ipcMain.handle('focus:stop', () => {
    timer.stop()
    return timer.getState()
  })
  ipcMain.handle('focus:today', () => {
    const today = todayStr()
    const sessions = getData()
      .sessions.filter(s => s.date === today && s.mode === 'focus')
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    const seconds = sessions.reduce((sum, s) => sum + s.actualSeconds, 0)
    return {
      minutes: Math.round(seconds / 60),
      pomodoros: sessions.filter(s => s.status === 'completed').length,
      recent: sessions.slice(0, 10)
    }
  })

  // ---- 错题本 ----
  ipcMain.handle('mistakes:list', () =>
    [...getData().mistakes].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  )
  ipcMain.handle('mistakes:add', (_e, input: MistakeInput) => {
    const mistake = {
      id: newId(),
      subjectId: input.subjectId,
      chapter: input.chapter,
      question: input.question,
      wrongReason: input.wrongReason,
      solution: input.solution,
      images: input.images,
      mastery: input.mastery,
      inReview: input.inReview,
      createdAt: new Date().toISOString()
    }
    update(db => {
      db.mistakes.push(mistake)
    })
    if (mistake.inReview) createCardFromMistake(mistake.id)
    return mistake
  })
  ipcMain.handle('mistakes:update', (_e, patch: MistakeUpdate) => {
    update(db => {
      const m = db.mistakes.find(x => x.id === patch.id)
      if (!m) return
      if (patch.subjectId !== undefined) m.subjectId = patch.subjectId
      if (patch.chapter !== undefined) m.chapter = patch.chapter
      if (patch.question !== undefined) m.question = patch.question
      if (patch.wrongReason !== undefined) m.wrongReason = patch.wrongReason
      if (patch.solution !== undefined) m.solution = patch.solution
      if (patch.images !== undefined) m.images = patch.images
      if (patch.mastery !== undefined) m.mastery = patch.mastery
      if (patch.inReview !== undefined) m.inReview = patch.inReview
    })
    if (patch.inReview) createCardFromMistake(patch.id)
    return getData().mistakes.find(x => x.id === patch.id) ?? null
  })
  ipcMain.handle('mistakes:remove', (_e, payload: { id: string }) => {
    update(db => {
      db.mistakes = db.mistakes.filter(m => m.id !== payload.id)
      db.cards = db.cards.filter(c => !(c.sourceType === 'mistake' && c.sourceId === payload.id))
    })
  })
  ipcMain.handle('mistakes:saveImage', (_e, payload: { dataUrl: string }) =>
    saveImage(payload.dataUrl)
  )

  // ---- 复习 ----
  ipcMain.handle('cards:board', () => {
    const today = todayStr()
    const cards = getData().cards
    const due = cards.filter(c => c.nextDue <= today).sort((a, b) => a.nextDue.localeCompare(b.nextDue))
    const upcoming = cards.filter(c => c.nextDue > today).sort((a, b) => a.nextDue.localeCompare(b.nextDue))
    return {
      due,
      upcoming,
      total: cards.length,
      reviewedToday: cards.filter(c => (c.lastReviewedAt ?? '').slice(0, 10) === today).length
    }
  })
  ipcMain.handle('cards:add', (_e, input: CardInput) => {
    const card = {
      id: newId(),
      sourceType: 'manual' as const,
      sourceId: null,
      subjectId: input.subjectId,
      title: input.title,
      content: input.content,
      intervalIndex: 0,
      nextDue: todayStr(),
      lastResult: null,
      lastReviewedAt: null,
      createdAt: new Date().toISOString()
    }
    update(db => {
      db.cards.push(card)
    })
    return card
  })
  ipcMain.handle('cards:review', (_e, payload: { id: string; result: 'remember' | 'fuzzy' | 'forgot' }) => {
    let card = null
    update(db => {
      const c = db.cards.find(x => x.id === payload.id)
      if (!c) return
      scheduleCard(c, payload.result)
      card = c
    })
    if (card) syncMistakeMastery(card, payload.result)
    return card
  })
  ipcMain.handle('cards:remove', (_e, payload: { id: string }) => {
    update(db => {
      db.cards = db.cards.filter(c => c.id !== payload.id)
    })
  })

  // ---- 统计 ----
  ipcMain.handle('stats:overview', (_e, payload: { range: StatsRange }) =>
    computeOverview(payload.range)
  )

  // ---- 备份 ----
  ipcMain.handle('backup:export', () => backup.exportBackup())
  ipcMain.handle('backup:import', async () => {
    const result = await backup.importBackup()
    if (!result.canceled) {
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send('data:changed', result)
      }
    }
    return result
  })
  ipcMain.handle('backup:openDir', () => backup.openDataDir())
  ipcMain.handle('backup:info', () => paths())
}
