import { totals, type Totals } from '@/domain/balances'
import type { DateRange } from '@/domain/dates'
import { formatViewTitle, viewRange, type ViewGranularity } from '@/domain/periodViews'
import type { Transaction } from '@/domain/types'
import { useTransactionsInRange } from '@/repositories/transactionsRepository'
import { useUiStore } from '@/stores/uiStore'

export interface PeriodViewState {
  granularity: ViewGranularity
  range: DateRange
  title: string
  /** Lançamentos do período, do mais recente ao mais antigo; `undefined` enquanto carrega. */
  transactions: Transaction[] | undefined
  /** Cartão de resumo; `undefined` enquanto carrega. */
  totals: Totals | undefined
}

/**
 * RF-05 — período escolhido no Zustand (CA-05.4) e os lançamentos dele: o banco só lê o
 * intervalo do período pelo índice `date`, e a leitura de um período anterior nunca é
 * mostrada com o título do novo, então os totais não incluem datas de fora (CA-05.1).
 */
export function usePeriodView(): PeriodViewState {
  const granularity = useUiStore((state) => state.viewGranularity)
  const anchor = useUiStore((state) => state.viewAnchorDate)
  const range = viewRange(granularity, anchor)
  const transactions = useTransactionsInRange(range.start, range.end)

  return {
    granularity,
    range,
    title: formatViewTitle(granularity, anchor),
    transactions,
    totals: transactions && totals(transactions),
  }
}
