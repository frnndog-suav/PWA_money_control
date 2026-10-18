// Geometria do diagrama de camadas: setas entre as caixas posicionadas em curated.ts (LAYERS).

import { LAYERS } from '@/dev/architecture/data/curated'
import { layerEdges, unobservedRules, type LayerEdgeStatus } from '@/dev/architecture/layers'
import type { Layer } from '@/dev/architecture/types'

export const VIEW_WIDTH = 920
export const VIEW_HEIGHT = 540
export const BOX_WIDTH = 150
export const BOX_HEIGHT = 60
/** Afastamento entre setas opostas (A → B e B → A) para não se sobreporem. */
const OPPOSITE_OFFSET = 7

export type ArrowStatus = LayerEdgeStatus | 'unobserved'

export interface Arrow {
  from: Layer
  to: Layer
  status: ArrowStatus
}

export const arrows: readonly Arrow[] = [
  ...layerEdges
    .filter((e) => e.from !== e.to)
    .map((e) => ({ from: e.from, to: e.to, status: e.status })),
  ...unobservedRules.map((r) => ({
    from: r.from,
    to: r.to,
    status: 'unobserved' as const,
  })),
]

const centerOf = (layer: Layer) => {
  const info = LAYERS.find((l) => l.id === layer)
  if (!info) return null
  return { x: info.position.x + BOX_WIDTH / 2, y: info.position.y + BOX_HEIGHT / 2 }
}

/** Ponto onde a reta que sai do centro na direção (dx, dy) cruza a borda da caixa. */
function borderPoint(cx: number, cy: number, dx: number, dy: number) {
  const scale = Math.min(
    dx ? BOX_WIDTH / 2 / Math.abs(dx) : Infinity,
    dy ? BOX_HEIGHT / 2 / Math.abs(dy) : Infinity,
  )
  return { x: cx + dx * scale, y: cy + dy * scale }
}

export function arrowLine(arrow: Arrow) {
  const a = centerOf(arrow.from)
  const b = centerOf(arrow.to)
  if (!a || !b) return null
  const length = Math.hypot(b.x - a.x, b.y - a.y)
  const dx = (b.x - a.x) / length
  const dy = (b.y - a.y) / length
  const hasOpposite = arrows.some((o) => o.from === arrow.to && o.to === arrow.from)
  const offsetX = hasOpposite ? -dy * OPPOSITE_OFFSET : 0
  const offsetY = hasOpposite ? dx * OPPOSITE_OFFSET : 0
  const start = borderPoint(a.x, a.y, dx, dy)
  const end = borderPoint(b.x, b.y, -dx, -dy)
  return {
    x1: start.x + offsetX,
    y1: start.y + offsetY,
    x2: end.x + offsetX,
    y2: end.y + offsetY,
  }
}
