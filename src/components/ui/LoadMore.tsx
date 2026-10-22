import { useEffect, useRef, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'

interface LoadMoreProps {
  onLoadMore: () => void
  /**
   * Quantos itens já estão na tela. A cada página o observador é refeito: ao começar a
   * observar ele avisa de novo se o fim da lista ainda estiver à vista.
   */
  loadedCount: number
  /** Texto do botão (ex.: "Carregar mais"). */
  children: ReactNode
}

// Começa a carregar a próxima página um pouco antes de o fim da lista aparecer, para a
// rolagem não parar.
const PRELOAD_MARGIN = '0px 0px 600px 0px'

/**
 * Fim de uma lista paginada: carrega mais sozinho quando chega perto da tela
 * (`IntersectionObserver`) e tem um botão como alternativa acessível (toque ou teclado).
 */
export function LoadMore({ onLoadMore, loadedCount, children }: LoadMoreProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoadMore()
      },
      { rootMargin: PRELOAD_MARGIN },
    )
    observer.observe(container)
    return () => observer.disconnect()
  }, [onLoadMore, loadedCount])

  return (
    <div ref={containerRef} className="flex justify-center">
      <Button variant="secondary" onClick={onLoadMore}>
        {children}
      </Button>
    </div>
  )
}
