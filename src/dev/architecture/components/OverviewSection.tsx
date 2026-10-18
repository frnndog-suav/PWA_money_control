import { Badge } from '@/dev/architecture/components/Badge'
import { Card } from '@/dev/architecture/components/Card'
import { formatInstant, formatInteger } from '@/dev/architecture/components/format'
import { ProgressBar } from '@/dev/architecture/components/ProgressBar'
import { Section } from '@/dev/architecture/components/Section'
import { currentPhase, graph } from '@/dev/architecture/model'

const STATS: readonly { label: string; value: number }[] = [
  { label: 'Módulos em src/', value: graph.totals.modules },
  { label: 'Linhas (sem vazias)', value: graph.totals.loc },
  { label: 'Componentes', value: graph.totals.components },
  { label: 'Hooks', value: graph.totals.hooks },
  { label: 'Arquivos de teste', value: graph.totals.tests },
  { label: 'Arestas de import', value: graph.totals.edges },
  { label: 'Rotas', value: graph.routes.filter((r) => !r.layout).length },
  { label: 'Arquivos de configuração', value: graph.totals.configFiles },
]

const runtimePackages = Object.entries(graph.packages).filter(([, p]) => p.declared && !p.dev)
const toolingPackages = Object.entries(graph.packages).filter(([, p]) => p.declared && p.dev)

function PackageChips({ entries }: { entries: typeof runtimePackages }) {
  return (
    <ul className="flex flex-wrap gap-1">
      {entries.map(([name, p]) => (
        <li key={name}>
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">
            {name}@{p.installed ?? p.version}
          </code>
        </li>
      ))}
    </ul>
  )
}

export function OverviewSection() {
  const { git } = graph
  return (
    <Section
      id="visao-geral"
      title="Visão geral"
      description="Totais e estado extraídos do código pelo scanner (module-graph.json)."
    >
      <div className="flex flex-wrap gap-2 text-sm">
        <Badge variant="dev">somente DEV</Badge>
        <Badge>gerado em {formatInstant(graph.generatedAt)}</Badge>
        <Badge>
          {git.branch} @ {git.head}
        </Badge>
        <Badge variant={git.workingTree.length ? 'warn' : 'ok'}>
          {git.workingTree.length} arquivo(s) não commitado(s)
        </Badge>
      </div>
      <p className="text-sm">
        <span className="font-semibold">Spec:</span> versão {graph.specVersion}
      </p>

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
        {STATS.map((stat) => (
          <li
            key={stat.label}
            className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
          >
            <p className="text-2xl font-bold tabular-nums">{formatInteger(stat.value)}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400">{stat.label}</p>
          </li>
        ))}
      </ul>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <Card.Title trailing={<Badge variant="info">fase atual: {currentPhase}</Badge>}>
            Progresso das fases (§7)
          </Card.Title>
          <div className="flex flex-col gap-2">
            {graph.phases.map((phase) => (
              <ProgressBar
                key={phase.number}
                label={`Fase ${phase.number} — ${phase.title}`}
                done={phase.done}
                total={phase.total}
              />
            ))}
          </div>
        </Card>
        <Card>
          <Card.Title>Stack instalada</Card.Title>
          <h4 className="text-sm font-semibold">Dependências do app</h4>
          <PackageChips entries={runtimePackages} />
          <h4 className="text-sm font-semibold">Ferramentas (devDependencies)</h4>
          <PackageChips entries={toolingPackages} />
        </Card>
      </div>
    </Section>
  )
}
