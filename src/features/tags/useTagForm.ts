import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { SUGGESTED_TAG_COLORS } from '@/domain/tags'
import { tagInputSchema, type TagInput, type TagValues } from '@/domain/tagSchema'
import type { Tag } from '@/domain/types'
import {
  DUPLICATE_TAG_NAME_MESSAGE,
  SAVE_TAG_FAILED_MESSAGE,
  TAG_NOT_FOUND_MESSAGE,
} from '@/features/tags/tagTexts'
import { canSubmitForm, LIVE_VALIDATION } from '@/lib/formSubmit'
import {
  createTag,
  DuplicateTagNameError,
  TagNotFoundError,
  updateTag,
} from '@/repositories/tagsRepository'

// Tag nova começa com a 1ª cor da paleta, que o usuário troca (D-32).
const DEFAULT_COLOR = SUGGESTED_TAG_COLORS[0].hex
// Tipo do erro de nome repetido, que vem do banco e não do schema (CA-03.4).
const DUPLICATE_ERROR_TYPE = 'duplicate'

interface UseTagFormOptions {
  /** Tag em edição; ausente ao criar. */
  tag?: Tag
  onSaved: () => void
}

/** RF-03 / princípio 16 — formulário de criar/editar tag (React Hook Form + Zod). */
export function useTagForm({ tag, onSaved }: UseTagFormOptions) {
  const defaultValues = { name: tag?.name ?? '', color: tag?.color ?? DEFAULT_COLOR }
  const form = useForm<TagInput, unknown, TagValues>({
    ...LIVE_VALIDATION,
    resolver: zodResolver(tagInputSchema),
    defaultValues,
  })
  // Edição abre com dados válidos: o "Salvar" já começa ativo (princípio 16).
  const startsValid = tagInputSchema.safeParse(defaultValues).success
  // Falha ao gravar não é erro de campo: fica fora do `setError` para o "Salvar"
  // continuar ativo e o usuário poder tentar de novo (ver `formSubmit.ts`).
  const [saveError, setSaveError] = useState<string | null>(null)

  // O erro de nome repetido some ao alterar qualquer campo (a cor também), para a mensagem
  // não continuar na tela com o "Salvar" já reativado pelo RHF.
  useEffect(
    () =>
      form.subscribe({
        formState: { values: true },
        callback: () => {
          if (form.getFieldState('name').error?.type === DUPLICATE_ERROR_TYPE) {
            form.clearErrors('name')
          }
        },
      }),
    [form],
  )

  const submit = form.handleSubmit(async (values) => {
    setSaveError(null)
    try {
      if (tag) await updateTag(tag.id, values)
      else await createTag(values)
      onSaved()
    } catch (error) {
      if (error instanceof DuplicateTagNameError) {
        // CA-03.4 — erro abaixo do campo nome; some (e o "Salvar" reativa) ao alterar qualquer campo.
        form.setError(
          'name',
          { type: DUPLICATE_ERROR_TYPE, message: DUPLICATE_TAG_NAME_MESSAGE },
          { shouldFocus: true },
        )
        return
      }
      setSaveError(
        error instanceof TagNotFoundError ? TAG_NOT_FOUND_MESSAGE : SAVE_TAG_FAILED_MESSAGE,
      )
    }
  })

  return { form, submit, saveError, canSubmit: canSubmitForm(form.formState, { startsValid }) }
}
