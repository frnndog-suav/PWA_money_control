import { create } from 'zustand'
import { today } from '@/domain/dates'
import { shiftAnchorDate, type ViewGranularity } from '@/domain/periodViews'
import { EMPTY_TRANSACTION_FILTERS, type TransactionFilters } from '@/domain/transactionFilters'
import type { DateString } from '@/domain/types'

// §6.7 — estado de interface, só em memória: some ao fechar o app (sem `persist`). Dados
// persistidos ficam no Dexie, nunca aqui.

interface UiState {
  /** CA-11.3 — há uma versão nova do PWA esperando o usuário tocar "Atualizar". */
  updateAvailable: boolean
  /** RF-04 / CA-04.4 — filtros da lista; ficam enquanto o app estiver aberto. */
  transactionFilters: TransactionFilters
  /** RF-05 / CA-05.4 — granularidade das visões (compartilhada com os gráficos). */
  viewGranularity: ViewGranularity
  /** RF-05 / CA-05.4 — data de referência: o período exibido é o que a contém. */
  viewAnchorDate: DateString
}

interface UiActions {
  setUpdateAvailable: (updateAvailable: boolean) => void
  /** Altera só os filtros informados; os outros continuam como estão. */
  setFilters: (filters: Partial<TransactionFilters>) => void
  clearFilters: () => void
  /** Troca a granularidade mantendo a data de referência. */
  setGranularity: (granularity: ViewGranularity) => void
  goPrev: () => void
  goNext: () => void
  /** Volta ao período que contém hoje, na granularidade atual. */
  goToday: () => void
  /** Detalhamento (Ano → Mês → Dia; Semana → Dia): abre o período que contém `anchorDate`. */
  openPeriod: (granularity: ViewGranularity, anchorDate: DateString) => void
}

export type UiStore = UiState & UiActions

export const INITIAL_UI_STATE: UiState = {
  updateAvailable: false,
  transactionFilters: EMPTY_TRANSACTION_FILTERS,
  viewGranularity: 'month',
  viewAnchorDate: today(),
}

export const useUiStore = create<UiStore>()((set) => {
  const shiftView = (steps: number) =>
    set((state) => ({
      viewAnchorDate: shiftAnchorDate(state.viewGranularity, state.viewAnchorDate, steps),
    }))

  return {
    ...INITIAL_UI_STATE,
    setUpdateAvailable: (updateAvailable) => set({ updateAvailable }),
    setFilters: (filters) =>
      set((state) => ({ transactionFilters: { ...state.transactionFilters, ...filters } })),
    clearFilters: () => set({ transactionFilters: EMPTY_TRANSACTION_FILTERS }),
    setGranularity: (viewGranularity) => set({ viewGranularity }),
    goPrev: () => shiftView(-1),
    goNext: () => shiftView(1),
    goToday: () => set({ viewAnchorDate: today() }),
    openPeriod: (viewGranularity, viewAnchorDate) => set({ viewGranularity, viewAnchorDate }),
  }
})
