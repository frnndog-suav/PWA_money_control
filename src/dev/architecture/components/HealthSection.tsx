import type { ReactNode } from 'react'
import { ARCHITECTURE_FINDINGS } from '@/dev/architecture/data/curated'
import { Badge } from '@/dev/architecture/components/Badge'
import { Card } from '@/dev/architecture/components/Card'
import { ModuleLink } from '@/dev/architecture/components/ModuleLink'
import { ModuleList } from '@/dev/architecture/components/ModuleList'
import { Section } from '@/dev/architecture/components/Section'
import { ViolationsList } from '@/dev/architecture/components/ViolationsList'
import { graph } from '@/dev/architecture/model'
import type { ArchitectureFinding } from '@/dev/architecture/types'
import {
  LARGE_MODULE_LOC,
  largeModules,
  layerDebts,
  MANY_PROPS,
  manyPropsComponents,
  orphanModules,
  undeclaredLayerEdges,
  untestedComponents,
} from '@/dev/architecture/health'

interface CheckProps {
  title: string
  count: number
  /** Um resultado diferente de zero é problema (vermelho) ou só atenção (amarelo). */
  severity: 'danger' | 'warn'
  children: ReactNode
}

const openFindings = ARCHITECTURE_FINDINGS.filter(
  (f) => !f.resolved && f.optionalPhase === undefined,
)
/** Só valem se a fase opcional for feita (ex.: Fase 12 — D-26): não são problema em aberto. */
const optionalPhaseFindings = ARCHITECTURE_FINDINGS.filter(
  (f) => !f.resolved && f.optionalPhase !== undefined,
)
const resolvedFindings = ARCHITECTURE_FINDINGS.filter((f) => f.resolved)

function FindingList({ findings }: { findings: readonly ArchitectureFinding[] }) {
  return (
    <ul className="flex flex-col divide-y divide-slate-200 dark:divide-slate-700">
      {findings.map((finding) => (
        <li key={finding.title} className="flex flex-col gap-1 py-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            {finding.resolved ? (
              <Badge variant="ok">resolvido</Badge>
            ) : finding.optionalPhase !== undefined ? (
              <Badge>Fase {finding.optionalPhase} · opcional</Badge>
            ) : (
              <Badge variant={finding.severity}>{finding.severity}</Badge>
            )}
            <span className="font-semibold">{finding.title}</span>
          </div>
          <p className="text-slate-600 dark:text-slate-400">{finding.detail}</p>
          {finding.resolved && (
            <p className="text-emerald-800 dark:text-emerald-300">{finding.resolved}</p>
          )}
          <ModuleList ids={finding.modules} short />
        </li>
      ))}
    </ul>
  )
}

function Check({ title, count, severity, children }: CheckProps) {
  return (
    <Card tone={count ? severity : 'default'}>
      <Card.Title trailing={<Badge variant={count ? severity : 'ok'}>{count}</Badge>}>
        {title}
      </Card.Title>
      {count ? children : <p className="text-sm text-slate-500">nada encontrado</p>}
    </Card>
  )
}

