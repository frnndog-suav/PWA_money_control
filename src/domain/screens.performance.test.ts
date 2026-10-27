import { describe, expect, it } from 'vitest'
import { overallBalance, totals } from '@/domain/balances'
import { balanceSeries, incomeExpenseSeries, tagSlices } from '@/domain/charts'
import { monthRange, periodsBetween, weekRange } from '@/domain/dates'
import { buildInstallmentTransactions, MAX_INSTALLMENTS } from '@/domain/installments'
import { summarizeActiveDays, summarizeDays, summarizeMonths } from '@/domain/periodViews'
import { pendingOccurrences, projected } from '@/domain/recurring'
import { sortByRecency, takeMostRecent } from '@/domain/transactions'
import type { Transaction } from '@/domain/types'
import { buildLargeDataset, LARGE_TAG_COUNT, measure } from '@/test/largeDataset'

// RNF-02 — "telas com 10.000 lançamentos respondem em < 300 ms" (Fase 11). Mede o trabalho em
// memória que cada tela faz depois da leitura do banco, com os 10.000 lançamentos dentro do
// período mostrado (o pior caso). A lista já tem o seu teste (transactionFilters.performance).
// O limite é folgado de propósito: a medição local fica bem abaixo, e o teste não pode ficar
// instável numa máquina lenta ou com a cobertura ligada.

const TIME_LIMIT_MS = 300
const YEAR = 2026

const spreadOverYear = buildLargeDataset({ year: YEAR })
const singleMonth = buildLargeDataset({ year: YEAR, month: 10 })
const tagsById = new Map(
  Array.from({ length: LARGE_TAG_COUNT }, (_, index) => [
    `tag-${index + 1}`,
    { name: `Tag ${index + 1}`, color: '#16A34A' },
  ]),
)

/** O repositório entrega o período em ordem crescente de data e ordena por recência. */
function readPeriod(transactions: readonly Transaction[]): Transaction[] {
  return sortByRecency(transactions.toReversed())
}

describe('desempenho das telas com 10.000 lançamentos (RNF-02)', () => {
  it('Início: saldo geral, totais do mês, últimos lançamentos e pendências (RF-02)', () => {
    const { transactions, recurrings } = singleMonth
    const { result, ms } = measure(() => ({
      overall: overallBalance(transactions),
      month: totals(transactions),
      recent: takeMostRecent(transactions, 10),
      pending: pendingOccurrences(recurrings, transactions, `${YEAR}-10`),
    }))
    expect(result.recent).toHaveLength(10)
    expect(result.overall).toBe(result.month.resultCents)
    expect(ms).toBeLessThan(TIME_LIMIT_MS)
  })

  it('Visões — Ano: 12 meses com o Previsto de cada um (RF-05)', () => {
    const { transactions, recurrings } = spreadOverYear
    const { result, ms } = measure(() => {
      const sorted = readPeriod(transactions)
      const pendingByMonth = new Map(
        periodsBetween(`${YEAR}-01`, `${YEAR}-12`).map((period) => [
          period,
          pendingOccurrences(recurrings, sorted, period),
        ]),
      )
      return {
        summary: totals(sorted),
        months: summarizeMonths(sorted, YEAR).map((month) =>
          projected(month, pendingByMonth.get(month.period) ?? []),
        ),
      }
    })
    expect(result.months).toHaveLength(12)
    expect(ms).toBeLessThan(TIME_LIMIT_MS)
  })

  it('Visões — Mês: dias com movimento (RF-05)', () => {
    const { transactions } = singleMonth
    const { result, ms } = measure(() => {
      const sorted = readPeriod(transactions)
      return {
        summary: totals(sorted),
        days: summarizeActiveDays(sorted, monthRange(`${YEAR}-10`)),
      }
    })
    expect(result.days).toHaveLength(31)
    expect(ms).toBeLessThan(TIME_LIMIT_MS)
  })

  it('Visões — Semana: 7 dias (RF-05)', () => {
    const { transactions } = singleMonth
    const { result, ms } = measure(() => summarizeDays(transactions, weekRange(`${YEAR}-10-14`)))
    expect(result).toHaveLength(7)
    expect(ms).toBeLessThan(TIME_LIMIT_MS)
  })

  it.each([
    ['Ano', 'year', spreadOverYear.transactions, 12],
    ['Mês', 'month', singleMonth.transactions, 31],
  ] as const)('Gráficos — %s: roscas, barras e saldo (RF-06)', (_, granularity, data, points) => {
    const anchor = granularity === 'year' ? `${YEAR}-01-01` : `${YEAR}-10-01`
    const { result, ms } = measure(() => ({
      expenses: tagSlices(data, 'expense', tagsById),
      income: tagSlices(data, 'income', tagsById),
      bars: incomeExpenseSeries(data, granularity, anchor),
      periodTotals: totals(data),
      balance: balanceSeries(data, granularity, anchor),
    }))
    expect(result.expenses).toHaveLength(LARGE_TAG_COUNT)
    expect(result.bars).toHaveLength(points)
    expect(result.balance.at(-1)?.balanceCents).toBe(result.periodTotals.resultCents)
    expect(ms).toBeLessThan(TIME_LIMIT_MS)
  })

  it('Parcelamento: gerar 48 parcelas (RF-08)', () => {
    const { result, ms } = measure(() =>
      buildInstallmentTransactions({
        id: 'group-1',
        description: 'Notebook',
        tagId: 'tag-1',
        totalCents: 999_999_999,
        count: MAX_INSTALLMENTS,
        firstDate: `${YEAR}-01-31`,
      }),
    )
    expect(result).toHaveLength(MAX_INSTALLMENTS)
    expect(ms).toBeLessThan(TIME_LIMIT_MS)
  })
})
