import { describe, expect, it } from 'vitest'
import {
  formatViewTitle,
  shiftAnchorDate,
  summarizeActiveDays,
  summarizeDays,
  summarizeMonths,
  viewRange,
  type ViewGranularity,
} from '@/domain/periodViews'
import { expense, income } from '@/test/factories'

// RF-05 / Fase 7 — visões por período.

const ZERO = { incomeCents: 0, expenseCents: 0, resultCents: 0 }

describe('viewRange (RF-05)', () => {
  it.each<[ViewGranularity, string, string, string]>([
    ['day', '2026-10-24', '2026-10-24', '2026-10-24'],
    ['week', '2026-10-24', '2026-10-19', '2026-10-25'], // CA-05.3: segunda a domingo
    ['week', '2027-01-01', '2026-12-28', '2027-01-03'],
    ['month', '2026-10-24', '2026-10-01', '2026-10-31'],
    ['month', '2028-02-10', '2028-02-01', '2028-02-29'],
    ['year', '2026-10-24', '2026-01-01', '2026-12-31'],
  ])('%s de %s → %s a %s', (granularity, anchor, start, end) => {
    expect(viewRange(granularity, anchor)).toEqual({ start, end })
  })

  it('recusa data de referência inválida', () => {
    for (const granularity of ['day', 'week', 'month', 'year'] as const) {
      expect(() => viewRange(granularity, '2026-02-30')).toThrow(RangeError)
    }
  })
})

describe('shiftAnchorDate — setas e virada de mês/ano (RF-05)', () => {
  it.each<[ViewGranularity, string, number, string]>([
    ['day', '2026-12-31', 1, '2027-01-01'],
    ['day', '2027-01-01', -1, '2026-12-31'],
    ['day', '2026-10-31', 1, '2026-11-01'],
    ['week', '2026-12-28', 1, '2027-01-04'],
    ['week', '2027-01-04', -1, '2026-12-28'],
    ['week', '2026-10-24', 1, '2026-10-31'],
    ['month', '2026-12-15', 1, '2027-01-15'], // dezembro → janeiro
    ['month', '2027-01-15', -1, '2026-12-15'], // janeiro → dezembro
    ['month', '2026-01-31', 1, '2026-02-28'], // dia que não existe no destino
    ['month', '2028-01-31', 1, '2028-02-29'], // ano bissexto
    ['year', '2026-10-24', 1, '2027-10-24'],
    ['year', '2028-02-29', 1, '2029-02-28'],
    ['year', '2026-10-24', -1, '2025-10-24'],
  ])('%s: %s %+d → %s', (granularity, anchor, steps, expected) => {
    expect(shiftAnchorDate(granularity, anchor, steps)).toBe(expected)
  })

  it('dez toques em "próximo mês" a partir de outubro chegam a agosto do ano seguinte', () => {
    let anchor = '2026-10-01'
    const months: string[] = []
    for (let step = 0; step < 10; step++) {
      anchor = shiftAnchorDate('month', anchor, 1)
      months.push(anchor.slice(0, 7))
    }
    expect(months).toEqual([
      '2026-11',
      '2026-12',
      '2027-01',
      '2027-02',
      '2027-03',
      '2027-04',
      '2027-05',
      '2027-06',
      '2027-07',
      '2027-08',
    ])
  })

  it('a semana seguinte é sempre a próxima de segunda a domingo, mesmo atravessando o ano', () => {
    let anchor = '2026-12-16'
    const starts: string[] = []
    for (let step = 0; step < 4; step++) {
      anchor = shiftAnchorDate('week', anchor, 1)
      starts.push(viewRange('week', anchor).start)
    }
    expect(starts).toEqual(['2026-12-21', '2026-12-28', '2027-01-04', '2027-01-11'])
  })
})

describe('formatViewTitle (RF-05 / CA-05.3)', () => {
  it.each<[ViewGranularity, string, string]>([
    ['day', '2026-10-24', 'sábado, 24 de outubro de 2026'],
    ['week', '2026-10-15', '12 a 18 de out. de 2026'],
    ['week', '2026-12-31', '28 de dez. de 2026 a 3 de jan. de 2027'],
    ['month', '2026-10-24', 'outubro de 2026'],
    ['year', '2026-10-24', '2026'],
  ])('%s de %s → "%s"', (granularity, anchor, expected) => {
    expect(formatViewTitle(granularity, anchor)).toBe(expected)
  })
})

