import { useState } from 'react'
import { Badge } from '@/dev/architecture/components/Badge'
import { CompositionSection } from '@/dev/architecture/components/CompositionSection'
import { DataModelSection } from '@/dev/architecture/components/DataModelSection'
import { DomainSection } from '@/dev/architecture/components/DomainSection'
import { FlowsSection } from '@/dev/architecture/components/FlowsSection'
import { HealthSection } from '@/dev/architecture/components/HealthSection'
import { InspectorContext } from '@/dev/architecture/components/InspectorContext'
import { LayersSection } from '@/dev/architecture/components/LayersSection'
import { ModuleGraphSection } from '@/dev/architecture/components/ModuleGraphSection'
import { ModuleInspector } from '@/dev/architecture/components/ModuleInspector'
import { OverviewSection } from '@/dev/architecture/components/OverviewSection'
import { PackagesSection } from '@/dev/architecture/components/PackagesSection'
import { PwaSection } from '@/dev/architecture/components/PwaSection'
import { RoutesSection } from '@/dev/architecture/components/RoutesSection'
import { SearchBox } from '@/dev/architecture/components/SearchBox'
import { TimelineSection } from '@/dev/architecture/components/TimelineSection'
import { TraceabilitySection } from '@/dev/architecture/components/TraceabilitySection'
import { UiStateSection } from '@/dev/architecture/components/UiStateSection'

// Âncoras na mesma ordem das seções abaixo (ids definidos em cada *Section).
const SECTION_LINKS: readonly { id: string; label: string }[] = [
  { id: 'visao-geral', label: 'Visão geral' },
  { id: 'camadas', label: 'Camadas' },
  { id: 'grafo', label: 'Grafo' },
  { id: 'rotas', label: 'Rotas' },
  { id: 'pwa', label: 'PWA e build' },
  { id: 'composicao', label: 'Composição' },
  { id: 'fluxos', label: 'Fluxos' },
  { id: 'dados', label: 'Dados' },
  { id: 'estado', label: 'Estado' },
  { id: 'dominio', label: 'Domínio' },
  { id: 'rastreabilidade', label: 'Rastreabilidade' },
  { id: 'dependencias', label: 'Dependências' },
  { id: 'timeline', label: 'Linha do tempo' },
  { id: 'saude', label: 'Saúde' },
]

/**
 * §6.12 / D-17 — página interna do desenvolvedor, só em DEV (src/app/devRoutes.tsx).
 * Descreve a estrutura do código; nunca lê dados do usuário.
 */
export default function ArchitecturePage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  return (
    <InspectorContext value={{ selectedId, select: setSelectedId }}>
      <div className="min-h-dvh">
        <header className="px-safe pt-safe sticky top-0 z-20 border-b border-slate-200 bg-white/95 pb-2 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
          <div className="mx-auto flex max-w-[1800px] flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold sm:text-2xl">Arquitetura e linha do tempo</h1>
              <Badge variant="dev">somente DEV</Badge>
            </div>
            <SearchBox />
            <nav aria-label="Seções" className="-mx-1 overflow-x-auto">
              <ul className="flex gap-1 px-1">
                {SECTION_LINKS.map((link) => (
                  <li key={link.id}>
                    <a
                      href={`#${link.id}`}
                      className="flex min-h-9 items-center rounded-full border border-slate-300 px-3 text-xs whitespace-nowrap dark:border-slate-600"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </header>

        <div className="px-safe pb-safe mx-auto max-w-[1800px] gap-6 pt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_26rem]">
          <main
            className={`flex min-w-0 flex-col gap-12 ${selectedId ? 'pb-[72dvh]' : 'pb-8'} lg:pb-8`}
          >
            <OverviewSection />
            <LayersSection />
            <ModuleGraphSection />
            <RoutesSection />
            <PwaSection />
            <CompositionSection />
            <FlowsSection />
            <DataModelSection />
            <UiStateSection />
            <DomainSection />
            <TraceabilitySection />
            <PackagesSection />
            <TimelineSection />
            <HealthSection />
          </main>
          <ModuleInspector />
        </div>
      </div>
    </InspectorContext>
  )
}
