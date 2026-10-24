import type { ReactNode } from 'react'

interface ChartDetailPanelProps {
  children: ReactNode
}

/**
 * CA-06.2 / CA-06.7 — painel fixo abaixo do gráfico, no lugar do tooltip flutuante (o dedo o
 * cobriria — princípio 15). `aria-live` anuncia a seleção ao leitor de tela.
 */
export function ChartDetailPanel({ children }: ChartDetailPanelProps) {
  return (
    <p
      aria-live="polite"
      aria-atomic="true"
      className="min-h-11 rounded-lg bg-slate-100 px-3 py-2 text-sm tabular-nums text-slate-800 dark:bg-slate-800 dark:text-slate-100"
    >
      {children}
    </p>
  )
}
