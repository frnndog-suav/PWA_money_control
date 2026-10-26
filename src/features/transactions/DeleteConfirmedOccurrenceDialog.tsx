import { Button } from '@/components/ui/Button'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { Modal } from '@/components/ui/Modal'
import { formatMonthLabel } from '@/domain/dates'
import type { PeriodString } from '@/domain/types'
import type { AfterConfirmedDelete } from '@/repositories/recurringsRepository'

interface DeleteConfirmedOccurrenceDialogProps {
  open: boolean
  description: string
  /** Mês da ocorrência que o lançamento confirmou. */
  period: PeriodString
  onConfirm: (afterwards: AfterConfirmedDelete) => void
  onCancel: () => void
  isDeleting: boolean
  errorMessage: string | null
}

/**
 * RF-07 — excluir o lançamento confirmado de um recorrente: a ocorrência daquele mês volta a
 * ficar pendente ou o mês é pulado.
 */
export function DeleteConfirmedOccurrenceDialog({
  open,
  description,
  period,
  onConfirm,
  onCancel,
  isDeleting,
  errorMessage,
}: DeleteConfirmedOccurrenceDialogProps) {
  const month = formatMonthLabel(period)

  return (
    <Modal open={open} title="Excluir lançamento?" onClose={onCancel}>
      <Modal.Body>
        <p>
          O lançamento “{description}” confirmou o recorrente em {month}. Depois de excluí-lo, o que
          deve acontecer com {month}?
        </p>
        {errorMessage && <ErrorAlert>{errorMessage}</ErrorAlert>}
      </Modal.Body>
      <Modal.Actions>
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="danger-outline" disabled={isDeleting} onClick={() => onConfirm('skip')}>
          Excluir e pular este mês
        </Button>
        <Button variant="danger" disabled={isDeleting} onClick={() => onConfirm('pending')}>
          Excluir e voltar a pendente
        </Button>
      </Modal.Actions>
    </Modal>
  )
}
