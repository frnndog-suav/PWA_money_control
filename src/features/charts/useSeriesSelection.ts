import { useRef, useState, type KeyboardEvent, type RefObject } from 'react'
import { useOutsidePointerDown } from '@/components/ui/useOutsidePointerDown'

export interface SeriesSelection {
  /** Subperíodo selecionado, ou `null`. */
  index: number | null
  /** Seleciona o índice mais próximo dentro de `0..count-1`. */
  select: (index: number) => void
  /** Cartão do gráfico: tocar fora dele limpa a seleção (CA-06.5). */
  cardRef: RefObject<HTMLElement | null>
  /** Setas, Home e End mudam a seleção; Esc limpa (RNF-06: o gráfico funciona sem toque). */
  handleKeyDown: (event: KeyboardEvent) => void
}

const STEP_BY_KEY: Readonly<Record<string, number>> = { ArrowLeft: -1, ArrowRight: 1 }

/**
 * Seleção de um subperíodo nas barras (CA-06.4) e na linha (CA-06.5). A seleção some ao
 * trocar de período porque a tela recria o gráfico com outra `key` (CA-06.8).
 */
export function useSeriesSelection(count: number): SeriesSelection {
  const cardRef = useRef<HTMLElement>(null)
  const [index, setIndex] = useState<number | null>(null)
  useOutsidePointerDown(cardRef, () => setIndex(null), index !== null)

  const select = (next: number) => {
    if (count > 0) setIndex(Math.min(Math.max(Math.round(next), 0), count - 1))
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    const step = STEP_BY_KEY[event.key]
    if (step !== undefined) select(index === null ? (step > 0 ? 0 : count - 1) : index + step)
    else if (event.key === 'Home') select(0)
    else if (event.key === 'End') select(count - 1)
    else if (event.key === 'Escape') setIndex(null)
    else return
    event.preventDefault()
  }

  return { index, select, cardRef, handleKeyDown }
}
