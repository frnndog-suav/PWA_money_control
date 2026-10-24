import { formatMonthName } from '@/domain/dates'
import { summarizeMonths } from '@/domain/periodViews'
import type { PeriodString, Transaction } from '@/domain/types'
import { PeriodRows } from '@/features/views/PeriodRows'

interface YearDetailProps {
  transactions: Transaction[]
  year: number
  onSelectMonth: (period: PeriodString) => void
}

/**
 * RF-05 visão Ano — 12 linhas, de janeiro a dezembro; tocar abre a visão Mês. A coluna
 * "Previsto" entra na Fase 9 (RF-07).
 */
export function YearDetail({ transactions, year, onSelectMonth }: YearDetailProps) {
  return (
    <PeriodRows label="Meses do ano">
      {summarizeMonths(transactions, year).map((month) => (
        <PeriodRows.Item
          key={month.period}
          label={formatMonthName(month.period)}
          totals={month}
          onSelect={() => onSelectMonth(month.period)}
        />
      ))}
    </PeriodRows>
  )
}
