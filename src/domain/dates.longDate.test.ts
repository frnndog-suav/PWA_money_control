import { afterEach, describe, expect, it } from 'vitest'
import { formatLongDate, formatMonthLabel } from '@/domain/dates'

// RF-04 / CA-04.1 — data por extenso no cabeçalho de cada dia, em pt-BR (princípio 4) e sem
// depender do fuso do aparelho (princípio 2). Mesma técnica de dates.format.timezone.test.ts.

const ORIGINAL_TZ = process.env.TZ

function setTimeZone(timeZone: string | undefined): void {
  if (timeZone === undefined) delete process.env.TZ
  else process.env.TZ = timeZone
}

afterEach(() => {
  setTimeZone(ORIGINAL_TZ)
})

const TIME_ZONES = ['UTC', 'America/Sao_Paulo', 'Pacific/Kiritimati', 'Pacific/Pago_Pago']

describe('formatLongDate (CA-04.1)', () => {
  it('"2026-10-20" → "terça-feira, 20 de outubro de 2026"', () => {
    expect(formatLongDate('2026-10-20')).toBe('terça-feira, 20 de outubro de 2026')
  })

  it.each(TIME_ZONES)('mesmo resultado no fuso %s (inclui virada de ano)', (timeZone) => {
    setTimeZone(timeZone)
    expect(
      ['2026-12-31', '2027-01-01', '2028-02-29', '2026-10-19', '2026-10-25'].map(formatLongDate),
    ).toEqual([
      'quinta-feira, 31 de dezembro de 2026',
      'sexta-feira, 1 de janeiro de 2027',
      'terça-feira, 29 de fevereiro de 2028',
      'segunda-feira, 19 de outubro de 2026',
      'domingo, 25 de outubro de 2026',
    ])
  })

  it('anos com menos de 4 algarismos não viram 19xx', () => {
    expect(formatLongDate('0050-03-01')).toMatch(/ de 50$/)
    expect(formatMonthLabel('0050-03')).toBe('março de 50')
  })

  it.each(['2026-02-30', '2026-13-01', '20/10/2026', ''])('recusa %j', (date) => {
    expect(() => formatLongDate(date)).toThrow(RangeError)
  })
})
