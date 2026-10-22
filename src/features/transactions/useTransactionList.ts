import { useEffect } from 'react'
import { useDebouncedValue } from '@/components/ui/useDebouncedValue'
import {
  effectivePeriod,
  hasActiveFilters,
  summarizeTransactionList,
  type TransactionFilters,
  type TransactionListSummary,
} from '@/domain/transactionFilters'
import type { Tag } from '@/domain/types'
import { SEARCH_DEBOUNCE_MS } from '@/features/transactions/transactionListTexts'
import { useTags } from '@/repositories/tagsRepository'
import { useTransactionCount, useTransactionsInPeriod } from '@/repositories/transactionsRepository'
import { useUiStore } from '@/stores/uiStore'

export interface TransactionListState {
  /** `undefined` enquanto os lançamentos carregam. */
  summary: TransactionListSummary | undefined
  /** Quantos lançamentos existem no total (sem filtro); `undefined` enquanto carrega. */
  totalCount: number | undefined
  tags: Tag[] | undefined
  tagsById: ReadonlyMap<string, Tag>
  /** Algum filtro aplicado: mostra o resumo do conjunto filtrado (CA-04.3). */
  isFiltering: boolean
  /** Muda quando os filtros aplicados mudam: a paginação volta para a 1ª página. */
  filtersKey: string
}

/**
 * RF-04 — dados da lista: lê os filtros do Zustand, busca no banco só o período (índice
 * `date`) e aplica tipo, tag e texto no domínio. A busca por texto espera o usuário parar de
 * digitar (`SEARCH_DEBOUNCE_MS`); apagar o texto vale na hora.
 */
export function useTransactionList(): TransactionListState {
  // Um seletor por campo: a tela só renderiza de novo quando um filtro usado muda.
  const text = useUiStore((state) => state.transactionFilters.text)
  const type = useUiStore((state) => state.transactionFilters.type)
  const tagId = useUiStore((state) => state.transactionFilters.tagId)
  const from = useUiStore((state) => state.transactionFilters.from)
  const to = useUiStore((state) => state.transactionFilters.to)

  const setFilters = useUiStore((state) => state.setFilters)

  // Texto só com espaços = sem busca, aplicado na hora (e sem a busca anterior voltar se o
  // usuário redigitar antes do fim da espera — D-44 c).
  const searchInput = text.trim() === '' ? '' : text
  const searchText = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS, '')
  const period = effectivePeriod({ from, to })

  const transactions = useTransactionsInPeriod(period.from, period.to)
  const totalCount = useTransactionCount()
  const tags = useTags()
  const tagsById = new Map(tags?.map((tag) => [tag.id, tag]))

  // A tag do filtro foi excluída (ex.: em Ajustes → Tags): vale como "Todas". Só depois de as
  // tags carregarem, para não descartar o filtro enquanto a lista de tags ainda é `undefined`.
  const isTagMissing = tagId !== null && tags !== undefined && !tagsById.has(tagId)
  useEffect(() => {
    // Limpa também no Zustand, para o chip "Todas" e o contador "Filtros" ficarem coerentes.
    if (isTagMissing) setFilters({ tagId: null })
  }, [isTagMissing, setFilters])

  const appliedFilters: TransactionFilters = {
    text: searchText,
    type,
    tagId: isTagMissing ? null : tagId,
    from,
    to,
  }
  // O React Compiler memoiza este cálculo: só refaz quando os lançamentos ou os filtros mudam.
  const summary = transactions && summarizeTransactionList(transactions, appliedFilters)

  return {
    summary,
    totalCount,
    tags,
    tagsById,
    // Pelos filtros aplicados (texto já com a espera): o resumo nunca mostra, durante a espera,
    // os totais da lista sem filtro como se fossem o resultado da busca (CA-04.3).
    isFiltering: hasActiveFilters(appliedFilters),
    filtersKey: JSON.stringify(appliedFilters),
  }
}
