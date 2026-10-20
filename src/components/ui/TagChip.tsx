import { readableTextColor } from '@/domain/tagColor'

/** `truncate`: uma linha com reticências (ex.: espaços apertados); `wrap`: nome inteiro, quebrando a linha. */
export type TagChipOverflow = 'truncate' | 'wrap'

interface TagChipProps {
  name: string
  /** `#RRGGBB` */
  color: string
  overflow?: TagChipOverflow
}

const OVERFLOW_CLASSES: Record<TagChipOverflow, { chip: string; name: string }> = {
  truncate: { chip: 'rounded-full', name: 'truncate' },
  // `wrap-anywhere` quebra até um nome de 30 letras sem espaço numa tela de 375 px.
  wrap: { chip: 'rounded-2xl', name: 'min-w-0 wrap-anywhere' },
}

/**
 * CA-03.6 — chip com a cor da tag no fundo e texto preto ou branco pela luminância.
 * O nome está sempre escrito: a cor nunca é a única informação (RNF-06). O contorno leve
 * mantém o chip visível quando a cor é parecida com o fundo da tela (claro ou escuro).
 */
export function TagChip({ name, color, overflow = 'truncate' }: TagChipProps) {
  const classes = OVERFLOW_CLASSES[overflow]
  return (
    <span
      className={`inline-flex max-w-full items-center px-3 py-1 text-sm font-semibold ring-1 ring-black/10 ring-inset dark:ring-white/25 ${classes.chip}`}
      style={{ backgroundColor: color, color: readableTextColor(color) }}
    >
      <span className={classes.name}>{name}</span>
    </span>
  )
}
