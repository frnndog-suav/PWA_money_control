import { baseName, moduleById } from '@/dev/architecture/model'
import { useInspector } from '@/dev/architecture/components/useInspector'

interface ModuleLinkProps {
  id: string
  /** Mostra só o nome do arquivo. */
  short?: boolean
}

/** Caminho clicável que abre o módulo no inspetor; texto simples se não estiver no grafo. */
export function ModuleLink({ id, short = false }: ModuleLinkProps) {
  const { selectedId, select } = useInspector()
  const text = short ? baseName(id) : id

  if (!moduleById.has(id)) {
    return <code className="text-xs break-all text-slate-600 dark:text-slate-400">{text}</code>
  }
  return (
    <button
      type="button"
      onClick={() => select(id)}
      aria-pressed={selectedId === id}
      className="min-h-7 rounded px-0.5 text-left font-mono text-xs break-all text-blue-700 underline decoration-dotted underline-offset-2 aria-pressed:bg-blue-100 dark:text-blue-300 dark:aria-pressed:bg-blue-900/60"
    >
      {text}
    </button>
  )
}
