import { create } from 'zustand'
import { EMPTY_TRANSACTION_FILTERS, type TransactionFilters } from '@/domain/transactionFilters'

// §6.7 — estado de interface, só em memória: some ao fechar o app (sem `persist`). Os campos
// das visões entram na fase que os usa; dados persistidos ficam no Dexie, nunca aqui.

interface UiState {
  /** CA-11.3 — há uma versão nova do PWA esperando o usuário tocar "Atualizar". */
  updateAvailable: boolean
  /** RF-04 / CA-04.4 — filtros da lista; ficam enquanto o app estiver aberto. */
  transactionFilters: TransactionFilters
}

interface UiActions {
  setUpdateAvailable: (updateAvailable: boolean) => void
  /** Altera só os filtros informados; os outros continuam como estão. */
  setFilters: (filters: Partial<TransactionFilters>) => void
  clearFilters: () => void
}

export type UiStore = UiState & UiActions

export const INITIAL_UI_STATE: UiState = {
  updateAvailable: false,
  transactionFilters: EMPTY_TRANSACTION_FILTERS,
}

export const useUiStore = create<UiStore>()((set) => ({
  ...INITIAL_UI_STATE,
  setUpdateAvailable: (updateAvailable) => set({ updateAvailable }),
  setFilters: (filters) =>
    set((state) => ({ transactionFilters: { ...state.transactionFilters, ...filters } })),
  clearFilters: () => set({ transactionFilters: EMPTY_TRANSACTION_FILTERS }),
}))
