import { ModuleDetails } from '@/dev/architecture/components/ModuleDetails'
import { useInspector } from '@/dev/architecture/components/useInspector'
import { moduleById } from '@/dev/architecture/model'

export function ModuleInspector() {
  const { selectedId, select } = useInspector()
  const selected = selectedId ? moduleById.get(selectedId) : undefined

  return (
    <aside
      aria-label="Inspetor de módulo"
      className={`${selected ? 'fixed' : 'hidden'} pb-safe inset-x-0 bottom-0 z-30 max-h-[70dvh] overflow-y-auto border-t-2 border-blue-600 bg-white p-4 shadow-2xl lg:sticky lg:top-44 lg:block lg:max-h-[calc(100dvh-12rem)] lg:rounded-lg lg:border lg:border-slate-200 lg:shadow-none dark:bg-slate-900 dark:lg:border-slate-700`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <h2 className="min-w-0 font-mono text-sm font-bold break-all">
          {selected ? selected.id : 'Inspetor'}
        </h2>
        {selected && (
          <button
            type="button"
            onClick={() => select(null)}
            className="min-h-11 shrink-0 rounded-lg border border-slate-300 px-3 text-sm dark:border-slate-600"
          >
            Fechar
          </button>
        )}
      </div>
      {selected ? (
        <ModuleDetails module={selected} />
      ) : (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Toque num módulo (no grafo ou em qualquer caminho sublinhado) para ver camada, exports,
          dependências, testes, requisitos e entradas da linha do tempo.
        </p>
      )}
    </aside>
  )
}
