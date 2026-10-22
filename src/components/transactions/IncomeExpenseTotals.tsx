import { formatBRL } from '@/domain/money'
import type { Cents } from '@/domain/types'

interface IncomeExpenseTotalsProps {
  incomeCents: Cents
  expenseCents: Cents
}

/**
 * Entradas e saídas em texto menor, com o rótulo escrito (a cor nunca é a única informação —
 * RNF-06). Usado no saldo do mês (RF-02), no cabeçalho de cada dia (CA-04.1) e no resumo dos
 * filtros (CA-04.3).
 */
export function IncomeExpenseTotals({ incomeCents, expenseCents }: IncomeExpenseTotalsProps) {
  return (
    <dl className="flex flex-wrap gap-x-4 text-sm text-slate-600 dark:text-slate-300">
      <div className="flex gap-1">
        <dt>Entradas</dt>
        <dd className="tabular-nums">{formatBRL(incomeCents)}</dd>
      </div>
      <div className="flex gap-1">
        <dt>Saídas</dt>
        <dd className="tabular-nums">{formatBRL(expenseCents)}</dd>
      </div>
    </dl>
  )
}
