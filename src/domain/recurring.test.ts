import { describe, expect, it } from 'vitest'
import {
  AmountAfterEndError,
  AmountBeforeStartError,
  amountFor,
  displayAmount,
  confirmedOccurrenceKeys,
  endRecurring,
  EndBeforeConfirmedError,
  EndBeforeStartError,
  isActiveIn,
  lastConfirmedPeriod,
  occurrenceStatus,
  pendingOccurrences,
  projected,
  recurringListStatus,
  setAmountFrom,
  skipPeriod,
  unskipPeriod,
} from '@/domain/recurring'
import { makeRecurring, makeTransaction } from '@/test/factories'

// RF-07 / §6.5 — recorrentes mensais (Fase 9).

const light = makeRecurring({
  id: 'light',
  description: 'Conta de luz',
  startPeriod: '2026-10',
  amounts: [{ fromPeriod: '2026-10', amountCents: 18000 }],
})

function confirmed(recurringId: string, period: string, amountCents = 18740) {
  return makeTransaction({
    recurringId,
    recurringPeriod: period,
    amountCents,
    date: `${period}-17`,
  })
}

describe('isActiveIn (§6.5)', () => {
  const ended = makeRecurring({ startPeriod: '2026-01', endPeriod: '2026-06' })

  it.each([
    ['2025-12', false],
    ['2026-01', true],
    ['2026-06', true],
    ['2026-07', false],
  ])('%s → %s', (period, expected) => {
    expect(isActiveIn(ended, period)).toBe(expected)
  })

  it('sem término: ativo para sempre a partir do início', () => {
    expect(isActiveIn(light, '2099-12')).toBe(true)
    expect(isActiveIn(light, '2026-09')).toBe(false)
  })
})

describe('amountFor — valor vigente (CA-07.3)', () => {
  const internet = makeRecurring({
    startPeriod: '2026-01',
    amounts: [
      { fromPeriod: '2026-01', amountCents: 5000 },
      { fromPeriod: '2026-11', amountCents: 5500 },
    ],
  })

  it('R$ 50,00 desde 2026-01 e R$ 55,00 a partir de 2026-11', () => {
    expect(amountFor(internet, '2026-01')).toBe(5000)
    expect(amountFor(internet, '2026-10')).toBe(5000)
    expect(amountFor(internet, '2026-11')).toBe(5500)
    expect(amountFor(internet, '2030-05')).toBe(5500)
  })

  it('antes do início não há valor vigente', () => {
    expect(() => amountFor(internet, '2025-12')).toThrow(RangeError)
  })
})

describe('setAmountFrom (§6.5 / CA-07.3)', () => {
  const base = makeRecurring({
    startPeriod: '2026-01',
    amounts: [
      { fromPeriod: '2026-01', amountCents: 5000 },
      { fromPeriod: '2026-06', amountCents: 5200 },
      { fromPeriod: '2026-12', amountCents: 5400 },
    ],
  })

  it('remove os valores a partir do novo mês e acrescenta o novo, em ordem', () => {
    expect(setAmountFrom(base, '2026-11', 5500).amounts).toEqual([
      { fromPeriod: '2026-01', amountCents: 5000 },
      { fromPeriod: '2026-06', amountCents: 5200 },
      { fromPeriod: '2026-11', amountCents: 5500 },
    ])
  })

  it('no mesmo mês de um valor existente, substitui', () => {
    expect(setAmountFrom(base, '2026-06', 6000).amounts).toEqual([
      { fromPeriod: '2026-01', amountCents: 5000 },
      { fromPeriod: '2026-06', amountCents: 6000 },
    ])
  })

  it('no mês de início, vira o único valor', () => {
    expect(setAmountFrom(base, '2026-01', 4000).amounts).toEqual([
      { fromPeriod: '2026-01', amountCents: 4000 },
    ])
  })

  it('não altera o recorrente original', () => {
    setAmountFrom(base, '2026-02', 1)
    expect(base.amounts).toHaveLength(3)
  })

  it('antes do início: erro (§6.5)', () => {
    expect(() => setAmountFrom(base, '2025-12', 100)).toThrow(AmountBeforeStartError)
  })

  it('depois do término: erro (o valor nunca seria usado)', () => {
    const ended = { ...base, endPeriod: '2026-08' }
    expect(() => setAmountFrom(ended, '2026-09', 100)).toThrow(AmountAfterEndError)
    expect(setAmountFrom(ended, '2026-08', 100).amounts.at(-1)).toEqual({
      fromPeriod: '2026-08',
      amountCents: 100,
    })
  })
})

