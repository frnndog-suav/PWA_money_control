import { useId } from 'react'
import { CRYPTO_PIPELINE, CRYPTO_PIPELINE_ARROWS } from '@/dev/architecture/data/curated'
import { Badge } from '@/dev/architecture/components/Badge'
import { ModuleLink } from '@/dev/architecture/components/ModuleLink'
import { useInspector } from '@/dev/architecture/components/useInspector'
import type { PipelineBox } from '@/dev/architecture/types'

// Pipeline de criptografia do backup (§6.8, RNF-05): senha + sal → PBKDF2 → chave →
// AES-GCM + IV → ciphertext → envelope. Grade fixa num viewBox de 940 × 280; o SVG escala com a
// largura (mínimo 640 px, com rolagem horizontal no celular). Os detalhes ficam numa lista em
// texto logo abaixo (nada depende de hover).

const VIEW_WIDTH = 940
const VIEW_HEIGHT = 280
const LEFT = 16
const BOX_WIDTH = 136
const COLUMN_STEP = 152
const ROW_TOP = [36, 156] as const
const LINE_HEIGHT = 15
/** Altura do centro da cadeia principal: as setas horizontais ficam alinhadas. */
const MAIN_AXIS_Y = ROW_TOP[0] + 26
/** Faixas por onde passam as setas tracejadas (valores copiados para o envelope). */
const COPY_LANES = [244, 262] as const

const TONE_CLASSES: Readonly<Record<PipelineBox['tone'], { box: string; text: string }>> = {
  input: {
    box: 'fill-slate-50 stroke-slate-500 dark:fill-slate-800',
    text: 'fill-slate-900 dark:fill-slate-100',
  },
  secret: {
    box: 'fill-amber-50 stroke-amber-600 dark:fill-amber-950',
    text: 'fill-amber-950 dark:fill-amber-100',
  },
  process: {
    box: 'fill-violet-50 stroke-violet-500 dark:fill-violet-950',
    text: 'fill-violet-950 dark:fill-violet-100',
  },
  output: {
    box: 'fill-emerald-50 stroke-emerald-600 dark:fill-emerald-950',
    text: 'fill-emerald-950 dark:fill-emerald-100',
  },
}

const TONE_LABELS: Readonly<Record<PipelineBox['tone'], string>> = {
  input: 'entrada',
  secret: 'segredo (só na memória)',
  process: 'operação (Web Crypto)',
  output: 'saída (vai para o arquivo)',
}

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

function rectOf(box: PipelineBox): Rect {
  return {
    x: LEFT + box.column * COLUMN_STEP,
    y: ROW_TOP[box.row],
    width: BOX_WIDTH,
    height: 30 + box.lines.length * LINE_HEIGHT,
  }
}

const rectById = new Map(CRYPTO_PIPELINE.map((box) => [box.id, rectOf(box)]))
const rowById = new Map(CRYPTO_PIPELINE.map((box) => [box.id, box.row]))

/** Pontos da seta: horizontal na cadeia principal, subindo da linha de baixo, ou pela faixa. */
function arrowPath(fromId: string, toId: string, laneIndex: number): string | null {
  const from = rectById.get(fromId)
  const to = rectById.get(toId)
  if (!from || !to) return null
  const fromCenterX = from.x + from.width / 2
  const toCenterX = to.x + to.width / 2
  if (laneIndex >= 0) {
    const laneY = COPY_LANES[laneIndex % COPY_LANES.length]
    const entryX = toCenterX - 20 + laneIndex * 40
    return `M${fromCenterX},${from.y + from.height} V${laneY} H${entryX} V${to.y + to.height + 2}`
  }
  if (rowById.get(fromId) === rowById.get(toId)) {
    return `M${from.x + from.width},${MAIN_AXIS_Y} H${to.x - 2}`
  }
  // Da linha de baixo para a cadeia: entra pela base da caixa de destino.
  const entryX = Math.min(Math.max(fromCenterX, to.x + 16), to.x + to.width - 16)
  return `M${fromCenterX},${from.y} L${entryX},${to.y + to.height + 2}`
}

