import { BackLink } from '@/components/ui/BackLink'
import { Page } from '@/components/ui/Page'

export function TagsPage() {
  return (
    <Page>
      <Page.Header leading={<BackLink fallbackTo="/ajustes" />}>Tags</Page.Header>
    </Page>
  )
}
