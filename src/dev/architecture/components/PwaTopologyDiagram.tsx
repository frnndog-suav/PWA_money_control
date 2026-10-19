import { useId } from 'react'
import { useInspector } from '@/dev/architecture/components/useInspector'
import { graph } from '@/dev/architecture/model'

// Topologia do PWA (§6.9): fontes → vite build + VitePWA → artefatos do dist/.
// Coordenadas fixas num viewBox de 920 × 430; o SVG escala com a largura (mínimo 640 px).

const VIEW_WIDTH = 920
const VIEW_HEIGHT = 430

type BoxTone = 'source' | 'build' | 'artifact' | 'excluded'

interface Box {
  id: string
  x: number
  y: number
  width: number
  height: number
  title: string
  lines: string[]
  tone: BoxTone
  /** Abre o inspetor ao tocar (caminho real do módulo). */
  module?: string
}

const TONE_CLASSES: Readonly<Record<BoxTone, { box: string; text: string }>> = {
  source: {
    box: 'fill-slate-50 stroke-slate-500 dark:fill-slate-800',
    text: 'fill-slate-900 dark:fill-slate-100',
  },
  build: {
    box: 'fill-violet-50 stroke-violet-500 dark:fill-violet-950',
    text: 'fill-violet-950 dark:fill-violet-100',
  },
  artifact: {
    box: 'fill-emerald-50 stroke-emerald-600 dark:fill-emerald-950',
    text: 'fill-emerald-950 dark:fill-emerald-100',
  },
  excluded: {
    box: 'fill-fuchsia-50 stroke-fuchsia-500 dark:fill-fuchsia-950',
    text: 'fill-fuchsia-950 dark:fill-fuchsia-100',
  },
}

const { build, pwa } = graph
const publicCount = Object.keys(graph.publicFiles).length
const precacheCount = build?.precache.length ?? 0
const iconScript = Object.values(graph.publicFiles).flatMap((f) => f.generatedBy)[0]

const BOXES: readonly Box[] = [
  {
    id: 'src',
    x: 16,
    y: 40,
    width: 250,
    height: 56,
    title: 'src/ (código do app)',
    lines: ['main.tsx registra o SW (registerPwa)'],
    tone: 'source',
    module: 'src/main.tsx',
  },
  {
    id: 'options',
    x: 16,
    y: 112,
    width: 250,
    height: 56,
    title: 'PWA_OPTIONS',
    lines: [pwa?.optionsModule ?? '(não encontrado)'],
    tone: 'source',
    module: pwa?.optionsModule,
  },
  {
    id: 'script',
    x: 16,
    y: 184,
    width: 250,
    height: 44,
    title: 'scripts/generate-icons.mjs',
    lines: ['manual, só zlib (D-25)'],
    tone: 'source',
    module: iconScript,
  },
  {
    id: 'public',
    x: 16,
    y: 248,
    width: 250,
    height: 56,
    title: `public/ (${publicCount} arquivos)`,
    lines: ['ícones do manifest, apple-touch, favicon'],
    tone: 'source',
  },
  {
    id: 'dev',
    x: 16,
    y: 340,
    width: 250,
    height: 64,
    title: 'src/dev/** (somente DEV)',
    lines: ['import() atrás de import.meta.env.DEV', 'eliminado do build e do precache'],
    tone: 'excluded',
  },
  {
    id: 'vite',
    x: 326,
    y: 40,
    width: 250,
    height: 264,
    title: 'npm run build',
    lines: [
      'Vite + VitePWA(PWA_OPTIONS)',
      '',
      `registerType: ${pwa?.registerType ?? '?'}`,
      `injectRegister: ${String(pwa?.injectRegister ?? '?')}`,
      `useCredentials: ${String(pwa?.useCredentials ?? '?')}`,
      `navigateFallback: ${pwa?.navigateFallback ?? '?'}`,
      `denylist: ${pwa?.navigateFallbackDenylist.join(' ') || '—'}`,
      '',
      'globPatterns:',
      ...(pwa?.globPatterns ?? []),
    ],
    tone: 'build',
    module: 'vite.config.ts',
  },
  {
    id: 'html',
    x: 636,
    y: 40,
    width: 268,
    height: 52,
    title: 'index.html',
    lines: ['+ <link rel="manifest" use-credentials>'],
    tone: 'artifact',
  },
  {
    id: 'assets',
    x: 636,
    y: 104,
    width: 268,
    height: 44,
    title: 'assets/*.js · *.css',
    lines: ['chunks por rota (React.lazy)'],
    tone: 'artifact',
  },
  {
    id: 'manifest',
    x: 636,
    y: 160,
    width: 268,
    height: 44,
    title: build?.manifest ?? 'manifest.webmanifest',
    lines: [`${pwa?.manifest.name ?? ''} · ${pwa?.manifest.display ?? ''}`],
    tone: 'artifact',
  },
  {
    id: 'sw',
    x: 636,
    y: 216,
    width: 268,
    height: 52,
    title: `${build?.serviceWorker ?? 'sw.js'} + ${build?.workboxRuntime ?? 'workbox-*.js'}`,
    lines: [`precache: ${precacheCount} arquivos`],
    tone: 'artifact',
  },
  {
    id: 'icons',
    x: 636,
    y: 280,
    width: 268,
    height: 32,
    title: 'ícones PNG (copiados de public/)',
    lines: [],
    tone: 'artifact',
  },
]

