import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { SUGGESTED_TAG_COLORS } from '@/domain/tags'
import { tagInputSchema, type TagInput, type TagValues } from '@/domain/tagSchema'
import type { Tag } from '@/domain/types'
import {
  DUPLICATE_TAG_NAME_MESSAGE,
  SAVE_TAG_FAILED_MESSAGE,
  TAG_NOT_FOUND_MESSAGE,
} from '@/features/tags/tagTexts'
import {
  createTag,
  DuplicateTagNameError,
  TagNotFoundError,
  updateTag,
} from '@/repositories/tagsRepository'

// Tag nova começa com a 1ª cor da paleta, que o usuário troca (D-32).
const DEFAULT_COLOR = SUGGESTED_TAG_COLORS[0].hex

interface UseTagFormOptions {
  /** Tag em edição; ausente ao criar. */
  tag?: Tag
  onSaved: () => void
}

/** RF-03 — formulário de criar/editar tag (React Hook Form + Zod). */
export function useTagForm({ tag, onSaved }: UseTagFormOptions) {
  const form = useForm<TagInput, unknown, TagValues>({
    resolver: zodResolver(tagInputSchema),
    defaultValues: { name: tag?.name ?? '', color: tag?.color ?? DEFAULT_COLOR },
  })

  const submit = form.handleSubmit(async (values) => {
    try {
      if (tag) await updateTag(tag.id, values)
      else await createTag(values)
      onSaved()
    } catch (error) {
      if (error instanceof DuplicateTagNameError) {
        // CA-03.4 — erro abaixo do campo nome.
        form.setError('name', { message: DUPLICATE_TAG_NAME_MESSAGE }, { shouldFocus: true })
        return
      }
      const message =
        error instanceof TagNotFoundError ? TAG_NOT_FOUND_MESSAGE : SAVE_TAG_FAILED_MESSAGE
      form.setError('root', { message })
    }
  })

  return { form, submit }
}
