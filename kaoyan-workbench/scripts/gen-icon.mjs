import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// ---------- 最小 PNG 编码器 ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

// ---------- 图标绘制:渐变圆角方块 + 白色时钟,2x 超采样抗锯齿 ----------
function segDist(px, py, ax, ay, bx, by) {
  const abx = bx - ax
  const aby = by - ay
  const apx = px - ax
  const apy = py - ay
  const len2 = abx * abx + aby * aby
  let t = len2 === 0 ? 0 : (apx * abx + apy * aby) / len2
  t = Math.max(0, Math.min(1, t))
  const dx = apx - abx * t
  const dy = apy - aby * t
  return Math.sqrt(dx * dx + dy * dy)
}

function drawIcon(size) {
  const s = size * 2
  const acc = new Float64Array(size * size * 4)
  const radius = s * 0.22
  const cx = s / 2
  const cy = s / 2
  const ringR = s * 0.32
  const ringW = s * 0.075
  const handTop = { x: cx, y: cy - ringR * 0.62 }
  const handRight = { x: cx + ringR * 0.55, y: cy + ringR * 0.28 }

  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const fx = x + 0.5
      const fy = y + 0.5
      const dx = Math.max(Math.abs(fx - cx) - (s / 2 - radius), 0)
      const dy = Math.max(Math.abs(fy - cy) - (s / 2 - radius), 0)
      if (dx * dx + dy * dy > radius * radius) continue

      const t = fy / s
      let r = 0x5b + (0x3b - 0x5b) * t
      let g = 0x8c + (0x5f - 0x8c) * t
      let b = 0xff + (0xd9 - 0xff) * t

      const ddx = fx - cx
      const ddy = fy - cy
      const dist = Math.sqrt(ddx * ddx + ddy * ddy)
      if (Math.abs(dist - ringR) <= ringW / 2) {
        r = g = b = 255
      }
      if (segDist(fx, fy, cx, cy, handTop.x, handTop.y) <= s * 0.032) r = g = b = 255
      if (segDist(fx, fy, cx, cy, handRight.x, handRight.y) <= s * 0.032) r = g = b = 255
      if (dist <= s * 0.035) r = g = b = 255

      const i = (y * s + x) * 4
      acc[i] += r
      acc[i + 1] += g
      acc[i + 2] += b
      acc[i + 3] += 255
    }
  }

  const buf = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const o = (y * size + x) * 4
      for (let ch = 0; ch < 4; ch++) {
        let sum = 0
        for (let sy = 0; sy < 2; sy++) {
          for (let sx = 0; sx < 2; sx++) {
            sum += acc[((y * 2 + sy) * s + x * 2 + sx) * 4 + ch]
          }
        }
        buf[o + ch] = Math.round(sum / 4)
      }
    }
  }
  return encodePNG(size, size, buf)
}

mkdirSync(join(root, 'assets'), { recursive: true })
writeFileSync(join(root, 'assets', 'tray.png'), drawIcon(32))
writeFileSync(join(root, 'assets', 'icon.png'), drawIcon(256))
console.log('[icons] assets/tray.png (32x32) + assets/icon.png (256x256) 已生成')
