// §6.12 — integridade da página de arquitetura: tudo o que foi escrito à mão (curated.ts e
// timeline.ts) precisa apontar para o que o scanner encontrou no código (module-graph.json).
// Se falhar depois de mover/renomear arquivos: rode o scanner e atualize a curadoria.
import { describe, expect, it } from 'vitest'
import graphJson from '@/dev/architecture/data/module-graph.json'
import {
  ALLOWED_DEPENDENCIES,
  ARCHITECTURE_FINDINGS,
  DECISIONS,
  FLOWS,
  FORBIDDEN_DEPENDENCIES,
  LAYERS,
  LOCAL_COMPONENT_ORIGINS,
  MODULE_NOTES,
  PRINCIPLES,
  REQUIREMENTS,
  ROUTE_NOTES,
  SCREEN_COMPOSITION,
  TABLE_NOTES,
} from '@/dev/architecture/data/curated'
import { TIMELINE } from '@/dev/architecture/data/timeline'
import type { ModuleGraph } from '@/dev/architecture/types'

const graph = graphJson as unknown as ModuleGraph

const knownPaths = new Set([
  ...graph.modules.map((m) => m.id),
  ...Object.keys(graph.assets),
  ...graph.repoFiles,
])
const removedInTimeline = new Set(TIMELINE.flatMap((entry) => entry.files.removed))
const graphRoutes = new Set(graph.routes.map((r) => r.path))
const knownRequirementIds = new Set([
  ...REQUIREMENTS.map((r) => r.id),
  ...DECISIONS.map((d) => d.id),
])

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/
/** Última fase da §7, inclusive as opcionais (ex.: Fase 12 — D-26). */
const LAST_PHASE = Math.max(...graph.phases.map((p) => p.number))

function curatedPaths(): string[] {
  return [
    ...Object.keys(MODULE_NOTES),
    ...Object.values(LOCAL_COMPONENT_ORIGINS),
    ...FLOWS.flatMap((f) => [...f.participants.flatMap((p) => p.module ?? []), ...f.tests]),
    ...DECISIONS.flatMap((d) => d.impacts),
    ...ARCHITECTURE_FINDINGS.flatMap((f) => f.modules),
    ...PRINCIPLES.flatMap((p) => [...p.modules, ...p.tests]),
  ]
}

function curatedRefs(): string[] {
  return [
    ...ROUTE_NOTES.flatMap((n) => n.requirements),
    ...FLOWS.flatMap((f) => [...f.requirements, ...f.steps.flatMap((s) => s.refs)]),
    ...TIMELINE.flatMap((e) => [...e.requirements, ...e.decisions]),
    ...PRINCIPLES.flatMap((p) => p.decisions),
  ]
}

/** `CA-09.3` é válido se `RF-09` existe; RF/RNF/D precisam estar nas listas curadas. */
function isKnownRef(ref: string): boolean {
  const criterion = ref.match(/^CA-(\d+)\.\d+$/)
  return criterion ? knownRequirementIds.has(`RF-${criterion[1]}`) : knownRequirementIds.has(ref)
}

