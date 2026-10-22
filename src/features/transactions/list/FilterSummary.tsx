import { IncomeExpenseTotals } from '@/components/transactions/IncomeExpenseTotals'
import { SignedAmount } from '@/components/ui/SignedAmount'
import type { Totals } from '@/domain/balances'
import { formatResultCount } from '@/features/transactions/transactionListTexts'

interface FilterSummaryProps {
  count: number
  totals: Totals
}

/**
 * CA-04.3 — com filtros ativos: quantidade de resultados e entradas, saídas e resultado do
 * conjunto filtrado inteiro. A quantidade é anunciada ao leitor de tela quando muda.
 */
export function FilterSummary({ count, totals }: FilterSummaryProps) {
  return (
    <section
      aria-label="Resumo dos filtros"
      className="flex flex-col gap-1 rounded-lg border border-slate-200 p-4 dark:border-slate-700"
    >
      <p role="status" className="font-semibold">
        {formatResultCount(count)}
      </p>
      <p className="flex items-baseline gap-2">
        <span className="text-sm text-slate-600 dark:text-slate-300">Resultado</span>
        <SignedAmount cents={totals.resultCents} />
      </p>
      <IncomeExpenseTotals incomeCents={totals.incomeCents} expenseCents={totals.expenseCents} />
    </section>
  )
}
