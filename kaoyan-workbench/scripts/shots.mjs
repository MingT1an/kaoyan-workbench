import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// 遍历各页面截图到指定目录(默认 .shots),用于视觉验收与回归;应用截完自动退出
const require = createRequire(import.meta.url)
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = resolve(process.argv[2] ?? join(root, '.shots'))
const electron = require('electron')

const child = spawn(electron, ['.'], {
  cwd: root,
  env: { ...process.env, KAOYAN_SHOT: outDir },
  stdio: 'inherit',
  windowsHide: true
})
child.on('exit', code => process.exit(code ?? 0))
