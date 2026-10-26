import { useId, useRef, useState, type ReactNode } from 'react'
import { useOutsidePointerDown } from '@/components/ui/useOutsidePointerDown'

interface InfoPopoverProps {
  /** Nome acessível do botão "ⓘ", ex.: "Por que esta data?". */
  label: string
  children: ReactNode
}

/**
 * CA-07.8 — ícone "ⓘ" que abre um balão explicativo por **toque** (princípio 15: nada por
 * hover). Fecha ao tocar no ícone de novo, ao tocar fora ou com Esc; o estado é anunciado por
 * `aria-expanded` e o balão é ligado ao botão por `aria-controls`.
 */
export function InfoPopover({ label, children }: InfoPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLSpanElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const balloonId = useId()
  useOutsidePointerDown(containerRef, () => setIsOpen(false), isOpen)

  return (
    <span ref={containerRef} className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-expanded={isOpen}
        aria-controls={balloonId}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && isOpen) {
            // Esc fecha só o balão, sem fechar o modal em volta.
            event.preventDefault()
            event.stopPropagation()
            setIsOpen(false)
          }
        }}
        className="flex size-11 items-center justify-center rounded-full text-xl text-blue-700 dark:text-blue-300"
      >
        <span aria-hidden="true">ⓘ</span>
      </button>
      <span
        id={balloonId}
        hidden={!isOpen}
        className="absolute top-full left-0 z-10 mt-1 w-64 max-w-[calc(100vw-3rem)] rounded-lg border border-slate-200 bg-white p-3 text-sm font-normal text-slate-800 shadow-lg dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
      >
        {children}
      </span>
    </span>
  )
}
