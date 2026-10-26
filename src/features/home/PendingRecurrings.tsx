import { PendingOccurrencesSection } from '@/components/recurrings/PendingOccurrencesSection'
import { periodOf } from '@/domain/dates'
import type { DateString } from '@/domain/types'
import { usePendingOccurrences } from '@/repositories/recurringsRepository'

interface PendingRecurringsProps {
  today: DateString
}

/** RF-02 item 4 — recorrentes pendentes do mês corrente, com "Confirmar"; oculto sem pendências. */
export function PendingRecurrings({ today }: PendingRecurringsProps) {
  const period = periodOf(today)
  const pending = usePendingOccurrences([period])?.get(period)
  if (!pending) return null
  return <PendingOccurrencesSection occurrences={pending} currentPeriod={period} canSkip={false} />
}
