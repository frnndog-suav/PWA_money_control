import { NOT_PENDING_MESSAGE } from '@/components/recurrings/recurringTexts'
import {
  OccurrenceAlreadyConfirmedError,
  OccurrenceNotPendingError,
} from '@/repositories/recurringsRepository'

/**
 * CA-07.4 — erro ao pular ou desfazer: se a ocorrência deixou de estar pendente (confirmada ou
 * pulada em outra aba), diz isso; senão, a mensagem genérica da ação.
 */
export function skipErrorMessage(error: unknown, fallback: string): string {
  if (
    error instanceof OccurrenceNotPendingError ||
    error instanceof OccurrenceAlreadyConfirmedError
  ) {
    return NOT_PENDING_MESSAGE
  }
  return fallback
}
