import { SPEC_SCHEMA_VERSION, TABLE_NOTES } from '@/dev/architecture/data/curated'
import { Badge } from '@/dev/architecture/components/Badge'
import { Card } from '@/dev/architecture/components/Card'
import { ModuleList } from '@/dev/architecture/components/ModuleList'
import { Section } from '@/dev/architecture/components/Section'
import { graph, isTestModule, moduleById } from '@/dev/architecture/model'

const schema = graph.schema
const currentStores = schema?.versions.at(-1)?.stores ?? {}
const tableNames = [...new Set([...Object.keys(currentStores), ...TABLE_NOTES.map((t) => t.name)])]

const isTestId = (id: string) => {
  const m = moduleById.get(id)
  return m !== undefined && (isTestModule(m) || m.layer === 'test')
}
const isDevId = (id: string) => moduleById.get(id)?.layer === 'dev'

/** Separa quem toca a tabela em produção, nas ferramentas DEV e nos testes. */
function splitUsers(ids: readonly string[]) {
  return {
    production: ids.filter((id) => !isTestId(id) && !isDevId(id)),
    dev: ids.filter((id) => !isTestId(id) && isDevId(id)),
    tests: ids.filter(isTestId),
  }
}

const transactionUsers = splitUsers(graph.modules.filter((m) => m.usesTransaction).map((m) => m.id))
const liveQueryModules = graph.modules.filter((m) => m.usesLiveQuery).map((m) => m.id)

const cellClass = 'border-b border-slate-200 p-2 align-top dark:border-slate-700'

function UsersCell({ ids }: { ids: readonly string[] }) {
  const { production, dev, tests } = splitUsers(ids)
  return (
    <div className="flex flex-col gap-1">
      <ModuleList ids={production} short empty="ninguém em produção" />
      {dev.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          <Badge variant="warn">DEV</Badge>
          <ModuleList ids={dev} short />
        </div>
      )}
      {tests.length > 0 && (
        <details className="text-xs">
          <summary className="min-h-8 cursor-pointer text-slate-500">
            {tests.length} teste(s)
          </summary>
          <ModuleList ids={tests} short />
        </details>
      )}
    </div>
  )
}

export function DataModelSection() {
  const matchesSpec = schema?.schemaVersion === SPEC_SCHEMA_VERSION
  return (
    <Section
      id="dados"
      title="Modelo de dados"
      description="Esquema Dexie lido pelo scanner de src/db/database.ts (versões, índices, SCHEMA_VERSION) e quem lê/escreve cada tabela, separando produção, ferramentas DEV e testes. Tipo, backup e notas vêm da curadoria (§6.3, §6.4, §6.8)."
    >
      <div className="flex flex-wrap gap-2 text-sm">
        <Badge variant={schema ? 'ok' : 'warn'}>
          {schema ? `banco "${schema.databaseName ?? '?'}"` : 'sem classe Dexie no código'}
        </Badge>
        <Badge variant={matchesSpec ? 'ok' : 'danger'}>
          SCHEMA_VERSION = {schema?.schemaVersion ?? '—'} (§6.4: {SPEC_SCHEMA_VERSION})
        </Badge>
        <Badge>{tableNames.length} tabelas</Badge>
        <Badge variant="info">esquema × §6.4 conferido por database.schema.test.ts</Badge>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-225 border-collapse text-left text-sm">
          <thead>
            <tr>
              {[
                'Tabela',
                'Índices (código)',
                'Tipo (§6.3)',
                'No backup',
                'Usada pelo app',
                'Lida por',
                'Escrita por',
              ].map((h) => (
                <th key={h} className={`${cellClass} font-semibold`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableNames.map((name) => {
              const note = TABLE_NOTES.find((t) => t.name === name)
              const usage = graph.tables[name]
              return (
                <tr key={name}>
                  <td className={cellClass}>
                    <code>{name}</code>
                    {note && (
                      <p className="mt-1 max-w-64 text-xs text-slate-600 dark:text-slate-400">
                        {note.note}
                      </p>
                    )}
                  </td>
                  <td className={cellClass}>
                    <code className="text-xs wrap-break-word">
                      {currentStores[name] ?? '(não declarada)'}
                    </code>
                  </td>
                  <td className={cellClass}>
                    <code className="text-xs">{note?.type ?? '—'}</code>
                  </td>
                  <td className={cellClass}>{note?.inBackup ?? '—'}</td>
                  <td className={cellClass}>{note ? `Fase ${note.usedFromPhase}` : '—'}</td>
                  <td className={cellClass}>
                    <UsersCell ids={usage?.readers ?? []} />
                  </td>
                  <td className={cellClass}>
                    <UsersCell ids={usage?.writers ?? []} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <Card.Title>Classe Dexie e versões</Card.Title>
          {schema ? (
            <ul className="flex flex-col gap-1 text-sm">
              <li>
                <ModuleList ids={[schema.module]} />
              </li>
              {schema.versions.map((v) => (
                <li key={v.version}>
                  version({v.version}): {Object.keys(v.stores).length} tabelas
                </li>
              ))}
              <li className="text-xs text-slate-500">
                Mudança de esquema = nova version(n).upgrade + SCHEMA_VERSION incrementada (§6.4).
              </li>
            </ul>
          ) : (
            <p className="text-sm">ainda não existe</p>
          )}
        </Card>
        <Card>
          <Card.Title>Operações com transação</Card.Title>
          <ModuleList ids={transactionUsers.production} empty="nenhuma em produção" />
          {transactionUsers.dev.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 text-sm">
              <Badge variant="warn">DEV</Badge>
              <ModuleList ids={transactionUsers.dev} short />
            </div>
          )}
          {transactionUsers.tests.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
              testes/apoio: <ModuleList ids={transactionUsers.tests} short />
            </div>
          )}
        </Card>
        <Card>
          <Card.Title>Leituras reativas (useLiveQuery)</Card.Title>
          <ModuleList ids={liveQueryModules} empty="nenhuma ainda" />
        </Card>
      </div>
    </Section>
  )
}
