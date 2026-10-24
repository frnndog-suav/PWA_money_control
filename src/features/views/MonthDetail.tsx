import { EmptyState } from '@/components/ui/EmptyState'
import { formatWeekdayDate, type DateRange } from '@/domain/dates'
import { summarizeActiveDays } from '@/domain/periodViews'
import type { DateString, Transaction } from '@/domain/types'
import { PeriodRows } from '@/features/views/PeriodRows'
import { NO_MONTH_TRANSACTIONS_MESSAGE } from '@/features/views/viewTexts'

interface MonthDetailProps {
  transactions: Transaction[]
  range: DateRange
  onSelectDay: (date: DateString) => void
}

/**
 * RF-05 visão Mês — uma linha por dia com movimento; tocar abre a visão Dia. A seção
 * "Recorrentes pendentes" e o "Previsto" entram na Fase 9 (RF-07).
 */
export function MonthDetail({ transactions, range, onSelectDay }: MonthDetailProps) {
  const days = summarizeActiveDays(transactions, range)
  if (days.length === 0) return <EmptyState>{NO_MONTH_TRANSACTIONS_MESSAGE}</EmptyState>

  return (
    <PeriodRows label="Dias do mês">
      {days.map((day) => (
        <PeriodRows.Item
          key={day.date}
          label={formatWeekdayDate(day.date)}
          totals={day}
          onSelect={() => onSelectDay(day.date)}
        />
      ))}
    </PeriodRows>
  )
}
