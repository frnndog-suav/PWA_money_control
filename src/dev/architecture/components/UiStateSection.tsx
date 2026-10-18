import { PLANNED_UI_FIELDS } from '@/dev/architecture/data/curated'
import { Badge } from '@/dev/architecture/components/Badge'
import { Card } from '@/dev/architecture/components/Card'
import { CodeList } from '@/dev/architecture/components/CodeList'
import { ModuleList } from '@/dev/architecture/components/ModuleList'
import { Section } from '@/dev/architecture/components/Section'
import { graph } from '@/dev/architecture/model'

const stores = graph.modules.filter((m) => m.kinds.includes('store'))
const storeReaders = (hook: string) =>
  graph.modules
    .filter((m) => m.storesUsed.includes(hook) && !m.hooksDefined.includes(hook))
    .map((m) => m.id)

export function UiStateSection() {
  return (
    <Section
      id="estado"
      title="Estado de interface"
      description="Stores Zustand encontradas no código e quem as usa; campos previstos na §6.7 com a fase em que entram. O tema não fica no Zustand (fica no ThemeProvider e, a partir da Fase 2, na tabela settings)."
    >
      <Card>
        <Card.Title
          trailing={<Badge variant={stores.length ? 'ok' : 'warn'}>{stores.length} store(s)</Badge>}
        >
          Stores no código
        </Card.Title>
        {stores.length ? (
          <ul className="flex flex-col gap-2 text-sm">
            {stores.map((store) => (
              <li key={store.id} className="flex flex-col gap-1">
                <ModuleList ids={[store.id]} />
                {store.hooksDefined.map((hook) => (
                  <div key={hook} className="flex flex-wrap items-center gap-2">
                    <code>{hook}</code> usado por <ModuleList ids={storeReaders(hook)} short />
                  </div>
                ))}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Nenhuma ainda. src/stores/uiStore.ts nasce na Fase 1 (aviso de nova versão).
          </p>
        )}
      </Card>
      <Card>
        <Card.Title>Campos previstos (§6.7)</Card.Title>
        <ul className="flex flex-col divide-y divide-slate-200 text-sm dark:divide-slate-700">
          {PLANNED_UI_FIELDS.map((field) => (
            <li key={field.name} className="flex flex-wrap items-center gap-2 py-2">
              <Badge variant="warn">Fase {field.phase}</Badge>
              <code className="font-semibold">{field.name}</code>
              <code className="text-xs text-slate-600 dark:text-slate-400">{field.type}</code>
              <span className="text-xs">ações:</span>
              <CodeList items={field.actions} />
            </li>
          ))}
        </ul>
      </Card>
    </Section>
  )
}
