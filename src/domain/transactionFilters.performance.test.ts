import { describe, expect, it } from 'vitest'
import {
  countVisibleDays,
  EMPTY_TRANSACTION_FILTERS,
  summarizeTransactionList,
  type TransactionFilters,
} from '@/domain/transactionFilters'
import { sortByRecency } from '@/domain/transactions'
import type { Transaction } from '@/domain/types'
import { makeTransaction } from '@/test/factories'
import { createTestRandom, daysInMonth, toDateString } from '@/test/propertyHelpers'

// RF-04 / CA-04.6 / RNF-02 — telas com 10.000 lançamentos respondem em < 300 ms. Mede o
// trabalho em memória da lista (ordenar, filtrar, agrupar, totalizar e paginar). O limite é
// folgado (a medição local fica bem abaixo) para o teste não ficar instável em máquinas lentas
// ou com a cobertura ligada.

const TRANSACTION_COUNT = 10_000
const TIME_LIMIT_MS = 300
const WORDS = ['Mercado', 'mercado do bairro', 'Padaria São João', 'Farmácia', 'Salário', 'Açougue']

function buildTransactions(): Transaction[] {
  const random = createTestRandom(2026)
  return Array.from({ length: TRANSACTION_COUNT }, (_, index) => {
    const year = random.int(2024, 2026)
    const month = random.int(1, 12)
    return makeTransaction({
      type: random.next() < 0.3 ? 'income' : 'expense',
      amountCents: random.int(1, 1_000_000),
      date: toDateString(year, month, random.int(1, daysInMonth(year, month))),
      description: `${WORDS[index % WORDS.length]} ${index}`,
      tagId: `tag-${random.int(1, 12)}`,
      createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
    })
  })
}

function measure<T>(run: () => T): { result: T; ms: number } {
  const start = performance.now()
  const result = run()
  return { result, ms: performance.now() - start }
}

describe('desempenho com 10.000 lançamentos (CA-04.6 / RNF-02)', () => {
  const transactions = buildTransactions()
  // O repositório entrega o índice `date` em ordem crescente e inverte o array.
  const ascending = transactions.toSorted((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  )

  it('ordenar a lista vinda do índice fica abaixo do limite', () => {
    const { result, ms } = measure(() => sortByRecency(ascending.toReversed()))
    expect(result).toHaveLength(TRANSACTION_COUNT)
    expect(ms).toBeLessThan(TIME_LIMIT_MS)
  })

  const sorted = sortByRecency(transactions)
  const cases: [string, TransactionFilters][] = [
    ['sem filtros', EMPTY_TRANSACTION_FILTERS],
    ['busca "merc"', { ...EMPTY_TRANSACTION_FILTERS, text: 'merc' }],
    [
      'todos os filtros',
      { text: 'merc', type: 'expense', tagId: 'tag-3', from: '2025-01-01', to: '2026-06-30' },
    ],
  ]

  for (const [label, filters] of cases) {
    it(`filtrar, agrupar, totalizar e paginar (${label}) fica abaixo do limite`, () => {
      const { result, ms } = measure(() => {
        const summary = summarizeTransactionList(sorted, filters)
        return { summary, visible: countVisibleDays(summary.days, 50) }
      })
      expect(result.summary.count).toBeGreaterThan(0)
      // A página inicial monta poucos itens, não milhares de nós.
      expect(result.visible.itemCount).toBeLessThan(100)
      expect(ms).toBeLessThan(TIME_LIMIT_MS)
    })
  }
})
