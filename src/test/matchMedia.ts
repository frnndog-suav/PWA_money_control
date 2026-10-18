// Dublê de window.matchMedia (o jsdom não implementa). Controláveis: o esquema de cor
// escuro (com aviso de mudança) e o modo instalado do PWA; as demais consultas nunca casam.
import { STANDALONE_DISPLAY_MODE_QUERY } from '@/lib/displayMode'
import { DARK_COLOR_SCHEME_QUERY } from '@/lib/theme'

type ChangeListener = (event: MediaQueryListEvent) => void

const listeners = new Set<ChangeListener>()
let prefersDark = false
let isStandalone = false

function queryMatches(query: string): boolean {
  if (query === DARK_COLOR_SCHEME_QUERY) return prefersDark
  if (query === STANDALONE_DISPLAY_MODE_QUERY) return isStandalone
  return false
}

function createMediaQueryList(query: string): MediaQueryList {
  const isDarkQuery = query === DARK_COLOR_SCHEME_QUERY
  return {
    media: query,
    get matches() {
      return queryMatches(query)
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

/** Simula o app aberto pelo ícone da Tela de Início (`display-mode: standalone`). */
export function setDisplayModeStandalone(value: boolean): void {
  isStandalone = value
}

export function resetMatchMedia(): void {
  prefersDark = false
  isStandalone = false
  listeners.clear()
}
