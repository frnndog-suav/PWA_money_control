import { Badge } from '@/dev/architecture/components/Badge'
import { Card } from '@/dev/architecture/components/Card'
import { CodeList } from '@/dev/architecture/components/CodeList'
import { formatDay } from '@/dev/architecture/components/format'
import { ModuleList } from '@/dev/architecture/components/ModuleList'
import { graph } from '@/dev/architecture/model'
import { phaseLabel, TYPE_LABELS } from '@/dev/architecture/components/timelineLabels'
import type { TimelineEntry } from '@/dev/architecture/types'

interface FileGroupProps {
  label: string
  files: readonly string[]
  removed?: boolean
}

function FileGroup({ label, files, removed = false }: FileGroupProps) {
  if (!files.length) return null
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold text-slate-500">
        {label} ({files.length})
      </span>
      {removed ? (
        <ul className="flex flex-wrap gap-x-2 gap-y-1">
          {files.map((file) => (
            <li key={file}>
              <code className="text-xs text-slate-500 line-through">{file}</code>
            </li>
          ))}
        </ul>
      ) : (
        <ModuleList ids={files} />
      )}
    </div>
  )
}

export function TimelineEntryCard({ entry }: { entry: TimelineEntry }) {
  const commits = entry.commits.map(
    (hash) =>
      graph.commits.find((c) => c.hash === hash) ?? {
        hash,
        subject: '(commit fora do histórico lido)',
      },
  )

  return (
    <Card tone={entry.committed ? 'default' : 'warn'}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-mono">{formatDay(entry.date)}</span>
        <Badge variant="info">{phaseLabel(entry.phase)}</Badge>
        <Badge variant={TYPE_LABELS[entry.type].variant}>{TYPE_LABELS[entry.type].text}</Badge>
        {entry.committed ? (
          <Badge variant="ok">commitado</Badge>
        ) : (
          <Badge variant="warn">ainda não commitado</Badge>
        )}
      </div>
      <Card.Title>{entry.title}</Card.Title>
      <p className="text-sm text-slate-700 dark:text-slate-300">{entry.summary}</p>
      {commits.length > 0 && (
        <ul className="flex flex-col gap-0.5 text-xs">
          {commits.map((c) => (
            <li key={c.hash}>
              <code className="font-semibold">{c.hash}</code> {c.subject}
            </li>
          ))}
        </ul>
      )}
      {(entry.requirements.length > 0 || entry.decisions.length > 0) && (
        <CodeList items={[...entry.requirements, ...entry.decisions]} />
      )}
      <FileGroup label="Criados" files={entry.files.created} />
      <FileGroup label="Alterados" files={entry.files.modified} />
      <FileGroup label="Removidos" files={entry.files.removed} removed />
      {entry.impact.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 text-xs">
          <span className="font-semibold text-slate-500">Impacto na arquitetura:</span>
          {entry.impact.map((item) => (
            <Badge key={item}>{item}</Badge>
          ))}
        </div>
      )}
    </Card>
  )
}
