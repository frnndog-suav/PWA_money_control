import { useSyncExternalStore } from 'react'
import { today } from '@/domain/dates'
import type { DateString } from '@/domain/types'

// O app instalado pode ficar dias aberto em segundo plano: ao voltar a ficar visível (ou
// ganhar foco / ser restaurado do cache), "hoje" é recalculado (CA-02.2).
const WINDOW_WAKE_EVENTS = ['focus', 'pageshow'] as const

function subscribe(onChange: () => void): () => void {
  for (const event of WINDOW_WAKE_EVENTS) window.addEventListener(event, onChange)
  document.addEventListener('visibilitychange', onChange)
  return () => {
    for (const event of WINDOW_WAKE_EVENTS) window.removeEventListener(event, onChange)
    document.removeEventListener('visibilitychange', onChange)
  }
}

/** Data local de hoje (`YYYY-MM-DD`), atualizada quando o app volta a ficar visível. */
export function useToday(): DateString {
  // A string só muda quando o dia vira; o React compara o valor e não renderiza à toa.
  return useSyncExternalStore(subscribe, () => today())
}
