import { describe, expect, it } from 'vitest'
import {
  addMonthsClamped,
  monthRange,
  periodOf,
  periodsBetween,
  today,
  weekRange,
  yearRange,
} from '@/domain/dates'

describe('today', () => {
  // Princípio 2 — data local, sem fuso.
  it('usa a data local da data injetada', () => {
    expect(today(new Date(2026, 9, 19, 23, 59))).toBe('2026-10-19')
    expect(today(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01')
  })

  it('usa o relógio do sistema quando nada é injetado', () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('periodOf', () => {
  it('extrai o mês YYYY-MM', () => {
    expect(periodOf('2026-10-19')).toBe('2026-10')
  })

  it('recusa datas inválidas', () => {
    expect(() => periodOf('2026-13-01')).toThrow(RangeError)
    expect(() => periodOf('2026-02-30')).toThrow(RangeError)
    expect(() => periodOf('19/10/2026')).toThrow(RangeError)
  })
})

describe('weekRange', () => {
  // Princípio 3 / CA-05.3 — segunda a domingo (exemplo da spec: "12 a 18 de out. de 2026").
  it('vai de segunda a domingo', () => {
    expect(weekRange('2026-10-15')).toEqual({ start: '2026-10-12', end: '2026-10-18' })
    expect(weekRange('2026-10-19')).toEqual({ start: '2026-10-19', end: '2026-10-25' })
  })

  it('domingo pertence à semana que começou na segunda anterior', () => {
    expect(weekRange('2026-10-18')).toEqual({ start: '2026-10-12', end: '2026-10-18' })
  })

  // §6.11 — virada de ano.
  it('atravessa a virada do ano', () => {
    expect(weekRange('2026-12-31')).toEqual({ start: '2026-12-28', end: '2027-01-03' })
    expect(weekRange('2027-01-03')).toEqual({ start: '2026-12-28', end: '2027-01-03' })
    expect(weekRange('2025-01-01')).toEqual({ start: '2024-12-30', end: '2025-01-05' })
  })
})

describe('monthRange', () => {
  it('vai do dia 1 ao último dia do mês', () => {
    expect(monthRange('2026-10')).toEqual({ start: '2026-10-01', end: '2026-10-31' })
    expect(monthRange('2026-04')).toEqual({ start: '2026-04-01', end: '2026-04-30' })
  })

  it('considera fevereiro de ano bissexto', () => {
    expect(monthRange('2026-02')).toEqual({ start: '2026-02-01', end: '2026-02-28' })
    expect(monthRange('2028-02')).toEqual({ start: '2028-02-01', end: '2028-02-29' })
  })

  it('recusa períodos inválidos', () => {
    expect(() => monthRange('2026-13')).toThrow(RangeError)
    expect(() => monthRange('2026-1')).toThrow(RangeError)
  })
})

describe('yearRange', () => {
  it('vai de 1º de janeiro a 31 de dezembro', () => {
    expect(yearRange(2026)).toEqual({ start: '2026-01-01', end: '2026-12-31' })
  })

  it('recusa anos inválidos', () => {
    expect(() => yearRange(2026.5)).toThrow(RangeError)
    expect(() => yearRange(0)).toThrow(RangeError)
    expect(() => yearRange(10000)).toThrow(RangeError)
  })
})

describe('addMonthsClamped', () => {
  // §6.5 / §6.11 — dia inexistente vira o último dia do mês.
  it('31/01 + 1 mês → 28/02 em ano comum', () => {
    expect(addMonthsClamped('2026-01-31', 1)).toBe('2026-02-28')
  })

  it('31/01 + 1 mês → 29/02 em ano bissexto', () => {
    expect(addMonthsClamped('2028-01-31', 1)).toBe('2028-02-29')
  })

  it('31/01 + 2 meses → 31/03 (o ajuste não se acumula)', () => {
    expect(addMonthsClamped('2026-01-31', 2)).toBe('2026-03-31')
  })

  it('29/02 + 12 meses → 28/02 do ano seguinte', () => {
    expect(addMonthsClamped('2028-02-29', 12)).toBe('2029-02-28')
  })

  it('31/03 + 1 mês → 30/04', () => {
    expect(addMonthsClamped('2026-03-31', 1)).toBe('2026-04-30')
  })

  it('mantém o dia quando ele existe e atravessa o ano', () => {
    expect(addMonthsClamped('2026-11-15', 3)).toBe('2027-02-15')
    expect(addMonthsClamped('2026-10-19', 0)).toBe('2026-10-19')
    expect(addMonthsClamped('2026-03-31', -1)).toBe('2026-02-28')
  })

  it('recusa quantidade de meses fracionada', () => {
    expect(() => addMonthsClamped('2026-01-31', 1.5)).toThrow(RangeError)
  })
})

describe('periodsBetween', () => {
  it('lista os meses de forma inclusiva, atravessando o ano', () => {
    expect(periodsBetween('2026-11', '2027-02')).toEqual([
      '2026-11',
      '2026-12',
      '2027-01',
      '2027-02',
    ])
  })

  it('mesmo mês devolve um item; início depois do fim devolve lista vazia', () => {
    expect(periodsBetween('2026-10', '2026-10')).toEqual(['2026-10'])
    expect(periodsBetween('2026-10', '2026-09')).toEqual([])
  })

  it('recusa períodos inválidos', () => {
    expect(() => periodsBetween('2026-00', '2026-10')).toThrow(RangeError)
  })
})
