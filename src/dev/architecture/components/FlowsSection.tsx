import { FLOWS, PLANNED_FLOWS } from '@/dev/architecture/data/curated'
import { Badge } from '@/dev/architecture/components/Badge'
import { Card } from '@/dev/architecture/components/Card'
import { CodeList } from '@/dev/architecture/components/CodeList'
import { CryptoPipelineDiagram } from '@/dev/architecture/components/CryptoPipelineDiagram'
import { FlowSequence } from '@/dev/architecture/components/FlowSequence'
import { ModuleLink } from '@/dev/architecture/components/ModuleLink'
import { ModuleList } from '@/dev/architecture/components/ModuleList'
import { Section } from '@/dev/architecture/components/Section'
import type { Flow } from '@/dev/architecture/types'

function FlowCard({ flow }: { flow: Flow }) {
  const participant = (id: string) => flow.participants.find((p) => p.id === id)

  return (
    <Card id={`fluxo-${flow.id}`}>
      <Card.Title trailing={<CodeList items={flow.requirements} />}>{flow.title}</Card.Title>
      <p className="text-sm text-slate-600 dark:text-slate-400">{flow.summary}</p>
      <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-700">
        <FlowSequence flow={flow} />
      </div>
      <ol className="flex flex-col gap-2 text-sm">
        {flow.steps.map((step, index) => {
          const from = participant(step.from)
          const to = participant(step.to)
          return (
            <li key={`${index}-${step.label}`} className="flex flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-1">
                <span className="font-mono text-xs font-bold">{index + 1}.</span>
                {from?.module ? <ModuleLink id={from.module} short /> : <span>{from?.label}</span>}
                <span aria-hidden="true">{step.kind === 'return' ? '⇠' : '→'}</span>
                <span className="sr-only">{step.kind === 'return' ? 'retorna para' : 'chama'}</span>
                {to?.module ? <ModuleLink id={to.module} short /> : <span>{to?.label}</span>}
                <code className="text-xs">{step.label}</code>
                {step.refs.map((ref) => (
                  <Badge key={ref} variant="info">
                    {ref}
                  </Badge>
                ))}
              </div>
              <p className="pl-5 text-slate-600 dark:text-slate-400">{step.detail}</p>
            </li>
          )
        })}
      </ol>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold">Testes:</span>
        <ModuleList ids={flow.tests} short />
      </div>
    </Card>
  )
}

export function FlowsSection() {
  return (
    <Section
      id="fluxos"
      title="Fluxos de dados e interações"
      description="Diagramas de sequência curados (curated.ts); cada passo cita o módulo responsável e os IDs de requisito. Toque no cabeçalho de uma raia para abrir o módulo no inspetor."
    >
      <div className="grid gap-4 2xl:grid-cols-2">
        {FLOWS.map((flow) => (
          <FlowCard key={flow.id} flow={flow} />
        ))}
      </div>
      <Card id="pipeline-criptografia">
        <Card.Title trailing={<CodeList items={['RNF-05', 'CA-10.6', 'D-47']} />}>
          Pipeline de criptografia do backup (§6.8)
        </Card.Title>
        <CryptoPipelineDiagram />
      </Card>
      <Card>
        <Card.Title>Fluxos previstos (ainda não existem no código)</Card.Title>
        <ul className="flex flex-col gap-2 text-sm">
          {PLANNED_FLOWS.map((flow) => (
            <li key={flow.title} className="flex flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="warn">Fase {flow.phase}</Badge>
                <span className="font-semibold">{flow.title}</span>
                <CodeList items={flow.requirements} />
              </div>
              <p className="text-slate-600 dark:text-slate-400">{flow.summary}</p>
            </li>
          ))}
        </ul>
      </Card>
    </Section>
  )
}
