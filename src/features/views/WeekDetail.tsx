import { formatWeekdayDate, type DateRange } from '@/domain/dates'
import { summarizeDays } from '@/domain/periodViews'
import type { DateString, Transaction } from '@/domain/types'
import { PeriodRows } from '@/features/views/PeriodRows'

interface WeekDetailProps {
  transactions: Transaction[]
  range: DateRange
  onSelectDay: (date: DateString) => void
}

/** RF-05 visão Semana — 7 linhas, de segunda a domingo (CA-05.3); tocar abre a visão Dia. */
export function WeekDetail({ transactions, range, onSelectDay }: WeekDetailProps) {
  return (
    <PeriodRows label="Dias da semana">
      {summarizeDays(transactions, range).map((day) => (
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
