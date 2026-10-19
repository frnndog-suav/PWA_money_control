// §6.12 — índices derivados do grafo gerado + dados curados, calculados uma vez no carregamento.

import { layerEdges } from '@/dev/architecture/layers'
import { graph, isProductionModule } from '@/dev/architecture/model'
import type { GraphModule } from '@/dev/architecture/types'

export const LARGE_MODULE_LOC = 150
export const MANY_PROPS = 6

const ENTRY_POINTS = new Set(['index.html'])

export const orphanModules: readonly GraphModule[] = graph.modules.filter(
  (m) =>
    isProductionModule(m) &&
    m.layer !== 'config' &&
    !ENTRY_POINTS.has(m.id) &&
    m.importedBy.length === 0,
)

export const largeModules: readonly GraphModule[] = graph.modules
  .filter((m) => m.layer !== 'config' && m.loc > LARGE_MODULE_LOC && !m.kinds.includes('data'))
  .sort((a, b) => b.loc - a.loc)

export const untestedComponents: readonly GraphModule[] = graph.modules.filter(
  (m) =>
    isProductionModule(m) &&
    m.layer !== 'dev' &&
    m.kinds.includes('component') &&
    !(m.testedBy ?? []).length,
)

export const manyPropsComponents = graph.modules.flatMap((m) =>
  Object.entries(m.props)
    .filter(([, count]) => count >= MANY_PROPS)
    .map(([name, count]) => ({ module: m.id, name, count })),
)

/** Direções proibidas mas toleradas até um prazo (a última, features → app — D-22, foi quitada na Fase 2). */
export const layerDebts = layerEdges.filter((e) => e.status === 'debt')

export const undeclaredLayerEdges = layerEdges.filter(
  (e) => e.status === 'undeclared' || e.status === 'violation',
)
