import { useState } from 'react'
import { LoadMore } from '@/components/ui/LoadMore'
import { countVisibleDays, type DayGroup } from '@/domain/transactionFilters'
import type { Tag } from '@/domain/types'
import { DaySection } from '@/features/transactions/list/DaySection'
import { LIST_PAGE_ITEM_COUNT, LOAD_MORE_LABEL } from '@/features/transactions/transactionListTexts'

interface TransactionDayListProps {
  /** Dias do mais recente para o mais antigo. */
  days: readonly DayGroup[]
  tagsById: ReadonlyMap<string, Tag>
}

/**
 * CA-04.1 / CA-04.6 — lista agrupada por dia com paginação incremental: monta só os dias da
 * página atual (dias inteiros, ~`LIST_PAGE_ITEM_COUNT` lançamentos por página) e carrega mais
 * perto do fim. Quem usa troca a `key` quando os filtros mudam, para voltar à 1ª página.
 */
export function TransactionDayList({ days, tagsById }: TransactionDayListProps) {
  // Guarda a meta de itens, e não a quantidade de dias: os dias visíveis são derivados a cada
  // renderização e acompanham a lista ao vivo (lançamento novo, excluído ou dados recarregados).
  const [itemTarget, setItemTarget] = useState(LIST_PAGE_ITEM_COUNT)
  const visible = countVisibleDays(days, itemTarget)
  const loadMore = () => setItemTarget(visible.itemCount + LIST_PAGE_ITEM_COUNT)

  return (
    <div className="flex flex-col gap-6">
      {days.slice(0, visible.dayCount).map((day) => (
        <DaySection key={day.date} day={day} tagsById={tagsById} />
      ))}
      {visible.dayCount < days.length && (
        <LoadMore onLoadMore={loadMore} loadedCount={visible.itemCount}>
          {LOAD_MORE_LABEL}
        </LoadMore>
      )}
    </div>
  )
}
