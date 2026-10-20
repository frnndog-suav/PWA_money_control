import { describe, expect, it } from 'vitest'
import { db } from '@/db/database'
import { overallBalance, totals } from '@/domain/balances'
import { monthRange, periodOf } from '@/domain/dates'
import { MAX_AMOUNT_CENTS } from '@/domain/money'
import type { Transaction } from '@/domain/types'
import {
  getMonthTotals,
  getOverallBalance,
  listRecentTransactions,
} from '@/repositories/transactionsRepository'
import { expense, income, makeTransaction } from '@/test/factories'
import { createTestRandom, daysInMonth, toDateString } from '@/test/propertyHelpers'

// RF-02 itens 1, 2 e 5 / D-03 / CA-02.3 / D-39 — consultas de saldo e "Últimos lançamentos"
// sobre o fake-indexeddb, sempre com "hoje" injetado (nada depende do relógio da máquina).

async function seed(transactions: Transaction[]): Promise<void> {
  await db.transactions.bulkAdd(transactions)
}

async function reset(): Promise<void> {
  await db.transactions.clear()
}

describe('D-03 / CA-02.3 — onde cada data entra (hoje = 2026-10-20)', () => {
  const TODAY = '2026-10-20'
  const PERIOD = periodOf(TODAY)

  it.each([
    // [descrição, data, entra no geral, entra no mês corrente]
    ['hoje', '2026-10-20', true, true],
    ['amanhã', '2026-10-21', false, true],
    ['último dia do mês (futuro)', '2026-10-31', false, true],
    ['1º dia do mês seguinte', '2026-11-01', false, false],
    ['mês seguinte', '2026-11-15', false, false],
    ['ontem', '2026-10-19', true, true],
    ['1º dia do mês', '2026-10-01', true, true],
    ['último dia do mês anterior', '2026-09-30', true, false],
    ['mês anterior', '2026-09-15', true, false],
    ['ano anterior', '2025-10-20', true, false],
  ])('%s (%s): geral=%s, mês=%s', async (_label, date, inOverall, inMonth) => {
    await seed([income(1234, date)])
    expect(await getOverallBalance(TODAY)).toBe(inOverall ? 1234 : 0)
    expect(await getMonthTotals(PERIOD)).toEqual(
      inMonth
        ? { incomeCents: 1234, expenseCents: 0, resultCents: 1234 }
        : { incomeCents: 0, expenseCents: 0, resultCents: 0 },
    )
  })

  it('saídas seguem a mesma regra, com sinal negativo', async () => {
    await seed([
      expense(100, '2026-10-20'),
      expense(200, '2026-10-21'),
      expense(400, '2026-11-01'),
      expense(800, '2026-09-30'),
    ])
    expect(await getOverallBalance(TODAY)).toBe(-900)
    expect(await getMonthTotals(PERIOD)).toEqual({
      incomeCents: 0,
      expenseCents: 300,
      resultCents: -300,
    })
  })

  // Roteiro da Fase 4, passos 2 e 3.
  it('roteiro: +1.000,00 e −250,00 hoje; −80,00 amanhã muda só o mês', async () => {
    await seed([income(100000, TODAY), expense(25000, TODAY)])
    expect(await getOverallBalance(TODAY)).toBe(75000)
    expect((await getMonthTotals(PERIOD)).resultCents).toBe(75000)

    await seed([expense(8000, '2026-10-21')])
    expect(await getOverallBalance(TODAY)).toBe(75000)
    expect((await getMonthTotals(PERIOD)).resultCents).toBe(67000)
  })
})

