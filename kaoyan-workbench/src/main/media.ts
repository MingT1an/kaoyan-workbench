import { protocol } from 'electron'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { imagesPath } from './store'

const NAME_RE = /^[\w-]+\.(png|jpe?g)$/i

/** media://<文件名> 只读加载本地截图,严格校验文件名防路径穿越 */
export function registerMediaProtocol(): void {
  protocol.handle('media', request => {
    const raw = request.url.slice('media://'.length).replace(/\/+$/, '')
    if (!NAME_RE.test(raw)) return new Response('Bad Request', { status: 400 })
    const file = path.join(imagesPath(), raw)
    if (!fs.existsSync(file)) return new Response('Not Found', { status: 404 })
    const ext = raw.split('.').pop()!.toLowerCase()
    const type = ext === 'png' ? 'image/png' : 'image/jpeg'
    return new Response(fs.readFileSync(file), {
      headers: { 'content-type': type }
    })
  })
}
