import { useId, type ReactNode, type Ref } from 'react'

interface ChartCardProps {
  title: string
  /** Área do cartão que conta como "dentro" do gráfico (tocar fora limpa a seleção). */
  ref?: Ref<HTMLElement>
  children: ReactNode
}

/** RF-06 — um gráfico com título, o gráfico em si, a lista/painel de detalhes. */
export function ChartCard({ title, ref, children }: ChartCardProps) {
  const titleId = useId()

  return (
    <section
      ref={ref}
      aria-labelledby={titleId}
      className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700"
    >
      <h2 id={titleId} className="text-lg font-semibold">
        {title}
      </h2>
      {children}
    </section>
  )
}
