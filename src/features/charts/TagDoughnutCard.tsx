import { useRef, useState } from 'react'
import { Doughnut } from 'react-chartjs-2'
import { EmptyState } from '@/components/ui/EmptyState'
import { useOutsidePointerDown } from '@/components/ui/useOutsidePointerDown'
import { formatTenthsPercent, type TagSlice } from '@/domain/charts'
import { addCents, formatBRL } from '@/domain/money'
import { ChartCard } from '@/features/charts/ChartCard'
import { ChartDetailPanel } from '@/features/charts/ChartDetailPanel'
import { TagLegendList } from '@/features/charts/TagLegendList'
import { fadeColor, useChartColors } from '@/features/charts/chart/useChartColors'

interface TagDoughnutCardProps {
  title: string
  slices: TagSlice[]
  /** Ex.: "Total de saídas", mostrado no painel sem seleção. */
  totalLabel: string
  emptyMessage: string
}

// Quanto a fatia selecionada sai do círculo; o mesmo valor de margem evita que ela seja cortada.
const SELECTED_OFFSET = 12

/**
 * RF-06 — rosca por tag com a cor de cada tag (CA-06.3). Tocar numa fatia ou no item da lista
 * seleciona a tag (a fatia sai do círculo e as demais esmaecem); tocar de novo, fora das fatias
 * ou fora do cartão limpa a seleção.
 */
export function TagDoughnutCard({ title, slices, totalLabel, emptyMessage }: TagDoughnutCardProps) {
  const colors = useChartColors()
  const cardRef = useRef<HTMLElement>(null)
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null)
  // Se a tag selecionada sumir do período (dados mudaram ao vivo), a seleção deixa de valer.
  const selected = slices.find((slice) => slice.tagId === selectedTagId)
  useOutsidePointerDown(cardRef, () => setSelectedTagId(null), selected !== undefined)

  const toggle = (tagId: string) =>
    setSelectedTagId((current) => (current === tagId ? null : tagId))

  if (slices.length === 0) {
    return (
      <ChartCard title={title}>
        <EmptyState>{emptyMessage}</EmptyState>
      </ChartCard>
    )
  }

  const totalCents = slices.reduce((sum, slice) => addCents(sum, slice.cents), 0)
  const sliceColors = slices.map((slice) =>
    selected && slice !== selected ? fadeColor(slice.color) : slice.color,
  )

  return (
    <ChartCard title={title} ref={cardRef}>
      {/* O canvas não tem texto: a lista abaixo é a versão acessível (CA-06.7). */}
      <div className="relative h-56" aria-hidden="true">
        <Doughnut
          data={{
            labels: slices.map((slice) => slice.name),
            datasets: [
              {
                data: slices.map((slice) => slice.cents),
                backgroundColor: sliceColors,
                hoverBackgroundColor: sliceColors,
                borderColor: colors.background,
                hoverBorderColor: colors.background,
                borderWidth: 2,
                offset: slices.map((slice) => (slice === selected ? SELECTED_OFFSET : 0)),
                hoverOffset: 0,
              },
            ],
          }}
          options={{
            maintainAspectRatio: false,
            cutout: '58%',
            layout: { padding: SELECTED_OFFSET },
            events: ['click'],
            onClick: (_event, elements) => {
              const slice = elements[0] && slices[elements[0].index]
              if (slice) toggle(slice.tagId)
              else setSelectedTagId(null)
            },
            plugins: { tooltip: { enabled: false }, legend: { display: false } },
          }}
        />
      </div>
      <ChartDetailPanel>
        {selected
          ? `${selected.name} — ${formatBRL(selected.cents)} · ${formatTenthsPercent(selected.tenths)}`
          : `${totalLabel}: ${formatBRL(totalCents)}`}
      </ChartDetailPanel>
      <TagLegendList
        label={title}
        slices={slices}
        selectedTagId={selected?.tagId ?? null}
        onToggle={toggle}
      />
    </ChartCard>
  )
}
