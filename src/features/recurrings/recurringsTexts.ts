import { formatMonthLabel } from '@/domain/dates'
import type { RecurringListStatus } from '@/domain/recurring'
import type { PeriodString, TransactionType } from '@/domain/types'

// RF-07 — textos das telas Ajustes → Recorrentes (pt-BR).

export const RECURRINGS_TITLE = 'Recorrentes'
export const NEW_RECURRING_LABEL = 'Novo recorrente'
export const NO_RECURRINGS_MESSAGE =
  'Nenhum recorrente ainda. Crie um para os gastos e entradas que acontecem todo mês.'
export const RECURRING_NOT_FOUND_MESSAGE = 'Recorrente não encontrado'
export const NO_END_LABEL = 'Sem término'

export const RECURRING_UPDATED_MESSAGE = 'Recorrente salvo'
export const AMOUNT_CHANGED_MESSAGE = 'Valor alterado'
export const RECURRING_ENDED_MESSAGE = 'Recorrente encerrado'

export const SAVE_RECURRING_FAILED_MESSAGE = 'Não foi possível salvar o recorrente. Tente de novo.'
export const DELETE_RECURRING_FAILED_MESSAGE =
  'Não foi possível excluir o recorrente. Tente de novo.'

export const TYPE_LABELS: Record<TransactionType, string> = { expense: 'Saída', income: 'Entrada' }

/** CA-07.6 — status do mês atual na lista e nos detalhes. */
export function statusLabel(status: RecurringListStatus, startPeriod: PeriodString): string {
  switch (status) {
    case 'pending':
      return 'Pendente neste mês'
    case 'confirmed':
      return 'Confirmado neste mês'
    case 'skipped':
      return 'Pulado neste mês'
    case 'ended':
      return 'Encerrado'
    case 'upcoming':
      return `Começa em ${formatMonthLabel(startPeriod)}`
  }
}

export function amountSinceLabel(period: PeriodString): string {
  return `desde ${formatMonthLabel(period)}`
}

// Erros de mês (D-51 / §6.5), mostrados no próprio campo enquanto o usuário escolhe.
export const fromBeforeStartMessage = (start: PeriodString) =>
  `O novo valor não pode valer antes do início (${formatMonthLabel(start)}).`
export const fromAfterEndMessage = (end: PeriodString) =>
  `O novo valor não pode valer depois do término (${formatMonthLabel(end)}).`
export const endBeforeStartMessage = (start: PeriodString) =>
  `O término não pode ser antes do início (${formatMonthLabel(start)}).`
export const endBeforeConfirmedMessage = (last: PeriodString) =>
  `O término não pode ser antes de ${formatMonthLabel(last)}, que já foi confirmado.`

export const DELETE_BLOCKED_MESSAGE =
  'Este recorrente tem ocorrências confirmadas e não pode ser excluído. Você pode encerrá-lo: os meses seguintes deixam de aparecer e os lançamentos confirmados continuam.'
