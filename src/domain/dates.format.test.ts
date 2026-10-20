import { describe, expect, it } from 'vitest'
import { formatMonthLabel, formatShortDate, isValidDate } from '@/domain/dates'

describe('isValidDate', () => {
  it.each([
    ['2026-10-20', true],
    ['2028-02-29', true],
    ['2026-02-29', false],
    ['2026-13-01', false],
    ['2026-1-01', false],
    ['', false],
  ])('%j → %s', (value, expected) => {
    expect(isValidDate(value)).toBe(expected)
  })
})

// RF-02 item 5 — data dos lançamentos em pt-BR.
describe('formatShortDate', () => {
  it('YYYY-MM-DD → DD/MM/AAAA', () => {
    expect(formatShortDate('2026-10-05')).toBe('05/10/2026')
  })

  it('recusa datas inválidas', () => {
    expect(() => formatShortDate('2026-02-30')).toThrow(RangeError)
  })
})

// RF-02 item 2 — nome do mês corrente no saldo do mês.
describe('formatMonthLabel', () => {
  it.each([
    ['2026-10', 'outubro de 2026'],
    ['2027-03', 'março de 2027'],
  ])('%s → %s', (period, expected) => {
    expect(formatMonthLabel(period)).toBe(expected)
  })

  it('recusa períodos inválidos', () => {
    expect(() => formatMonthLabel('2026-13')).toThrow(RangeError)
  })
})
