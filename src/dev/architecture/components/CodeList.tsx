interface CodeListProps {
  items: readonly string[]
  empty?: string
}

/** Nomes de código (exports, hooks, tabelas) como etiquetas monoespaçadas. */
export function CodeList({ items, empty = '—' }: CodeListProps) {
  if (!items.length) return <span className="text-sm text-slate-500">{empty}</span>
  return (
    <ul className="flex flex-wrap gap-1">
      {items.map((item) => (
        <li key={item}>
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs break-all dark:bg-slate-800">
            {item}
          </code>
        </li>
      ))}
    </ul>
  )
}
