// 本地开发模式:构建产物 + 文件加载,不经过 dev server 的 HTTP/HMR。
// 适用于本机 dev server(HMR)被网络过滤软件干扰的情况。
// - 渲染层/预加载变更:重新构建后由主进程自动刷新窗口
// - 主进程变更:重新构建后自动重启应用
import { spawn, spawnSync } from 'node:child_process'
import { statSync, watch } from 'node:fs'
import { join } from 'node:path'
import electronPath from 'electron'

const root = process.cwd()
const mainEntry = join(root, 'out/main/index.js')

let electronProc = null
let building = false
let queued = false
let restarting = false
let shuttingDown = false
let debounceTimer = null
let lastMainMtime = 0

const fileMtime = (p) => {
  try {
    return statSync(p).mtimeMs
  } catch {
    return 0
  }
}

function startElectron() {
  electronProc = spawn(electronPath, ['.'], { stdio: 'inherit' })
  electronProc.on('exit', (code) => {
    electronProc = null
    if (shuttingDown) return
    if (restarting) {
      restarting = false
      startElectron()
      return
    }
    console.log(`[dev:local] 应用已退出(code=${code})`)
    process.exit(code ?? 0)
  })
}

function build() {
  if (building) {
    queued = true
    return
  }
  building = true
  console.log('[dev:local] 源码变更,重新构建...')
  const res = spawnSync('npx electron-vite build', { shell: true, stdio: 'inherit' })
  building = false
  if (res.status !== 0) {
    console.error('[dev:local] 构建失败,保持当前版本运行,修复后保存文件重试')
  } else {
    const m = fileMtime(mainEntry)
    if (lastMainMtime && m !== lastMainMtime && electronProc) {
      console.log('[dev:local] 主进程代码变更,重启应用...')
      lastMainMtime = m
      restarting = true
      electronProc.kill()
    } else {
      lastMainMtime = m
      // 渲染层/预加载的变化由主进程内的构建产物监听自动刷新窗口
    }
  }
  if (queued) {
    queued = false
    build()
  }
}

const initial = spawnSync('npx electron-vite build', { shell: true, stdio: 'inherit' })
if (initial.status !== 0) {
  process.exit(initial.status ?? 1)
}
lastMainMtime = fileMtime(mainEntry)
startElectron()

watch(join(root, 'src'), { recursive: true }, () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(build, 400)
})

function shutdown() {
  shuttingDown = true
  electronProc?.kill()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
