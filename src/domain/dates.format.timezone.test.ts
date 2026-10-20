import { afterEach, describe, expect, it } from 'vitest'
import { formatMonthLabel, formatShortDate, isValidDate } from '@/domain/dates'

// Princípio 2 / princípio 4 / D-38(f) — datas da lista em DD/MM/AAAA e o mês por extenso em
// pt-BR, sem depender do fuso do aparelho. Mesma técnica de dates.timezone.test.ts: o Node
// aplica a troca de `process.env.TZ` em tempo de execução.

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

function snapshot() {
  return {
    short: [
      formatShortDate('2026-12-31'),
      formatShortDate('2027-01-01'),
      formatShortDate('2026-01-01'),
      formatShortDate('2028-02-29'),
      formatShortDate('2026-10-20'),
    ],
    months: [
      formatMonthLabel('2026-12'),
      formatMonthLabel('2027-01'),
      formatMonthLabel('2026-01'),
      formatMonthLabel('2028-02'),
    ],
    valid: [isValidDate('2028-02-29'), isValidDate('2026-02-29'), isValidDate('2026-12-31')],
  }
}

const EXPECTED = {
  short: ['31/12/2026', '01/01/2027', '01/01/2026', '29/02/2028', '20/10/2026'],
  months: ['dezembro de 2026', 'janeiro de 2027', 'janeiro de 2026', 'fevereiro de 2028'],
  valid: [true, false, true],
}

describe('formatShortDate / formatMonthLabel — sem fuso (princípio 2 / D-38(f))', () => {
  it('pré-condição: trocar process.env.TZ muda o fuso do processo', () => {
    setTimeZone('Pacific/Kiritimati')
    const ahead = new Date(2026, 0, 1).getTimezoneOffset()
    setTimeZone('Pacific/Pago_Pago')
    const behind = new Date(2026, 0, 1).getTimezoneOffset()
    expect(ahead).toBe(-14 * 60)
    expect(behind).toBe(11 * 60)
  })

  it.each(TIME_ZONES)('mesmos resultados no fuso %s (inclui virada de ano)', (timeZone) => {
    setTimeZone(timeZone)
    expect(snapshot()).toEqual(EXPECTED)
  })

  it.each(TIME_ZONES)('os 12 meses de 2026 em pt-BR, minúsculos, no fuso %s', (timeZone) => {
    setTimeZone(timeZone)
    const labels = MONTHS.map((_, index) =>
      formatMonthLabel(`2026-${String(index + 1).padStart(2, '0')}`),
    )
    expect(labels).toEqual(MONTHS.map((month) => `${month} de 2026`))
  })
})

describe('formatShortDate — virada de mês e ano (D-38(f))', () => {
  it.each([
    ['2026-01-31', '31/01/2026'],
    ['2026-02-01', '01/02/2026'],
    ['2026-12-31', '31/12/2026'],
    ['2027-01-01', '01/01/2027'],
    ['0001-01-01', '01/01/0001'],
    ['9999-12-31', '31/12/9999'],
  ])('%s → %s', (date, expected) => {
    expect(formatShortDate(date)).toBe(expected)
  })

  it.each(['2026-13-01', '2026-02-29', '20/10/2026', ''])('recusa %j', (date) => {
    expect(() => formatShortDate(date)).toThrow(RangeError)
  })
})

describe('formatMonthLabel — virada de ano e entradas inválidas (RF-02 item 2)', () => {
  it('dezembro → janeiro do ano seguinte', () => {
    expect([formatMonthLabel('2026-12'), formatMonthLabel('2027-01')]).toEqual([
      'dezembro de 2026',
      'janeiro de 2027',
    ])
  })

  it.each(['2026-00', '2026-1', '2026-10-01', ''])('recusa %j', (period) => {
    expect(() => formatMonthLabel(period)).toThrow(RangeError)
  })
})

describe('isValidDate — mais casos (RF-01)', () => {
  it.each([
    ['2026-02-30', false],
    ['2026-00-10', false],
    ['2026-10-32', false],
    ['2026-10-00', false],
    ['2026-10-20T00:00', false],
    [' 2026-10-20', false],
    ['2000-02-29', true],
    ['2100-02-29', false],
    ['2026-12-31', true],
  ])('%j → %s', (value, expected) => {
    expect(isValidDate(value)).toBe(expected)
  })
})
