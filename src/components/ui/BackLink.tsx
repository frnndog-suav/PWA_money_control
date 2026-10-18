import { useGoBack } from '@/components/ui/useGoBack'

interface BackLinkProps {
  /** Tela pai usada quando não há entrada anterior no histórico do app. */
  fallbackTo: string
}

export function BackLink({ fallbackTo }: BackLinkProps) {
  const goBack = useGoBack(fallbackTo)

  return (
    <button
      type="button"
      aria-label="Voltar"
      onClick={goBack}
      className="-ml-3 flex size-11 items-center justify-center rounded-full text-blue-600 dark:text-blue-400"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>
  )
}
