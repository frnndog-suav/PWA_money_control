import { z } from 'zod'
import { TAG_NAME_MAX_LENGTH } from '@/domain/tags'

// RF-03 — validação do formulário e do repositório de tags. Fica fora de `tags.ts` para
// quem só precisa das funções puras (ex.: `toTagNameKey`) não levar o zod junto.

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i

/** Nome sem espaços nas pontas (1 a 30 caracteres) e cor `#RRGGBB`. */
export const tagInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Informe o nome da tag')
    .max(TAG_NAME_MAX_LENGTH, `O nome pode ter no máximo ${TAG_NAME_MAX_LENGTH} caracteres`),
  // Maiúsculas para a cor ter uma só grafia (o <input type="color"> devolve minúsculas).
  color: z
    .string()
    .regex(HEX_COLOR_PATTERN, 'Escolha uma cor')
    .transform((color) => color.toUpperCase()),
})

/** O que a tela envia (nome como digitado). */
export type TagInput = z.input<typeof tagInputSchema>
/** O que é gravado (nome sem espaços nas pontas, cor em maiúsculas). */
export type TagValues = z.output<typeof tagInputSchema>
