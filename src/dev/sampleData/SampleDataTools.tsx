import '@/dev/sampleData/sampleData.css'
import { useSampleDataTools } from '@/dev/sampleData/useSampleDataTools'

const BUTTON_BASE = 'min-h-11 rounded-lg px-4 font-semibold disabled:opacity-50'

/**
 * §6.11 — seção somente de desenvolvimento em Ajustes → Sobre: gerar e apagar dados de
 * exemplo. Carregada com lazy() atrás de `import.meta.env.DEV`; não entra no build.
 */
export default function SampleDataTools() {
  const { isBusy, message, generate, clear } = useSampleDataTools()

  return (
    <section
      aria-labelledby="sample-data-title"
      className="flex flex-col gap-3 rounded-lg border border-dashed border-amber-500 p-4"
    >
      <h2 id="sample-data-title" className="text-lg font-semibold">
        Ferramentas de desenvolvimento
      </h2>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Só aparece no ambiente de desenvolvimento. Gera 12 tags, 5.000 lançamentos em 3 anos, 4
        recorrentes e 3 parcelamentos.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={isBusy}
          onClick={generate}
          className={`${BUTTON_BASE} bg-blue-700 text-white dark:bg-blue-600`}
        >
          Gerar dados de exemplo
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={clear}
          className={`${BUTTON_BASE} border border-red-600 text-red-700 dark:border-red-400 dark:text-red-300`}
        >
          Apagar todos os dados
        </button>
      </div>
      <p role="status" className="text-sm">
        {isBusy ? 'Processando…' : message}
      </p>
    </section>
  )
}
