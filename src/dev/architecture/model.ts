// Índices derivados do grafo gerado + dados curados (§6.12). Tudo é estático: calculado uma vez
// quando o módulo carrega, sem custo por renderização.

import graphJson from '@/dev/architecture/data/module-graph.json'
import { FLOWS } from '@/dev/architecture/data/curated'
import { TIMELINE } from '@/dev/architecture/data/timeline'
import type { GraphModule, ModuleGraph, TimelineEntry } from '@/dev/architecture/types'

export const graph = graphJson as unknown as ModuleGraph

export const moduleById: ReadonlyMap<string, GraphModule> = new Map(
  graph.modules.map((m) => [m.id, m]),
)

export function isTestModule(m: GraphModule): boolean {
  return m.kinds.includes('test')
}

/** Código que roda no app (sem testes nem apoio a testes). */
export function isProductionModule(m: GraphModule): boolean {
  return !isTestModule(m) && m.layer !== 'test'
}

export function isProductionId(id: string): boolean {
  const m = moduleById.get(id)
  return m !== undefined && isProductionModule(m)
}

export function baseName(id: string): string {
  return id.slice(id.lastIndexOf('/') + 1)
}

/** Fases marcadas como opcionais na §7 (ex.: Fase 12 — D-26): nunca contam como atrasadas. */
export const optionalPhases: ReadonlySet<number> = new Set(
  graph.phases.filter((p) => p.optional).map((p) => p.number),
)

const requiredPhases = graph.phases.filter((p) => !p.optional)

/** Primeira fase obrigatória com tarefas pendentes (a fase "atual"). */
export const currentPhase: number =
  requiredPhases.find((p) => p.done < p.total)?.number ?? requiredPhases.length

// ---------- linha do tempo ----------

export function timelineFiles(entry: TimelineEntry): string[] {
  return [...entry.files.created, ...entry.files.modified, ...entry.files.removed]
}

export function timelineEntriesTouching(moduleId: string): TimelineEntry[] {
  return TIMELINE.filter((entry) => timelineFiles(entry).includes(moduleId))
}

export function flowsTouching(moduleId: string) {
  return FLOWS.filter((flow) => flow.participants.some((p) => p.module === moduleId))
}