/** Setas pré-calculadas: cada seta tracejada ganha a própria faixa. */
const ARROW_PATHS = CRYPTO_PIPELINE_ARROWS.flatMap((arrow) => {
  const lane = arrow.copy ? CRYPTO_PIPELINE_ARROWS.filter((a) => a.copy).indexOf(arrow) : -1
  const d = arrowPath(arrow.from, arrow.to, lane)
  return d ? [{ key: `${arrow.from}-${arrow.to}`, d, copy: arrow.copy === true }] : []
})

function PipelineNode({ box }: { box: PipelineBox }) {
  const { select } = useInspector()
  const rect = rectById.get(box.id)
  if (!rect) return null
  const tone = TONE_CLASSES[box.tone]
  const content = (
    <>
      <rect {...rect} rx={8} strokeWidth={1.5} className={tone.box} />
      <text x={rect.x + 10} y={rect.y + 19} className={`${tone.text} text-[12px] font-semibold`}>
        {box.title}
      </text>
      {box.lines.map((line, index) => (
        <text
          key={`${box.id}-${index}`}
          x={rect.x + 10}
          y={rect.y + 36 + index * LINE_HEIGHT}
          className={`${tone.text} font-mono text-[10px]`}
        >
          {line}
        </text>
      ))}
    </>
  )
  const { module } = box
  if (!module) return <g>{content}</g>
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${box.title}: abrir ${module} no inspetor`}
      onClick={() => select(module)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          select(module)
        }
      }}
      className="cursor-pointer"
    >
      {content}
    </g>
  )
}

function PipelineSvg() {
  const markerId = useId()
  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      role="img"
      aria-label="Pipeline de criptografia do backup: senha e sal entram no PBKDF2, a chave e o IV entram no AES-GCM com o conteúdo em claro, e o texto cifrado, o sal e o IV vão para o envelope"
      className="h-auto w-full min-w-160"
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
          <path d="M0,0 L10,5 L0,10 z" className="fill-slate-600 dark:fill-slate-300" />
        </marker>
      </defs>
      <text
        x={LEFT}
        y={22}
        className="fill-slate-600 text-[12px] font-semibold dark:fill-slate-300"
      >
        Exportar (importar faz o caminho inverso com o sal, o IV e as iterações do envelope)
      </text>
      {ARROW_PATHS.map((arrow) => (
        <path
          key={arrow.key}
          d={arrow.d}
          fill="none"
          strokeWidth={1.6}
          strokeDasharray={arrow.copy ? '5 4' : undefined}
          markerEnd={`url(#${markerId})`}
          className="stroke-slate-600 dark:stroke-slate-300"
        />
      ))}
      {CRYPTO_PIPELINE.map((box) => (
        <PipelineNode key={box.id} box={box} />
      ))}
    </svg>
  )
}

/** Diagrama do pipeline + a mesma informação em texto (toque num módulo abre o inspetor). */
export function CryptoPipelineDiagram() {
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-700">
        <PipelineSvg />
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-400">
        Setas cheias: entram no cálculo. Tracejadas: o valor é só copiado (em base64) para o
        envelope. Cores: {Object.values(TONE_LABELS).join(' · ')}.
      </p>
      <ol className="flex flex-col gap-2 text-sm">
        {CRYPTO_PIPELINE.map((box) => (
          <li key={box.id} className="flex flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-1">
              <span className="font-semibold">{box.title}</span>
              <Badge>{TONE_LABELS[box.tone]}</Badge>
              {box.module && <ModuleLink id={box.module} short />}
              {box.refs.map((ref) => (
                <Badge key={ref} variant="info">
                  {ref}
                </Badge>
              ))}
            </div>
            <p className="text-slate-600 dark:text-slate-400">{box.detail}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}
