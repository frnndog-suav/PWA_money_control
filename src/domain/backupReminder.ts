import { differenceInCalendarDays, isValid, parseISO } from 'date-fns'
import { today as localDateOf } from '@/domain/dates'
import type { DateString } from '@/domain/types'

// RF-10 "Lembrete" / D-11 — "Último backup: há N dias" e a regra do aviso na tela inicial.
// Os dias são contados entre datas locais do calendário (princípio 2): um backup às 23h de
// ontem conta "há 1 dia", mesmo com menos de 24 horas.

/** D-11 — dias sem backup a partir dos quais a tela inicial mostra o aviso. */
export const BACKUP_REMINDER_DAYS = 7

/**
 * Dias de calendário entre o último backup (`lastBackupAt`, ISO 8601) e `today`; `null` se
 * nunca houve backup (ou o valor salvo é inválido). Relógio atrasado conta como hoje (0).
 */
export function daysSinceLastBackup(lastBackupAt: string | null, today: DateString): number | null {
  if (lastBackupAt === null) return null
  const backupInstant = parseISO(lastBackupAt)
  if (!isValid(backupInstant)) return null
  const backupDate = localDateOf(backupInstant)
  return Math.max(0, differenceInCalendarDays(parseISO(today), parseISO(backupDate)))
}

/** RF-10 — "Último backup: nunca" / "hoje" / "há 1 dia" / "há N dias". */
export function describeLastBackup(days: number | null): string {
  if (days === null) return 'Último backup: nunca'
  if (days === 0) return 'Último backup: hoje'
  return days === 1 ? 'Último backup: há 1 dia' : `Último backup: há ${days} dias`
}

interface BackupReminderInput {
  lastBackupAt: string | null
  today: DateString
  transactionCount: number
}

/**
 * RF-10 / D-11 — aviso na tela inicial: existe pelo menos um lançamento e nunca houve
 * backup ou já se passaram `BACKUP_REMINDER_DAYS` dias ou mais.
 */
export function shouldShowBackupReminder({
  lastBackupAt,
  today,
  transactionCount,
}: BackupReminderInput): boolean {
  if (transactionCount === 0) return false
  const days = daysSinceLastBackup(lastBackupAt, today)
  return days === null || days >= BACKUP_REMINDER_DAYS
}
