import { BackLink } from '@/components/ui/BackLink'
import { Page } from '@/components/ui/Page'

export function TransactionDetailPage() {
  return (
    <Page>
      <Page.Header leading={<BackLink fallbackTo="/lancamentos" />}>Lançamento</Page.Header>
    </Page>
  )
}
