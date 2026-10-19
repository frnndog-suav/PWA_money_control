/** D-24 — de quanto em quanto tempo o app procura versão nova enquanto está visível. */
export const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000

/**
 * D-24 — intervalo mínimo entre duas checagens. Gatilhos que disparam juntos (ex.: `focus` e
 * `visibilitychange` ao voltar do segundo plano) resultam numa checagem só.
 */
export const MIN_UPDATE_CHECK_GAP_MS = 60 * 1000

export interface UpdateCheckConditions {
  isOnline: boolean
  isVisible: boolean
  /** Momento atual em ms (relógio injetado, para testar). */
  now: number
  /** Momento da última checagem em ms, ou `null` se ainda não houve nenhuma. */
  lastCheckAt: number | null
}

/** CA-11.3 / D-24 — decide se o app deve pedir ao service worker que procure versão nova agora. */
export function shouldCheckForUpdate({
  isOnline,
  isVisible,
  now,
  lastCheckAt,
}: UpdateCheckConditions): boolean {
  if (!isOnline || !isVisible) return false
  if (lastCheckAt === null) return true
  return now - lastCheckAt >= MIN_UPDATE_CHECK_GAP_MS
}
