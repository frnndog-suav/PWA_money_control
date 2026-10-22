import { Button } from '@/components/ui/Button'
import { countActiveFilters, EMPTY_TRANSACTION_FILTERS } from '@/domain/transactionFilters'
import { useFilterBar } from '@/features/transactions/filters/filterBarContext'
import { useUiStore } from '@/stores/uiStore'

/** Abre e fecha o painel; o contador mostra quantos filtros do painel estão ativos. */
export function FilterToggle() {
  const { isPanelOpen, togglePanel, panelId } = useFilterBar('FilterBar.Toggle')
  const type = useUiStore((state) => state.transactionFilters.type)
  const tagId = useUiStore((state) => state.transactionFilters.tagId)
  const from = useUiStore((state) => state.transactionFilters.from)
  const to = useUiStore((state) => state.transactionFilters.to)
  // O texto fica fora do painel, sempre visível: não entra no contador.
  const panelCount = countActiveFilters({ ...EMPTY_TRANSACTION_FILTERS, type, tagId, from, to })

  return (
    <Button
      variant="secondary"
      aria-expanded={isPanelOpen}
      aria-controls={panelId}
      onClick={togglePanel}
      className="flex items-center gap-2"
    >
      <span>Filtros{panelCount > 0 && ` (${panelCount})`}</span>
      <span aria-hidden="true">{isPanelOpen ? '▴' : '▾'}</span>
    </Button>
  )
}
