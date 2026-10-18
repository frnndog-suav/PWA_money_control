import { BackLink } from '@/components/ui/BackLink'
import { Page } from '@/components/ui/Page'

export function RecurringsPage() {
  return (
    <Page>
      <Page.Header leading={<BackLink fallbackTo="/ajustes" />}>Recorrentes</Page.Header>
    </Page>
  )
}