describe('pendingOccurrences (§6.5 / CA-07.1 / CA-07.2 / CA-07.4)', () => {
  it('CA-07.1: "Conta de luz" iniciada em 2026-10 aparece pendente em novembro', () => {
    expect(pendingOccurrences([light], [], '2026-11')).toEqual([
      { recurring: light, period: '2026-11', amountCents: 18000 },
    ])
  })

  it('CA-07.2: depois de confirmada, sai da lista de pendentes do mês', () => {
    expect(pendingOccurrences([light], [confirmed('light', '2026-11')], '2026-11')).toEqual([])
    // A confirmação de outro mês não muda novembro.
    expect(pendingOccurrences([light], [confirmed('light', '2026-10')], '2026-11')).toHaveLength(1)
  })

  it('CA-07.4: mês pulado não aparece; desfazer devolve', () => {
    const skipped = skipPeriod(light, '2026-12')
    expect(pendingOccurrences([skipped], [], '2026-12')).toEqual([])
    expect(pendingOccurrences([unskipPeriod(skipped, '2026-12')], [], '2026-12')).toHaveLength(1)
  })

  it('fora do período de atividade não há ocorrência', () => {
    expect(pendingOccurrences([light], [], '2026-09')).toEqual([])
    const ended = { ...light, endPeriod: '2026-11' }
    expect(pendingOccurrences([ended], [], '2026-12')).toEqual([])
  })

  it('ignora lançamentos sem vínculo e ordena pela descrição', () => {
    const water = makeRecurring({ id: 'water', description: 'Água', startPeriod: '2026-01' })
    const rent = makeRecurring({ id: 'rent', description: 'aluguel', startPeriod: '2026-01' })
    const pending = pendingOccurrences([light, water, rent], [makeTransaction()], '2026-11')
    expect(pending.map((occurrence) => occurrence.recurring.description)).toEqual([
      'Água',
      'aluguel',
      'Conta de luz',
    ])
  })

  it('usa o valor vigente do mês', () => {
    const changed = setAmountFrom(light, '2026-12', 20000)
    expect(pendingOccurrences([changed], [], '2026-11')[0].amountCents).toBe(18000)
    expect(pendingOccurrences([changed], [], '2026-12')[0].amountCents).toBe(20000)
  })
})

describe('occurrenceStatus (CA-07.6)', () => {
  const keys = confirmedOccurrenceKeys([confirmed('light', '2026-10')])
  const skipped = skipPeriod(light, '2026-11')

  it.each([
    ['2026-09', 'inactive'],
    ['2026-10', 'confirmed'],
    ['2026-11', 'skipped'],
    ['2026-12', 'pending'],
  ] as const)('%s → %s', (period, status) => {
    expect(occurrenceStatus(skipped, period, keys)).toBe(status)
  })
})

describe('skipPeriod / unskipPeriod (CA-07.4)', () => {
  it('pula em ordem, sem repetir; desfazer remove só aquele mês', () => {
    const once = skipPeriod(skipPeriod(light, '2026-12'), '2026-11')
    expect(once.skippedPeriods).toEqual(['2026-11', '2026-12'])
    expect(skipPeriod(once, '2026-12')).toBe(once)
    expect(unskipPeriod(once, '2026-12').skippedPeriods).toEqual(['2026-11'])
    expect(unskipPeriod(light, '2026-12')).toBe(light)
  })
})

