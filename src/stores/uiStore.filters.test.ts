import { afterEach, describe, expect, it, vi } from 'vitest'
import { EMPTY_TRANSACTION_FILTERS } from '@/domain/transactionFilters'
import { INITIAL_UI_STATE, useUiStore } from '@/stores/uiStore'

// RF-04 / CA-04.4 / §6.7 / D-45(f) — filtros só em memória (Zustand, sem `persist`).
// O estado volta a INITIAL_UI_STATE depois de cada teste (src/test/setup.ts).

const EMPTY_SNAPSHOT = { text: '', type: 'all', tagId: null, from: null, to: null }

afterEach(() => {
  vi.restoreAllMocks()
})

describe('uiStore.transactionFilters — isolamento e imutabilidade (CA-04.4)', () => {
  it('1º teste: altera todos os filtros', () => {
    useUiStore.getState().setFilters({
      text: 'merc',
      type: 'expense',
      tagId: 'tag-1',
      from: '2026-01-01',
      to: '2026-12-31',
    })
    expect(useUiStore.getState().transactionFilters.text).toBe('merc')
  })

  it('2º teste: começa de novo sem filtros (estado isolado entre testes)', () => {
    expect(useUiStore.getState().transactionFilters).toEqual(EMPTY_SNAPSHOT)
  })

  it('setFilters e clearFilters nunca alteram EMPTY_TRANSACTION_FILTERS', () => {
    useUiStore.getState().setFilters({ text: 'a', tagId: 't' })
    useUiStore.getState().clearFilters()
    useUiStore.getState().setFilters({ type: 'income', from: '2026-10-01' })
    expect(EMPTY_TRANSACTION_FILTERS).toEqual(EMPTY_SNAPSHOT)
    expect(INITIAL_UI_STATE.transactionFilters).toEqual(EMPTY_SNAPSHOT)
  })

  it('setFilters cria um novo objeto (os componentes percebem a mudança)', () => {
    const before = useUiStore.getState().transactionFilters
    useUiStore.getState().setFilters({ text: 'x' })
    const after = useUiStore.getState().transactionFilters
    expect(after).not.toBe(before)
    expect(before).toEqual(EMPTY_SNAPSHOT)
  })

  it('setFilters({}) mantém os valores', () => {
    useUiStore.getState().setFilters({ tagId: 'tag-2' })
    useUiStore.getState().setFilters({})
    expect(useUiStore.getState().transactionFilters).toEqual({ ...EMPTY_SNAPSHOT, tagId: 'tag-2' })
  })

  it('clearFilters não mexe no aviso de nova versão', () => {
    useUiStore.getState().setUpdateAvailable(true)
    useUiStore.getState().setFilters({ text: 'a' })
    useUiStore.getState().clearFilters()
    expect(useUiStore.getState().updateAvailable).toBe(true)
    expect(useUiStore.getState().transactionFilters).toEqual(EMPTY_SNAPSHOT)
  })
})

describe('uiStore.transactionFilters — nada é persistido (CA-04.4)', () => {
  it('nenhuma escrita em localStorage/sessionStorage e sem middleware persist', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const { setFilters, clearFilters } = useUiStore.getState()
    setFilters({ text: 'merc' })
    setFilters({ type: 'income', tagId: 'tag-1', from: '2026-10-01', to: '2026-10-31' })
    clearFilters()
    expect(setItem).not.toHaveBeenCalled()
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
    // O middleware persist do Zustand expõe `useStore.persist`.
    expect((useUiStore as unknown as Record<string, unknown>).persist).toBeUndefined()
  })
})
