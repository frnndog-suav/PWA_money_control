// §6.12 — índices derivados do grafo gerado + dados curados, calculados uma vez no carregamento.

import { DECISIONS, FLOWS } from '@/dev/architecture/data/curated'
import { routeDetails } from '@/dev/architecture/composition'
import { graph } from '@/dev/architecture/model'
import { requirementTraces } from '@/dev/architecture/traceability'

export type SearchKind =
  'módulo' | 'componente' | 'hook' | 'rota' | 'requisito' | 'decisão' | 'fluxo'

export interface SearchItem {
  kind: SearchKind
  label: string
  detail: string
  /** Módulo a abrir no inspetor, ou âncora da seção. */
  moduleId?: string
  anchor?: string
}

function buildSearchIndex(): SearchItem[] {
  const items: SearchItem[] = []
  for (const m of graph.modules) {
    items.push({ kind: 'módulo', label: m.id, detail: m.kinds.join(', '), moduleId: m.id })
    for (const c of m.components) {
      items.push({ kind: 'componente', label: c, detail: m.id, moduleId: m.id })
    }
    for (const h of m.hooksDefined)
      items.push({ kind: 'hook', label: h, detail: m.id, moduleId: m.id })
  }
  for (const r of routeDetails) {
    items.push({
      kind: 'rota',
      label: r.path,
      detail: r.screen,
      moduleId: r.module ?? r.definedIn,
    })
  }
  for (const r of requirementTraces) {
    items.push({ kind: 'requisito', label: r.id, detail: r.title, anchor: 'rastreabilidade' })
  }
  for (const d of DECISIONS) {
    items.push({ kind: 'decisão', label: d.id, detail: d.title, anchor: 'rastreabilidade' })
  }
  for (const f of FLOWS) {
    items.push({
      kind: 'fluxo',
      label: f.title,
      detail: f.requirements.join(', '),
      anchor: `fluxo-${f.id}`,
    })
  }
  return items
}

const searchIndex = buildSearchIndex()
export const SEARCH_LIMIT = 30

export function search(query: string): SearchItem[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (!terms.length) return []
  return searchIndex
    .filter((item) => {
      const haystack = `${item.label} ${item.detail}`.toLowerCase()
      return terms.every((t) => haystack.includes(t))
    })
    .slice(0, SEARCH_LIMIT)
}
