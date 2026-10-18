import { useState } from 'react'
import { LAYERS } from '@/dev/architecture/data/curated'
import { LAYER_STYLES } from '@/dev/architecture/components/layerStyles'
import { ModuleGraph } from '@/dev/architecture/components/ModuleGraph'
import { Section } from '@/dev/architecture/components/Section'
import { useInspector } from '@/dev/architecture/components/useInspector'
import { graph, isTestModule } from '@/dev/architecture/model'
import type { GraphModule, Layer, ModuleKind } from '@/dev/architecture/types'

const ALL = 'all'
const KIND_OPTIONS: readonly { value: ModuleKind | typeof ALL; label: string }[] = [
  { value: ALL, label: 'Todos os tipos' },
  { value: 'component', label: 'Componentes' },
  { value: 'page', label: 'Telas' },
  { value: 'hook', label: 'Hooks' },
  { value: 'context', label: 'Contextos' },
  { value: 'store', label: 'Stores' },
  { value: 'routing', label: 'Rotas' },
  { value: 'test', label: 'Testes' },
  { value: 'config', label: 'Configuração' },
]

const features = [...new Set(graph.modules.flatMap((m) => m.feature ?? []))].sort()
const presentLayers = LAYERS.filter((l) => graph.layerSummary[l.id])

const selectClass =
  'min-h-11 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-600 dark:bg-slate-900'

export function ModuleGraphSection() {
  const { selectedId, select } = useInspector()
  const [hiddenLayers, setHiddenLayers] = useState<ReadonlySet<Layer>>(() => new Set(['dev']))
  const [feature, setFeature] = useState<string>(ALL)
  const [kind, setKind] = useState<ModuleKind | typeof ALL>(ALL)
  const [showTests, setShowTests] = useState(false)

  function toggleLayer(layer: Layer) {
    const next = new Set(hiddenLayers)
    if (next.has(layer)) next.delete(layer)
    else next.add(layer)
    setHiddenLayers(next)
  }

  const isVisible = (m: GraphModule) =>
    !hiddenLayers.has(m.layer) &&
    (feature === ALL || m.feature === feature || m.layer !== 'features') &&
    (kind === ALL || m.kinds.includes(kind)) &&
    (showTests || kind === 'test' || !isTestModule(m))
  const visible = graph.modules.filter(isVisible)

  return (
    <Section
      id="grafo"
      title="Grafo de módulos"
      description="Cada caixa é um arquivo; colunas = camadas, grupos = subpastas. Linha contínua = import estático, tracejada = import dinâmico (lazy), pontilhada = só tipos. Toque num módulo para abrir o inspetor; saídas em azul, entradas em verde."
    >
      <div className="flex flex-col gap-3">
        <div role="group" aria-label="Camadas visíveis" className="flex flex-wrap gap-2">
          {presentLayers.map((layer) => (
            <button
              key={layer.id}
              type="button"
              aria-pressed={!hiddenLayers.has(layer.id)}
              onClick={() => toggleLayer(layer.id)}
              className={`min-h-9 rounded-full px-3 text-xs font-medium aria-[pressed=false]:opacity-40 aria-[pressed=false]:line-through ${LAYER_STYLES[layer.id].chip}`}
            >
              {layer.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            Feature
            <select
              value={feature}
              onChange={(e) => setFeature(e.target.value)}
              className={selectClass}
            >
              <option value={ALL}>Todas</option>
              {features.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            Tipo
            <select
              value={kind}
              onChange={(e) =>
                setKind(KIND_OPTIONS.find((o) => o.value === e.target.value)?.value ?? ALL)
              }
              className={selectClass}
            >
              {KIND_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showTests}
              onChange={(e) => setShowTests(e.target.checked)}
              className="size-5"
            />
            Mostrar testes
          </label>
          <span className="text-xs text-slate-500">
            {visible.length} de {graph.modules.length} módulos
          </span>
        </div>
      </div>
      <div className="max-h-[75dvh] overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <ModuleGraph modules={visible} selectedId={selectedId} onSelect={select} />
      </div>
    </Section>
  )
}
