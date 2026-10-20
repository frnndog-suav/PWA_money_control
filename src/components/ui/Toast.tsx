interface ToastProps {
  /** Texto exibido; `null` esconde o aviso. */
  message: string | null
}

/**
 * Confirmação discreta (ex.: "Lançamento salvo"). A região viva existe sempre, para o leitor
 * de tela anunciar quando o texto aparece. Fica no topo, abaixo da área segura: nunca cobre
 * a barra inferior, o aviso de versão nem o teclado do iPhone. Não recebe toques.
 */
export function Toast({ message }: ToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="px-safe pt-safe pointer-events-none fixed inset-x-0 top-0 z-10 flex justify-center"
    >
      {message && (
        <p className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg dark:bg-slate-100 dark:text-slate-900">
          {message}
        </p>
      )}
    </div>
  )
}
