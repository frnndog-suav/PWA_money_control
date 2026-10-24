import '@/features/charts/chart/chartSetup'
import { GranularityPicker } from '@/components/periods/GranularityPicker'
import { PeriodNavigator } from '@/components/periods/PeriodNavigator'
import { TodayButton } from '@/components/periods/TodayButton'
import { usePeriodView } from '@/components/periods/usePeriodView'
import { EmptyState } from '@/components/ui/EmptyState'
import { Notice } from '@/components/ui/Notice'
import { Page } from '@/components/ui/Page'
import { isChartGranularity } from '@/domain/charts'
import { ChartList } from '@/features/charts/ChartList'
import { CHARTS_DAY_NOTICE, NO_PERIOD_TRANSACTIONS_MESSAGE } from '@/features/charts/chartTexts'

/**
 * RF-06 — gráficos do período escolhido nas Visões (CA-06.1): os mesmos controles e o mesmo
 * estado no Zustand (D-50). Na granularidade Dia não há gráficos; um aviso indica as outras.
 */
export function ChartsPage() {
  const view = usePeriodView()
  const { granularity, range, transactions } = view

  return (
    <Page>
      <Page.Header trailing={<TodayButton />}>Gráficos</Page.Header>
      <GranularityPicker />
      <PeriodNavigator granularity={granularity} title={view.title} />
      {!isChartGranularity(granularity) && (
        <Notice variant="subtle">
          <Notice.Message>{CHARTS_DAY_NOTICE}</Notice.Message>
        </Notice>
      )}
      {/* Sem nada enquanto carrega, para o estado vazio não piscar. */}
      {isChartGranularity(granularity) && transactions?.length === 0 && (
        <EmptyState>{NO_PERIOD_TRANSACTIONS_MESSAGE}</EmptyState>
      )}
      {isChartGranularity(granularity) && transactions && transactions.length > 0 && (
        // CA-06.8 — outra `key` a cada período ou granularidade: as seleções voltam ao início.
        <ChartList
          key={`${granularity}:${range.start}`}
          granularity={granularity}
          range={range}
          transactions={transactions}
        />
      )}
    </Page>
  )
}
