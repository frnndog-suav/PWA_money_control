import { BackLink } from '@/components/ui/BackLink'
import { Page } from '@/components/ui/Page'

export function RecurringDetailPage() {
  return (
    <Page>
      <Page.Header leading={<BackLink fallbackTo="/ajustes/recorrentes" />}>Recorrente</Page.Header>
    </Page>
  )
}
