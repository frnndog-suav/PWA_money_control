import { Page } from '@/components/ui/Page'
import { SettingsMenu } from '@/features/settings/SettingsMenu'
import { ThemeSection } from '@/features/settings/ThemeSection'

// RF-13 — menu de Ajustes; o tema (RF-09) fica direto nesta tela.
export function SettingsPage() {
  return (
    <Page>
      <Page.Header>Ajustes</Page.Header>
      <Page.Body>
        <SettingsMenu />
        <ThemeSection />
      </Page.Body>
    </Page>
  )
}
