import { beforeEach, describe, expect, it } from 'vitest'
import { EMPTY_TRANSACTION_FILTERS } from '@/domain/transactionFilters'
import { INITIAL_UI_STATE, useUiStore } from '@/stores/uiStore'

describe('uiStore (§6.7)', () => {
  beforeEach(() => useUiStore.setState(INITIAL_UI_STATE))

  // CA-11.3
  it('começa sem atualização disponível', () => {
    expect(useUiStore.getState().updateAvailable).toBe(false)
  })

  // CA-11.3
  it('setUpdateAvailable liga e desliga o aviso de nova versão', () => {
    useUiStore.getState().setUpdateAvailable(true)
    expect(useUiStore.getState().updateAvailable).toBe(true)

    useUiStore.getState().setUpdateAvailable(false)
    expect(useUiStore.getState().updateAvailable).toBe(false)
  })
})

describe('uiStore — filtros da lista (RF-04 / CA-04.4)', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    useUiStore.setState(INITIAL_UI_STATE)
  })

  it('começa sem filtros', () => {
    expect(useUiStore.getState().transactionFilters).toEqual({
      text: '',
      type: 'all',
      tagId: null,
      from: null,
      to: null,
    })
    expect(INITIAL_UI_STATE.transactionFilters).toBe(EMPTY_TRANSACTION_FILTERS)
  })

  it('setFilters altera só os campos informados', () => {
    const { setFilters } = useUiStore.getState()
    setFilters({ text: 'merc' })
    setFilters({ tagId: 'tag-1', from: '2026-10-01' })
    expect(useUiStore.getState().transactionFilters).toEqual({
      text: 'merc',
      type: 'all',
      tagId: 'tag-1',
      from: '2026-10-01',
      to: null,
    })

    setFilters({ type: 'expense', from: null, to: '2026-10-31' })
    expect(useUiStore.getState().transactionFilters).toEqual({
      text: 'merc',
      type: 'expense',
      tagId: 'tag-1',
      from: null,
      to: '2026-10-31',
    })
  })

  it('setFilters não mexe no restante do estado', () => {
    useUiStore.getState().setUpdateAvailable(true)
    useUiStore.getState().setFilters({ text: 'a' })
    expect(useUiStore.getState().updateAvailable).toBe(true)
  })

  it('clearFilters volta ao estado inicial', () => {
    useUiStore.getState().setFilters({
      text: 'merc',
      type: 'income',
      tagId: 'tag-1',
      from: '2026-01-01',
      to: '2026-12-31',
    })
    useUiStore.getState().clearFilters()
    expect(useUiStore.getState().transactionFilters).toEqual(EMPTY_TRANSACTION_FILTERS)
  })

  // CA-04.4 — só em memória: fechar o app zera os filtros.
  it('não grava nada no localStorage nem no sessionStorage', () => {
    useUiStore.getState().setFilters({ text: 'merc', tagId: 'tag-1' })
    useUiStore.getState().clearFilters()
    useUiStore.getState().setFilters({ type: 'income' })
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
    expect('persist' in useUiStore).toBe(false)
  })
})
