import { app, BrowserWindow, Notification } from 'electron'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { flush, getData, initStore } from './store'
import { registerMediaProtocol } from './media'
import { PomodoroTimer } from './timer'
import { createTray, destroyTray, refreshTray } from './tray'
import { registerIpc } from './ipc'

let mainWindow: BrowserWindow | null = null
let timer: PomodoroTimer | null = null
let quitting = false

const ASSETS = path.join(app.getAppPath(), 'assets')

function showMain(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow()
    return
  }
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

function navigate(page: string): void {
  showMain()
  mainWindow?.webContents.send('app:navigate', page)
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1080,
    minHeight: 680,
    show: false,
    backgroundColor: '#eef3fb',
    title: '考研个人工作台',
    icon: path.join(ASSETS, 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())

  mainWindow.on('close', e => {
    if (!quitting && getData().settings.closeToTray) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })
  mainWindow.on('closed', () => {
    mainWindow = null
  })
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.webContents.on('did-fail-load', (_e, code, desc) => {
    if (process.env.KAOYAN_SMOKE === '1') {
      console.log(`[SMOKE] FAIL load ${code} ${desc}`)
      app.exit(1)
    }
  })

  // 截图模式:KAOYAN_SHOT=<目录> 时自动遍历各页面保存 PNG,用于视觉验收/回归
  const shotDir = process.env.KAOYAN_SHOT
  if (shotDir) {
    mainWindow.webContents.on('did-finish-load', () => {
      void captureWalkthrough(shotDir)
    })
  }
}

async function captureWalkthrough(shotDir: string): Promise<void> {
  const pages = ['today', 'plan', 'focus', 'mistakes', 'review', 'stats', 'settings']
  fs.mkdirSync(shotDir, { recursive: true })
  for (let i = 0; i < pages.length; i++) {
    await new Promise(r => setTimeout(r, i === 0 ? 2600 : 1000))
    if (!mainWindow || mainWindow.isDestroyed()) return
    const image = await mainWindow.webContents.capturePage()
    fs.writeFileSync(path.join(shotDir, `${pages[i]}.png`), image.toPNG())
    if (i < pages.length - 1) {
      await mainWindow.webContents.executeJavaScript(
        `document.querySelectorAll('aside nav button')[${i + 1}].click()`
      )
    }
  }
  console.log(`[SHOT] 已保存 ${pages.length} 张页面截图到 ${shotDir}`)
  app.quit()
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => showMain())

  app.whenReady().then(() => {
    initStore()
    registerMediaProtocol()
    createWindow()

    timer = new PomodoroTimer({
      notify: body => {
        if (!Notification.isSupported()) return
        const n = new Notification({ title: '考研个人工作台', body })
        n.on('click', () => showMain())
        n.show()
      }
    })
    timer.onChange(state => {
      refreshTray(state)
      mainWindow?.webContents.send('timer:changed', state)
    })

    createTray({
      assetsDir: ASSETS,
      onShow: showMain,
      onStart: () => {
        timer?.start({ subjectId: null, taskId: null })
        navigate('focus')
      },
      onPause: () => timer?.pause(),
      onResume: () => timer?.resume(),
      onStop: () => timer?.stop(),
      onQuit: () => {
        quitting = true
        app.quit()
      }
    })

    registerIpc({
      timer,
      showMain,
      onReady: () => {
        if (process.env.KAOYAN_SMOKE === '1') {
          console.log('[SMOKE] OK')
          setTimeout(() => app.quit(), 300)
        }
      }
    })

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    app.quit()
  })

  app.on('before-quit', () => {
    quitting = true
    flush()
  })

  app.on('quit', () => {
    timer?.destroy()
    destroyTray()
  })

  process.on('uncaughtException', err => {
    console.error(err)
    if (process.env.KAOYAN_SMOKE === '1') {
      console.log('[SMOKE] MAIN_ERROR')
      app.exit(1)
    }
  })
}
