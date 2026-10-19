import { lazy, Suspense } from 'react'
import { BackLink } from '@/components/ui/BackLink'
import { InfoList } from '@/components/ui/InfoList'
import { Page } from '@/components/ui/Page'
import { describePersistence, describeStorageUsage } from '@/features/settings/storageStatusTexts'
import { useStorageStatus } from '@/features/settings/useStorageStatus'
import { APP_VERSION } from '@/lib/appVersion'
import { SCHEMA_VERSION } from '@/repositories/databaseInfo'

/**
 * §6.11 — ferramentas de dados de exemplo, só em desenvolvimento. O import dinâmico fica
 * depois do guard: em produção `import.meta.env.DEV` vira `false`, o resto da função é
 * código morto e src/dev não entra no build (conferir no dist/).
 */
function loadSampleDataTools() {
  if (!import.meta.env.DEV) return null
  return lazy(() => import('@/dev/sampleData/SampleDataTools'))
}

const SampleDataTools = loadSampleDataTools()

// RF-11 / CA-11.4 / CA-11.5 — versão do app, do esquema e status do armazenamento.
export function AboutPage() {
  const storageStatus = useStorageStatus()

  return (
    <Page>
      <Page.Header leading={<BackLink fallbackTo="/ajustes" />}>Sobre</Page.Header>
      <Page.Body>
        <section className="flex flex-col gap-3">
          <InfoList>
            <InfoList.Item label="Versão do app">{APP_VERSION}</InfoList.Item>
            <InfoList.Item label="Versão do esquema do banco">{SCHEMA_VERSION}</InfoList.Item>
            <InfoList.Item label="Espaço usado">
              {describeStorageUsage(storageStatus)}
            </InfoList.Item>
          </InfoList>
          <p role="status" className="px-1">
            {describePersistence(storageStatus)}
          </p>
        </section>
        {SampleDataTools && (
          <Suspense fallback={null}>
            <SampleDataTools />
          </Suspense>
        )}
      </Page.Body>
    </Page>
  )
}
