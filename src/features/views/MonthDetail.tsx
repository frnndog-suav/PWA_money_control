import { PendingOccurrencesSection } from '@/components/recurrings/PendingOccurrencesSection'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToday } from '@/components/ui/useToday'
import { formatWeekdayDate, periodOf, type DateRange } from '@/domain/dates'
import { summarizeActiveDays } from '@/domain/periodViews'
import type { PendingOccurrence } from '@/domain/recurring'
import type { DateString, Transaction } from '@/domain/types'
import { PeriodRows } from '@/features/views/PeriodRows'
import { NO_MONTH_TRANSACTIONS_MESSAGE } from '@/features/views/viewTexts'

interface MonthDetailProps {
  transactions: Transaction[]
  range: DateRange
  /** Recorrentes pendentes do mês (RF-07). */
  pending: PendingOccurrence[]
  onSelectDay: (date: DateString) => void
}

/**
 * RF-05 visão Mês — uma linha por dia com movimento (tocar abre a visão Dia) e a seção
 * "Recorrentes pendentes", com "Confirmar" e "Pular" (D-51). Pendências de meses passados
 * aparecem como "Não confirmada" (CA-07.7).
 */
export function MonthDetail({ transactions, range, pending, onSelectDay }: MonthDetailProps) {
  const currentPeriod = periodOf(useToday())
  const days = summarizeActiveDays(transactions, range)

  return (
    <div className="flex flex-col gap-6">
      {days.length === 0 ? (
        <EmptyState>{NO_MONTH_TRANSACTIONS_MESSAGE}</EmptyState>
      ) : (
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
      )}
      <PendingOccurrencesSection occurrences={pending} currentPeriod={currentPeriod} canSkip />
    </div>
  )
}
