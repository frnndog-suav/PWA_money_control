import { Link } from 'react-router'
import { EmptyState } from '@/components/ui/EmptyState'
import { Page } from '@/components/ui/Page'
import { FilterBar } from '@/features/transactions/filters/FilterBar'
import { FilterSummary } from '@/features/transactions/list/FilterSummary'
import { TransactionDayList } from '@/features/transactions/list/TransactionDayList'
import {
  NEW_TRANSACTION_LABEL,
  NO_FILTER_RESULTS_MESSAGE,
  NO_TRANSACTIONS_YET_MESSAGE,
} from '@/features/transactions/transactionListTexts'
import { useTransactionList } from '@/features/transactions/useTransactionList'

function NewTransactionLink() {
  return (
    <Link
      to="/lancamentos/novo"
      aria-label="Novo lançamento"
      className="flex min-h-11 items-center rounded-lg bg-blue-700 px-4 font-semibold text-white dark:bg-blue-600"
    >
      <span aria-hidden="true">+&nbsp;</span>
      {NEW_TRANSACTION_LABEL}
    </Link>
  )
}

/**
 * RF-04 — lista de lançamentos agrupada por dia, com busca, filtros combináveis (no Zustand,
 * mantidos ao trocar de tela), resumo do conjunto filtrado e paginação incremental.
 */
export function TransactionsPage() {
  const { summary, totalCount, tags, tagsById, isFiltering, filtersKey } = useTransactionList()

  return (
    <Page>
      <Page.Header trailing={<NewTransactionLink />}>Lançamentos</Page.Header>
      <FilterBar>
        <FilterBar.Text />
        <FilterBar.Actions>
          <FilterBar.Toggle />
          <FilterBar.Clear />
        </FilterBar.Actions>
        <FilterBar.Panel>
          <FilterBar.Type />
          <FilterBar.Tag tags={tags} />
          <FilterBar.Period />
        </FilterBar.Panel>
      </FilterBar>

      {/* Sem nada enquanto carrega, para o estado vazio não piscar. */}
      {isFiltering && summary && <FilterSummary count={summary.count} totals={summary.totals} />}
      {totalCount === 0 && <EmptyState>{NO_TRANSACTIONS_YET_MESSAGE}</EmptyState>}
      {totalCount !== undefined && totalCount > 0 && summary?.count === 0 && (
        <EmptyState>{NO_FILTER_RESULTS_MESSAGE}</EmptyState>
      )}
      {summary && summary.count > 0 && (
        <TransactionDayList key={filtersKey} days={summary.days} tagsById={tagsById} />
      )}
    </Page>
  )
}
