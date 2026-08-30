import { app, BrowserWindow, Menu, Tray, nativeImage } from 'electron'
import { join } from 'node:path'

let tray: Tray | null = null

export function createTray(): void {
  const icon = nativeImage.createFromPath(join(app.getAppPath(), 'assets', 'tray.png'))
  tray = new Tray(icon)
  tray.setToolTip('考研工作台')

  const menu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        const win = BrowserWindow.getAllWindows()[0]
        if (win) {
          win.show()
          win.focus()
        }
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit()
      }
    }
  ])
  tray.setContextMenu(menu)
  tray.on('double-click', () => {
    const win = BrowserWindow.getAllWindows()[0]
    win?.show()
  })
}

export function updateTrayTooltip(text: string): void {
  tray?.setToolTip(text)
}
