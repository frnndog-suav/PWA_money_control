// Apoio aos testes de tela dos gráficos: o jsdom não tem canvas, então o react-chartjs-2 é
// trocado pelos componentes de `chartStubs.tsx`, que guardam aqui as props recebidas. O teste
// confere os dados (cores, destaque) e simula toques chamando o `onClick` das opções.
// Uso: `vi.mock('react-chartjs-2', () => import('@/test/chartStubs'))`.

export interface StubChartProps {
  data: { labels?: unknown[]; datasets: Record<string, unknown>[] }
  options?: Record<string, unknown>
}

const propsByCanvas = new WeakMap<Element, StubChartProps>()

/** Escala X de mentira: cada 10 px do canvas correspondem a um índice (10 px → 1). */
export const PIXELS_PER_INDEX = 10

export function rememberChartProps(canvas: Element, props: StubChartProps): void {
  propsByCanvas.set(canvas, props)
}

/** Props atuais do gráfico (a última renderização). */
export function chartProps(canvas: Element): StubChartProps {
  const props = propsByCanvas.get(canvas)
  if (!props) throw new Error('Elemento não é um gráfico de teste.')
  return props
}

/** Simula o Chart.js chamando `options.onClick` com o elemento do índice (ou nenhum). */
export function clickChart(canvas: Element, index: number | null): void {
  const onClick = chartProps(canvas).options?.onClick as
    ((event: unknown, elements: { index: number }[]) => void) | undefined
  if (!onClick) throw new Error('O gráfico não trata toques.')
  onClick({}, index === null ? [] : [{ index }])
}
