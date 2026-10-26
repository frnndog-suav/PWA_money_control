import { z } from 'zod'
import { formatMonthLabel, isDateInPeriod, isValidPeriod } from '@/domain/dates'
import {
  amountCentsSchema,
  descriptionSchema,
  tagIdSchema,
  transactionTypeSchema,
} from '@/domain/transactionSchema'
import type { PeriodString } from '@/domain/types'

// RF-07 — validação dos formulários e do repositório de recorrentes. Fica fora de
// `recurring.ts` para quem só precisa das funções puras não levar o zod junto.

const periodSchema = (message: string) => z.string().refine(isValidPeriod, message)

/** Formulário "Novo recorrente": o término é opcional (`''` = sem término). */
export const recurringInputSchema = z
  .object({
    type: transactionTypeSchema,
    description: descriptionSchema,
    tagId: tagIdSchema,
    amountCents: amountCentsSchema,
    startPeriod: periodSchema('Informe o mês de início'),
    endPeriod: z.string().refine((value) => value === '' || isValidPeriod(value), 'Mês inválido'),
  })
  .refine((input) => input.endPeriod === '' || input.endPeriod >= input.startPeriod, {
    message: 'O término não pode ser antes do início',
    path: ['endPeriod'],
  })

export type RecurringInput = z.input<typeof recurringInputSchema>
export type RecurringValues = z.output<typeof recurringInputSchema>

/** D-51 — editar muda só descrição e tag (tipo e início ficam fixos depois de criado). */
export const recurringDetailsSchema = z.object({
  description: descriptionSchema,
  tagId: tagIdSchema,
})

export type RecurringDetailsInput = z.input<typeof recurringDetailsSchema>
export type RecurringDetailsValues = z.output<typeof recurringDetailsSchema>

/** RF-07 "Alterar valor para o futuro" — novo valor e o mês a partir do qual vale. */
export const amountChangeSchema = z.object({
  amountCents: amountCentsSchema,
  fromPeriod: periodSchema('Informe o mês'),
})

export type AmountChangeInput = z.input<typeof amountChangeSchema>

/** RF-07 "Encerrar" — mês de término. */
export const endRecurringSchema = z.object({
  endPeriod: periodSchema('Informe o mês de término'),
})

export type EndRecurringInput = z.input<typeof endRecurringSchema>

/** CA-07.8 — "A data precisa estar em novembro de 2026." */
export function dateOutsidePeriodMessage(period: PeriodString): string {
  return `A data precisa estar em ${formatMonthLabel(period)}.`
}

/**
 * RF-07 "Confirmar" — valor, data, descrição e tag só desta ocorrência; a data precisa estar
 * no mês da ocorrência (CA-07.8). O tipo é o do recorrente.
 */
export function confirmOccurrenceSchema(period: PeriodString) {
  return z.object({
    amountCents: amountCentsSchema,
    date: z
      .string()
      .refine((date) => isDateInPeriod(date, period), dateOutsidePeriodMessage(period)),
    tagId: tagIdSchema,
    description: descriptionSchema,
  })
}

export type ConfirmOccurrenceInput = z.input<ReturnType<typeof confirmOccurrenceSchema>>
export type ConfirmOccurrenceValues = z.output<ReturnType<typeof confirmOccurrenceSchema>>
