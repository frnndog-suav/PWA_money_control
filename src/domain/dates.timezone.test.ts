import { afterEach, describe, expect, it } from 'vitest'
import {
  addMonthsClamped,
  monthRange,
  periodOf,
  periodsBetween,
  today,
  weekRange,
  yearRange,
} from '@/domain/dates'
import { overallBalance, runningBalance } from '@/domain/balances'
import { expense, income } from '@/test/factories'
import { weekdayOf } from '@/test/propertyHelpers'

// Princípio 2 — datas sem fuso. As funções de data trabalham com strings `YYYY-MM-DD` e não
// podem mudar de resultado conforme o fuso do aparelho. O Node aplica uma troca de
// `process.env.TZ` em tempo de execução (inclusive no Windows); o primeiro teste confere essa
// pré-condição. Se um dia ela falhar (outro runner/pool), os demais testes perdem o efeito
// e só as datas-limite de dates.calendar.test.ts continuam cobrindo o princípio 2.

const ORIGINAL_TZ = process.env.TZ

function setTimeZone(timeZone: string | undefined): void {
  if (timeZone === undefined) delete process.env.TZ
  else process.env.TZ = timeZone
}

afterEach(() => {
  setTimeZone(ORIGINAL_TZ)
})

// Fusos extremos (+14 h e −11 h), o do Brasil, um com meia hora e um sem horário de verão.
const TIME_ZONES = [
  'UTC',
  'America/Sao_Paulo',
  'America/Noronha',
  'Pacific/Kiritimati',
  'Pacific/Pago_Pago',
  'Asia/Kolkata',
  'America/Los_Angeles',
]

/** Resultados que não podem depender do fuso. */
function snapshot() {
  return {
    periodOf: [periodOf('2026-01-01'), periodOf('2026-12-31')],
    weeks: [weekRange('2026-12-31'), weekRange('2027-01-03'), weekRange('2026-10-19')],
    months: [monthRange('2026-02'), monthRange('2028-02'), monthRange('2026-12')],
    year: yearRange(2026),
    clamped: [
      addMonthsClamped('2026-01-31', 1),
      addMonthsClamped('2028-01-31', 1),
      addMonthsClamped('2026-12-31', 1),
      addMonthsClamped('2026-10-31', 1),
      addMonthsClamped('2026-03-01', -1),
    ],
    periods: periodsBetween('2026-11', '2027-02'),
    // `today` recebe a data no relógio local: meia-noite e o último milissegundo do dia.
    today: [
      today(new Date(2026, 9, 19, 0, 0, 0, 0)),
      today(new Date(2026, 9, 19, 23, 59, 59, 999)),
      today(new Date(2026, 11, 31, 23, 59, 59, 999)),
      today(new Date(2027, 0, 1, 0, 0, 0, 0)),
    ],
    // CA-02.3 / D-42 — todos os lançamentos, inclusive os futuros, em qualquer fuso.
    overall: overallBalance([
      income(1000, '2026-10-19'),
      expense(300, '2026-10-20'),
      expense(1, '2026-10-18'),
    ]),
    running: runningBalance(
      [income(500, '2026-12-31'), expense(200, '2027-01-01')],
      [weekRange('2026-12-21'), weekRange('2026-12-28')],
    ),
  }
}

const EXPECTED = {
  periodOf: ['2026-01', '2026-12'],
  weeks: [
    { start: '2026-12-28', end: '2027-01-03' },
    { start: '2026-12-28', end: '2027-01-03' },
    { start: '2026-10-19', end: '2026-10-25' },
  ],
  months: [
    { start: '2026-02-01', end: '2026-02-28' },
    { start: '2028-02-01', end: '2028-02-29' },
    { start: '2026-12-01', end: '2026-12-31' },
  ],
  year: { start: '2026-01-01', end: '2026-12-31' },
  clamped: ['2026-02-28', '2028-02-29', '2027-01-31', '2026-11-30', '2026-02-01'],
  periods: ['2026-11', '2026-12', '2027-01', '2027-02'],
  today: ['2026-10-19', '2026-10-19', '2026-12-31', '2027-01-01'],
  overall: 699,
  running: [0, 300],
}

describe('datas independentes do fuso (princípio 2 / §6.5)', () => {
  it('pré-condição: trocar process.env.TZ muda o fuso do processo', () => {
    setTimeZone('Pacific/Kiritimati')
    const ahead = new Date(2026, 0, 1).getTimezoneOffset()
    setTimeZone('Pacific/Pago_Pago')
    const behind = new Date(2026, 0, 1).getTimezoneOffset()
    expect(ahead).toBe(-14 * 60)
    expect(behind).toBe(11 * 60)
  })

  it.each(TIME_ZONES)('mesmos resultados no fuso %s', (timeZone) => {
    setTimeZone(timeZone)
    expect(snapshot()).toEqual(EXPECTED)
  })

  // Em São Paulo, o horário de verão de 2018 começou à meia-noite de 04/11: esse dia não
  // teve 00:00 (o relógio pulou para 01:00). Datas assim quebram quem usa meia-noite local
  // como "início do dia".
  it('dia sem meia-noite (início do horário de verão em São Paulo, 04/11/2018)', () => {
    setTimeZone('America/Sao_Paulo')
    expect(new Date(2018, 10, 4, 0, 0).getHours()).toBe(1) // pré-condição: 00:00 não existe

    expect(weekdayOf('2018-11-04')).toBe(0) // domingo
    expect(weekRange('2018-11-04')).toEqual({ start: '2018-10-29', end: '2018-11-04' })
    expect(weekRange('2018-11-05')).toEqual({ start: '2018-11-05', end: '2018-11-11' })
    expect(addMonthsClamped('2018-10-04', 1)).toBe('2018-11-04')
    expect(addMonthsClamped('2018-11-04', 1)).toBe('2018-12-04')
    expect(monthRange('2018-11')).toEqual({ start: '2018-11-01', end: '2018-11-30' })
    expect(periodOf('2018-11-04')).toBe('2018-11')
    expect(today(new Date(2018, 10, 4, 1, 0))).toBe('2018-11-04')
    expect(today(new Date(2018, 10, 3, 23, 59, 59, 999))).toBe('2018-11-03')
  })

  // Fim do horário de verão de 2018 em São Paulo: 23:00 de 17/02 se repetiu.
  it('dia com 25 horas (fim do horário de verão em São Paulo, 17/02/2018)', () => {
    setTimeZone('America/Sao_Paulo')
    expect(weekRange('2018-02-17')).toEqual({ start: '2018-02-12', end: '2018-02-18' })
    expect(addMonthsClamped('2018-01-17', 1)).toBe('2018-02-17')
    expect(today(new Date(2018, 1, 17, 23, 30))).toBe('2018-02-17')
    expect(today(new Date(2018, 1, 18, 0, 0))).toBe('2018-02-18')
  })
})
