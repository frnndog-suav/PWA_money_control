// §6.12 — índices derivados do grafo gerado + dados curados, calculados uma vez no carregamento.

import { DECISIONS, REQUIREMENTS } from '@/dev/architecture/data/curated'
import { graph, isTestModule } from '@/dev/architecture/model'
import type { GraphModule } from '@/dev/architecture/types'

const productionRefs = graph.modules.filter((m) => m.layer !== 'dev')

/** `CA-09.3` conta como citação de `RF-09`. */
function refMatches(ref: string, requirementId: string): boolean {
  if (ref === requirementId) return true
  return requirementId.startsWith('RF-') && ref.startsWith(`CA-${requirementId.slice(3)}.`)
}

function citesRequirement(m: GraphModule, id: string): boolean {
  return m.requirementRefs.some((ref) => refMatches(ref, id))
}

export type TraceStatus = 'ok' | 'no-test' | 'no-code'

export interface RequirementTrace {
  id: string
  title: string
  phases: number[]
  modules: string[]
  tests: string[]
  criteria: string[]
  status: TraceStatus
}

export const requirementTraces: readonly RequirementTrace[] = REQUIREMENTS.map((req) => {
  const citing = productionRefs.filter((m) => citesRequirement(m, req.id))
  const modules = citing.filter((m) => !isTestModule(m)).map((m) => m.id)
  const tests = citing.filter(isTestModule).map((m) => m.id)
  const criteria = [
    ...new Set(
      citing.flatMap((m) =>
        m.requirementRefs.filter((r) => r.startsWith('CA-') && refMatches(r, req.id)),
      ),
    ),
  ].sort()
  const status: TraceStatus = !modules.length ? 'no-code' : !tests.length ? 'no-test' : 'ok'
  return { ...req, modules, tests, criteria, status }
})

export const decisionTraces = DECISIONS.map((decision) => {
  const citing = productionRefs
    .filter((m) => m.requirementRefs.includes(decision.id))
    .map((m) => m.id)
  return { ...decision, modules: [...new Set([...citing, ...decision.impacts])].sort() }
})
