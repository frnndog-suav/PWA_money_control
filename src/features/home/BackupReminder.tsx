import { Link } from 'react-router'
import { Notice } from '@/components/ui/Notice'
import {
  daysSinceLastBackup,
  describeLastBackup,
  shouldShowBackupReminder,
} from '@/domain/backupReminder'
import type { DateString } from '@/domain/types'
import { useLastBackupAt } from '@/repositories/settingsRepository'
import { useTransactionCount } from '@/repositories/transactionsRepository'

interface BackupReminderProps {
  today: DateString
}

/**
 * RF-10 "Lembrete" / D-11 — aviso discreto com atalho para o backup quando nunca houve backup
 * ou já se passaram 7 dias ou mais, desde que exista pelo menos um lançamento. Só lê a data e
 * a contagem: a criptografia fica na tela de backup, carregada sob demanda (D-41).
 */
export function BackupReminder({ today }: BackupReminderProps) {
  const lastBackupAt = useLastBackupAt()
  const transactionCount = useTransactionCount()
  // Enquanto carrega, nada aparece (o aviso não pisca ao abrir).
  if (lastBackupAt === undefined || transactionCount === undefined) return null
  if (!shouldShowBackupReminder({ lastBackupAt, today, transactionCount })) return null

  return (
    <Notice variant="subtle">
      <Notice.Message>
        {describeLastBackup(daysSinceLastBackup(lastBackupAt, today))}. Faça um backup para não
        perder seus dados.
      </Notice.Message>
      <Link
        to="/ajustes/backup"
        className="flex min-h-11 shrink-0 items-center font-semibold text-blue-700 underline dark:text-blue-300"
      >
        Fazer backup
      </Link>
    </Notice>
  )
}
