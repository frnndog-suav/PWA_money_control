import { useId } from 'react'
import { LAYERS } from '@/dev/architecture/data/curated'
import { LAYER_STYLES } from '@/dev/architecture/components/layerStyles'
import { edgePath, layoutModules, NODE_HEIGHT, NODE_WIDTH } from '@/dev/architecture/graphLayout'
import { graph } from '@/dev/architecture/model'
import type { GraphModule } from '@/dev/architecture/types'

/** Caracteres que cabem no rótulo do nó antes de cortar com reticências. */
const MAX_LABEL_CHARS = 26

interface ModuleGraphProps {
  modules: readonly GraphModule[]
  selectedId: string | null
  onSelect: (moduleId: string) => void
}

function truncate(text: string): string {
  return text.length > MAX_LABEL_CHARS ? `${text.slice(0, MAX_LABEL_CHARS - 1)}…` : text
}

export function ModuleGraph({ modules, selectedId, onSelect }: ModuleGraphProps) {
  const markerId = useId()
  const layout = layoutModules(modules)
  const nodeById = new Map(layout.nodes.map((n) => [n.id, n]))
  const edges = graph.edges.filter((e) => nodeById.has(e.from) && nodeById.has(e.to))
  const neighbors = new Set(
    edges.flatMap((e) => (e.from === selectedId ? [e.to] : e.to === selectedId ? [e.from] : [])),
  )

  function edgeClass(from: string, to: string): string {
    if (selectedId === null) return 'stroke-slate-400/60 dark:stroke-slate-500/60'
    if (from === selectedId) return 'stroke-blue-600 dark:stroke-blue-400'
    if (to === selectedId) return 'stroke-emerald-600 dark:stroke-emerald-400'
    return 'stroke-slate-300/30 dark:stroke-slate-600/30'
  }

  return (
    <svg
      width={layout.width}
      height={layout.height}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      role="img"
      aria-label={`Grafo com ${layout.nodes.length} módulos e ${edges.length} imports`}
    >
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path d="M0,0 L10,5 L0,10 z" className="fill-slate-500 dark:fill-slate-400" />
        </marker>
      </defs>

      {layout.columns.map((column) => (
        <text
          key={column.layer}
          x={column.x}
          y={22}
          className="fill-slate-700 text-[13px] font-bold dark:fill-slate-200"
        >
          {LAYERS.find((l) => l.id === column.layer)?.label ?? column.layer}
        </text>
      ))}
      {layout.groups.map((group) => (
        <text
          key={`${group.x}-${group.text}`}
          x={group.x}
          y={group.y}
          className="fill-slate-500 text-[10px] dark:fill-slate-400"
        >
          {group.text}
        </text>
      ))}

      {edges.map((edge) => {
        const from = nodeById.get(edge.from)
        const to = nodeById.get(edge.to)
        if (!from || !to) return null
        return (
          <path
            key={`${edge.from}-${edge.to}`}
            d={edgePath(from, to)}
            fill="none"
            strokeWidth={edge.from === selectedId || edge.to === selectedId ? 2 : 1}
            strokeDasharray={
              edge.kind === 'dynamic' ? '5 3' : edge.kind === 'type' ? '2 3' : undefined
            }
            markerEnd={`url(#${markerId})`}
            className={edgeClass(edge.from, edge.to)}
          />
        )
      })}

      {layout.nodes.map((node) => {
        const isSelected = node.id === selectedId
        const isFaded = selectedId !== null && !isSelected && !neighbors.has(node.id)
        return (
          <g
            key={node.id}
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
            aria-label={node.id}
            onClick={() => onSelect(node.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelect(node.id)
              }
            }}
            className={`cursor-pointer ${isFaded ? 'opacity-35' : ''}`}
          >
            <rect
              x={node.x}
              y={node.y}
              width={NODE_WIDTH}
              height={NODE_HEIGHT}
              rx={5}
              strokeWidth={isSelected ? 3 : 1}
              className={LAYER_STYLES[node.layer].box}
            />
            <text
              x={node.x + 8}
              y={node.y + NODE_HEIGHT / 2 + 4}
              className={`${LAYER_STYLES[node.layer].text} font-mono text-[11px]`}
            >
              {truncate(node.label)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
