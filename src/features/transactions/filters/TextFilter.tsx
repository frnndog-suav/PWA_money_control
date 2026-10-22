import type { KeyboardEvent } from 'react'
import { Field } from '@/components/ui/Field'
import { TextInput } from '@/components/ui/TextInput'
import { useFilterBar } from '@/features/transactions/filters/filterBarContext'
import { useUiStore } from '@/stores/uiStore'

// "Buscar" no teclado do iPhone só fecha o teclado: a busca já é aplicada enquanto digita.
function closeKeyboardOnEnter(event: KeyboardEvent<HTMLInputElement>) {
  if (event.key === 'Enter') event.currentTarget.blur()
}

/**
 * CA-04.2 — texto na descrição, sem diferenciar maiúsculas e acentos, aplicado sem botão
 * "buscar". Fica no topo da tela, onde o teclado não o cobre.
 */
export function TextFilter() {
  const text = useUiStore((state) => state.transactionFilters.text)
  const setFilters = useUiStore((state) => state.setFilters)
  const { searchInputRef } = useFilterBar('FilterBar.Text')

  return (
    <Field>
      <Field.Label>Buscar na descrição</Field.Label>
      <TextInput
        ref={searchInputRef}
        value={text}
        onChange={(event) => setFilters({ text: event.target.value })}
        onKeyDown={closeKeyboardOnEnter}
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
      />
    </Field>
  )
}
