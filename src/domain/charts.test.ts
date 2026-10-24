import { describe, expect, it } from 'vitest'
import {
  balanceSeries,
  chartBuckets,
  distributeTenths,
  formatTenthsPercent,
  incomeExpenseSeries,
  isBalanceGranularity,
  isChartGranularity,
  tagSlices,
} from '@/domain/charts'
import { MAX_AMOUNT_CENTS } from '@/domain/money'
import { expense, income, makeTransaction } from '@/test/factories'

// RF-06 / Fase 8 — dados dos gráficos.

describe('isChartGranularity / isBalanceGranularity (RF-06 / D-50)', () => {
  it('gráficos só em Semana, Mês e Ano; linha só em Mês e Ano', () => {
    expect(isChartGranularity('day')).toBe(false)
    expect(isChartGranularity('week')).toBe(true)
    expect(isChartGranularity('month')).toBe(true)
    expect(isChartGranularity('year')).toBe(true)
    expect(isBalanceGranularity('week')).toBe(false)
    expect(isBalanceGranularity('month')).toBe(true)
    expect(isBalanceGranularity('year')).toBe(true)
  })
})

describe('chartBuckets (RF-06)', () => {
  it('Semana: 7 dias de segunda a domingo, rótulo curto com o dia da semana', () => {
    const buckets = chartBuckets('week', '2026-12-31')
    expect(buckets.map((bucket) => bucket.tickLabel)).toEqual([
      'seg. 28',
      'ter. 29',
      'qua. 30',
      'qui. 31',
      'sex. 1',
      'sáb. 2',
      'dom. 3',
    ])
    expect(buckets[4]).toEqual({
      start: '2027-01-01',
      end: '2027-01-01',
      tickLabel: 'sex. 1',
      label: '1 de jan.',
    })
  })

  it('Mês: todos os dias do mês, inclusive em ano bissexto', () => {
    expect(chartBuckets('month', '2026-10-24')).toHaveLength(31)
    expect(chartBuckets('month', '2026-02-10')).toHaveLength(28)
    const leap = chartBuckets('month', '2028-02-10')
    expect(leap).toHaveLength(29)
    expect(leap[0]).toEqual({
      start: '2028-02-01',
      end: '2028-02-01',
      tickLabel: '1',
      label: '1 de fev.',
    })
    expect(leap[28].label).toBe('29 de fev.')
  })

  it('Ano: 12 meses com o intervalo de cada um', () => {
    const buckets = chartBuckets('year', '2026-10-24')
    expect(buckets.map((bucket) => bucket.tickLabel)).toEqual([
      'jan.',
      'fev.',
      'mar.',
      'abr.',
      'mai.',
      'jun.',
      'jul.',
      'ago.',
      'set.',
      'out.',
      'nov.',
      'dez.',
    ])
    expect(buckets[1]).toEqual({
      start: '2026-02-01',
      end: '2026-02-28',
      tickLabel: 'fev.',
      label: 'fevereiro de 2026',
    })
  })
})

describe('incomeExpenseSeries — barras (CA-06.4 / CA-05.1)', () => {
  it('Mês: totais de cada dia, zero nos dias sem movimento, nada de fora do mês', () => {
    const series = incomeExpenseSeries(
      [
        income(120000, '2026-10-15'),
        expense(35000, '2026-10-15'),
        expense(1000, '2026-10-31'),
        expense(9999, '2026-11-01'),
      ],
      'month',
      '2026-10-01',
    )
    expect(series).toHaveLength(31)
    expect(series[14]).toMatchObject({
      label: '15 de out.',
      incomeCents: 120000,
      expenseCents: 35000,
      resultCents: 85000,
    })
    expect(series[0]).toMatchObject({ incomeCents: 0, expenseCents: 0, resultCents: 0 })
    expect(series[30]).toMatchObject({ expenseCents: 1000, resultCents: -1000 })
    expect(series.reduce((sum, point) => sum + point.expenseCents, 0)).toBe(36000)
  })

  it('Semana atravessando o ano', () => {
    const series = incomeExpenseSeries(
      [expense(500, '2026-12-28'), income(700, '2027-01-03'), income(1, '2027-01-04')],
      'week',
      '2027-01-01',
    )
    expect(series.map((point) => point.resultCents)).toEqual([-500, 0, 0, 0, 0, 0, 700])
  })

  it('Ano: totais por mês', () => {
    const series = incomeExpenseSeries(
      [income(300000, '2026-01-05'), expense(4500, '2026-12-31'), expense(1, '2027-01-01')],
      'year',
      '2026-06-15',
    )
    expect(series).toHaveLength(12)
    expect(series[0]).toMatchObject({ label: 'janeiro de 2026', incomeCents: 300000 })
    expect(series[11]).toMatchObject({ label: 'dezembro de 2026', expenseCents: 4500 })
  })
})

describe('balanceSeries — evolução do saldo (CA-06.5)', () => {
  it('Mês: parte do saldo anterior ao período e acumula dia a dia', () => {
    const series = balanceSeries(
      [
        income(100000, '2026-09-30'), // saldo inicial
        expense(20000, '2026-10-01'),
        income(5000, '2026-10-15'),
        expense(1000, '2026-10-31'), // data futura do mês corrente: já entra
        expense(99999, '2026-11-01'), // depois do período: fora
      ],
      'month',
      '2026-10-24',
    )
    expect(series).toHaveLength(31)
    expect(series[0]).toMatchObject({ label: '1 de out.', balanceCents: 80000 })
    expect(series[13].balanceCents).toBe(80000)
    expect(series[14].balanceCents).toBe(85000)
    expect(series[30].balanceCents).toBe(84000)
  })

  it('Ano: saldo ao fim de cada mês', () => {
    const series = balanceSeries(
      [income(1000, '2025-12-31'), expense(300, '2026-03-10'), income(50, '2026-12-31')],
      'year',
      '2026-01-01',
    )
    expect(series.map((point) => point.balanceCents)).toEqual([
      1000, 1000, 700, 700, 700, 700, 700, 700, 700, 700, 700, 750,
    ])
  })

  it('sem lançamentos → saldo zero em todos os pontos', () => {
    expect(balanceSeries([], 'year', '2026-01-01').every((p) => p.balanceCents === 0)).toBe(true)
  })
})

