// CA-11.6 — detecção do modo instalado (aberto pelo ícone da Tela de Início), sem DOM:
// quem chama lê o navegador e passa os valores (ver src/app/pwa/useIsStandalone.ts).

export const STANDALONE_DISPLAY_MODE_QUERY = '(display-mode: standalone)'

export interface DisplayModeSignals {
  /** Resultado de `matchMedia('(display-mode: standalone)')` (Chrome, Edge e iOS atual). */
  matchesStandaloneMedia: boolean
  /** `navigator.standalone`, propriedade só do Safari no iOS; `undefined` nos demais. */
  navigatorStandalone: boolean | undefined
}

export function isStandaloneDisplay({
  matchesStandaloneMedia,
  navigatorStandalone,
}: DisplayModeSignals): boolean {
  return matchesStandaloneMedia || navigatorStandalone === true
}
