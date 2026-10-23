import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  importBackupSchema,
  type ImportBackupInput,
  type ImportBackupValues,
} from '@/domain/backupPasswordSchema'
import {
  describeOpenError,
  IMPORT_DONE_MESSAGE,
  RESTORE_FAILED_MESSAGE,
} from '@/features/backup/backupTexts'
import { summarizeBackup, type BackupContent, type BackupSummary } from '@/lib/backupFormat'
import { canSubmitForm, LIVE_VALIDATION } from '@/lib/formSubmit'
import { openBackupFile, restoreBackup } from '@/repositories/backupRepository'
import { useTheme } from '@/repositories/useTheme'

/** Objeto novo a cada resultado, para o foco voltar à mensagem mesmo com o texto repetido. */
interface StatusMessage {
  text: string
}

interface PendingImport {
  content: BackupContent
  summary: BackupSummary
}

/**
 * RF-10 importar / princípio 16 — arquivo e senha; abre e valida o backup sem tocar no banco,
 * mostra o resumo e só substitui os dados depois da confirmação (D-07). Em qualquer erro nada
 * é alterado (CA-10.2 / CA-10.3 / CA-10.5).
 */
export function useImportBackup() {
  const form = useForm<ImportBackupInput, unknown, ImportBackupValues>({
    ...LIVE_VALIDATION,
    resolver: zodResolver(importBackupSchema),
    defaultValues: { password: '' },
  })
  const { setPreference } = useTheme()
  const [openError, setOpenError] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingImport | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)
  const [restoreError, setRestoreError] = useState<string | null>(null)
  const [message, setMessage] = useState<StatusMessage | null>(null)
  const statusRef = useRef<HTMLParagraphElement>(null)
  // O <input type="file"> não pode ser limpo pelo valor: uma chave nova recria o formulário.
  const [formKey, setFormKey] = useState(0)

  // Um erro de abertura deixa de valer quando o usuário troca o arquivo ou a senha.
  useEffect(
    () => form.subscribe({ formState: { values: true }, callback: () => setOpenError(null) }),
    [form],
  )

  // RNF-06 — depois de importar, o formulário é recriado e o modal fecha: sem isto o foco cai
  // no <body>. Vai para a mensagem de resultado, como o "Limpar filtros" da D-45 (b).
  useEffect(() => {
    if (message) statusRef.current?.focus()
  }, [message])

  const submit = form.handleSubmit(async ({ file, password }) => {
    setOpenError(null)
    setMessage(null)
    try {
      const content = await openBackupFile(file, password)
      setRestoreError(null)
      setPending({ content, summary: summarizeBackup(content) })
    } catch (error) {
      setOpenError(describeOpenError(error))
    }
  })

  function cancelImport() {
    if (!isRestoring) setPending(null)
  }

  async function confirmImport() {
    if (!pending) return
    setIsRestoring(true)
    setRestoreError(null)
    try {
      // O tema importado vale na hora, também se o usuário trocou o tema nesta sessão.
      setPreference(await restoreBackup(pending.content.data))
      setPending(null)
      form.reset({ password: '' })
      setFormKey((key) => key + 1)
      setMessage({ text: IMPORT_DONE_MESSAGE })
    } catch {
      setRestoreError(RESTORE_FAILED_MESSAGE)
    } finally {
      setIsRestoring(false)
    }
  }

  return {
    form,
    formKey,
    submit,
    isOpening: form.formState.isSubmitting,
    canSubmit: canSubmitForm(form.formState),
    openError,
    message: message?.text ?? null,
    statusRef,
    summary: pending?.summary ?? null,
    isRestoring,
    restoreError,
    confirmImport,
    cancelImport,
  }
}
