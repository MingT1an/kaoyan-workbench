import { spawnSync } from 'node:child_process'

// 走 npmmirror 镜像下载 Electron 与 NSIS 等二进制,避免国内网络直连 GitHub 超时
const env = {
  ...process.env,
  ELECTRON_MIRROR: 'https://npmmirror.com/mirrors/electron/',
  ELECTRON_BUILDER_BINARIES_MIRROR: 'https://npmmirror.com/mirrors/electron-builder-binaries/'
}

const result = spawnSync('npx', ['electron-builder', '--win'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env
})
process.exit(result.status ?? 1)
