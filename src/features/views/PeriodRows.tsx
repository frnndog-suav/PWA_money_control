import type { ReactNode } from 'react'
import { SignedAmount } from '@/components/ui/SignedAmount'
import type { Totals } from '@/domain/balances'
import { formatBRL } from '@/domain/money'

interface PeriodRowsProps {
  /** Nome acessível da lista, ex.: "Dias da semana". */
  label: string
  children: ReactNode
}

interface PeriodRowsItemProps {
  label: string
  totals: Totals
  /** Abre o período da linha (Semana/Mês → Dia; Ano → Mês). */
  onSelect: () => void
}

/**
 * RF-05 — uma linha tocável por subperíodo, com entradas, saídas e resultado escritos (a cor
 * nunca é a única informação — RNF-06).
 */
function PeriodRowsItem({ label, totals, onSelect }: PeriodRowsItemProps) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-medium first-letter:uppercase">{label}</span>
          <span className="flex flex-wrap gap-x-4 text-sm text-slate-600 dark:text-slate-300">
            <span className="tabular-nums">Entradas {formatBRL(totals.incomeCents)}</span>
            <span className="tabular-nums">Saídas {formatBRL(totals.expenseCents)}</span>
          </span>
        </span>
        <span className="sr-only">Resultado</span>
        <SignedAmount cents={totals.resultCents} />
      </button>
    </li>
  )
}

export function PeriodRows({ label, children }: PeriodRowsProps) {
  return (
    <ul
      aria-label={label}
      className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-700 dark:border-slate-700"
    >
      {children}
    </ul>
  )
}

PeriodRows.Item = PeriodRowsItem
