import { formatSignedBRL } from '@/domain/money'
import type { Cents } from '@/domain/types'

export type SignedAmountSize = 'sm' | 'md' | 'lg'

interface SignedAmountProps {
  cents: Cents
  size?: SignedAmountSize
}

const SIZE_CLASSES: Record<SignedAmountSize, string> = {
  sm: 'text-base font-semibold',
  md: 'text-2xl font-bold',
  lg: 'text-4xl font-bold',
}

// Tons com contraste AA sobre o fundo claro e o escuro (RNF-06).
function toneClass(cents: Cents): string {
  if (cents > 0) return 'text-green-700 dark:text-green-400'
  if (cents < 0) return 'text-red-700 dark:text-red-400'
  return 'text-slate-900 dark:text-slate-100'
}

/**
 * CA-02.1 — valor com sinal explícito ("+R$ 120,00" / "−R$ 45,90" / "R$ 0,00"): verde se
 * positivo, vermelho se negativo, neutro se zero. O sinal está sempre no texto, então a cor
 * nunca é a única informação.
 */
export function SignedAmount({ cents, size = 'sm' }: SignedAmountProps) {
  return (
    <span className={`whitespace-nowrap tabular-nums ${SIZE_CLASSES[size]} ${toneClass(cents)}`}>
      {formatSignedBRL(cents)}
    </span>
  )
}
