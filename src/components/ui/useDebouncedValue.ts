import { useEffect, useState } from 'react'

/**
 * O `value` mais recente depois de `delayMs` sem mudanças: evita refazer um cálculo pesado a
 * cada tecla (ex.: a busca na lista de lançamentos — RNF-02).
 *
 * `immediateValue` (opcional) é aplicado na hora, sem esperar, e também substitui o valor
 * atrasado: ex.: o texto vazio ("sem filtro") limpa a busca na hora e, se o usuário voltar a
 * digitar logo em seguida, a busca anterior não reaparece durante a espera.
 */
export function useDebouncedValue<T>(value: T, delayMs: number, immediateValue?: T): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  const isImmediate = immediateValue !== undefined && Object.is(value, immediateValue)

  // Ajuste durante a renderização (padrão do React para estado derivado de props), e não num
  // efeito: o valor imediato vale já nesta renderização, sem uma renderização extra.
  if (isImmediate && !Object.is(debouncedValue, value)) setDebouncedValue(value)

  useEffect(() => {
    if (isImmediate) return
    const timer = setTimeout(() => setDebouncedValue(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs, isImmediate])

  return isImmediate ? value : debouncedValue
}
