import { BackLink } from '@/components/ui/BackLink'
import { Page } from '@/components/ui/Page'

export function BackupPage() {
  return (
    <Page>
      <Page.Header leading={<BackLink fallbackTo="/ajustes" />}>Backup</Page.Header>
    </Page>
  )
}
