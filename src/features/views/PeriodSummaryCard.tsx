import { SignedAmount } from '@/components/ui/SignedAmount'
import type { Totals } from '@/domain/balances'
import { formatBRL } from '@/domain/money'

interface PeriodSummaryCardProps {
  /** `undefined` enquanto os lançamentos carregam. */
  totals: Totals | undefined
}

// Enquanto o IndexedDB carrega, um traço ocupa o lugar do valor (sem "R$ 0,00" falso).
const LOADING = <span className="text-slate-500 dark:text-slate-400">—</span>

/** RF-05 — cartão de resumo do período: Entradas, Saídas e Resultado (entradas − saídas). */
export function PeriodSummaryCard({ totals }: PeriodSummaryCardProps) {
  return (
    <section
      aria-label="Resumo do período"
      className="rounded-lg border border-slate-200 p-4 dark:border-slate-700"
    >
      <dl className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-1">
        <dt className="text-slate-600 dark:text-slate-300">Entradas</dt>
        <dd className="text-right tabular-nums">
          {totals ? formatBRL(totals.incomeCents) : LOADING}
        </dd>
        <dt className="text-slate-600 dark:text-slate-300">Saídas</dt>
        <dd className="text-right tabular-nums">
          {totals ? formatBRL(totals.expenseCents) : LOADING}
        </dd>
        <dt className="font-semibold">Resultado</dt>
        <dd className="text-right">
          {totals ? <SignedAmount cents={totals.resultCents} /> : LOADING}
        </dd>
      </dl>
    </section>
  )
}