describe('distributeTenths — percentuais que somam 100% (Fase 8)', () => {
  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)

  it('três partes iguais: o décimo que sobra vai para a primeira', () => {
    expect(distributeTenths([1, 1, 1])).toEqual([334, 333, 333])
  })

  it('o décimo que sobra vai para o maior resto, não para o maior valor', () => {
    // 1/3 = 333,3…; 2/3 = 666,6… → o resto maior é o da segunda.
    expect(distributeTenths([100, 200])).toEqual([333, 667])
  })

  it('exemplo do CA-06.3: 41,2%', () => {
    expect(distributeTenths([123050, 175620])).toEqual([412, 588])
  })

  it('uma única tag → 100,0%; total zero → tudo zero; lista vazia', () => {
    expect(distributeTenths([5000])).toEqual([1000])
    expect(distributeTenths([0, 0])).toEqual([0, 0])
    expect(distributeTenths([])).toEqual([])
  })

  it('fatias muito pequenas podem ficar em 0,0%, mas a soma continua 100,0%', () => {
    const tenths = distributeTenths([1_000_000, 1, 1])
    expect(tenths).toEqual([1000, 0, 0])
    expect(sum(tenths)).toBe(1000)
  })

  it('soma sempre 1000, inclusive com valores no teto do RF-01 (sem perder precisão)', () => {
    const values = [MAX_AMOUNT_CENTS, MAX_AMOUNT_CENTS - 1, 7, 13, 1999, 123456789]
    const tenths = distributeTenths(values)
    expect(sum(tenths)).toBe(1000)
    expect(tenths.every(Number.isSafeInteger)).toBe(true)
  })

  it('soma sempre 1000 para muitas combinações', () => {
    for (let count = 1; count <= 12; count++) {
      for (let seed = 1; seed <= 25; seed++) {
        const values = Array.from(
          { length: count },
          (_, index) => ((index + 1) * seed * 7919) % 9973,
        )
        if (values.every((value) => value === 0)) continue
        expect(sum(distributeTenths(values))).toBe(1000)
      }
    }
  })
})

describe('tagSlices — pizzas por tag (CA-06.3)', () => {
  const tags = new Map([
    ['market', { name: 'Mercado', color: '#16A34A' }],
    ['health', { name: 'Saúde', color: '#DC2626' }],
    ['salary', { name: 'Salário', color: '#2563EB' }],
    ['bar', { name: 'Bar', color: '#000000' }],
  ])

  it('soma só o tipo pedido, por tag, do maior para o menor, com a cor da tag', () => {
    const transactions = [
      makeTransaction({ type: 'expense', amountCents: 100000, tagId: 'market' }),
      makeTransaction({ type: 'expense', amountCents: 23050, tagId: 'market' }),
      makeTransaction({ type: 'expense', amountCents: 175620, tagId: 'health' }),
      makeTransaction({ type: 'income', amountCents: 500000, tagId: 'salary' }),
    ]
    expect(tagSlices(transactions, 'expense', tags)).toEqual([
      { tagId: 'health', name: 'Saúde', color: '#DC2626', cents: 175620, tenths: 588 },
      { tagId: 'market', name: 'Mercado', color: '#16A34A', cents: 123050, tenths: 412 },
    ])
    expect(tagSlices(transactions, 'income', tags)).toEqual([
      { tagId: 'salary', name: 'Salário', color: '#2563EB', cents: 500000, tenths: 1000 },
    ])
  })

  it('empate de valor: ordem alfabética do nome (sem diferenciar acento)', () => {
    const transactions = [
      makeTransaction({ amountCents: 500, tagId: 'market' }),
      makeTransaction({ amountCents: 500, tagId: 'bar' }),
    ]
    expect(tagSlices(transactions, 'expense', tags).map((slice) => slice.name)).toEqual([
      'Bar',
      'Mercado',
    ])
  })

  it('sem lançamentos do tipo → lista vazia', () => {
    expect(tagSlices([income(100, '2026-10-01')], 'expense', tags)).toEqual([])
  })

  it('tag ainda não carregada aparece com nome e cor neutros, sem perder o valor', () => {
    const [slice] = tagSlices([expense(100, '2026-10-01', 'unknown')], 'expense', new Map())
    expect(slice).toEqual({
      tagId: 'unknown',
      name: '—',
      color: '#94A3B8',
      cents: 100,
      tenths: 1000,
    })
  })
})

describe('formatTenthsPercent', () => {
  it('uma casa decimal com vírgula', () => {
    expect(formatTenthsPercent(412)).toBe('41,2%')
    expect(formatTenthsPercent(1000)).toBe('100,0%')
    expect(formatTenthsPercent(5)).toBe('0,5%')
    expect(formatTenthsPercent(0)).toBe('0,0%')
  })

  it('recusa valores inválidos', () => {
    expect(() => formatTenthsPercent(-1)).toThrow(RangeError)
    expect(() => formatTenthsPercent(1.5)).toThrow(RangeError)
  })
})
