import { createRadioGroup } from '@/components/ui/createRadioGroup'
import type { ViewGranularity } from '@/domain/periodViews'
import { GRANULARITY_LABELS } from '@/features/views/viewTexts'
import { useUiStore } from '@/stores/uiStore'

const GranularityRadio = createRadioGroup<ViewGranularity>()

const GRANULARITIES: readonly ViewGranularity[] = ['day', 'week', 'month', 'year']

/** RF-05 — seletor Dia | Semana | Mês | Ano; a data de referência continua a mesma. */
export function GranularityPicker() {
  const granularity = useUiStore((state) => state.viewGranularity)
  const setGranularity = useUiStore((state) => state.setGranularity)

  return (
    <GranularityRadio.Root
      legend="Período"
      value={granularity}
      onValueChange={setGranularity}
      variant="segmented"
    >
      {GRANULARITIES.map((value) => (
        <GranularityRadio.Option key={value} value={value}>
          {GRANULARITY_LABELS[value]}
        </GranularityRadio.Option>
      ))}
    </GranularityRadio.Root>
  )
}
