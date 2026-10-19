import { describe, expect, it } from 'vitest'
import {
  groupByDay,
  groupByMonth,
  groupByTag,
  overallBalance,
  runningBalance,
  totals,
} from '@/domain/balances'
import { monthRange, weekRange } from '@/domain/dates'
import { MAX_AMOUNT_CENTS } from '@/domain/money'
import { expense, income } from '@/test/factories'

describe('totals', () => {
  it('soma entradas, saídas e resultado', () => {
    const result = totals([
      income(500000, '2026-10-05'),
      expense(4590, '2026-10-06'),
      expense(12000, '2026-10-07'),
    ])
    expect(result).toEqual({ incomeCents: 500000, expenseCents: 16590, resultCents: 483410 })
  })

  it('lista vazia dá zero', () => {
    expect(totals([])).toEqual({ incomeCents: 0, expenseCents: 0, resultCents: 0 })
  })

  // §6.11 / RF-01 / D-31 — valores no teto (10 dígitos) somados sem perder precisão.
  it('soma valores no teto do RF-01 como inteiros', () => {
    const result = totals([
      income(MAX_AMOUNT_CENTS, '2026-10-01'),
      income(MAX_AMOUNT_CENTS, '2026-10-02'),
      expense(1, '2026-10-03'),
    ])
    expect(result).toEqual({
      incomeCents: 19_999_999_998,
      expenseCents: 1,
      resultCents: 19_999_999_997,
    })
    expect(Number.isSafeInteger(result.resultCents)).toBe(true)
  })

  it('não reaproveita o acumulador entre chamadas', () => {
    totals([income(100, '2026-10-01')])
    expect(totals([])).toEqual({ incomeCents: 0, expenseCents: 0, resultCents: 0 })
  })
})

describe('overallBalance', () => {
  // D-03 / CA-02.3 — lançamentos futuros não entram no saldo geral.
  it('ignora lançamentos com data depois de hoje', () => {
    const transactions = [
      income(100000, '2026-10-01'),
      expense(30000, '2026-10-19'), // hoje entra
      expense(50000, '2026-10-20'), // amanhã não entra
      expense(20000, '2026-11-19'), // parcela futura não entra
    ]
    expect(overallBalance(transactions, '2026-10-19')).toBe(70000)
  })

  it('pode ser negativo e é zero sem lançamentos', () => {
    expect(overallBalance([expense(4590, '2026-01-01')], '2026-10-19')).toBe(-4590)
    expect(overallBalance([], '2026-10-19')).toBe(0)
  })
})

describe('groupByDay / groupByMonth / groupByTag', () => {
  const transactions = [
    income(100000, '2026-10-01', 'salario'),
    expense(2000, '2026-10-01', 'mercado'),
    expense(1000, '2026-10-02', 'mercado'),
    expense(5000, '2026-11-15', 'lazer'),
  ]

  // CA-04.1 — totais de entrada e saída de cada dia.
  it('agrupa por dia com os totais e os lançamentos do dia', () => {
    const groups = groupByDay(transactions)
    expect([...groups.keys()]).toEqual(['2026-10-01', '2026-10-02', '2026-11-15'])
    const firstDay = groups.get('2026-10-01')
    expect(firstDay).toMatchObject({ incomeCents: 100000, expenseCents: 2000, resultCents: 98000 })
    expect(firstDay?.transactions).toEqual([transactions[0], transactions[1]])
  })

  it('agrupa por mês', () => {
    const groups = groupByMonth(transactions)
    expect([...groups.keys()]).toEqual(['2026-10', '2026-11'])
    expect(groups.get('2026-10')).toMatchObject({ incomeCents: 100000, expenseCents: 3000 })
    expect(groups.get('2026-11')?.resultCents).toBe(-5000)
  })

  // RF-06 — soma por tag para as pizzas.
  it('agrupa por tag', () => {
    const groups = groupByTag(transactions)
    expect(groups.get('mercado')).toMatchObject({ expenseCents: 3000, resultCents: -3000 })
    expect(groups.get('mercado')?.transactions).toHaveLength(2)
    expect(groups.get('salario')?.incomeCents).toBe(100000)
  })

  it('lista vazia dá mapa vazio', () => {
    expect(groupByDay([]).size).toBe(0)
  })
})

describe('runningBalance', () => {
  const days = (dates: string[]) => dates.map((date) => ({ start: date, end: date }))

  // RF-06 — saldo acumulado ao fim de cada subperíodo, com saldo inicial anterior.
  it('parte do saldo anterior ao período e acumula por subperíodo', () => {
    const transactions = [
      income(100000, '2026-09-30'), // antes do período: saldo inicial
      expense(1000, '2026-10-02'),
      income(500, '2026-10-03'),
      expense(2500, '2026-10-02'),
      expense(9999, '2026-10-05'), // depois do período: ignorado
    ]
    const buckets = days(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'])
    expect(runningBalance(transactions, buckets)).toEqual([100000, 96500, 97000, 97000])
  })

  it('aceita subperíodos de vários dias (semanas e meses)', () => {
    const buckets = [monthRange('2026-01'), monthRange('2026-02'), monthRange('2026-03')]
    const transactions = [
      expense(100, '2025-12-31'),
      income(1000, '2026-01-31'),
      income(1000, '2026-02-01'),
      expense(300, '2026-03-15'),
    ]
    expect(runningBalance(transactions, buckets)).toEqual([900, 1900, 1600])
    expect(runningBalance(transactions, [weekRange('2026-01-28')])).toEqual([1900])
  })

  it('sem subperíodos devolve lista vazia; sem lançamentos, zeros', () => {
    expect(runningBalance([income(100, '2026-10-01')], [])).toEqual([])
    expect(runningBalance([], days(['2026-10-01', '2026-10-02']))).toEqual([0, 0])
  })
})
