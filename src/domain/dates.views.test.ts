import { describe, expect, it } from 'vitest'
import {
  addDays,
  datesBetween,
  formatDateRangeLabel,
  formatMonthName,
  formatWeekdayDate,
  weekRange,
} from '@/domain/dates'

// RF-05 / Fase 7 — datas usadas pelas visões por período.

describe('addDays — virada de mês e de ano (RF-05)', () => {
  it.each([
    // [data, dias, esperado]
    ['2026-10-24', 1, '2026-10-25'],
    ['2026-10-31', 1, '2026-11-01'], // virada de mês
    ['2026-11-01', -1, '2026-10-31'],
    ['2026-12-31', 1, '2027-01-01'], // virada de ano
    ['2027-01-01', -1, '2026-12-31'],
    ['2026-02-28', 1, '2026-03-01'], // ano comum
    ['2028-02-28', 1, '2028-02-29'], // ano bissexto
    ['2026-12-28', 7, '2027-01-04'], // uma semana para a frente atravessando o ano
    ['2027-01-04', -7, '2026-12-28'],
    ['2026-10-24', 0, '2026-10-24'],
  ])('%s %+d dia(s) → %s', (date, days, expected) => {
    expect(addDays(date, days)).toBe(expected)
  })

  it('recusa datas e quantidades inválidas', () => {
    expect(() => addDays('2026-02-30', 1)).toThrow(RangeError)
    expect(() => addDays('2026-10-24', 1.5)).toThrow(RangeError)
  })
})

describe('datesBetween', () => {
  it('lista as datas inclusivas, atravessando o ano', () => {
    expect(datesBetween('2026-12-30', '2027-01-02')).toEqual([
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
    ])
  })

  it('um único dia e intervalo invertido', () => {
    expect(datesBetween('2026-10-24', '2026-10-24')).toEqual(['2026-10-24'])
    expect(datesBetween('2026-10-25', '2026-10-24')).toEqual([])
  })

  // CA-05.3 — a semana tem sempre 7 dias, de segunda a domingo.
  it('a semana de weekRange tem 7 dias, começando na segunda', () => {
    const { start, end } = weekRange('2026-12-31')
    expect(datesBetween(start, end)).toEqual([
      '2026-12-28',
      '2026-12-29',
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
      '2027-01-03',
    ])
  })

  it('recusa datas inválidas', () => {
    expect(() => datesBetween('2026-02-30', '2026-03-02')).toThrow(RangeError)
    expect(() => datesBetween('2026-03-01', '2026-02-30')).toThrow(RangeError)
  })
})

describe('weekRange — virada de mês e de ano (CA-05.3)', () => {
  it.each([
    ['2026-10-01', '2026-09-28', '2026-10-04'], // quinta: semana começa em setembro
    ['2026-11-01', '2026-10-26', '2026-11-01'], // domingo: último dia da semana
    ['2027-01-01', '2026-12-28', '2027-01-03'], // sexta: semana começa no ano anterior
    ['2026-12-28', '2026-12-28', '2027-01-03'], // segunda: primeiro dia da semana
    ['2028-02-29', '2028-02-28', '2028-03-05'], // ano bissexto
  ])('%s → %s a %s', (date, start, end) => {
    expect(weekRange(date)).toEqual({ start, end })
  })
})

describe('formatDateRangeLabel — título da semana (CA-05.3)', () => {
  it('mesmo mês: "12 a 18 de out. de 2026"', () => {
    expect(formatDateRangeLabel(weekRange('2026-10-15'))).toBe('12 a 18 de out. de 2026')
  })

  it('meses diferentes: o mês aparece nas duas pontas', () => {
    expect(formatDateRangeLabel(weekRange('2026-10-01'))).toBe('28 de set. a 4 de out. de 2026')
  })

  it('anos diferentes: o ano aparece nas duas pontas', () => {
    expect(formatDateRangeLabel(weekRange('2027-01-01'))).toBe(
      '28 de dez. de 2026 a 3 de jan. de 2027',
    )
  })

  it('usa as abreviações do pt-BR em todos os meses', () => {
    const labels = Array.from({ length: 12 }, (_, index) => {
      const month = String(index + 1).padStart(2, '0')
      return formatDateRangeLabel({ start: `2026-${month}-01`, end: `2026-${month}-02` })
    })
    expect(labels).toEqual([
      '1 a 2 de jan. de 2026',
      '1 a 2 de fev. de 2026',
      '1 a 2 de mar. de 2026',
      '1 a 2 de abr. de 2026',
      '1 a 2 de mai. de 2026',
      '1 a 2 de jun. de 2026',
      '1 a 2 de jul. de 2026',
      '1 a 2 de ago. de 2026',
      '1 a 2 de set. de 2026',
      '1 a 2 de out. de 2026',
      '1 a 2 de nov. de 2026',
      '1 a 2 de dez. de 2026',
    ])
  })

  it('recusa datas inválidas', () => {
    expect(() => formatDateRangeLabel({ start: '2026-02-30', end: '2026-03-01' })).toThrow(
      RangeError,
    )
  })
})

describe('formatWeekdayDate e formatMonthName (RF-05)', () => {
  it('dia da semana por extenso e dia/mês', () => {
    expect(formatWeekdayDate('2026-10-19')).toBe('segunda-feira, 19/10')
    expect(formatWeekdayDate('2026-10-25')).toBe('domingo, 25/10')
    expect(formatWeekdayDate('2027-01-01')).toBe('sexta-feira, 01/01')
  })

  it('nome do mês por extenso', () => {
    expect(formatMonthName('2026-01')).toBe('janeiro')
    expect(formatMonthName('2026-03')).toBe('março')
    expect(formatMonthName('2026-12')).toBe('dezembro')
  })

  it('recusa valores inválidos', () => {
    expect(() => formatWeekdayDate('2026-02-30')).toThrow(RangeError)
    expect(() => formatMonthName('2026-13')).toThrow(RangeError)
  })
})
