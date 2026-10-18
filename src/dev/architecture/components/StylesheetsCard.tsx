import { Badge } from '@/dev/architecture/components/Badge'
import { Card } from '@/dev/architecture/components/Card'
import { ModuleList } from '@/dev/architecture/components/ModuleList'
import { graph } from '@/dev/architecture/model'
import type { GraphStylesheet } from '@/dev/architecture/types'

const stylesheets = Object.entries(graph.stylesheets).sort(([a], [b]) => a.localeCompare(b))

function SourceScope({ sheet }: { sheet: GraphStylesheet }) {
  if (!sheet.packages.includes('tailwindcss')) return null
  return (
    <p className="flex flex-wrap items-center gap-1 text-xs">
      Varredura do Tailwind:{' '}
      {sheet.sourceNone ? (
        <Badge variant="info">source(none)</Badge>
      ) : (
        <Badge>projeto inteiro</Badge>
      )}
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

/** Folhas de estilo (CSS → CSS) e o que cada uma faz o Tailwind varrer (scanner). */
export function StylesheetsCard() {
  return (
    <Card>
      <Card.Title>Folhas de estilo</Card.Title>
      <p className="text-xs text-slate-500">
        O CSS do app exclui src/dev da varredura; a página DEV gera as próprias classes em um CSS
        importado só por ela, para nada dela ir ao CSS de produção (§6.12).
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
            <SourceScope sheet={sheet} />
          </li>
        ))}
      </ul>
    </Card>
  )
}
