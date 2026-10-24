import { Button } from '@/components/ui/Button'
import { TODAY_LABEL } from '@/components/periods/periodTexts'
import { useUiStore } from '@/stores/uiStore'

/** RF-05 — volta ao período que contém hoje, mantendo a granularidade. */
export function TodayButton() {
  const goToday = useUiStore((state) => state.goToday)

  return (
    <Button variant="secondary" onClick={goToday}>
      {TODAY_LABEL}
    </Button>
  )
}
