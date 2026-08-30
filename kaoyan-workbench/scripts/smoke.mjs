import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// 启动打包后的应用,等待渲染进程挂载后回传 [SMOKE] OK,验证"主进程→预加载→渲染"全链路
const require = createRequire(import.meta.url)
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const electron = require('electron')

const child = spawn(electron, ['.'], {
  cwd: root,
  env: { ...process.env, KAOYAN_SMOKE: '1' },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true
})

const timeout = setTimeout(() => {
  console.error('[SMOKE] TIMEOUT:60s 内未收到就绪信号')
  kill()
  process.exit(1)
}, 60_000)

function kill() {
  if (process.platform === 'win32') {
    spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true })
  } else {
    child.kill('SIGKILL')
  }
}

let out = ''
child.stdout.on('data', d => {
  const text = d.toString()
  out += text
  process.stdout.write(text)
})
child.stderr.on('data', d => {
  process.stderr.write(d)
})
child.on('exit', code => {
  clearTimeout(timeout)
  if (out.includes('[SMOKE] OK')) {
    console.log('[SMOKE] 通过:窗口加载、预加载桥与渲染进程均正常')
    process.exit(0)
  }
  console.error(`[SMOKE] 失败 (exit=${code})`)
  process.exit(1)
})
