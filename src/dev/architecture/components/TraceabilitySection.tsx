import { Badge, type BadgeVariant } from '@/dev/architecture/components/Badge'
import { Card } from '@/dev/architecture/components/Card'
import { CodeList } from '@/dev/architecture/components/CodeList'
import { ModuleList } from '@/dev/architecture/components/ModuleList'
import { Section } from '@/dev/architecture/components/Section'
import { PRINCIPLES } from '@/dev/architecture/data/curated'
import { currentPhase, optionalPhases } from '@/dev/architecture/model'
import {
  decisionTraces,
  requirementTraces,
  type RequirementTrace,
} from '@/dev/architecture/traceability'

function isOptionalOnly(trace: RequirementTrace): boolean {
  return trace.phases.length > 0 && trace.phases.every((phase) => optionalPhases.has(phase))
}

function statusBadge(trace: RequirementTrace): { text: string; variant: BadgeVariant } {
  if (isOptionalOnly(trace)) {
    const phases = trace.phases.join(', ')
    return trace.modules.length
      ? { text: `opcional (Fase ${phases}) · código preparado`, variant: 'neutral' }
      : { text: `opcional (Fase ${phases})`, variant: 'neutral' }
  }
  const isDue = trace.phases.some((phase) => phase <= currentPhase)
  if (trace.status === 'ok') return { text: 'código + teste', variant: 'ok' }
  if (trace.status === 'no-test') return { text: 'sem teste', variant: isDue ? 'danger' : 'warn' }
  return isDue
    ? { text: 'sem código (já devia ter)', variant: 'danger' }
    : { text: `previsto (Fase ${trace.phases.join(', ')})`, variant: 'neutral' }
}

export function TraceabilitySection() {
  return (
    <Section
      id="rastreabilidade"
      title="Rastreabilidade"
      description="Requisito → módulos que citam o ID (ou seus CAs) em comentários → testes que o citam. Fonte: IDs encontrados no código pelo scanner (a pasta src/dev fica de fora). Vermelho = requisito de fase atual/anterior sem código ou sem teste. Requisitos só de fases opcionais (ex.: RF-12, Fase 12 — D-26) ficam em cinza, nunca como atrasados."
    >
      <ul className="grid gap-2 lg:grid-cols-2">
        {requirementTraces.map((trace) => {
          const badge = statusBadge(trace)
          return (
            <li key={trace.id}>
              <Card tone={badge.variant === 'danger' ? 'danger' : 'default'}>
                <Card.Title trailing={<Badge variant={badge.variant}>{badge.text}</Badge>}>
                  {trace.id} — {trace.title}
                </Card.Title>
                <div className="grid gap-2 text-sm sm:grid-cols-[6rem_1fr]">
                  <span className="text-xs font-semibold text-slate-500">Fases</span>
                  <span>
                    {trace.phases
                      .map((phase) =>
                        optionalPhases.has(phase) ? `${phase} (opcional)` : String(phase),
                      )
                      .join(', ')}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">CAs citados</span>
                  <CodeList items={trace.criteria} />
                  <span className="text-xs font-semibold text-slate-500">Código</span>
                  <ModuleList ids={trace.modules} short />
                  <span className="text-xs font-semibold text-slate-500">Testes</span>
                  <ModuleList ids={trace.tests} short />
                </div>
              </Card>
            </li>
          )
        })}
      </ul>

      <PrinciplesCard />

      <Card>
        <Card.Title>Decisões registradas (§8.1)</Card.Title>
        <ul className="flex flex-col divide-y divide-slate-200 text-sm dark:divide-slate-700">
          {decisionTraces.map((decision) => (
            <li key={decision.id} className="flex flex-col gap-1 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{decision.id}</span>
                <span>{decision.title}</span>
                {decision.status === 'pending' && (
                  <Badge variant="warn">aguardando confirmação</Badge>
                )}
                {decision.status === 'superseded' && (
                  <Badge variant="neutral">
                    substituída{decision.supersededBy ? ` pela ${decision.supersededBy}` : ''}
                  </Badge>
                )}
              </div>
              <ModuleList ids={decision.modules} short empty="sem impacto no código ainda" />
            </li>
          ))}
        </ul>
      </Card>
    </Section>
  )
}

/** §2 — onde cada princípio vira código (curado: o scanner não extrai "princípio N"). */
function PrinciplesCard() {
  return (
    <Card>
      <Card.Title>Princípios da §2 (constituição)</Card.Title>
      <ul className="flex flex-col divide-y divide-slate-200 text-sm dark:divide-slate-700">
        {PRINCIPLES.map((principle) => (
          <li key={principle.number} className="flex flex-col gap-1 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{principle.number}.</span>
              <span>{principle.title}</span>
              <CodeList items={principle.decisions} empty="" />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">{principle.enforcement}</p>
            <div className="grid gap-1 text-xs sm:grid-cols-[6rem_1fr]">
              <span className="font-semibold text-slate-500">Padrão</span>
              <ModuleList ids={principle.modules} short empty="sem módulo próprio" />
              <span className="font-semibold text-slate-500">Testes</span>
              <ModuleList ids={principle.tests} short empty="—" />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
