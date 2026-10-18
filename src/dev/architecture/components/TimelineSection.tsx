import { useState } from 'react'
import { TIMELINE } from '@/dev/architecture/data/timeline'
import { Section } from '@/dev/architecture/components/Section'
import { TimelineEntryCard } from '@/dev/architecture/components/TimelineEntryCard'
import { phaseLabel, TYPE_LABELS } from '@/dev/architecture/components/timelineLabels'
import type { TimelinePhase, TimelineType } from '@/dev/architecture/types'

const ALL = 'all'

// Mais recente no topo; no mesmo dia, a última entrada escrita vem primeiro.
const entries = TIMELINE.map((entry, index) => ({ entry, index }))
  .sort((a, b) => b.entry.date.localeCompare(a.entry.date) || b.index - a.index)
  .map(({ entry }) => entry)

const phases: TimelinePhase[] = [...new Set(TIMELINE.map((e) => e.phase))]
const types = Object.keys(TYPE_LABELS) as TimelineType[]
const uncommittedCount = TIMELINE.filter((e) => !e.committed).length

const selectClass =
  'min-h-11 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-600 dark:bg-slate-900'

export function TimelineSection() {
  const [phase, setPhase] = useState<string>(ALL)
  const [type, setType] = useState<string>(ALL)
  const visible = entries.filter(
    (e) => (phase === ALL || String(e.phase) === phase) && (type === ALL || e.type === type),
  )

  return (
    <Section
      id="timeline"
      title="Linha do tempo"
      description={`Entregas desde o primeiro commit (timeline.ts, com os commits do git lidos pelo scanner). ${uncommittedCount} entrega(s) ainda não commitada(s) aparecem com borda amarela.`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          Fase
          <select value={phase} onChange={(e) => setPhase(e.target.value)} className={selectClass}>
            <option value={ALL}>Todas</option>
            {phases.map((p) => (
              <option key={p} value={String(p)}>
                {phaseLabel(p)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          Tipo
          <select value={type} onChange={(e) => setType(e.target.value)} className={selectClass}>
            <option value={ALL}>Todos</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t].text}
              </option>
            ))}
          </select>
        </label>
        <span className="text-xs text-slate-500">
          {visible.length} de {entries.length} entradas
        </span>
      </div>
      <ol className="flex flex-col gap-3 border-l-2 border-slate-200 pl-3 dark:border-slate-700">
        {visible.map((entry) => (
          <li key={entry.id}>
            <TimelineEntryCard entry={entry} />
          </li>
        ))}
      </ol>
    </Section>
  )
}
