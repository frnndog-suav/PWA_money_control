import type { ReactNode } from 'react'
import { NOT_CONFIRMED_LABEL } from '@/components/recurrings/recurringTexts'
import { SignedAmount } from '@/components/ui/SignedAmount'
import { TagChip } from '@/components/ui/TagChip'
import type { PendingOccurrence } from '@/domain/recurring'
import type { Tag } from '@/domain/types'

interface PendingOccurrenceItemProps {
  occurrence: PendingOccurrence
  tag: Tag | undefined
  /** CA-07.7 — ocorrência de um mês que já passou e ainda não foi confirmada. */
  isOverdue: boolean
  /** Botões da linha (ex.: "Confirmar" e "Pular"). */
  actions: ReactNode
}

/**
 * RF-07 — uma ocorrência pendente: descrição, tag, valor vigente com sinal (entrada +, saída −)
 * e as ações. "Não confirmada" aparece escrito, não só por cor (RNF-06).
 */
export function PendingOccurrenceItem({
  occurrence,
  tag,
  isOverdue,
  actions,
}: PendingOccurrenceItemProps) {
  const { recurring, amountCents } = occurrence
  const signedCents = recurring.type === 'income' ? amountCents : -amountCents

  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
          <span className="w-full truncate font-medium">{recurring.description}</span>
          <span className="flex flex-wrap items-center gap-2 text-sm">
            {tag && <TagChip name={tag.name} color={tag.color} />}
            {isOverdue && (
              <span className="rounded-full border border-amber-700 px-2 text-amber-800 dark:border-amber-400 dark:text-amber-300">
                {NOT_CONFIRMED_LABEL}
              </span>
            )}
          </span>
        </span>
        <SignedAmount cents={signedCents} />
      </div>
      <div className="flex gap-2 *:flex-1">{actions}</div>
    </li>
  )
}
