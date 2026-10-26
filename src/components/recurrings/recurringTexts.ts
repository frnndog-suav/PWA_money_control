import { formatMonthLabel } from '@/domain/dates'
import type { PeriodString } from '@/domain/types'

// RF-07 — textos de recorrentes usados por mais de uma tela (pt-BR).

export const CONFIRM_LABEL = 'Confirmar'
export const SKIP_LABEL = 'Pular'
export const UNDO_LABEL = 'Desfazer'
export const NOT_CONFIRMED_LABEL = 'Não confirmada' // CA-07.7
export const PENDING_RECURRINGS_TITLE = 'Recorrentes pendentes'

export const OCCURRENCE_CONFIRMED_MESSAGE = 'Ocorrência confirmada'
export const OCCURRENCE_SKIPPED_MESSAGE = 'Mês pulado.'
export const OCCURRENCE_UNSKIPPED_MESSAGE = 'O mês voltou a ficar pendente.'

export const CONFIRM_FAILED_MESSAGE = 'Não foi possível confirmar. Tente de novo.'
export const ALREADY_CONFIRMED_MESSAGE = 'Esta ocorrência já foi confirmada.'
export const NOT_PENDING_MESSAGE = 'Esta ocorrência não está mais pendente.'
export const RECURRING_TAG_NOT_FOUND_MESSAGE = 'A tag escolhida não existe mais. Escolha outra.'
export const SKIP_FAILED_MESSAGE = 'Não foi possível pular o mês. Tente de novo.'
export const UNSKIP_FAILED_MESSAGE = 'Não foi possível desfazer. Tente de novo.'

export const DATE_INFO_LABEL = 'Por que esta data?'

/** CA-07.8 — balão do "ⓘ" ao lado da data. */
export function dateInfoText(period: PeriodString, isCurrentMonth: boolean): string {
  if (isCurrentMonth) {
    return 'A data sugerida é hoje porque esta ocorrência é do mês atual. Você pode escolher qualquer dia deste mês.'
  }
  return `A data sugerida é o dia 1 porque esta ocorrência é de ${formatMonthLabel(period)}. Escolha o dia em que o lançamento realmente aconteceu, dentro desse mês.`
}

/** CA-07.8 — linha de ajuda sempre visível abaixo do campo de data. */
export function dateHintText(period: PeriodString): string {
  return `Escolha um dia de ${formatMonthLabel(period)}.`
}
