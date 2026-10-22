import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Tag, Transaction } from '@/domain/types'
import { SEARCH_DEBOUNCE_MS } from '@/features/transactions/transactionListTexts'
import { useTransactionList } from '@/features/transactions/useTransactionList'
import { INITIAL_UI_STATE, useUiStore } from '@/stores/uiStore'
import { makeTag, makeTransaction } from '@/test/factories'

// RF-04 / CA-04.2 / CA-04.3 / D-44 — espera da busca, resumo pelos filtros aplicados e filtro de
// tag excluída. Os hooks do banco são substituídos por dados fixos: assim os timers falsos não
// interferem no IndexedDB.

const data = vi.hoisted(() => ({
  transactions: [] as Transaction[],
  tags: undefined as Tag[] | undefined,
}))

vi.mock('@/repositories/transactionsRepository', () => ({
  useTransactionsInPeriod: () => data.transactions,
  useTransactionCount: () => data.transactions.length,
}))

vi.mock('@/repositories/tagsRepository', () => ({
  useTags: () => data.tags,
}))

const MARKET = makeTag({ id: 'market', name: 'Mercado' })

beforeEach(() => {
  vi.useFakeTimers()
  data.tags = [MARKET]
  data.transactions = [
    makeTransaction({ description: 'Mercado', date: '2026-10-20', tagId: MARKET.id }),
    makeTransaction({ description: 'mercado do bairro', date: '2026-10-18', tagId: MARKET.id }),
    makeTransaction({ description: 'Farmácia', date: '2026-10-15', tagId: MARKET.id }),
    makeTransaction({ description: 'Academia', date: '2026-10-10', tagId: MARKET.id }),
  ]
})

afterEach(() => {
  vi.useRealTimers()
  useUiStore.setState(INITIAL_UI_STATE)
})

const typeText = (text: string) => act(() => useUiStore.getState().setFilters({ text }))
const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms))

function setup() {
  return renderHook(() => useTransactionList())
}

describe('useTransactionList — espera da busca (RF-04 / CA-04.2 / D-44)', () => {
  it('a lista não muda a 249 ms e muda a 250 ms', () => {
    const { result } = setup()
    expect(result.current.summary?.count).toBe(4)

    typeText('merc')
    expect(result.current.summary?.count).toBe(4)
    wait(SEARCH_DEBOUNCE_MS - 1)
    expect(result.current.summary?.count).toBe(4)
    wait(1)
    expect(result.current.summary?.count).toBe(2)
  })

  it('apagar o texto vale na hora (inclusive só espaços)', () => {
    const { result } = setup()
    typeText('merc')
    wait(SEARCH_DEBOUNCE_MS)
    expect(result.current.summary?.count).toBe(2)

    typeText('')
    expect(result.current.summary?.count).toBe(4)

    typeText('merc')
    wait(SEARCH_DEBOUNCE_MS)
    typeText('   ')
    expect(result.current.summary?.count).toBe(4)
  })

  it('apagar e redigitar antes da espera não mostra a busca antiga', () => {
    const { result } = setup()
    typeText('merc')
    wait(SEARCH_DEBOUNCE_MS)
    const keyWithSearch = result.current.filtersKey

    typeText('')
    typeText('far')
    // Durante a espera vale "sem busca", e não "merc".
    expect(result.current.summary?.count).toBe(4)
    expect(result.current.filtersKey).not.toBe(keyWithSearch)
    wait(SEARCH_DEBOUNCE_MS - 1)
    expect(result.current.summary?.count).toBe(4)

    wait(1)
    expect(result.current.summary?.count).toBe(1)
    expect(result.current.isFiltering).toBe(true)
  })
})

describe('useTransactionList — resumo pelos filtros aplicados (CA-04.3)', () => {
  it('na 1ª tecla o resumo não aparece com os totais sem filtro; aparece após a espera', () => {
    const { result } = setup()
    expect(result.current.isFiltering).toBe(false)

    typeText('m')
    expect(result.current.isFiltering).toBe(false)
    wait(SEARCH_DEBOUNCE_MS - 1)
    expect(result.current.isFiltering).toBe(false)
    wait(1)
    expect(result.current.isFiltering).toBe(true)
  })

  it('filtros sem espera (tipo) aparecem no resumo na hora', () => {
    const { result } = setup()
    act(() => useUiStore.getState().setFilters({ type: 'income' }))
    expect(result.current.isFiltering).toBe(true)
    expect(result.current.summary?.count).toBe(0)
  })
})

describe('useTransactionList — tag do filtro excluída (CA-04.2)', () => {
  it('vale como "Todas" e o filtro é limpo no Zustand', () => {
    act(() => useUiStore.getState().setFilters({ tagId: 'tag-excluida' }))
    const { result } = setup()

    expect(result.current.summary?.count).toBe(4)
    expect(result.current.isFiltering).toBe(false)
    expect(useUiStore.getState().transactionFilters.tagId).toBeNull()
  })

  it('enquanto as tags carregam, o filtro de tag é mantido', () => {
    data.tags = undefined
    act(() => useUiStore.getState().setFilters({ tagId: MARKET.id }))
    const { result } = setup()

    expect(result.current.summary?.count).toBe(4)
    expect(useUiStore.getState().transactionFilters.tagId).toBe(MARKET.id)
  })

  it('tag existente continua filtrando', () => {
    act(() => useUiStore.getState().setFilters({ tagId: MARKET.id }))
    const { result } = setup()
    expect(useUiStore.getState().transactionFilters.tagId).toBe(MARKET.id)
    expect(result.current.isFiltering).toBe(true)
  })
})
