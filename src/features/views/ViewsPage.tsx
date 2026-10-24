import { useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Page } from '@/components/ui/Page'
import type { ViewGranularity } from '@/domain/periodViews'
import type { DateString } from '@/domain/types'
import { GranularityPicker } from '@/features/views/GranularityPicker'
import { PeriodDetail } from '@/features/views/PeriodDetail'
import { PeriodNavigator } from '@/features/views/PeriodNavigator'
import { PeriodSummaryCard } from '@/features/views/PeriodSummaryCard'
import { usePeriodView } from '@/features/views/usePeriodView'
import { TODAY_LABEL } from '@/features/views/viewTexts'
import { useUiStore } from '@/stores/uiStore'

/**
 * RF-05 — visões por período: seletor de granularidade, setas e "Hoje", cartão de resumo e o
 * detalhamento (Ano → Mês → Dia; Semana → Dia). O período fica no Zustand (CA-05.4).
 */
export function ViewsPage() {
  const view = usePeriodView()
  const goToday = useUiStore((state) => state.goToday)
  const openPeriod = useUiStore((state) => state.openPeriod)
  const titleRef = useRef<HTMLHeadingElement>(null)

  const handleOpenPeriod = (granularity: ViewGranularity, anchorDate: DateString) => {
    openPeriod(granularity, anchorDate)
    // A linha tocada some com a troca de visão; o foco vai para o título do novo período.
    titleRef.current?.focus()
  }

  return (
    <Page>
      <Page.Header
        trailing={
          <Button variant="secondary" onClick={goToday}>
            {TODAY_LABEL}
          </Button>
        }
      >
        Visões
      </Page.Header>
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
