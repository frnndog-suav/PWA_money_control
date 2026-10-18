import { useId } from 'react'
import { useInspector } from '@/dev/architecture/components/useInspector'
import type { Flow } from '@/dev/architecture/types'

const LANE_WIDTH = 156
const HEADER_HEIGHT = 46
const STEP_HEIGHT = 44
const PADDING = 12
const SELF_LOOP_WIDTH = 34
/** Largura média de um caractere do rótulo (11 px) para cortar o texto ao tamanho da seta. */
const CHAR_WIDTH = 6.2
const MIN_LABEL_CHARS = 18

interface FlowSequenceProps {
  flow: Flow
}

function fitLabel(text: string, span: number): string {
  const maxChars = Math.max(MIN_LABEL_CHARS, Math.floor(span / CHAR_WIDTH))
  return text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text
}

/** Diagrama de sequência: uma raia por participante, uma seta por passo (detalhes na lista abaixo). */
export function FlowSequence({ flow }: FlowSequenceProps) {
  const markerId = useId()
  const { select } = useInspector()
  const laneX = (id: string) =>
    flow.participants.findIndex((p) => p.id === id) * LANE_WIDTH + LANE_WIDTH / 2
  const width = flow.participants.length * LANE_WIDTH
  const height = HEADER_HEIGHT + PADDING * 2 + flow.steps.length * STEP_HEIGHT

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Diagrama de sequência: ${flow.title}`}
    >
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto"
        >
          <path d="M0,0 L10,5 L0,10 z" className="fill-slate-700 dark:fill-slate-200" />
        </marker>
      </defs>

      {flow.participants.map((p, index) => {
        const x = index * LANE_WIDTH
        const { module } = p
        const center = x + LANE_WIDTH / 2
        return (
          <g key={p.id}>
            <line
              x1={center}
              x2={center}
              y1={HEADER_HEIGHT}
              y2={height - PADDING / 2}
              strokeDasharray="4 4"
              className="stroke-slate-300 dark:stroke-slate-600"
            />
            <g
              role={module ? 'button' : undefined}
              tabIndex={module ? 0 : undefined}
              aria-label={module ? `Abrir ${module} no inspetor` : undefined}
              onClick={module ? () => select(module) : undefined}
              onKeyDown={
                module
                  ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        select(module)
                      }
                    }
                  : undefined
              }
              className={module ? 'cursor-pointer' : undefined}
            >
              <rect
                x={x + 6}
                y={4}
                width={LANE_WIDTH - 12}
                height={HEADER_HEIGHT - 12}
                rx={6}
                strokeWidth={1.5}
                className={
                  module
                    ? 'fill-blue-50 stroke-blue-500 dark:fill-blue-950'
                    : 'fill-slate-100 stroke-slate-400 dark:fill-slate-800'
                }
              />
              <text
                x={center}
                y={HEADER_HEIGHT / 2 + 2}
                textAnchor="middle"
                className="fill-slate-900 text-[11px] font-semibold dark:fill-slate-100"
              >
                {fitLabel(p.label, LANE_WIDTH - 20)}
              </text>
            </g>
          </g>
        )
      })}

      {flow.steps.map((step, index) => {
        const y = HEADER_HEIGHT + PADDING + index * STEP_HEIGHT + STEP_HEIGHT * 0.7
        const x1 = laneX(step.from)
        const x2 = laneX(step.to)
        const isSelf = x1 === x2
        const label = `${index + 1}. ${step.label}`
        const dash = step.kind === 'return' ? '5 3' : undefined
        return (
          <g key={`${index}-${step.label}`}>
            {isSelf ? (
              <path
                d={`M${x1},${y - 10} h${SELF_LOOP_WIDTH} v12 h-${SELF_LOOP_WIDTH - 2}`}
                fill="none"
                strokeWidth={1.4}
                strokeDasharray={dash}
                markerEnd={`url(#${markerId})`}
                className="stroke-slate-700 dark:stroke-slate-200"
              />
            ) : (
              <line
                x1={x1}
                x2={x2}
                y1={y}
                y2={y}
                strokeWidth={1.4}
                strokeDasharray={dash}
                markerEnd={`url(#${markerId})`}
                className="stroke-slate-700 dark:stroke-slate-200"
              />
            )}
            <text
              x={isSelf ? x1 + SELF_LOOP_WIDTH + 4 : (x1 + x2) / 2}
              y={y - (isSelf ? 12 : 6)}
              textAnchor={isSelf ? 'start' : 'middle'}
              className="fill-slate-800 text-[11px] dark:fill-slate-200"
            >
              {fitLabel(label, isSelf ? LANE_WIDTH - SELF_LOOP_WIDTH : Math.abs(x2 - x1))}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
