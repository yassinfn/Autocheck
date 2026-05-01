// Generates icon16.png, icon48.png, icon128.png — no npm deps required
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const INDIGO = [99, 102, 241, 255]   // #6366f1
const WHITE  = [255, 255, 255, 255]

// Minimal 5x7 bitmap font for A and C (each char is an array of 7 rows x 5 cols)
const GLYPHS = {
  A: [
    [0,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,1,1,1,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
  ],
  C: [
    [0,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,0,0,0,1],
    [0,1,1,1,0],
  ],
}

function makePng(size) {
  const pixels = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => [...INDIGO])
  )

  // Scale glyph to fit nicely — target ~50% of canvas height
  const glyphH = 7, glyphW = 5, gap = 1
  const scale = Math.max(1, Math.floor(size * 0.5 / glyphH))
  const totalW = (glyphW * 2 + gap) * scale
  const totalH = glyphH * scale
  const startX = Math.floor((size - totalW) / 2)
  const startY = Math.floor((size - totalH) / 2)

  function drawGlyph(glyph, offsetX) {
    for (let row = 0; row < glyphH; row++) {
      for (let col = 0; col < glyphW; col++) {
        if (!glyph[row][col]) continue
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const px = offsetX + col * scale + sx
            const py = startY + row * scale + sy
            if (py >= 0 && py < size && px >= 0 && px < size) {
              pixels[py][px] = [...WHITE]
            }
          }
        }
      }
    }
  }

  drawGlyph(GLYPHS.A, startX)
  drawGlyph(GLYPHS.C, startX + (glyphW + gap) * scale)

  // Build raw PNG
  // Each scanline: filter byte 0x00 + RGBA bytes
  const scanlines = pixels.map(row => {
    const line = Buffer.alloc(1 + size * 4)
    line[0] = 0
    row.forEach((px, i) => { line[1 + i * 4] = px[0]; line[2 + i * 4] = px[1]; line[3 + i * 4] = px[2]; line[4 + i * 4] = px[3] })
    return line
  })
  const raw = Buffer.concat(scanlines)
  const compressed = zlib.deflateSync(raw, { level: 9 })

  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
    const t = Buffer.from(type, 'ascii')
    const crcBuf = Buffer.concat([t, data])
    const crc = crc32(crcBuf)
    const crcOut = Buffer.alloc(4); crcOut.writeInt32BE(crc)
    return Buffer.concat([len, t, data, crcOut])
  }

  function crc32(buf) {
    let c = 0xFFFFFFFF
    for (const b of buf) {
      c ^= b
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    }
    return (c ^ 0xFFFFFFFF) | 0
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),  // PNG signature
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const iconsDir = path.join(__dirname, 'icons')
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir)

for (const size of [16, 48, 128]) {
  const buf = makePng(size)
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), buf)
  console.log(`Created icons/icon${size}.png (${size}x${size})`)
}
console.log('Done!')
