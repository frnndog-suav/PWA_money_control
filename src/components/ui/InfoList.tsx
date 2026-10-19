import type { ReactNode } from 'react'

interface InfoListProps {
  children: ReactNode
}

interface InfoListItemProps {
  label: ReactNode
  children: ReactNode
}

// Linha somente de leitura (rótulo + valor), no mesmo visual da NavList. Sem interação,
// então não precisa de alvo de toque; a altura mínima mantém o ritmo das listas (RNF-06).
function InfoListItem({ label, children }: InfoListItemProps) {
  return (
    <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 px-4 py-2">
      <dt className="text-slate-600 dark:text-slate-300">{label}</dt>
      <dd className="font-medium tabular-nums">{children}</dd>
    </div>
  )
}

/** Lista de pares rótulo/valor (`<dl>`), ex.: Ajustes → Sobre. */
export function InfoList({ children }: InfoListProps) {
  return (
    <dl className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
      {children}
    </dl>
  )
}

InfoList.Item = InfoListItem
