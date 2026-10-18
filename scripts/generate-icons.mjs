#!/usr/bin/env node
// Gera os ícones PROVISÓRIOS do PWA (§6.9 / CA-11.1) em public/, sem dependências:
// o PNG é montado à mão com zlib (módulo nativo do Node). Nome e ícone definitivos
// ficam para a Fase 11 (Q-03 / D-09).
// Uso: node scripts/generate-icons.mjs

import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'

const PUBLIC_DIR = fileURLToPath(new URL('../public/', import.meta.url))

// Fundo azul (blue-600 do Tailwind, mesma cor de destaque da interface) e símbolo branco.
const BACKGROUND = [0x25, 0x63, 0xeb]
const FOREGROUND = [0xff, 0xff, 0xff]

// Fração do lado ocupada pelo símbolo. Ícones "maskable" podem ser recortados em círculo
// pelo sistema; a área segura é o círculo central de 80% do lado, então o quadrado do
// símbolo precisa caber nele (0,5 × √2 ≈ 0,71 < 0,8).
const ANY_SYMBOL_SCALE = 0.6
const MASKABLE_SYMBOL_SCALE = 0.5

// Antisserrilhado: cada pixel é amostrado em uma grade SUPERSAMPLING × SUPERSAMPLING.
const SUPERSAMPLING = 4

const ICONS = [
  { file: 'pwa-192x192.png', size: 192, scale: ANY_SYMBOL_SCALE },
  { file: 'pwa-512x512.png', size: 512, scale: ANY_SYMBOL_SCALE },
  { file: 'pwa-maskable-512x512.png', size: 512, scale: MASKABLE_SYMBOL_SCALE },
  { file: 'apple-touch-icon.png', size: 180, scale: ANY_SYMBOL_SCALE },
  { file: 'favicon.png', size: 48, scale: ANY_SYMBOL_SCALE },
]

// Símbolo: três barras crescentes (gráfico de gastos), em coordenadas 0..1 do quadrado
// do símbolo, alinhadas pela base.
const BAR_WIDTH = 0.24
const BAR_GAP = (1 - 3 * BAR_WIDTH) / 2
const BAR_RADIUS = 0.07
const BAR_HEIGHTS = [0.45, 0.72, 1]
const BARS = BAR_HEIGHTS.map((height, index) => ({
  x0: index * (BAR_WIDTH + BAR_GAP),
  x1: index * (BAR_WIDTH + BAR_GAP) + BAR_WIDTH,
  y0: 1 - height,
  y1: 1,
}))

function isInsideRoundedRect(x, y, rect, radius) {
  if (x < rect.x0 || x > rect.x1 || y < rect.y0 || y > rect.y1) return false
  const cornerX = Math.min(Math.max(x, rect.x0 + radius), rect.x1 - radius)
  const cornerY = Math.min(Math.max(y, rect.y0 + radius), rect.y1 - radius)
  return (x - cornerX) ** 2 + (y - cornerY) ** 2 <= radius ** 2
}

function isInsideSymbol(x, y) {
  return BARS.some((bar) => isInsideRoundedRect(x, y, bar, BAR_RADIUS))
}

function symbolCoverage(px, py, size, scale) {
  const symbolSide = size * scale
  const offset = (size - symbolSide) / 2
  let hits = 0
  for (let sy = 0; sy < SUPERSAMPLING; sy++) {
    for (let sx = 0; sx < SUPERSAMPLING; sx++) {
      const x = (px + (sx + 0.5) / SUPERSAMPLING - offset) / symbolSide
      const y = (py + (sy + 0.5) / SUPERSAMPLING - offset) / symbolSide
      if (isInsideSymbol(x, y)) hits++
    }
  }
  return hits / SUPERSAMPLING ** 2
}

/** Linhas RGB opacas (o apple-touch-icon não pode ter transparência), com o byte de filtro 0. */
function renderPixels(size, scale) {
  const rowLength = 1 + size * 3
  const pixels = Buffer.alloc(rowLength * size)
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const coverage = symbolCoverage(px, py, size, scale)
      const offset = py * rowLength + 1 + px * 3
      for (let channel = 0; channel < 3; channel++) {
        pixels[offset + channel] = Math.round(
          BACKGROUND[channel] + (FOREGROUND[channel] - BACKGROUND[channel]) * coverage,
        )
      }
    }
  }
  return pixels
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typeAndData))
  return Buffer.concat([length, typeAndData, crc])
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const BIT_DEPTH = 8
const COLOR_TYPE_RGB = 2

function encodePng(size, pixels) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = BIT_DEPTH
  header[9] = COLOR_TYPE_RGB
  // Bytes 10–12: compressão, filtro e entrelaçamento padrão (0).
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(pixels, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

for (const { file, size, scale } of ICONS) {
  writeFileSync(PUBLIC_DIR + file, encodePng(size, renderPixels(size, scale)))
  console.log(`public/${file} (${size}×${size})`)
}
