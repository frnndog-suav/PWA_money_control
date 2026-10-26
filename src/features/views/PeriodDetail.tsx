import type { DateRange } from '@/domain/dates'
import { yearOf, type ViewGranularity } from '@/domain/periodViews'
import type { PendingOccurrence } from '@/domain/recurring'
import type { DateString, PeriodString, Transaction } from '@/domain/types'
import { DayDetail } from '@/features/views/DayDetail'
import { MonthDetail } from '@/features/views/MonthDetail'
import { WeekDetail } from '@/features/views/WeekDetail'
import { YearDetail } from '@/features/views/YearDetail'

interface PeriodDetailProps {
  granularity: ViewGranularity
  range: DateRange
  transactions: Transaction[]
  /** Recorrentes pendentes de cada mês do período (Mês e Ano — RF-05 / RF-07). */
  pending: ReadonlyMap<PeriodString, PendingOccurrence[]>
  /** Detalhamento: abre o período que contém `anchorDate` na granularidade indicada. */
  onOpenPeriod: (granularity: ViewGranularity, anchorDate: DateString) => void
}

/** RF-05 — detalhamento da granularidade escolhida (tabela "Por granularidade"). */
export function PeriodDetail({
  granularity,
  range,
  transactions,
  pending,
  onOpenPeriod,
}: PeriodDetailProps) {
  const openDay = (date: DateString) => onOpenPeriod('day', date)

  switch (granularity) {
    case 'day':
      return <DayDetail transactions={transactions} />
    case 'week':
      return <WeekDetail transactions={transactions} range={range} onSelectDay={openDay} />
    case 'month':
      return (
        <MonthDetail
          transactions={transactions}
          range={range}
          pending={pending.get(range.start.slice(0, 7)) ?? []}
          onSelectDay={openDay}
        />
      )
    case 'year':
      return (
        <YearDetail
          transactions={transactions}
          year={yearOf(range.start)}
          pending={pending}
          // O mês abre pelo dia 1º: a visão Mês mostra o mês inteiro de qualquer forma.
          onSelectMonth={(period) => onOpenPeriod('month', `${period}-01`)}
        />
      )
  }
}
