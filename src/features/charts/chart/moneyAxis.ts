import { formatCompactBRL } from '@/domain/money'
import type { ChartColors } from '@/features/charts/chart/useChartColors'

/**
 * Rótulo do eixo Y em reais. O Chart.js pode gerar marcas fracionárias quando a faixa de
 * valores é pequena (ex.: saldo constante em zero → −0,8, −0,6…); como o eixo está em
 * centavos, arredonda para o centavo antes de formatar, em vez de deixar o `formatCompactBRL`
 * recusar o valor e derrubar o gráfico.
 */
export function formatMoneyTick(value: number | string): string {
  return formatCompactBRL(Math.round(Number(value)))
}

/** Eixo Y em centavos para as barras e a linha (RF-06), com as cores do tema (CA-06.9). */
export function moneyAxis(colors: ChartColors, options: { beginAtZero: boolean }) {
  return {
    beginAtZero: options.beginAtZero,
    grid: { color: colors.grid },
    border: { display: false },
    // Passo inteiro (em centavos) sempre que possível; o arredondamento acima cobre o resto.
    ticks: { color: colors.text, precision: 0, callback: formatMoneyTick },
  }
}
