import { BackLink } from '@/components/ui/BackLink'
import { Page } from '@/components/ui/Page'

export function AboutPage() {
  return (
    <Page>
      <Page.Header leading={<BackLink fallbackTo="/ajustes" />}>Sobre</Page.Header>
    </Page>
  )
}
