import type { TagUsage } from '@/domain/tags'

// RF-03 — textos da tela de tags (pt-BR).

export const DUPLICATE_TAG_NAME_MESSAGE = 'Já existe uma tag com esse nome' // CA-03.4
export const SAVE_TAG_FAILED_MESSAGE = 'Não foi possível salvar a tag. Tente de novo.'
export const TAG_NOT_FOUND_MESSAGE = 'Esta tag não existe mais.'
export const CHECK_TAG_USAGE_FAILED_MESSAGE =
  'Não foi possível verificar se a tag está em uso. Tente de novo.'
export const DELETE_TAG_FAILED_MESSAGE = 'Não foi possível excluir a tag. Tente de novo.'

const countFormatter = new Intl.NumberFormat('pt-BR')
const listFormatter = new Intl.ListFormat('pt-BR', { style: 'long', type: 'conjunction' })

function countLabel(count: number, singular: string, plural: string): string {
  return `${countFormatter.format(count)} ${count === 1 ? singular : plural}`
}

/** CA-03.5 — "Nenhum lançamento", "1 lançamento", "5.000 lançamentos". */
export function formatTransactionCount(count: number): string {
  if (count === 0) return 'Nenhum lançamento'
  return countLabel(count, 'lançamento', 'lançamentos')
}

/** CA-03.2 — "3 lançamentos, 1 recorrente e 2 parcelamentos" (só o que for maior que zero). */
export function formatTagUsage(usage: TagUsage): string {
  const parts = [
    [usage.transactions, 'lançamento', 'lançamentos'],
    [usage.recurrings, 'recorrente', 'recorrentes'],
    [usage.installmentGroups, 'parcelamento', 'parcelamentos'],
  ] as const
  return listFormatter.format(
    parts
      .filter(([count]) => count > 0)
      .map(([count, singular, plural]) => countLabel(count, singular, plural)),
  )
}
