import { useImperativeHandle, useRef, type Ref } from 'react'
import { PIXELS_PER_INDEX, rememberChartProps, type StubChartProps } from '@/test/chartMock'

// Substitutos de Doughnut, Bar e Line do react-chartjs-2 nos testes (ver `chartMock.ts`).

interface StubProps extends StubChartProps {
  ref?: Ref<unknown>
}

function StubChart({ type, ref, ...props }: StubProps & { type: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // O mínimo da instância do Chart.js que o gráfico de linha usa para achar o ponto tocado.
  useImperativeHandle(ref, () => ({
    get canvas() {
      return canvasRef.current
    },
    scales: { x: { getValueForPixel: (pixel: number) => pixel / PIXELS_PER_INDEX } },
  }))
  return (
    <canvas
      data-chart={type}
      ref={(element) => {
        canvasRef.current = element
        if (element) rememberChartProps(element, props)
      }}
    />
  )
}

export function Doughnut(props: StubProps) {
  return <StubChart type="doughnut" {...props} />
}

export function Bar(props: StubProps) {
  return <StubChart type="bar" {...props} />
}

export function Line(props: StubProps) {
  return <StubChart type="line" {...props} />
}
