import { Card } from '@/dev/architecture/components/Card'
import { ModuleLink } from '@/dev/architecture/components/ModuleLink'
import type { ModuleGraph } from '@/dev/architecture/types'

interface ViolationsListProps {
  violations: ModuleGraph['violations']
  cycles: ModuleGraph['cycles']
}

/** Violações de camada e ciclos de import apontados pelo scanner, com o caminho exato. */
export function ViolationsList({ violations, cycles }: ViolationsListProps) {
  if (!violations.length && !cycles.length) {
    return (
      <p className="rounded-lg border border-emerald-500 p-3 text-sm dark:border-emerald-400">
        Nenhuma violação de camada e nenhum ciclo de import encontrados pelo scanner.
      </p>
    )
  }
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {violations.length > 0 && (
        <Card tone="danger">
          <Card.Title>Violações ({violations.length})</Card.Title>
          <ul className="flex flex-col gap-1 text-sm">
            {violations.map((v) => (
              <li key={`${v.from}-${v.to}-${v.rule}`} className="flex flex-wrap items-center gap-1">
                <ModuleLink id={v.from} /> → <ModuleLink id={v.to} />
                <span className="text-red-700 dark:text-red-300">{v.rule}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {cycles.length > 0 && (
        <Card tone="danger">
          <Card.Title>Ciclos ({cycles.length})</Card.Title>
          <ul className="flex flex-col gap-2 text-sm">
            {cycles.map((cycle) => (
              <li key={cycle.join('|')} className="flex flex-wrap items-center gap-1">
                {cycle.map((id) => (
                  <ModuleLink key={id} id={id} short />
                ))}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