describe('summarizeDays — visão Semana (RF-05 / CA-05.1)', () => {
  const week = viewRange('week', '2026-10-21') // 19 a 25/10

  it('7 linhas de segunda a domingo, com zero nos dias sem movimento', () => {
    const transactions = [
      income(100000, '2026-10-19'),
      expense(2500, '2026-10-19'),
      expense(1550, '2026-10-25'),
      expense(9900, '2026-10-26'), // segunda seguinte: fora da semana (CA-05.1)
      income(5000, '2026-10-18'), // domingo anterior: fora da semana
    ]
    const days = summarizeDays(transactions, week)
    expect(days.map((day) => day.date)).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
    ])
    expect(days[0]).toEqual({
      date: '2026-10-19',
      incomeCents: 100000,
      expenseCents: 2500,
      resultCents: 97500,
    })
    expect(days[1]).toEqual({ date: '2026-10-20', ...ZERO })
    expect(days[6]).toEqual({
      date: '2026-10-25',
      incomeCents: 0,
      expenseCents: 1550,
      resultCents: -1550,
    })
  })

  it('não expõe a lista de lançamentos de cada dia, só os totais', () => {
    const [day] = summarizeDays([income(100, '2026-10-19')], week)
    expect(Object.keys(day).sort()).toEqual(['date', 'expenseCents', 'incomeCents', 'resultCents'])
  })
})

describe('summarizeActiveDays — visão Mês (RF-05 / CA-05.1)', () => {
  const october = viewRange('month', '2026-10-01')

  it('só os dias com movimento, em ordem cronológica', () => {
    const transactions = [
      expense(1000, '2026-10-20'),
      income(50000, '2026-10-05'),
      expense(300, '2026-10-20'),
      expense(700, '2026-10-31'),
      expense(9900, '2026-11-01'), // fora do mês (CA-05.1)
      income(100, '2026-09-30'),
    ]
    expect(summarizeActiveDays(transactions, october)).toEqual([
      { date: '2026-10-05', incomeCents: 50000, expenseCents: 0, resultCents: 50000 },
      { date: '2026-10-20', incomeCents: 0, expenseCents: 1300, resultCents: -1300 },
      { date: '2026-10-31', incomeCents: 0, expenseCents: 700, resultCents: -700 },
    ])
  })

  it('mês sem movimento → lista vazia', () => {
    expect(summarizeActiveDays([], october)).toEqual([])
    expect(summarizeActiveDays([expense(100, '2026-11-01')], october)).toEqual([])
  })
})

describe('summarizeMonths — visão Ano (RF-05 / CA-05.1)', () => {
  it('12 linhas de janeiro a dezembro, com zero nos meses sem movimento', () => {
    const transactions = [
      income(300000, '2026-01-05'),
      expense(10000, '2026-01-31'),
      expense(4500, '2026-12-31'),
      expense(9999, '2027-01-01'), // ano seguinte: fora (CA-05.1)
      income(1, '2025-12-31'),
    ]
    const months = summarizeMonths(transactions, 2026)
    expect(months.map((month) => month.period)).toEqual([
      '2026-01',
      '2026-02',
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
      '2026-11',
      '2026-12',
    ])
    expect(months[0]).toEqual({
      period: '2026-01',
      incomeCents: 300000,
      expenseCents: 10000,
      resultCents: 290000,
    })
    expect(months[1]).toEqual({ period: '2026-02', ...ZERO })
    expect(months[11]).toEqual({
      period: '2026-12',
      incomeCents: 0,
      expenseCents: 4500,
      resultCents: -4500,
    })
  })

  it('a soma das 12 linhas é igual aos totais do ano (centavos inteiros)', () => {
    const transactions = [
      income(1999, '2026-03-10'),
      expense(1, '2026-07-01'),
      income(1, '2026-07-02'),
    ]
    const months = summarizeMonths(transactions, 2026)
    const sum = months.reduce((total, month) => total + month.resultCents, 0)
    expect(sum).toBe(1999)
    expect(months.every((month) => Number.isSafeInteger(month.resultCents))).toBe(true)
  })
})
