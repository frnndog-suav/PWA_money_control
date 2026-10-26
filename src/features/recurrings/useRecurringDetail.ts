import { useState } from 'react'
import {
  OCCURRENCE_CONFIRMED_MESSAGE,
  OCCURRENCE_SKIPPED_MESSAGE,
  OCCURRENCE_UNSKIPPED_MESSAGE,
  SKIP_FAILED_MESSAGE,
  UNSKIP_FAILED_MESSAGE,
} from '@/components/recurrings/recurringTexts'
import { skipErrorMessage } from '@/components/recurrings/skipErrorMessage'
import { useGoBack } from '@/components/ui/useGoBack'
import { useToast } from '@/components/ui/useToast'
import { useToday } from '@/components/ui/useToday'
import { periodOf } from '@/domain/dates'
import {
  amountFor,
  confirmedOccurrenceKeys,
  lastConfirmedPeriod,
  recurringListStatus,
  type PendingOccurrence,
} from '@/domain/recurring'
import type { PeriodString } from '@/domain/types'
import type { DeleteRecurringStep } from '@/features/recurrings/DeleteRecurringDialog'
import {
  AMOUNT_CHANGED_MESSAGE,
  DELETE_RECURRING_FAILED_MESSAGE,
  RECURRING_ENDED_MESSAGE,
  RECURRING_UPDATED_MESSAGE,
} from '@/features/recurrings/recurringsTexts'
import {
  deleteRecurring,
  RecurringHasConfirmationsError,
  skipOccurrence,
  unskipOccurrence,
  useRecurring,
  useRecurringConfirmations,
} from '@/repositories/recurringsRepository'

export type RecurringDialog = 'edit' | 'amount' | 'end' | null

const LIST_PATH = '/ajustes/recorrentes'

/** RF-07 / CA-07.6 — dados e ações da tela de detalhes de um recorrente. */
export function useRecurringDetail(id: string) {
  const recurring = useRecurring(id)
  const confirmations = useRecurringConfirmations(id)
  const currentPeriod = periodOf(useToday())
  const goBack = useGoBack(LIST_PATH)
  const toast = useToast()
  const [dialog, setDialog] = useState<RecurringDialog>(null)
  const [deleteStep, setDeleteStep] = useState<DeleteRecurringStep | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeleted, setIsDeleted] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<PendingOccurrence | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  const confirmedKeys = confirmedOccurrenceKeys(confirmations ?? [])
  const status = recurring ? recurringListStatus(recurring, currentPeriod, confirmedKeys) : null

  const closeWith = (message: string) => {
    setDialog(null)
    toast.show(message)
  }

  const runAction = async (action: () => Promise<unknown>, success: string, failure: string) => {
    if (isBusy) return
    setActionError(null)
    setIsBusy(true)
    try {
      await action()
      toast.show(success)
    } catch (error) {
      setActionError(skipErrorMessage(error, failure))
    } finally {
      setIsBusy(false)
    }
  }

  const requestDelete = () => {
    setActionError(null)
    setDeleteStep((confirmations?.length ?? 0) > 0 ? 'blocked' : 'confirm')
  }

  const confirmDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteRecurring(id)
      setIsDeleted(true)
      setDeleteStep(null)
      goBack()
    } catch (error) {
      // Confirmado em outra aba entre abrir o modal e excluir: vira o aviso de bloqueio.
      if (error instanceof RecurringHasConfirmationsError) setDeleteStep('blocked')
      else setActionError(DELETE_RECURRING_FAILED_MESSAGE)
    } finally {
      setIsDeleting(false)
    }
  }

  return {
    recurring,
    confirmations,
    currentPeriod,
    status,
    lastConfirmedPeriod: lastConfirmedPeriod(confirmations ?? []),
    isDeleted,
    dialog,
    deleteStep,
    isDeleting,
    actionError,
    /** Pular/desfazer em andamento: os botões ficam desabilitados (toque duplo). */
    isBusy,
    confirming,
    toastMessage: toast.message,
    openDialog: setDialog,
    closeDialog: () => setDialog(null),
    onEdited: () => closeWith(RECURRING_UPDATED_MESSAGE),
    onAmountChanged: () => closeWith(AMOUNT_CHANGED_MESSAGE),
    onEnded: () => closeWith(RECURRING_ENDED_MESSAGE),
    requestDelete,
    confirmDelete,
    cancelDelete: () => setDeleteStep(null),
    endInsteadOfDelete: () => {
      setDeleteStep(null)
      setDialog('end')
    },
    startConfirm: () => {
      if (!recurring) return
      const amountCents = amountFor(recurring, currentPeriod)
      setConfirming({ recurring, period: currentPeriod, amountCents })
    },
    cancelConfirm: () => setConfirming(null),
    onConfirmed: () => {
      setConfirming(null)
      toast.show(OCCURRENCE_CONFIRMED_MESSAGE)
    },
    skip: (period: PeriodString) =>
      runAction(() => skipOccurrence(id, period), OCCURRENCE_SKIPPED_MESSAGE, SKIP_FAILED_MESSAGE),
    undoSkip: (period: PeriodString) =>
      runAction(
        () => unskipOccurrence(id, period),
        OCCURRENCE_UNSKIPPED_MESSAGE,
        UNSKIP_FAILED_MESSAGE,
      ),
  }
}
