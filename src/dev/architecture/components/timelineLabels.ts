import type { BadgeVariant } from '@/dev/architecture/components/Badge'
import type { TimelinePhase, TimelineType } from '@/dev/architecture/types'

export const TYPE_LABELS: Readonly<Record<TimelineType, { text: string; variant: BadgeVariant }>> =
  {
    feature: { text: 'feature', variant: 'ok' },
    fix: { text: 'fix', variant: 'danger' },
    refactor: { text: 'refactor', variant: 'info' },
    config: { text: 'config', variant: 'neutral' },
    docs: { text: 'docs', variant: 'neutral' },
    test: { text: 'test', variant: 'info' },
    decision: { text: 'decisão', variant: 'warn' },
  }

export const phaseLabel = (phase: TimelinePhase) =>
  phase === 'pre' ? 'antes da Fase 0' : `Fase ${phase}`
