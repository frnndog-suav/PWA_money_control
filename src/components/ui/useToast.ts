import { useEffect, useState } from 'react'

/** Tempo em tela da confirmação: suficiente para ler uma frase curta. */
export const TOAST_DURATION_MS = 3000

interface ToastState {
  message: string
  /** Muda a cada `show`, para a mesma mensagem repetida reiniciar o tempo. */
  key: number
}

/** Estado de um `<Toast>`: `show(message)` exibe por `TOAST_DURATION_MS` e some sozinho. */
export function useToast(): { message: string | null; show: (message: string) => void } {
  const [toast, setToast] = useState<ToastState | null>(null)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), TOAST_DURATION_MS)
    return () => clearTimeout(timer)
  }, [toast])

  return {
    message: toast?.message ?? null,
    show: (message) => setToast((previous) => ({ message, key: (previous?.key ?? 0) + 1 })),
  }
}
