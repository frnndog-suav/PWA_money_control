import { totals } from '@/domain/balances'
import {
  incomeExpenseSeries,
  isBalanceGranularity,
  tagSlices,
  type ChartGranularity,
} from '@/domain/charts'
import type { DateRange } from '@/domain/dates'
import type { Transaction } from '@/domain/types'
import { BalanceLineCard } from '@/features/charts/BalanceLineCard'
import {
  EXPENSES_BY_TAG_TITLE,
  EXPENSES_TOTAL_LABEL,
  INCOME_BY_TAG_TITLE,
  INCOME_TOTAL_LABEL,
  NO_EXPENSES_MESSAGE,
  NO_INCOME_MESSAGE,
} from '@/features/charts/chartTexts'
import { IncomeExpenseBarCard } from '@/features/charts/IncomeExpenseBarCard'
import { TagDoughnutCard } from '@/features/charts/TagDoughnutCard'
import { useTags } from '@/repositories/tagsRepository'

interface ChartListProps {
  granularity: ChartGranularity
  range: DateRange
  /** Lançamentos realizados do período (sem recorrentes pendentes — CA-06.11). */
  transactions: Transaction[]
}

/** RF-06 — os quatro gráficos da tabela, conforme a granularidade. */
export function ChartList({ granularity, range, transactions }: ChartListProps) {
  const tags = useTags()
  const tagsById = new Map(tags?.map((tag) => [tag.id, tag]))
  // A data de referência só importa pelo período: o 1º dia dele serve para todos os cálculos.
  const anchor = range.start

  return (
    <div className="flex flex-col gap-4">
      {/* Espera as tags para as fatias já nascerem com nome e cor (CA-06.3). */}
      {tags && (
        <>
          <TagDoughnutCard
            title={EXPENSES_BY_TAG_TITLE}
            slices={tagSlices(transactions, 'expense', tagsById)}
            totalLabel={EXPENSES_TOTAL_LABEL}
            emptyMessage={NO_EXPENSES_MESSAGE}
          />
          <TagDoughnutCard
            title={INCOME_BY_TAG_TITLE}
            slices={tagSlices(transactions, 'income', tagsById)}
            totalLabel={INCOME_TOTAL_LABEL}
            emptyMessage={NO_INCOME_MESSAGE}
          />
        </>
      )}
      <IncomeExpenseBarCard
        points={incomeExpenseSeries(transactions, granularity, anchor)}
        periodTotals={totals(transactions)}
      />
      {isBalanceGranularity(granularity) && (
        <BalanceLineCard granularity={granularity} anchor={anchor} end={range.end} />
      )}
    </div>
  )
}
