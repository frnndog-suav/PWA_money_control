import { create } from 'zustand'

// §6.7 — estado de interface (não persistido). Os demais campos da §6.7 (visões e filtros
// da lista) entram nas fases que os usam; dados persistidos ficam no Dexie, nunca aqui.

interface UiState {
  /** CA-11.3 — há uma versão nova do PWA esperando o usuário tocar "Atualizar". */
  updateAvailable: boolean
}

interface UiActions {
  setUpdateAvailable: (updateAvailable: boolean) => void
}

export type UiStore = UiState & UiActions

export const INITIAL_UI_STATE: UiState = {
  updateAvailable: false,
}

export const useUiStore = create<UiStore>()((set) => ({
  ...INITIAL_UI_STATE,
  setUpdateAvailable: (updateAvailable) => set({ updateAvailable }),
}))
