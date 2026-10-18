import { SCREEN_COMPOSITION } from '@/dev/architecture/data/curated'
import { Card } from '@/dev/architecture/components/Card'
import { CompositionTree } from '@/dev/architecture/components/CompositionTree'
import { ModuleLink } from '@/dev/architecture/components/ModuleLink'
import { ModuleList } from '@/dev/architecture/components/ModuleList'
import { Section } from '@/dev/architecture/components/Section'
import { buildComponentTree, routeDetails, type TreeNode } from '@/dev/architecture/composition'
import { graph, isProductionId, isProductionModule } from '@/dev/architecture/model'

interface CompositionRoot {
  moduleId: string
  title: string
  stateAndData?: string
}

const treeSignature = (nodes: readonly TreeNode[]): string =>
  nodes.map((n) => `${n.name}[${n.parts.join(',')}](${treeSignature(n.children)})`).join(';')

const stateFor = (route: string) => SCREEN_COMPOSITION.find((s) => s.route === route)?.stateAndData

// Telas com a mesma árvore (ex.: placeholders só com Page + título) aparecem juntas.
const screenGroups = new Map<string, { roots: CompositionRoot[]; tree: TreeNode[] }>()
for (const route of routeDetails) {
  if (!route.module) continue
  const tree = buildComponentTree(route.module)
  const key = route.layout || stateFor(route.path) ? route.module : treeSignature(tree)
  const group = screenGroups.get(key) ?? { roots: [], tree }
  group.roots.push({
    moduleId: route.module,
    title: route.layout ? 'Layout' : `${route.path} — ${route.screen}`,
    stateAndData: stateFor(route.path),
  })
  screenGroups.set(key, group)
}

const primitives = graph.modules.filter(
  (m) =>
    m.layer === 'components' &&
    isProductionModule(m) &&
    (m.components.length || m.hooksDefined.length || m.exports.length),
)

export function CompositionSection() {
  return (
    <Section
      id="composicao"
      title="Composição de componentes"
      description="Árvore derivada do JSX de cada módulo (scanner), seguindo os imports; anotações curadas explicam compound components, slots e onde fica o estado."
    >
      <Card>
        <Card.Title>Raiz do app</Card.Title>
        <ModuleLink id="src/app/App.tsx" />
        <CompositionTree nodes={buildComponentTree('src/app/App.tsx')} />
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        {[...screenGroups.values()].map((group) => (
          <Card key={group.roots[0].moduleId}>
            <Card.Title>
              {group.roots.length > 1
                ? `${group.roots.length} telas com a mesma composição`
                : group.roots[0].title}
            </Card.Title>
            {group.roots.length > 1 && (
              <ul className="flex flex-col gap-0.5 text-xs">
                {group.roots.map((root) => (
                  <li key={root.moduleId} className="flex flex-wrap items-center gap-1">
                    {root.title} <ModuleLink id={root.moduleId} short />
                  </li>
                ))}
              </ul>
            )}
            {group.roots[0].stateAndData && (
              <p className="text-sm">
                <span className="font-semibold">Estado e dados:</span> {group.roots[0].stateAndData}
              </p>
            )}
            <CompositionTree nodes={group.tree} />
          </Card>
        ))}
      </div>

      <Card>
        <Card.Title>Primitivos de components/ui e onde são usados</Card.Title>
        <ul className="flex flex-col divide-y divide-slate-200 dark:divide-slate-700">
          {primitives.map((m) => (
            <li key={m.id} className="flex flex-col gap-1 py-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <ModuleLink id={m.id} />
                <code className="text-xs">
                  {[...m.components, ...m.hooksDefined].join(', ') || m.exports.join(', ')}
                </code>
              </div>
              <ModuleList ids={m.importedBy.filter(isProductionId)} short empty="sem uso" />
            </li>
          ))}
        </ul>
      </Card>
    </Section>
  )
}
