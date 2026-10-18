// Posicionamento do grafo de módulos: uma coluna por camada, módulos agrupados por subpasta.

import type { GraphModule, Layer } from '@/dev/architecture/types'

export const LAYER_ORDER: readonly Layer[] = [
  'config',
  'entry',
  'app',
  'features',
  'components',
  'repositories',
  'stores',
  'db',
  'domain',
  'lib',
  'test',
  'dev',
  'assets',
  'other',
]

export const NODE_WIDTH = 188
export const NODE_HEIGHT = 26
const ROW_GAP = 6
const GROUP_GAP = 24
const COLUMN_GAP = 84
const PADDING = 16
const HEADER_HEIGHT = 30
/** Quanto a curva de uma aresta dentro da mesma coluna sai para a direita. */
const SAME_COLUMN_BULGE = 44

export interface NodeBox {
  id: string
  label: string
  layer: Layer
  x: number
  y: number
}

export interface GraphLayout {
  nodes: NodeBox[]
  groups: { text: string; x: number; y: number }[]
  columns: { layer: Layer; x: number }[]
  width: number
  height: number
}

export function layoutModules(modules: readonly GraphModule[]): GraphLayout {
  const nodes: NodeBox[] = []
  const groups: GraphLayout['groups'] = []
  const columns: GraphLayout['columns'] = []
  let maxY = HEADER_HEIGHT

  const presentLayers = LAYER_ORDER.filter((layer) => modules.some((m) => m.layer === layer))
  presentLayers.forEach((layer, columnIndex) => {
    const x = PADDING + columnIndex * (NODE_WIDTH + COLUMN_GAP)
    columns.push({ layer, x })
    const inLayer = modules
      .filter((m) => m.layer === layer)
      .sort((a, b) => a.group.localeCompare(b.group) || a.id.localeCompare(b.id))

    let y = PADDING + HEADER_HEIGHT
    let currentGroup: string | null = null
    for (const m of inLayer) {
      if (m.group !== currentGroup) {
        currentGroup = m.group
        y += GROUP_GAP - ROW_GAP
        groups.push({ text: m.group, x, y: y - 6 })
      }
      nodes.push({ id: m.id, label: m.id.slice(m.id.lastIndexOf('/') + 1), layer, x, y })
      y += NODE_HEIGHT + ROW_GAP
    }
    maxY = Math.max(maxY, y)
  })

  return {
    nodes,
    groups,
    columns,
    width:
      PADDING * 2 + presentLayers.length * NODE_WIDTH + (presentLayers.length - 1) * COLUMN_GAP,
    height: maxY + PADDING,
  }
}

/** Curva da borda de `from` até a borda de `to`, escolhendo os lados pelo sentido. */
export function edgePath(from: NodeBox, to: NodeBox): string {
  const fromMid = from.y + NODE_HEIGHT / 2
  const toMid = to.y + NODE_HEIGHT / 2

  if (from.x === to.x) {
    const side = from.x + NODE_WIDTH
    const bulge = side + SAME_COLUMN_BULGE
    return `M${side},${fromMid} C${bulge},${fromMid} ${bulge},${toMid} ${side},${toMid}`
  }

  const goesRight = to.x > from.x
  const startX = goesRight ? from.x + NODE_WIDTH : from.x
  const endX = goesRight ? to.x : to.x + NODE_WIDTH
  const controlX = (startX + endX) / 2
  return `M${startX},${fromMid} C${controlX},${fromMid} ${controlX},${toMid} ${endX},${toMid}`
}
