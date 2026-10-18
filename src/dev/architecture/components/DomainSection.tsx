import { PLANNED_DOMAIN } from '@/dev/architecture/data/curated'
import { Badge } from '@/dev/architecture/components/Badge'
import { Card } from '@/dev/architecture/components/Card'
import { CodeList } from '@/dev/architecture/components/CodeList'
import { ModuleLink } from '@/dev/architecture/components/ModuleLink'
import { ModuleList } from '@/dev/architecture/components/ModuleList'
import { Section } from '@/dev/architecture/components/Section'
import { graph, isProductionId, isProductionModule } from '@/dev/architecture/model'

const pureModules = graph.modules.filter(
  (m) => (m.layer === 'domain' || m.layer === 'lib') && isProductionModule(m),
)

/** Quem importa o nome `name` do módulo `moduleId` (fora de testes). */
const usersOf = (moduleId: string, name: string) =>
  graph.edges
    .filter((e) => e.to === moduleId && e.names.includes(name) && isProductionId(e.from))
    .map((e) => e.from)

export function DomainSection() {
  return (
    <Section
      id="dominio"
      title="Funções de domínio e lib"
      description="Funções puras exportadas por src/domain e src/lib (assinaturas extraídas pelo scanner), onde são usadas e quais testes cobrem cada módulo. A cobertura mínima (RNF-07) é medida só nessas pastas."
    >
      <div className="grid gap-3 lg:grid-cols-2">
        {pureModules.map((m) => (
          <Card key={m.id}>
            <Card.Title
              trailing={
                <Badge variant={m.testedBy?.length ? 'ok' : 'danger'}>
                  {m.testedBy?.length ? `${m.testedBy.length} teste(s)` : 'sem teste'}
                </Badge>
              }
            >
              <ModuleLink id={m.id} />
            </Card.Title>
            <ul className="flex flex-col gap-2 text-sm">
              {m.functions.map((fn) => (
                <li key={fn.name} className="flex flex-col gap-0.5">
                  <code className="text-xs break-words">{fn.signature}</code>
                  <div className="flex flex-wrap items-center gap-1 pl-3 text-xs">
                    usada por{' '}
                    <ModuleList ids={usersOf(m.id, fn.name)} short empty="só nos testes" />
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-1 text-xs">
              constantes/tipos:
              <CodeList items={m.exports.filter((e) => !m.functions.some((f) => f.name === e))} />
            </div>
            <div className="flex flex-wrap items-center gap-1 text-xs">
              testes: <ModuleList ids={m.testedBy ?? []} short />
            </div>
          </Card>
        ))}
      </div>
      <Card>
        <Card.Title>Previstas na §6.5</Card.Title>
        <ul className="flex flex-col gap-1 text-sm">
          {PLANNED_DOMAIN.map((item) => (
            <li key={item.module} className="flex flex-wrap items-center gap-2">
              <Badge variant="warn">Fase {item.phase}</Badge>
              <code>{item.module}</code>
              <CodeList items={item.names} />
            </li>
          ))}
        </ul>
      </Card>
    </Section>
  )
}
