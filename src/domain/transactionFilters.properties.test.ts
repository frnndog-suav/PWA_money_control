import { describe, expect, it } from 'vitest'
import { totals } from '@/domain/balances'
import {
  countVisibleDays,
  EMPTY_TRANSACTION_FILTERS,
  filterTransactions,
  summarizeTransactionList,
  type TransactionFilters,
} from '@/domain/transactionFilters'
import { sortByRecency } from '@/domain/transactions'
import type { Transaction } from '@/domain/types'
import { makeTransaction } from '@/test/factories'
import { createTestRandom, daysInMonth, toDateString } from '@/test/propertyHelpers'

// RF-04 / CA-04.3 — propriedades com listas geradas por semente: os totais do conjunto
// filtrado são sempre a soma dos itens filtrados, e o agrupamento não perde nem repete itens.

const WORDS = ['Mercado', 'mercado do bairro', 'Padaria', 'Farmácia', 'Salário', 'Açougue']

function randomTransactions(seed: number, count: number): Transaction[] {
  const random = createTestRandom(seed)
  return sortByRecency(
    Array.from({ length: count }, () => {
      const year = random.int(2025, 2027)
      const month = random.int(1, 12)
      return makeTransaction({
        type: random.next() < 0.4 ? 'income' : 'expense',
        amountCents: random.int(1, 500_000),
        date: toDateString(year, month, random.int(1, daysInMonth(year, month))),
        description: WORDS[random.int(0, WORDS.length - 1)],
        tagId: `tag-${random.int(1, 5)}`,
      })
    }),
  )
}

function randomFilters(seed: number): TransactionFilters {
  const random = createTestRandom(seed)
  const pick = <T>(options: readonly T[]) => options[random.int(0, options.length - 1)]
  return {
    text: pick(['', 'merc', 'PADA', 'á', 'xyz']),
    type: pick(['all', 'income', 'expense'] as const),
    tagId: pick([null, 'tag-1', 'tag-3']),
    from: pick([null, '2025-06-01', '2026-01-15']),
    to: pick([null, '2026-12-31', '2025-03-01']),
  }
}

describe('propriedades da lista filtrada (CA-04.3)', () => {
  for (let seed = 1; seed <= 40; seed++) {
    it(`semente ${seed}: totais = soma dos filtrados; dias decrescentes, sem perder itens`, () => {
      const transactions = randomTransactions(seed, 300)
      const filters = seed === 1 ? EMPTY_TRANSACTION_FILTERS : randomFilters(seed * 7919)
      const filtered = filterTransactions(transactions, filters)
      const summary = summarizeTransactionList(transactions, filters)

      expect(summary.totals).toEqual(totals(filtered))
      expect(summary.count).toBe(filtered.length)
      expect(summary.days.flatMap((day) => day.transactions)).toEqual(filtered)

      for (let index = 1; index < summary.days.length; index++) {
        expect(summary.days[index - 1].date > summary.days[index].date).toBe(true)
      }
      for (const day of summary.days) {
        expect({
          incomeCents: day.incomeCents,
          expenseCents: day.expenseCents,
          resultCents: day.resultCents,
        }).toEqual(totals(day.transactions))
      }
      // Paginando até o fim, todos os dias aparecem.
      expect(countVisibleDays(summary.days, Number.POSITIVE_INFINITY)).toEqual({
        dayCount: summary.days.length,
        itemCount: summary.count,
      })
    })
  }
})
