import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { db } from '@/db/database'
import { compareByRecency } from '@/domain/transactions'
import type { Transaction } from '@/domain/types'
import {
  countTransactions,
  listTransactionsInPeriod,
  useTransactionCount,
  useTransactionsInPeriod,
} from '@/repositories/transactionsRepository'
import { makeTransaction } from '@/test/factories'
import { createTestRandom, daysInMonth, toDateString } from '@/test/propertyHelpers'

// RF-04 / CA-04.1 / CA-04.6 / D-44(a) — a consulta da lista é igual a filtrar o período e
// ordenar tudo em memória (data, createdAt, id — mais recente primeiro), com fake-indexeddb.
// O banco é limpo entre os testes por src/test/setup.ts.

function randomTransactions(seed: number, count: number): Transaction[] {
  const random = createTestRandom(seed)
  return Array.from({ length: count }, (_, index) => {
    const year = random.int(2025, 2027)
    const month = random.int(1, 12)
    const hour = random.int(0, 3)
    return makeTransaction({
      // ids fora de ordem de inserção, para o desempate por id ser exercitado.
      id: `id-${String(random.int(0, 99999)).padStart(5, '0')}-${index}`,
      date: toDateString(year, month, random.int(1, Math.min(3, daysInMonth(year, month)))),
      createdAt: `2026-01-01T0${hour}:00:00.000Z`,
    })
  })
}

function reference(
  all: readonly Transaction[],
  from: string | null,
  to: string | null,
): Transaction[] {
  return all
    .filter((t) => (from === null || t.date >= from) && (to === null || t.date <= to))
    .toSorted(compareByRecency)
}

const BOUNDS = [null, '2025-01-01', '2025-06-02', '2026-01-01', '2026-12-03', '2027-12-31']

describe('propriedade: listTransactionsInPeriod = filtrar e ordenar em memória (D-44(a))', () => {
  for (let seed = 1; seed <= 12; seed++) {
    it(`semente ${seed}`, async () => {
      const all = randomTransactions(seed, 150)
      await db.transactions.bulkAdd(all)
      const random = createTestRandom(seed * 977)
      for (let round = 0; round < 6; round++) {
        const from = BOUNDS[random.int(0, BOUNDS.length - 1)]
        const to = BOUNDS[random.int(0, BOUNDS.length - 1)]
        // Período invertido não chega aqui (a tela usa effectivePeriod — D-44(b)).
        if (from !== null && to !== null && from > to) continue
        expect(await listTransactionsInPeriod(from, to)).toEqual(reference(all, from, to))
      }
      expect(await listTransactionsInPeriod(null, null)).toEqual(reference(all, null, null))
    })
  }
})

describe('listTransactionsInPeriod — limites (RF-04 / CA-04.2)', () => {
  it('mesma data inicial e final = só aquele dia; limites exatos são incluídos', async () => {
    await db.transactions.bulkAdd([
      makeTransaction({ description: 'antes', date: '2026-12-30' }),
      makeTransaction({ description: 'dez-31', date: '2026-12-31' }),
      makeTransaction({ description: 'jan-01', date: '2027-01-01' }),
      makeTransaction({ description: 'depois', date: '2027-01-02' }),
    ])
    const names = async (from: string | null, to: string | null) =>
      (await listTransactionsInPeriod(from, to)).map((t) => t.description)

    expect(await names('2026-12-31', '2026-12-31')).toEqual(['dez-31'])
    expect(await names('2026-12-31', '2027-01-01')).toEqual(['jan-01', 'dez-31'])
    expect(await names('2027-01-01', null)).toEqual(['depois', 'jan-01'])
    expect(await names(null, '2026-12-31')).toEqual(['dez-31', 'antes'])
  })

  it('desempate no mesmo dia e mesmo createdAt: id maior primeiro (ordem estável)', async () => {
    const createdAt = '2026-10-20T10:00:00.000Z'
    await db.transactions.bulkAdd([
      makeTransaction({ id: 'b', date: '2026-10-20', createdAt }),
      makeTransaction({ id: 'c', date: '2026-10-20', createdAt }),
      makeTransaction({ id: 'a', date: '2026-10-20', createdAt }),
    ])
    expect((await listTransactionsInPeriod(null, null)).map((t) => t.id)).toEqual(['c', 'b', 'a'])
  })
})

describe('countTransactions (CA-04.6 / D-45(d))', () => {
  it('acompanha inclusões e exclusões', async () => {
    const items = randomTransactions(5, 37)
    await db.transactions.bulkAdd(items)
    expect(await countTransactions()).toBe(37)
    await db.transactions.bulkDelete(items.slice(0, 7).map((t) => t.id))
    expect(await countTransactions()).toBe(30)
  })
})

describe('hooks ao vivo da lista (RF-04 / CA-02.4)', () => {
  it('useTransactionsInPeriod começa undefined, carrega e se atualiza quando a tabela muda', async () => {
    await db.transactions.bulkAdd([
      makeTransaction({ id: 'out', date: '2026-10-10' }),
      makeTransaction({ id: 'fora', date: '2026-09-10' }),
    ])
    type Period = { from: string | null; to: string | null }
    const initialProps: Period = { from: '2026-10-01', to: '2026-10-31' }
    const { result, rerender } = renderHook(
      ({ from, to }: Period) => useTransactionsInPeriod(from, to),
      { initialProps },
    )
    expect(result.current).toBeUndefined()
    await waitFor(() => expect(result.current?.map((t) => t.id)).toEqual(['out']))

    await act(() => db.transactions.add(makeTransaction({ id: 'novo', date: '2026-10-31' })))
    await waitFor(() => expect(result.current?.map((t) => t.id)).toEqual(['novo', 'out']))

    rerender({ from: null, to: null })
    await waitFor(() => expect(result.current?.map((t) => t.id)).toEqual(['novo', 'out', 'fora']))
  })

  it('useTransactionCount conta e se atualiza', async () => {
    const { result } = renderHook(() => useTransactionCount())
    await waitFor(() => expect(result.current).toBe(0))
    await act(() => db.transactions.bulkAdd(randomTransactions(9, 4)))
    await waitFor(() => expect(result.current).toBe(4))
  })
})
