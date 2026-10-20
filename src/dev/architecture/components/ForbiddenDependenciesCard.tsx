import { FORBIDDEN_DEPENDENCIES, LAYERS } from '@/dev/architecture/data/curated'
import { Badge } from '@/dev/architecture/components/Badge'
import { Card } from '@/dev/architecture/components/Card'
import { unobservedForbidden } from '@/dev/architecture/layers'
import type { Layer } from '@/dev/architecture/types'

const layerLabel = (id: Layer) => LAYERS.find((l) => l.id === id)?.label ?? id

/** Direções proibidas entre camadas e se alguma delas aparece no código (§2, D-22). */
export function ForbiddenDependenciesCard() {
  return (
    <Card>
      <Card.Title>Direções não permitidas</Card.Title>
      <p className="text-xs text-slate-500">
        Espelham as regras FORBIDDEN e FORBIDDEN_PATHS do scanner; "só …" limita a proibição aos
        módulos de origem com aquele caminho (o resto da camada segue a regra permitida). Sem
        ocorrência = o esperado; qualquer import numa destas direções vira violação em vermelho (nas
        setas e na saúde).
      </p>
      <ul className="flex flex-col divide-y divide-slate-200 dark:divide-slate-700">
        {FORBIDDEN_DEPENDENCIES.map((rule) => {
          const isClean = unobservedForbidden.includes(rule)
          return (
            <li
              key={`${rule.from}-${rule.to}-${rule.onlySources?.join(',') ?? ''}`}
              className="flex flex-col gap-1 py-2 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">
                  {layerLabel(rule.from)} → {layerLabel(rule.to)}
                </span>
                <Badge variant="danger">não permitida</Badge>
                <Badge>{rule.rule}</Badge>
                {rule.onlySources && <Badge variant="info">só {rule.onlySources.join(', ')}</Badge>}
                <Badge variant={isClean ? 'ok' : 'danger'}>
                  {isClean ? 'sem ocorrências' : 'violação no código'}
                </Badge>
              </div>
              <p className="text-slate-600 dark:text-slate-400">{rule.reason}</p>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