describe('virada de mês e de ano (31/12 → 01/01)', () => {
  it('hoje = 2026-12-31: 01/01 fica fora do geral e do mês de dezembro', async () => {
    await seed([income(500, '2026-12-31'), expense(200, '2027-01-01')])
    expect(await getOverallBalance('2026-12-31')).toBe(500)
    expect(await getMonthTotals('2026-12')).toEqual({
      incomeCents: 500,
      expenseCents: 0,
      resultCents: 500,
    })
    expect(await getMonthTotals('2027-01')).toEqual({
      incomeCents: 0,
      expenseCents: 200,
      resultCents: -200,
    })
  })

  it('hoje = 2027-01-01: os dois entram no geral; 31/12 não entra no mês de janeiro', async () => {
    await seed([income(500, '2026-12-31'), expense(200, '2027-01-01')])
    expect(await getOverallBalance('2027-01-01')).toBe(300)
    expect((await getMonthTotals('2027-01')).resultCents).toBe(-200)
  })

  it('fim de mês comum (31/10 → 01/11) e fevereiro bissexto', async () => {
    await seed([
      income(1, '2026-10-31'),
      income(2, '2026-11-01'),
      income(4, '2028-02-29'),
      income(8, '2028-03-01'),
    ])
    expect(await getOverallBalance('2026-10-31')).toBe(1)
    expect((await getMonthTotals('2026-10')).resultCents).toBe(1)
    expect((await getMonthTotals('2026-11')).resultCents).toBe(2)
    expect((await getMonthTotals('2028-02')).resultCents).toBe(4)
    expect(await getOverallBalance('2028-02-29')).toBe(7)
  })
})

describe('valores no teto (RF-01 / princípio 1)', () => {
  it('50 entradas de MAX_AMOUNT_CENTS somam como inteiro seguro e exato', async () => {
    await seed(Array.from({ length: 50 }, () => income(MAX_AMOUNT_CENTS, '2026-10-20')))
    const overall = await getOverallBalance('2026-10-20')
    expect(overall).toBe(499_999_999_950)
    expect(Number.isSafeInteger(overall)).toBe(true)
    expect(await getMonthTotals('2026-10')).toEqual({
      incomeCents: 499_999_999_950,
      expenseCents: 0,
      resultCents: 499_999_999_950,
    })
  })

  it('entradas e saídas no teto se anulam sem erro de arredondamento', async () => {
    await seed([
      ...Array.from({ length: 30 }, () => income(MAX_AMOUNT_CENTS, '2026-10-01')),
      ...Array.from({ length: 29 }, () => expense(MAX_AMOUNT_CENTS, '2026-10-02')),
      expense(1, '2026-10-03'),
    ])
    expect(await getOverallBalance('2026-10-20')).toBe(MAX_AMOUNT_CENTS - 1)
    const month = await getMonthTotals('2026-10')
    expect(month.resultCents).toBe(MAX_AMOUNT_CENTS - 1)
    expect(Number.isSafeInteger(month.incomeCents)).toBe(true)
    expect(Number.isSafeInteger(month.expenseCents)).toBe(true)
  })
})

// Lançamentos espalhados entre 2025 e 2027, com tipos, valores e criações aleatórios.
function randomTransactions(seedValue: number, count: number): Transaction[] {
  const random = createTestRandom(seedValue)
  return Array.from({ length: count }, (_, index) => {
    const year = random.int(2025, 2027)
    const month = random.int(1, 12)
    const day = random.int(1, daysInMonth(year, month))
    // Poucos instantes distintos, para forçar empates de data e de criação.
    const minute = random.int(0, 3)
    return makeTransaction({
      id: `t-${seedValue}-${String(index).padStart(4, '0')}`,
      type: random.next() < 0.5 ? 'income' : 'expense',
      amountCents: random.next() < 0.05 ? MAX_AMOUNT_CENTS : random.int(1, 500_000),
      date: toDateString(year, month, day),
      createdAt: `2026-10-20T12:0${minute}:00.000Z`,
    })
  })
}

const SEEDS = [1, 7, 42, 2026, 31337, 99991]

describe('propriedade: repositório = domínio puro (D-39 / princípio 6)', () => {
  it.each(SEEDS)('semente %i: getOverallBalance e getMonthTotals', async (seedValue) => {
    const list = randomTransactions(seedValue, 300)
    await seed(list)
    const random = createTestRandom(seedValue * 3 + 1)
    for (let i = 0; i < 8; i++) {
      const year = random.int(2025, 2027)
      const month = random.int(1, 12)
      const todayDate = toDateString(year, month, random.int(1, daysInMonth(year, month)))
      const period = periodOf(todayDate)
      const { start, end } = monthRange(period)

      expect(await getOverallBalance(todayDate)).toBe(overallBalance(list, todayDate))
      expect(await getMonthTotals(period)).toEqual(
        totals(list.filter((t) => t.date >= start && t.date <= end)),
      )
    }
    await reset()
  })
})