describe('integridade da página de arquitetura (§6.12)', () => {
  it('todo caminho citado em curated.ts existe no grafo', () => {
    const missing = curatedPaths().filter((p) => !knownPaths.has(p))
    expect(missing).toEqual([])
  })

  it('pastas das camadas e prefixos das regras de dependência existem', () => {
    const prefixes = [
      ...LAYERS.map((l) => l.folder).filter((f) => f.startsWith('src')),
      ...ALLOWED_DEPENDENCIES.flatMap((r) => r.onlyTargets ?? []),
    ]
    const missing = prefixes.filter((prefix) => ![...knownPaths].some((p) => p.startsWith(prefix)))
    expect(missing).toEqual([])
  })

  it('todo arquivo citado na timeline existe, exceto os marcados como removidos', () => {
    const missing = TIMELINE.flatMap((entry) =>
      [...entry.files.created, ...entry.files.modified]
        .filter((p) => !knownPaths.has(p) && !removedInTimeline.has(p))
        .map((p) => `${entry.id}: ${p}`),
    )
    expect(missing).toEqual([])
  })

  it('direções proibidas não têm regra de permissão nem aparecem no código de produção', () => {
    const moduleOf = new Map(graph.modules.map((m) => [m.id, m]))
    const contradictions = FORBIDDEN_DEPENDENCIES.filter((f) =>
      ALLOWED_DEPENDENCIES.some((a) => a.from === f.from && a.to === f.to),
    ).map((f) => `${f.from} → ${f.to}`)
    expect(contradictions).toEqual([])

    const offending = graph.edges.filter((e) => {
      const from = moduleOf.get(e.from)
      const to = moduleOf.get(e.to)
      if (!from || !to || from.kinds.includes('test') || from.layer === 'test') return false
      return FORBIDDEN_DEPENDENCIES.some((f) => f.from === from.layer && f.to === to.layer)
    })
    expect(offending.map((e) => `${e.from} → ${e.to}`)).toEqual([])
  })

  // D-22 — quitada na Fase 2: features → app não tem mais exceção.
  it('features → app é proibida, sem exceção', () => {
    expect(FORBIDDEN_DEPENDENCIES.some((f) => f.from === 'features' && f.to === 'app')).toBe(true)
    expect(ALLOWED_DEPENDENCIES.some((a) => a.from === 'features' && a.to === 'app')).toBe(false)
  })

  it('toda tabela do esquema Dexie tem nota curada (e vice-versa)', () => {
    const schemaTables = Object.keys(graph.schema?.versions.at(-1)?.stores ?? {}).sort()
    expect(TABLE_NOTES.map((t) => t.name).sort()).toEqual(schemaTables)
  })

  it('toda rota implementada tem descrição curada', () => {
    const described = new Set(ROUTE_NOTES.map((n) => n.route))
    const undescribed = graph.routes.map((r) => r.path).filter((p) => !described.has(p))
    expect(undescribed).toEqual([])
  })

  it('não há descrição curada para rota inexistente', () => {
    const stale = [
      ...ROUTE_NOTES.map((n) => n.route),
      ...SCREEN_COMPOSITION.map((s) => s.route),
    ].filter((route) => !graphRoutes.has(route))
    expect(stale).toEqual([])
  })

  it('toda entrada da timeline tem data, fase e título', () => {
    for (const entry of TIMELINE) {
      expect(entry.date, entry.id).toMatch(ISO_DAY)
      const isValidPhase =
        entry.phase === 'pre' ||
        (Number.isInteger(entry.phase) && entry.phase >= 0 && entry.phase <= LAST_PHASE)
      expect(isValidPhase, entry.id).toBe(true)
      expect(entry.title.trim(), entry.id).not.toBe('')
    }
  })

  it('fases citadas na rastreabilidade existem na §7', () => {
    const phaseNumbers = new Set(graph.phases.map((p) => p.number))
    const unknown = REQUIREMENTS.flatMap((r) =>
      r.phases.filter((n) => !phaseNumbers.has(n)).map((n) => `${r.id}: Fase ${n}`),
    )
    expect(unknown).toEqual([])
  })

  it('achados de fase opcional apontam para uma fase marcada como opcional na §7', () => {
    const optional = new Set(graph.phases.filter((p) => p.optional).map((p) => p.number))
    const wrong = ARCHITECTURE_FINDINGS.filter(
      (f) => f.optionalPhase !== undefined && !optional.has(f.optionalPhase),
    ).map((f) => f.title)
    expect(wrong).toEqual([])
  })

  it('ids da timeline são únicos e commits batem com o git', () => {
    const ids = TIMELINE.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    const knownHashes = new Set(graph.commits.map((c) => c.hash))
    for (const entry of TIMELINE) {
      if (entry.committed) {
        expect(entry.commits.length, entry.id).toBeGreaterThan(0)
        expect(
          entry.commits.filter((h) => !knownHashes.has(h)),
          entry.id,
        ).toEqual([])
      } else {
        expect(entry.commits, entry.id).toEqual([])
      }
    }
  })

  it('passos dos fluxos citam participantes declarados', () => {
    for (const flow of FLOWS) {
      const ids = new Set(flow.participants.map((p) => p.id))
      const unknown = flow.steps.flatMap((s) => [s.from, s.to]).filter((id) => !ids.has(id))
      expect(unknown, flow.id).toEqual([])
    }
  })

  it('princípios da §2 numerados de 1 a N, sem lacuna nem repetição', () => {
    expect(PRINCIPLES.map((p) => p.number)).toEqual(PRINCIPLES.map((_, i) => i + 1))
  })

  it('IDs de requisito e decisão citados existem', () => {
    const unknown = [...new Set(curatedRefs())].filter((ref) => !isKnownRef(ref))
    expect(unknown).toEqual([])
  })
})
