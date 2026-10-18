import { BackLink } from '@/components/ui/BackLink'
import { Page } from '@/components/ui/Page'

export function NewTransactionPage() {
  return (
    <Page>
      <Page.Header leading={<BackLink fallbackTo="/lancamentos" />}>Novo lançamento</Page.Header>
    </Page>
  )
}
