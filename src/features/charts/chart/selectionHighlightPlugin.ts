import type { Chart, ChartType, Plugin } from 'chart.js'

// CA-06.4 / CA-06.5 — destaque do subperíodo selecionado: uma faixa atrás da coluna (barras)
// ou um marcador vertical sobre o ponto (linha). Fica nas opções do gráfico para o React só
// precisar trocar `index` a cada toque.

export interface SelectionHighlightOptions {
  /** Índice do subperíodo selecionado, ou `null` sem seleção. */
  index: number | null
  /** `band`: faixa da largura da coluna; `line`: linha vertical de 2 px. */
  style: 'band' | 'line'
  color: string
}

declare module 'chart.js' {
  interface PluginOptionsByType<TType extends ChartType> {
    selectionHighlight?: SelectionHighlightOptions
  }
}

const LINE_WIDTH = 2

function draw(chart: Chart, options: SelectionHighlightOptions): void {
  const x = chart.scales.x
  if (typeof options.index !== 'number' || !x) return
  const { top, bottom } = chart.chartArea
  const center = x.getPixelForValue(options.index)
  // Uma coluna por categoria (min..max). Não usa `x.ticks`: o Chart.js pula rótulos quando não
  // cabem (31 dias num iPhone), e a faixa ficaria da largura de várias colunas.
  const categoryCount = x.max - x.min + 1
  const width = options.style === 'band' ? x.width / Math.max(categoryCount, 1) : LINE_WIDTH
  const { ctx } = chart
  ctx.save()
  ctx.fillStyle = options.color
  ctx.fillRect(center - width / 2, top, width, bottom - top)
  ctx.restore()
}

export const selectionHighlightPlugin: Plugin<ChartType, SelectionHighlightOptions> = {
  id: 'selectionHighlight',
  // A faixa vai atrás das barras; o marcador da linha, por cima dos pontos.
  beforeDatasetsDraw(chart, _args, options) {
    if (options.style === 'band') draw(chart, options)
  },
  afterDatasetsDraw(chart, _args, options) {
    if (options.style === 'line') draw(chart, options)
  },
}
