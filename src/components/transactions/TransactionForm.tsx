import { useState, type ReactNode } from 'react'
import { Controller, useWatch } from 'react-hook-form'
import { dateHintText } from '@/components/recurrings/recurringTexts'
import { CreateTagDialog } from '@/components/tags/CreateTagDialog'
import { TagPicker } from '@/components/tags/TagPicker'
import { InstallmentFields } from '@/components/transactions/InstallmentFields'
import { NoTagsNotice } from '@/components/transactions/NoTagsNotice'
import {
  INSTALLMENT_FIRST_DATE_LABEL,
  INSTALLMENT_TOTAL_LABEL,
} from '@/components/transactions/transactionTexts'
import { useTransactionForm } from '@/components/transactions/useTransactionForm'
import { Button } from '@/components/ui/Button'
import { createRadioGroup } from '@/components/ui/createRadioGroup'
import { DateInput } from '@/components/ui/DateInput'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { Field } from '@/components/ui/Field'
import { MoneyInput } from '@/components/ui/MoneyInput'
import { TextInput } from '@/components/ui/TextInput'
import { Toast } from '@/components/ui/Toast'
import type { Transaction, TransactionType } from '@/domain/types'
import { useTags } from '@/repositories/tagsRepository'

const TypeRadio = createRadioGroup<TransactionType>()

interface TransactionFormProps {
  /** Lançamento em edição ("Salvar"); ausente ao criar ("Lançar"). */
  transaction?: Transaction
  onUpdated?: (transaction: Transaction) => void
  /** Ação extra ao lado do botão principal, ex.: "Excluir" na edição. */
  extraAction?: ReactNode
  /** RF-08 / D-53 — opção "Parcelado": só no formulário completo de "Novo lançamento". */
  allowInstallments?: boolean
}

/**
 * RF-01 — formulário de lançamento, o mesmo no Início (rápido), em "Novo lançamento" (com a
 * opção "Parcelado" — RF-08) e na edição. Princípio 16: o botão principal só fica ativo com
 * tudo válido e fora do envio.
 */
export function TransactionForm({
  transaction,
  onUpdated,
  extraAction,
  allowInstallments = false,
}: TransactionFormProps) {
  const {
    form,
    submit,
    saveError,
    savedMessage,
    isEditing,
    occurrencePeriod,
    typeLockReason,
    canSubmit,
  } = useTransactionForm({
    transaction,
    onUpdated,
  })
  const { control } = form
  const type = useWatch({ control, name: 'type' })
  const isInstallment = useWatch({ control, name: 'isInstallment' })
  // D-06 — parcelamento só para saídas; nunca na edição de um lançamento.
  const canInstall = allowInstallments && !isEditing && type === 'expense'
  const tags = useTags()
  const [isCreatingTag, setIsCreatingTag] = useState(false)

  // CA-01.7 — a tag criada pelo atalho já fica escolhida; o resto do que foi digitado fica.
  const selectCreatedTag = (tagId: string) => {
    setIsCreatingTag(false)
    form.setValue('tagId', tagId, { shouldDirty: true, shouldValidate: true })
  }

  return (
    <>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <TypeRadio.Root
              variant="segmented"
              legend="Tipo"
              value={field.value}
              onValueChange={(value) => {
                field.onChange(value)
                // Entrada não parcela (D-06): a opção some e fica desligada.
                if (value === 'income')
                  form.setValue('isInstallment', false, { shouldValidate: true })
                void form.trigger('amountCents')
              }}
              disabled={typeLockReason !== null}
            >
              <TypeRadio.Option value="expense">Saída</TypeRadio.Option>
              <TypeRadio.Option value="income">Entrada</TypeRadio.Option>
            </TypeRadio.Root>
          )}
        />
        {typeLockReason && (
          <p className="-mt-2 text-sm text-slate-600 dark:text-slate-300">{typeLockReason}</p>
        )}

        {canInstall && (
          <InstallmentFields
            control={control}
            onInstallmentChange={() => void form.trigger('amountCents')}
          />
        )}

        <Controller
          control={control}
          name="amountCents"
          render={({ field, fieldState }) => (
            <Field error={fieldState.error?.message}>
              <Field.Label>{isInstallment ? INSTALLMENT_TOTAL_LABEL : 'Valor'}</Field.Label>
              <MoneyInput {...field} />
              <Field.Error />
            </Field>
          )}
        />

        <Controller
          control={control}
          name="date"
          render={({ field, fieldState }) => (
            <Field
              error={fieldState.error?.message}
              hint={occurrencePeriod ? dateHintText(occurrencePeriod) : undefined}
            >
              <Field.Label>{isInstallment ? INSTALLMENT_FIRST_DATE_LABEL : 'Data'}</Field.Label>
              <DateInput {...field} />
              <Field.Hint />
              <Field.Error />
            </Field>
          )}
        />

        {/* Sem nada enquanto as tags carregam, para o aviso de "nenhuma tag" não piscar. */}
        {tags && (
          <Controller
            control={control}
            name="tagId"
            render={({ field, fieldState }) => (
              <TagPicker
                {...field}
                tags={tags}
                error={fieldState.error?.message}
                emptyState={<NoTagsNotice onCreateTag={() => setIsCreatingTag(true)} />}
              />
            )}
          />
        )}

        {/* Controlado (e não `register`): o `reset` depois de "Lançar" precisa limpar o campo,
            e o React Compiler memoiza o `ref` do `register`, que não seria registrado de novo. */}
        <Controller
          control={control}
          name="description"
          render={({ field, fieldState }) => (
            <Field error={fieldState.error?.message}>
              <Field.Label>Descrição</Field.Label>
              <TextInput autoComplete="off" enterKeyHint="done" {...field} />
              <Field.Error />
            </Field>
          )}
        />

        {saveError && <ErrorAlert>{saveError}</ErrorAlert>}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end *:w-full sm:*:w-auto">
          {extraAction}
          <Button variant="primary" type="submit" disabled={!canSubmit}>
            {isEditing ? 'Salvar' : 'Lançar'}
          </Button>
        </div>
      </form>

      <CreateTagDialog
        open={isCreatingTag}
        onCreated={(tag) => selectCreatedTag(tag.id)}
        onClose={() => setIsCreatingTag(false)}
      />
      <Toast message={savedMessage} />
    </>
  )
}
