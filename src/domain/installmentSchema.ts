import { z } from 'zod'
import { isValidDate } from '@/domain/dates'
import { MAX_INSTALLMENTS, MIN_INSTALLMENTS } from '@/domain/installments'
import {
  amountCentsSchema,
  descriptionSchema,
  tagIdSchema,
  transactionInputSchema,
} from '@/domain/transactionSchema'

// RF-08 — validação do parcelamento (formulário e repositório).

export const INSTALLMENT_COUNT_MESSAGE = `Informe de ${MIN_INSTALLMENTS} a ${MAX_INSTALLMENTS} parcelas`
export const TOTAL_TOO_SMALL_MESSAGE = 'O valor total precisa ter pelo menos R$ 0,01 por parcela'
export const INSTALLMENT_EXPENSE_ONLY_MESSAGE = 'Parcelamento só para saídas'

const installmentCountSchema = z
  .number({ error: INSTALLMENT_COUNT_MESSAGE })
  .int(INSTALLMENT_COUNT_MESSAGE)
  .min(MIN_INSTALLMENTS, INSTALLMENT_COUNT_MESSAGE)
  .max(MAX_INSTALLMENTS, INSTALLMENT_COUNT_MESSAGE)

/** RF-08 — valor total, número de parcelas, data da 1ª parcela, tag e descrição. */
export const installmentInputSchema = z
  .object({
    totalCents: amountCentsSchema,
    count: installmentCountSchema,
    firstDate: z.string().refine(isValidDate, 'Informe a data'),
    tagId: tagIdSchema,
    description: descriptionSchema,
  })
  .refine((input) => input.totalCents >= input.count, {
    message: TOTAL_TOO_SMALL_MESSAGE,
    path: ['totalCents'],
  })

export type InstallmentInput = z.input<typeof installmentInputSchema>

/**
 * Formulário de lançamento com a opção "Parcelado" (RF-08 / D-53): com ela ligada, o valor é
 * o total, a data é a da 1ª parcela, o tipo precisa ser Saída (D-06) e o número de parcelas
 * vai de 2 a 48. Desligada, vale só o `transactionInputSchema`.
 */
export const transactionFormSchema = transactionInputSchema
  .extend({ isInstallment: z.boolean(), installmentCount: z.number() })
  .superRefine((input, context) => {
    if (!input.isInstallment) return
    if (input.type !== 'expense') {
      context.addIssue({
        code: 'custom',
        message: INSTALLMENT_EXPENSE_ONLY_MESSAGE,
        path: ['type'],
      })
    }
    if (!installmentCountSchema.safeParse(input.installmentCount).success) {
      context.addIssue({
        code: 'custom',
        message: INSTALLMENT_COUNT_MESSAGE,
        path: ['installmentCount'],
      })
      return
    }
    if (input.amountCents < input.installmentCount) {
      context.addIssue({ code: 'custom', message: TOTAL_TOO_SMALL_MESSAGE, path: ['amountCents'] })
    }
  })

export type TransactionFormInput = z.input<typeof transactionFormSchema>
export type TransactionFormValues = z.output<typeof transactionFormSchema>
