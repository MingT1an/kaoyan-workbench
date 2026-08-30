import { app, shell, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { watch, type FSWatcher } from 'node:fs'
import { closeDatabase, initDatabase } from './db'
import { registerIpc } from './ipc'

let mainWindow: BrowserWindow | null = null
let outWatcher: FSWatcher | null = null
let reloadTimer: NodeJS.Timeout | null = null

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

app.disableHardwareAcceleration()
// 纯本地应用:禁用代理,避免系统代理(Clash 等)影响本地请求
app.commandLine.appendSwitch('no-proxy-server')

app.whenReady().then(() => {
  // 始终开启无障碍支持,便于读屏与自动化工具读取界面内容
  app.setAccessibilitySupportEnabled(true)
  initDatabase()
  registerIpc()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  outWatcher?.close()
  closeDatabase()
})
