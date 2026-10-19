// §6.12 — índices derivados do grafo gerado + dados curados, calculados uma vez no carregamento.

import { ALLOWED_DEPENDENCIES, FORBIDDEN_DEPENDENCIES } from '@/dev/architecture/data/curated'
import { graph, isProductionModule, moduleById } from '@/dev/architecture/model'
import type {
  AllowedDependency,
  DependencyStatus,
  ForbiddenDependency,
  GraphEdge,
  Layer,
} from '@/dev/architecture/types'

export type LayerEdgeStatus = DependencyStatus | 'undeclared' | 'violation'

export interface LayerEdge {
  from: Layer
  to: Layer
  edges: GraphEdge[]
  status: LayerEdgeStatus
  rule: AllowedDependency | null
  /** Direção proibida (FORBIDDEN_DEPENDENCIES) que aparece no código: sempre violação. */
  forbidden: ForbiddenDependency | null
  /** Imports desta direção fora do que a regra permite. */
  offending: GraphEdge[]
}

function findRule(from: Layer, to: Layer): AllowedDependency | null {
  return ALLOWED_DEPENDENCIES.find((r) => r.from === from && r.to === to) ?? null
}

function findForbidden(from: Layer, to: Layer): ForbiddenDependency | null {
  return FORBIDDEN_DEPENDENCIES.find((r) => r.from === from && r.to === to) ?? null
}

const violationKeys = new Set(graph.violations.map((v) => `${v.from}→${v.to}`))

function buildLayerEdges(): LayerEdge[] {
  const groups = new Map<string, GraphEdge[]>()
  for (const edge of graph.edges) {
    const from = moduleById.get(edge.from)
    const to = moduleById.get(edge.to)
    if (!from || !to || !isProductionModule(from)) continue
    const key = `${from.layer}|${to.layer}`
    groups.set(key, [...(groups.get(key) ?? []), edge])
  }

  return [...groups].map(([key, edges]) => {
    const [from, to] = key.split('|') as [Layer, Layer]
    const rule = findRule(from, to)
    const forbidden = findForbidden(from, to)
    const allowedTargets = rule?.onlyTargets
    const offending = !rule
      ? edges
      : allowedTargets
        ? edges.filter((e) => !allowedTargets.some((prefix) => e.to.startsWith(prefix)))
        : []
    const hasViolation = edges.some((e) => violationKeys.has(`${e.from}→${e.to}`))
    const status: LayerEdgeStatus =
      hasViolation || forbidden
        ? 'violation'
        : offending.length || !rule
          ? 'undeclared'
          : rule.status
    return { from, to, edges, status, rule, forbidden, offending }
  })
}

export const layerEdges: readonly LayerEdge[] = buildLayerEdges()

/** Regras declaradas que ainda não aparecem no código (ex.: features → repositories). */
export const unobservedRules: readonly AllowedDependency[] = ALLOWED_DEPENDENCIES.filter(
  (rule) =>
    rule.from !== rule.to && !layerEdges.some((e) => e.from === rule.from && e.to === rule.to),
)

/** Direções proibidas que não aparecem no código (o esperado): mostradas como "não permitida". */
export const unobservedForbidden: readonly ForbiddenDependency[] = FORBIDDEN_DEPENDENCIES.filter(
  (rule) => !layerEdges.some((e) => e.from === rule.from && e.to === rule.to),
)
