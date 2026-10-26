import { formatMonthName } from '@/domain/dates'
import { summarizeMonths } from '@/domain/periodViews'
import { projected, type PendingOccurrence } from '@/domain/recurring'
import type { PeriodString, Transaction } from '@/domain/types'
import { PeriodRows } from '@/features/views/PeriodRows'

interface YearDetailProps {
  transactions: Transaction[]
  year: number
  /** Recorrentes pendentes de cada mês do ano (RF-07). */
  pending: ReadonlyMap<PeriodString, PendingOccurrence[]>
  onSelectMonth: (period: PeriodString) => void
}

/**
 * RF-05 visão Ano — 12 linhas, de janeiro a dezembro, com entradas, saídas, resultado e o
 * Previsto do mês (Realizado + pendentes — D-05); tocar abre a visão Mês.
 */
export function YearDetail({ transactions, year, pending, onSelectMonth }: YearDetailProps) {
  return (
    <PeriodRows label="Meses do ano">
      {summarizeMonths(transactions, year).map((month) => (
        <PeriodRows.Item
          key={month.period}
          label={formatMonthName(month.period)}
          totals={month}
          projectedResultCents={projected(month, pending.get(month.period) ?? []).resultCents}
          onSelect={() => onSelectMonth(month.period)}
        />
      ))}
    </PeriodRows>
  )
}