export function HealthSection() {
  return (
    <Section
      id="saude"
      title="Saúde da arquitetura"
      description="Verificações automáticas sobre o grafo gerado e achados registrados à mão. Nada aqui é corrigido pela página: os problemas são reportados para a próxima sessão decidir."
    >
      <ViolationsList violations={graph.violations} cycles={graph.cycles} />

      <div className="grid gap-3 lg:grid-cols-2">
        <Check
          title="Dependências entre camadas fora das regras"
          count={undeclaredLayerEdges.length}
          severity="danger"
        >
          <ul className="flex flex-col gap-1 text-sm">
            {undeclaredLayerEdges.flatMap((edge) =>
              edge.offending.map((e) => (
                <li key={`${e.from}-${e.to}`} className="flex flex-wrap items-center gap-1">
                  <ModuleLink id={e.from} /> → <ModuleLink id={e.to} />
                </li>
              )),
            )}
          </ul>
        </Check>
        <Check
          title="Dívidas de arquitetura com prazo"
          count={layerDebts.reduce((n, e) => n + e.edges.length, 0)}
          severity="warn"
        >
          <ul className="flex flex-col gap-2 text-sm">
            {layerDebts.map((edge) => (
              <li key={`${edge.from}-${edge.to}`} className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">
                    {edge.from} → {edge.to}
                  </span>
                  {edge.rule?.deadline && <Badge variant="warn">prazo: {edge.rule.deadline}</Badge>}
                </div>
                {edge.edges.map((e) => (
                  <span key={`${e.from}-${e.to}`} className="flex flex-wrap items-center gap-1">
                    <ModuleLink id={e.from} /> → <ModuleLink id={e.to} />
                  </span>
                ))}
              </li>
            ))}
          </ul>
        </Check>
        <Check title="Imports não resolvidos" count={graph.unresolved.length} severity="danger">
          <ul className="flex flex-col gap-1 text-sm">
            {graph.unresolved.map((u) => (
              <li key={`${u.from}-${u.to}`} className="flex flex-wrap items-center gap-1">
                <ModuleLink id={u.from} /> → <code className="text-xs">{u.to}</code>
              </li>
            ))}
          </ul>
        </Check>
        <Check
          title="Módulos órfãos (ninguém importa)"
          count={orphanModules.length}
          severity="warn"
        >
          <ModuleList ids={orphanModules.map((m) => m.id)} />
        </Check>
        <Check
          title={`Módulos grandes (> ${LARGE_MODULE_LOC} linhas)`}
          count={largeModules.length}
          severity="warn"
        >
          <ul className="flex flex-col gap-1 text-sm">
            {largeModules.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-1">
                <ModuleLink id={m.id} /> <span className="text-xs">{m.loc} linhas</span>
              </li>
            ))}
          </ul>
        </Check>
        <Check
          title={`Componentes com ${MANY_PROPS}+ props`}
          count={manyPropsComponents.length}
          severity="warn"
        >
          <ul className="flex flex-col gap-1 text-sm">
            {manyPropsComponents.map((c) => (
              <li key={`${c.module}-${c.name}`} className="flex flex-wrap items-center gap-1">
                <ModuleLink id={c.module} short /> <code className="text-xs">{c.name}</code>{' '}
                {c.count}
              </li>
            ))}
          </ul>
        </Check>
        <Check
          title="Componentes sem teste direto"
          count={untestedComponents.length}
          severity="warn"
        >
          <p className="text-xs text-slate-500">
            Sem teste que importe o arquivo ou tenha o mesmo nome. Vários são cobertos indiretamente
            pelos testes que renderizam o app inteiro (src/test/renderApp.tsx).
          </p>
          <ModuleList ids={untestedComponents.map((m) => m.id)} short />
        </Check>
      </div>

      <Card>
        <Card.Title>Achados em aberto (curated.ts)</Card.Title>
        <FindingList findings={openFindings} />
      </Card>
      {optionalPhaseFindings.length > 0 && (
        <Card>
          <Card.Title trailing={<Badge>{optionalPhaseFindings.length}</Badge>}>
            Itens de fases opcionais
          </Card.Title>
          <p className="text-xs text-slate-500">
            Não contam como pendência: só serão verificados se a fase opcional for feita, depois da
            Fase 11.
          </p>
          <FindingList findings={optionalPhaseFindings} />
        </Card>
      )}
      {resolvedFindings.length > 0 && (
        <Card>
          <Card.Title trailing={<Badge variant="ok">{resolvedFindings.length}</Badge>}>
            Achados resolvidos
          </Card.Title>
          <FindingList findings={resolvedFindings} />
        </Card>
      )}

      <Card tone={graph.git.workingTree.length ? 'warn' : 'default'}>
        <Card.Title>Mudanças não commitadas ({graph.git.workingTree.length})</Card.Title>
        <ul className="flex flex-wrap gap-x-3 gap-y-1">
          {graph.git.workingTree.map((file) => (
            <li key={file.path} className="flex items-center gap-1">
              <code className="text-xs font-bold">{file.status}</code>
              <ModuleLink id={file.path} />
            </li>
          ))}
        </ul>
      </Card>
    </Section>
  )
}
