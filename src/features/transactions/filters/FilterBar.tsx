import { useId, useRef, useState, type ReactNode } from 'react'
import { ClearFiltersButton } from '@/features/transactions/filters/ClearFiltersButton'
import { FilterBarContext, useFilterBar } from '@/features/transactions/filters/filterBarContext'
import { FilterToggle } from '@/features/transactions/filters/FilterToggle'
import { PeriodFilter } from '@/features/transactions/filters/PeriodFilter'
import { TagFilter } from '@/features/transactions/filters/TagFilter'
import { TextFilter } from '@/features/transactions/filters/TextFilter'
import { TypeFilter } from '@/features/transactions/filters/TypeFilter'

interface FilterBarPartProps {
  children: ReactNode
}

/** Linha de ações (botão "Filtros" e "Limpar filtros"). */
function FilterBarActions({ children }: FilterBarPartProps) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>
}

/**
 * Tipo, tag e período ficam recolhidos para não ocupar a tela do celular; o painel só abre
 * por toque no botão "Filtros" (princípio 15).
 */
function FilterBarPanel({ children }: FilterBarPartProps) {
  const { isPanelOpen, panelId } = useFilterBar('FilterBar.Panel')
  return (
    <div
      id={panelId}
      hidden={!isPanelOpen}
      className="flex flex-col gap-4 rounded-lg border border-slate-200 p-4 dark:border-slate-700"
    >
      {children}
    </div>
  )
}

/**
 * RF-04 / CA-04.2 — filtros combináveis da lista, compostos pelas partes:
 * `FilterBar.Text`, `.Actions`, `.Toggle`, `.Clear`, `.Panel`, `.Type`, `.Tag` e `.Period`.
 * Cada parte lê e grava o seu campo em `transactionFilters` (Zustand — §6.7).
 */
export function FilterBar({ children }: FilterBarPartProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const panelId = useId()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const togglePanel = () => setIsPanelOpen((isOpen) => !isOpen)

  return (
    <div role="search" aria-label="Filtros dos lançamentos" className="flex flex-col gap-3">
      <FilterBarContext value={{ isPanelOpen, togglePanel, panelId, searchInputRef }}>
        {children}
      </FilterBarContext>
    </div>
  )
}

FilterBar.Text = TextFilter
FilterBar.Actions = FilterBarActions
FilterBar.Toggle = FilterToggle
FilterBar.Clear = ClearFiltersButton
FilterBar.Panel = FilterBarPanel
FilterBar.Type = TypeFilter
FilterBar.Tag = TagFilter
FilterBar.Period = PeriodFilter
