import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { exportPasswordSchema, type ExportPasswordValues } from '@/domain/backupPasswordSchema'
import {
  EXPORT_CANCELLED_MESSAGE,
  EXPORT_DONE_MESSAGE,
  EXPORT_FAILED_MESSAGE,
  EXPORT_READY_MESSAGE,
} from '@/features/backup/backupTexts'
import { canSubmitForm, LIVE_VALIDATION } from '@/lib/formSubmit'
import { shareOrDownloadFile, type ShareOutcome } from '@/lib/share'
import { createBackupFile, deliverBackupFile } from '@/repositories/backupRepository'

const EMPTY_VALUES: ExportPasswordValues = { password: '', confirmation: '' }

// D-48 — no toque em "Salvar backup" o toque é recente: se a folha ainda for recusada, o
// navegador não a abre para este arquivo (ex.: PC com Windows) e o arquivo é baixado; assim
// todo toque termina em compartilhado, baixado, cancelado ou erro.
const shareOrDownloadOnRetry = (file: File) =>
  shareOrDownloadFile(file, { downloadIfBlocked: true })

interface ExportState {
  /** Mensagem de resultado (`role="status"`). */
  message: string | null
  /** Falha ao gerar ou entregar; não desabilita o botão, para tentar de novo (D-36). */
  error: string | null
  /** Arquivo gerado à espera de um novo toque para abrir a folha de compartilhamento. */
  pendingFile: File | null
}

const INITIAL_STATE: ExportState = { message: null, error: null, pendingFile: null }

/**
 * RF-10 exportar / princípio 16 — senha e confirmação; gera o arquivo criptografado e o entrega
 * pela folha de compartilhamento ou pelo download. `lastBackupAt` só é gravado se a entrega não
 * foi cancelada (§6.8 passo 8).
 */
export function useExportBackup() {
  const form = useForm<ExportPasswordValues>({
    ...LIVE_VALIDATION,
    resolver: zodResolver(exportPasswordSchema),
    defaultValues: EMPTY_VALUES,
  })
  const [state, setState] = useState<ExportState>(INITIAL_STATE)
  const [isDelivering, setIsDelivering] = useState(false)
  const statusRef = useRef<HTMLParagraphElement>(null)
  const saveButtonRef = useRef<HTMLButtonElement>(null)

  // RNF-06 — o botão tocado some (vira "Salvar backup") ou fica desabilitado (campos limpos):
  // o foco vai para o botão novo ou para a mensagem de resultado, como na D-45 (b).
  useEffect(() => {
    if (state.pendingFile) saveButtonRef.current?.focus()
    else if (state.message) statusRef.current?.focus()
  }, [state])

  // Mudar a senha depois de mexer na confirmação reconfere a confirmação ("não coincidem"
  // aparece e some enquanto digita); sem isso o RHF só valida o campo alterado.
  useEffect(
    () =>
      form.subscribe({
        name: 'password',
        formState: { values: true },
        callback: () => {
          if (form.getFieldState('confirmation').isDirty) void form.trigger('confirmation')
        },
      }),
    [form],
  )

  function applyOutcome(outcome: ShareOutcome, file: File) {
    if (outcome === 'blocked') {
      setState({ message: EXPORT_READY_MESSAGE, error: null, pendingFile: file })
      return
    }
    if (outcome === 'cancelled') {
      setState({ message: EXPORT_CANCELLED_MESSAGE, error: null, pendingFile: null })
      return
    }
    // A senha sai da memória da tela assim que o backup foi entregue.
    form.reset(EMPTY_VALUES)
    setState({ message: EXPORT_DONE_MESSAGE, error: null, pendingFile: null })
  }

  async function deliver(file: File, share?: (file: File) => Promise<ShareOutcome>) {
    setIsDelivering(true)
    try {
      applyOutcome(await deliverBackupFile(file, share), file)
    } catch {
      setState({ message: null, error: EXPORT_FAILED_MESSAGE, pendingFile: null })
    } finally {
      setIsDelivering(false)
    }
  }

  const submit = form.handleSubmit(async ({ password }) => {
    setState(INITIAL_STATE)
    let file: File
    try {
      file = await createBackupFile(password)
    } catch {
      setState({ message: null, error: EXPORT_FAILED_MESSAGE, pendingFile: null })
      return
    }
    await deliver(file)
  })

  function savePendingFile() {
    if (state.pendingFile) void deliver(state.pendingFile, shareOrDownloadOnRetry)
  }

  const isBusy = form.formState.isSubmitting || isDelivering
  return {
    form,
    submit,
    ...state,
    savePendingFile,
    statusRef,
    saveButtonRef,
    /** Derivação da chave em andamento (lenta no celular): "Gerando backup…". */
    isGenerating: form.formState.isSubmitting && !isDelivering,
    isBusy,
    canSubmit: canSubmitForm(form.formState) && !isBusy,
  }
}
