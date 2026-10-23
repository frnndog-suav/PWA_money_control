import { BackLink } from '@/components/ui/BackLink'
import { Page } from '@/components/ui/Page'
import { ExportBackupSection } from '@/features/backup/ExportBackupSection'
import { ImportBackupSection } from '@/features/backup/ImportBackupSection'
import { LastBackupStatus } from '@/features/backup/LastBackupStatus'

// RF-10 — exportar e importar o backup criptografado e a data do último backup. Tela
// carregada sob demanda: a criptografia e o zod do backup ficam fora do pacote principal.
export function BackupPage() {
  return (
    <Page>
      <Page.Header leading={<BackLink fallbackTo="/ajustes" />}>Backup</Page.Header>
      <Page.Body>
        <LastBackupStatus />
        <ExportBackupSection />
        <ImportBackupSection />
      </Page.Body>
    </Page>
  )
}
