import { Link } from 'react-router'
import { Notice } from '@/components/ui/Notice'
import {
  daysSinceLastBackup,
  describeLastBackup,
  shouldShowBackupReminder,
} from '@/domain/backupReminder'
import type { DateString } from '@/domain/types'
import { LastBackupLine } from '@/features/home/LastBackupLine'
import { useLastBackupAt } from '@/repositories/settingsRepository'
import { useTransactionCount } from '@/repositories/transactionsRepository'

interface BackupReminderProps {
  today: DateString
}

/**
 * RF-10 "Lembrete" / D-11 / D-48 (c) — "Último backup: …" sempre no topo do Início, em um só
 * lugar: com aviso (nunca houve backup ou 7 dias ou mais, e pelo menos um lançamento) a frase
 * vai dentro do aviso com o atalho "Fazer backup"; sem aviso, numa linha discreta. Assim a
 * frase nunca aparece duas vezes. Só lê a data e a contagem: a criptografia fica na tela de
 * backup, carregada sob demanda (D-41).
 */
export function BackupReminder({ today }: BackupReminderProps) {
  const lastBackupAt = useLastBackupAt()
  const transactionCount = useTransactionCount()
  // Enquanto carrega, nada aparece: nem "nunca" antes de a data chegar, nem a linha antes de
  // saber se o lugar é do aviso.
  if (lastBackupAt === undefined || transactionCount === undefined) return null

  const lastBackupText = describeLastBackup(daysSinceLastBackup(lastBackupAt, today))
  if (!shouldShowBackupReminder({ lastBackupAt, today, transactionCount })) {
    return <LastBackupLine>{lastBackupText}</LastBackupLine>
  }

  return (
    <Notice variant="subtle">
      <Notice.Message>{lastBackupText}. Faça um backup para não perder seus dados.</Notice.Message>
      <Link
        to="/ajustes/backup"
        className="flex min-h-11 shrink-0 items-center font-semibold text-blue-700 underline dark:text-blue-300"
      >
        Fazer backup
      </Link>
    </Notice>
  )
}
