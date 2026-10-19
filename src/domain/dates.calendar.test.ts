import { describe, expect, it, vi } from 'vitest'
import {
  addMonthsClamped,
  monthRange,
  periodOf,
  periodsBetween,
  today,
  weekRange,
  yearRange,
} from '@/domain/dates'
import {
  allDatesOfYear,
  dayNumber,
  daysInMonth,
  toDateString,
  weekdayOf,
} from '@/test/propertyHelpers'

// Reforço da auditoria da Fase 2 (§6.5 / §6.11): casos de calendário e propriedades.
// As referências vêm de src/test/propertyHelpers.ts, calculadas só com aritmética
// (sem date-fns e sem fuso), para não testar o código com ele mesmo.

describe('addMonthsClamped — anos bissextos e virada do ano (§6.11 / RF-08)', () => {
  it.each([
    // [data, meses, esperado]
    ['2026-01-31', 1, '2026-02-28'], // ano comum
    ['2028-01-31', 1, '2028-02-29'], // ano bissexto
    ['2100-01-31', 1, '2100-02-28'], // múltiplo de 100: não é bissexto
    ['2000-01-31', 1, '2000-02-29'], // múltiplo de 400: é bissexto
    ['2028-02-29', 1, '2028-03-29'],
    ['2028-02-29', 12, '2029-02-28'],
    ['2028-02-29', 48, '2032-02-29'],
    ['2028-02-29', -12, '2027-02-28'],
    ['2026-03-31', 1, '2026-04-30'],
    ['2026-03-31', -1, '2026-02-28'],
    ['2028-03-31', -1, '2028-02-29'],
    ['2026-05-31', 1, '2026-06-30'],
    ['2026-08-31', 6, '2027-02-28'],
    ['2026-12-31', 1, '2027-01-31'], // fim de dezembro → janeiro
    ['2026-12-31', 2, '2027-02-28'],
    ['2027-12-31', 2, '2028-02-29'],
    ['2026-12-15', 1, '2027-01-15'],
    ['2027-01-31', -1, '2026-12-31'],
    ['2026-01-31', 11, '2026-12-31'],
    ['2026-01-31', 13, '2027-02-28'],
  ])('%s + %d meses → %s', (date, months, expected) => {
    expect(addMonthsClamped(date, months)).toBe(expected)
  })

  // RF-08 / CA-08.1 — 3 parcelas a partir de 31/10/2026 (a 2ª cai no último dia de novembro).
  it('datas das parcelas a partir de 31/10/2026 (CA-08.1)', () => {
    expect([0, 1, 2].map((k) => addMonthsClamped('2026-10-31', k))).toEqual([
      '2026-10-31',
      '2026-11-30',
      '2026-12-31',
    ])
  })

  // RF-08 — 48 parcelas a partir de 31/01: cada data parte da 1ª, então o ajuste de
  // fevereiro não "contamina" os meses seguintes.
  it('48 parcelas a partir de 31/01 não acumulam o ajuste', () => {
    const dates = Array.from({ length: 48 }, (_, k) => addMonthsClamped('2026-01-31', k))
    dates.forEach((date, k) => {
      const year = 2026 + Math.floor(k / 12)
      const month = (k % 12) + 1
      expect(date).toBe(toDateString(year, month, daysInMonth(year, month)))
    })
  })

  it('recusa data inválida', () => {
    expect(() => addMonthsClamped('2026-02-29', 1)).toThrow(RangeError)
    expect(() => addMonthsClamped('2026-1-31', 1)).toThrow(RangeError)
  })
})

describe('propriedade: addMonthsClamped em todos os dias do ano (§6.5 / §6.11)', () => {
  // Para todo dia de um ano comum e de um bissexto, com deslocamentos de −25 a +25 meses:
  // mesmo dia quando ele existe no mês de destino; senão, o último dia válido.
  it.each([2026, 2028])('todos os dias de %d', (year) => {
    for (const date of allDatesOfYear(year)) {
      const month = Number(date.slice(5, 7))
      const day = Number(date.slice(8, 10))
      for (let months = -25; months <= 25; months++) {
        const index = year * 12 + (month - 1) + months
        const targetYear = Math.floor(index / 12)
        const targetMonth = (index % 12) + 1
        const lastDay = daysInMonth(targetYear, targetMonth)
        const expected = toDateString(targetYear, targetMonth, Math.min(day, lastDay))
        expect(addMonthsClamped(date, months)).toBe(expected)
      }
    }
  })
})

