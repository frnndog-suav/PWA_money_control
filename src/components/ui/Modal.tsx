import { useEffect, useId, useRef, type ReactNode } from 'react'

interface ModalProps {
  open: boolean
  /**
   * Título visível e nome acessível do modal (`aria-labelledby`). Obrigatório no tipo para
   * o modal nunca ficar sem nome para o leitor de tela (RNF-06).
   */
  title: ReactNode
  /** Pedido de fechar (Esc ou botão do próprio modal); quem usa decide e muda `open`. */
  onClose: () => void
  children: ReactNode
}

interface ModalPartProps {
  children: ReactNode
}

function ModalBody({ children }: ModalPartProps) {
  return <div className="flex flex-col gap-4">{children}</div>
}

// No celular os botões ocupam a largura toda, com a ação principal (último filho) em cima.
function ModalActions({ children }: ModalPartProps) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end *:w-full sm:*:w-auto">
      {children}
    </div>
  )
}

/**
 * Modal acessível sobre o `<dialog>` nativo aberto com `showModal()` (D-33): o navegador
 * cuida do foco preso, do Esc, do `aria-modal`, do fundo inerte e de devolver o foco ao
 * fechar. Por estar na camada superior, nunca fica atrás da barra inferior nem do aviso de
 * versão. O conteúdo só existe enquanto está aberto, então cada abertura começa do zero.
 * O título é sempre renderizado, então `aria-labelledby` nunca aponta para um id ausente.
 */
export function Modal({ open, title, onClose, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      // Esc: o modal é controlado por `open`, então o fechamento passa por quem usa.
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      className="max-h-dialog m-auto w-[min(calc(100%-2rem),28rem)] overflow-y-auto overscroll-contain rounded-2xl bg-white p-4 text-slate-900 shadow-xl backdrop:bg-black/50 dark:bg-slate-800 dark:text-slate-100"
    >
      <div className="flex flex-col gap-4">
        <h2 id={titleId} className="text-xl font-bold">
          {title}
        </h2>
        {open && children}
      </div>
    </dialog>
  )
}

Modal.Body = ModalBody
Modal.Actions = ModalActions
