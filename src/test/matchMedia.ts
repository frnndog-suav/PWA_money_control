// Dublê de window.matchMedia (o jsdom não implementa). Só a consulta de esquema de cor
// escuro é controlável; as demais consultas nunca casam.
import { DARK_COLOR_SCHEME_QUERY } from '@/lib/theme'

type ChangeListener = (event: MediaQueryListEvent) => void

const listeners = new Set<ChangeListener>()
let prefersDark = false

function createMediaQueryList(query: string): MediaQueryList {
  const isDarkQuery = query === DARK_COLOR_SCHEME_QUERY
  return {
    media: query,
    get matches() {
      return isDarkQuery && prefersDark
    },
    onchange: null,
    addEventListener: (_type: string, listener: ChangeListener) => {
      if (isDarkQuery) listeners.add(listener)
    },
    removeEventListener: (_type: string, listener: ChangeListener) => {
      listeners.delete(listener)
    },
    addListener: (listener: ChangeListener) => {
      if (isDarkQuery) listeners.add(listener)
    },
    removeListener: (listener: ChangeListener) => {
      listeners.delete(listener)
    },
    dispatchEvent: () => true,
  } as MediaQueryList
}

export function installMatchMedia(): void {
  window.matchMedia = createMediaQueryList
}

/** Simula a troca de tema do sistema operacional e avisa quem estiver ouvindo. */
export function setSystemPrefersDark(value: boolean): void {
  prefersDark = value
  const event = { matches: value, media: DARK_COLOR_SCHEME_QUERY } as MediaQueryListEvent
  listeners.forEach((listener) => listener(event))
}

export function resetMatchMedia(): void {
  prefersDark = false
  listeners.clear()
}
