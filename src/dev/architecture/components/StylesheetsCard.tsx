import { Badge } from '@/dev/architecture/components/Badge'
import { Card } from '@/dev/architecture/components/Card'
import { ModuleList } from '@/dev/architecture/components/ModuleList'
import { graph } from '@/dev/architecture/model'
import { TIMELINE } from '@/dev/architecture/data/timeline'
import type { GraphCssAliasImport, GraphStylesheet } from '@/dev/architecture/types'

const stylesheets = Object.entries(graph.stylesheets).sort(([a], [b]) => a.localeCompare(b))

/** Folhas .css que a timeline registra como removidas e que não existem mais no código. */
const removedStylesheets = TIMELINE.flatMap((entry) =>
  entry.files.removed
    .filter((path) => path.endsWith('.css') && !(path in graph.stylesheets))
    .map((path) => ({ path, date: entry.date, title: entry.title })),
)

const COMMAND_LABEL: Readonly<Record<GraphCssAliasImport['variants'][number]['when'], string>> = {
  build: 'vite build',
  serve: 'vite serve (npm run dev)',
  always: 'sempre',
}

function SourceScope({ sheet }: { sheet: GraphStylesheet }) {
  const isTailwindEntry = sheet.packages.includes('tailwindcss')
  if (!isTailwindEntry && sheet.sources.length === 0 && sheet.sourceNot.length === 0) return null
  return (
    <p className="flex flex-wrap items-center gap-1 text-xs">
      Varredura do Tailwind:{' '}
      {isTailwindEntry &&
        (sheet.sourceNone ? (
          <Badge variant="info">source(none)</Badge>
        ) : (
          <Badge>detecção automática</Badge>
        ))}
      {sheet.sources.map((dir) => (
        <Badge key={dir} variant="ok">
          + {dir}
        </Badge>
      ))}
      {sheet.sourceNot.map((dir) => (
        <Badge key={dir} variant="warn">
          − {dir}
        </Badge>
      ))}
    </p>
  )
}

/** `@import '@alias'` resolvido pelo vite.config.ts, com o destino em cada comando (D-43). */
function AliasImports({ imports }: { imports: GraphCssAliasImport[] }) {
  if (imports.length === 0) return null
  return (
    <ul className="flex flex-col gap-1 text-xs">
      {imports.map(({ alias, variants }) => (
        <li key={alias} className="flex flex-col gap-1">
          <span>
            @import <Badge variant="info">{alias}</Badge> (alias do vite.config.ts)
          </span>
          <ul className="flex flex-col gap-1 pl-3">
            {variants.map(({ when, target }) => (
              <li key={when} className="flex flex-wrap items-center gap-1">
                <Badge variant={when === 'build' ? 'ok' : 'dev'}>{COMMAND_LABEL[when]}</Badge>→{' '}
                <ModuleList ids={[target]} short />
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  )
}

/** Folhas de estilo (CSS → CSS) e o que cada uma faz o Tailwind varrer (scanner). */
export function StylesheetsCard() {
  return (
    <Card>
      <Card.Title>Folhas de estilo</Card.Title>
      <p className="text-xs text-slate-500">
        Uma única folha Tailwind (src/index.css), inclusive em DEV (D-43). As fontes vêm do alias
        @tailwind-sources: em vite serve a detecção automática varre src/ inteiro (as páginas DEV
        usam a mesma folha do app); em vite build o arquivo de fontes exclui src/dev, para nenhuma
        classe das páginas DEV entrar no CSS do dist/ (§6.12). O teste
        src/styles/tailwindEntry.test.ts falha se outro .css fizer @import &apos;tailwindcss&apos;.
      </p>
      <ul className="flex flex-col divide-y divide-slate-200 dark:divide-slate-700">
        {stylesheets.map(([id, sheet]) => (
          <li key={id} className="flex flex-col gap-1 py-2 text-sm">
            <code className="text-xs font-semibold break-all">{id}</code>
            <div className="flex flex-wrap items-center gap-1 text-xs">
              importado por <ModuleList ids={sheet.importedBy} short />
            </div>
            {(sheet.packages.length > 0 || sheet.imports.length > 0) && (
              <div className="flex flex-wrap items-center gap-1 text-xs">
                @import{' '}
                {sheet.packages.map((name) => (
                  <Badge key={name}>{name}</Badge>
                ))}
                <ModuleList ids={sheet.imports} empty="" />
              </div>
            )}
            <AliasImports imports={sheet.aliasImports} />
            <SourceScope sheet={sheet} />
          </li>
        ))}
        {removedStylesheets.map(({ path, date, title }) => (
          <li key={path} className="flex flex-col gap-1 py-2 text-sm">
            <span className="flex flex-wrap items-center gap-1">
              <code className="text-xs font-semibold break-all line-through">{path}</code>
              <Badge variant="danger">removida</Badge>
            </span>
            <span className="text-xs text-slate-500">
              {date} — {title}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
