// §6.12 — índices derivados do grafo gerado + dados curados, calculados uma vez no carregamento.

import { LOCAL_COMPONENT_ORIGINS, ROUTE_NOTES } from '@/dev/architecture/data/curated'
import { graph, isProductionModule, moduleById } from '@/dev/architecture/model'
import type { GraphModule } from '@/dev/architecture/types'

export interface TreeNode {
  name: string
  parts: string[]
  module: string | null
  external: string | null
  children: TreeNode[]
  /** Já expandido acima nesta árvore (evita repetir/ciclos). */
  repeated: boolean
}

function resolveComponent(
  owner: GraphModule,
  name: string,
): { module: string | null; external: string | null } {
  const edge = graph.edges.find(
    (e) => e.from === owner.id && e.names.some((n) => n === name || n === `default as ${name}`),
  )
  if (edge) {
    const target = moduleById.get(edge.to)
    const lazyTarget = target?.lazyComponents[name]
    return { module: lazyTarget ?? edge.to, external: null }
  }
  if (owner.lazyComponents[name]) return { module: owner.lazyComponents[name], external: null }
  if (LOCAL_COMPONENT_ORIGINS[name])
    return { module: LOCAL_COMPONENT_ORIGINS[name], external: null }
  const pkg = owner.external.find((e) => e.names.includes(name))
  return { module: null, external: pkg ? pkg.package : 'local' }
}

/** Componentes renderizados por um módulo, recursivamente (a ordem do JSX não é preservada). */
export function buildComponentTree(moduleId: string, seen: Set<string> = new Set()): TreeNode[] {
  const owner = moduleById.get(moduleId)
  if (!owner) return []
  const nextSeen = new Set(seen).add(moduleId)
  const byBase = new Map<string, string[]>()
  for (const name of owner.jsxUsed) {
    const [base, ...rest] = name.split('.')
    const parts = byBase.get(base) ?? []
    if (rest.length) parts.push(rest.join('.'))
    byBase.set(base, parts)
  }
  return [...byBase].map(([name, parts]) => {
    const { module, external } = resolveComponent(owner, name)
    const repeated = module !== null && nextSeen.has(module)
    const isSelf = module === moduleId
    return {
      name,
      parts,
      module,
      external,
      repeated: repeated && !isSelf,
      children:
        module && !repeated
          ? [
              ...buildComponentTree(module, nextSeen),
              ...compoundPartNodes(name, parts, module, nextSeen),
            ]
          : [],
    }
  })
}

/**
 * Partes de um compound component que são componentes de outro módulo (ex.: `FilterBar.Text`
 * → `TextFilter`): viram filhos da árvore, para ela descer até o que cada parte renderiza.
 */
function compoundPartNodes(
  name: string,
  parts: readonly string[],
  moduleId: string,
  seen: Set<string>,
): TreeNode[] {
  const owner = moduleById.get(moduleId)
  if (!owner?.compoundParts) return []
  const nextSeen = new Set(seen).add(moduleId)
  return parts.flatMap((part) => {
    const assigned = owner.compoundParts?.[part]
    if (!assigned) return []
    const { module } = resolveComponent(owner, assigned)
    if (!module || module === moduleId) return []
    const repeated = nextSeen.has(module)
    return [
      {
        name: `${name}.${part}`,
        parts: [],
        module,
        external: null,
        repeated,
        children: repeated ? [] : buildComponentTree(module, nextSeen),
      },
    ]
  })
}

/** Fecho transitivo de imports de produção a partir de um módulo (inclusive). */
export function importClosure(moduleId: string): string[] {
  const visited = new Set<string>()
  const stack = [moduleId]
  while (stack.length) {
    const id = stack.pop() as string
    if (visited.has(id)) continue
    visited.add(id)
    const m = moduleById.get(id)
    if (!m) continue
    for (const next of m.imports) {
      const target = moduleById.get(next)
      if (target && isProductionModule(target)) stack.push(next)
    }
  }
  return [...visited].sort()
}

export interface RouteDetail {
  path: string
  screen: string
  description: string
  requirements: string[]
  contentPhase: number | null
  module: string | null
  definedIn: string
  lazy: boolean
  devOnly: boolean
  layout: boolean
  closure: string[]
  hooks: string[]
  repositories: string[]
  stores: string[]
  tables: string[]
}

export const routeDetails: readonly RouteDetail[] = graph.routes.map((route) => {
  const note = ROUTE_NOTES.find((n) => n.route === route.path)
  const closure = route.module ? importClosure(route.module) : []
  const closureModules = closure.flatMap((id) => moduleById.get(id) ?? [])
  return {
    path: route.path,
    screen: note?.screen ?? '(sem descrição curada)',
    description: note?.description ?? '',
    requirements: note?.requirements ?? [],
    contentPhase: note?.contentPhase ?? null,
    module: route.module,
    definedIn: route.definedIn,
    lazy: route.lazy,
    devOnly: route.devOnly,
    layout: route.layout,
    closure,
    hooks: [...new Set(closureModules.flatMap((m) => m.hooksDefined))].sort(),
    repositories: closure.filter((id) => moduleById.get(id)?.layer === 'repositories'),
    stores: [...new Set(closureModules.flatMap((m) => m.storesUsed))].sort(),
    tables: [...new Set(closureModules.flatMap((m) => Object.keys(m.dexieTables)))].sort(),
  }
})
