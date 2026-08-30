import { app, shell, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { watch, type FSWatcher } from 'node:fs'
import { closeDatabase, initDatabase } from './db'
import { registerIpc } from './ipc'
import { cancel, getState, initTimer } from './timer'
import { createTray, updateTrayTooltip } from './tray'
import { autoBackup } from './backup'

let mainWindow: BrowserWindow | null = null
let outWatcher: FSWatcher | null = null
let reloadTimer: NodeJS.Timeout | null = null
let quitting = false

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  app.disableHardwareAcceleration()
  // 纯本地应用:禁用代理,避免系统代理(Clash 等)影响本地请求
  app.commandLine.appendSwitch('no-proxy-server')

  function createWindow(): void {
    mainWindow = new BrowserWindow({
      width: 1280,
      height: 820,
      minWidth: 1024,
      minHeight: 700,
      show: false,
      autoHideMenuBar: true,
      title: '考研工作台',
      backgroundColor: '#f5f6fa',
      icon: join(app.getAppPath(), 'assets', 'icon.png'),
      webPreferences: {
        preload: join(__dirname, '../preload/index.js')
      }
    })

    mainWindow.webContents.on('did-fail-load', (_event, code, desc, url) => {
      console.error('[window] did-fail-load', code, desc, url)
    })
    mainWindow.webContents.on('render-process-gone', (_event, details) => {
      console.error('[window] render-process-gone', JSON.stringify(details))
    })
    mainWindow.webContents.on('preload-error', (_event, path, error) => {
      console.error('[window] preload-error', path, error)
    })

    mainWindow.on('ready-to-show', () => mainWindow?.show())
    // 关闭窗口 = 缩到托盘继续计时,托盘右键退出才是真退出
    mainWindow.on('close', (event) => {
      if (!quitting) {
        event.preventDefault()
        mainWindow?.hide()
      }
    })
    mainWindow.on('closed', () => {
      mainWindow = null
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url)
      return { action: 'deny' }
    })

    if (process.env['ELECTRON_RENDERER_URL']) {
      mainWindow
        .loadURL(process.env['ELECTRON_RENDERER_URL'])
        .catch((err) => console.error('[window] loadURL failed:', err))
    } else {
      mainWindow
        .loadFile(join(__dirname, '../renderer/index.html'))
        .catch((err) => console.error('[window] loadFile failed:', err))
      watchOutDirForReload()
    }
  }

  /**
   * 本地开发模式(npm run dev:local)下监听构建产物,
   * 渲染层/预加载脚本重建后自动刷新窗口,替代 HMR。
   */
  function watchOutDirForReload(): void {
    if (app.isPackaged) return
    try {
      outWatcher = watch(join(__dirname, '..'), { recursive: true }, (_event, filename) => {
        if (!filename || !/\.(js|html|css)$/.test(filename)) return
        if (!/[/\\](renderer|preload)[/\\]/.test(filename.replace(/\\/g, '/'))) return
        if (reloadTimer) clearTimeout(reloadTimer)
        reloadTimer = setTimeout(() => mainWindow?.webContents.reload(), 300)
      })
    } catch (err) {
      console.warn('[dev] 构建产物监听不可用:', err)
    }
  }

  function fmtRemaining(state: ReturnType<typeof getState>): string {
    if (state.status === 'idle') return '空闲'
    const totalSec = Math.max(0, Math.ceil(state.remainingMs / 1000))
    const mm = String(Math.floor(totalSec / 60)).padStart(2, '0')
    const ss = String(totalSec % 60).padStart(2, '0')
    const label = state.status === 'focus' ? '专注中' : '休息中'
    return `${label} ${mm}:${ss}${state.paused ? '(暂停)' : ''}`
  }

  app.whenReady().then(() => {
    // 始终开启无障碍支持,便于读屏与自动化工具读取界面内容
    app.setAccessibilitySupportEnabled(true)
    initDatabase()
    registerIpc()
    autoBackup()

    initTimer({
      broadcast: (state) => {
        for (const win of BrowserWindow.getAllWindows()) {
          win.webContents.send('timer:changed', state)
        }
        updateTrayTooltip(`考研工作台 · ${fmtRemaining(state)}`)
      }
    })

    createWindow()
    createTray()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('before-quit', () => {
    quitting = true
  })

  app.on('quit', () => {
    // 退出时若有进行中的专注,按放弃落账,保留实际时长
    try {
      cancel()
    } catch {
      // 忽略退出时的落账异常
    }
    closeDatabase()
  })

  app.on('window-all-closed', () => {
    // 关窗是隐藏到托盘,正常不会走到这里;兜底退出
    app.quit()
  })
}
