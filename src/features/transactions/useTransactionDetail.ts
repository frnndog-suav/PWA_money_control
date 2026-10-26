import { useState } from 'react'
import { useGoBack } from '@/components/ui/useGoBack'
import type { InstallmentDeleteScope } from '@/domain/installments'
import { deleteInstallments } from '@/repositories/installmentsRepository'
import {
  deleteConfirmedTransaction,
  type AfterConfirmedDelete,
} from '@/repositories/recurringsRepository'
import { deleteTransaction, useTransaction } from '@/repositories/transactionsRepository'

export const DELETE_TRANSACTION_FAILED_MESSAGE =
  'Não foi possível excluir o lançamento. Tente de novo.'

// Tela pai quando o lançamento foi aberto direto pela URL (CA-13.2).
const FALLBACK_PATH = '/lancamentos'

/**
 * CA-01.5 / CA-01.6 — editar e excluir; ao terminar, volta para a tela anterior. O confirmado
 * de um recorrente é excluído com a escolha do que fazer com o mês (RF-07); a parcela, com
 * "Só esta", "Esta e as seguintes" ou "Todas as parcelas" (CA-08.4).
 */
export function useTransactionDetail(id: string) {
  const transaction = useTransaction(id)
  const goBack = useGoBack(FALLBACK_PATH)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  // Depois de salvar ou excluir a tela sai; até a navegação terminar, nada de
  // "Lançamento não encontrado" piscando com a lista ao vivo já sem o registro.
  const [isDone, setIsDone] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const finish = () => {
    setIsDone(true)
    goBack()
  }

  const requestDelete = () => {
    setDeleteError(null)
    setIsConfirmingDelete(true)
  }

  const cancelDelete = () => setIsConfirmingDelete(false)

  const runDelete = async (remove: () => Promise<void>) => {
    setDeleteError(null)
    setIsDeleting(true)
    try {
      await remove()
      setIsConfirmingDelete(false)
      finish()
    } catch {
      setDeleteError(DELETE_TRANSACTION_FAILED_MESSAGE)
    } finally {
      setIsDeleting(false)
    }
  }

  return {
    transaction,
    isDone,
    isConfirmingDelete,
    isDeleting,
    deleteError,
    onUpdated: finish,
    requestDelete,
    cancelDelete,
    confirmDelete: () => runDelete(() => deleteTransaction(id)),
    confirmOccurrenceDelete: (afterwards: AfterConfirmedDelete) =>
      runDelete(() => deleteConfirmedTransaction(id, afterwards)),
    confirmInstallmentDelete: (scope: InstallmentDeleteScope) =>
      runDelete(() => deleteInstallments(id, scope)),
  }
}
