import { Menu, nativeImage, Tray } from 'electron'
import * as path from 'node:path'
import type { TimerState } from '../shared/types'

interface TrayCallbacks {
  assetsDir: string
  onShow(): void
  onStart(): void
  onPause(): void
  onResume(): void
  onStop(): void
  onQuit(): void
}

let tray: Tray | null = null
let callbacks: TrayCallbacks | null = null

export function createTray(cb: TrayCallbacks): void {
  callbacks = cb
  const icon = nativeImage.createFromPath(path.join(cb.assetsDir, 'tray.png'))
  tray = new Tray(icon)
  tray.setToolTip('考研个人工作台')
  const state: TimerState = { status: 'idle', paused: false } as TimerState
  refreshTray(state)
}

export function refreshTray(state: TimerState): void {
  if (!tray || !callbacks) return
  const cb = callbacks
  const active = state.status !== 'idle'
  const items: Electron.MenuItemConstructorOptions[] = [
    { label: '显示主界面', click: () => cb.onShow() },
    { type: 'separator' }
  ]
  if (!active) {
    items.push({ label: '开始专注', click: () => cb.onStart() })
  } else {
    items.push({
      label: state.paused ? '继续' : '暂停',
      click: () => (state.paused ? cb.onResume() : cb.onPause())
    })
    items.push({ label: '结束', click: () => cb.onStop() })
  }
  items.push({ type: 'separator' })
  items.push({ label: '退出', click: () => cb.onQuit() })
  tray.setContextMenu(Menu.buildFromTemplate(items))
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}
