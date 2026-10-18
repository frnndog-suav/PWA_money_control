import { PLANNED_SCHEMA_VERSION, PLANNED_TABLES } from '@/dev/architecture/data/curated'
import { Badge } from '@/dev/architecture/components/Badge'
import { Card } from '@/dev/architecture/components/Card'
import { ModuleList } from '@/dev/architecture/components/ModuleList'
import { Section } from '@/dev/architecture/components/Section'
import { graph } from '@/dev/architecture/model'

const databaseModules = graph.modules.filter((m) => m.kinds.includes('database')).map((m) => m.id)
const transactionModules = graph.modules.filter((m) => m.usesTransaction).map((m) => m.id)
const liveQueryModules = graph.modules.filter((m) => m.usesLiveQuery).map((m) => m.id)
const hasTables = Object.keys(graph.tables).length > 0

const cellClass = 'border-b border-slate-200 p-2 align-top dark:border-slate-700'

export function DataModelSection() {
  return (
    <Section
      id="dados"
      title="Modelo de dados"
      description="Tabelas Dexie encontradas pelo scanner (leitores/escritores reais) ao lado do esquema previsto na §6.4. O app ainda não tem banco: a classe Dexie e os repositórios chegam na Fase 2."
    >
      <div className="flex flex-wrap gap-2 text-sm">
        <Badge variant={hasTables ? 'ok' : 'warn'}>
          {hasTables
            ? `${Object.keys(graph.tables).length} tabela(s) no código`
            : 'nenhuma tabela no código ainda'}
        </Badge>
        <Badge>SCHEMA_VERSION previsto: {PLANNED_SCHEMA_VERSION}</Badge>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr>
              {[
                'Tabela',
                'Índices (§6.4)',
                'Tipo (§6.3)',
                'No backup',
                'Fase',
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
            {PLANNED_TABLES.map((table) => {
              const usage = graph.tables[table.name]
              return (
                <tr key={table.name}>
                  <td className={cellClass}>
                    <code>{table.name}</code>
                  </td>
                  <td className={cellClass}>
                    <code className="text-xs break-words">{table.indexes}</code>
                  </td>
                  <td className={cellClass}>
                    <code className="text-xs">{table.type}</code>
                  </td>
                  <td className={cellClass}>{table.inBackup}</td>
                  <td className={cellClass}>{table.phase}</td>
                  <td className={cellClass}>
                    <ModuleList ids={usage?.readers ?? []} short empty="—" />
                  </td>
                  <td className={cellClass}>
                    <ModuleList ids={usage?.writers ?? []} short empty="—" />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <Card.Title>Classe Dexie</Card.Title>
          <ModuleList
            ids={databaseModules}
            empty="ainda não existe (src/db/database.ts — Fase 2)"
          />
        </Card>
        <Card>
          <Card.Title>Operações com transação</Card.Title>
          <ModuleList ids={transactionModules} empty="nenhuma ainda" />
        </Card>
        <Card>
          <Card.Title>Leituras reativas (useLiveQuery)</Card.Title>
          <ModuleList ids={liveQueryModules} empty="nenhuma ainda" />
        </Card>
      </div>
    </Section>
  )
}
