import { Controller, useWatch, type Control } from 'react-hook-form'
import {
  INSTALLMENT_COUNT_LABEL,
  INSTALLMENT_OPTION_LABEL,
} from '@/components/transactions/transactionTexts'
import { Checkbox } from '@/components/ui/Checkbox'
import { Field } from '@/components/ui/Field'
import { TextInput } from '@/components/ui/TextInput'
import { splitInstallments } from '@/domain/installments'
import type { TransactionFormInput } from '@/domain/installmentSchema'
import { formatBRL } from '@/domain/money'

interface InstallmentFieldsProps {
  control: Control<TransactionFormInput>
  /**
   * Revalida o valor total: o mínimo de R$ 0,01 por parcela depende do número de parcelas, e o
   * RHF só revalida o campo que mudou (princípio 16 — o erro aparece enquanto o usuário mexe).
   */
  onInstallmentChange: () => void
}

const NON_DIGITS = /\D/g
// Até 48 parcelas: dois dígitos bastam.
const MAX_COUNT_DIGITS = 2

/** "3 parcelas de R$ 33,33" ou, com resto, "3 parcelas: a 1ª de R$ 33,34 e as outras de R$ 33,33". */
function previewText(totalCents: number, count: number): string | undefined {
  try {
    const [first, rest] = splitInstallments(totalCents, count)
    if (first === rest) return `${count} parcelas de ${formatBRL(rest)}`
    return `${count} parcelas: a 1ª de ${formatBRL(first)} e as outras de ${formatBRL(rest)}`
  } catch {
    return undefined // total ou número ainda inválidos: o erro do campo já explica
  }
}

/**
 * RF-08 — opção "Parcelado" (só Saída, só ao criar — D-53) e, ligada, o número de parcelas
 * (2 a 48) com a divisão prevista escrita abaixo do campo.
 */
export function InstallmentFields({ control, onInstallmentChange }: InstallmentFieldsProps) {
  const isInstallment = useWatch({ control, name: 'isInstallment' })
  const totalCents = useWatch({ control, name: 'amountCents' })

  return (
    <>
      <Controller
        control={control}
        name="isInstallment"
        render={({ field }) => (
          <Checkbox
            ref={field.ref}
            name={field.name}
            checked={field.value}
            onChange={(checked) => {
              field.onChange(checked)
              onInstallmentChange()
            }}
            onBlur={field.onBlur}
          >
            {INSTALLMENT_OPTION_LABEL}
          </Checkbox>
        )}
      />
      {isInstallment && (
        <Controller
          control={control}
          name="installmentCount"
          render={({ field, fieldState }) => (
            <Field error={fieldState.error?.message} hint={previewText(totalCents, field.value)}>
              <Field.Label>{INSTALLMENT_COUNT_LABEL}</Field.Label>
              <TextInput
                ref={field.ref}
                name={field.name}
                inputMode="numeric"
                autoComplete="off"
                value={field.value > 0 ? String(field.value) : ''}
                onChange={(event) => {
                  const digits = event.target.value
                    .replace(NON_DIGITS, '')
                    .slice(0, MAX_COUNT_DIGITS)
                  field.onChange(digits === '' ? 0 : Number(digits))
                  onInstallmentChange()
                }}
                onBlur={field.onBlur}
              />
              <Field.Hint />
              <Field.Error />
            </Field>
          )}
        />
      )}
    </>
  )
}
