import { periodOf, periodsBetween, type DateRange } from '@/domain/dates'
import type { ViewGranularity } from '@/domain/periodViews'
import type { PendingOccurrence } from '@/domain/recurring'
import type { PeriodString } from '@/domain/types'
import { usePendingOccurrences } from '@/repositories/recurringsRepository'

/** Meses cujas pendências a visão mostra: o mês (Mês) ou os 12 meses (Ano); nenhum nas outras. */
function pendingPeriodsOf(granularity: ViewGranularity, range: DateRange): PeriodString[] {
  if (granularity === 'month') return [periodOf(range.start)]
  if (granularity === 'year') return periodsBetween(periodOf(range.start), periodOf(range.end))
  return []
}

/**
 * RF-05 / CA-05.2 — recorrentes pendentes de cada mês do período, para o Previsto e a seção
 * "Recorrentes pendentes"; `undefined` enquanto carrega.
 */
export function usePeriodPending(
  granularity: ViewGranularity,
  range: DateRange,
): Map<PeriodString, PendingOccurrence[]> | undefined {
  return usePendingOccurrences(pendingPeriodsOf(granularity, range))
}
