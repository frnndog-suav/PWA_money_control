import { SignedAmount } from '@/components/ui/SignedAmount'
import type { Totals } from '@/domain/balances'
import { formatBRL } from '@/domain/money'
import type { Cents } from '@/domain/types'

interface PeriodSummaryCardProps {
  /** Realizado; `undefined` enquanto os lançamentos carregam. */
  totals: Totals | undefined
  /**
   * CA-05.2 — só na visão Mês: resultado previsto (Realizado + recorrentes pendentes); `null`
   * enquanto carrega. Ausente nas outras visões.
   */
  projectedResultCents?: Cents | null
}

// Enquanto o IndexedDB carrega, um traço ocupa o lugar do valor (sem "R$ 0,00" falso).
const LOADING = <span className="text-slate-500 dark:text-slate-400">—</span>

/**
 * RF-05 — cartão de resumo do período: Entradas, Saídas e Resultado (entradas − saídas). Na
 * visão Mês, o Realizado e o Previsto aparecem separados (CA-05.2 / D-05).
 */
export function PeriodSummaryCard({ totals, projectedResultCents }: PeriodSummaryCardProps) {
  const hasProjection = projectedResultCents !== undefined

  return (
    <section
      aria-label="Resumo do período"
      className="flex flex-col gap-2 rounded-lg border border-slate-200 p-4 dark:border-slate-700"
    >
      {hasProjection && (
        <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Realizado</h2>
      )}
      <dl className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-1">
        <dt className="text-slate-600 dark:text-slate-300">Entradas</dt>
        <dd className="text-right tabular-nums">
          {totals ? formatBRL(totals.incomeCents) : LOADING}
        </dd>
        <dt className="text-slate-600 dark:text-slate-300">Saídas</dt>
        <dd className="text-right tabular-nums">
          {totals ? formatBRL(totals.expenseCents) : LOADING}
        </dd>
        <dt className="font-semibold">Resultado</dt>
        <dd className="text-right">
          {totals ? <SignedAmount cents={totals.resultCents} /> : LOADING}
        </dd>
        {hasProjection && (
          <>
            <dt className="mt-2 border-t border-slate-200 pt-2 font-semibold dark:border-slate-700">
              Previsto
            </dt>
            <dd className="mt-2 border-t border-slate-200 pt-2 text-right dark:border-slate-700">
              {projectedResultCents === null ? (
                LOADING
              ) : (
                <SignedAmount cents={projectedResultCents} />
              )}
            </dd>
          </>
        )}
      </dl>
    </section>
  )
}
