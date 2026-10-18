import { ModuleLink } from '@/dev/architecture/components/ModuleLink'

interface ModuleListProps {
  ids: readonly string[]
  empty?: string
  /** Mostra só o nome do arquivo. */
  short?: boolean
}

export function ModuleList({ ids, empty = '—', short = false }: ModuleListProps) {
  if (!ids.length) return <span className="text-sm text-slate-500">{empty}</span>
  return (
    <ul className="flex flex-wrap gap-x-2 gap-y-1">
      {ids.map((id) => (
        <li key={id}>
          <ModuleLink id={id} short={short} />
        </li>
      ))}
    </ul>
  )
}
