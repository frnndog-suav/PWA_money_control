import { useId, type ReactNode } from 'react'
import { Controller, useWatch } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { Modal } from '@/components/ui/Modal'
import { TagChip } from '@/components/ui/TagChip'
import type { Tag } from '@/domain/types'
import { TagColorPicker } from '@/features/tags/TagColorPicker'
import { useTagForm } from '@/features/tags/useTagForm'

interface TagFormProps {
  /** Tag em edição; ausente ao criar. */
  tag?: Tag
  onSaved: () => void
  onCancel: () => void
  /** Ação extra no rodapé, ex.: "Excluir tag" na edição. */
  extraAction?: ReactNode
  /** Aviso extra no fim do formulário, ex.: falha ao conferir o uso antes de excluir. */
  notice?: ReactNode
}

/** RF-03 / CA-03.1 / CA-03.4 — campos da tag, prévia do chip e ações, dentro de um Modal. */
export function TagForm({ tag, onSaved, onCancel, extraAction, notice }: TagFormProps) {
  const { form, submit } = useTagForm({ tag, onSaved })
  const { control, register, formState } = form
  const [name, color] = useWatch({ control, name: ['name', 'color'] })
  const nameId = useId()
  const nameErrorId = useId()
  const nameError = formState.errors.name?.message
  const rootError = formState.errors.root?.message

  return (
    <form onSubmit={submit} noValidate className="contents">
      <Modal.Body>
        <div className="flex flex-col gap-1">
          <label htmlFor={nameId} className="font-semibold">
            Nome
          </label>
          <input
            id={nameId}
            type="text"
            autoComplete="off"
            enterKeyHint="done"
            aria-invalid={nameError ? true : undefined}
            aria-describedby={nameError ? nameErrorId : undefined}
            {...register('name')}
            className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-base aria-invalid:border-red-600 dark:border-slate-600 dark:bg-slate-900 dark:aria-invalid:border-red-400"
          />
          {nameError && (
            <p id={nameErrorId} className="text-sm text-red-700 dark:text-red-300">
              {nameError}
            </p>
          )}
        </div>

        <Controller
          control={control}
          name="color"
          render={({ field }) => <TagColorPicker value={field.value} onChange={field.onChange} />}
        />

        <div className="flex flex-col gap-1">
          <span className="font-semibold">Prévia</span>
          <div>
            <TagChip name={name.trim() || 'Nome da tag'} color={color} overflow="wrap" />
          </div>
        </div>

        {rootError && <ErrorAlert>{rootError}</ErrorAlert>}
        {notice}
      </Modal.Body>

      <Modal.Actions>
        {extraAction}
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="primary" type="submit" disabled={formState.isSubmitting}>
          Salvar
        </Button>
      </Modal.Actions>
    </form>
  )
}
