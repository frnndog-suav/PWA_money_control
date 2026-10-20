import type { ReactNode } from 'react'
import { Controller, useWatch } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { TagChip } from '@/components/ui/TagChip'
import { TextInput } from '@/components/ui/TextInput'
import type { Tag } from '@/domain/types'
import { TagColorPicker } from '@/components/tags/TagColorPicker'
import { useTagForm } from '@/components/tags/useTagForm'

interface TagFormProps {
  /** Tag em edição; ausente ao criar. */
  tag?: Tag
  onSaved: (tag: Tag) => void
  onCancel: () => void
  /** Ação extra no rodapé, ex.: "Excluir tag" na edição. */
  extraAction?: ReactNode
  /** Aviso extra no fim do formulário, ex.: falha ao conferir o uso antes de excluir. */
  notice?: ReactNode
}

/** RF-03 / CA-03.1 / CA-03.4 / princípio 16 — campos da tag, prévia do chip e ações, dentro de um Modal. */
export function TagForm({ tag, onSaved, onCancel, extraAction, notice }: TagFormProps) {
  const { form, submit, saveError, canSubmit } = useTagForm({ tag, onSaved })
  const { control, register, formState } = form
  const [name, color] = useWatch({ control, name: ['name', 'color'] })

  return (
    <form onSubmit={submit} noValidate className="contents">
      <Modal.Body>
        <Field error={formState.errors.name?.message}>
          <Field.Label>Nome</Field.Label>
          <TextInput autoComplete="off" enterKeyHint="done" {...register('name')} />
          <Field.Error />
        </Field>

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

        {saveError && <ErrorAlert>{saveError}</ErrorAlert>}
        {notice}
      </Modal.Body>

      <Modal.Actions>
        {extraAction}
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="primary" type="submit" disabled={!canSubmit}>
          Salvar
        </Button>
      </Modal.Actions>
    </form>
  )
}
