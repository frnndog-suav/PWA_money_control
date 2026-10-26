import { describe, expect, it } from 'vitest'
import { isDateInPeriod, isValidPeriod } from '@/domain/dates'
import {
  amountChangeSchema,
  confirmOccurrenceSchema,
  dateOutsidePeriodMessage,
  endRecurringSchema,
  recurringDetailsSchema,
  recurringInputSchema,
} from '@/domain/recurringSchema'

// RF-07 — formulários de recorrentes (Fase 9).

const validInput = {
  type: 'expense' as const,
  description: '  Conta de luz ',
  tagId: 'tag-1',
  amountCents: 18000,
  startPeriod: '2026-10',
  endPeriod: '',
}

function firstError(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.error?.issues[0]?.message
}

describe('isValidPeriod / isDateInPeriod', () => {
  it('meses YYYY-MM', () => {
    expect(isValidPeriod('2026-10')).toBe(true)
    expect(isValidPeriod('2026-13')).toBe(false)
    expect(isValidPeriod('2026-1')).toBe(false)
    expect(isValidPeriod('')).toBe(false)
  })

  it('data dentro do mês', () => {
    expect(isDateInPeriod('2026-11-30', '2026-11')).toBe(true)
    expect(isDateInPeriod('2026-12-01', '2026-11')).toBe(false)
    expect(isDateInPeriod('2026-11-31', '2026-11')).toBe(false)
    expect(isDateInPeriod('', '2026-11')).toBe(false)
  })
})

describe('recurringInputSchema (RF-07 — campos do recorrente)', () => {
  it('aceita sem término e tira os espaços da descrição', () => {
    const result = recurringInputSchema.parse(validInput)
    expect(result.description).toBe('Conta de luz')
    expect(result.endPeriod).toBe('')
  })

  it('aceita término igual ou depois do início', () => {
    expect(recurringInputSchema.safeParse({ ...validInput, endPeriod: '2026-10' }).success).toBe(
      true,
    )
  })

  it.each([
    [{ description: '   ' }, 'Informe a descrição'],
    [{ description: 'x'.repeat(101) }, 'A descrição pode ter no máximo 100 caracteres'],
    [{ amountCents: 0 }, 'Informe um valor maior que zero'],
    [{ tagId: '' }, 'Escolha uma tag'],
    [{ startPeriod: '' }, 'Informe o mês de início'],
    [{ endPeriod: '2026-09' }, 'O término não pode ser antes do início'],
    [{ endPeriod: '2026-1' }, 'Mês inválido'],
  ])('%o → %s', (override, message) => {
    expect(firstError(recurringInputSchema.safeParse({ ...validInput, ...override }))).toBe(message)
  })
})

describe('recurringDetailsSchema / amountChangeSchema / endRecurringSchema', () => {
  it('editar: só descrição e tag (D-51)', () => {
    expect(recurringDetailsSchema.parse({ description: ' Luz ', tagId: 't' })).toEqual({
      description: 'Luz',
      tagId: 't',
    })
    expect(firstError(recurringDetailsSchema.safeParse({ description: '', tagId: 't' }))).toBe(
      'Informe a descrição',
    )
  })

  it('alterar valor: valor e mês obrigatórios', () => {
    expect(
      amountChangeSchema.safeParse({ amountCents: 20000, fromPeriod: '2026-11' }).success,
    ).toBe(true)
    expect(firstError(amountChangeSchema.safeParse({ amountCents: 20000, fromPeriod: '' }))).toBe(
      'Informe o mês',
    )
  })

  it('encerrar: mês obrigatório', () => {
    expect(firstError(endRecurringSchema.safeParse({ endPeriod: '' }))).toBe(
      'Informe o mês de término',
    )
  })
})

describe('confirmOccurrenceSchema (RF-07 "Confirmar" / CA-07.8)', () => {
  const schema = confirmOccurrenceSchema('2026-11')
  const valid = { amountCents: 18740, date: '2026-11-17', tagId: 't', description: 'Luz' }

  it('CA-07.2: aceita 2026-11-17 e R$ 187,40', () => {
    expect(schema.parse(valid)).toEqual(valid)
  })

  it('CA-07.8: data fora do mês → "A data precisa estar em novembro de 2026."', () => {
    expect(dateOutsidePeriodMessage('2026-11')).toBe('A data precisa estar em novembro de 2026.')
    for (const date of ['2026-12-01', '2026-10-31', '', '2026-11-31']) {
      expect(firstError(schema.safeParse({ ...valid, date }))).toBe(
        'A data precisa estar em novembro de 2026.',
      )
    }
  })
})
