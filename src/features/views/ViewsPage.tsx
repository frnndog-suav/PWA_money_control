import { useRef } from 'react'
import { GranularityPicker } from '@/components/periods/GranularityPicker'
import { PeriodNavigator } from '@/components/periods/PeriodNavigator'
import { TodayButton } from '@/components/periods/TodayButton'
import { usePeriodView } from '@/components/periods/usePeriodView'
import { Page } from '@/components/ui/Page'
import type { ViewGranularity } from '@/domain/periodViews'
import type { DateString } from '@/domain/types'
import { PeriodDetail } from '@/features/views/PeriodDetail'
import { PeriodSummaryCard } from '@/features/views/PeriodSummaryCard'
import { useUiStore } from '@/stores/uiStore'

/**
 * RF-05 — visões por período: seletor de granularidade, setas e "Hoje", cartão de resumo e o
 * detalhamento (Ano → Mês → Dia; Semana → Dia). O período fica no Zustand (CA-05.4).
 */
export function ViewsPage() {
  const view = usePeriodView()
  const openPeriod = useUiStore((state) => state.openPeriod)
  const titleRef = useRef<HTMLHeadingElement>(null)

  const handleOpenPeriod = (granularity: ViewGranularity, anchorDate: DateString) => {
    openPeriod(granularity, anchorDate)
    // A linha tocada some com a troca de visão; o foco vai para o título do novo período.
    titleRef.current?.focus()
  }

  return (
    <Page>
      <Page.Header trailing={<TodayButton />}>Visões</Page.Header>
      <GranularityPicker />
      <PeriodNavigator granularity={view.granularity} title={view.title} titleRef={titleRef} />
      <PeriodSummaryCard totals={view.totals} />
      {/* Sem nada enquanto carrega, para o estado vazio não piscar. */}
      {view.transactions && (
        <PeriodDetail
          granularity={view.granularity}
          range={view.range}
          transactions={view.transactions}
          onOpenPeriod={handleOpenPeriod}
        />
      )}
    </Page>
  )
}
