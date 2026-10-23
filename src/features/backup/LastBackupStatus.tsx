import { useToday } from '@/components/ui/useToday'
import { daysSinceLastBackup, describeLastBackup } from '@/domain/backupReminder'
import { useLastBackupAt } from '@/repositories/settingsRepository'

/** RF-10 — "Último backup: hoje / há N dias / nunca" (dias de calendário locais). */
export function LastBackupStatus() {
  const todayDate = useToday()
  const lastBackupAt = useLastBackupAt()
  // Enquanto o IndexedDB carrega, nada aparece (sem um "nunca" falso).
  if (lastBackupAt === undefined) return null
  return (
    <p className="font-medium">
      {describeLastBackup(daysSinceLastBackup(lastBackupAt, todayDate))}
    </p>
  )
}
