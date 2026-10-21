import { SignedAmount } from '@/components/ui/SignedAmount'
import { formatMonthLabel, periodOf } from '@/domain/dates'
import { formatBRL } from '@/domain/money'
import type { DateString } from '@/domain/types'
import { useMonthTotals, useOverallBalance } from '@/repositories/transactionsRepository'

interface BalanceSummaryProps {
  today: DateString
}

// Enquanto o IndexedDB carrega, um traço ocupa o lugar do valor (sem "R$ 0,00" falso).
const LOADING = <span className="text-slate-500 dark:text-slate-400">—</span>

/**
 * RF-02 itens 1 e 2 — saldo geral em destaque (todos os lançamentos, inclusive os futuros —
 * D-42) e o resultado do mês corrente, com entradas e saídas em texto menor (só o mês corrente,
 * inclusive as datas futuras dele — CA-02.3).
 */
export function BalanceSummary({ today }: BalanceSummaryProps) {
  const period = periodOf(today)
  const overall = useOverallBalance()
  const month = useMonthTotals(period)

  return (
    <section aria-label="Saldos" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Saldo geral</h2>
        <p>{overall === undefined ? LOADING : <SignedAmount cents={overall} size="lg" />}</p>
      </div>

      <div className="flex flex-col gap-1 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
        <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          Saldo de {formatMonthLabel(period)}
        </h2>
        <p>{month ? <SignedAmount cents={month.resultCents} size="md" /> : LOADING}</p>
        {month && (
          <dl className="flex flex-wrap gap-x-4 text-sm text-slate-600 dark:text-slate-300">
            <div className="flex gap-1">
              <dt>Entradas</dt>
              <dd className="tabular-nums">{formatBRL(month.incomeCents)}</dd>
            </div>
            <div className="flex gap-1">
              <dt>Saídas</dt>
              <dd className="tabular-nums">{formatBRL(month.expenseCents)}</dd>
            </div>
          </dl>
        )}
      </div>
    </section>
  )
}