describe('endRecurring (RF-07 "Encerrar" / D-51)', () => {
  const recurring = makeRecurring({
    startPeriod: '2026-01',
    amounts: [
      { fromPeriod: '2026-01', amountCents: 5000 },
      { fromPeriod: '2026-09', amountCents: 5500 },
    ],
    skippedPeriods: ['2026-03', '2026-08'],
  })

  it('define o término e descarta pulos e valores que ficariam depois dele', () => {
    const ended = endRecurring(recurring, '2026-06', '2026-05')
    expect(ended.endPeriod).toBe('2026-06')
    expect(ended.skippedPeriods).toEqual(['2026-03'])
    expect(ended.amounts).toEqual([{ fromPeriod: '2026-01', amountCents: 5000 }])
  })

  it('pode terminar no mês de início ou no último mês confirmado', () => {
    expect(endRecurring(recurring, '2026-01', null).endPeriod).toBe('2026-01')
    expect(endRecurring(recurring, '2026-05', '2026-05').endPeriod).toBe('2026-05')
  })

  it('não pode terminar antes do início', () => {
    expect(() => endRecurring(recurring, '2025-12', null)).toThrow(EndBeforeStartError)
  })

  it('não pode terminar antes de um mês já confirmado', () => {
    expect(() => endRecurring(recurring, '2026-10', '2026-12')).toThrow(EndBeforeConfirmedError)
  })
})

describe('lastConfirmedPeriod', () => {
  it('maior mês confirmado entre os lançamentos', () => {
    expect(lastConfirmedPeriod([])).toBeNull()
    expect(
      lastConfirmedPeriod([
        confirmed('light', '2026-11'),
        confirmed('light', '2027-01'),
        confirmed('light', '2026-12'),
        makeTransaction(),
      ]),
    ).toBe('2027-01')
  })
})

describe('projected — Previsto (§6.5 / CA-05.2 / D-05)', () => {
  it('Realizado + pendentes, separando entradas e saídas', () => {
    const salary = makeRecurring({ type: 'income' })
    const actual = { incomeCents: 100000, expenseCents: 30000, resultCents: 70000 }
    const pending = [
      { recurring: light, period: '2026-11', amountCents: 18000 },
      { recurring: salary, period: '2026-11', amountCents: 500000 },
    ]
    expect(projected(actual, pending)).toEqual({
      incomeCents: 600000,
      expenseCents: 48000,
      resultCents: 552000,
    })
  })

  it('sem pendentes, Previsto = Realizado', () => {
    const actual = { incomeCents: 1, expenseCents: 2, resultCents: -1 }
    expect(projected(actual, [])).toEqual(actual)
  })
})

describe('recurringListStatus / displayAmount (CA-07.6)', () => {
  const recurring = makeRecurring({
    startPeriod: '2026-03',
    endPeriod: '2026-10',
    amounts: [
      { fromPeriod: '2026-03', amountCents: 5000 },
      { fromPeriod: '2026-08', amountCents: 6000 },
    ],
    skippedPeriods: ['2026-05'],
  })
  const keys = confirmedOccurrenceKeys([confirmed(recurring.id, '2026-04')])

  it.each([
    ['2026-02', 'upcoming'],
    ['2026-03', 'pending'],
    ['2026-04', 'confirmed'],
    ['2026-05', 'skipped'],
    ['2026-11', 'ended'],
  ] as const)('%s → %s', (period, status) => {
    expect(recurringListStatus(recurring, period, keys)).toBe(status)
  })

  it.each([
    ['2026-01', 5000], // antes do início: o 1º valor
    ['2026-07', 5000],
    ['2026-09', 6000],
    ['2027-02', 6000], // depois do término: o último que valeu
  ])('%s → %d', (period, cents) => {
    expect(displayAmount(recurring, period)).toBe(cents)
  })
})
