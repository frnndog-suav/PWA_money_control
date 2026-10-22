import { createContext, use, type RefObject } from 'react'

export interface FilterBarContextValue {
  /** O painel com tipo, tag e período está aberto. */
  isPanelOpen: boolean
  togglePanel: () => void
  panelId: string
  /** Campo "Buscar na descrição": recebe o foco depois de "Limpar filtros" (RNF-06). */
  searchInputRef: RefObject<HTMLInputElement | null>
}

/** Estado local do `<FilterBar>` compartilhado entre o botão "Filtros" e o painel. */
export const FilterBarContext = createContext<FilterBarContextValue | null>(null)

export function useFilterBar(part: string): FilterBarContextValue {
  const context = use(FilterBarContext)
  if (!context) throw new Error(`<${part}> precisa estar dentro de <FilterBar>.`)
  return context
}
