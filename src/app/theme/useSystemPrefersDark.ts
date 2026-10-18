import { useSyncExternalStore } from 'react'
import { DARK_COLOR_SCHEME_QUERY } from '@/lib/theme'

// RF-09 / CA-09.1 — o modo Automático reage quando o sistema troca de tema com o app aberto.
function subscribe(onChange: () => void): () => void {
  const mediaQuery = window.matchMedia(DARK_COLOR_SCHEME_QUERY)
  mediaQuery.addEventListener('change', onChange)
  return () => mediaQuery.removeEventListener('change', onChange)
}

function getSnapshot(): boolean {
  return window.matchMedia(DARK_COLOR_SCHEME_QUERY).matches
}

export function useSystemPrefersDark(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot)
}
