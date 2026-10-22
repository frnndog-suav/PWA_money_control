import { foldText } from '@/domain/text'
import type { Tag } from '@/domain/types'

// RF-03 — regras puras das tags: chave de unicidade, paleta e ordenação. A validação
// (zod) fica em tagSchema.ts.

// D-35: contado em unidades UTF-16 (`String.length`); um emoji simples conta como 2.
export const TAG_NAME_MAX_LENGTH = 30

/**
 * §6.3 — `nameKey`: minúsculas, sem acentos e sem espaços nas pontas, para a unicidade
 * "Mercado" = "mercado" = " Mércado " (RF-03). O trim vem depois de tirar os acentos para uma
 * marca solta na ponta não deixar espaço (e a função ser idempotente).
 */
export function toTagNameKey(name: string): string {
  return foldText(name).trim()
}

export interface SuggestedTagColor {
  /** Nome em pt-BR, usado como rótulo acessível do botão da paleta. */
  label: string
  hex: string
}

/**
 * RF-03 — 12 cores sugeridas (D-32): tons médios, distintos entre si e visíveis sobre o
 * fundo claro e o escuro; com o texto de `readableTextColor` todas passam do contraste AA.
 */
export const SUGGESTED_TAG_COLORS: readonly SuggestedTagColor[] = [
  { label: 'Vermelho', hex: '#DC2626' },
  { label: 'Laranja', hex: '#EA580C' },
  { label: 'Amarelo', hex: '#CA8A04' },
  { label: 'Verde-limão', hex: '#65A30D' },
  { label: 'Verde', hex: '#16A34A' },
  { label: 'Verde-água', hex: '#0D9488' },
  { label: 'Ciano', hex: '#0891B2' },
  { label: 'Azul', hex: '#2563EB' },
  { label: 'Anil', hex: '#4F46E5' },
  { label: 'Roxo', hex: '#9333EA' },
  { label: 'Rosa', hex: '#DB2777' },
  { label: 'Cinza', hex: '#64748B' },
]

/** Cor sugerida com a mesma grafia (sem diferenciar maiúsculas), ou `undefined`. */
export function findSuggestedTagColor(hex: string): SuggestedTagColor | undefined {
  const upperHex = hex.toUpperCase()
  return SUGGESTED_TAG_COLORS.find((color) => color.hex === upperHex)
}

// CA-03.5 — ordem alfabética do português: "Água" entre "Academia" e "Banco".
const nameCollator = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true })

/** Nova lista ordenada pelo nome (a original não é alterada). */
export function sortByTagName<T>(items: readonly T[], getTag: (item: T) => Tag): T[] {
  return items.toSorted((a, b) => nameCollator.compare(getTag(a).name, getTag(b).name))
}

/** D-02 — registros que usam a tag e impedem a exclusão (CA-03.2). */
export interface TagUsage {
  transactions: number
  recurrings: number
  installmentGroups: number
}

export function isTagInUse(usage: TagUsage): boolean {
  return usage.transactions + usage.recurrings + usage.installmentGroups > 0
}