const ARROWS: readonly { from: string; to: string; excluded?: boolean }[] = [
  { from: 'src', to: 'vite' },
  { from: 'options', to: 'vite' },
  { from: 'script', to: 'public' },
  { from: 'public', to: 'vite' },
  { from: 'dev', to: 'vite', excluded: true },
  { from: 'vite', to: 'html' },
  { from: 'vite', to: 'assets' },
  { from: 'vite', to: 'manifest' },
  { from: 'vite', to: 'sw' },
  { from: 'vite', to: 'icons' },
]

const boxById = new Map(BOXES.map((b) => [b.id, b]))

function arrowPoints(fromId: string, toId: string) {
  const from = boxById.get(fromId)
  const to = boxById.get(toId)
  if (!from || !to) return null
  const fromCenterY = from.y + from.height / 2
  const toCenterY = to.y + to.height / 2
  if (from.x === to.x) {
    // Mesma coluna (script → public): seta vertical.
    const x = from.x + from.width / 2
    return { x1: x, y1: from.y + from.height, x2: x, y2: to.y - 2 }
  }
  const y2 = Math.min(Math.max(fromCenterY, to.y + 12), to.y + to.height - 12)
  return {
    x1: from.x + from.width,
    y1: fromCenterY,
    x2: to.x - 2,
    y2: from.x < to.x ? y2 : toCenterY,
  }
}

/** Diagrama: o que entra no build do PWA, o que sai no dist/ e o que fica de fora. */
export function PwaTopologyDiagram() {
  const markerId = useId()
  const { select } = useInspector()
  const leaks = build?.devLeaks.length ?? null

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      role="img"
      aria-label="Topologia do PWA: fontes, build e artefatos do dist"
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

      {[
        { x: 16, label: 'Fontes' },
        { x: 326, label: 'Build' },
        { x: 636, label: 'dist/ → Cloudflare Pages' },
      ].map((column) => (
        <text
          key={column.label}
          x={column.x}
          y={24}
          className="fill-slate-600 text-[12px] font-semibold dark:fill-slate-300"
        >
          {column.label}
        </text>
      ))}

      {ARROWS.map((arrow) => {
        const points = arrowPoints(arrow.from, arrow.to)
        if (!points) return null
        return (
          <line
            key={`${arrow.from}-${arrow.to}`}
            {...points}
            strokeWidth={1.6}
            strokeDasharray={arrow.excluded ? '5 4' : undefined}
            markerEnd={arrow.excluded ? undefined : `url(#${markerId})`}
            className={
              arrow.excluded
                ? 'stroke-red-600 dark:stroke-red-400'
                : 'stroke-slate-600 dark:stroke-slate-300'
            }
          />
        )
      })}
      {/* "X" no meio da seta tracejada src/dev → build: nada da página DEV entra no dist/. */}
      <g className="stroke-red-600 dark:stroke-red-400" strokeWidth={2.5}>
        <line x1={287} y1={324} x2={303} y2={340} />
        <line x1={303} y1={324} x2={287} y2={340} />
      </g>

      {BOXES.map((box) => {
        const tone = TONE_CLASSES[box.tone]
        const { module } = box
        const content = (
          <>
            <rect
              x={box.x}
              y={box.y}
              width={box.width}
              height={box.height}
              rx={8}
              strokeWidth={1.5}
              strokeDasharray={box.tone === 'excluded' ? '5 3' : undefined}
              className={tone.box}
            />
            <text
              x={box.x + 10}
              y={box.y + 20}
              className={`${tone.text} text-[12px] font-semibold`}
            >
              {box.title}
            </text>
            {box.lines.map((line, index) => (
              <text
                key={`${box.id}-${index}`}
                x={box.x + 10}
                y={box.y + 38 + index * 16}
                className={`${tone.text} font-mono text-[10.5px]`}
              >
                {line}
              </text>
            ))}
          </>
        )
        if (!module) return <g key={box.id}>{content}</g>
        return (
          <g
            key={box.id}
            role="button"
            tabIndex={0}
            aria-label={`Abrir ${module} no inspetor`}
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
      })}

      <text
        x={636}
        y={346}
        className={`text-[12px] font-semibold ${leaks === 0 ? 'fill-emerald-700 dark:fill-emerald-300' : 'fill-red-700 dark:fill-red-300'}`}
      >
        {leaks === null
          ? 'Sem dist/ no último scan'
          : leaks === 0
            ? '✓ 0 arquivos do dist/ citam a página DEV'
            : `✗ ${leaks} arquivo(s) do dist/ citam a página DEV`}
      </text>
      <text x={636} y={366} className="fill-slate-600 text-[11px] dark:fill-slate-300">
        Navegações → index.html do precache;
      </text>
      <text x={636} y={382} className="fill-slate-600 text-[11px] dark:fill-slate-300">
        /cdn-cgi/ → sempre pela rede (pronto para a Fase 12).
      </text>
    </svg>
  )
}
