import { z } from 'zod'
import { isValidDate } from '@/domain/dates'
import { formatBRL, MAX_AMOUNT_CENTS } from '@/domain/money'

// RF-01 — validação do formulário e do repositório de lançamentos. Fica fora das funções
// puras (como o tagSchema) para quem só precisa delas não levar o zod junto.

// D-10 — contado em unidades UTF-16 (`String.length`), como o nome da tag (D-35).
export const DESCRIPTION_MAX_LENGTH = 100

// Campos comuns a lançamentos e recorrentes (RF-01 / RF-07).
export const transactionTypeSchema = z.enum(['income', 'expense'], {
  error: 'Escolha Saída ou Entrada',
})

export const amountCentsSchema = z
  .number({ error: 'Informe o valor' })
  .int('Informe o valor')
  .min(1, 'Informe um valor maior que zero')
  .max(MAX_AMOUNT_CENTS, `O valor máximo é ${formatBRL(MAX_AMOUNT_CENTS)}`)

export const tagIdSchema = z.string().min(1, 'Escolha uma tag')

export const descriptionSchema = z
  .string()
  .trim()
  .min(1, 'Informe a descrição')
  .max(
    DESCRIPTION_MAX_LENGTH,
    `A descrição pode ter no máximo ${DESCRIPTION_MAX_LENGTH} caracteres`,
  )

export const transactionInputSchema = z.object({
  type: transactionTypeSchema,
  amountCents: amountCentsSchema,
  date: z.string().refine(isValidDate, 'Informe a data'),
  tagId: tagIdSchema,
  description: descriptionSchema,
})

/** O que a tela envia (descrição como digitada). */
export type TransactionInput = z.input<typeof transactionInputSchema>
/** O que é gravado (descrição sem espaços nas pontas). */
export type TransactionValues = z.output<typeof transactionInputSchema>
