import { useState } from 'react'
import { LAYERS } from '@/dev/architecture/data/curated'
import { Badge, type BadgeVariant } from '@/dev/architecture/components/Badge'
import { Card } from '@/dev/architecture/components/Card'
import { LayerDiagram } from '@/dev/architecture/components/LayerDiagram'
import { LAYER_STYLES } from '@/dev/architecture/components/layerStyles'
import { ModuleLink } from '@/dev/architecture/components/ModuleLink'
import { Section } from '@/dev/architecture/components/Section'
import { ViolationsList } from '@/dev/architecture/components/ViolationsList'
import { graph } from '@/dev/architecture/model'
import { layerEdges, unobservedRules, type LayerEdgeStatus } from '@/dev/architecture/layers'
import type { Layer } from '@/dev/architecture/types'

const STATUS_LABELS: Readonly<Record<LayerEdgeStatus, { text: string; variant: BadgeVariant }>> = {
  allowed: { text: 'permitida', variant: 'ok' },
  exception: { text: 'exceção documentada', variant: 'warn' },
  debt: { text: 'dívida conhecida', variant: 'warn' },
  undeclared: { text: 'não declarada', variant: 'danger' },
  violation: { text: 'violação', variant: 'danger' },
}

const layerLabel = (id: Layer) => LAYERS.find((l) => l.id === id)?.label ?? id

function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
      <li>
        <span className="mr-1 inline-block h-0.5 w-6 bg-emerald-600 align-middle" /> permitida e
        usada
      </li>
      <li>
        <span className="mr-1 inline-block h-0.5 w-6 bg-amber-500 align-middle" /> exceção
        documentada
      </li>
      <li>
        <span className="mr-1 inline-block h-0.5 w-6 bg-yellow-500 align-middle" /> dívida
        conhecida, com prazo
      </li>
      <li>
        <span className="mr-1 inline-block h-0.5 w-6 bg-red-600 align-middle" /> não declarada ou
        violação
      </li>
      <li>
        <span className="mr-1 inline-block w-6 border-t-2 border-dashed border-slate-400 align-middle" />{' '}
        permitida, ainda sem uso
      </li>
    </ul>
  )
}

export function LayersSection() {
  const [focus, setFocus] = useState<Layer | null>(null)
  const visibleEdges = layerEdges
    .filter((e) => focus === null || e.from === focus || e.to === focus)
    .sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to))

  return (
    <Section
      id="camadas"
      title="Camadas"
      description="Caixas = pastas da §6.2 (contagens do scanner). Setas = direções de dependência observadas no código de produção, comparadas com as direções permitidas (curated.ts). Toque numa camada para focar."
    >
      <div className="overflow-x-auto rounded-lg border border-slate-200 p-2 dark:border-slate-700">
        <LayerDiagram focus={focus} onFocusChange={setFocus} />
      </div>
      <Legend />

      <ViolationsList violations={graph.violations} cycles={graph.cycles} />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <Card.Title>Camadas</Card.Title>
          <ul className="flex flex-col gap-2">
            {LAYERS.map((layer) => {
              const stats = graph.layerSummary[layer.id]
              return (
                <li key={layer.id} className="flex flex-col gap-0.5 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge colorClassName={LAYER_STYLES[layer.id].chip}>{layer.label}</Badge>
                    <code className="text-xs">{layer.folder}</code>
                    <span className="text-xs text-slate-500">
                      {stats
                        ? `${stats.modules} módulos · ${stats.loc} linhas · ${stats.components} componentes · ${stats.hooks} hooks · ${stats.tests} testes`
                        : 'vazia'}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">{layer.description}</p>
                </li>
              )
            })}
          </ul>
        </Card>

        <Card>
          <Card.Title
            trailing={
              focus && (
                <button
                  type="button"
                  onClick={() => setFocus(null)}
                  className="min-h-8 rounded border border-slate-300 px-2 text-xs dark:border-slate-600"
                >
                  Mostrar todas (foco: {layerLabel(focus)})
                </button>
              )
            }
          >
            Dependências entre camadas
          </Card.Title>
          <ul className="flex flex-col divide-y divide-slate-200 dark:divide-slate-700">
            {visibleEdges.map((edge) => (
              <li key={`${edge.from}-${edge.to}`} className="flex flex-col gap-1 py-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">
                    {layerLabel(edge.from)} → {layerLabel(edge.to)}
                  </span>
                  <Badge variant={STATUS_LABELS[edge.status].variant}>
                    {STATUS_LABELS[edge.status].text}
                  </Badge>
                  {edge.status === 'debt' && edge.rule?.deadline && (
                    <Badge variant="warn">prazo: {edge.rule.deadline}</Badge>
                  )}
                  <span className="text-xs text-slate-500">{edge.edges.length} import(s)</span>
                </div>
                {edge.rule && (
                  <p className="text-slate-600 dark:text-slate-400">{edge.rule.reason}</p>
                )}
                {edge.offending.length > 0 && (
                  <ul className="flex flex-col gap-0.5 text-red-700 dark:text-red-300">
                    {edge.offending.map((e) => (
                      <li key={`${e.from}-${e.to}`} className="flex flex-wrap items-center gap-1">
                        fora da regra: <ModuleLink id={e.from} /> → <ModuleLink id={e.to} />
                      </li>
                    ))}
                  </ul>
                )}
                <details>
                  <summary className="min-h-8 cursor-pointer text-xs text-slate-500">
                    ver os imports
                  </summary>
                  <ul className="flex flex-col gap-0.5 pt-1">
                    {edge.edges.map((e) => (
                      <li key={`${e.from}-${e.to}`} className="flex flex-wrap items-center gap-1">
                        <ModuleLink id={e.from} short /> → <ModuleLink id={e.to} short />
                        <span className="text-xs text-slate-500">
                          {e.kind} {e.names.join(', ')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ul>
          {focus === null && unobservedRules.length > 0 && (
            <p className="text-xs text-slate-500">
              Permitidas e ainda sem uso:{' '}
              {unobservedRules
                .map((r) => `${layerLabel(r.from)} → ${layerLabel(r.to)}`)
                .join(' · ')}
            </p>
          )}
        </Card>
      </div>
    </Section>
  )
}