describe('weekRange — segunda a domingo (princípio 3 / CA-05.3 / §6.11)', () => {
  it.each([
    // [data, início, fim]
    ['2020-12-31', '2020-12-28', '2021-01-03'], // ano de 53 semanas ISO
    ['2021-01-01', '2020-12-28', '2021-01-03'],
    ['2022-12-31', '2022-12-26', '2023-01-01'], // sábado
    ['2023-01-01', '2022-12-26', '2023-01-01'], // 1º de janeiro num domingo
    ['2023-01-02', '2023-01-02', '2023-01-08'], // 2 de janeiro numa segunda
    ['2024-12-30', '2024-12-30', '2025-01-05'], // a semana começa em dezembro
    ['2027-01-01', '2026-12-28', '2027-01-03'], // sexta
    ['2028-02-29', '2028-02-28', '2028-03-05'], // dia bissexto
  ])('%s → %s a %s', (date, start, end) => {
    expect(weekRange(date)).toEqual({ start, end })
  })

  // Propriedade: de dezembro/2025 a janeiro/2028 (três viradas de ano), toda semana começa
  // numa segunda, termina num domingo, tem 7 dias e contém a data.
  it('propriedade: toda semana tem 7 dias, de segunda a domingo, e contém a data', () => {
    const dates = [
      ...allDatesOfYear(2025).filter((date) => date.startsWith('2025-12')),
      ...allDatesOfYear(2026),
      ...allDatesOfYear(2027),
      ...allDatesOfYear(2028).filter((date) => date.startsWith('2028-01')),
    ]
    expect(dates).toHaveLength(31 + 365 + 365 + 31)
    for (const date of dates) {
      const { start, end } = weekRange(date)
      expect(weekdayOf(start)).toBe(1) // segunda
      expect(weekdayOf(end)).toBe(0) // domingo
      expect(dayNumber(end) - dayNumber(start)).toBe(6)
      expect(start <= date && date <= end).toBe(true)
    }
  })

  // CA-05.3 — o exemplo do critério ("13 a 19 de out. de 2026") não é uma semana de segunda
  // a domingo em 2026: 13/10/2026 é terça e 19/10/2026 é segunda. A regra prevalece; o
  // exemplo do texto da spec precisa ser revisto (ex.: "12 a 18 de out. de 2026").
  it('a semana de 13/10/2026 vai de 12 a 18 de outubro (regra do CA-05.3)', () => {
    expect(weekdayOf('2026-10-13')).toBe(2) // terça
    expect(weekdayOf('2026-10-19')).toBe(1) // segunda
    expect(weekRange('2026-10-13')).toEqual({ start: '2026-10-12', end: '2026-10-18' })
  })
})

describe('monthRange — todos os meses (§6.5)', () => {
  it.each([2026, 2028, 2100, 2000])('os 12 meses de %d', (year) => {
    for (let month = 1; month <= 12; month++) {
      const period = `${year}-${String(month).padStart(2, '0')}`
      expect(monthRange(period)).toEqual({
        start: `${period}-01`,
        end: toDateString(year, month, daysInMonth(year, month)),
      })
    }
  })

  it('recusa formatos fora de YYYY-MM', () => {
    expect(() => monthRange('2026-00')).toThrow(RangeError)
    expect(() => monthRange('2026-10-01')).toThrow(RangeError)
    expect(() => monthRange('26-10')).toThrow(RangeError)
  })
})

describe('yearRange (§6.5)', () => {
  it('ano bissexto e limites do intervalo aceito', () => {
    expect(yearRange(2028)).toEqual({ start: '2028-01-01', end: '2028-12-31' })
    expect(yearRange(1)).toEqual({ start: '0001-01-01', end: '0001-12-31' })
    expect(yearRange(9999)).toEqual({ start: '9999-01-01', end: '9999-12-31' })
  })

  it('o ano vai do início de janeiro ao fim de dezembro de monthRange', () => {
    const range = yearRange(2028)
    expect(range.start).toBe(monthRange('2028-01').start)
    expect(range.end).toBe(monthRange('2028-12').end)
  })

  it('recusa NaN e anos negativos', () => {
    expect(() => yearRange(Number.NaN)).toThrow(RangeError)
    expect(() => yearRange(-2026)).toThrow(RangeError)
  })
})

describe('periodsBetween — atravessando anos (§6.5)', () => {
  it('dezembro → janeiro', () => {
    expect(periodsBetween('2026-12', '2027-01')).toEqual(['2026-12', '2027-01'])
  })

  it('vários anos: lista inclusiva, contígua, sem repetição e em ordem', () => {
    const periods = periodsBetween('2025-11', '2028-02')
    expect(periods).toHaveLength(2 + 12 + 12 + 2)
    expect(periods[0]).toBe('2025-11')
    expect(periods.at(-1)).toBe('2028-02')
    for (let i = 1; i < periods.length; i++) {
      const [prevYear, prevMonth] = periods[i - 1].split('-').map(Number)
      const [year, month] = periods[i].split('-').map(Number)
      expect(year * 12 + month - (prevYear * 12 + prevMonth)).toBe(1)
    }
    expect(new Set(periods).size).toBe(periods.length)
  })

  it('3 anos completos dão 36 meses', () => {
    expect(periodsBetween('2023-11', '2026-10')).toHaveLength(36)
  })

  it('anos com menos de 4 dígitos mantêm o formato YYYY-MM', () => {
    expect(periodsBetween('0999-12', '1000-01')).toEqual(['0999-12', '1000-01'])
  })

  it('recusa o fim inválido', () => {
    expect(() => periodsBetween('2026-10', '2026-13')).toThrow(RangeError)
  })
})

describe('periodOf / today — datas-limite (princípio 2)', () => {
  it('periodOf na virada do ano e em 29/02', () => {
    expect(periodOf('2026-12-31')).toBe('2026-12')
    expect(periodOf('2027-01-01')).toBe('2027-01')
    expect(periodOf('2028-02-29')).toBe('2028-02')
  })

  // `today` usa o calendário local, inclusive no último milissegundo do dia e no primeiro do ano.
  it('today nos limites do dia e do ano', () => {
    expect(today(new Date(2026, 11, 31, 23, 59, 59, 999))).toBe('2026-12-31')
    expect(today(new Date(2027, 0, 1, 0, 0, 0, 0))).toBe('2027-01-01')
    expect(today(new Date(2028, 1, 29, 0, 0, 0, 1))).toBe('2028-02-29')
  })

  it('today sem argumento usa o relógio do sistema (relógio falso)', () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date(2026, 9, 19, 23, 59, 59, 999))
      expect(today()).toBe('2026-10-19')
      vi.setSystemTime(new Date(2026, 9, 20, 0, 0, 0, 0))
      expect(today()).toBe('2026-10-20')
    } finally {
      vi.useRealTimers()
    }
  })
})
