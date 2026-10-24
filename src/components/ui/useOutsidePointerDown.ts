import { useEffect, type RefObject } from 'react'

/**
 * Chama `onOutside` quando o usuário toca (ou clica) fora de `ref`, enquanto `enabled`.
 * Usado para limpar a seleção dos gráficos ao tocar fora deles (CA-06.3 / CA-06.5).
 */
export function useOutsidePointerDown(
  ref: RefObject<HTMLElement | null>,
  onOutside: () => void,
  enabled: boolean,
): void {
  useEffect(() => {
    if (!enabled) return
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && ref.current?.contains(event.target)) return
      onOutside()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [ref, onOutside, enabled])
}
