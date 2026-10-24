import { useRef, type PointerEvent } from 'react'
import type { Chart } from 'chart.js'
import { Line } from 'react-chartjs-2'
import { balanceSeries, type BalanceGranularity } from '@/domain/charts'
import { formatSignedBRL } from '@/domain/money'
import type { DateString } from '@/domain/types'
import { ChartCard } from '@/features/charts/ChartCard'
import { ChartDetailPanel } from '@/features/charts/ChartDetailPanel'
import {
  BALANCE_TITLE,
  PERIOD_END_BALANCE_LABEL,
  SERIES_CHART_HINT,
} from '@/features/charts/chartTexts'
import { moneyAxis } from '@/features/charts/chart/moneyAxis'
import { useChartColors } from '@/features/charts/chart/useChartColors'
import { useSeriesSelection } from '@/features/charts/useSeriesSelection'
import { useTransactionsInRange } from '@/repositories/transactionsRepository'

interface BalanceLineCardProps {
  granularity: BalanceGranularity
  anchor: DateString
  /** Último dia do período: o saldo considera todos os lançamentos até ele. */
  end: DateString
}

const POINT_RADIUS = 2
const SELECTED_POINT_RADIUS = 6

/**
 * RF-06 / CA-06.5 — saldo acumulado ao fim de cada dia (Mês) ou mês (Ano). Tocar ou arrastar o
 * dedo move o marcador para o ponto mais próximo; a seleção fica ao soltar e some ao tocar fora.
 * O gesto é tratado aqui (eventos de ponteiro), não pelo Chart.js; `touch-action: pan-y` deixa
 * a página rolar na vertical, mas não na horizontal durante o arraste.
 */
export function BalanceLineCard({ granularity, anchor, end }: BalanceLineCardProps) {
  // Todos os lançamentos até o fim do período: os anteriores formam o saldo inicial.
  const transactions = useTransactionsInRange(null, end)
  const colors = useChartColors()
  const chartRef = useRef<Chart<'line'>>(null)
  const isDraggingRef = useRef(false)
  const points = transactions ? balanceSeries(transactions, granularity, anchor) : []
  const { index, select, cardRef, handleKeyDown } = useSeriesSelection(points.length)

  const selectAtPointer = (event: PointerEvent<HTMLElement>) => {
    const chart = chartRef.current
    if (!chart || points.length === 0) return
    const left = chart.canvas.getBoundingClientRect().left
    const value = chart.scales.x.getValueForPixel(event.clientX - left)
    if (value !== undefined) select(value)
  }

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    isDraggingRef.current = true
    // Mantém o arraste mesmo que o dedo saia do gráfico (indisponível em alguns ambientes).
    event.currentTarget.setPointerCapture?.(event.pointerId)
    selectAtPointer(event)
  }

  const stopDragging = () => {
    isDraggingRef.current = false
  }

  const lastPoint = points.at(-1)
  const selected = index === null ? undefined : points[index]

  return (
    <ChartCard title={BALANCE_TITLE} ref={cardRef}>
      <div
        role="group"
        tabIndex={0}
        aria-label={`${BALANCE_TITLE}. ${SERIES_CHART_HINT}`}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={(event) => {
          if (isDraggingRef.current) selectAtPointer(event)
        }}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        onPointerLeave={stopDragging}
        className="relative h-56 touch-pan-y rounded-lg select-none"
      >
        <Line
          ref={chartRef}
          data={{
            labels: points.map((point) => point.tickLabel),
            datasets: [
              {
                label: 'Saldo',
                data: points.map((point) => point.balanceCents),
                borderColor: colors.balance,
                backgroundColor: colors.balance,
                borderWidth: 2,
                pointRadius: points.map((_, pointIndex) =>
                  pointIndex === index ? SELECTED_POINT_RADIUS : POINT_RADIUS,
                ),
                pointHoverRadius: SELECTED_POINT_RADIUS,
              },
            ],
          }}
          options={{
            maintainAspectRatio: false,
            // O Chart.js não trata nenhum evento: o toque e o arraste são tratados acima.
            events: [],
            plugins: {
              tooltip: { enabled: false },
              legend: { display: false },
              selectionHighlight: { index, style: 'line', color: colors.marker },
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: colors.text, maxRotation: 0, autoSkipPadding: 8 },
              },
              y: moneyAxis(colors, { beginAtZero: false }),
            },
          }}
        />
      </div>
      <ChartDetailPanel>
        {selected && `${selected.label}: saldo ${formatSignedBRL(selected.balanceCents)}`}
        {!selected &&
          lastPoint &&
          `${PERIOD_END_BALANCE_LABEL}: ${formatSignedBRL(lastPoint.balanceCents)}`}
      </ChartDetailPanel>
    </ChartCard>
  )
}
