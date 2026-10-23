import { Button } from '@/components/ui/Button'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { InfoList } from '@/components/ui/InfoList'
import { Modal } from '@/components/ui/Modal'
import {
  CONFIRM_IMPORT_LABEL,
  formatBackupDate,
  formatCount,
  REPLACE_WARNING,
  RESTORING_LABEL,
} from '@/features/backup/backupTexts'
import type { BackupSummary } from '@/lib/backupFormat'

interface ConfirmImportDialogProps {
  /** Resumo do backup aberto; `null` mantém o modal fechado. */
  summary: BackupSummary | null
  onConfirm: () => void
  onCancel: () => void
  /** Substituição em andamento: os botões ficam desabilitados. */
  isRestoring: boolean
  errorMessage: string | null
}

/** RF-10 — resumo do backup e o aviso de substituição antes de importar (D-07). */
export function ConfirmImportDialog({
  summary,
  onConfirm,
  onCancel,
  isRestoring,
  errorMessage,
}: ConfirmImportDialogProps) {
  return (
    <Modal open={summary !== null} title="Importar backup?" onClose={onCancel}>
      {summary && (
        <>
          <Modal.Body>
            <InfoList>
              <InfoList.Item label="Data do backup">
                {formatBackupDate(summary.exportedAt)}
              </InfoList.Item>
              <InfoList.Item label="Lançamentos">
                {formatCount(summary.transactionCount, 'lançamento', 'lançamentos')}
              </InfoList.Item>
              <InfoList.Item label="Tags">
                {formatCount(summary.tagCount, 'tag', 'tags')}
              </InfoList.Item>
              <InfoList.Item label="Recorrentes">
                {formatCount(summary.recurringCount, 'recorrente', 'recorrentes')}
              </InfoList.Item>
            </InfoList>
            <p className="font-semibold">{REPLACE_WARNING}</p>
            {errorMessage && <ErrorAlert>{errorMessage}</ErrorAlert>}
          </Modal.Body>
          <Modal.Actions>
            <Button variant="secondary" disabled={isRestoring} onClick={onCancel}>
              Cancelar
            </Button>
            <Button variant="danger" disabled={isRestoring} onClick={onConfirm}>
              {isRestoring ? RESTORING_LABEL : CONFIRM_IMPORT_LABEL}
            </Button>
          </Modal.Actions>
        </>
      )}
    </Modal>
  )
}
