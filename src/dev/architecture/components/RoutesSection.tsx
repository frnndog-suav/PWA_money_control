import { Badge } from '@/dev/architecture/components/Badge'
import { Card } from '@/dev/architecture/components/Card'
import { CodeList } from '@/dev/architecture/components/CodeList'
import { Fields } from '@/dev/architecture/components/Fields'
import { ModuleLink } from '@/dev/architecture/components/ModuleLink'
import { ModuleList } from '@/dev/architecture/components/ModuleList'
import { Section } from '@/dev/architecture/components/Section'
import {
  buildComponentTree,
  routeDetails,
  type RouteDetail,
  type TreeNode,
} from '@/dev/architecture/composition'
import { currentPhase } from '@/dev/architecture/model'

function flattenComponents(nodes: readonly TreeNode[]): string[] {
  return [
    ...new Set(
      nodes.flatMap((n) => [
        n.parts.length ? `${n.name} (${n.parts.join(', ')})` : n.name,
        ...flattenComponents(n.children),
      ]),
    ),
  ]
}

function RouteCard({ route }: { route: RouteDetail }) {
  const components = route.module ? flattenComponents(buildComponentTree(route.module)) : []
  const isPlaceholder = route.contentPhase !== null && route.contentPhase > currentPhase

  return (
    <Card tone={route.screen.startsWith('(') ? 'danger' : 'default'}>
      <Card.Title
        trailing={
          <>
            {route.layout && <Badge variant="info">layout</Badge>}
            {!route.layout &&
              (route.lazy ? <Badge>lazy</Badge> : <Badge variant="ok">no pacote principal</Badge>)}
            {route.devOnly && <Badge variant="dev">somente DEV</Badge>}
            {isPlaceholder && (
              <Badge variant="warn">placeholder até a Fase {route.contentPhase}</Badge>
            )}
          </>
        }
      >
        <code>{route.path}</code> — {route.screen}
      </Card.Title>
      {route.description && (
        <p className="text-sm text-slate-600 dark:text-slate-400">{route.description}</p>
      )}
      <Fields>
        <Fields.Item label="Componente da rota">
          {route.module ? (
            <ModuleLink id={route.module} />
          ) : (
            <span className="text-sm">elemento inline</span>
          )}
          <span className="text-xs text-slate-500"> declarado em </span>
          <ModuleLink id={route.definedIn} short />
        </Fields.Item>
        <Fields.Item label="Requisitos">
          <CodeList items={route.requirements} />
        </Fields.Item>
        {components.length > 0 && (
          <Fields.Item label="Componentes renderizados (recursivo)">
            <CodeList items={components} />
          </Fields.Item>
        )}
        <Fields.Item label="Hooks do projeto alcançados">
          <CodeList items={route.hooks} />
        </Fields.Item>
        <Fields.Item label="Repositórios / stores / tabelas">
          <CodeList
            items={[...route.repositories, ...route.stores, ...route.tables]}
            empty="nenhum (ainda não há dados persistidos)"
          />
        </Fields.Item>
        {route.closure.length > 1 && (
          <details>
            <summary className="min-h-8 cursor-pointer text-xs text-slate-500">
              {route.closure.length} módulos carregados por esta tela
            </summary>
            <ModuleList ids={route.closure} short />
          </details>
        )}
      </Fields>
    </Card>
  )
}

export function RoutesSection() {
  return (
    <Section
      id="rotas"
      title="Rotas e telas"
      description="Rotas extraídas de routes.tsx/devRoutes.tsx pelo scanner (componente, lazy, DEV); descrição e requisitos curados por rota (§6.6). Componentes, hooks e tabelas vêm do fecho de imports de cada tela."
    >
      <div className="grid gap-3 lg:grid-cols-2">
        {routeDetails.map((route) => (
          <RouteCard key={`${route.definedIn}-${route.path}`} route={route} />
        ))}
      </div>
    </Section>
  )
}
