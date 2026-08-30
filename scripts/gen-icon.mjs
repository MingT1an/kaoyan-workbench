// 生成应用托盘/窗口图标(纯 Node,无第三方依赖)。
// 用法:node scripts/gen-icon.mjs
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

let crcTable = null
function crc32(buf) {
  if (!crcTable) {
    crcTable = []
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      crcTable[n] = c >>> 0
    }
  }
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crc])
}

function png(size, pixelFn) {
  const stride = size * 4 + 1
  const raw = Buffer.alloc(size * stride)
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0 // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixelFn(x, y)
      const off = y * stride + 1 + x * 4
      raw[off] = r
      raw[off + 1] = g
      raw[off + 2] = b
      raw[off + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

function inRoundedRect(x, y, size, margin, radius) {
  const x0 = margin
  const y0 = margin
  const x1 = size - margin
  const y1 = size - margin
  if (x < x0 || x > x1 || y < y0 || y > y1) return false
  const cx = Math.max(x0 + radius, Math.min(x, x1 - radius))
  const cy = Math.max(y0 + radius, Math.min(y, y1 - radius))
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius * radius
}

function inCircle(x, y, cx, cy, r) {
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
}

/** 靛蓝圆角方块 + 白色番茄 + 绿色叶子 */
function designPixel(x, y, size) {
  const s = size / 64
  if (!inRoundedRect(x, y, size, Math.round(3 * s), Math.round(14 * s))) return [0, 0, 0, 0]
  if (
    inCircle(x, y, 32 * s, 34 * s, 15 * s) ||
    (inCircle(x, y, 43 * s, 16 * s, 6 * s) && y <= 22 * s)
  ) {
    if (inCircle(x, y, 43 * s, 16 * s, 6 * s) && y <= 20 * s && x >= 38 * s) return [74, 222, 128, 255]
    return [255, 255, 255, 255]
  }
  return [99, 102, 241, 255]
}

mkdirSync(join(root, 'assets'), { recursive: true })
writeFileSync(join(root, 'assets', 'tray.png'), png(64, (x, y) => designPixel(x, y, 64)))
writeFileSync(join(root, 'assets', 'icon.png'), png(256, (x, y) => designPixel(x, y, 256)))
console.log('OK assets/tray.png assets/icon.png')
