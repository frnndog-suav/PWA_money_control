import type { Recurring, Transaction } from '@/domain/types'
import { makeRecurring, makeTransaction } from '@/test/factories'
import { createTestRandom, daysInMonth, toDateString } from '@/test/propertyHelpers'

// RNF-02 — volume dos testes de desempenho: "telas com 10.000 lançamentos respondem em < 300 ms".

export const LARGE_TRANSACTION_COUNT = 10_000
export const LARGE_TAG_COUNT = 12
export const LARGE_RECURRING_COUNT = 20

/** Ano em que os lançamentos caem e, opcionalmente, um único mês (o pior caso da visão Mês). */
interface LargeDatasetOptions {
  year: number
  /** 1–12; sem ele, as datas se espalham pelo ano inteiro. */
  month?: number
  seed?: number
}

export interface LargeDataset {
  transactions: Transaction[]
  recurrings: Recurring[]
}

/**
 * 10.000 lançamentos com semente fixa (as mesmas entradas a cada execução), 12 tags, ~30% de
 * entradas e confirmados de recorrentes (candidatos 1 a cada 50, um por recorrente e mês) — tudo concentrado no
 * período pedido, para cada tela receber o volume inteiro.
 */
export function buildLargeDataset({ year, month, seed = 2026 }: LargeDatasetOptions): LargeDataset {
  const random = createTestRandom(seed)
  const recurrings = Array.from({ length: LARGE_RECURRING_COUNT }, (_, index) =>
    makeRecurring({
      description: `Recorrente ${index}`,
      startPeriod: `${year}-01`,
      amounts: [{ fromPeriod: `${year}-01`, amountCents: 5000 }],
    }),
  )
  // CA-07.5 — no máximo um confirmado por recorrente e mês, como o índice único do banco.
  const confirmedKeys = new Set<string>()
  const transactions = Array.from({ length: LARGE_TRANSACTION_COUNT }, (_, index) => {
    const transactionMonth = month ?? random.int(1, 12)
    const day = random.int(1, daysInMonth(year, transactionMonth))
    const candidate =
      index % 50 === 0 ? recurrings[(index / 50) % LARGE_RECURRING_COUNT] : undefined
    const confirmedKey = candidate && `${candidate.id}|${transactionMonth}`
    const recurring = confirmedKey && !confirmedKeys.has(confirmedKey) ? candidate : null
    if (recurring && confirmedKey) confirmedKeys.add(confirmedKey)
    return makeTransaction({
      type: random.next() < 0.3 ? 'income' : 'expense',
      amountCents: random.int(1, 1_000_000),
      date: toDateString(year, transactionMonth, day),
      description: `Lançamento ${index}`,
      tagId: `tag-${random.int(1, LARGE_TAG_COUNT)}`,
      recurringId: recurring?.id ?? null,
      recurringPeriod: recurring ? `${year}-${String(transactionMonth).padStart(2, '0')}` : null,
      createdAt: new Date(Date.UTC(year, 0, 1, 0, 0, index)).toISOString(),
    })
  })
  return { transactions, recurrings }
}

/** Tempo de uma execução síncrona, em ms. */
export function measure<T>(run: () => T): { result: T; ms: number } {
  const start = performance.now()
  const result = run()
  return { result, ms: performance.now() - start }
}
