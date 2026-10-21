import { describe, expect, it } from 'vitest'
import {
  groupByDay,
  groupByMonth,
  groupByTag,
  overallBalance,
  runningBalance,
  totals,
} from '@/domain/balances'
import { addMonthsClamped, monthRange, periodOf, periodsBetween, weekRange } from '@/domain/dates'
import { MAX_AMOUNT_CENTS } from '@/domain/money'
import type { DateString, Transaction } from '@/domain/types'
import { expense, income, makeTransaction } from '@/test/factories'
import { createTestRandom, daysInMonth, toDateString } from '@/test/propertyHelpers'

// Reforço da auditoria da Fase 2 (§6.5 / §6.11 / D-42): saldos com casos-limite e
// propriedades verificadas com listas geradas por semente.

/** Lançamentos aleatórios (mas reproduzíveis) entre 2025 e 2027. */
function randomTransactions(seed: number, count: number, maxCents = 500_000): Transaction[] {
  const random = createTestRandom(seed)
  return Array.from({ length: count }, () => {
    const year = random.int(2025, 2027)
    const month = random.int(1, 12)
    const day = random.int(1, daysInMonth(year, month))
    return makeTransaction({
      type: random.next() < 0.4 ? 'income' : 'expense',
      amountCents: random.int(1, maxCents),
      date: toDateString(year, month, day),
      tagId: `tag-${random.int(1, 6)}`,
    })
  })
}

/** Soma "na mão", só com inteiros. */
function sumOf(transactions: readonly Transaction[], type: Transaction['type']): number {
  return transactions
    .filter((transaction) => transaction.type === type)
    .reduce((sum, transaction) => sum + transaction.amountCents, 0)
}

describe('propriedade: totals (§6.5)', () => {
  it('resultado = soma das entradas − soma das saídas, com inteiros seguros', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const transactions = randomTransactions(seed, seed * 7)
      const result = totals(transactions)
      const incomeCents = sumOf(transactions, 'income')
      const expenseCents = sumOf(transactions, 'expense')

      expect(result).toEqual({
        incomeCents,
        expenseCents,
        resultCents: incomeCents - expenseCents,
      })
      expect(Number.isSafeInteger(result.resultCents)).toBe(true)
    }
  })

  it('não depende da ordem dos lançamentos', () => {
    const transactions = randomTransactions(7, 200)
    expect(totals([...transactions].reverse())).toEqual(totals(transactions))
  })

  it('valores máximos do RF-01 em grande quantidade continuam exatos', () => {
    const transactions = Array.from({ length: 1000 }, (_, index) =>
      index % 2 === 0
        ? income(MAX_AMOUNT_CENTS, '2026-10-19')
        : expense(MAX_AMOUNT_CENTS - 1, '2026-10-19'),
    )
    expect(totals(transactions)).toEqual({
      incomeCents: 500 * MAX_AMOUNT_CENTS,
      expenseCents: 500 * (MAX_AMOUNT_CENTS - 1),
      resultCents: 500,
    })
  })

  // Princípio 1 / §6.5 — falha em vez de perder precisão quando passa do inteiro seguro.
  it('falha quando a soma deixa de ser um inteiro seguro', () => {
    const huge = Math.floor(Number.MAX_SAFE_INTEGER / 2) + 1
    expect(() => totals([income(huge, '2026-10-19'), income(huge, '2026-10-19')])).toThrow(
      RangeError,
    )
  })

  it('a soma dos grupos por dia, mês e tag é igual ao total', () => {
    const transactions = randomTransactions(42, 600)
    const total = totals(transactions)
    for (const groups of [
      groupByDay(transactions),
      groupByMonth(transactions),
      groupByTag(transactions),
    ]) {
      const values = [...groups.values()]
      expect(values.reduce((sum, group) => sum + group.incomeCents, 0)).toBe(total.incomeCents)
      expect(values.reduce((sum, group) => sum + group.expenseCents, 0)).toBe(total.expenseCents)
      expect(values.reduce((sum, group) => sum + group.transactions.length, 0)).toBe(
        transactions.length,
      )
      for (const group of values) {
        expect(group).toMatchObject(totals(group.transactions))
      }
    }
  })

  it('groupByMonth usa o mês YYYY-MM da data', () => {
    const groups = groupByMonth([expense(1, '2026-12-31'), expense(2, '2027-01-01')])
    expect([...groups.keys()]).toEqual(['2026-12', '2027-01'])
  })
})

