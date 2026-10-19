import { PLANNED_UI_FIELDS } from '@/dev/architecture/data/curated'
import { Badge } from '@/dev/architecture/components/Badge'
import { Card } from '@/dev/architecture/components/Card'
import { CodeList } from '@/dev/architecture/components/CodeList'
import { ModuleList } from '@/dev/architecture/components/ModuleList'
import { Section } from '@/dev/architecture/components/Section'
import { graph, isProductionModule } from '@/dev/architecture/model'
import type { GraphModule } from '@/dev/architecture/types'

const stores = graph.modules.filter((m) => m.kinds.includes('store'))
const implementedMembers = new Set(
  stores.flatMap((s) => [...(s.store?.state ?? []), ...(s.store?.actions ?? [])]),
)

const storeHookUsers = (hook: string) =>
  graph.modules
    .filter((m) => m.storesUsed.includes(hook) && !m.hooksDefined.includes(hook))
    .map((m) => m.id)

/** Módulos que citam o campo/ação (importando a store diretamente), separando os testes. */
function membersUsers(store: GraphModule, member: string) {
  const users = graph.modules.filter(
    (m) => m.imports.includes(store.id) && m.storeMembersUsed.includes(member),
  )
  return {
    production: users.filter(isProductionModule).map((m) => m.id),
    tests: users.filter((m) => !isProductionModule(m)).map((m) => m.id),
  }
}

function MemberRow({ store, member, role }: { store: GraphModule; member: string; role: string }) {
  const { production, tests } = membersUsers(store, member)
  return (
    <li className="flex flex-col gap-1 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <code className="font-semibold">{member}</code>
        <Badge variant="info">{role}</Badge>
      </div>
      <div className="flex flex-wrap items-center gap-1 text-xs">
        {role === 'campo' ? 'lido por' : 'chamado por'}{' '}
        <ModuleList ids={production} short empty="ninguém (fora dos testes)" />
      </div>
      {tests.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
          testes: <ModuleList ids={tests} short />
        </div>
      )}
    </li>
  )
}

function StoreCard({ store }: { store: GraphModule }) {
  return (
    <Card>
      <Card.Title trailing={<Badge variant="ok">no código</Badge>}>
        <code>{store.id}</code>
      </Card.Title>
      {store.hooksDefined.map((hook) => (
        <div key={hook} className="flex flex-wrap items-center gap-2 text-sm">
          <code>{hook}</code> importado por <ModuleList ids={storeHookUsers(hook)} short />
        </div>
      ))}
      <ul className="flex flex-col divide-y divide-slate-200 text-sm dark:divide-slate-700">
        {store.store?.state.map((field) => (
          <MemberRow key={field} store={store} member={field} role="campo" />
        ))}
        {store.store?.actions.map((action) => (
          <MemberRow key={action} store={store} member={action} role="ação" />
        ))}
      </ul>
    </Card>
  )
}

export function UiStateSection() {
  return (
    <Section
      id="estado"
      title="Estado de interface"
      description="Stores Zustand encontradas pelo scanner (campos das interfaces *State/*Actions) e quem lê cada campo e chama cada ação; campos da §6.7 que ainda faltam, com a fase em que entram. O tema não fica no Zustand: desde a Fase 2 fica na tabela settings (useThemePreference, com espelho em localStorage — D-28)."
    >
      {stores.length ? (
        stores.map((store) => <StoreCard key={store.id} store={store} />)
      ) : (
        <Card>
          <Card.Title trailing={<Badge variant="warn">0 store(s)</Badge>}>
            Stores no código
          </Card.Title>
          <p className="text-sm text-slate-600 dark:text-slate-400">Nenhuma ainda.</p>
        </Card>
      )}
      <Card>
        <Card.Title>Campos da §6.7</Card.Title>
        <ul className="flex flex-col divide-y divide-slate-200 text-sm dark:divide-slate-700">
          {PLANNED_UI_FIELDS.map((field) => {
            const isImplemented = implementedMembers.has(field.name)
            return (
              <li key={field.name} className="flex flex-wrap items-center gap-2 py-2">
                <Badge variant={isImplemented ? 'ok' : 'warn'}>
                  {isImplemented
                    ? `no código (Fase ${field.phase})`
                    : `previsto: Fase ${field.phase}`}
                </Badge>
                <code className="font-semibold">{field.name}</code>
                <code className="text-xs text-slate-600 dark:text-slate-400">{field.type}</code>
                <span className="text-xs">ações:</span>
                <CodeList items={field.actions} />
              </li>
            )
          })}
        </ul>
      </Card>
    </Section>
  )
}
