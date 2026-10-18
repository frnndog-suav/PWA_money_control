import { useId, useState } from 'react'
import { Badge } from '@/dev/architecture/components/Badge'
import { useInspector } from '@/dev/architecture/components/useInspector'
import { search, SEARCH_LIMIT, type SearchItem } from '@/dev/architecture/search'

/** Busca global: módulos, componentes, hooks, rotas, requisitos, decisões e fluxos. */
export function SearchBox() {
  const [query, setQuery] = useState('')
  const { select } = useInspector()
  const resultsId = useId()
  const results = search(query)

  function open(item: SearchItem) {
    if (item.moduleId) select(item.moduleId)
    if (item.anchor) document.getElementById(item.anchor)?.scrollIntoView({ behavior: 'smooth' })
    setQuery('')
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="sr-only" htmlFor={`${resultsId}-input`}>
        Buscar na arquitetura
      </label>
      <input
        id={`${resultsId}-input`}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setQuery('')
        }}
        placeholder="Buscar módulo, componente, hook, rota, requisito (ex.: RF-09, useTheme, /ajustes)"
        aria-controls={resultsId}
        className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-900"
      />
      {query.trim() && (
        <ul
          id={resultsId}
          aria-label="Resultados da busca"
          className="max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          {results.length === 0 && <li className="p-3 text-sm text-slate-500">Nada encontrado.</li>}
          {results.map((item) => (
            <li key={`${item.kind}-${item.label}-${item.detail}`}>
              <button
                type="button"
                onClick={() => open(item)}
                className="flex min-h-11 w-full flex-wrap items-center gap-2 px-3 py-1 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Badge>{item.kind}</Badge>
                <code className="font-semibold break-all">{item.label}</code>
                <span className="text-xs break-all text-slate-500">{item.detail}</span>
              </button>
            </li>
          ))}
          {results.length === SEARCH_LIMIT && (
            <li className="p-2 text-xs text-slate-500">
              Mostrando os {SEARCH_LIMIT} primeiros; refine a busca.
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