describe('overallBalance — CA-02.3 / D-42', () => {
  /** Saldo do mês de `today` (RF-02 item 2): só os lançamentos do mês corrente. */
  function monthBalance(transactions: readonly Transaction[], today: DateString): number {
    const { start, end } = monthRange(periodOf(today))
    return totals(transactions.filter(({ date }) => date >= start && date <= end)).resultCents
  }

  // CA-02.3 / D-42 — matriz: o saldo geral soma tudo; o do mês, só o mês corrente.
  it.each([
    // [hoje, data do lançamento, entra no saldo do mês]
    ['2026-10-20', '2026-10-20', true], // hoje
    ['2026-10-20', '2026-10-21', true], // amanhã, no mesmo mês
    ['2026-10-20', '2026-11-01', false], // mês seguinte
    ['2026-10-20', '2026-09-30', false], // mês anterior
    ['2026-10-31', '2026-11-01', false], // amanhã, na virada do mês
    ['2026-12-31', '2027-01-01', false], // amanhã, na virada do ano
    ['2027-01-01', '2026-12-31', false], // ontem, no ano anterior
    ['2028-02-28', '2028-02-29', true], // amanhã, 29/02 de ano bissexto
  ] as const)(
    'hoje %s, lançamento em %s: saldo geral sempre; no mês = %s',
    (today, date, inMonth) => {
      const transactions = [income(100000, '2026-01-01'), expense(1234, date)]
      expect(overallBalance(transactions)).toBe(100000 - 1234)
      expect(monthBalance(transactions, today)).toBe(inMonth ? -1234 : 0)
    },
  )

  // CA-02.3 / D-42 — todas as parcelas entram no saldo geral desde a criação. Valores e datas
  // do CA-08.1 (R$ 100,00 em 3x a partir de 2026-10-31).
  it('todas as parcelas futuras entram no saldo geral desde a criação (CA-08.1)', () => {
    const installments = [3334, 3333, 3333].map((cents, k) =>
      expense(cents, addMonthsClamped('2026-10-31', k)),
    )
    expect(installments.map((item) => item.date)).toEqual([
      '2026-10-31',
      '2026-11-30',
      '2026-12-31',
    ])
    expect(overallBalance(installments)).toBe(-10000)
    expect(monthBalance(installments, '2026-10-20')).toBe(-3334)
    expect(monthBalance(installments, '2026-11-15')).toBe(-3333)
  })

  it('propriedade: é o resultado de totals de todos os lançamentos', () => {
    for (let seed = 100; seed < 130; seed++) {
      const transactions = randomTransactions(seed, 150)
      expect(overallBalance(transactions)).toBe(totals(transactions).resultCents)
    }
  })

  it('não depende da ordem dos lançamentos', () => {
    const transactions = randomTransactions(11, 200)
    expect(overallBalance([...transactions].reverse())).toBe(overallBalance(transactions))
  })
})

describe('runningBalance — saldo inicial e subperíodos vazios (§6.5 / RF-06)', () => {
  it('saldo inicial anterior ao período e subperíodos vazios repetem o saldo', () => {
    const buckets = [
      weekRange('2026-12-14'), // 14–20/12: vazia
      weekRange('2026-12-21'), // 21–27/12
      weekRange('2026-12-28'), // 28/12–03/01: atravessa o ano
      weekRange('2027-01-04'), // 04–10/01: vazia
      weekRange('2027-01-11'), // 11–17/01
    ]
    const transactions = [
      income(10000, '2025-06-01'), // saldo inicial
      expense(2500, '2026-12-13'), // saldo inicial (domingo antes da 1ª semana)
      expense(1000, '2026-12-21'), // primeiro dia da 2ª semana
      income(300, '2027-01-03'), // último dia da 3ª semana (outro ano)
      expense(50, '2027-01-11'),
      income(99999, '2027-01-18'), // depois do período: ignorado
    ]
    expect(runningBalance(transactions, buckets)).toEqual([7500, 6500, 6800, 6800, 6750])
  })

  it('só saldo inicial: todos os subperíodos ficam iguais a ele', () => {
    const buckets = periodsBetween('2026-01', '2026-03').map(monthRange)
    expect(runningBalance([expense(4590, '2025-12-31')], buckets)).toEqual([-4590, -4590, -4590])
  })

  it('não depende da ordem dos lançamentos', () => {
    const transactions = randomTransactions(9, 300)
    const buckets = periodsBetween('2026-01', '2026-12').map(monthRange)
    expect(runningBalance([...transactions].reverse(), buckets)).toEqual(
      runningBalance(transactions, buckets),
    )
  })

  // Propriedade: o saldo ao fim de cada subperíodo é a soma de tudo com data até o fim dele.
  it('propriedade: cada valor é o overallBalance dos lançamentos até o fim do subperíodo', () => {
    for (let seed = 200; seed < 215; seed++) {
      const transactions = randomTransactions(seed, 250)
      const buckets = periodsBetween('2026-01', '2026-12').map(monthRange)
      const running = runningBalance(transactions, buckets)
      expect(running).toEqual(
        buckets.map((bucket) =>
          overallBalance(transactions.filter((transaction) => transaction.date <= bucket.end)),
        ),
      )
    }
  })
})
