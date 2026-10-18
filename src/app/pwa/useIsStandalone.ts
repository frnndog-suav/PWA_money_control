import { useState } from 'react'
import { isStandaloneDisplay, STANDALONE_DISPLAY_MODE_QUERY } from '@/lib/displayMode'

type NavigatorWithStandalone = Navigator & { standalone?: boolean }

function readIsStandalone(): boolean {
  return isStandaloneDisplay({
    matchesStandaloneMedia: window.matchMedia(STANDALONE_DISPLAY_MODE_QUERY).matches,
    navigatorStandalone: (navigator as NavigatorWithStandalone).standalone,
  })
}

/** CA-11.6 — o modo de exibição não muda durante a sessão, então é lido uma vez. */
export function useIsStandalone(): boolean {
  const [isStandalone] = useState(readIsStandalone)
  return isStandalone
}
