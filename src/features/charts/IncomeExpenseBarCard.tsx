import { Bar } from 'react-chartjs-2'
import type { Totals } from '@/domain/balances'
import type { IncomeExpensePoint } from '@/domain/charts'
import { formatBRL, formatSignedBRL } from '@/domain/money'
import { ChartCard } from '@/features/charts/ChartCard'
import { ChartDetailPanel } from '@/features/charts/ChartDetailPanel'
import {
  INCOME_EXPENSE_TITLE,
  SERIES_CHART_HINT,
  WHOLE_PERIOD_LABEL,
} from '@/features/charts/chartTexts'
import { moneyAxis } from '@/features/charts/chart/moneyAxis'
import { fadeColor, useChartColors } from '@/features/charts/chart/useChartColors'
import { useSeriesSelection } from '@/features/charts/useSeriesSelection'

interface IncomeExpenseBarCardProps {
  points: IncomeExpensePoint[]
  /** Totais do período inteiro, mostrados no painel sem seleção (CA-06.4). */
  periodTotals: Totals
}

/** CA-06.4 — "15 de out.: Entradas R$ 1.200,00 · Saídas R$ 350,00 · Resultado +R$ 850,00". */
function describeTotals(label: string, totals: Totals): string {
  return `${label}: Entradas ${formatBRL(totals.incomeCents)} · Saídas ${formatBRL(totals.expenseCents)} · Resultado ${formatSignedBRL(totals.resultCents)}`
}

/**
 * RF-06 — barras agrupadas de entradas e saídas por subperíodo. Tocar em qualquer ponto da
 * coluna (modo `index`, `intersect: false`) seleciona o dia/mês: a coluna ganha uma faixa de
 * destaque e as outras esmaecem (CA-06.4 / CA-06.6).
 */
export function IncomeExpenseBarCard({ points, periodTotals }: IncomeExpenseBarCardProps) {
  const colors = useChartColors()
  const { index, select, cardRef, handleKeyDown } = useSeriesSelection(points.length)
  const barColors = (color: string) =>
    points.map((_, pointIndex) =>
      index === null || pointIndex === index ? color : fadeColor(color),
    )
  const incomeColors = barColors(colors.income)
  const expenseColors = barColors(colors.expense)

  return (
    <ChartCard title={INCOME_EXPENSE_TITLE} ref={cardRef}>
      <div
        role="group"
        tabIndex={0}
        aria-label={`${INCOME_EXPENSE_TITLE}. ${SERIES_CHART_HINT}`}
        onKeyDown={handleKeyDown}
        className="relative h-56 rounded-lg"
      >
        <Bar
          data={{
            labels: points.map((point) => point.tickLabel),
            datasets: [
              {
                label: 'Entradas',
                data: points.map((point) => point.incomeCents),
                backgroundColor: incomeColors,
                hoverBackgroundColor: incomeColors,
              },
              {
                label: 'Saídas',
                data: points.map((point) => point.expenseCents),
                backgroundColor: expenseColors,
                hoverBackgroundColor: expenseColors,
              },
            ],
          }}
          options={{
            maintainAspectRatio: false,
            events: ['click'],
            interaction: { mode: 'index', intersect: false },
            onClick: (_event, elements) => {
              if (elements[0]) select(elements[0].index)
            },
            plugins: {
              tooltip: { enabled: false },
              legend: { display: false },
              selectionHighlight: { index, style: 'band', color: colors.highlight },
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: colors.text, maxRotation: 0, autoSkipPadding: 8 },
              },
              y: moneyAxis(colors, { beginAtZero: true }),
            },
          }}
        />
      </div>
      {/* A cor nunca é a única informação: a legenda tem o nome escrito (RNF-06). */}
      <div className="flex gap-4 text-sm text-slate-700 dark:text-slate-200" aria-hidden="true">
        <span className="flex items-center gap-1">
          <span className="size-3 rounded-sm" style={{ backgroundColor: colors.income }} />
          Entradas
        </span>
        <span className="flex items-center gap-1">
          <span className="size-3 rounded-sm" style={{ backgroundColor: colors.expense }} />
          Saídas
        </span>
      </div>
      <ChartDetailPanel>
        {index === null
          ? describeTotals(WHOLE_PERIOD_LABEL, periodTotals)
          : describeTotals(points[index].label, points[index])}
      </ChartDetailPanel>
    </ChartCard>
  )
}
