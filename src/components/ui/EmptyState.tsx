import type { ReactNode } from 'react'

interface EmptyStateProps {
  children: ReactNode
}

/** Texto de lista vazia (ex.: "Nenhuma tag ainda"). */
export function EmptyState({ children }: EmptyStateProps) {
  return (
    <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-slate-600 dark:border-slate-600 dark:text-slate-300">
      {children}
    </p>
  )
}
