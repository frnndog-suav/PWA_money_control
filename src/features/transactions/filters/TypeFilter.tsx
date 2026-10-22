import { createRadioGroup } from '@/components/ui/createRadioGroup'
import type { TransactionTypeFilter } from '@/domain/transactionFilters'
import { useUiStore } from '@/stores/uiStore'

const TypeRadio = createRadioGroup<TransactionTypeFilter>()

/** CA-04.2 — tipo: todos, entradas ou saídas. */
export function TypeFilter() {
  const type = useUiStore((state) => state.transactionFilters.type)
  const setFilters = useUiStore((state) => state.setFilters)

  return (
    <TypeRadio.Root
      legend="Tipo"
      value={type}
      onValueChange={(value) => setFilters({ type: value })}
      variant="segmented"
    >
      <TypeRadio.Option value="all">Todos</TypeRadio.Option>
      <TypeRadio.Option value="income">Entradas</TypeRadio.Option>
      <TypeRadio.Option value="expense">Saídas</TypeRadio.Option>
    </TypeRadio.Root>
  )
}
