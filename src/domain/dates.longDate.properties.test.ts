import { afterEach, describe, expect, it } from 'vitest'
import { formatLongDate } from '@/domain/dates'
import { allDatesOfYear, weekdayOf } from '@/test/propertyHelpers'

// RF-04 / CA-04.1 — data por extenso do cabeçalho do dia em pt-BR (princípio 4), conferida
// contra a congruência de Zeller (sem Date nem date-fns) em todos os dias de vários anos, nos
// mesmos 7 fusos de dates.format.timezone.test.ts (princípio 2).

const ORIGINAL_TZ = process.env.TZ

function setTimeZone(timeZone: string | undefined): void {
  if (timeZone === undefined) delete process.env.TZ
  else process.env.TZ = timeZone
}

afterEach(() => {
  setTimeZone(ORIGINAL_TZ)
})

const TIME_ZONES = [
  'UTC',
  'America/Sao_Paulo',
  'America/Noronha',
  'Pacific/Kiritimati',
  'Pacific/Pago_Pago',
  'Asia/Kolkata',
  'America/Los_Angeles',
]

const WEEKDAYS = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
]

const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

function expectedLongDate(date: string): string {
  const year = Number(date.slice(0, 4))
  const month = Number(date.slice(5, 7))
  const day = Number(date.slice(8, 10))
  return `${WEEKDAYS[weekdayOf(date)]}, ${day} de ${MONTHS[month - 1]} de ${year}`
}

// 2024 e 2028 bissextos, 2100 não bissexto (secular), 2000 bissexto (secular divisível por 400).
const YEARS = [2000, 2024, 2025, 2026, 2027, 2028, 2100]

describe('formatLongDate — todos os dias contra Zeller (CA-04.1)', () => {
  it.each(TIME_ZONES)('fuso %s', (timeZone) => {
    setTimeZone(timeZone)
    for (const year of YEARS) {
      for (const date of allDatesOfYear(year)) {
        expect(formatLongDate(date), date).toBe(expectedLongDate(date))
      }
    }
  })
})

describe('formatLongDate — casos explícitos (CA-04.1)', () => {
  it.each(TIME_ZONES)('virada de ano e 29/02 no fuso %s', (timeZone) => {
    setTimeZone(timeZone)
    expect(formatLongDate('2025-12-31')).toBe('quarta-feira, 31 de dezembro de 2025')
    expect(formatLongDate('2026-01-01')).toBe('quinta-feira, 1 de janeiro de 2026')
    expect(formatLongDate('2024-02-29')).toBe('quinta-feira, 29 de fevereiro de 2024')
    expect(formatLongDate('2028-02-29')).toBe('terça-feira, 29 de fevereiro de 2028')
    expect(formatLongDate('2000-02-29')).toBe('terça-feira, 29 de fevereiro de 2000')
  })

  it('29/02 de ano não bissexto é recusado', () => {
    expect(() => formatLongDate('2026-02-29')).toThrow(RangeError)
    expect(() => formatLongDate('2100-02-29')).toThrow(RangeError)
  })

  it('o fuso pode mudar depois de o módulo carregar sem alterar o resultado', () => {
    setTimeZone('Pacific/Kiritimati')
    const east = formatLongDate('2026-10-20')
    setTimeZone('Pacific/Pago_Pago')
    expect(formatLongDate('2026-10-20')).toBe(east)
    expect(east).toBe('terça-feira, 20 de outubro de 2026')
  })
})