// Referência independente do domínio: só a regra do RF-02 item 5 (data, depois criação).
function byDateThenCreation(a: Transaction, b: Transaction): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1
  return 0
}

const recencyKey = (t: Transaction) => `${t.date}|${t.createdAt}`

describe('últimos 5 (RF-02 item 5 / D-38(e) / D-39)', () => {
  const at = (minute: number) => `2026-10-20T12:${String(minute).padStart(2, '0')}:00.000Z`

  it('7 lançamentos na mesma data do corte, abaixo de 2 de datas mais novas', async () => {
    await seed([
      makeTransaction({ description: 'n2', date: '2026-10-15', createdAt: at(0) }),
      makeTransaction({ description: 'n1', date: '2026-10-14', createdAt: at(59) }),
      ...[3, 6, 0, 5, 1, 4, 2].map((minute) =>
        makeTransaction({ description: `c${minute}`, date: '2026-10-10', createdAt: at(minute) }),
      ),
      makeTransaction({ description: 'velho', date: '2026-10-09', createdAt: at(59) }),
    ])
    const recent = await listRecentTransactions(5)
    expect(recent.map((t) => t.description)).toEqual(['n2', 'n1', 'c6', 'c5', 'c4'])
  })

  it('a data vale mais que a criação, também no corte', async () => {
    await seed([
      makeTransaction({ description: 'velho-recente', date: '2026-10-01', createdAt: at(59) }),
      ...[0, 1, 2, 3, 4].map((minute) =>
        makeTransaction({ description: `d${minute}`, date: '2026-10-02', createdAt: at(minute) }),
      ),
    ])
    const recent = await listRecentTransactions(5)
    expect(recent.map((t) => t.description)).toEqual(['d4', 'd3', 'd2', 'd1', 'd0'])
  })

  it('exatamente 5 lançamentos → todos, em ordem', async () => {
    await seed(
      ['2026-10-03', '2026-10-01', '2026-10-05', '2026-10-02', '2026-10-04'].map((date) =>
        makeTransaction({ description: date, date }),
      ),
    )
    expect((await listRecentTransactions(5)).map((t) => t.description)).toEqual([
      '2026-10-05',
      '2026-10-04',
      '2026-10-03',
      '2026-10-02',
      '2026-10-01',
    ])
  })

  it('nenhum lançamento → lista vazia', async () => {
    expect(await listRecentTransactions(5)).toEqual([])
  })

  it('um único lançamento → ele mesmo', async () => {
    const only = makeTransaction({ date: '2026-10-20' })
    await seed([only])
    expect(await listRecentTransactions(5)).toEqual([only])
  })

  // D-38(e) — ordem literal do RF-02: datas futuras ficam no topo.
  it('datas futuras aparecem no topo', async () => {
    await seed([
      makeTransaction({ description: 'hoje', date: '2026-10-20', createdAt: at(30) }),
      makeTransaction({ description: 'ano-que-vem', date: '2027-01-01', createdAt: at(0) }),
      makeTransaction({ description: 'amanhã', date: '2026-10-21', createdAt: at(1) }),
      makeTransaction({ description: 'ontem', date: '2026-10-19', createdAt: at(59) }),
    ])
    expect((await listRecentTransactions(5)).map((t) => t.description)).toEqual([
      'ano-que-vem',
      'amanhã',
      'hoje',
      'ontem',
    ])
  })

  it.each(SEEDS)('propriedade, semente %i: igual a ordenar tudo e pegar 5', async (seedValue) => {
    for (const count of [0, 1, 4, 5, 6, 40, 300]) {
      const list = randomTransactions(seedValue + count, count)
      await seed(list)
      const recent = await listRecentTransactions(5)
      const expected = list.toSorted(byDateThenCreation).slice(0, 5)
      // Empates totais de data e criação podem vir em qualquer ordem: compara as chaves da regra.
      expect(recent.map(recencyKey)).toEqual(expected.map(recencyKey))
      expect(recent).toHaveLength(Math.min(5, count))
      // Cada item devolvido é um lançamento gravado, sem repetição.
      expect(new Set(recent.map((t) => t.id)).size).toBe(recent.length)
      for (const t of recent) expect(list).toContainEqual(t)
      await reset()
    }
  })
})
