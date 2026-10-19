import { useId } from 'react'
import { LAYERS } from '@/dev/architecture/data/curated'
import { LAYER_STYLES } from '@/dev/architecture/components/layerStyles'
import { graph } from '@/dev/architecture/model'
import {
  arrowLine,
  arrows,
  BOX_HEIGHT,
  BOX_WIDTH,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  type Arrow,
  type ArrowStatus,
} from '@/dev/architecture/layerDiagramGeometry'
import type { Layer } from '@/dev/architecture/types'

const ARROW_CLASSES: Readonly<Record<ArrowStatus, string>> = {
  allowed: 'stroke-emerald-600 dark:stroke-emerald-400',
  exception: 'stroke-amber-500 dark:stroke-amber-400',
  debt: 'stroke-yellow-500 dark:stroke-yellow-300',
  undeclared: 'stroke-red-600 dark:stroke-red-400',
  violation: 'stroke-red-600 dark:stroke-red-400',
  unobserved: 'stroke-slate-400 dark:stroke-slate-500',
  forbidden: 'stroke-red-500/70 dark:stroke-red-400/70',
}

const MARKER_CLASSES: Readonly<Record<ArrowStatus, string>> = {
  allowed: 'fill-emerald-600 dark:fill-emerald-400',
  exception: 'fill-amber-500 dark:fill-amber-400',
  debt: 'fill-yellow-500 dark:fill-yellow-300',
  undeclared: 'fill-red-600 dark:fill-red-400',
  violation: 'fill-red-600 dark:fill-red-400',
  unobserved: 'fill-slate-400 dark:fill-slate-500',
  forbidden: 'fill-red-500/70 dark:fill-red-400/70',
}

interface LayerDiagramProps {
  focus: Layer | null
  onFocusChange: (layer: Layer | null) => void
}

export function LayerDiagram({ focus, onFocusChange }: LayerDiagramProps) {
  const markerPrefix = useId()
  const isDimmed = (arrow: Arrow) => focus !== null && arrow.from !== focus && arrow.to !== focus

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      role="img"
      aria-label="Diagrama das camadas e das direções de dependência"
      className="h-auto w-full min-w-160"
    >
      <defs>
        {(Object.keys(MARKER_CLASSES) as ArrowStatus[]).map((status) => (
          <marker
            key={status}
            id={`${markerPrefix}-${status}`}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" className={MARKER_CLASSES[status]} />
          </marker>
        ))}
      </defs>

      {arrows.map((arrow) => {
        const line = arrowLine(arrow)
        if (!line) return null
        const dimClass = isDimmed(arrow) ? 'opacity-10' : ''
        return (
          <g key={`${arrow.from}-${arrow.to}`} className={`transition-opacity ${dimClass}`}>
            <line
              {...line}
              strokeWidth={
                arrow.status === 'undeclared' || arrow.status === 'violation' ? 2.5 : 1.6
              }
              strokeDasharray={
                arrow.status === 'unobserved'
                  ? '5 4'
                  : arrow.status === 'forbidden'
                    ? '2 4'
                    : undefined
              }
              markerEnd={`url(#${markerPrefix}-${arrow.status})`}
              className={ARROW_CLASSES[arrow.status]}
            />
            {arrow.status === 'forbidden' && (
              <text
                x={(line.x1 + line.x2) / 2}
                y={(line.y1 + line.y2) / 2}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-red-600 text-base font-bold dark:fill-red-400"
              >
                ✕
              </text>
            )}
          </g>
        )
      })}

      {LAYERS.map((layer) => {
        const stats = graph.layerSummary[layer.id]
        const style = LAYER_STYLES[layer.id]
        const isFocused = focus === layer.id
        return (
          <g
            key={layer.id}
            role="button"
            tabIndex={0}
            aria-pressed={isFocused}
            aria-label={`Camada ${layer.label}: ${stats?.modules ?? 0} módulos`}
            onClick={() => onFocusChange(isFocused ? null : layer.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onFocusChange(isFocused ? null : layer.id)
              }
            }}
            className="cursor-pointer"
          >
            <rect
              x={layer.position.x}
              y={layer.position.y}
              width={BOX_WIDTH}
              height={BOX_HEIGHT}
              rx={8}
              strokeWidth={isFocused ? 3 : 1.5}
              strokeDasharray={stats ? undefined : '4 3'}
              className={style.box}
            />
            <text
              x={layer.position.x + BOX_WIDTH / 2}
              y={layer.position.y + 22}
              textAnchor="middle"
              className={`${style.text} text-[13px] font-semibold`}
            >
              {layer.label}
            </text>
            <text
              x={layer.position.x + BOX_WIDTH / 2}
              y={layer.position.y + 42}
              textAnchor="middle"
              className={`${style.text} text-[11px]`}
            >
              {stats ? `${stats.modules} mód · ${stats.loc} linhas` : 'vazia'}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
