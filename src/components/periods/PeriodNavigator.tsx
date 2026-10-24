import type { Ref } from 'react'
import type { ViewGranularity } from '@/domain/periodViews'
import { NEXT_PERIOD_LABELS, PREVIOUS_PERIOD_LABELS } from '@/components/periods/periodTexts'
import { useUiStore } from '@/stores/uiStore'

interface PeriodNavigatorProps {
  granularity: ViewGranularity
  title: string
  /** Nas Visões, o detalhamento leva o foco ao título, porque a linha tocada some (RNF-06). */
  titleRef?: Ref<HTMLHeadingElement>
}

const ARROW_CLASSES =
  'flex size-11 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-xl font-semibold dark:border-slate-600'

/** RF-05 / RF-06 (D-50) — setas anterior/próximo em volta do título do período (CA-05.3). */
export function PeriodNavigator({ granularity, title, titleRef }: PeriodNavigatorProps) {
  const goPrev = useUiStore((state) => state.goPrev)
  const goNext = useUiStore((state) => state.goNext)

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={PREVIOUS_PERIOD_LABELS[granularity]}
        onClick={goPrev}
        className={ARROW_CLASSES}
      >
        <span aria-hidden="true">‹</span>
      </button>
      {/* aria-live: o leitor de tela anuncia o novo período a cada toque nas setas. */}
      <h2
        ref={titleRef}
        tabIndex={-1}
        aria-live="polite"
        className="flex-1 text-center text-lg font-semibold first-letter:uppercase"
      >
        {title}
      </h2>
      <button
        type="button"
        aria-label={NEXT_PERIOD_LABELS[granularity]}
        onClick={goNext}
        className={ARROW_CLASSES}
      >
        <span aria-hidden="true">›</span>
      </button>
    </div>
  )
}
