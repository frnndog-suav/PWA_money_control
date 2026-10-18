import { MODULE_NOTES } from '@/dev/architecture/data/curated'
import { Badge } from '@/dev/architecture/components/Badge'
import { CodeList } from '@/dev/architecture/components/CodeList'
import { Fields } from '@/dev/architecture/components/Fields'
import { formatDay } from '@/dev/architecture/components/format'
import { LAYER_STYLES } from '@/dev/architecture/components/layerStyles'
import { ModuleList } from '@/dev/architecture/components/ModuleList'
import { flowsTouching, graph, timelineEntriesTouching } from '@/dev/architecture/model'
import type { ConfigValue, GraphModule } from '@/dev/architecture/types'

const formatConfigValue = (value: ConfigValue) =>
  Array.isArray(value) ? value.join(', ') || '—' : String(value)

interface ModuleDetailsProps {
  module: GraphModule
}

export function ModuleDetails({ module: m }: ModuleDetailsProps) {
  const tables = Object.entries(m.dexieTables)
  const packages = [...new Set(m.external.map((e) => e.package))]
  const timeline = timelineEntriesTouching(m.id)
  const flows = flowsTouching(m.id)
  const pendingChange = graph.git.workingTree.find((f) => f.path === m.id)

  return (
    <Fields>
      <Fields.Item label="Classificação">
        <div className="flex flex-wrap gap-1">
          <Badge colorClassName={LAYER_STYLES[m.layer].chip}>{m.layer}</Badge>
          {m.feature && <Badge variant="info">feature: {m.feature}</Badge>}
          {m.kinds.map((kind) => (
            <Badge key={kind}>{kind}</Badge>
          ))}
          <Badge>{m.loc} linhas</Badge>
          {m.devOnly && <Badge variant="dev">somente DEV</Badge>}
          {pendingChange && <Badge variant="warn">não commitado ({pendingChange.status})</Badge>}
        </div>
      </Fields.Item>
      {MODULE_NOTES[m.id] && <Fields.Item label="Nota">{MODULE_NOTES[m.id]}</Fields.Item>}
      {m.config && (
        <Fields.Item label="Configuração">
          <ul className="flex flex-col gap-0.5 text-xs">
            {Object.entries(m.config).map(([key, value]) => (
              <li key={key} className="break-words">
                <span className="font-semibold">{key}:</span> {formatConfigValue(value)}
              </li>
            ))}
          </ul>
        </Fields.Item>
      )}
      {m.functions.length > 0 && (
        <Fields.Item label="Funções exportadas">
          <ul className="flex flex-col gap-1">
            {m.functions.map((fn) => (
              <li key={fn.name}>
                <code className="text-xs break-words">{fn.signature}</code>
              </li>
            ))}
          </ul>
        </Fields.Item>
      )}
      <Fields.Item label="Exports">
        <CodeList items={m.exports} />
      </Fields.Item>
      {Object.keys(m.props).length > 0 && (
        <Fields.Item label="Props (nº de campos)">
          <CodeList items={Object.entries(m.props).map(([name, n]) => `${name}: ${n}`)} />
        </Fields.Item>
      )}
      <Fields.Item label={`Importa (${m.imports.length})`}>
        <ModuleList ids={m.imports} />
      </Fields.Item>
      <Fields.Item label={`Importado por (${m.importedBy.length})`}>
        <ModuleList ids={m.importedBy} empty="ninguém (órfão?)" />
      </Fields.Item>
      {m.lazyImports.length > 0 && (
        <Fields.Item label="Imports dinâmicos (lazy)">
          <ModuleList ids={m.lazyImports} />
        </Fields.Item>
      )}
      <Fields.Item label="Pacotes externos">
        <CodeList items={packages} />
      </Fields.Item>
      <Fields.Item label="Hooks definidos / usados">
        <CodeList items={[...m.hooksDefined, ...m.hooksUsed.map((h) => `usa ${h}`)]} />
      </Fields.Item>
      {m.jsxUsed.length > 0 && (
        <Fields.Item label="Componentes renderizados">
          <CodeList items={m.jsxUsed} />
        </Fields.Item>
      )}
      {(m.storesUsed.length > 0 || tables.length > 0) && (
        <Fields.Item label="Estado e dados">
          <CodeList
            items={[
              ...m.storesUsed,
              ...tables.map(
                ([t, ops]) =>
                  `${t}: lê ${ops.reads.join('/') || '—'} · escreve ${ops.writes.join('/') || '—'}`,
              ),
              ...(m.usesTransaction ? ['transação Dexie'] : []),
              ...(m.usesLiveQuery ? ['useLiveQuery'] : []),
            ]}
          />
        </Fields.Item>
      )}
      {m.routes.length > 0 && (
        <Fields.Item label="Rotas declaradas">
          <CodeList items={m.routes} />
        </Fields.Item>
      )}
      <Fields.Item label="Testes que o cobrem">
        <ModuleList
          ids={m.testedBy ?? []}
          empty={m.kinds.includes('test') ? 'é um teste' : 'nenhum'}
        />
      </Fields.Item>
      <Fields.Item label="Requisitos citados">
        <CodeList items={m.requirementRefs} />
      </Fields.Item>
      {flows.length > 0 && (
        <Fields.Item label="Fluxos">
          <ul className="flex flex-col gap-1">
            {flows.map((flow) => (
              <li key={flow.id}>
                <a
                  href={`#fluxo-${flow.id}`}
                  className="text-sm text-blue-700 underline dark:text-blue-300"
                >
                  {flow.title}
                </a>
              </li>
            ))}
          </ul>
        </Fields.Item>
      )}
      <Fields.Item label="Linha do tempo">
        {timeline.length ? (
          <ul className="flex flex-col gap-1">
            {timeline.map((entry) => (
              <li key={entry.id} className="text-sm">
                <span className="font-mono text-xs">{formatDay(entry.date)}</span> {entry.title}
                {!entry.committed && <Badge variant="warn">não commitado</Badge>}
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-sm text-slate-500">nenhuma entrada cita este arquivo</span>
        )}
      </Fields.Item>
    </Fields>
  )
}
