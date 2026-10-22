import { fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { addMonthsClamped } from '@/domain/dates'
import { LIST_PAGE_ITEM_COUNT } from '@/features/transactions/transactionListTexts'
import {
  expectRowCount,
  openList,
  seedTags,
  seedTransactions,
  transactionLinks,
  typeSearch,
} from '@/test/transactionList'

// RF-04 / CA-04.6 — paginação incremental: a lista monta só a página atual.

/** Um lançamento por dia, em `count` dias seguidos a partir de 2026-01-01. */
async function seedOnePerDay(count: number) {
  const { market } = await seedTags()
  const items = Array.from({ length: count }, (_, index) => {
    // Avança um dia por item sem objetos Date (princípio 2).
    const month = addMonthsClamped('2026-01-01', Math.floor(index / 28)).slice(0, 7)
    const day = String((index % 28) + 1).padStart(2, '0')
    return { description: `Item ${index}`, date: `${month}-${day}`, tagId: market.id }
  })
  await seedTransactions(...items)
}

type ObserverCallback = (entries: { isIntersecting: boolean }[]) => void

/** IntersectionObserver de mentira (o jsdom não tem): guarda os callbacks para disparar. */
function installFakeIntersectionObserver() {
  const callbacks = new Set<ObserverCallback>()
  class FakeIntersectionObserver {
    private readonly callback: ObserverCallback
    constructor(callback: ObserverCallback) {
      this.callback = callback
    }
    observe() {
      callbacks.add(this.callback)
    }
    disconnect() {
      callbacks.delete(this.callback)
    }
  }
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
  return {
    reachEnd: () => {
      for (const callback of [...callbacks]) callback([{ isIntersecting: true }])
    },
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('TransactionsPage — paginação (CA-04.6)', () => {
  it('mostra a 1ª página e "Carregar mais" acrescenta as próximas', async () => {
    await seedOnePerDay(120)
    await openList()

    await expectRowCount(LIST_PAGE_ITEM_COUNT)
    // O mais recente primeiro.
    expect(transactionLinks()[0].textContent).toContain('Item 119')

    fireEvent.click(screen.getByRole('button', { name: 'Carregar mais' }))
    await expectRowCount(LIST_PAGE_ITEM_COUNT * 2)

    fireEvent.click(screen.getByRole('button', { name: 'Carregar mais' }))
    await expectRowCount(120)
    expect(screen.queryByRole('button', { name: 'Carregar mais' })).toBeNull()
  })

  it('chegar perto do fim (IntersectionObserver) carrega mais sozinho', async () => {
    const observer = installFakeIntersectionObserver()
    await seedOnePerDay(80)
    await openList()
    await expectRowCount(LIST_PAGE_ITEM_COUNT)

    observer.reachEnd()
    await expectRowCount(80)
    expect(screen.queryByRole('button', { name: 'Carregar mais' })).toBeNull()
  })

  it('mudar um filtro volta para a 1ª página', async () => {
    await seedOnePerDay(160)
    await openList()
    await expectRowCount(LIST_PAGE_ITEM_COUNT)
    fireEvent.click(screen.getByRole('button', { name: 'Carregar mais' }))
    await expectRowCount(LIST_PAGE_ITEM_COUNT * 2)

    // "Item 1" acha "Item 1", "Item 10".."Item 19" e "Item 100".."Item 159": 71 itens.
    typeSearch('Item 1')
    await expectRowCount(LIST_PAGE_ITEM_COUNT)
    expect(screen.getByRole('button', { name: 'Carregar mais' })).toBeDefined()
  })
})
