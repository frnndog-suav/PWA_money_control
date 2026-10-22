import { Button } from '@/components/ui/Button'
import { hasActiveFilters } from '@/domain/transactionFilters'
import { useFilterBar } from '@/features/transactions/filters/filterBarContext'
import { CLEAR_FILTERS_LABEL } from '@/features/transactions/transactionListTexts'
import { useUiStore } from '@/stores/uiStore'

/**
 * CA-04.4 — "Limpar filtros", visível só quando há algum filtro preenchido (pelo texto digitado,
 * sem esperar a busca). Depois de limpar, o foco vai para o campo de busca.
 */
export function ClearFiltersButton() {
  const text = useUiStore((state) => state.transactionFilters.text)
  const type = useUiStore((state) => state.transactionFilters.type)
  const tagId = useUiStore((state) => state.transactionFilters.tagId)
  const from = useUiStore((state) => state.transactionFilters.from)
  const to = useUiStore((state) => state.transactionFilters.to)
  const clearFilters = useUiStore((state) => state.clearFilters)
  const { searchInputRef } = useFilterBar('FilterBar.Clear')

  // RNF-06 — o botão some ao limpar; sem isto o foco cairia no <body>.
  const clearAndFocusSearch = () => {
    clearFilters()
    searchInputRef.current?.focus()
  }

  if (!hasActiveFilters({ text, type, tagId, from, to })) return null
  return (
    <Button variant="secondary" onClick={clearAndFocusSearch}>
      {CLEAR_FILTERS_LABEL}
    </Button>
  )
}
